import React, { useState, useEffect } from 'react';
import { SignedIn, useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DatabaseIcon, Upload, FileText, Grid3X3, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ExcelUpload } from '@/components/admin/ExcelUpload';
import { ZipUpload } from '@/components/admin/ZipUpload';
import { BulkUploadPDF } from '@/components/admin/BulkUploadPDF';
import { DataExport } from '@/components/admin/DataExport';
import { DataOverview } from '@/components/admin/DataOverview';
import { AdminNavigation } from '@/components/admin/AdminNavigation';
import { URLScraper } from '@/components/admin/URLScraper';

const AdminDashboard = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    codeMatrix: 0,
    excelMappings: 0,
    pdfFiles: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [codeMatrix, excelMappings, pdfFiles] = await Promise.all([
          supabase.from('code_matrix').select('id', { count: 'exact' }),
          supabase.from('excel_mappings').select('id', { count: 'exact' }),
          supabase.from('pdf_files').select('id', { count: 'exact' })
        ]);

        setStats({
          codeMatrix: codeMatrix.count || 0,
          excelMappings: excelMappings.count || 0,
          pdfFiles: pdfFiles.count || 0
        });
      } catch (error) {
        toast({
          title: "Error fetching statistics",
          description: "Could not load dashboard data",
          variant: "destructive",
        });
      }
    };

    fetchStats();
  }, [toast]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="shadow-elegant border-border/50">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">Please sign in to access the admin dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SignedIn>
      <div className="min-h-screen bg-gradient-subtle">
        {/* Header */}
        <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <DatabaseIcon className="h-6 w-6 text-primary" />
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Manage CODE framework data and bulk operations
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="gap-2">
                  <Grid3X3 className="h-3 w-3" />
                  {stats.codeMatrix} CODE Matrix
                </Badge>
                <Badge variant="outline" className="gap-2">
                  <FileText className="h-3 w-3" />
                  {stats.excelMappings} Mappings
                </Badge>
                <Badge variant="outline" className="gap-2">
                  <Upload className="h-3 w-3" />
                  {stats.pdfFiles} PDFs
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <AdminNavigation />
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="excel-upload">Excel Upload</TabsTrigger>
              <TabsTrigger value="zip-upload">ZIP Upload</TabsTrigger>
              <TabsTrigger value="bulk-pdf">PDF Upload</TabsTrigger>
              <TabsTrigger value="url-scraper">URL Scraper</TabsTrigger>
              <TabsTrigger value="export">Export Data</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <DataOverview stats={stats} onStatsUpdate={setStats} />
            </TabsContent>

            <TabsContent value="excel-upload">
              <ExcelUpload onSuccess={() => {
                toast({
                  title: "Excel upload successful",
                  description: "Excel files have been processed and imported",
                });
                window.location.reload();
              }} />
            </TabsContent>

            <TabsContent value="zip-upload">
              <ZipUpload onSuccess={() => {
                toast({
                  title: "ZIP upload successful",
                  description: "ZIP files have been processed and imported",
                });
                window.location.reload();
              }} />
            </TabsContent>

            <TabsContent value="bulk-pdf">
              <BulkUploadPDF onSuccess={() => {
                toast({
                  title: "PDF upload successful",
                  description: "PDFs have been processed and imported",
                });
                window.location.reload();
              }} />
            </TabsContent>

            <TabsContent value="url-scraper">
              <URLScraper onSuccess={() => {
                toast({
                  title: "URL scraping successful",
                  description: "Content has been scraped and imported",
                });
                window.location.reload();
              }} />
            </TabsContent>

            <TabsContent value="export">
              <DataExport />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SignedIn>
  );
};

export default AdminDashboard;