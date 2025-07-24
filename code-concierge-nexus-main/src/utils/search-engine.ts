import { DatabaseOperations } from './database-operations';

export interface SearchResult {
  type: 'success' | 'excel-only' | 'not-found' | 'suggestions';
  message: string;
  filename?: string;
  pdfData?: Uint8Array;
  suggestions?: string[];
  codeBlock?: string;
  route?: string;
}

export class SearchEngine {
  private dbOps: DatabaseOperations;

  constructor() {
    this.dbOps = new DatabaseOperations();
  }

  async search(query: string): Promise<SearchResult> {
    const stats = await this.dbOps.getKnowledgeStats();
    
    if (stats.totalDocuments === 0 && stats.totalMappings === 0 && stats.totalMatrix === 0) {
      return {
        type: 'not-found',
        message: 'No knowledge base available. Please upload Excel files and ZIP files containing PDFs first.'
      };
    }

    // Search in knowledge base
    const context = await this.dbOps.getCodeFrameworkContext(query);
    const pdfContent = await this.dbOps.searchPDFContent(query);
    const relevantPdfs = await this.dbOps.getRelevantPdfs(query);

    if (context.length > 0 || pdfContent.length > 0) {
      return {
        type: 'success',
        message: `Found relevant information for "${query}"`,
        route: query
      };
    }

    // Generate suggestions if no direct matches found
    const suggestions = await this.generateSuggestions(query);
    
    return {
      type: 'suggestions',
      message: `No direct matches found for "${query}". Here are some related topics you might be interested in:`,
      suggestions,
      route: query
    };
  }

  private async generateSuggestions(query: string): Promise<string[]> {
    try {
      // Get stats to determine what kind of suggestions to offer
      const stats = await this.dbOps.getKnowledgeStats();
      const suggestions: string[] = [];
      
      // This is a simplified suggestion algorithm
      // In a real implementation, you might use more sophisticated matching
      if (stats.totalMatrix > 0) {
        suggestions.push('CODE Framework Overview', 'Innovation Tools', 'Canvas Templates');
      }
      
      if (stats.totalDocuments > 0) {
        suggestions.push('Document Search', 'PDF Content');
      }

      if (suggestions.length === 0) {
        suggestions.push('Try browsing the knowledge base', 'Upload more documents for better results');
      }

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return ['Try browsing the knowledge base', 'Upload more documents for better results'];
    }
  }

  getUploadedFilesSummary(): { excel: number; zip: number; total: number } {
    // This would need to be implemented to check the actual database
    // For now, return placeholder values
    return {
      excel: 0,
      zip: 0,
      total: 0
    };
  }
}