
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const processDocument = async (
  base64Image: string,
  mimeType: string,
  userIntent: string
): Promise<AnalysisResult> => {
  const model = ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: `Act as DocuMind AI (powered by ERNIE 5 & PaddleOCR logic). Analyze this document based on user intent: "${userIntent}".
            
            Perform these steps:
            1. Extract full text and layout roles (PaddleOCR mode).
            2. Convert to clean Markdown and a JSON schema.
            3. Classify sections, extract entities, and detect risks (ERNIE 4.5 mode).
            4. Cross-reference visual elements with text for human-level explanation (ERNIE 5 mode).
            5. If the intent mentions "build a website", provide a single-file Tailwind HTML/JS implementation.

            Return the response in a structured JSON format following this schema:
            {
              "markdown": "string",
              "jsonSchema": "object",
              "sections": [
                {
                  "title": "string",
                  "content": "string",
                  "riskScore": number (0-1),
                  "entities": [{"type": "string", "value": "string", "confidence": number}]
                }
              ],
              "explanation": "string",
              "websiteCode": "string (optional code block)"
            }
            `
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 20000 }
    }
  });

  const response = await model;
  const result: AnalysisResult = JSON.parse(response.text || '{}');
  return result;
};
