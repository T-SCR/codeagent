import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DatabaseIcon, 
  FileText, 
  Grid3X3, 
  RefreshCw, 
  Trash2, 
  Eye,
  AlertTriangle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DataOverviewProps {
  stats: {
    codeMatrix: number;
    excelMappings: number;
    pdfFiles: number;
  };
  onStatsUpdate: (stats: any) => void;
}

interface DataSample {
  codeMatrix: any[];
  excelMappings: any[];
  pdfFiles: any[];
}

export const DataOverview: React.FC<DataOverviewProps> = ({ stats, onStatsUpdate }) => {
  const [dataSample, setDataSample] = useState<DataSample>({
    codeMatrix: [],
    excelMappings: [],
    pdfFiles: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDataSamples = async () => {
    setIsLoading(true);
    try {
      const [codeMatrix, excelMappings, pdfFiles] = await Promise.all([
        supabase.from('code_matrix').select('*').limit(5).order('created_at', { ascending: false }),
        supabase.from('excel_mappings').select('*').limit(5).order('created_at', { ascending: false }),
        supabase.from('pdf_files').select('*').limit(5).order('uploaded_at', { ascending: false })
      ]);

      setDataSample({
        codeMatrix: codeMatrix.data || [],
        excelMappings: excelMappings.data || [],
        pdfFiles: pdfFiles.data || []
      });
    } catch (error: any) {
      toast({
        title: "Error fetching data samples",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStats = async () => {
    setIsLoading(true);
    try {
      const [codeMatrix, excelMappings, pdfFiles] = await Promise.all([
        supabase.from('code_matrix').select('id', { count: 'exact' }),
        supabase.from('excel_mappings').select('id', { count: 'exact' }),
        supabase.from('pdf_files').select('id', { count: 'exact' })
      ]);

      const newStats = {
        codeMatrix: codeMatrix.count || 0,
        excelMappings: excelMappings.count || 0,
        pdfFiles: pdfFiles.count || 0
      };

      onStatsUpdate(newStats);
      await fetchDataSamples();
      
      toast({
        title: "Data refreshed",
        description: "Statistics and samples updated",
      });
    } catch (error: any) {
      toast({
        title: "Error refreshing data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearTable = async (tableName: 'code_matrix' | 'excel_mappings' | 'pdf_files') => {
    try {
      const { error } = await supabase.from(tableName).delete().neq('id', '');
      
      if (error) throw error;

      toast({
        title: `${tableName} cleared`,
        description: `All records from ${tableName} have been deleted`,
      });

      setShowDeleteConfirm(null);
      refreshStats();
    } catch (error: any) {
      toast({
        title: "Error clearing table",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDataSamples();
  }, []);

  const renderDataTable = (data: any[], columns: string[], title: string) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <Badge variant="outline">{data.length} recent records</Badge>
      </div>
      
      {data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {columns.map(col => (
                  <th key={col} className="text-left p-2 font-medium text-muted-foreground">
                    {col.replace('_', ' ').toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index} className="border-b border-border/50">
                  {columns.map(col => (
                    <td key={col} className="p-2 text-foreground">
                      {typeof row[col] === 'object' 
                        ? JSON.stringify(row[col]).substring(0, 50) + '...'
                        : String(row[col] || '-').substring(0, 50)
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <DatabaseIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No data available</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-elegant border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CODE Matrix</p>
                <p className="text-2xl font-bold text-foreground">{stats.codeMatrix}</p>
              </div>
              <Grid3X3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Excel Mappings</p>
                <p className="text-2xl font-bold text-foreground">{stats.excelMappings}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">PDF Files</p>
                <p className="text-2xl font-bold text-foreground">{stats.pdfFiles}</p>
              </div>
              <DatabaseIcon className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="shadow-elegant border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Data Management
            </CardTitle>
            <Button 
              onClick={refreshStats}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-destructive/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Clear CODE Matrix</p>
                    <p className="text-xs text-muted-foreground">Delete all entries</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm('code_matrix')}
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-destructive/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Clear Mappings</p>
                    <p className="text-xs text-muted-foreground">Delete all entries</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm('excel_mappings')}
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-destructive/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Clear PDF Files</p>
                    <p className="text-xs text-muted-foreground">Delete all entries</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm('pdf_files')}
                    className="gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <Alert className="mt-4 border-destructive/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Are you sure you want to clear all data from <strong>{showDeleteConfirm}</strong>? This action cannot be undone.</span>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => clearTable(showDeleteConfirm as any)}
                    >
                      Yes, Clear All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Data Samples */}
      <Card className="shadow-elegant border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5 text-primary" />
            Recent Data Samples
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="code-matrix">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="code-matrix">CODE Matrix</TabsTrigger>
              <TabsTrigger value="excel-mappings">Excel Mappings</TabsTrigger>
              <TabsTrigger value="pdf-files">PDF Files</TabsTrigger>
            </TabsList>

            <TabsContent value="code-matrix" className="mt-4">
              {renderDataTable(
                dataSample.codeMatrix, 
                ['code_block', 'filename', 'canvas_type', 'phase'], 
                'Recent CODE Matrix Entries'
              )}
            </TabsContent>

            <TabsContent value="excel-mappings" className="mt-4">
              {renderDataTable(
                dataSample.excelMappings, 
                ['query_term', 'pdf_filename', 'category'], 
                'Recent Excel Mappings'
              )}
            </TabsContent>

            <TabsContent value="pdf-files" className="mt-4">
              {renderDataTable(
                dataSample.pdfFiles, 
                ['filename', 'file_size', 'uploaded_at'], 
                'Recent PDF Files'
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};