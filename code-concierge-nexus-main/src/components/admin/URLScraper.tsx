import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Link, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  X,
  Globe,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface URLScrapingProps {
  onSuccess: () => void;
}

interface ScrapedURL {
  url: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  title?: string;
  contentLength?: number;
  error?: string;
  id?: string;
}

export const URLScraper: React.FC<URLScrapingProps> = ({ onSuccess }) => {
  const [urlInput, setUrlInput] = useState('');
  const [scrapedUrls, setScrapedUrls] = useState<ScrapedURL[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const addUrl = () => {
    if (!urlInput.trim()) return;
    
    // Basic URL validation
    try {
      new URL(urlInput.trim());
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    const newUrl: ScrapedURL = {
      url: urlInput.trim(),
      status: 'pending',
      progress: 0
    };

    setScrapedUrls(prev => [...prev, newUrl]);
    setUrlInput('');
  };

  const removeUrl = (index: number) => {
    setScrapedUrls(prev => prev.filter((_, i) => i !== index));
  };

  const scrapeUrl = async (urlData: ScrapedURL, index: number): Promise<void> => {
    setScrapedUrls(prev => prev.map((url, i) => 
      i === index ? { ...url, status: 'processing', progress: 10 } : url
    ));

    try {
      // Update progress
      setScrapedUrls(prev => prev.map((url, i) => 
        i === index ? { ...url, progress: 30 } : url
      ));

      // Call the scraping edge function
      const { data, error } = await supabase.functions.invoke('scrape-url', {
        body: { url: urlData.url }
      });

      if (error) throw error;

      setScrapedUrls(prev => prev.map((url, i) => 
        i === index ? { ...url, progress: 60 } : url
      ));

      // Store the scraped content in the database
      const { data: dbData, error: dbError } = await supabase
        .from('pdf_files')
        .insert({
          filename: data.title || `Scraped from ${new URL(urlData.url).hostname}`,
          file_path: urlData.url,
          file_size: data.content?.length || 0,
          content_text: data.content,
          metadata: {
            scraped: true,
            url: urlData.url,
            title: data.title,
            scrapedAt: new Date().toISOString(),
            wordCount: data.content?.split(' ').length || 0
          }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setScrapedUrls(prev => prev.map((url, i) => 
        i === index ? { 
          ...url, 
          status: 'success', 
          progress: 100,
          title: data.title,
          contentLength: data.content?.length || 0,
          id: dbData.id
        } : url
      ));

    } catch (error: any) {
      setScrapedUrls(prev => prev.map((url, i) => 
        i === index ? { 
          ...url, 
          status: 'error', 
          progress: 0, 
          error: error.message 
        } : url
      ));
      throw error;
    }
  };

  const handleBulkScraping = async () => {
    if (scrapedUrls.length === 0) return;

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process URLs one by one to avoid overwhelming the system
      for (let i = 0; i < scrapedUrls.length; i++) {
        const urlData = scrapedUrls[i];
        if (urlData.status === 'pending') {
          try {
            await scrapeUrl(urlData, i);
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        toast({
          title: "Scraping completed",
          description: `${successCount} URLs processed successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });
        
        if (errorCount === 0) {
          onSuccess();
        }
      }

    } catch (error: any) {
      toast({
        title: "Scraping failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearSuccessful = () => {
    setScrapedUrls(prev => prev.filter(url => url.status !== 'success'));
  };

  const retryFailed = () => {
    setScrapedUrls(prev => prev.map(url => 
      url.status === 'error' 
        ? { ...url, status: 'pending', progress: 0, error: undefined }
        : url
    ));
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            URL Content Scraper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter URL to scrape (e.g., https://example.com/article)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addUrl()}
              className="flex-1"
            />
            <Button onClick={addUrl} className="gap-2">
              <Link className="h-4 w-4" />
              Add URL
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Supported:</strong> Articles, blog posts, documentation pages, and other text-heavy web content.
              <br />
              <strong>Note:</strong> Some sites may block scraping or require special handling.
            </AlertDescription>
          </Alert>

          {/* URL List */}
          {scrapedUrls.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">
                  URLs to Process ({scrapedUrls.length})
                </h4>
                <div className="flex gap-2">
                  {scrapedUrls.some(u => u.status === 'success') && (
                    <Button variant="outline" size="sm" onClick={clearSuccessful}>
                      Clear Successful
                    </Button>
                  )}
                  {scrapedUrls.some(u => u.status === 'error') && (
                    <Button variant="outline" size="sm" onClick={retryFailed}>
                      Retry Failed
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {scrapedUrls.map((urlData, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {urlData.title || new URL(urlData.url).hostname}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {urlData.url}
                        </p>
                        {urlData.contentLength && (
                          <p className="text-xs text-muted-foreground">
                            {(urlData.contentLength / 1000).toFixed(1)}k characters
                          </p>
                        )}
                        {urlData.status === 'processing' && (
                          <Progress value={urlData.progress} className="mt-1 h-1" />
                        )}
                        {urlData.error && (
                          <p className="text-xs text-destructive mt-1">{urlData.error}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          urlData.status === 'success' ? 'success' : 
                          urlData.status === 'error' ? 'destructive' : 
                          urlData.status === 'processing' ? 'secondary' : 'outline'
                        }
                        className="gap-1"
                      >
                        {urlData.status === 'success' && <CheckCircle className="h-3 w-3" />}
                        {urlData.status === 'error' && <AlertCircle className="h-3 w-3" />}
                        {urlData.status}
                      </Badge>
                      
                      {urlData.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUrl(index)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Process Button */}
          {scrapedUrls.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleBulkScraping}
                disabled={isProcessing || scrapedUrls.every(u => u.status !== 'pending')}
                className="gap-2"
                size="lg"
              >
                <Download className="h-4 w-4" />
                {isProcessing ? 'Processing URLs...' : `Scrape ${scrapedUrls.filter(u => u.status === 'pending').length} URLs`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};