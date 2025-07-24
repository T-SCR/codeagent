import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  'https://nuespsclhurnlcoxdfxf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZXNwc2NsaHVybmxjb3hkZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MDQxOTgsImV4cCI6MjA2NzE4MDE5OH0.PiAMFmbkqre05ig8YBRxkpwvbV3Wu_YEzX8rtGmEJWc'
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    if (!message) {
      throw new Error('No message provided');
    }

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Search for relevant PDF content and CODE framework data
    const searchContext = await searchPDFContent(message);
    const codeContext = await getCodeFrameworkContext(message);

    // Get relevant PDFs for download
    const relevantPdfs = await getRelevantPdfs(message);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://code-agent.com',
        'X-Title': 'CODE Agent',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [
          {
            role: 'system',
            content: `You are the CODE Agent - an intelligent assistant specialized in the C-O-D-E Framework for innovation and execution. Your primary role is to help users find and understand content from uploaded PDFs and Excel files.

CAPABILITIES:
- Search through uploaded PDF content and provide relevant excerpts
- Navigate the CODE framework structure (Phases: Conceptualize, Organize, Deploy, Evolve)
- Find specific CODE blocks, worksheets, tools, and canvases
- Explain framework concepts and methodologies

AVAILABLE CONTEXT:
${searchContext.length > 0 ? `PDF Content: ${searchContext}` : 'No relevant PDF content found for this query.'}
${codeContext.length > 0 ? `CODE Framework Data: ${codeContext}` : 'No relevant CODE framework data found.'}

INSTRUCTIONS:
- Always prioritize information from uploaded PDFs and CODE framework data
- If you find relevant content, quote it directly and explain its context
- If no relevant content is found, explain what information is available and suggest related topics
- Be concise but comprehensive in your explanations
- Help users navigate the framework effectively
- When referencing specific documents, mention them by name so users know they can download them`
          },
          {
            role: 'user',
            content: message
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        pdfs: relevantPdfs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Search for relevant PDF content based on user message
async function searchPDFContent(query: string): Promise<string> {
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

// Get CODE framework context based on user query
async function getCodeFrameworkContext(query: string): Promise<string> {
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

// Get relevant PDF files for download based on user query
async function getRelevantPdfs(query: string): Promise<Array<{filename: string, downloadUrl: string}>> {
  try {
    const lowerQuery = query.toLowerCase();
    
    // Search for PDFs mentioned in excel_mappings
    const { data: mappingData, error: mappingError } = await supabase
      .from('excel_mappings')
      .select('pdf_filename')
      .or(`query_term.ilike.%${query}%,pdf_filename.ilike.%${query}%,category.ilike.%${query}%`);

    // Also search pdf_files directly
    const { data: pdfData, error: pdfError } = await supabase
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