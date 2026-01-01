
import { GoogleGenAI, Type } from "@google/genai";
import { MiiFeatures, MiiPersonality } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateMiiPersonality(features: MiiFeatures): Promise<MiiPersonality> {
  const prompt = `Based on these visual features of a digital avatar (Mii), generate a fun and creative personality profile:
  - Hair: ${features.hairStyle} (${features.hairColor})
  - Eyes: ${features.eyeType}
  - Mouth: ${features.mouthType}
  - Shirt Color: ${features.shirtColor}
  - Glasses: ${features.glasses}
  - Skin Tone: ${features.skinTone}

  Return the character's name, a catchy catchphrase, 3 hobbies, their favorite food, a 2-sentence biography, and a zodiac sign. 
  The tone should be playful and innocent, like a Nintendo character profile.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            catchphrase: { type: Type.STRING },
            hobbies: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            favoriteFood: { type: Type.STRING },
            biography: { type: Type.STRING },
            zodiacSign: { type: Type.STRING }
          },
          required: ["name", "catchphrase", "hobbies", "favoriteFood", "biography", "zodiacSign"]
        }
      }
    });

    const result = JSON.parse(response.text.trim());
    return result;
  } catch (error) {
    console.error("Error generating personality:", error);
    return {
      name: "Guest Mii",
      catchphrase: "I'm ready to play!",
      hobbies: ["Bowling", "Tennis", "Cooking"],
      favoriteFood: "Mushroom Pasta",
      biography: "A mysterious newcomer to the plaza with a passion for gaming.",
      zodiacSign: "Unknown"
    };
  }
}

export async function getMiiSpeech(
  personality: MiiPersonality, 
  userPrompt: string, 
  history: { role: 'user' | 'model', parts: [{ text: string }] }[] = []
): Promise<string> {
  const systemInstruction = `You are ${personality.name}, a Mii living in Mii City. 
  Your catchphrase is "${personality.catchphrase}". 
  Your personality bio: ${personality.biography}. 
  Your hobbies: ${personality.hobbies.join(', ')}.
  
  Speak in a very friendly, enthusiastic, and slightly quirky way, like a character from a Nintendo game (Animal Crossing, Wii Sports, or Tomodachi Life). 
  Keep your responses short (under 40 words). Frequently use your catchphrase or mention your hobbies/favorite food when it feels natural.
  You are an AI chatbot specifically roleplaying as this Mii.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [{ text: userPrompt }]
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9,
        maxOutputTokens: 100,
      }
    });

    return response.text || "I'm not sure what to say, but I'm happy to be here!";
  } catch (error) {
    console.error("Error generating speech:", error);
    return `Oh! ${personality.catchphrase}! I got a bit confused there.`;
  }
}
