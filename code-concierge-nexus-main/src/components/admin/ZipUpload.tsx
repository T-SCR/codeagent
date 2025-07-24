import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Archive } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { CodeAgent } from '@/utils/codeAgent';

interface ZipUploadProps {
  onSuccess: () => void;
}

export const ZipUpload: React.FC<ZipUploadProps> = ({ onSuccess }) => {
  const [zipFiles, setZipFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFilesUploaded = (files: File[]) => {
    setZipFiles(files);
  };

  const processZipFiles = async () => {
    if (zipFiles.length === 0) return;

    setIsProcessing(true);
    
    try {
      const codeAgent = new CodeAgent();
      await codeAgent.loadZipFiles(zipFiles);
      
      toast({
        title: "ZIP files processed",
        description: `Successfully processed ${zipFiles.length} ZIP file(s) containing PDFs`,
      });
      
      onSuccess();
      setZipFiles([]);
    } catch (error: any) {
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            ZIP File Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            onFilesUploaded={handleFilesUploaded}
            acceptedFiles={zipFiles}
            fileType="zip"
            title="Upload ZIP Files"
            description="Upload ZIP files containing PDF documents"
          />
          
          {zipFiles.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={processZipFiles}
                disabled={isProcessing}
                className="gap-2"
                size="lg"
              >
                <Archive className="h-4 w-4" />
                {isProcessing ? 'Processing...' : `Process ${zipFiles.length} ZIP Files`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};