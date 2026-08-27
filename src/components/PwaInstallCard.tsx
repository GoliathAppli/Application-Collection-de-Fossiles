import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check, Share, PlusSquare, Sparkles, FolderHeart } from 'lucide-react';

interface PwaInstallCardProps {
  isLight?: boolean;
}

export default function PwaInstallCard({ isLight = false }: PwaInstallCardProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).__deferredPWAInstallPrompt || null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    ) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // If prompt was already captured in index.html before React mounted
    if ((window as any).__deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).__deferredPWAInstallPrompt);
    }

    // Listen for custom event from index.html
    const handlePromptReady = () => {
      if ((window as any).__deferredPWAInstallPrompt) {
        setDeferredPrompt((window as any).__deferredPWAInstallPrompt);
      }
    };

    // Also listen directly in React
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
      (window as any).__deferredPWAInstallPrompt = null;
    };

    window.addEventListener('pwa_prompt_ready', handlePromptReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).__deferredPWAInstallPrompt;
    if (promptEvent) {
      try {
        // Trigger the real native system install dialog
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setInstallSuccess(true);
        }
      } catch (err) {
        console.warn('Error displaying native PWA install prompt:', err);
      } finally {
        setDeferredPrompt(null);
        (window as any).__deferredPWAInstallPrompt = null;
      }
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
          isInstalled || installSuccess
            ? (isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30')
            : (isLight ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-blue-500/15 text-blue-400 border-blue-500/30')
        }`}>
          {isInstalled || installSuccess ? '✓ Déjà installée' : '📱 Installable sur mobile'}
        </span>
      </div>

      <div className={`text-sm leading-relaxed mb-4 space-y-3 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
        <p>
          Installez cette application directement sur votre <strong>smartphone (Android, iPhone, tablette)</strong> pour y accéder comme une véritable application native avec son icône dorée dédiée. Vous pouvez ensuite la ranger librement dans les dossiers de votre écran d'accueil et l'utiliser hors-ligne.
        </p>

        {isInstalled || installSuccess ? (
          <div className={`p-4 rounded-2xl border text-xs space-y-1.5 font-medium ${isLight ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>
            <div className="flex items-center gap-2 font-bold text-emerald-600">
              <Check size={16} className="shrink-0" />
              <span>Application installée avec succès !</span>
            </div>
            <p className="pl-6 text-[11px] opacity-90 flex items-center gap-1.5">
              <FolderHeart size={14} className="shrink-0" />
              L'icône est maintenant disponible sur votre écran d'accueil et peut être déplacée ou classée dans vos dossiers d'applications.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* Direct install trigger button */}
            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="button"
                onClick={handleInstallClick}
                className={`w-full sm:w-auto px-6 py-3.5 border-2 font-serif uppercase tracking-widest text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                  isLight 
                    ? 'bg-black hover:bg-slate-800 text-white border-black shadow-slate-300/50' 
                    : 'bg-gradient-to-r from-[#D4AF37] to-[#F1D779] text-[#060B1A] hover:brightness-110 border-[#D4AF37] shadow-[#D4AF37]/20'
                }`}
              >
                {deferredPrompt ? (
                  <>
                    <Download size={16} />
                    Installer sur l'écran d'accueil
                  </>
                ) : isIos ? (
                  <>
                    <Smartphone size={16} />
                    {showIosGuide ? 'Masquer les étapes iPhone/iPad' : 'Installer sur iPhone / iPad (Safari)'}
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Installer l'application
                  </>
                )}
              </button>
            </div>

            {/* iOS Guide Accordion */}
            {isIos && showIosGuide && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2.5 animate-fade-in ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#060B1A]/80 border-[#D4AF37]/20 text-slate-200'}`}>
                <div className="font-bold text-[13px] flex items-center gap-1.5 text-amber-500">
                  <Sparkles size={14} /> Procédure d'installation iOS (Safari) :
                </div>
                <div className="font-medium flex items-center gap-2">
                  <Share size={14} className="text-blue-500 shrink-0" />
                  1. Appuyez sur le bouton <strong>Partager</strong> en bas de Safari.
                </div>
                <div className="font-medium flex items-center gap-2">
                  <PlusSquare size={14} className="text-emerald-500 shrink-0" />
                  2. Sélectionnez <strong>« Sur l'écran d'accueil »</strong> dans la liste.
                </div>
                <div className="font-medium">
                  3. Cliquez sur <strong>« Ajouter »</strong> en haut à droite : l'icône de l'exposition sera créée sur votre écran d'accueil et vous pourrez la glisser dans n'importe quel dossier !
                </div>
              </div>
            )}

            {/* Information box on how installation works */}
            {!deferredPrompt && !isIos && (
              <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#060B1A]/60 border-[#D4AF37]/15 text-slate-300'}`}>
                <div className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                  💡 Boîte de dialogue du système :
                </div>
                <p>
                  Dès que votre navigateur (Chrome, Edge, Samsung Internet) détecte les conditions d'installation, un clic sur le bouton ci-dessus ouvre immédiatement la <strong>boîte de dialogue officielle d'installation du système</strong>.
                </p>
                <p className="text-[11px] opacity-80">
                  Vous pouvez également installer l'application à tout moment via le menu de votre navigateur (les 3 points <span className="font-bold">⋮</span> en haut à droite) → <strong>« Installer l'application »</strong>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
