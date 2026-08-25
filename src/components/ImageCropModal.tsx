import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { ZoomIn, ZoomOut, Check, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getCroppedAndOptimizedImg, optimizeRawImage } from '../utils/imageOptimizer';

interface ImageCropModalProps {
  imageSrc: string;
  onCropSave: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ imageSrc, onCropSave, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCropped = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedAndOptimizedImg(imageSrc, croppedAreaPixels);
      onCropSave(croppedImage);
    } catch (e) {
      console.error("Erreur recadrage:", e);
      // Fallback: direct save
      onCropSave(imageSrc);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveFull = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const fullOptimized = await optimizeRawImage(imageSrc);
      onCropSave(fullOptimized);
    } catch (e) {
      console.error("Erreur optimisation image entière:", e);
      onCropSave(imageSrc);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-sm animate-fade-in select-none">
      {/* Header bar */}
      <div className="px-6 py-4 bg-[#060B1A] border-b border-[#D4AF37]/25 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-white">
          <ImageIcon size={20} className="text-[#D4AF37]" />
          <h3 className="font-serif font-bold text-sm sm:text-base uppercase tracking-widest text-[#D4AF37]">
            Ajuster & Recadrer la photo
          </h3>
        </div>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
          title="Fermer"
        >
          <X size={22} />
        </button>
      </div>

      {/* Cropper Container */}
      <div className="relative flex-1 w-full min-h-[300px] overflow-hidden bg-black/50">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          showGrid={true}
        />
      </div>

      {/* Controls and Actions bar */}
      <div className="p-4 sm:p-6 bg-[#060B1A] border-t border-[#D4AF37]/25 flex flex-col gap-4 text-white font-sans z-10">
        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-3 max-w-md mx-auto w-full px-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(1)))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
            title="Zoom arrière"
          >
            <ZoomOut size={18} />
          </button>
          
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#D4AF37] cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
          />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
            title="Zoom avant"
          >
            <ZoomIn size={18} />
          </button>
          <span className="text-xs font-mono text-slate-400 w-12 text-right">
            {zoom.toFixed(1)}x
          </span>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-2xl mx-auto w-full pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 border border-slate-600 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 font-serif uppercase tracking-wider text-xs font-bold transition-all"
          >
            Annuler
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveFull}
              disabled={isProcessing}
              className="px-4 py-2.5 border border-[#D4AF37]/50 rounded-xl text-[#D4AF37] hover:bg-[#D4AF37]/15 font-serif uppercase tracking-wider text-xs font-bold transition-all flex items-center gap-1.5"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : null}
              Conserver l'image entière
            </button>

            <button
              type="button"
              onClick={handleSaveCropped}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#FFD700] text-[#060B1A] font-serif uppercase tracking-widest text-xs font-black rounded-xl transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Valider le recadrage
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
