import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Fossil } from '../types';

interface GridViewProps {
  fossils: Fossil[];
  onBack: () => void;
  onFossilClick: (fossil: Fossil) => void;
  isLight?: boolean;
}

export default function GridView({ fossils, onBack, onFossilClick, isLight = false }: GridViewProps) {
  const [enlargedImage, setEnlargedImage] = React.useState<string | null>(null);

  return (
    <div className={`flex flex-col min-h-screen font-sans transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0] text-black' : 'bg-[#060B1A] bg-texture text-white'}`}>
      <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-50 backdrop-blur-md transition-colors ${isLight ? 'bg-[#F7F5F0]/95 border-slate-200 text-black' : 'bg-[#060B1A]/95 border-[#D4AF37]/20 text-white'}`}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className={`flex items-center gap-2 p-2 hover:scale-110 active:scale-95 transition-all ${isLight ? 'text-black hover:text-slate-700' : 'text-slate-300 hover:text-[#D4AF37]'}`}>
            <ChevronLeft size={24} /> 
            <span className={`hidden sm:inline font-serif tracking-widest text-sm uppercase font-bold ${isLight ? 'text-black' : 'text-slate-200'}`}>Retour</span>
          </button>
        </div>
        <h2 className={`text-2xl md:text-3xl font-serif font-bold tracking-widest uppercase flex-1 text-center hidden sm:block animate-fade-in drop-shadow-sm ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
          Galerie Complète
        </h2>
        <div className="w-20"></div>
      </div>

      <div className="flex-1 p-4 md:p-8">
        <h2 className={`text-2xl font-serif font-bold tracking-widest mb-8 text-center sm:hidden animate-fade-in drop-shadow-sm uppercase ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
          Galerie Complète
        </h2>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
          {fossils.map((fossil, index) => (
            <div 
              key={fossil.id} 
              className={`border-2 rounded-2xl overflow-hidden shadow-lg relative cursor-pointer group flex flex-col h-64 md:h-72 hover:-translate-y-1 transition-all duration-300 animate-fade-in ${
                isLight 
                  ? 'bg-white border-slate-200 hover:border-slate-400 text-black' 
                  : 'bg-transparent border-[#D4AF37]/20 hover:border-[#D4AF37]/60 text-white'
              } ${index % 5 === 0 ? 'delay-0' : index % 5 === 1 ? 'delay-100' : index % 5 === 2 ? 'delay-200' : 'delay-300'}`}
              onClick={() => onFossilClick(fossil)}
              title="Cliquez sur la carte pour voir la fiche. Cliquez sur la photo pour l'agrandir."
            >
              <div className={`flex-1 w-full overflow-hidden relative ${isLight ? 'bg-slate-100' : 'bg-[#101A36]'}`} onClick={(e) => {
                  e.stopPropagation();
                  if (fossil.carouselImage || fossil.mainImage) {
                    setEnlargedImage(fossil.carouselImage || fossil.mainImage);
                  }
              }}>
                {fossil.carouselImage || fossil.mainImage ? (
                  <img src={fossil.carouselImage || fossil.mainImage} alt={fossil.title} className="w-full h-full object-contain filter brightness-95 group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center font-serif italic text-sm ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>Pas d'image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className={`p-3 md:p-4 border-t z-10 w-full overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-[#101A36] border-[#D4AF37]/10'}`}>
                <h3 className={`text-sm md:text-base font-serif font-bold truncate transition-colors ${isLight ? 'text-black group-hover:text-slate-700' : 'text-white group-hover:text-[#D4AF37]'}`}>{fossil.title || 'Sans titre'}</h3>
                <p className={`text-xs md:text-sm font-serif italic uppercase tracking-wider mt-1 ${isLight ? 'text-slate-700 font-bold' : 'text-[#D4AF37]/80'}`}>{fossil.period}</p>
              </div>
            </div>
          ))}
          {fossils.length === 0 && (
            <div className={`col-span-full p-12 text-center font-serif italic text-lg ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
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
