
import * as XLSX from 'xlsx';
import { DatabaseOperations } from './database-operations';

export interface ExcelData {
  codeMatrix: Record<string, string>;
  codeAI: {
    phases: string[];
    sublevels: string[];
    canvases: string[];
    worksheets: string[];
    tools: string[];
  };
}

export class ExcelProcessor {
  private dbOps: DatabaseOperations;

  constructor() {
    this.dbOps = new DatabaseOperations();
  }

  async processExcelFiles(files: File[]): Promise<void> {
    console.log('Starting Excel file processing...');
    
    for (const file of files) {
      console.log(`Processing Excel file: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      if (file.name.toLowerCase().includes('codematrix')) {
        await this.processCodeMatrixFile(workbook, file.name);
      } else if (file.name.toLowerCase().includes('codeai') || file.name.toLowerCase().includes('mapping')) {
        await this.processMappingFile(workbook, file.name);
      } else {
        console.log(`Processing generic Excel file: ${file.name}`);
        await this.processGenericExcelFile(workbook, file.name);
      }
    }

    // Verify data was stored
    const hasData = await this.dbOps.verifyDataStorage();
    console.log('Data storage verification:', hasData ? 'SUCCESS' : 'FAILED');
  }

  private async processCodeMatrixFile(workbook: XLSX.WorkBook, filename: string): Promise<void> {
    try {
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      console.log(`Processing CODE Matrix with ${data.length} rows`);

      const processedData = [];
      
      // Skip header row and process data
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (row[0] || row[1]) { // At least code_block or filename should exist
          processedData.push({
            code_block: row[0]?.toString() || null,
            filename: row[1]?.toString() || filename,
            worksheet_name: row[2]?.toString() || null,
            tool_name: row[3]?.toString() || null,
            phase: row[4]?.toString() || null,
            canvas_type: row[5]?.toString() || null,
            sublevel: row[6]?.toString() || null,
            description: row[7]?.toString() || null,
            keywords: row[8] ? [row[8].toString()] : null
          });
        }
      }

      await this.dbOps.storeCodeMatrix(processedData);
      console.log(`Successfully processed ${processedData.length} CODE Matrix entries`);
    } catch (error) {
      console.error('Error processing CODE Matrix file:', error);
      throw error;
    }
  }

  private async processMappingFile(workbook: XLSX.WorkBook, filename: string): Promise<void> {
    try {
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      console.log(`Processing mappings with ${data.length} rows`);

      const processedData = [];

      // Skip header row and process data
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (row[0] && row[1]) { // Both query_term and pdf_filename are required
          processedData.push({
            query_term: row[0]?.toString() || '',
            pdf_filename: row[1]?.toString() || '',
            category: row[2]?.toString() || null,
            description: row[3]?.toString() || null
          });
        }
      }

      await this.dbOps.storeExcelMappings(processedData);
      console.log(`Successfully processed ${processedData.length} mapping entries`);
    } catch (error) {
      console.error('Error processing mapping file:', error);
      throw error;
    }
  }

  private async processGenericExcelFile(workbook: XLSX.WorkBook, filename: string): Promise<void> {
    try {
      // Try to detect the file type based on content
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length === 0) return;

      const firstRow = data[0] as any[];
      const headers = firstRow.map(h => h?.toString().toLowerCase() || '');

      // Check if it looks like a CODE Matrix file
      if (headers.includes('code_block') || headers.includes('filename') || headers.includes('phase')) {
        console.log('Detected CODE Matrix format in generic file');
        await this.processCodeMatrixFile(workbook, filename);
      }
      // Check if it looks like a mapping file
      else if (headers.includes('query_term') || headers.includes('pdf_filename')) {
        console.log('Detected mapping format in generic file');
        await this.processMappingFile(workbook, filename);
      }
      else {
        console.log('Unknown Excel file format, attempting CODE Matrix processing');
        await this.processCodeMatrixFile(workbook, filename);
      }
    } catch (error) {
      console.error('Error processing generic Excel file:', error);
      throw error;
    }
  }
}
