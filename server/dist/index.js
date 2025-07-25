"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = 'https://pjqbbmbiamiddvrwrals.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// List/search knowledge files
app.get('/api/knowledge-files', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('knowledge_files')
            .select('*')
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        res.json({ files: data });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get a public download URL for a file
app.get('/api/knowledge-files/download', async (req, res) => {
    const { bucket, path } = req.query;
    if (!bucket || !path)
        return res.status(400).json({ error: 'bucket and path are required' });
    try {
        const { data, error } = await supabase.storage.from(String(bucket)).createSignedUrl(String(path), 60 * 60); // 1 hour
        if (error)
            throw error;
        res.json({ url: data.signedUrl });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Chat endpoint with AI integration
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message)
        return res.status(400).json({ message: 'Message is required.' });
    try {
        // Fetch all knowledge files (default + user)
        const { data: files, error } = await supabase
            .from('knowledge_files')
            .select('*')
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        // Build context string for AI
        const context = files && files.length > 0
            ? `Available knowledge files (${files.length}):\n` +
                files.map((f, i) => `${i + 1}. ${f.filename} (${f.type})`).join('\n')
            : 'No knowledge base files available.';
        // System prompt for Mistral AI
        const systemPrompt = `You are an intelligent assistant for the C-O-D-E framework.\n\nCONTEXT:\n${context}\n\nINSTRUCTIONS:\n1. Always search the knowledge base before responding.\n2. If you find relevant files, mention their names.\n3. If no relevant knowledge is available, suggest what might be helpful.\n\nUSER QUESTION: ${message}`;
        // Call Mistral AI API
        const mistralRes = await axios_1.default.post('https://api.mistral.ai/v1/chat/completions', {
            model: 'mistral-small-latest',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ]
        }, {
            headers: {
                'Authorization': 'Bearer LV26MDXlNnAeZ8zK0HqcrcH0UOXwihTm',
                'Content-Type': 'application/json'
            }
        });
        const aiMessage = mistralRes.data.choices?.[0]?.message?.content || 'No response from AI.';
        // Return AI answer and file list
        res.json({ message: aiMessage, files });
    }
    catch (error) {
        console.error('Mistral AI error:', error?.response?.data || error.message);
        res.status(500).json({ message: 'Failed to get AI response.' });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
