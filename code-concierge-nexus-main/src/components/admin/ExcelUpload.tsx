import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileSpreadsheet } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { CodeAgent } from '@/utils/codeAgent';

interface ExcelUploadProps {
  onSuccess: () => void;
}

export const ExcelUpload: React.FC<ExcelUploadProps> = ({ onSuccess }) => {
  const [excelFiles, setExcelFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFilesUploaded = (files: File[]) => {
    setExcelFiles(files);
  };

  const processExcelFiles = async () => {
    if (excelFiles.length === 0) return;

    setIsProcessing(true);
    
    try {
      const codeAgent = new CodeAgent();
      await codeAgent.loadExcelFiles(excelFiles);
      
      toast({
        title: "Excel files processed",
        description: `Successfully processed ${excelFiles.length} Excel file(s)`,
      });
      
      onSuccess();
      setExcelFiles([]);
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
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Excel File Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            onFilesUploaded={handleFilesUploaded}
            acceptedFiles={excelFiles}
            fileType="excel"
            title="Upload Excel Files"
            description="Upload CODEMatrix.xlsx and CODE AI.xlsx files"
          />
          
          {excelFiles.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={processExcelFiles}
                disabled={isProcessing}
                className="gap-2"
                size="lg"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {isProcessing ? 'Processing...' : `Process ${excelFiles.length} Excel Files`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};