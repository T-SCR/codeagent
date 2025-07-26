"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
const XLSX = __importStar(require("xlsx"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const supabase_js_1 = require("@supabase/supabase-js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Supabase configuration
const supabaseUrl = 'https://pjqbbmbiamiddvrwrals.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcWJibWJpYW1pZGR2cndyYWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjI1NDAsImV4cCI6MjA2ODg5ODU0MH0.ZcSfg3FxNfcV76j5gHlHijggvyFcY0lKHGxv0Asx2wQ';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// Mistral AI configuration
const MISTRAL_API_KEY = 'nJvo1MlJBpPfIYRX1bEStNWKhkqR4nCr';
const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';
// File paths
const LOCAL_FILES_DIR = path_1.default.join(__dirname, '../../files');
const CHAT_HISTORY_FILE = path_1.default.join(__dirname, '../../chat_history.json');
// Mistral Agent ID (we'll create this)
let MISTRAL_AGENT_ID = null;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize Mistral Agent with Document Library
async function initializeMistralAgent() {
    try {
        console.log('Initializing Mistral agent with document library...');
        // First, create a document library
        const libraryResponse = await axios_1.default.post(`${MISTRAL_BASE_URL}/libraries`, {
            name: "CODE Framework Knowledge Base",
            description: "All CODE framework files including PDFs, Excel files, and documentation"
        }, {
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const libraryId = libraryResponse.data.id;
        console.log('Created library with ID:', libraryId);
        // Upload files to the library
        await uploadFilesToLibrary(libraryId);
        // Create an agent with document library access
        const agentResponse = await axios_1.default.post(`${MISTRAL_BASE_URL}/agents`, {
            model: "mistral-medium-latest",
            name: "CODE Framework Assistant",
            description: "AI assistant with access to CODE framework knowledge base",
            instructions: "You are an AI assistant with access to the CODE framework knowledge base. You can access PDFs, Excel files, and other documents to answer questions about the CODE framework, CODE blocks, worksheets, tools, and canvases. Always provide accurate information based on the available documents and offer to help users download relevant files when appropriate.",
            tools: [
                {
                    type: "document_library",
                    library_ids: [libraryId]
                },
                {
                    type: "code_interpreter"
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        MISTRAL_AGENT_ID = agentResponse.data.id;
        console.log('Created agent with ID:', MISTRAL_AGENT_ID);
    }
    catch (error) {
        console.error('Error initializing Mistral agent:', error);
        // Fallback to direct API calls if agent creation fails
    }
}
// Upload files to Mistral document library
async function uploadFilesToLibrary(libraryId) {
    try {
        // Upload files from local directory
        if (fs_1.default.existsSync(LOCAL_FILES_DIR)) {
            const files = fs_1.default.readdirSync(LOCAL_FILES_DIR);
            for (const filename of files) {
                if (filename.endsWith('.pdf') || filename.endsWith('.xlsx')) {
                    const filePath = path_1.default.join(LOCAL_FILES_DIR, filename);
                    const fileBuffer = fs_1.default.readFileSync(filePath);
                    // Create form data for file upload
                    const formData = new FormData();
                    formData.append('file', new Blob([fileBuffer]), filename);
                    await axios_1.default.post(`${MISTRAL_BASE_URL}/libraries/${libraryId}/documents`, formData, {
                        headers: {
                            'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    console.log(`Uploaded ${filename} to library`);
                }
            }
        }
        // Upload files from Supabase
        const { data: supabaseFiles } = await supabase
            .from('knowledge_files')
            .select('*');
        if (supabaseFiles) {
            for (const file of supabaseFiles) {
                try {
                    const { data: fileData } = await supabase.storage
                        .from('knowledge-files')
                        .download(file.file_path);
                    if (fileData) {
                        const formData = new FormData();
                        formData.append('file', new Blob([fileData]), file.file_name);
                        await axios_1.default.post(`${MISTRAL_BASE_URL}/libraries/${libraryId}/documents`, formData, {
                            headers: {
                                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                                'Content-Type': 'multipart/form-data'
                            }
                        });
                        console.log(`Uploaded ${file.file_name} from Supabase to library`);
                    }
                }
                catch (error) {
                    console.error(`Error uploading ${file.file_name}:`, error);
                }
            }
        }
    }
    catch (error) {
        console.error('Error uploading files to library:', error);
    }
}
// Get file content snippet from Supabase
async function getFileContentSnippet(filePath, fileName) {
    try {
        const { data } = await supabase.storage
            .from('knowledge-files')
            .download(filePath);
        if (!data)
            return 'File content not available';
        // Convert Blob to Buffer for processing
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (fileName.endsWith('.pdf')) {
            const pdfText = await (0, pdf_parse_1.default)(buffer);
            return pdfText.text.substring(0, 500) + '...';
        }
        else if (fileName.endsWith('.xlsx')) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            return rows.slice(0, 5).map(row => {
                const safeRow = Array.isArray(row) ? row : [];
                return safeRow.join(' ');
            }).join(' ') + '...';
        }
        return 'File content not available';
    }
    catch (error) {
        console.error('Error getting file content:', error);
        return 'Error reading file content';
    }
}
// Get local files list
function getLocalFilesList() {
    if (!fs_1.default.existsSync(LOCAL_FILES_DIR))
        return [];
    return fs_1.default.readdirSync(LOCAL_FILES_DIR)
        .filter(filename => filename.endsWith('.pdf') || filename.endsWith('.xlsx'))
        .map(filename => {
        const filePath = path_1.default.join(LOCAL_FILES_DIR, filename);
        const stats = fs_1.default.statSync(filePath);
        return {
            name: filename,
            type: filename.endsWith('.pdf') ? 'pdf' : 'excel',
            size: stats.size,
            path: filename
        };
    });
}
// Get local file content snippet
async function getLocalFileContentSnippet(filename) {
    try {
        const filePath = path_1.default.join(LOCAL_FILES_DIR, filename);
        const fileBuffer = fs_1.default.readFileSync(filePath);
        if (filename.endsWith('.pdf')) {
            const pdfText = await (0, pdf_parse_1.default)(fileBuffer);
            return pdfText.text.substring(0, 500) + '...';
        }
        else if (filename.endsWith('.xlsx')) {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            return rows.slice(0, 5).map(row => {
                const safeRow = Array.isArray(row) ? row : [];
                return safeRow.join(' ');
            }).join(' ') + '...';
        }
        return 'File content not available';
    }
    catch (error) {
        console.error('Error getting local file content:', error);
        return 'Error reading file content';
    }
}
// Simple keyword search for relevance
function isRelevantToQuery(fileName, query) {
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
    }
    catch (error) {
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
        }
        else {
            // Generate Supabase download URL
            const { data } = await supabase.storage
                .from('knowledge-files')
                .createSignedUrl(filePath, 3600);
            if (data) {
                res.json({ downloadUrl: data.signedUrl });
            }
            else {
                res.status(404).json({ error: 'File not found' });
            }
        }
    }
    catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
    }
});
app.get('/api/local-files/download', async (req, res) => {
    try {
        const { filePath } = req.query;
        const fullPath = path_1.default.join(LOCAL_FILES_DIR, filePath);
        if (fs_1.default.existsSync(fullPath)) {
            res.download(fullPath);
        }
        else {
            res.status(404).json({ error: 'File not found' });
        }
    }
    catch (error) {
        console.error('Error serving local file:', error);
        res.status(500).json({ error: 'Failed to serve file' });
    }
});
app.post('/api/chat-history', async (req, res) => {
    try {
        const { messages } = req.body;
        // Ensure chat history directory exists
        const chatHistoryDir = path_1.default.dirname(CHAT_HISTORY_FILE);
        if (!fs_1.default.existsSync(chatHistoryDir)) {
            fs_1.default.mkdirSync(chatHistoryDir, { recursive: true });
        }
        // Save chat history
        fs_1.default.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(messages, null, 2));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error saving chat history:', error);
        res.status(500).json({ error: 'Failed to save chat history' });
    }
});
app.get('/api/chat-history', async (req, res) => {
    try {
        if (fs_1.default.existsSync(CHAT_HISTORY_FILE)) {
            const chatHistory = JSON.parse(fs_1.default.readFileSync(CHAT_HISTORY_FILE, 'utf8'));
            res.json(chatHistory);
        }
        else {
            res.json([]);
        }
    }
    catch (error) {
        console.error('Error loading chat history:', error);
        res.status(500).json({ error: 'Failed to load chat history' });
    }
});
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (MISTRAL_AGENT_ID) {
            // Use Mistral agent with document library
            const response = await axios_1.default.post(`${MISTRAL_BASE_URL}/agents/${MISTRAL_AGENT_ID}/conversations`, {
                inputs: message
            }, {
                headers: {
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            const aiResponse = response.data.outputs[response.data.outputs.length - 1].content;
            res.json({
                response: aiResponse,
                fileInfos: [],
                agentUsed: true
            });
        }
        else {
            // Fallback to direct API with file context
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
                    }
                    else {
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
                }
                catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                }
            }
            // Call Mistral AI with context
            const mistralResponse = await axios_1.default.post(`${MISTRAL_BASE_URL}/chat/completions`, {
                model: "mistral-medium-latest",
                messages: [
                    {
                        role: "system",
                        content: `You are an AI assistant with access to the CODE framework knowledge base. You have access to the following files and their content:\n${context}\n\nPlease answer questions based on this information and offer to help users download relevant files when appropriate.`
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            res.json({
                response: mistralResponse.data.choices[0].message.content,
                fileInfos,
                agentUsed: false
            });
        }
    }
    catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({
            error: 'Failed to process chat message',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Initialize Mistral agent on startup
initializeMistralAgent().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Mistral agent initialized: ${MISTRAL_AGENT_ID ? 'Yes' : 'No (using fallback)'}`);
    });
}).catch(error => {
    console.error('Failed to initialize Mistral agent:', error);
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (fallback mode)`);
    });
});
