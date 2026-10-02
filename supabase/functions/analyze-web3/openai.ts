
// Function to perform analysis using OpenAI with retry logic
const MAX_RETRIES = 2;
const RETRY_DELAY = 3000;

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
    if (!response.ok) {
      // Capture the provider's error body so the real cause is not lost
      let body = '';
      try {
        body = (await response.clone().text()).slice(0, 500);
      } catch (_) {
        body = '<unreadable body>';
      }
      throw new Error(`HTTP error! Status: ${response.status} - ${body}`);
    }
    return response;

  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    console.log(`Retrying OpenAI API request, ${retries} attempts left`);
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
  links?: string[];
}

// Three states per signal, not a boolean -- "no link found on the page" and
// "a link was found but the lookup failed" are different facts, and only
// the first is safe to state to the model as a finding.
interface GithubSignal {
  linked: boolean;
  available: boolean;
  repo?: string;
  scope?: 'repo' | 'org';
  stars?: number;
  publicRepos?: number;
  contributors?: number;
  lastCommitDate?: string | null;
}
interface SocialSignal {
  linked: boolean;
  available: boolean;
  handle?: string;
  mentionCount7d?: number;
}
interface EnrichmentData {
  github: GithubSignal;
  social: SocialSignal;
}

export interface AiKeys {
  geminiApiKey?: string;
  geminiApiKey2?: string;
  openRouterApiKey?: string;
}

// Provider chain, tried in order. Gemini first: it is on its own key and its
// free tier covers this volume. OpenRouter is the fallback only, because it
// draws on a shared balance that other pipelines can drain.
function buildProviderChain(keys: AiKeys) {
  const chain: { name: string; endpoint: string; key: string; model: string }[] = [];

  if (keys.geminiApiKey) {
    chain.push({
      name: 'gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key: keys.geminiApiKey,
      model: 'gemini-2.5-flash',
    });
  }
  if (keys.geminiApiKey2) {
    chain.push({
      name: 'gemini-key2',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key: keys.geminiApiKey2,
      model: 'gemini-2.5-flash',
    });
  }
  if (keys.openRouterApiKey) {
    chain.push({
      name: 'openrouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      key: keys.openRouterApiKey,
      model: 'google/gemini-2.5-flash',
    });
  }
  return chain;
}

export async function generateWebsiteAnalysis(
  url: string,
  screenshotUrl: string,
  aiKeys: AiKeys,
  scrapedContent?: ScrapedContent,
  enrichment?: EnrichmentData
): Promise<any> {
  console.log("Starting AI analysis for URL:", url);

  // Build context from scraped content
  let contentContext = '';
  if (scrapedContent && scrapedContent.success) {
    contentContext = `

**Scraped Page Content:**
- Page Title: ${scrapedContent.title}
- Meta Description: ${scrapedContent.metaDescription}
- Main Headline (H1): ${scrapedContent.mainHeadline}
- Sub-headlines: ${scrapedContent.subHeadlines.join(', ')}
- CTA Buttons: ${scrapedContent.ctaTexts.join(', ')}
- First 3000 characters of visible text: ${scrapedContent.visibleText}`;
  }

  // Real data, not vibes -- only stated as a finding when the page actually
  // linked a GitHub repo or X/Twitter handle (no guessed/fuzzy matches feed
  // this). "No repo linked" and "a repo was linked but we couldn't verify
  // it" are different facts -- only the first is safe to tell the model as
  // a finding; the second must read as unverifiable, not as evidence of
  // anything, or a transient rate limit becomes a false "no GitHub" critique.
  let enrichmentContext = '';
  const g = enrichment?.github;
  if (g?.linked && g.available) {
    // The model has no reliable sense of today's date and called a 2025
    // commit "future" -- hand it the age explicitly instead of a bare date.
    const lastIso = g.lastCommitDate ? new Date(g.lastCommitDate) : null;
    const ageDays = lastIso ? Math.max(0, Math.floor((Date.now() - lastIso.getTime()) / 86400000)) : null;
    const lastCommit = lastIso
      ? `${lastIso.toISOString().slice(0, 10)} (${ageDays} days ago; today is ${new Date().toISOString().slice(0, 10)})`
      : 'unknown';
    if (g.scope === 'org') {
      enrichmentContext += `\n- GitHub org (${g.repo}): ${g.stars} total stars across its ${g.publicRepos} most recently active public repos, last push ${lastCommit}.`;
    } else {
      const contributorsPart = typeof g.contributors === 'number' ? `, ${g.contributors}+ contributors` : '';
      enrichmentContext += `\n- GitHub (${g.repo}): ${g.stars} stars${contributorsPart}, last commit ${lastCommit}.`;
    }
  } else if (g?.linked && !g.available) {
    enrichmentContext += `\n- GitHub: a repo (${g.repo}) is linked on the page, but its data could not be verified right now -- do not treat this as evidence either way.`;
  } else {
    enrichmentContext += `\n- GitHub: no repo linked on the page.`;
  }
  const s = enrichment?.social;
  if (s?.linked && s.available) {
    enrichmentContext += `\n- X/Twitter (@${s.handle}): ${s.mentionCount7d} mentions across Crypto Twitter in the last 7 days.`;
  } else if (s?.linked && !s.available) {
    enrichmentContext += `\n- X/Twitter: a handle (@${s.handle}) is linked on the page, but mention data could not be verified right now -- do not treat this as evidence either way.`;
  } else {
    enrichmentContext += `\n- X/Twitter: no handle linked on the page.`;
  }
  const realDataBlock = `

**Real Web3 Signal (verified, not inferred from the screenshot):**${enrichmentContext}

Use this data directly in trustAndSocialProof and web3Relevance -- cite the actual numbers rather than guessing at "does this feel Web3-native." A linked-but-unverifiable signal is not evidence of anything and must not be cited as if it were. A genuinely missing GitHub/Twitter link is a real finding worth calling out.`;

  const systemPrompt = `You are a Web3 landing page conversion expert. Your job is to deliver a no-fluff, brutally honest **CRO + UX teardown** for the page at ${url}.

You're speaking directly to a founder or growth lead who wants the truth fast — what's working, what's broken, and what needs fixing ASAP.

Apply modern conversion best practices *and* Web3-native credibility signals. No generic marketing fluff — focus on specifics that move the needle.

Hammer on:
- Messaging clarity (does it say what it does, fast?)
- On-chain fluency (does it feel built by/for crypto people?)
- Trust signals (proof, partners, wallet volume, etc.)
- Call-to-action logic (is the CTA unmissable and desirable?)
- Visual hierarchy and UX flow
- Real Web3 proof points (protocols, token data, DAOs, etc.)

Return your output in this exact structure — valid JSON only, nothing else:

{
  "heroSection": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Blunt, clear critique of the hero headline/subheadline/CTA. Does it speak to the right pain? Does it land?"
  },
  "trustAndSocialProof": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Does this page earn trust or just assume it? Are logos, metrics, or partner mentions doing any heavy lifting?"
  },
  "messagingClarity": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Call out vague claims, buzzwords, or missing buyer context. Reward crisp, direct copy."
  },
  "ctaStrategy": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Is the CTA obvious, valuable, and above the fold? Does it push the visitor toward a real outcome?"
  },
  "visualFlow": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Is the page scannable and logically structured, or a chaotic scroll-fest? Mention layout and mobile UX."
  },
  "web3Relevance": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Does this actually feel Web3-native or just tack on crypto lingo? Mention any token data, wallet connection logic, governance, etc."
  },
  "fixMap": [
    {
      "issue": "Clear one-liner of what's broken or unclear",
      "severity": "high|medium|low",
      "suggestedFix": "A direct rewrite or tactical UI/UX fix"
    }
  ],
  "suggestedRewrite": {
    "headline": "Only include if the original headline is weak. Suggest a sharper version.",
    "subheadline": "Rewrite to be more pain-aware, benefit-driven, or relevant to a Web3 builder."
  },
  "overallScore": <0–100>
}

Tone: Candid. Tactical. No filler. Write like a smart Web3 founder is reading this and wants signal, not fluff.

Use BOTH the screenshot (${screenshotUrl}) for visual analysis AND the scraped text content for precise copy analysis.${contentContext}${realDataBlock}`;

  const providers = buildProviderChain(aiKeys);
  if (providers.length === 0) {
    throw new Error('No AI provider configured. Set GEMINI_API_KEY (or OPENROUTER_API_KEY).');
  }

  const requestBody = {
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: `Analyze this Web3 landing page at ${url}. Use the screenshot for visual analysis and the scraped content for precise text analysis.` },
          { type: "image_url", image_url: { url: screenshotUrl } }
        ]
      }
    ]
  };

  let aiData: any = null;
  const providerErrors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`Sending request to ${provider.name} (${provider.model})`);
      const aiResponse = await fetchWithRetry(provider.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: provider.model, ...requestBody }),
      });

      const candidate = await aiResponse.json();
      if (!candidate.choices || candidate.choices.length === 0 || !candidate.choices[0].message || !candidate.choices[0].message.content) {
        throw new Error(`Invalid response format from ${provider.name}`);
      }

      aiData = candidate;
      console.log(`Analysis completed successfully via ${provider.name}`);
      break;
    } catch (providerError) {
      const msg = providerError instanceof Error ? providerError.message : String(providerError);
      console.error(`Provider ${provider.name} failed: ${msg}`);
      providerErrors.push(`${provider.name}: ${msg.slice(0, 200)}`);
    }
  }

  if (!aiData) {
    throw new Error(`All AI providers failed. ${providerErrors.join(' | ')}`);
  }

  try {
    
    let analysis;
    try {
      const content = aiData.choices[0].message.content.trim();
      
      // Handle potential markdown formatting in response
      let jsonContent = content;
      if (content.startsWith('```json')) {
        jsonContent = content.replace(/```json|```/g, '').trim();
      }
      
      analysis = JSON.parse(jsonContent);
      console.log("Analysis parsed successfully");
      
      // Transform the new format to be compatible with the frontend
      const transformedAnalysis = {
        overallScore: analysis.overallScore,
        categoryScores: {
          "Hero Section": analysis.heroSection.score,
          "Trust & Social Proof": analysis.trustAndSocialProof.score,
          "Messaging Clarity": analysis.messagingClarity.score,
          "CTA Strategy": analysis.ctaStrategy.score,
          "Visual Flow": analysis.visualFlow.score,
          "Web3 Relevance": analysis.web3Relevance.score
        },
        feedback: [
          {
            category: "Hero Section",
            severity: analysis.heroSection.severity,
            feedback: analysis.heroSection.feedback
          },
          {
            category: "Trust & Social Proof",
            severity: analysis.trustAndSocialProof.severity,
            feedback: analysis.trustAndSocialProof.feedback
          },
          {
            category: "Messaging Clarity",
            severity: analysis.messagingClarity.severity,
            feedback: analysis.messagingClarity.feedback
          },
          {
            category: "CTA Strategy",
            severity: analysis.ctaStrategy.severity,
            feedback: analysis.ctaStrategy.feedback
          },
          {
            category: "Visual Flow",
            severity: analysis.visualFlow.severity,
            feedback: analysis.visualFlow.feedback
          },
          {
            category: "Web3 Relevance",
            severity: analysis.web3Relevance.severity,
            feedback: analysis.web3Relevance.feedback
          }
        ],
        // Include original data for advanced use
        rawAnalysis: analysis
      };
      
      // Replace the analysis with our transformed version
      return transformedAnalysis;
      
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, aiData.choices[0].message.content);
      const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      throw new Error(`Failed to parse analysis response: ${errorMsg}`);
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`OpenAI API error: ${errorMsg}`);
  }
}

// Function to validate analysis data
export function validateAnalysis(analysis: any): void {
  if (!analysis) {
    throw new Error('Analysis data is missing');
  }
  
  if (typeof analysis.overallScore !== 'number') {
    throw new Error('Incomplete analysis data: missing or invalid overallScore');
  }
  
  if (!analysis.feedback || !Array.isArray(analysis.feedback)) {
    throw new Error('Incomplete analysis data: missing feedback array');
  }
  
  if (!analysis.categoryScores || typeof analysis.categoryScores !== 'object') {
    throw new Error('Incomplete analysis data: missing category scores');
  }
}
