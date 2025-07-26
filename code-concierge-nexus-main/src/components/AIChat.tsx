import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  fileInfos?: Array<{
    name: string;
    type: string;
    snippet: string;
    downloadUrl: string;
  }>;
}

interface FileInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  source: string;
  path: string;
}

const BACKEND_URL = 'https://codeagent-wmko.onrender.com';

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState<FileInfo[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load chat history
    fetchChatHistory();
    // Load knowledge files
    fetchKnowledgeFiles();
  }, []);

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat-history`);
      if (response.ok) {
        const history = await response.json();
        setMessages(history);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const fetchKnowledgeFiles = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/knowledge-files`);
      if (response.ok) {
        const files = await response.json();
        setKnowledgeFiles(files);
      }
    } catch (error) {
      console.error('Error loading knowledge files:', error);
    }
  };

  const saveChatHistory = async (updatedMessages: Message[]) => {
    try {
      await fetch(`${BACKEND_URL}/api/chat-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = { 
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputValue }),
      });

      if (response.ok) {
        const data = await response.json();

      const aiMessage: Message = { 
          id: (Date.now() + 1).toString(),
          text: data.response || 'Sorry, I could not process your request.',
          isUser: false,
          timestamp: new Date(),
          fileInfos: data.fileInfos || [],
        };

        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);
        saveChatHistory(finalMessages);
      } else {
        throw new Error('Failed to get response from AI');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, there was an error processing your request. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileDownload = async (fileInfo: { name: string; downloadUrl: string }) => {
    try {
      if (fileInfo.downloadUrl.startsWith('http')) {
        // Direct URL download
        window.open(fileInfo.downloadUrl, '_blank');
      } else {
        // Backend endpoint download
        const response = await fetch(`${BACKEND_URL}${fileInfo.downloadUrl}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileInfo.name;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
        <h1 className="text-2xl font-bold mb-2">AI Knowledge Chat</h1>
        <p className="text-blue-100">
          Ask me anything about your CODE framework knowledge base
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-4">🤖</div>
            <p>Start a conversation by asking about your knowledge base!</p>
                    </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                
                {/* File Information */}
                {message.fileInfos && message.fileInfos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-600">
                      📎 Relevant Files:
                    </p>
                    {message.fileInfos.map((fileInfo, index) => (
                      <div
                        key={index}
                        className="bg-white bg-opacity-20 rounded p-2 text-xs"
                      >
                        <p className="font-medium">{fileInfo.name}</p>
                        <p className="text-gray-600 mb-2">{fileInfo.snippet}</p>
                        <button
                          onClick={() => handleFileDownload(fileInfo)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          📥 Download
                        </button>
                      </div>
                    ))}
                    </div>
                  )}
                
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
            
            {isLoading && (
              <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <p className="text-sm">AI is thinking...</p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Knowledge Files */}
      <div className="border-t border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Knowledge Files</h3>
        <div className="flex flex-wrap gap-2">
          {knowledgeFiles.map((file) => (
            <span
              key={file.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              📄 {file.name}
            </span>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your knowledge base..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}