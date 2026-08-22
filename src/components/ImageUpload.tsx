import React, { useState, useRef } from 'react';
import ImageCropModal from './ImageCropModal';
import { Camera } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string) => void;
  className?: string;
  icon?: React.ReactNode;
  disableCrop?: boolean;
}

export default function ImageUpload({ value, onChange, className, icon, disableCrop }: ImageUploadProps) {
  const [tempSrc, setTempSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const result = reader.result?.toString() || null;
        if (disableCrop && result) {
          onChange(result);
        } else {
          setTempSrc(result);
        }
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropSave = (croppedImage: string) => {
    onChange(croppedImage);
    setTempSrc(null);
  };

  return (
    <>
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative overflow-hidden cursor-pointer border-2 border-dashed border-gray-400 bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors object-cover",
          className
        )}
      >
        {value ? (
          <img src={value} alt="uploaded" className={cn("w-full h-full object-cover", className?.includes('object-contain') ? 'object-contain bg-transparent' : '')} />
        ) : (
          <div className="absolute flex flex-col items-center justify-center text-gray-500">
            {icon || <Camera size={32} />}
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
      {tempSrc && (
        <ImageCropModal
          imageSrc={tempSrc}
          onCropSave={handleCropSave}
          onCancel={() => setTempSrc(null)}
        />
      )}
    </>
  );
}
