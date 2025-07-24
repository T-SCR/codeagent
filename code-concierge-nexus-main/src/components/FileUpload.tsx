import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, File } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFilesUploaded: (files: File[]) => void;
  acceptedFiles: File[];
  fileType: 'excel' | 'zip';
  title: string;
  description: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  acceptedFiles,
  fileType,
  title,
  description
}) => {
  const accept = fileType === 'excel' 
    ? { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
    : { 'application/zip': ['.zip'] };

  const onDrop = useCallback((files: File[]) => {
    onFilesUploaded(files);
  }, [onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: fileType === 'zip'
  });

  const removeFile = (index: number) => {
    const newFiles = acceptedFiles.filter((_, i) => i !== index);
    onFilesUploaded(newFiles);
  };

  return (
    <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-all duration-300">
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

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
              <p className="text-primary font-medium">Drop files here...</p>
            ) : (
              <div>
                <p className="text-foreground font-medium mb-2">
                  Drag & drop {fileType === 'excel' ? 'Excel' : 'ZIP'} files here
                </p>
                <p className="text-muted-foreground text-sm">
                  or click to browse
                </p>
              </div>
            )}
          </div>
        </div>

        {acceptedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-foreground">Uploaded Files:</h4>
            {acceptedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {fileType === 'excel' ? (
                    <FileText className="h-5 w-5 text-success" />
                  ) : (
                    <File className="h-5 w-5 text-info" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {fileType === 'excel' ? 'Excel' : 'ZIP'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUpload;