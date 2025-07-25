import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Supabase configuration
const supabaseUrl = 'https://pjqbbmbiamiddvrwrals.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcWJibWJpYW1pZGR2cndyYWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjI1NDAsImV4cCI6MjA2ODk5ODU0MH0.ZcSfg3FxNfcV76j5gHlHijggvyFcY0lKHGxv0Asx2wQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Mistral AI configuration
const MISTRAL_API_KEY = 'nJvo1MlJBpPfIYRX1bEStNWKhkqR4nCr';
const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';

// File paths
const LOCAL_FILES_DIR = path.join(__dirname, '../../files');
const CHAT_HISTORY_FILE = path.join(__dirname, '../../chat_history.json');

app.use(cors());
app.use(express.json());

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'CODE Agent Backend is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get file content snippet from Supabase
async function getFileContentSnippet(filePath: string, fileName: string): Promise<string> {
  try {
    const { data } = await supabase.storage
      .from('knowledge-files')
      .download(filePath);
    
    if (!data) return 'File content not available';
    
    // Convert Blob to Buffer for processing
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (fileName.endsWith('.pdf')) {
      const pdfText = await pdfParse(buffer);
      return pdfText.text.substring(0, 500) + '...';
    } else if (fileName.endsWith('.xlsx')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      return rows.slice(0, 5).map(row => {
        const safeRow = Array.isArray(row) ? row : [];
        return safeRow.join(' ');
      }).join(' ') + '...';
    }
    
    return 'File content not available';
  } catch (error) {
    console.error('Error getting file content:', error);
    return 'Error reading file content';
  }
}

// Get local files list
function getLocalFilesList(): Array<{name: string, type: string, size: number, path: string}> {
  if (!fs.existsSync(LOCAL_FILES_DIR)) return [];
  
  return fs.readdirSync(LOCAL_FILES_DIR)
    .filter(filename => filename.endsWith('.pdf') || filename.endsWith('.xlsx'))
    .map(filename => {
      const filePath = path.join(LOCAL_FILES_DIR, filename);
      const stats = fs.statSync(filePath);
      return {
        name: filename,
        type: filename.endsWith('.pdf') ? 'pdf' : 'excel',
        size: stats.size,
        path: filename
      };
    });
}

// Get local file content snippet
async function getLocalFileContentSnippet(filename: string): Promise<string> {
  try {
    const filePath = path.join(LOCAL_FILES_DIR, filename);
    const fileBuffer = fs.readFileSync(filePath);
    
    if (filename.endsWith('.pdf')) {
      const pdfText = await pdfParse(fileBuffer);
      return pdfText.text.substring(0, 500) + '...';
    } else if (filename.endsWith('.xlsx')) {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      return rows.slice(0, 5).map(row => {
        const safeRow = Array.isArray(row) ? row : [];
        return safeRow.join(' ');
      }).join(' ') + '...';
    }
    
    return 'File content not available';
  } catch (error) {
    console.error('Error getting local file content:', error);
    return 'Error reading file content';
  }
}

// Simple keyword search for relevance
function isRelevantToQuery(fileName: string, query: string): boolean {
  const queryLower = query.toLowerCase();
  const fileNameLower = fileName.toLowerCase();
  
  const keywords = queryLower.split(' ').filter(word => word.length > 2);
  return keywords.some(keyword => fileNameLower.includes(keyword));
}

// API Routes
app.get('/api/knowledge-files', async (req, res) => {
  try {
    // Get files from Supabase
    const { data: supabaseFiles } = await supabase
      .from('knowledge_files')
      .select('*');
    
    // Get local files
    const localFiles = getLocalFilesList();
    
    // Combine and format files
    const allFiles = [
      ...(supabaseFiles || []).map(file => ({
        id: file.id,
        name: file.file_name,
        type: file.file_name.endsWith('.pdf') ? 'pdf' : 'excel',
        size: file.file_size,
        source: 'supabase',
        path: file.file_path
      })),
      ...localFiles.map(file => ({
        id: `local-${file.name}`,
        name: file.name,
        type: file.type,
        size: file.size,
        source: 'local',
        path: file.path
      }))
    ];
    
    res.json(allFiles);
  } catch (error) {
    console.error('Error fetching knowledge files:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge files' });
  }
});

app.get('/api/knowledge-files/download', async (req, res) => {
  try {
    const { filePath, source } = req.query;
    
    if (source === 'local') {
      // Serve local file
      res.redirect(`/api/local-files/download?filePath=${filePath}`);
    } else {
      // Generate Supabase download URL
      const { data } = await supabase.storage
        .from('knowledge-files')
        .createSignedUrl(filePath as string, 3600);
      
      if (data) {
        res.json({ downloadUrl: data.signedUrl });
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    }
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

app.get('/api/local-files/download', async (req, res) => {
  try {
    const { filePath } = req.query;
    const fullPath = path.join(LOCAL_FILES_DIR, filePath as string);
    
    if (fs.existsSync(fullPath)) {
      res.download(fullPath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Error serving local file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

app.post('/api/chat-history', async (req, res) => {
  try {
    const { messages } = req.body;
    
    // Ensure chat history directory exists
    const chatHistoryDir = path.dirname(CHAT_HISTORY_FILE);
    if (!fs.existsSync(chatHistoryDir)) {
      fs.mkdirSync(chatHistoryDir, { recursive: true });
    }
    
    // Save chat history
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(messages, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving chat history:', error);
    res.status(500).json({ error: 'Failed to save chat history' });
  }
});

app.get('/api/chat-history', async (req, res) => {
  try {
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
      const chatHistory = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf8'));
      res.json(chatHistory);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Received chat request:', message);

    // Get files from Supabase
    const { data: supabaseFiles } = await supabase
      .from('knowledge_files')
      .select('*');
    
    const localFiles = getLocalFilesList();
    
    // Get relevant files based on query
    const relevantFiles = [
      ...(supabaseFiles || []).filter(file => isRelevantToQuery(file.file_name, message)),
      ...localFiles.filter(file => isRelevantToQuery(file.name, message))
    ];
    
    // Build context from relevant files
    let context = '';
    const fileInfos = [];
    
    for (const file of relevantFiles.slice(0, 5)) { // Limit to 5 most relevant files
      try {
        let snippet = '';
        let downloadUrl = '';
        
        if (file.source === 'local') {
          snippet = await getLocalFileContentSnippet(file.name);
          downloadUrl = `/api/local-files/download?filePath=${file.path}`;
        } else {
          snippet = await getFileContentSnippet(file.path, file.name);
          const { data } = await supabase.storage
            .from('knowledge-files')
            .createSignedUrl(file.path, 3600);
          downloadUrl = data?.signedUrl || '';
        }
        
        context += `\nFile: ${file.name}\nContent: ${snippet}\n\n`;
        fileInfos.push({
          name: file.name,
          type: file.type,
          snippet: snippet.substring(0, 200) + '...',
          downloadUrl
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
    
    // If no relevant files found, include all files for context
    if (context === '') {
      const allFiles = [
        ...(supabaseFiles || []).map(file => ({ name: file.file_name, type: 'excel', source: 'supabase', path: file.file_path })),
        ...localFiles.map(file => ({ name: file.name, type: file.type, source: 'local', path: file.path }))
      ];
      
      context = `Available files: ${allFiles.map(f => f.name).join(', ')}`;
    }
    
    console.log('Sending request to Mistral AI...');
    
    // Call Mistral AI with context
    const mistralResponse = await axios.post(
      `${MISTRAL_BASE_URL}/chat/completions`,
      {
        model: "mistral-medium-latest",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant with access to the CODE framework knowledge base. You have access to the following files and their content:\n${context}\n\nPlease answer questions based on this information and offer to help users download relevant files when appropriate. If you find relevant files, mention them and provide download information.`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Mistral AI response received');
    
    const aiResponse = mistralResponse.data.choices[0].message.content;
    
    res.json({
      response: aiResponse,
      fileInfos,
      agentUsed: false
    });
    
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to process chat message';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mistralKey: MISTRAL_API_KEY ? 'configured' : 'missing',
    supabaseUrl: supabaseUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔑 Mistral API Key: ${MISTRAL_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🗄️ Supabase URL: ${supabaseUrl}`);
  console.log(`📁 Local files directory: ${LOCAL_FILES_DIR}`);
  console.log(`💾 Chat history file: ${CHAT_HISTORY_FILE}`);
}); 