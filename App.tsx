
import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ListingResult } from './components/ListingResult';
import { Spinner } from './components/Spinner';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { EbayIcon } from './components/icons/EbayIcon';
import { generateEbayListing } from './services/geminiService';
import { getEbayAuthUrl, exchangeCodeForToken, checkEbayConnection, disconnectFromEbay, postListingToEbay } from './services/ebayService';
import { EbayListing } from './types';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [personalNote, setPersonalNote] = useState<string>('');
  const [isHighQuality, setIsHighQuality] = useState<boolean>(false);
  const [listing, setListing] = useState<EbayListing | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [isEbayConnected, setIsEbayConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [postStatus, setPostStatus] = useState<{ loading: boolean; error: string | null; success: string | null }>({
    loading: false,
    error: null,
    success: null,
  });

  // Check eBay connection status on initial load
  useEffect(() => {
    const initialize = async () => {
      try {
        const connected = await checkEbayConnection();
        setIsEbayConnected(connected);
      } catch (e) {
        console.error("Failed to check eBay connection");
        setIsEbayConnected(false);
      } finally {
        setIsConnecting(false);
      }
    };
    initialize();
  }, []);

  // Handle OAuth callback from eBay
  useEffect(() => {
    const handleEbayCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        setIsConnecting(true);
        try {
          await exchangeCodeForToken(code);
          setIsEbayConnected(true);
        } catch (err) {
          setError("Failed to connect your eBay account. Please try again.");
        } finally {
          setIsConnecting(false);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    if (window.location.pathname === '/ebay/callback') {
        handleEbayCallback();
    }
  }, []);

  const handleImagesChange = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setListing(null);
    setError(null);
    setPostStatus({ loading: false, error: null, success: null });
  };

  const fileToGenerativePart = (file: File): Promise<{ mimeType: string; data: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({ mimeType: file.type, data: base64Data });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleGenerateListing = useCallback(async () => {
    if (files.length === 0) {
      setError("Please upload at least one image.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setListing(null);
    setPostStatus({ loading: false, error: null, success: null });

    try {
      const imageParts = await Promise.all(files.map(fileToGenerativePart));
      const result = await generateEbayListing(imageParts, personalNote, isHighQuality);
      setListing(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [files, personalNote, isHighQuality]);

  const handleEbayConnect = async () => {
    try {
        const url = await getEbayAuthUrl();
        window.location.href = url;
    } catch (err) {
        setError("Could not connect to eBay. Please try again later.");
    }
  };

  const handleEbayDisconnect = async () => {
    await disconnectFromEbay();
    setIsEbayConnected(false);
  };

  const handlePostToEbay = async () => {
    if (!listing) return;
    setPostStatus({ loading: true, error: null, success: null });
    try {
        const result = await postListingToEbay(listing, files);
        if (result.success) {
            setPostStatus({ loading: false, error: null, success: `Successfully posted! View your listing: ${result.itemUrl}` });
        } else {
            throw new Error('Posting failed for an unknown reason.');
        }
    } catch (err) {
        setPostStatus({ loading: false, error: err instanceof Error ? err.message : "Failed to post to eBay.", success: null });
    }
  }

  return (
    <div className="min-h-screen font-sans">
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">eBay Listing AI</h1>
          <p className="text-lg text-slate-400 mt-2">Instantly generate and post eBay listings from your item's photos.</p>
        </header>

        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-6 md:p-8 border border-slate-700/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-slate-100">eBay Account</h2>
              {isConnecting ? <Spinner /> : (
                  isEbayConnected ? (
                      <div className="flex items-center gap-4 mt-2 sm:mt-0">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-medium text-green-400">Connected</span>
                          </div>
                          <button onClick={handleEbayDisconnect} className="text-xs text-slate-400 hover:underline hover:text-slate-200 transition-colors">Disconnect</button>
                      </div>
                  ) : (
                      <button onClick={handleEbayConnect} className="inline-flex items-center gap-2 px-4 py-2 mt-2 sm:mt-0 bg-slate-800 text-slate-200 font-semibold rounded-lg hover:bg-slate-700 transition-colors border border-slate-600">
                          <EbayIcon /> Connect to eBay
                      </button>
                  )
              )}
          </div>
          <ImageUploader onImagesChange={handleImagesChange} />
          
          <div className="mt-6 space-y-4">
            <div>
                <label htmlFor="personal-note" className="block text-sm font-medium text-slate-300 mb-2">
                    Personal Note (Optional)
                </label>
                <textarea
                    id="personal-note"
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    placeholder="e.g., 'From a smoke-free home', 'Slight scratch on the back, see photo 3'"
                    className="w-full p-3 bg-slate-900/80 rounded-md border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    rows={2}
                />
            </div>
            <div className="relative flex items-start">
                <div className="flex h-6 items-center">
                    <input
                    id="high-quality-mode"
                    aria-describedby="high-quality-mode-description"
                    name="high-quality-mode"
                    type="checkbox"
                    checked={isHighQuality}
                    onChange={(e) => setIsHighQuality(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-600 focus:ring-violet-600"
                    />
                </div>
                <div className="ml-3 text-sm leading-6">
                    <label htmlFor="high-quality-mode" className="font-medium text-slate-300">
                    High-Detail Mode
                    </label>
                    <p id="high-quality-mode-description" className="text-slate-400">
                    For complex items. Provides deeper analysis but takes longer.
                    </p>
                </div>
            </div>
          </div>


          <div className="mt-8 text-center">
            <button onClick={handleGenerateListing} disabled={isLoading || files.length === 0} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-indigo-500 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed transition-all transform hover:scale-105">
              {isLoading ? (<><Spinner /><span>{isHighQuality ? 'Performing detailed analysis...' : 'Analyzing...'}</span></>) : (<><SparklesIcon isButton={true} /><span>Generate Listing</span></>)}
            </button>
          </div>
        </div>

        {error && <div className="mt-8 bg-red-900/50 text-red-300 px-4 py-3 rounded-lg border border-red-700/50" role="alert">{error}</div>}

        {listing && !isLoading && (
          <div className="mt-8">
            <ListingResult 
              listing={listing} 
              isEbayConnected={isEbayConnected}
              onPostToEbay={handlePostToEbay}
              postStatus={postStatus}
            />
          </div>
        )}
      </main>
      <footer className="text-center p-4 text-sm text-slate-500"><p>Powered by Google Gemini & eBay API</p></footer>
    </div>
  );
};

export default App;
