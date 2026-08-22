import React from 'react';
import { ChevronLeft, Home } from 'lucide-react';
import { Fossil } from '../types';

interface GridViewProps {
  fossils: Fossil[];
  onBack: () => void;
  onFossilClick: (fossil: Fossil) => void;
}

export default function GridView({ fossils, onBack, onFossilClick }: GridViewProps) {
  const [enlargedImage, setEnlargedImage] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-[#060B1A] bg-texture font-sans text-white">
      <div className="p-4 bg-[#060B1A]/95 border-b border-[#D4AF37]/20 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="flex items-center gap-2 p-2 text-slate-300 hover:text-[#D4AF37] hover:scale-110 active:scale-95 transition-all"><ChevronLeft size={24} /> <span className="hidden sm:inline font-serif tracking-widest text-sm uppercase">Retour</span></button>
        </div>
        <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-widest uppercase text-[#D4AF37] flex-1 text-center hidden sm:block animate-fade-in drop-shadow-sm">Galerie Complète</h2>
        <div className="w-20"></div>
      </div>

      <div className="flex-1 p-4 md:p-8">
        <h2 className="text-2xl font-serif font-bold tracking-widest text-[#D4AF37] mb-8 text-center sm:hidden animate-fade-in drop-shadow-sm uppercase">Galerie Complète</h2>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
          {fossils.map((fossil, index) => (
            <div 
              key={fossil.id} 
              className={`bg-transparent border-2 border-[#D4AF37]/20 rounded-2xl overflow-hidden shadow-lg relative cursor-pointer group flex flex-col h-64 md:h-72 hover:-translate-y-1 hover:border-[#D4AF37]/60 transition-all duration-300 animate-fade-in ${index % 5 === 0 ? 'delay-0' : index % 5 === 1 ? 'delay-100' : index % 5 === 2 ? 'delay-200' : 'delay-300'}`}
              onClick={() => onFossilClick(fossil)}
              title="Cliquez sur la carte pour voir la fiche. Cliquez sur la photo pour l'agrandir."
            >
              <div className="flex-1 w-full bg-[#101A36] overflow-hidden relative" onClick={(e) => {
                  e.stopPropagation();
                  if (fossil.carouselImage || fossil.mainImage) {
                    setEnlargedImage(fossil.carouselImage || fossil.mainImage);
                  }
              }}>
                {fossil.carouselImage || fossil.mainImage ? (
                  <img src={fossil.carouselImage || fossil.mainImage} alt={fossil.title} className="w-full h-full object-contain filter brightness-95 group-hover:scale-105 transition-transform duration-500 bg-[#101A36]/20" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-serif italic text-sm">Pas d'image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="p-3 md:p-4 bg-[#101A36] border-t border-[#D4AF37]/10 z-10 w-full overflow-hidden">
                <h3 className="text-sm md:text-base font-serif font-bold text-white truncate group-hover:text-[#D4AF37] transition-colors">{fossil.title || 'Sans titre'}</h3>
                <p className="text-xs md:text-sm text-[#D4AF37]/80 font-serif italic uppercase tracking-wider mt-1">{fossil.period}</p>
              </div>
            </div>
          ))}
          {fossils.length === 0 && (
            <div className="col-span-full p-12 text-center text-slate-400 font-serif italic text-lg">
              Aucun fossile dans le registre pour le moment.
            </div>
          )}
        </div>
      </div>
      
      {enlargedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out flex-col" onClick={() => setEnlargedImage(null)}>
          <img src={enlargedImage} alt="Visuel" className="max-w-full max-h-full object-contain" />
          <p className="text-white mt-4 font-sans text-sm tracking-widest">Cliquez n'importe où pour fermer</p>
        </div>
      )}
    </div>
  );
}
