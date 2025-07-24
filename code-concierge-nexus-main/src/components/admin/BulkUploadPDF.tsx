import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BulkUploadPDFProps {
  onSuccess: () => void;
}

interface PDFFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  id?: string;
}

export const BulkUploadPDF: React.FC<BulkUploadPDFProps> = ({ onSuccess }) => {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPdfFiles = acceptedFiles
      .filter(file => file.type === 'application/pdf')
      .map(file => ({
        file,
        status: 'pending' as const,
        progress: 0
      }));
    
    setPdfFiles(prev => [...prev, ...newPdfFiles]);
    
    if (newPdfFiles.length < acceptedFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only PDF files are accepted",
        variant: "destructive",
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  const removeFile = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      // For now, we'll just return a placeholder
      // In a real implementation, you'd use a PDF parsing library like pdf-parse
      return `Extracted text content from ${file.name}`;
    } catch (error) {
      throw new Error('Failed to extract text from PDF');
    }
  };

  const uploadSinglePDF = async (pdfFile: PDFFile, index: number): Promise<void> => {
    setPdfFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, status: 'uploading', progress: 10 } : file
    ));

    try {
      // Extract text content
      setPdfFiles(prev => prev.map((file, i) => 
        i === index ? { ...file, progress: 30 } : file
      ));
      
      const contentText = await extractTextFromPDF(pdfFile.file);
      
      setPdfFiles(prev => prev.map((file, i) => 
        i === index ? { ...file, progress: 60 } : file
      ));

      // Insert into database
      const { data, error } = await supabase
        .from('pdf_files')
        .insert({
          filename: pdfFile.file.name,
          file_path: `/uploads/${pdfFile.file.name}`,
          file_size: pdfFile.file.size,
          content_text: contentText,
          metadata: {
            originalName: pdfFile.file.name,
            uploadedAt: new Date().toISOString(),
            size: pdfFile.file.size,
            type: pdfFile.file.type
          }
        })
        .select()
        .single();

      if (error) throw error;

      setPdfFiles(prev => prev.map((file, i) => 
        i === index ? { 
          ...file, 
          status: 'success', 
          progress: 100, 
          id: data.id 
        } : file
      ));

    } catch (error: any) {
      setPdfFiles(prev => prev.map((file, i) => 
        i === index ? { 
          ...file, 
          status: 'error', 
          progress: 0, 
          error: error.message 
        } : file
      ));
      throw error;
    }
  };

  const handleBulkUploadPDFs = async () => {
    if (pdfFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process files one by one to avoid overwhelming the database
      for (let i = 0; i < pdfFiles.length; i++) {
        const pdfFile = pdfFiles[i];
        if (pdfFile.status === 'pending') {
          try {
            await uploadSinglePDF(pdfFile, i);
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        toast({
          title: "Upload completed",
          description: `${successCount} PDFs uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });
        
        if (errorCount === 0) {
          onSuccess();
        }
      }

    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearSuccessful = () => {
    setPdfFiles(prev => prev.filter(file => file.status !== 'success'));
  };

  const retryFailed = () => {
    setPdfFiles(prev => prev.map(file => 
      file.status === 'error' 
        ? { ...file, status: 'pending', progress: 0, error: undefined }
        : file
    ));
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Bulk PDF Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all duration-300
              ${isDragActive 
                ? 'border-primary bg-accent/50' 
                : 'border-border hover:border-primary/50 hover:bg-accent/20'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-primary font-medium">Drop PDF files here...</p>
              ) : (
                <div>
                  <p className="text-foreground font-medium mb-2">
                    Drag & drop PDF files here, or click to browse
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Upload multiple PDF files at once
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* File List */}
          {pdfFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">
                  Files ({pdfFiles.length})
                </h4>
                <div className="flex gap-2">
                  {pdfFiles.some(f => f.status === 'success') && (
                    <Button variant="outline" size="sm" onClick={clearSuccessful}>
                      Clear Successful
                    </Button>
                  )}
                  {pdfFiles.some(f => f.status === 'error') && (
                    <Button variant="outline" size="sm" onClick={retryFailed}>
                      Retry Failed
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {pdfFiles.map((pdfFile, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {pdfFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(pdfFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {pdfFile.status === 'uploading' && (
                          <Progress value={pdfFile.progress} className="mt-1 h-1" />
                        )}
                        {pdfFile.error && (
                          <p className="text-xs text-destructive mt-1">{pdfFile.error}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          pdfFile.status === 'success' ? 'success' : 
                          pdfFile.status === 'error' ? 'destructive' : 
                          pdfFile.status === 'uploading' ? 'secondary' : 'outline'
                        }
                        className="gap-1"
                      >
                        {pdfFile.status === 'success' && <CheckCircle className="h-3 w-3" />}
                        {pdfFile.status === 'error' && <AlertCircle className="h-3 w-3" />}
                        {pdfFile.status}
                      </Badge>
                      
                      {pdfFile.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
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

          {/* Upload Controls */}
          {pdfFiles.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleBulkUploadPDFs}
                disabled={isUploading || pdfFiles.every(f => f.status !== 'pending')}
                className="gap-2"
                size="lg"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Processing PDFs...' : `Upload ${pdfFiles.filter(f => f.status === 'pending').length} PDFs`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};