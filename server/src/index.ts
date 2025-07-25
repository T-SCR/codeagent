import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjqbbmbiamiddvrwrals.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// List/search knowledge files
app.get('/api/knowledge-files', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('knowledge_files')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ files: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get a public download URL for a file
app.get('/api/knowledge-files/download', async (req: Request, res: Response) => {
  const { bucket, path } = req.query;
  if (!bucket || !path) return res.status(400).json({ error: 'bucket and path are required' });
  try {
    const { data, error } = await supabase.storage.from(String(bucket)).createSignedUrl(String(path), 60 * 60); // 1 hour
    if (error) throw error;
    res.json({ url: data.signedUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Chat endpoint with AI integration
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: 'Message is required.' });

  try {
    // Fetch all knowledge files (default + user)
    const { data: files, error } = await supabase
      .from('knowledge_files')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Build context string for AI
    const context = files && files.length > 0
      ? `Available knowledge files (${files.length}):\n` +
        files.map((f: any, i: number) => `${i + 1}. ${f.filename} (${f.type})`).join('\n')
      : 'No knowledge base files available.';

    // System prompt for Mistral AI
    const systemPrompt = `You are an intelligent assistant for the C-O-D-E framework.\n\nCONTEXT:\n${context}\n\nINSTRUCTIONS:\n1. Always search the knowledge base before responding.\n2. If you find relevant files, mention their names.\n3. If no relevant knowledge is available, suggest what might be helpful.\n\nUSER QUESTION: ${message}`;

    // Call Mistral AI API
    const mistralRes = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-small-latest',
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

    // Return AI answer and file list
    res.json({ message: aiMessage, files });
  } catch (error: any) {
    console.error('Mistral AI error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Failed to get AI response.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 