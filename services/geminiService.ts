
import { GoogleGenAI } from "@google/genai";
import { AspectRatio } from "../types";

// Helper to get Gemini Client safely
// This prevents the app from crashing on load if the API key is missing or process is undefined
const getAiClient = () => {
  let apiKey = '';
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      apiKey = process.env.API_KEY;
    } 
    // @ts-ignore
    else if (typeof window !== 'undefined' && window.process && window.process.env && window.process.env.API_KEY) {
      // @ts-ignore
      apiKey = window.process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Failed to access environment variables safely");
  }

  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates an image using Gemini 3 Pro Image Preview
 * This handles the explicit requirement for aspect ratio control.
 */
export const generateCloudImage = async (
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) throw new Error("API Key not found. Please configure your API_KEY.");

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K", 
        },
      },
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned");
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
};

/**
 * Fast assistant using Gemini 2.5 Flash Lite
 * Used for quick search help, command interpretation, or quick Q&A.
 */
export const fastAssistant = async (query: string): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) return "AI is currently unavailable (Missing API Key).";

    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest', // Maps to Flash-Lite
      contents: query,
      config: {
        systemInstruction: "You are UnyxCloud Assistant, a helpful AI inside a file storage app. Keep answers very short, concise and helpful. You help users find files or understand app features.",
      }
    });
    
    return response.text || "I couldn't process that request.";
  } catch (error) {
    console.error("Assistant error:", error);
    return "Sorry, I'm having trouble connecting to the AI right now.";
  }
};

/**
 * Analyzes file content (text or image) to generate tags and descriptions.
 * Uses standard Flash for balance of speed/intelligence on existing content.
 */
export const analyzeFileContent = async (base64Data: string, mimeType: string): Promise<{ description: string, tags: string[] }> => {
  try {
    const ai = getAiClient();
    if (!ai) return { description: "AI Analysis unavailable (Missing Key)", tags: [] };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Analyze this file. Return a JSON object with a 'description' (short summary) and 'tags' (array of 3-5 keywords)."
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return { description: "Analysis failed", tags: [] };
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Analysis error:", error);
    return { description: "Could not analyze file.", tags: [] };
  }
};
