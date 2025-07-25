import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://pjqbbmbiamiddvrwrals.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 4000;
const LOCAL_FILES_DIR = path.join(__dirname, '../../files');
const CHAT_HISTORY_FILE = path.join(__dirname, '../../chat_history.json');

app.use(cors());
app.use(express.json());

async function getFileContentSnippet(bucket: string, pathStr: string, type: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(pathStr);
    if (error || !data) {
      console.error(`Download error for ${bucket}/${pathStr}:`, error?.message);
      return '';
    }
    if (type === 'pdf') {
      const buffer = Buffer.from(await data.arrayBuffer());
      try {
        const pdfData = await pdfParse(buffer);
        return pdfData.text.substring(0, 1000);
      } catch (err) {
        console.error(`PDF parse error for ${bucket}/${pathStr}:`, err);
        return '';
      }
    } else if (type === 'xlsx') {
      const buffer = Buffer.from(await data.arrayBuffer());
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        return JSON.stringify(json).substring(0, 1000);
      } catch (err) {
        console.error(`XLSX parse error for ${bucket}/${pathStr}:`, err);
        return '';
      }
    }
    return '';
  } catch (err) {
    console.error(`General file error for ${bucket}/${pathStr}:`, err);
    return '';
  }
}

function getLocalFilesList(): Array<any> {
  if (!fs.existsSync(LOCAL_FILES_DIR)) return [];
  const files = fs.readdirSync(LOCAL_FILES_DIR);
  return files.map((filename) => {
    const ext = path.extname(filename).toLowerCase();
    let type = '';
    if (ext === '.pdf') type = 'pdf';
    else if (ext === '.xlsx') type = 'xlsx';
    return {
      id: `local-${filename}`,
      filename,
      bucket: 'local',
      path: filename,
      type,
      code_block: '',
      is_default: false,
      uploaded_by: null,
      created_at: fs.statSync(path.join(LOCAL_FILES_DIR, filename)).ctime,
    };
  });
}

async function getLocalFileContentSnippet(filename: string, type: string): Promise<string> {
  const filePath = path.join(LOCAL_FILES_DIR, filename);
  if (!fs.existsSync(filePath)) return '';
  if (type === 'pdf') {
    try {
      const buffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(buffer);
      return pdfData.text.substring(0, 1000);
    } catch (err) {
      console.error(`Local PDF parse error for ${filename}:`, err);
      return '';
    }
  } else if (type === 'xlsx') {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      return JSON.stringify(json).substring(0, 1000);
    } catch (err) {
      console.error(`Local XLSX parse error for ${filename}:`, err);
      return '';
    }
  }
  return '';
}

// Serve local files for download
app.get('/api/local-files/download', (req: Request, res: Response) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const filePath = path.join(LOCAL_FILES_DIR, String(name));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

// List/search knowledge files (Supabase + local)
app.get('/api/knowledge-files', async (req: Request, res: Response) => {
  try {
    const { data: supaFiles, error } = await supabase
      .from('knowledge_files')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    const localFiles = getLocalFilesList();
    res.json({ files: [...(supaFiles || []), ...localFiles] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get a public download URL for a Supabase file
app.get('/api/knowledge-files/download', async (req: Request, res: Response) => {
  const { bucket, path: filePath } = req.query;
  if (!bucket || !filePath) return res.status(400).json({ error: 'bucket and path are required' });
  if (bucket === 'local') {
    // Redirect to local file download endpoint
    return res.redirect(`/api/local-files/download?name=${encodeURIComponent(String(filePath))}`);
  }
  try {
    const { data, error } = await supabase.storage.from(String(bucket)).createSignedUrl(String(filePath), 60 * 60);
    if (error) throw error;
    res.json({ url: data.signedUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Chat history endpoints
app.post('/api/chat-history', (req: Request, res: Response) => {
  const { user, question, answer, timestamp } = req.body;
  let history = [];
  if (fs.existsSync(CHAT_HISTORY_FILE)) {
    history = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf-8'));
  }
  history.push({ user, question, answer, timestamp: timestamp || new Date().toISOString() });
  fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(history, null, 2));
  res.json({ success: true });
});

app.get('/api/chat-history', (req: Request, res: Response) => {
  if (!fs.existsSync(CHAT_HISTORY_FILE)) return res.json({ history: [] });
  const history = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf-8'));
  res.json({ history });
});

// Chat endpoint with AI integration (Supabase + local files)
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: 'Message is required.' });

  try {
    // Fetch all knowledge files (Supabase + local)
    const { data: supaFiles, error } = await supabase
      .from('knowledge_files')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    const localFiles = getLocalFilesList();
    const allFiles = [...(supaFiles || []), ...localFiles];

    // Simple keyword search: filter files by user question
    const keyword = message.toLowerCase();
    const relevantFiles = allFiles.filter((f: any) =>
      f.filename?.toLowerCase().includes(keyword) ||
      f.code_block?.toLowerCase().includes(keyword) ||
      f.type?.toLowerCase().includes(keyword)
    );
    const filesToProcess = relevantFiles.length > 0 ? relevantFiles : allFiles;

    // For each file, get a snippet and a download link
    const fileInfos = await Promise.all(
      filesToProcess.map(async (f: any) => {
        let snippet = '';
        let downloadUrl = '';
        if (f.bucket === 'local') {
          snippet = await getLocalFileContentSnippet(f.filename, f.type);
          downloadUrl = `${process.env.BACKEND_URL || ''}/api/local-files/download?name=${encodeURIComponent(f.filename)}`;
        } else {
          snippet = await getFileContentSnippet(f.bucket, f.path, f.type);
          const { data: urlData, error: urlError } = await supabase.storage.from(f.bucket).createSignedUrl(f.path, 60 * 60);
          if (urlError) {
            console.error(`Download URL error for ${f.bucket}/${f.path}:`, urlError.message);
          }
          downloadUrl = urlData?.signedUrl || '';
        }
        return {
          ...f,
          snippet,
          downloadUrl
        };
      })
    );

    // Build context string for AI
    const context = fileInfos.length > 0
      ? `Available knowledge files (${fileInfos.length}):\n` +
        fileInfos.map((f, i) => `${i + 1}. ${f.filename} (${f.type})\nSnippet: ${f.snippet}\nDownload: ${f.downloadUrl || 'Not available'}`).join('\n\n')
      : 'No knowledge base files available.';

    // System prompt for Mistral AI with document_library tool
    const systemPrompt = `You are an intelligent assistant for the C-O-D-E framework.\n\nCONTEXT:\n${context}\n\nINSTRUCTIONS:\n1. Always search the knowledge base before responding.\n2. If you find relevant files, mention their names and provide download links.\n3. If no relevant knowledge is available, suggest what might be helpful.\n\nUSER QUESTION: ${message}`;

    // Call Mistral AI API with document_library tool enabled
    const mistralRes = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-small-latest',
        tools: [
          { "type": "document_library" },
          { "type": "code_interpreter" }
        ],
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      },
      {
        headers: {
          'Authorization': 'Bearer LV26MDXlNnAeZ8zK0HqcrcH0UOXwihTm',
          'Content-Type': 'application/json'
        }
      }
    );
    const aiMessage = mistralRes.data.choices?.[0]?.message?.content || 'No response from AI.';

    // Return AI answer and file info (with download links)
    res.json({ message: aiMessage, files: fileInfos });
  } catch (error: any) {
    console.error('Mistral AI error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Failed to get AI response.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 