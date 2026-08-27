import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check, Share, PlusSquare, Sparkles, FolderHeart, Info, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface PwaInstallCardProps {
  isLight?: boolean;
}

export default function PwaInstallCard({ isLight = false }: PwaInstallCardProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).__deferredPWAInstallPrompt || null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showComparisonDetails, setShowComparisonDetails] = useState(false);

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

        {/* Informational comparison: PWA vs Standalone HTML file */}
        <div className={`mt-4 border rounded-2xl overflow-hidden transition-all ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#060B1A]/70 border-[#D4AF37]/20'
        }`}>
          <button
            type="button"
            onClick={() => setShowComparisonDetails(!showComparisonDetails)}
            className={`w-full p-3.5 flex items-center justify-between text-left cursor-pointer transition-colors ${
              isLight ? 'hover:bg-slate-100' : 'hover:bg-[#101A36]/80'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider">
              <Info size={15} className={isLight ? 'text-blue-600' : 'text-[#D4AF37]'} />
              <span className={isLight ? 'text-slate-900' : 'text-slate-200'}>
                Comprendre : Application PWA vs Fichier Autonome HTML
              </span>
            </div>
            <div className={`p-1 rounded-lg ${isLight ? 'text-slate-600' : 'text-[#D4AF37]'}`}>
              {showComparisonDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {showComparisonDetails && (
            <div className={`p-4 border-t text-xs space-y-3.5 leading-relaxed animate-fade-in ${
              isLight ? 'border-slate-200 text-slate-700' : 'border-[#D4AF37]/15 text-slate-300'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* PWA description */}
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isLight ? 'bg-white border-blue-200/80 shadow-sm' : 'bg-[#101A36]/70 border-blue-500/30'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-[12px] text-blue-500">
                    <Smartphone size={15} className="shrink-0" />
                    <span>Application Mobile (PWA)</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] list-disc list-inside">
                    <li><strong>Usage :</strong> S'ajoute à votre écran d'accueil comme une application native, plein écran sans barre d'URL, rangeable dans vos dossiers.</li>
                    <li><strong>Mode Hors-Ligne :</strong> Fonctionne hors-ligne grâce aux données mémorisées dans le <em>cache Web du navigateur</em>.</li>
                    <li className="text-amber-500 font-medium">
                      <span className="font-bold">⚠️ En cas d'effacement d'historique :</span> Si vous effacez les caches & données de navigation du navigateur alors que vous n'avez pas Internet, la PWA ne retrouvera plus ses fichiers temporaires tant qu'une connexion ne sera pas réactivée pour régénérer le cache.
                    </li>
                  </ul>
                </div>

                {/* Standalone HTML description */}
                <div className={`p-3.5 rounded-xl border space-y-2 ${
                  isLight ? 'bg-white border-emerald-200/80 shadow-sm' : 'bg-[#101A36]/70 border-emerald-500/30'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-[12px] text-emerald-500">
                    <ShieldCheck size={15} className="shrink-0" />
                    <span>Fichier HTML Autonome (.html)</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] list-disc list-inside">
                    <li><strong>Usage :</strong> Véritable fichier physique indépendant stocké dans votre dossier <em>Téléchargements</em> ou <em>Documents</em> de votre téléphone ou PC.</li>
                    <li><strong>Indestructible face au nettoyage :</strong> Même si vous videz 100 % de l'historique et des données de navigation sans aucun réseau Internet, le fichier physique reste intact sur votre disque.</li>
                    <li><strong>Zéro dépendance :</strong> S'ouvre directement par simple clic sans jamais avoir besoin d'Internet ni d'installation.</li>
                  </ul>
                </div>
              </div>

              {/* Recommendation note */}
              <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] font-medium ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              }`}>
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                <p>
                  <strong>Conseil pratique :</strong> Utilisez l'<strong>Application Mobile PWA</strong> au quotidien pour son confort sur smartphone, et conservez une copie du <strong>Fichier HTML Autonome</strong> dans vos fichiers personnels comme sauvegarde permanente à toute épreuve.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
