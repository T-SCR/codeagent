import React, { useState } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, Database, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExportOptions {
  codeMatrix: boolean;
  excelMappings: boolean;
  pdfFiles: boolean;
  format: 'csv' | 'json';
}

export const DataExport: React.FC = () => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    codeMatrix: true,
    excelMappings: true,
    pdfFiles: true,
    format: 'csv'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const { toast } = useToast();

  const fetchAllData = async () => {
    const results: any = {};
    
    if (exportOptions.codeMatrix) {
      setExportStatus('Fetching CODE Matrix data...');
      const { data, error } = await supabase.from('code_matrix').select('*');
      if (error) throw error;
      results.codeMatrix = data;
    }

    if (exportOptions.excelMappings) {
      setExportStatus('Fetching Excel Mappings...');
      const { data, error } = await supabase.from('excel_mappings').select('*');
      if (error) throw error;
      results.excelMappings = data;
    }

    if (exportOptions.pdfFiles) {
      setExportStatus('Fetching PDF Files metadata...');
      const { data, error } = await supabase.from('pdf_files').select('*');
      if (error) throw error;
      results.pdfFiles = data;
    }

    return results;
  };

  const downloadCSV = (data: any[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = (data: any, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!exportOptions.codeMatrix && !exportOptions.excelMappings && !exportOptions.pdfFiles) {
      toast({
        title: "No data selected",
        description: "Please select at least one data type to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportStatus('Starting export...');

    try {
      const allData = await fetchAllData();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

      if (exportOptions.format === 'csv') {
        // Export separate CSV files
        if (allData.codeMatrix && allData.codeMatrix.length > 0) {
          downloadCSV(allData.codeMatrix, `code_matrix_${timestamp}.csv`);
        }
        if (allData.excelMappings && allData.excelMappings.length > 0) {
          downloadCSV(allData.excelMappings, `excel_mappings_${timestamp}.csv`);
        }
        if (allData.pdfFiles && allData.pdfFiles.length > 0) {
          downloadCSV(allData.pdfFiles, `pdf_files_${timestamp}.csv`);
        }
      } else {
        // Export single JSON file
        downloadJSON(allData, `code_framework_data_${timestamp}.json`);
      }

      setExportStatus('Export completed successfully!');
      
      toast({
        title: "Export successful",
        description: `Data exported in ${exportOptions.format.toUpperCase()} format`,
      });

    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
      setExportStatus(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const getExportCount = () => {
    return Object.values(exportOptions).filter(v => v === true).length - 1; // -1 for format field
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Select Data to Export</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="code-matrix"
                      checked={exportOptions.codeMatrix}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, codeMatrix: !!checked }))
                      }
                    />
                    <div className="flex-1">
                      <label htmlFor="code-matrix" className="text-sm font-medium text-foreground cursor-pointer">
                        CODE Matrix
                      </label>
                      <p className="text-xs text-muted-foreground">Framework structure data</p>
                    </div>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="excel-mappings"
                      checked={exportOptions.excelMappings}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, excelMappings: !!checked }))
                      }
                    />
                    <div className="flex-1">
                      <label htmlFor="excel-mappings" className="text-sm font-medium text-foreground cursor-pointer">
                        Excel Mappings
                      </label>
                      <p className="text-xs text-muted-foreground">Query to PDF mappings</p>
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="pdf-files"
                      checked={exportOptions.pdfFiles}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, pdfFiles: !!checked }))
                      }
                    />
                    <div className="flex-1">
                      <label htmlFor="pdf-files" className="text-sm font-medium text-foreground cursor-pointer">
                        PDF Files
                      </label>
                      <p className="text-xs text-muted-foreground">File metadata & content</p>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Export Format</h3>
            <div className="flex gap-4">
              <Card 
                className={`border cursor-pointer transition-all ${
                  exportOptions.format === 'csv' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50'
                }`}
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'csv' }))}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="csv-format"
                      name="format"
                      checked={exportOptions.format === 'csv'}
                      onChange={() => setExportOptions(prev => ({ ...prev, format: 'csv' }))}
                      className="text-primary"
                    />
                    <div>
                      <label htmlFor="csv-format" className="text-sm font-medium text-foreground cursor-pointer">
                        CSV Format
                      </label>
                      <p className="text-xs text-muted-foreground">Separate files for each table</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`border cursor-pointer transition-all ${
                  exportOptions.format === 'json' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50'
                }`}
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'json' }))}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="json-format"
                      name="format"
                      checked={exportOptions.format === 'json'}
                      onChange={() => setExportOptions(prev => ({ ...prev, format: 'json' }))}
                      className="text-primary"
                    />
                    <div>
                      <label htmlFor="json-format" className="text-sm font-medium text-foreground cursor-pointer">
                        JSON Format
                      </label>
                      <p className="text-xs text-muted-foreground">Single combined file</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Export Status */}
          {exportStatus && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{exportStatus}</AlertDescription>
            </Alert>
          )}

          {/* Export Summary */}
          <div className="flex items-center justify-between p-4 bg-accent/20 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Ready to export:</span>
              <Badge variant="outline">{getExportCount()} table{getExportCount() !== 1 ? 's' : ''}</Badge>
              <Badge variant="secondary">{exportOptions.format.toUpperCase()}</Badge>
            </div>
            
            <Button
              onClick={handleExport}
              disabled={isExporting || getExportCount() === 0}
              className="gap-2"
              size="lg"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};