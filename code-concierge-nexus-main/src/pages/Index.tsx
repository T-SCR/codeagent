import React, { useState, useEffect } from 'react';
import { MessageSquare, History, Database, Settings } from 'lucide-react';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AuthButton } from '@/components/AuthButton';
import { AIChat } from '@/components/AIChat';
import { ChatHistory } from '@/components/ChatHistory';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'chat' | 'history'>('chat');
  const [dataStats, setDataStats] = useState({
    totalKnowledge: 0,
    totalChats: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        const [pdfFiles, chatSessions] = await Promise.all([
          supabase.from('pdf_files').select('id', { count: 'exact' }),
          supabase.from('chat_sessions').select('id', { count: 'exact' }).eq('user_id', user.id)
        ]);

        setDataStats({
          totalKnowledge: pdfFiles.count || 0,
          totalChats: chatSessions.count || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-primary" />
                AI Knowledge Assistant
              </h1>
              <p className="text-muted-foreground">
                Chat with your personal AI assistant powered by your knowledge base
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <SignedIn>
                <Badge variant="outline" className="gap-2">
                  <Database className="h-3 w-3" />
                  {dataStats.totalKnowledge} Documents
                </Badge>
                <Badge variant="outline" className="gap-2">
                  <History className="h-3 w-3" />
                  {dataStats.totalChats} Chats
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/admin'}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Admin
                </Button>
              </SignedIn>
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <SignedOut>
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-elegant border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-16 w-16 text-primary mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Welcome to Your AI Assistant
                </h2>
                <p className="text-muted-foreground mb-6">
                  Sign in to start chatting with your personal AI assistant. Upload documents, 
                  ask questions, and get intelligent responses based on your knowledge base.
                </p>
                <AuthButton />
              </CardContent>
            </Card>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="max-w-6xl mx-auto">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mb-6">
              <Button
                variant={activeView === 'chat' ? 'default' : 'outline'}
                onClick={() => setActiveView('chat')}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </Button>
              <Button
                variant={activeView === 'history' ? 'default' : 'outline'}
                onClick={() => setActiveView('history')}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                History
              </Button>
            </div>

            {/* Content Area */}
            {activeView === 'chat' ? (
              <div className="space-y-6">
                <Card className="shadow-elegant border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      AI Chat Assistant
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AIChat />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="shadow-elegant border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      Chat History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChatHistory />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Knowledge Base Status */}
            {dataStats.totalKnowledge === 0 && (
              <Card className="shadow-elegant border-border/50 bg-gradient-to-br from-warning/10 to-warning/5 mt-6">
                <CardContent className="p-6 text-center">
                  <Database className="h-12 w-12 text-warning mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Knowledge Base Yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Visit the Admin Dashboard to upload documents and build your AI's knowledge base.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/admin'}
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Go to Admin Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </SignedIn>
      </div>
    </div>
  );
};

export default Index;