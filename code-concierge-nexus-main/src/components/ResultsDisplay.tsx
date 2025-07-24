import React from 'react';
import { FileText, Download, AlertCircle, CheckCircle, Info, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SearchResult {
  type: 'success' | 'excel-only' | 'not-found' | 'suggestions';
  message: string;
  filename?: string;
  pdfData?: Uint8Array;
  suggestions?: string[];
  codeBlock?: string;
  route?: string;
}

interface ResultsDisplayProps {
  result: SearchResult | null;
  query: string;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, query }) => {
  if (!result) return null;

  const downloadPDF = () => {
    if (result.pdfData && result.filename) {
      const blob = new Blob([result.pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getResultIcon = () => {
    switch (result.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'excel-only':
        return <Info className="h-5 w-5 text-info" />;
      case 'not-found':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'suggestions':
        return <Info className="h-5 w-5 text-info" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getResultVariant = () => {
    switch (result.type) {
      case 'success':
        return 'default';
      case 'excel-only':
        return 'default';
      case 'not-found':
        return 'destructive';
      case 'suggestions':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-foreground">
            {getResultIcon()}
            Search Results
            <Badge variant="outline" className="ml-auto">
              Query: {query}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={getResultVariant()}>
            <AlertDescription className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-medium mb-2">{result.message}</p>
                
                {result.filename && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>File: {result.filename}</span>
                  </div>
                )}

                {result.codeBlock && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {result.codeBlock}
                    </Badge>
                    {result.route && (
                      <span>Route: {result.route}</span>
                    )}
                  </div>
                )}
              </div>

              {result.type === 'success' && result.pdfData && (
                <Button 
                  onClick={downloadPDF}
                  variant="success"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              )}
            </AlertDescription>
          </Alert>

          {result.suggestions && result.suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Related OPTIONS:</h4>
              <div className="grid gap-2">
                {result.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg"
                  >
                    <ExternalLink className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{suggestion}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      Available
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.type === 'excel-only' && (
            <div className="mt-4 p-4 bg-info/10 border border-info/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-info mt-0.5" />
                <div>
                  <h4 className="font-medium text-info mb-1">File Available in Excel</h4>
                  <p className="text-sm text-muted-foreground">
                    The filename is present in your Excel mapping but the corresponding PDF 
                    was not found in the uploaded ZIP files. Please check if you've uploaded 
                    the correct ZIP file or upload the missing file.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsDisplay;