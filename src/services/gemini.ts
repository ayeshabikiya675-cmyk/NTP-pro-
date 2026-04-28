import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AnalysisResult {
  isFake: boolean;
  confidenceScore: number;
  verdict: string;
  reasons: string[];
  sources: string[];
  globalContext: string;
  reportMarkdown: string;
}

export async function analyzeNews(text: string, imageBase64?: string): Promise<AnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are NTP Pro (News Trace Proof Pro), a professional global misinformation detective.
    Your task is to analyze news articles, social media posts, or screenshots to detect fake news.
    
    STRICT REQUIREMENTS:
    1. Provide a confidence score (0-100).
    2. Define a verdict: "REAL", "PROBABLY REAL", "MISLEADING", "PROBABLY FAKE", or "FAKE".
    3. List specific logical fallacies or debunked claims.
    4. Provide global context (how this news is viewed elsewhere).
    5. Generate a professional markdown report.
    
    Output format must be valid JSON:
    {
      "isFake": boolean,
      "confidenceScore": number,
      "verdict": string,
      "reasons": string[],
      "sources": string[],
      "globalContext": string,
      "reportMarkdown": string
    }
  `;

  const contents: any[] = [];
  if (imageBase64) {
    contents.push({
      inlineData: {
        mimeType: "image/png",
        data: imageBase64.split(',')[1] || imageBase64
      }
    });
  }
  
  contents.push({ text: `Analyze this content for fake news: ${text || "See attached screenshot"}` });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: contents },
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as AnalysisResult;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw new Error("Failed to scan news content. Please check connection.");
  }
}
