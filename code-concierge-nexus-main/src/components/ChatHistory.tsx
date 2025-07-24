import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Calendar, 
  Trash2, 
  Eye, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
}

export const ChatHistory: React.FC = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChatSessions = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          title,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get message counts for each session
      const sessionsWithCounts = await Promise.all(
        (sessions || []).map(async (session) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact' })
            .eq('session_id', session.id);

          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('content')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...session,
            message_count: count || 0,
            last_message: lastMessage?.content?.substring(0, 100) + '...' || ''
          };
        })
      );

      setChatSessions(sessionsWithCounts);
    } catch (error: any) {
      toast({
        title: "Error loading chat history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionMessages = async (sessionId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSessionMessages(messages || []);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Chat deleted",
        description: "Chat session has been deleted successfully",
      });

      if (selectedSession === sessionId) {
        setSelectedSession(null);
        setSessionMessages([]);
      }

      fetchChatSessions();
    } catch (error: any) {
      toast({
        title: "Error deleting chat",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const viewSession = (sessionId: string) => {
    setSelectedSession(sessionId);
    fetchSessionMessages(sessionId);
  };

  useEffect(() => {
    fetchChatSessions();
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please sign in to view chat history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Your Chat Sessions</h3>
          <p className="text-sm text-muted-foreground">
            View and manage your conversation history
          </p>
        </div>
        <Button
          onClick={fetchChatSessions}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sessions List */}
        <Card className="shadow-elegant border-border/50">
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat Sessions ({chatSessions.length})
            </h4>
            
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading sessions...</p>
              </div>
            ) : chatSessions.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No chat sessions yet</p>
                <p className="text-xs text-muted-foreground">Start a new chat to see it here</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {chatSessions.map((session) => (
                    <Card 
                      key={session.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedSession === session.id ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium text-foreground text-sm truncate flex-1">
                            {session.title}
                          </h5>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewSession(session.id);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(session.id);
                              }}
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <MessageSquare className="h-2 w-2" />
                            {session.message_count} messages
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-2 w-2" />
                            {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                          </Badge>
                        </div>

                        {session.last_message && (
                          <p className="text-xs text-muted-foreground truncate">
                            {session.last_message}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Session Messages */}
        <Card className="shadow-elegant border-border/50">
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Messages
              {selectedSession && (
                <Badge variant="outline" className="text-xs">
                  {sessionMessages.length} messages
                </Badge>
              )}
            </h4>

            {!selectedSession ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Select a chat session to view messages</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {sessionMessages.map((message, index) => (
                    <div key={index} className="space-y-2">
                      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-accent text-accent-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};