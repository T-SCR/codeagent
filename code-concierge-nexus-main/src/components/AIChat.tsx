import React, { useState } from 'react';

const BACKEND_URL = 'https://codeagent-wmko.onrender.com'; // Your Render backend URL

interface Message {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface KnowledgeFile {
  id: string;
  filename: string;
  bucket: string;
  path: string;
  type: string;
  code_block?: string;
  is_default: boolean;
  uploaded_by?: string;
  created_at: string;
}

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });
      const data = await response.json();
      const aiMessage: Message = {
        role: 'assistant',
        content: data.message || 'No response from AI.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      if (data.files) setKnowledgeFiles(data.files);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error contacting AI.', created_at: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (file: KnowledgeFile) => {
    const res = await fetch(`${BACKEND_URL}/api/knowledge-files/download?bucket=${encodeURIComponent(file.bucket)}&path=${encodeURIComponent(file.path)}`);
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <h2>AI Knowledge Chat</h2>
      <div style={{ minHeight: 300, border: '1px solid #ccc', borderRadius: 8, padding: 16, marginBottom: 16, background: '#fafafa' }}>
        {messages.length === 0 && <div style={{ color: '#888' }}>Start the conversation...</div>}
        {messages.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', margin: '8px 0' }}>
            <div style={{ display: 'inline-block', background: msg.role === 'user' ? '#d1e7dd' : '#e2e3e5', borderRadius: 8, padding: 8 }}>
              <div>{msg.content}</div>
              <div style={{ fontSize: 10, color: '#888' }}>{new Date(msg.created_at).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        {isLoading && <div style={{ color: '#888' }}>AI is thinking...</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          placeholder="Ask me anything about your knowledge base..."
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={!input.trim() || isLoading} style={{ padding: '8px 16px', borderRadius: 4 }}>
          Send
        </button>
      </div>
      {knowledgeFiles.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4>Knowledge Files</h4>
          <ul>
            {knowledgeFiles.map((file) => (
              <li key={file.id} style={{ marginBottom: 8 }}>
                <button onClick={() => handleDownload(file)} style={{ textDecoration: 'underline', background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}>
                  {file.filename}
                </button>
                {file.code_block && <span style={{ marginLeft: 8, color: '#888' }}>({file.code_block})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}; 