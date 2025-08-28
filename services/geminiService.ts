import type { EbayListing } from '../types';

export const generateEbayListing = async (
  imageParts: { mimeType: string; data: string }[],
  personalNote: string,
  isHighQuality: boolean
): Promise<EbayListing> => {
  try {
    const response = await fetch('/api/generateListing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageParts, personalNote, isHighQuality }),
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}.`;
      try {
        // Try to parse a JSON error body, which is the expected case
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.details || 'Failed to generate listing from backend.';
      } catch (e) {
        // If the body isn't JSON (e.g., a Vercel timeout page), use a more user-friendly message.
        errorMessage = `The AI model is taking too long to respond, which can happen with complex items or during peak hours. Please try generating the listing again.`;
      }
      throw new Error(errorMessage);
    }

    const listingData = await response.json();

    // Basic validation
    if (!listingData.title || !listingData.category || !Array.isArray(listingData.category) || listingData.category.length === 0 || !listingData.itemSpecifics || !listingData.description) {
      throw new Error("Received malformed data from the backend.");
    }

    return listingData as EbayListing;

  } catch (error) {
    console.error("Backend API call failed:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate listing. Details: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the listing.");
  }
};
