
import { supabase } from '@/integrations/supabase/client';

export interface CodeFrameworkData {
  codeData: any[];
  mappingData: any[];
}

export class DatabaseOperations {
  async clearAllData(): Promise<void> {
    try {
      // Clear existing data from all tables
      await Promise.all([
        supabase.from('code_matrix').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('excel_mappings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('pdf_files').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  async storeCodeMatrix(data: any[]): Promise<void> {
    try {
      if (data.length === 0) return;
      
      const insertData = data.map(row => ({
        code_block: row.code_block || null,
        filename: row.filename || '',
        worksheet_name: row.worksheet_name || null,
        tool_name: row.tool_name || null,
        phase: row.phase || null,
        canvas_type: row.canvas_type || null,
        sublevel: row.sublevel || null,
        description: row.description || null,
        keywords: row.keywords || null
      }));

      const { error } = await supabase
        .from('code_matrix')
        .insert(insertData);

      if (error) throw error;
      console.log(`Successfully stored ${insertData.length} code matrix entries`);
    } catch (error) {
      console.error('Error storing code matrix data:', error);
      throw error;
    }
  }

  async storeExcelMappings(data: any[]): Promise<void> {
    try {
      if (data.length === 0) return;
      
      const insertData = data.map(row => ({
        query_term: row.query_term || '',
        pdf_filename: row.pdf_filename || '',
        category: row.category || null,
        description: row.description || null
      }));

      const { error } = await supabase
        .from('excel_mappings')
        .insert(insertData);

      if (error) throw error;
      console.log(`Successfully stored ${insertData.length} Excel mapping entries`);
    } catch (error) {
      console.error('Error storing Excel mappings:', error);
      throw error;
    }
  }

  async storePdfFile(pdfData: {
    filename: string;
    file_path: string;
    file_size: number;
    content_text?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('pdf_files')
        .insert({
          filename: pdfData.filename,
          file_path: pdfData.file_path,
          file_size: pdfData.file_size,
          content_text: pdfData.content_text || null,
          metadata: pdfData.metadata || null
        });

      if (error) throw error;
      console.log(`Successfully stored PDF: ${pdfData.filename}`);
    } catch (error) {
      console.error('Error storing PDF file:', error);
      throw error;
    }
  }

  async getCodeFrameworkContext(query: string): Promise<string> {
    try {
      const lowerQuery = query.toLowerCase();
      
      // Search code_matrix table
      const { data: codeData, error: codeError } = await supabase
        .from('code_matrix')
        .select('*')
        .or(`code_block.ilike.%${query}%,worksheet_name.ilike.%${query}%,tool_name.ilike.%${query}%,phase.ilike.%${query}%,canvas_type.ilike.%${query}%`);

      // Search excel_mappings table
      const { data: mappingData, error: mappingError } = await supabase
        .from('excel_mappings')
        .select('*')
        .or(`query_term.ilike.%${query}%,pdf_filename.ilike.%${query}%,category.ilike.%${query}%`);

      let context = '';
      
      if (codeData && codeData.length > 0) {
        context += 'CODE Framework Matches:\n';
        codeData.slice(0, 5).forEach(item => {
          context += `- ${item.code_block || 'N/A'}: ${item.worksheet_name || 'N/A'} (${item.phase || 'N/A'} > ${item.canvas_type || 'N/A'})\n`;
          if (item.description) context += `  Description: ${item.description}\n`;
          if (item.filename) context += `  File: ${item.filename}\n`;
        });
      }

      if (mappingData && mappingData.length > 0) {
        context += '\nExcel Mappings:\n';
        mappingData.slice(0, 3).forEach(item => {
          context += `- Query: ${item.query_term} → PDF: ${item.pdf_filename}\n`;
          if (item.description) context += `  Description: ${item.description}\n`;
        });
      }

      return context;
    } catch (error) {
      console.error('Error getting CODE framework context:', error);
      return '';
    }
  }

  async getRelevantPdfs(query: string): Promise<Array<{filename: string, downloadUrl: string}>> {
    try {
      const lowerQuery = query.toLowerCase();
      
      // Search for PDFs mentioned in excel_mappings
      const { data: mappingData } = await supabase
        .from('excel_mappings')
        .select('pdf_filename')
        .or(`query_term.ilike.%${query}%,pdf_filename.ilike.%${query}%,category.ilike.%${query}%`);

      // Also search pdf_files directly
      const { data: pdfData } = await supabase
        .from('pdf_files')
        .select('filename')
        .or(`filename.ilike.%${query}%,content_text.ilike.%${query}%`);

      const relevantPdfs = new Set<string>();
      
      // Add PDFs from mappings
      if (mappingData) {
        mappingData.forEach(item => relevantPdfs.add(item.pdf_filename));
      }
      
      // Add PDFs from direct search
      if (pdfData) {
        pdfData.forEach(item => relevantPdfs.add(item.filename));
      }

      // Convert to download URLs
      return Array.from(relevantPdfs).map(filename => ({
        filename,
        downloadUrl: `/assets/pdfs/${filename}`
      }));
    } catch (error) {
      console.error('Error getting relevant PDFs:', error);
      return [];
    }
  }

  async searchPDFContent(query: string): Promise<string> {
    try {
      const { data: pdfFiles, error } = await supabase
        .from('pdf_files')
        .select('filename, content_text')
        .not('content_text', 'is', null);

      if (error || !pdfFiles) return '';

      // Simple text search - in production, you might want vector search
      const relevantContent = pdfFiles
        .filter(pdf => 
          pdf.content_text && 
          pdf.content_text.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 3) // Limit to top 3 results
        .map(pdf => `From ${pdf.filename}: ${pdf.content_text.substring(0, 500)}...`)
        .join('\n\n');

      return relevantContent;
    } catch (error) {
      console.error('Error searching PDF content:', error);
      return '';
    }
  }

  async getKnowledgeStats(): Promise<{ totalDocuments: number, totalMappings: number, totalMatrix: number }> {
    try {
      const [pdfCount, mappingsCount, matrixCount] = await Promise.all([
        supabase.from('pdf_files').select('id', { count: 'exact' }),
        supabase.from('excel_mappings').select('id', { count: 'exact' }),
        supabase.from('code_matrix').select('id', { count: 'exact' })
      ]);

      return {
        totalDocuments: pdfCount.count || 0,
        totalMappings: mappingsCount.count || 0,
        totalMatrix: matrixCount.count || 0
      };
    } catch (error) {
      console.error('Error getting knowledge stats:', error);
      return { totalDocuments: 0, totalMappings: 0, totalMatrix: 0 };
    }
  }

  async verifyDataStorage(): Promise<boolean> {
    try {
      const stats = await this.getKnowledgeStats();
      const hasData = stats.totalDocuments > 0 || stats.totalMappings > 0 || stats.totalMatrix > 0;
      console.log('Data verification stats:', stats);
      return hasData;
    } catch (error) {
      console.error('Error verifying data storage:', error);
      return false;
    }
  }
}
