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

interface ScrapedContent {
  title: string;
  metaDescription: string;
  mainHeadline: string;
  subHeadlines: string[];
  ctaTexts: string[];
  visibleText: string;
  success: boolean;
}

export async function scrapeWebsiteContent(url: string): Promise<ScrapedContent> {
  console.log("Starting website scraping for URL:", url);
  
  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error("Failed to fetch website:", response.status);
      return createEmptyResult();
    }

    const html = await response.text();
    console.log("HTML fetched successfully, length:", html.length);

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract meta description
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

    // Extract h1 (main headline)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const mainHeadline = h1Match ? h1Match[1].trim() : '';

    // Extract h2 and h3 (subheadlines)
    const h2Matches = Array.from(html.matchAll(/<h[23][^>]*>([^<]+)<\/h[23]>/gi));
    const subHeadlines = h2Matches.map(m => m[1].trim()).filter(h => h.length > 0).slice(0, 5);

    // Extract button and CTA texts
    const buttonMatches = Array.from(html.matchAll(/<button[^>]*>([^<]+)<\/button>/gi));
    const linkMatches = Array.from(html.matchAll(/<a[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>([^<]+)<\/a>/gi));
    const ctaTexts = [...buttonMatches, ...linkMatches]
      .map(m => m[1].trim())
      .filter(t => t.length > 0 && t.length < 100)
      .slice(0, 10);

    // Extract visible text (remove scripts, styles, and strip tags)
    let visibleText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit visible text to first 3000 characters to avoid token limits
    visibleText = visibleText.substring(0, 3000);

    console.log("Scraping completed successfully");
    console.log("- Title:", title);
    console.log("- Main headline:", mainHeadline);
    console.log("- Subheadlines found:", subHeadlines.length);
    console.log("- CTAs found:", ctaTexts.length);

    return {
      title,
      metaDescription,
      mainHeadline,
      subHeadlines,
      ctaTexts,
      visibleText,
      success: true
    };

  } catch (error) {
    console.error("Error scraping website:", error);
    return createEmptyResult();
  }
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
