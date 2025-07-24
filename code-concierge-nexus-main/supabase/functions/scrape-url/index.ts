import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Scraping URL: ${url}`);

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Assistant-Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : `Content from ${new URL(url).hostname}`;

    // Basic content extraction
    let content = html;
    
    // Remove script and style tags
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Extract text from common content areas
    const contentSelectors = [
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    ];

    let extractedContent = '';
    for (const selector of contentSelectors) {
      const matches = content.match(selector);
      if (matches && matches.length > 0) {
        extractedContent = matches.join('\n\n');
        break;
      }
    }

    // If no specific content area found, extract from body
    if (!extractedContent) {
      const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      extractedContent = bodyMatch ? bodyMatch[1] : content;
    }

    // Clean up HTML tags and extract text
    let cleanText = extractedContent
      .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
      .replace(/&nbsp;/g, ' ')   // Replace &nbsp; with space
      .replace(/&amp;/g, '&')   // Replace &amp; with &
      .replace(/&lt;/g, '<')    // Replace &lt; with <
      .replace(/&gt;/g, '>')    // Replace &gt; with >
      .replace(/&quot;/g, '"')  // Replace &quot; with "
      .replace(/&#39;/g, "'")   // Replace &#39; with '
      .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
      .trim();

    // Remove common navigation and footer content
    const linesToRemove = [
      /^(home|about|contact|menu|navigation|nav|footer|sidebar|header)$/gi,
      /^(login|register|sign up|sign in)$/gi,
      /^(facebook|twitter|instagram|linkedin|youtube)$/gi,
      /^(privacy policy|terms of service|cookie policy)$/gi,
    ];

    const lines = cleanText.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.length < 10) return false; // Remove very short lines
      return !linesToRemove.some(pattern => pattern.test(trimmedLine));
    });

    cleanText = filteredLines.join('\n').trim();

    // Limit content length (around 50,000 characters to avoid issues)
    if (cleanText.length > 50000) {
      cleanText = cleanText.substring(0, 50000) + '... (content truncated)';
    }

    console.log(`Successfully scraped: ${title} (${cleanText.length} characters)`);

    return new Response(JSON.stringify({
      title,
      content: cleanText,
      url,
      scrapedAt: new Date().toISOString(),
      contentLength: cleanText.length,
      wordCount: cleanText.split(' ').length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error scraping URL:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to scrape URL' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});