
import { ExcelProcessor } from './excel-processor';
import { ZipProcessor } from './zip-processor';
import { DatabaseOperations } from './database-operations';
import { SearchEngine, SearchResult } from './search-engine';
import { supabase } from '@/integrations/supabase/client';

export type { SearchResult } from './search-engine';

export class CodeAgent {
  private excelProcessor: ExcelProcessor;
  private zipProcessor: ZipProcessor;
  private dbOps: DatabaseOperations;
  private searchEngine: SearchEngine;

  constructor() {
    this.excelProcessor = new ExcelProcessor();
    this.zipProcessor = new ZipProcessor();
    this.dbOps = new DatabaseOperations();
    this.searchEngine = new SearchEngine();
  }

  async loadExcelFiles(files: File[]): Promise<void> {
    try {
      console.log('CodeAgent: Starting Excel file processing...');
      
      // Clear existing Excel data before loading new data
      await this.clearExcelData();
      
      await this.excelProcessor.processExcelFiles(files);
      
      // Verify the data was loaded
      const stats = await this.dbOps.getKnowledgeStats();
      console.log('Excel processing complete. Stats:', stats);
      
      if (stats.totalMatrix === 0 && stats.totalMappings === 0) {
        throw new Error('No data was processed from Excel files. Please check the file format.');
      }
    } catch (error) {
      console.error('Error in loadExcelFiles:', error);
      throw new Error(`Failed to process Excel files: ${error.message}`);
    }
  }

  async loadZipFiles(files: File[]): Promise<void> {
    try {
      console.log('CodeAgent: Starting ZIP file processing...');
      
      // Clear existing PDF data before loading new data
      await this.clearPdfData();
      
      await this.zipProcessor.processZipFiles(files);
      
      // Verify the data was loaded
      const stats = await this.dbOps.getKnowledgeStats();
      console.log('ZIP processing complete. Stats:', stats);
      
      if (stats.totalDocuments === 0) {
        throw new Error('No PDF files were processed from ZIP files. Please check the ZIP contents.');
      }
    } catch (error) {
      console.error('Error in loadZipFiles:', error);
      throw new Error(`Failed to process ZIP files: ${error.message}`);
    }
  }

  private async clearExcelData(): Promise<void> {
    try {
      console.log('Clearing existing Excel data...');
      // We only clear Excel-related data, not PDFs
      const { error: matrixError } = await supabase
        .from('code_matrix')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      const { error: mappingError } = await supabase
        .from('excel_mappings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (matrixError || mappingError) {
        console.error('Error clearing Excel data:', { matrixError, mappingError });
      }
    } catch (error) {
      console.error('Error clearing Excel data:', error);
    }
  }

  private async clearPdfData(): Promise<void> {
    try {
      console.log('Clearing existing PDF data...');
      const { error } = await supabase
        .from('pdf_files')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('Error clearing PDF data:', error);
      }
    } catch (error) {
      console.error('Error clearing PDF data:', error);
    }
  }

  async search(query: string): Promise<SearchResult> {
    return await this.searchEngine.search(query);
  }

  async getKnowledgeStats() {
    return await this.dbOps.getKnowledgeStats();
  }

  async getCodeFrameworkContext(query: string): Promise<string> {
    return await this.dbOps.getCodeFrameworkContext(query);
  }

  async searchPDFContent(query: string): Promise<string> {
    return await this.dbOps.searchPDFContent(query);
  }

  async getRelevantPdfs(query: string): Promise<Array<{filename: string, downloadUrl: string}>> {
    return await this.dbOps.getRelevantPdfs(query);
  }

  getUploadedFilesSummary(): { excel: number; zip: number; total: number } {
    return this.searchEngine.getUploadedFilesSummary();
  }

  async verifyKnowledgeBase(): Promise<{ isAvailable: boolean; stats: any }> {
    try {
      const stats = await this.dbOps.getKnowledgeStats();
      const isAvailable = stats.totalDocuments > 0 || stats.totalMappings > 0 || stats.totalMatrix > 0;
      
      console.log('Knowledge base verification:', { isAvailable, stats });
      
      return { isAvailable, stats };
    } catch (error) {
      console.error('Error verifying knowledge base:', error);
      return { isAvailable: false, stats: { totalDocuments: 0, totalMappings: 0, totalMatrix: 0 } };
    }
  }
}
