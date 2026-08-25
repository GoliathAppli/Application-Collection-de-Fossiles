import React, { useState, useRef } from 'react';
import ImageCropModal from './ImageCropModal';
import { Camera, Trash2, RefreshCw, Crop, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { optimizeRawImage } from '../utils/imageOptimizer';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string) => void;
  className?: string;
  icon?: React.ReactNode;
  disableCrop?: boolean;
  onRemove?: () => void;
}

export default function ImageUpload({
  value,
  onChange,
  className,
  icon,
  disableCrop,
  onRemove
}: ImageUploadProps) {
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP...).");
      return;
    }
    
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = async () => {
      const rawResult = reader.result?.toString() || '';
      if (!rawResult) {
        setIsLoading(false);
        return;
      }

      try {
        // Automatically optimize image resolution & file size directly
        const optimized = await optimizeRawImage(rawResult, 1920, 0.90);
        onChange(optimized);
      } catch (err) {
        console.error("Optimisation échouée, conservation de l'original:", err);
        onChange(rawResult);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      alert("Une erreur est survenue lors de la lecture du fichier image.");
    };

    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
    // Always reset input value so re-selecting the exact same image works
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleCropSave = (croppedImage: string) => {
    onChange(croppedImage);
    setCropModalSrc(null);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
  };

  const openCropModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value) {
      setCropModalSrc(value);
    }
  };

  return (
    <>
      <div
        onClick={() => !isLoading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "group relative overflow-hidden cursor-pointer border-2 border-dashed transition-all flex items-center justify-center select-none",
          isDragging
            ? "border-[#D4AF37] bg-[#D4AF37]/15 scale-[1.01]"
            : "border-slate-300 dark:border-slate-700/80 hover:border-[#D4AF37] bg-slate-50/80 dark:bg-[#060B1A]/60 hover:bg-slate-100 dark:hover:bg-[#101A36]/40",
          className
        )}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-4 gap-2 text-[#D4AF37] animate-fade-in">
            <Loader2 size={28} className="animate-spin" />
            <span className="text-xs font-serif font-bold uppercase tracking-wider">Chargement de la photo...</span>
          </div>
        ) : value ? (
          <>
            <img
              src={value}
              alt="Aperçu"
              className={cn(
                "w-full h-full object-contain transition-transform duration-300 group-hover:scale-102",
                className?.includes('object-cover') ? 'object-cover' : 'object-contain'
              )}
            />

            {/* Hover overlay with clear action buttons */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px] p-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white text-black hover:bg-slate-200 shadow-md transition-all active:scale-95 flex items-center gap-1 text-xs font-serif font-bold uppercase tracking-wider"
                title="Remplacer par une autre photo"
              >
                <RefreshCw size={12} />
                <span className="hidden sm:inline">Changer</span>
              </button>

              {!disableCrop && (
                <button
                  type="button"
                  onClick={openCropModal}
                  className="px-2.5 py-1.5 rounded-xl bg-[#D4AF37] text-[#060B1A] hover:bg-[#FFD700] shadow-md transition-all active:scale-95 flex items-center gap-1 text-xs font-serif font-black uppercase tracking-wider"
                  title="Recadrer / Ajuster"
                >
                  <Crop size={12} />
                  <span className="hidden sm:inline">Recadrer</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRemove}
                className="px-2.5 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-md transition-all active:scale-95 flex items-center gap-1 text-xs font-serif font-bold uppercase tracking-wider"
                title="Supprimer la photo"
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">Supprimer</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-slate-500 dark:text-slate-400 gap-2 pointer-events-none">
            {icon || (
              <div className="p-3 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-[#D4AF37]">
                <Camera size={24} />
              </div>
            )}
            <span className="text-xs font-serif uppercase tracking-wider font-semibold opacity-90">
              Cliquer ou glisser une photo
            </span>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="image/*"
        className="hidden"
      />

      {cropModalSrc && (
        <ImageCropModal
          imageSrc={cropModalSrc}
          onCropSave={handleCropSave}
          onCancel={() => setCropModalSrc(null)}
        />
      )}
    </>
  );
}
