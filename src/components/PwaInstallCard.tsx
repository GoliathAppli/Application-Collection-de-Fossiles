import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check, Share, PlusSquare } from 'lucide-react';

interface PwaInstallCardProps {
  isLight?: boolean;
}

export default function PwaInstallCard({ isLight = false }: PwaInstallCardProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Capture standard PWA install prompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(!showIosGuide);
    }
  };

  return (
    <div className={`border rounded-3xl p-6 shadow-md transition-all ${isLight ? 'bg-white border-slate-200 text-black' : 'border-[#D4AF37]/25 bg-[#101A36]/60 text-white'}`}>
      <div className={`flex items-center justify-between border-b pb-2 mb-4 border-dashed ${isLight ? 'border-slate-200' : 'border-[#D4AF37]/20'}`}>
        <h3 className={`text-lg font-serif font-bold uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
          <Smartphone size={18} />
          Application Mobile (PWA)
        </h3>
        <span className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full border font-bold ${
          isInstalled 
            ? (isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30')
            : (isLight ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-blue-500/15 text-blue-400 border-blue-500/30')
        }`}>
          {isInstalled ? '✓ Déjà installée' : '📱 Installable sur mobile'}
        </span>
      </div>

      <div className={`text-sm leading-relaxed mb-4 space-y-2.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
        <p>
          Installez cette application directement sur votre <strong>smartphone (Android / iPhone)</strong> ou tablette pour y accéder comme une vraie application native depuis votre écran d'accueil, avec icône personnalisée et fonctionnement hors-ligne.
        </p>

        {isInstalled ? (
          <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2 font-medium ${isLight ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
            <Check size={16} className="text-emerald-500 shrink-0" />
            <span>L'application est configurée et installée en mode autonome sur cet appareil.</span>
          </div>
        ) : deferredPrompt ? (
          <div className="pt-1">
            <button
              onClick={handleInstallClick}
              className={`w-full sm:w-auto px-6 py-3.5 border-2 font-serif uppercase tracking-widest text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                isLight ? 'bg-black hover:bg-slate-800 text-white border-black' : 'bg-[#D4AF37] hover:bg-[#FFD700] text-[#060B1A] border-[#D4AF37]'
              }`}
            >
              <Download size={16} />
              Installer sur mon écran d'accueil
            </button>
          </div>
        ) : isIos ? (
          <div className="space-y-2">
            <button
              onClick={() => setShowIosGuide(!showIosGuide)}
              className={`w-full sm:w-auto px-5 py-3 border font-serif uppercase tracking-widest text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300' : 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/30'
              }`}
            >
              <Smartphone size={15} />
              {showIosGuide ? 'Masquer le guide iPhone/iPad' : 'Comment installer sur iPhone / iPad (Safari) ?'}
            </button>

            {showIosGuide && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-fade-in ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#060B1A]/80 border-[#D4AF37]/20 text-slate-200'}`}>
                <div className="font-bold flex items-center gap-2">
                  <Share size={14} className="text-blue-500" />
                  1. Appuyez sur le bouton <strong>Partager</strong> dans Safari (en bas de votre écran).
                </div>
                <div className="font-bold flex items-center gap-2">
                  <PlusSquare size={14} className="text-emerald-500" />
                  2. Faites défiler vers le bas et appuyez sur <strong>« Sur l'écran d'accueil »</strong>.
                </div>
                <div className="font-bold">
                  3. Validez en haut à droite : l'icône dorée apparaîtra sur votre écran d'accueil !
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#060B1A]/60 border-[#D4AF37]/15 text-slate-300'}`}>
            <div className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
              💡 Pour installer manuellement :
            </div>
            <p>
              Ouvrez le menu de votre navigateur (les 3 petits points <span className="font-bold">⋮</span> en haut à droite sur Chrome) puis cliquez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
