
import JSZip from 'jszip';
import { DatabaseOperations } from './database-operations';

export class ZipProcessor {
  private dbOps: DatabaseOperations;

  constructor() {
    this.dbOps = new DatabaseOperations();
  }

  async processZipFiles(files: File[]): Promise<void> {
    console.log('Starting ZIP file processing...');
    
    for (const file of files) {
      console.log(`Processing ZIP file: ${file.name}`);
      await this.processZipFile(file);
    }

    // Verify data was stored
    const hasData = await this.dbOps.verifyDataStorage();
    console.log('PDF storage verification:', hasData ? 'SUCCESS' : 'FAILED');
  }

  private async processZipFile(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = new JSZip();
      await zip.loadAsync(arrayBuffer);

      console.log('ZIP file loaded, extracting PDFs...');

      // Extract all PDF files from the ZIP and save to Supabase
      const pdfPromises = [];
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.name.toLowerCase().endsWith('.pdf') && !zipEntry.dir) {
          pdfPromises.push(this.processPdfFromZip(zipEntry, file.name));
        }
      }

      await Promise.all(pdfPromises);
      console.log(`Processed ${pdfPromises.length} PDF files from ZIP`);
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      throw error;
    }
  }

  private async processPdfFromZip(zipEntry: JSZip.JSZipObject, zipFileName: string): Promise<void> {
    try {
      const pdfBuffer = await zipEntry.async('arraybuffer');
      const filename = zipEntry.name.split('/').pop() || zipEntry.name;
      
      console.log(`Processing PDF: ${filename}`);
      
      // Store PDF metadata and basic info
      // For full text extraction, we'll need to implement server-side processing
      const contentText = `PDF document: ${filename} - Full text extraction available via AI chat`;
      
      await this.dbOps.storePdfFile({
        filename: filename,
        file_path: `zip/${filename}`,
        file_size: pdfBuffer.byteLength,
        content_text: contentText,
        metadata: {
          source: 'zip_upload',
          original_path: zipEntry.name,
          zip_source: zipFileName,
          has_content: true,
          upload_timestamp: new Date().toISOString()
        }
      });

      console.log(`Successfully stored PDF: ${filename}`);
    } catch (error) {
      console.error(`Error processing PDF ${zipEntry.name}:`, error);
      throw error;
    }
  }
}
