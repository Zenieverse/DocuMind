
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

/**
 * Creates a fresh AI client instance. 
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Enterprise Document/Media Intelligence
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

  if (!config.useMaps) {
    generationConfig.responseMimeType = "application/json";
  }

  if (config.useThinking) {
    generationConfig.thinkingConfig = { thinkingBudget: 32768 };
  }

  const modelName = config.useMaps ? 'gemini-2.5-flash-latest' : 'gemini-3-pro-preview';

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: `DocuMind AI Protocol: ${userIntent}. 
            Execute multi-step intelligence:
            1. Visual Parse: Extract structures, tables, and raw text.
            2. Semantic Layer: Identify entities (names, organizations, risks).
            3. Rationalization: Synthesize findings into human-level reasoning.
            
            Return strictly valid JSON: 
            {
              "markdown": "Complete documentation of the media content",
              "jsonSchema": { "type": "object", "properties": {} },
              "sections": [{"title": "Node Name", "content": "Findings", "riskScore": 0.0, "entities": []}],
              "explanation": "Summarized enterprise-grade insights",
              "websiteCode": "If the intent suggests a UI, provide a complete single-file Tailwind HTML prototype."
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
 * Explore Hugging Face Content
 */
export const exploreHuggingFace = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Retrieve the latest trending content from Hugging Face related to: ${query}. 
    Focus on Models, Datasets, and Spaces. Provide a structured summary.
    
    Return strictly valid JSON:
    {
      "explanation": "Brief overview of current HF trends for this query",
      "items": [
        {
          "type": "model" | "dataset" | "space",
          "name": "Full name of the resource",
          "description": "Short summary",
          "tags": ["tag1", "tag2"],
          "url": "huggingface.co/path"
        }
      ]
    }`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json"
    }
  });

  return {
    data: extractJSON(response.text || '{}'),
    grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

/**
 * Pro Image Generation
 */
export const generateImagePro = async (prompt: string, aspectRatio: string, imageSize: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { 
        aspectRatio: aspectRatio as any, 
        imageSize: imageSize as any 
      }
    },
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Target generation failed.");
};

/**
 * Flash Image Editing
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
  throw new Error("Visual modulation failed.");
};

/**
 * Veo Video Generation
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
 * Audio Transcription Engine
 */
export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: "Precisely transcribe this audio. Return ONLY the transcription." }
        ]
      }
    ]
  });
  return response.text;
};

/**
 * Text-to-Speech Generation
 */
export const generateTTS = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { 
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } 
      }
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

// --- Audio Stream Processing Utils ---

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
