
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
      throw new Error(`HTTP error! Status: ${response.status}`);
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
}

export async function generateWebsiteAnalysis(
  url: string,
  screenshotUrl: string,
  openAIApiKey: string,
  scrapedContent?: ScrapedContent
): Promise<any> {
  console.log("Starting OpenAI analysis for URL:", url);
  
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

Use BOTH the screenshot (${screenshotUrl}) for visual analysis AND the scraped text content for precise copy analysis.${contentContext}`;

  console.log("Sending request to OpenAI");
  try {
    const openAIResponse = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
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
      }),
    });

    const aiData = await openAIResponse.json();
    console.log("OpenAI analysis completed successfully");
    
    if (!aiData.choices || aiData.choices.length === 0 || !aiData.choices[0].message || !aiData.choices[0].message.content) {
      console.error("Invalid OpenAI response format:", aiData);
      throw new Error('Invalid response from OpenAI API');
    }
    
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
