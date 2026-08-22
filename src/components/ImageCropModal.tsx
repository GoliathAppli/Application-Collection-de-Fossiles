import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';

interface ImageCropModalProps {
  imageSrc: string;
  onCropSave: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ imageSrc, onCropSave, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/png');
  };

  const handleSave = async () => {
    if (croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        onCropSave(croppedImage);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black bg-opacity-90">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>
      <div className="p-4 bg-[#101A36] border-t border-[#D4AF37]/30 flex flex-wrap gap-4 justify-between items-center text-white font-sans">
        <button onClick={onCancel} className="px-4 py-2 border border-slate-500 rounded-xl text-slate-300 focus:outline-none hover:bg-white/10 font-serif uppercase tracking-widest text-sm transition-all">
          Annuler
        </button>
        <button onClick={() => onCropSave(imageSrc)} className="px-4 py-2 border border-[#D4AF37]/45 rounded-xl text-[#D4AF37] hover:bg-[#D4AF37]/10 focus:outline-none font-serif uppercase tracking-widest text-sm transition-all">
          Image entière
        </button>
        <input
          type="range"
          value={zoom}
          min={1}
          max={3}
          step={0.1}
          aria-labelledby="Zoom"
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 min-w-[100px] mx-4 accent-[#D4AF37]"
        />
        <button onClick={handleSave} className="px-4 py-2 bg-[#D4AF37] text-[#060B1A] font-bold rounded-xl font-serif tracking-widest uppercase hover:bg-[#FFD700] text-sm transition-all focus:outline-none shadow-md">
          Recadrer
        </button>
      </div>
    </div>
  );
}
