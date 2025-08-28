import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const listingSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        category: { type: Type.ARRAY, items: { type: Type.STRING } },
        itemSpecifics: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, value: { type: Type.STRING } },
                required: ["name", "value"]
            }
        },
        description: { type: Type.STRING }
    },
    required: ["title", "category", "itemSpecifics", "description"]
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { imageParts, personalNote, isHighQuality } = req.body;

        if (!imageParts || !Array.isArray(imageParts) || imageParts.length === 0) {
            return res.status(400).json({ error: 'Image data is required.' });
        }
        
        const highDetailInstructions = `
        **High-Detail Mode Active:**
        *   **Analysis:** Perform a deeper, more granular analysis of the images. Look for subtle details, flaws, unique markings, or features a collector would value.
        *   **Item Specifics:** Generate an exhaustive list of item specifics. Be very thorough.
        *   **Description:** The description should be more detailed and comprehensive, elaborating on the item's condition and features identified in your analysis.`;

        const prompt = `Analyze the following images of an item and the personal note. Generate a complete, mobile-optimized eBay listing.

        **CRITICAL INSTRUCTIONS:**
        1.  **Title:** Create a concise, keyword-rich title under 80 characters that maximizes search visibility.
        2.  **Category Suggestions:** Provide the top 3 most relevant eBay category paths as an array of strings, ordered from most to least likely.
        3.  **Item Specifics:** Identify all relevant item specifics (e.g., Brand, Model, Color, Size, Type, Condition). Include "Condition" as one of the specifics.
        4.  **Description:** Write an engaging, honest, and mobile-friendly HTML description.
            *   Start with a friendly opening.
            *   Use a bulleted list (\`<ul>\` and \`<li>\`) for key features and condition details.
            *   Incorporate the user's personal note naturally into the description.
            *   End with a concluding sentence that builds buyer confidence (e.g., "Feel free to ask any questions!").
            *   The HTML structure must be clean and simple.
        
        ${isHighQuality ? highDetailInstructions : ''}

        **Personal Note from Seller to Incorporate:** "${personalNote || 'No personal note provided.'}"
        `;

        const formattedImageParts = imageParts.map((part: { mimeType: string; data: string }) => ({
            inlineData: {
                mimeType: part.mimeType,
                data: part.data
            }
        }));

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [...formattedImageParts, { text: prompt }] },
            config: {
                systemInstruction: `You are an expert eBay seller who is an individual, not a business. Your writing style is friendly, trustworthy, and uses the first person ("I", "my").`,
                responseMimeType: "application/json",
                responseSchema: listingSchema,
                temperature: isHighQuality ? 0.7 : 0.4,
            }
        });

        const jsonText = response.text.trim();
        const listingData = JSON.parse(jsonText);

        return res.status(200).json(listingData);

    } catch (error: any) {
        console.error("Gemini API call failed:", error);
        return res.status(500).json({ error: "Failed to generate listing from Gemini API.", details: error.message });
    }
}