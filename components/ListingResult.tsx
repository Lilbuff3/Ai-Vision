import React, { useState } from 'react';
import { EbayListing } from '../types';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { EbayIcon } from './icons/EbayIcon';
import { Spinner } from './Spinner';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ListingResultProps {
  listing: EbayListing;
  isEbayConnected: boolean;
  onPostToEbay: () => void;
  postStatus: { loading: boolean; error: string | null; success: string | null };
}

interface AccordionSectionProps {
    title: string;
    sectionKey: string;
    children: React.ReactNode;
    onCopy: () => void;
    copied: boolean;
    isOpen: boolean;
    toggleSection: (key: string) => void;
}

const CopyButton: React.FC<{ onCopy: (e: React.MouseEvent) => void; copied: boolean; title: string }> = ({ onCopy, copied, title }) => (
  <button onClick={onCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all text-slate-300 bg-slate-900/50 hover:bg-slate-700 border border-slate-600" aria-label={`Copy ${title}`}>
    {copied ? (<><CheckIcon />Copied</>) : (<><CopyIcon />Copy</>)}
  </button>
);

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, sectionKey, children, onCopy, copied, isOpen, toggleSection }) => {
    const handleCopyClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent accordion from toggling
        onCopy();
    };
    return (
        <div className="border-b border-slate-700 last:border-b-0">
            <h3 className="text-lg font-semibold text-slate-100">
                <button
                    type="button"
                    onClick={() => toggleSection(sectionKey)}
                    className="flex justify-between items-center w-full p-4 md:p-5 text-left text-slate-100 hover:bg-slate-800/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-400 transition-colors"
                    aria-expanded={isOpen}
                    aria-controls={`accordion-content-${sectionKey}`}
                >
                    <span>{title}</span>
                    <div className="flex items-center gap-4">
                        <CopyButton onCopy={handleCopyClick} copied={copied} title={title} />
                        <ChevronDownIcon className={`w-5 h-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>
            </h3>
            <div
                id={`accordion-content-${sectionKey}`}
                className={`overflow-hidden transition-max-height duration-400 ease-in-out ${isOpen ? 'max-h-screen-safe' : 'max-h-0'}`}
            >
                <div className="p-4 md:p-5 border-t border-slate-700 bg-slate-900/20">
                    <div className="text-slate-300 space-y-2">{children}</div>
                </div>
            </div>
        </div>
    );
};


export const ListingResult: React.FC<ListingResultProps> = ({ listing, isEbayConnected, onPostToEbay, postStatus }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(['title', 'category']);

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev =>
      prev.includes(sectionKey)
        ? prev.filter(s => s !== sectionKey)
        : [...prev, sectionKey]
    );
  };

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatSpecificsForCopy = () => listing.itemSpecifics.map(spec => `${spec.name}: ${spec.value}`).join('\n');

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 border border-slate-700/50 animate-fade-in overflow-hidden">
      <div className="text-center p-6 md:p-8">
        <h2 className="text-3xl font-bold text-white">Your AI-Generated Listing</h2>
        <p className="text-slate-400 mt-1">Review the content below and post directly to eBay.</p>
      </div>

      <div className="border-y border-slate-700">
        <AccordionSection title="Listing Title" sectionKey="title" onCopy={() => handleCopy(listing.title, 'title')} copied={copiedSection === 'title'} isOpen={openSections.includes('title')} toggleSection={toggleSection}>
          <p className="text-lg font-semibold bg-slate-900/50 p-3 rounded-md text-white">{listing.title}</p>
        </AccordionSection>
        
        <AccordionSection title="Category Suggestions" sectionKey="category" onCopy={() => handleCopy(listing.category.join('\n'), 'category')} copied={copiedSection === 'category'} isOpen={openSections.includes('category')} toggleSection={toggleSection}>
          <ol className="list-decimal list-inside space-y-2">
            {listing.category.map((cat, index) => <li key={index}><code className="text-sm bg-slate-700/80 rounded px-2 py-1">{cat}</code></li>)}
          </ol>
          <p className="text-xs text-slate-400 pt-2">The first option is usually the best. Select the most accurate category on eBay.</p>
        </AccordionSection>
        
        <AccordionSection title="Item Specifics" sectionKey="specifics" onCopy={() => handleCopy(formatSpecificsForCopy(), 'specifics')} copied={copiedSection === 'specifics'} isOpen={openSections.includes('specifics')} toggleSection={toggleSection}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm p-4 bg-slate-900/50 rounded-md">
            {listing.itemSpecifics.map((spec, index) => <div key={index} className="flex"><strong className="w-2/5 font-medium text-slate-400 shrink-0">{spec.name}:</strong><span>{spec.value}</span></div>)}
          </div>
        </AccordionSection>
        
        <AccordionSection title="Description" sectionKey="description" onCopy={() => handleCopy(listing.description, 'description')} copied={copiedSection === 'description'} isOpen={openSections.includes('description')} toggleSection={toggleSection}>
          <div className="prose prose-sm prose-invert max-w-none p-4 rounded-md border bg-slate-900/50 border-slate-700" dangerouslySetInnerHTML={{ __html: listing.description }} />
        </AccordionSection>
      </div>

      <div className="p-6 md:p-8 text-center bg-slate-800/30">
        <button onClick={onPostToEbay} disabled={!isEbayConnected || postStatus.loading} className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-indigo-500 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed transition-all transform hover:scale-105">
          {postStatus.loading ? (<><Spinner /><span>Posting to eBay...</span></>) : (<><EbayIcon isButton={true} /><span>Post to eBay</span></>)}
        </button>
        {!isEbayConnected && <p className="text-xs text-slate-500 mt-2">You must connect your eBay account to post.</p>}
        {postStatus.error && <p className="text-sm text-red-400 mt-3">{postStatus.error}</p>}
        {postStatus.success && <p className="text-sm text-green-400 mt-3">{postStatus.success}</p>}
      </div>
    </div>
  );
};