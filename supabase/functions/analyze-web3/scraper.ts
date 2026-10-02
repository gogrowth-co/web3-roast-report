// Scraper utility to extract text content from websites
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) {
      console.log(`Retrying fetch, ${retries} attempts left`);
      await delay(RETRY_DELAY);
      return fetchWithRetry(url, options, retries - 1);
    }
    return response;
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    console.log(`Retrying after error, ${retries} attempts left`);
    await delay(RETRY_DELAY);
    return fetchWithRetry(url, options, retries - 1);
  }
}

export interface ScrapedContent {
  title: string;
  metaDescription: string;
  mainHeadline: string;
  subHeadlines: string[];
  ctaTexts: string[];
  visibleText: string;
  success: boolean;
  // Populated only by the Firecrawl path -- raw outbound links found on the
  // page, feeds the Twitter/GitHub enrichment step without it needing its
  // own scrape. Undefined on the raw-fetch fallback path.
  links?: string[];
}

// Shared regex extraction, now fed real rendered HTML instead of a raw
// unrendered fetch -- this logic was already fine, the HTML source was the
// problem. Kept unchanged so both the Firecrawl and fallback paths produce
// an identically-shaped result.
function extractFromHtml(html: string): Omit<ScrapedContent, 'success' | 'links'> {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const mainHeadline = h1Match ? h1Match[1].trim() : '';

  const h2Matches = Array.from(html.matchAll(/<h[23][^>]*>([^<]+)<\/h[23]>/gi));
  const subHeadlines = h2Matches.map(m => m[1].trim()).filter(h => h.length > 0).slice(0, 5);

  const buttonMatches = Array.from(html.matchAll(/<button[^>]*>([^<]+)<\/button>/gi));
  const linkMatches = Array.from(html.matchAll(/<a[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>([^<]+)<\/a>/gi));
  const ctaTexts = [...buttonMatches, ...linkMatches]
    .map(m => m[1].trim())
    .filter(t => t.length > 0 && t.length < 100)
    .slice(0, 10);

  let visibleText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  visibleText = visibleText.substring(0, 3000);

  return { title, metaDescription, mainHeadline, subHeadlines, ctaTexts, visibleText };
}

// Primary path: Firecrawl renders JS before returning HTML. Most Web3
// project sites are React/Next SPAs -- a raw fetch() of those returns a
// near-empty shell (<div id="root"></div> plus script tags), not the
// rendered page, which was the actual cause of "generic" roast output: the
// AI model was working almost entirely off the screenshot, guessing at
// exact copy instead of reading it.
async function scrapeViaFirecrawl(url: string, apiKey: string): Promise<ScrapedContent | null> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['html', 'links'],
        // false on purpose: onlyMainContent strips the footer, where most
        // projects keep their GitHub/X links -- caught live on aave.com,
        // which then got a false "no GitHub or X linked" finding. The footer
        // is stripped from the copy-extraction HTML below instead.
        onlyMainContent: false,
        timeout: 30000,
      }),
      signal: AbortSignal.timeout(35000),
    });

    if (!response.ok) {
      console.error(`Firecrawl scrape failed: HTTP ${response.status}`, (await response.text()).slice(0, 300));
      return null;
    }

    const body = await response.json();
    if (!body.success || !body.data?.html) {
      console.error('Firecrawl returned no usable HTML', JSON.stringify(body).slice(0, 300));
      return null;
    }

    const extracted = extractFromHtml(String(body.data.html).replace(/<footer[\s\S]*?<\/footer>/gi, ''));
    const links: string[] = Array.isArray(body.data.links)
      ? body.data.links.filter((l: unknown) => typeof l === 'string')
      : [];

    console.log('Firecrawl scrape succeeded:', { title: extracted.title, headline: extracted.mainHeadline, textLength: extracted.visibleText.length, linkCount: links.length });

    return { ...extracted, success: true, links };
  } catch (error) {
    console.error('Firecrawl scrape threw:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Fallback path: raw fetch + regex, same as before Firecrawl existed. Kept
// rather than removed -- fails silently on SPAs, but a real result from a
// server-rendered or static site beats no result when Firecrawl itself is
// down or unconfigured.
async function scrapeViaRawFetch(url: string): Promise<ScrapedContent> {
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error("Raw-fetch scrape failed:", response.status);
      return createEmptyResult();
    }

    const html = await response.text();
    const extracted = extractFromHtml(html);
    console.log('Raw-fetch scrape succeeded:', { title: extracted.title, headline: extracted.mainHeadline, textLength: extracted.visibleText.length });
    return { ...extracted, success: true };
  } catch (error) {
    console.error("Raw-fetch scrape threw:", error);
    return createEmptyResult();
  }
}

export async function scrapeWebsiteContent(url: string, firecrawlApiKey?: string): Promise<ScrapedContent> {
  console.log("Starting website scraping for URL:", url);

  if (firecrawlApiKey) {
    const result = await scrapeViaFirecrawl(url, firecrawlApiKey);
    if (result) return result;
    console.log('Firecrawl path failed, falling back to raw fetch');
  }

  return scrapeViaRawFetch(url);
}

function createEmptyResult(): ScrapedContent {
  return {
    title: '',
    metaDescription: '',
    mainHeadline: '',
    subHeadlines: [],
    ctaTexts: [],
    visibleText: '',
    success: false
  };
}
