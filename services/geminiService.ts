
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";

// Standard helper to extract JSON from model responses which might include markdown blocks
const extractJSON = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (inner) {
        throw new Error("Failed to parse response JSON");
      }
    }
    throw new Error("No valid JSON found in response");
  }
};

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Enterprise Document/Media Intelligence
 * Handles documents, images, and videos for extraction and analysis.
 */
export const processMultimodalIntel = async (
  base64Data: string,
  mimeType: string,
  userIntent: string,
  config: {
    useSearch?: boolean;
    useMaps?: boolean;
    useThinking?: boolean;
  }
) => {
  const ai = getAI();
  const tools: any[] = [];
  if (config.useSearch) tools.push({ googleSearch: {} });
  if (config.useMaps) tools.push({ googleMaps: {} });

  const generationConfig: any = {
    tools,
  };

  // Maps grounding is supported in Gemini 2.5 series. 
  // responseMimeType is not allowed when using the googleMaps tool.
  if (!config.useMaps) {
    generationConfig.responseMimeType = "application/json";
  }

  // Thinking budget for complex reasoning tasks
  if (config.useThinking) {
    generationConfig.thinkingConfig = { thinkingBudget: 32768 };
  }

  const response = await ai.models.generateContent({
    model: config.useMaps ? 'gemini-2.5-flash-latest' : 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: `DocuMind AI Multimodal Analysis Task: ${userIntent}. 
            
            Pipeline Strategy:
            1. Extraction: If video/image, use high-resolution visual processing. If document, use structure extraction.
            2. Semantic Layer: Identify entities, relationships, and inconsistencies.
            3. Risk/Compliance: Check for anomalies or missing critical information.
            
            Return strictly valid JSON: 
            {
              "markdown": "Clean documentation of findings",
              "jsonSchema": { "type": "object", "properties": {} },
              "sections": [{"title": "Component", "content": "Findings", "riskScore": 0.0-1.0, "entities": []}],
              "explanation": "Human-readable reasoning and summary",
              "websiteCode": "Optional single-file Tailwind HTML prototype if requested"
            }` 
          }
        ]
      }
    ],
    config: generationConfig
  });

  return {
    data: extractJSON(response.text || '{}'),
    grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

/**
 * Creative Suite: Image Generation (Pro)
 */
export const generateImagePro = async (prompt: string, aspectRatio: string, imageSize: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio: aspectRatio as any, imageSize: imageSize as any }
    },
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated.");
};

/**
 * Creative Suite: Image Editing (Flash)
 */
export const editImageFlash = async (base64Image: string, mimeType: string, prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: prompt }
      ]
    }
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Editing failed.");
};

/**
 * Creative Suite: Video Generation (Veo)
 */
export const generateVideoVeo = async (prompt: string, imageBase64?: string, mimeType?: string, aspectRatio: '16:9' | '9:16' = '16:9') => {
  const ai = getAI();
  const payload: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
  };
  
  if (imageBase64) {
    payload.image = { imageBytes: imageBase64, mimeType };
  }

  let operation = await ai.models.generateVideos(payload);
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }
  
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  return `${downloadLink}&key=${process.env.API_KEY}`;
};

/**
 * Transcription Engine
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: "Output ONLY a precise transcription of this audio. No commentary." }
        ]
      }
    ]
  });
  return response.text;
};

/**
 * TTS Engine
 */
export const generateTTS = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

// Encoding/Decoding Utilities for Live API
export const decodeBase64Audio = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};

export const encodeAudio = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};
