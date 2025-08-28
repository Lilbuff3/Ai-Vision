import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface ImageUploaderProps {
  onImagesChange: (files: File[]) => void;
}

const MAX_FILES = 8;
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesChange }) => {
  const [currentFiles, setCurrentFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    return () => {
      previews.forEach(file => URL.revokeObjectURL(file));
    };
  }, [previews]);

  const processFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const filesArray = Array.from(selectedFiles);
    setUploadError(null);

    // Clean up all previous blob URLs
    previews.forEach(file => URL.revokeObjectURL(file));

    if (filesArray.length > MAX_FILES) {
      setUploadError(`You can only upload a maximum of ${MAX_FILES} images.`);
      setCurrentFiles([]);
      setPreviews([]);
      onImagesChange([]);
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of filesArray) {
      if (!file.type.startsWith('image/')) {
        setUploadError(`File "${file.name}" is not a valid image type.`);
        setCurrentFiles([]);
        setPreviews([]);
        onImagesChange([]);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setUploadError(`File "${file.name}" is too large (max ${MAX_SIZE_MB}MB).`);
        setCurrentFiles([]);
        setPreviews([]);
        onImagesChange([]);
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setCurrentFiles(validFiles);
    setPreviews(newPreviews);
    onImagesChange(validFiles);
    setSelectedImageIndex(0); // Reset to first image on new upload
  }, [onImagesChange, previews]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
     if (event.target) {
      event.target.value = '';
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleRemoveImage = (indexToRemove: number) => {
    URL.revokeObjectURL(previews[indexToRemove]);

    const newFiles = currentFiles.filter((_, i) => i !== indexToRemove);
    const newPreviews = previews.filter((_, i) => i !== indexToRemove);
    
    setCurrentFiles(newFiles);
    setPreviews(newPreviews);
    onImagesChange(newFiles);

    // Adjust selected index if it's out of bounds
    if (selectedImageIndex >= newFiles.length) {
      setSelectedImageIndex(Math.max(0, newFiles.length - 1));
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        id="file-upload"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      {previews.length > 0 ? (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-slate-200">
                    Image Gallery ({currentFiles.length}/{MAX_FILES})
                </h3>
                <button 
                    onClick={onButtonClick}
                    className="text-sm font-semibold text-violet-400 hover:underline focus:outline-none focus:ring-2 focus:ring-violet-500 rounded"
                >
                    Change Selection
                </button>
            </div>
            <div className="relative mb-4 aspect-square w-full bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700">
                {previews[selectedImageIndex] && (
                    <img
                        key={selectedImageIndex}
                        src={previews[selectedImageIndex]}
                        alt={`Selected preview ${selectedImageIndex + 1}`}
                        className="w-full h-full object-contain animate-fade-in"
                    />
                )}
            </div>
            <div className="flex items-center gap-3 pb-2 -mx-2 px-2 overflow-x-auto">
                {previews.map((preview, index) => (
                    <div key={index} className="relative group flex-shrink-0">
                    <button
                        onClick={() => setSelectedImageIndex(index)}
                        className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900/50 focus:ring-violet-500 ${
                        selectedImageIndex === index
                            ? 'border-violet-500 shadow-md'
                            : 'border-slate-600 hover:border-violet-500'
                        }`}
                        aria-label={`View image ${index + 1}`}
                    >
                        <img src={preview} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                    <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full h-5 w-5 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 hover:scale-110 backdrop-blur-sm"
                        aria-label={`Remove image ${index + 1}`}
                    >
                        &times;
                    </button>
                    </div>
                ))}
            </div>
        </div>
      ) : (
        <div 
            onDragEnter={handleDrag} 
            onDragLeave={handleDrag} 
            onDragOver={handleDrag} 
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300 ${dragActive ? 'border-violet-500 bg-violet-900/30 ring-2 ring-violet-500 ring-offset-4 ring-offset-slate-950' : 'border-slate-600 hover:border-violet-500'}`}
        >
            <div className="flex flex-col items-center py-4">
                <UploadIcon />
                <label htmlFor="file-upload" className="mt-4 text-base font-medium text-slate-300">
                <span 
                    onClick={onButtonClick} 
                    className="cursor-pointer font-semibold text-violet-400 hover:underline"
                >
                    Click to upload
                </span>
                {' '}or drag and drop
                </label>
                <p className="mt-1 text-xs text-slate-400">
                PNG, JPG, etc. up to {MAX_SIZE_MB}MB each. <span className="font-semibold">Max {MAX_FILES} images.</span>
                </p>
            </div>
        </div>
      )}

      {uploadError && (
        <p className="mt-2 text-sm text-red-400">{uploadError}</p>
      )}
    </div>
  );
};