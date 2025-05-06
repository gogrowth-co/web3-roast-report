
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

export async function generateWebsiteAnalysis(
  url: string,
  screenshotUrl: string,
  openAIApiKey: string
): Promise<any> {
  console.log("Starting OpenAI analysis for URL:", url);
  
  const systemPrompt = `You are a Web3 landing page conversion expert analyzing the page at ${url}.

Your job is to deliver a brutally honest, constructive **CRO + UX teardown** for this Web3 or crypto-native landing page. Apply both **modern conversion rate optimization principles** and **Web3-specific credibility signals**.

Focus especially on:
- Messaging clarity
- On-chain culture fluency
- Trust-building elements
- Web3-specific proof
- UX flow and visual hierarchy
- Call-to-action logic

Use this exact structure in your output. Format your response as valid JSON only. Do not add explanations or any extra commentary outside the object.

{
  "heroSection": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Concise, actionable critique about the headline/subheadline/CTA clarity and benefit."
  },
  "trustAndSocialProof": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Comment on testimonials, logos, credibility metrics, or lack thereof."
  },
  "messagingClarity": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Note vague language, jargon, lack of buyer-centric phrasing, or feature-dumping."
  },
  "ctaStrategy": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Evaluate visibility, urgency, value clarity, and placement of calls-to-action."
  },
  "visualFlow": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Assess visual hierarchy, scannability, mobile flow, or image use."
  },
  "web3Relevance": {
    "score": <0–100>,
    "severity": "high|medium|low",
    "feedback": "Does the landing page show it's truly Web3-native? Is there token data, protocol context, or culture fluency?"
  },
  "fixMap": [
    {
      "issue": "Short description of problem",
      "severity": "high|medium|low",
      "suggestedFix": "One-liner solution or rewrite suggestion"
    }
  ],
  "suggestedRewrite": {
    "headline": "Only if hero copy is weak – suggest a better headline here.",
    "subheadline": "Suggest a more benefit-driven, pain-aware subheadline here."
  },
  "overallScore": <0–100>
}

You may use the scraped text and screenshot URL (${screenshotUrl}) if needed. Prioritize clarity and Web3 relevance over being nice. Be punchy, direct, and write like you're advising a founder who wants the truth, fast.`;

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
          { role: "user", content: `Please analyze this Web3 project at ${url} with its screenshot at ${screenshotUrl}` }
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
      throw new Error(`Failed to parse analysis response: ${parseError.message}`);
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${error.message}`);
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
