import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fossil, Period, TechnicalSheet } from './types';
import { getFossils, saveFossils, exportData, importData, getHomeImage, saveHomeImage } from './store';
import { playDinoSound, isMuted, setMuted } from './utils/audio';
import { Shell, Dna, ChevronLeft, ChevronRight, Plus, Download, Upload, LayoutGrid, GalleryHorizontal, Settings, Volume2, VolumeX, Moon, Sun, Globe, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { TrilobiteIcon, MammothIcon, AmmoniteIcon } from './components/Icons';
import { goliathBadgeDataUri } from './assets/goliathBadge';
import ImageUpload from './components/ImageUpload';
import FossilFormView from './views/FossilFormView';
import TimescaleView from './views/TimescaleView';
import TechnicalSheetsView from './views/TechnicalSheetsView';
import GridView from './views/GridView';
import { geologicalEras, allSubPeriods } from './geology';
import { v4 as uuidv4 } from 'uuid';

const APP_VERSION = "v2.2.0";

export default function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'home' | 'period' | 'form' | 'timescale' | 'sheets' | 'grid' | 'settings'>('welcome');
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [periodViewMode, setPeriodViewMode] = useState<'scroll' | 'grid'>('scroll');
  const [fossils, setFossils] = useState<Fossil[]>([]);
  const [editingFossil, setEditingFossil] = useState<Fossil | null>(null);
  const [bannerError, setBannerError] = useState(false);
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  // Theme & sound state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = (localStorage.getItem('app_theme') as 'light' | 'dark') || 'dark';
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (saved === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
        document.body.classList.add('light');
        document.body.classList.remove('dark');
      } else {
        root.classList.add('dark');
        root.classList.remove('light');
        document.body.classList.add('dark');
        document.body.classList.remove('light');
      }
    }
    return saved;
  });
  const [muted, setMutedState] = useState<boolean>(isMuted());

  // App download loading & status
  const [isDownloadingApp, setIsDownloadingApp] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const handleToggleTheme = (nextTheme?: 'light' | 'dark') => {
    const targetTheme = nextTheme || (theme === 'light' ? 'dark' : 'light');
    setTheme(targetTheme);
    localStorage.setItem('app_theme', targetTheme);
    const root = document.documentElement;
    if (targetTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
  };

  // Apply theme to document body
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // States for startup synchronization and local directory sync
  const [lastFossil, setLastFossil] = useState<Fossil | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [dirSyncStatus, setDirSyncStatus] = useState<string | null>(null);
  const [dirPermissionGranted, setDirPermissionGranted] = useState(true);

  useEffect(() => {
    getFossils().then(async (data) => {
      setFossils(data);
      
      // Load last active fossil
      const { getLastActiveFossilId, getAutoOpenSetting, getDirectoryHandle } = await import('./store');
      const lastId = await getLastActiveFossilId();
      const autoOpenSetting = await getAutoOpenSetting();
      setAutoOpen(autoOpenSetting);

      if (lastId) {
        const found = data.find(f => f.id === lastId);
        if (found) {
          setLastFossil(found);
          // If autoOpen is set to true, navigate straight to it
          if (autoOpenSetting) {
            setEditingFossil(found);
            setSelectedPeriod(found.period as Period);
            setCurrentView('form');
          }
        }
      }

      // Check for saved local directory handle
      const savedHandle = await getDirectoryHandle();
      if (savedHandle) {
        setDirHandle(savedHandle);
        try {
          const queryResult = await savedHandle.queryPermission({ mode: 'readwrite' });
          setDirPermissionGranted(queryResult === 'granted');
        } catch (e) {
          console.error("Error querying directory permission", e);
        }
      }
    });

    getHomeImage().then(img => {
      if (img) setBannerImage(img);
    });

    // Hidden trigger to compile and download standalone HTML without public buttons
    const params = new URLSearchParams(window.location.search);
    if (params.get('compile-app') === 'true' || params.get('download-standalone') === 'true') {
      Promise.all([getFossils(), getHomeImage()]).then(async ([fossilsData, homeImg]) => {
        try {
          const { exportData } = await import('./store');
          const dataStr = await exportData();
          
          const response = await fetch('/api/download-app', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              data: dataStr,
              banner: homeImg || '/banner.png'
            })
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'Mon_Exposition_Fossiles.html';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Clean up the URL so refreshes don't re-trigger download
          const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        } catch (err: any) {
          console.error(err);
          alert("Erreur lors de la compilation de l'application autonome : " + (err.message || err));
        }
      });
    }
  }, []);

  const handleSelectDirectory = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert("La synchronisation de dossier local direct n'est pas supportée par ce navigateur (ex: Safari iOS). Cependant, toutes vos modifications restent bien enregistrées en continu dans la mémoire sécurisée IndexedDB de votre téléphone !");
        return;
      }
      const handle = await (window as any).showDirectoryPicker();
      const { saveDirectoryHandle } = await import('./store');
      await saveDirectoryHandle(handle);
      setDirHandle(handle);
      setDirPermissionGranted(true);
      setDirSyncStatus("✅ Dossier local synchronisé ! Les fichiers seront mis à jour automatiquement à chaque modification.");
      setTimeout(() => setDirSyncStatus(null), 5000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        alert("Erreur lors de l'accès au dossier.");
      }
    }
  };

  const handleRequestDirPermission = async () => {
    if (!dirHandle) return;
    try {
      const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        setDirPermissionGranted(true);
        const { syncToLocalDirectory } = await import('./store');
        const success = await syncToLocalDirectory();
        if (success) {
          setDirSyncStatus("✅ Connexion restaurée et fichiers synchronisés !");
        } else {
          setDirSyncStatus("⚠️ Dossier connecté mais échec de la synchronisation.");
        }
        setTimeout(() => setDirSyncStatus(null), 5000);
      } else {
        setDirPermissionGranted(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnectDirectory = async () => {
    const { clearDirectoryHandle } = await import('./store');
    await clearDirectoryHandle();
    setDirHandle(null);
    setDirPermissionGranted(true);
    setDirSyncStatus("Dossier de sauvegarde dissocié.");
    setTimeout(() => setDirSyncStatus(null), 3000);
  };

  const handleToggleAutoOpen = async (checked: boolean) => {
    const { saveAutoOpenSetting } = await import('./store');
    await saveAutoOpenSetting(checked);
    setAutoOpen(checked);
  };

  const handleBannerUpload = async (base64: string) => {
    try {
      await saveHomeImage(base64);
      setBannerImage(base64);
      setBannerError(false);
    } catch (e) {
      console.error(e);
    }
  };

  const navigate = (view: typeof currentView, period?: Period) => {
    playDinoSound();
    setCurrentView(view);
    if (period) setSelectedPeriod(period);
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'collection_fossiles.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'export.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importData(text);
      
      const data = await getFossils();
      setFossils(data);
      const img = await getHomeImage();
      if (img) setBannerImage(img);
      
      alert("Données importées avec succès !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'importation. Fichier invalide ?");
    }
    
    // Reset file input
    e.target.value = '';
  };

  const handleDownloadStandaloneApp = async () => {
    setIsDownloadingApp(true);
    setDownloadSuccessMessage(null);
    try {
      const { exportData } = await import('./store');
      const dataStr = await exportData();
      const homeImg = await getHomeImage();

      let htmlContent: string | null = null;

      // 1. In static environment (e.g. GitHub Pages), fetch the current bundle directly via GET
      const candidates = [
        './Mon_Exposition_Fossiles.html',
        './index.html',
        window.location.pathname.endsWith('.html') ? window.location.pathname : `${window.location.pathname.replace(/\/$/, '')}/index.html`,
        window.location.href
      ];

      for (const candidate of candidates) {
        try {
          const res = await fetch(candidate, { method: 'GET', cache: 'no-cache' });
          if (res.ok) {
            const text = await res.text();
            if (text.includes('<html') && text.length > 50000) {
              htmlContent = text;
              break;
            }
          }
        } catch (_) {
          // ignore and try next
        }
      }

      // 2. If not found or in development mode, try the backend API endpoint
      if (!htmlContent) {
        try {
          const response = await fetch('/api/download-app', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              data: dataStr,
              banner: homeImg || '/banner.png'
            })
          });

          if (response.ok) {
            htmlContent = await response.text();
          }
        } catch (_) {
          // Ignore backend failure if static fetch worked
        }
      }

      if (!htmlContent) {
        throw new Error("Impossible de récupérer le fichier autonome. Veuillez vérifier votre connexion.");
      }

      // Inject the current data and banner
      if (htmlContent.includes('window.__INITIAL_DATA__ = null;')) {
        htmlContent = htmlContent.replace('window.__INITIAL_DATA__ = null;', `window.__INITIAL_DATA__ = ${dataStr};`);
      } else if (htmlContent.includes('window.__INITIAL_DATA__=')) {
        htmlContent = htmlContent.replace(/window\.__INITIAL_DATA__\s*=\s*[^;]+;/, `window.__INITIAL_DATA__ = ${dataStr};`);
      } else {
        htmlContent = htmlContent.replace('<head>', `<head><script>window.__INITIAL_DATA__ = ${dataStr};</script>`);
      }

      if (homeImg) {
        if (htmlContent.includes('window.__INITIAL_BANNER__ = null;')) {
          htmlContent = htmlContent.replace('window.__INITIAL_BANNER__ = null;', `window.__INITIAL_BANNER__ = ${JSON.stringify(homeImg)};`);
        } else if (htmlContent.includes('window.__INITIAL_BANNER__=')) {
          htmlContent = htmlContent.replace(/window\.__INITIAL_BANNER__\s*=\s*[^;]+;/, `window.__INITIAL_BANNER__ = ${JSON.stringify(homeImg)};`);
        } else {
          htmlContent = htmlContent.replace('<head>', `<head><script>window.__INITIAL_BANNER__ = ${JSON.stringify(homeImg)};</script>`);
        }
      }

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Mon_Exposition_Fossiles.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccessMessage("Application autonome téléchargée ! Vous pouvez maintenant ouvrir ce fichier sur n'importe quel ordinateur, tablette ou smartphone sans aucune connexion Internet.");
      setTimeout(() => setDownloadSuccessMessage(null), 9000);
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors du téléchargement de l'application autonome : " + (err.message || err));
    } finally {
      setIsDownloadingApp(false);
    }
  };

  const isLight = theme === 'light';

  const renderWelcome = () => (
    <div className={`flex flex-col items-center justify-center min-h-screen p-6 text-center animate-fade-in transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0] text-black' : 'bg-[#060B1A] bg-texture text-white'}`}>
      <div className={`border-2 rounded-3xl p-8 md:p-16 backdrop-blur-md shadow-2xl flex flex-col items-center relative overflow-hidden max-w-4xl w-full ${isLight ? 'bg-white border-slate-200 shadow-slate-300/40 text-black' : 'bg-[#101A36]/80 border-[#D4AF37]/40 shadow-[#D4AF37]/10 text-white'}`}>
        <div className="absolute inset-0 bg-transparent opacity-10" style={{ backgroundImage: isLight ? 'radial-gradient(#000 1px, transparent 1px)' : 'radial-gradient(#D4AF37 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <h1 className={`text-4xl md:text-6xl font-serif tracking-widest mb-6 uppercase animate-float relative z-10 drop-shadow-md font-bold ${isLight ? 'text-black' : 'text-white'}`}>
          Ma Collection
          <br /><span className={`font-bold text-4xl md:text-7xl italic mt-4 block drop-shadow-xl ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>de Fossiles</span>
        </h1>
        
        {/* Quick Access to Last Saved Fossil right on Welcome Screen */}
        {lastFossil && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`mb-10 relative z-10 p-4 border rounded-2xl max-w-sm w-full text-left shadow-lg ${isLight ? 'bg-slate-50 border-slate-300 text-black' : 'border-[#D4AF37]/35 bg-[#060B1A]/80 text-white'}`}
          >
            <div className={`text-xs font-serif uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-black' : 'bg-[#D4AF37] animate-pulse'}`}></span>
              Dernier fossile enregistré
            </div>
            <div className="flex gap-3 items-center">
              {lastFossil.carouselImage || lastFossil.mainImage ? (
                <img src={lastFossil.carouselImage || lastFossil.mainImage} alt="" className={`w-12 h-12 object-cover rounded-lg border shrink-0 ${isLight ? 'border-slate-300' : 'border-[#D4AF37]/20'}`} />
              ) : (
                <div className={`w-12 h-12 flex items-center justify-center rounded-lg border shrink-0 font-serif italic text-[10px] ${isLight ? 'bg-slate-200 border-slate-300 text-slate-600' : 'bg-[#101A36] border-[#D4AF37]/20 text-slate-400'}`}>Image</div>
              )}
              <div className="overflow-hidden flex-1">
                <h4 className={`text-sm font-serif font-bold truncate ${isLight ? 'text-black' : 'text-white'}`}>{lastFossil.title || 'Sans titre'}</h4>
                <p className={`text-xs truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{lastFossil.period} {lastFossil.fossilDating ? `• ${lastFossil.fossilDating}` : ''}</p>
              </div>
              <button 
                onClick={() => {
                  setEditingFossil(lastFossil);
                  setSelectedPeriod(lastFossil.period as Period);
                  navigate('form');
                }}
                className={`px-3 py-1.5 hover:scale-105 active:scale-95 font-bold font-serif text-[11px] rounded-lg transition-all cursor-pointer uppercase shrink-0 ${isLight ? 'bg-black text-white hover:bg-slate-800' : 'bg-[#D4AF37] hover:bg-[#FFD700] text-[#060B1A]'}`}
              >
                Voir la fiche
              </button>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col items-center gap-2 relative z-10">
          <motion.button
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
            onClick={() => navigate('home')}
            className={`flex flex-col items-center justify-center p-3 hover:scale-110 active:scale-95 transition-all focus:outline-none cursor-pointer filter ${isLight ? 'text-black hover:text-slate-700 drop-shadow-[0_0_12px_rgba(0,0,0,0.15)]' : 'text-[#D4AF37] hover:text-[#FFD700] drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]'}`}
            title="Entrer dans la galerie"
          >
            <AmmoniteIcon size={80} />
          </motion.button>
          <span className={`font-serif italic text-sm tracking-wider uppercase mt-2 font-bold ${isLight ? 'text-black' : 'text-slate-300'}`}>Cliquez pour Entrer</span>
        </div>
      </div>
    </div>
  );

  const renderHome = () => {
    return (
      <div className={`flex flex-col min-h-screen bg-texture font-sans transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0] text-black' : 'bg-[#060B1A] text-white'}`}>
        
        {/* Top bar with theme toggle and settings buttons */}
        <div className="w-full max-w-4xl mx-auto px-4 pt-4 md:px-8 flex justify-end items-center gap-3">
          <button
            onClick={() => handleToggleTheme()}
            className={`p-2.5 rounded-xl border transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center shadow-md ${isLight ? 'bg-white border-slate-200 text-black hover:bg-slate-100 hover:border-black' : 'bg-[#101A36]/60 border-[#D4AF37]/25 text-slate-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/60'}`}
            title={theme === 'light' ? "Passer en mode sombre" : "Passer en mode clair"}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button 
            onClick={() => navigate('settings')} 
            className={`p-2.5 rounded-xl border transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center shadow-md ${isLight ? 'bg-white border-slate-200 text-black hover:bg-slate-100 hover:border-black' : 'bg-[#101A36]/60 border-[#D4AF37]/25 text-slate-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/60'}`}
            title="Paramètres"
          >
            <Settings size={18} />
          </button>
        </div>

        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col gap-8 pt-2">
          
          {/* Decorative dynamic spinning Ammonite on Home dashboard above periods */}
          <div className="flex flex-col items-center justify-center text-center py-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
              className={`mb-3 filter ${isLight ? 'text-black drop-shadow-[0_0_8px_rgba(0,0,0,0.15)]' : 'text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]'}`}
            >
              <AmmoniteIcon size={72} />
            </motion.div>
            <h1 className={`text-3xl md:text-5xl font-serif font-bold tracking-widest uppercase mb-1 drop-shadow-md ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
              Ma Collection
            </h1>
            <p className={`font-serif italic text-lg tracking-wider ${isLight ? 'text-slate-700 font-bold' : 'text-white/80'}`}>
              de Fossiles
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 md:gap-6 mt-2">
            <button onClick={() => navigate('period', 'Precambrien')} className={`flex flex-col items-center justify-center p-4 md:p-8 rounded-2xl shadow-lg hover:-translate-y-1 transition-all duration-300 group animate-fade-in delay-100 ${isLight ? 'bg-white text-black border-2 border-slate-200 hover:bg-slate-50 hover:border-black' : 'bg-[#101A36]/80 text-white border-2 border-[#D4AF37]/20 hover:bg-[#18264F]/90 hover:border-[#D4AF37]/60'}`}>
              <Dna className={`w-10 h-10 md:w-12 md:h-12 mb-2 group-hover:scale-125 duration-500 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`} opacity={0.9} />
              <span className={`font-serif text-sm sm:text-xl font-bold tracking-widest uppercase text-center ${isLight ? 'text-black group-hover:text-slate-700' : 'text-white group-hover:text-[#D4AF37]'}`}>Précambrien</span>
            </button>
            
            <button onClick={() => navigate('period', 'Paléozoïque')} className={`flex flex-col items-center justify-center p-4 md:p-8 rounded-2xl shadow-lg hover:-translate-y-1 transition-all duration-300 group animate-fade-in delay-100 ${isLight ? 'bg-white text-black border-2 border-slate-200 hover:bg-slate-50 hover:border-black' : 'bg-[#101A36]/80 text-white border-2 border-[#D4AF37]/20 hover:bg-[#18264F]/90 hover:border-[#D4AF37]/60'}`}>
              <TrilobiteIcon className={`w-10 h-10 md:w-12 md:h-12 mb-2 group-hover:scale-125 duration-500 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`} />
              <span className={`font-serif text-sm sm:text-xl font-bold tracking-widest uppercase text-center ${isLight ? 'text-black group-hover:text-slate-700' : 'text-white group-hover:text-[#D4AF37]'}`}>Paléozoïque</span>
            </button>

            <button onClick={() => navigate('period', 'Mésozoïque')} className={`flex flex-col items-center justify-center p-4 md:p-8 rounded-2xl shadow-lg hover:-translate-y-1 transition-all duration-300 group animate-fade-in delay-200 ${isLight ? 'bg-white text-black border-2 border-slate-200 hover:bg-slate-50 hover:border-black' : 'bg-[#101A36]/80 text-white border-2 border-[#D4AF37]/20 hover:bg-[#18264F]/90 hover:border-[#D4AF37]/60'}`}>
              <Shell className={`w-10 h-10 md:w-12 md:h-12 mb-2 group-hover:scale-125 duration-500 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`} opacity={0.9} />
              <span className={`font-serif text-sm sm:text-xl font-bold tracking-widest uppercase text-center ${isLight ? 'text-black group-hover:text-slate-700' : 'text-white group-hover:text-[#D4AF37]'}`}>Mésozoïque</span>
            </button>

            <button onClick={() => navigate('period', 'Cénozoïque')} className={`flex flex-col items-center justify-center p-4 md:p-8 rounded-2xl shadow-lg hover:-translate-y-1 transition-all duration-300 group animate-fade-in delay-200 ${isLight ? 'bg-white text-black border-2 border-slate-200 hover:bg-slate-50 hover:border-black' : 'bg-[#101A36]/80 text-white border-2 border-[#D4AF37]/20 hover:bg-[#18264F]/90 hover:border-[#D4AF37]/60'}`}>
              <MammothIcon className={`w-10 h-10 md:w-12 md:h-12 mb-2 group-hover:scale-125 duration-500 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`} />
              <span className={`font-serif text-sm sm:text-xl font-bold tracking-widest uppercase text-center ${isLight ? 'text-black group-hover:text-slate-700' : 'text-white group-hover:text-[#D4AF37]'}`}>Cénozoïque</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <button onClick={() => navigate('grid')} className={`py-4 font-bold font-serif uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl shadow-lg text-center text-xs sm:text-sm ${isLight ? 'bg-black text-white hover:bg-slate-800' : 'bg-[#D4AF37] text-[#060B1A] hover:bg-[#FFD700]'}`}>
              Galerie Complète
            </button>

            <button onClick={() => navigate('timescale')} className={`py-4 border-2 font-serif uppercase tracking-widest font-bold rounded-xl text-center text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] transition-all ${isLight ? 'bg-white border-slate-300 text-black hover:bg-slate-50 hover:border-black' : 'bg-transparent border-[#D4AF37]/30 text-white hover:bg-[#101A36] hover:border-[#D4AF37]/70'}`}>
              Échelle des Temps Géologiques
            </button>
            
            <button onClick={() => navigate('sheets')} className={`py-4 border-2 font-serif uppercase tracking-widest font-bold rounded-xl text-center text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] transition-all ${isLight ? 'bg-white border-slate-300 text-black hover:bg-slate-50 hover:border-black' : 'bg-transparent border-[#D4AF37]/30 text-white hover:bg-[#101A36] hover:border-[#D4AF37]/70'}`}>
              Fiches Techniques
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className={`flex flex-col min-h-screen font-sans bg-texture transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0] text-black' : 'bg-[#060B1A] text-white'}`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0]/95 border-slate-200 text-black' : 'bg-[#060B1A]/95 border-[#D4AF37]/20 text-white'}`}>
          <button onClick={() => navigate('home')} className={`p-2 hover:scale-110 active:scale-95 transition-all ${isLight ? 'text-black hover:text-slate-700' : 'text-slate-300 hover:text-[#D4AF37]'}`}>
            <ChevronLeft size={28} />
          </button>
          <h2 className={`text-xl md:text-3xl font-bold font-serif tracking-widest uppercase flex-1 text-center drop-shadow-sm flex items-center justify-center gap-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
            <Settings size={22} className={`${isLight ? 'text-black' : 'text-[#D4AF37]'}`} />
            Paramètres
          </h2>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-8 flex flex-col gap-6 relative z-10 pb-20">

          {/* Section: Audio */}
          <div className={`border rounded-3xl p-6 shadow-md transition-all ${isLight ? 'bg-white border-slate-200 text-black' : 'border-[#D4AF37]/25 bg-[#101A36]/60 text-white'}`}>
            <h3 className={`text-lg font-serif font-bold uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2 ${isLight ? 'text-black border-slate-200' : 'text-[#D4AF37] border-[#D4AF37]/20'}`}>
              🔊 Effets Sonores
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-bold text-sm ${isLight ? 'text-black' : 'text-white'}`}>Couper le son</p>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Activez ou désactivez les effets sonores lors de la navigation.</p>
              </div>
              <button
                onClick={() => {
                  const newMuted = !muted;
                  setMutedState(newMuted);
                  setMuted(newMuted);
                  if (!newMuted) {
                    setTimeout(() => playDinoSound(), 50);
                  }
                }}
                className={`p-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${muted ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'}`}
                title={muted ? "Activer le son" : "Couper le son"}
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                <span className="ml-2 text-xs font-serif uppercase font-bold tracking-wider">{muted ? "Sourdine" : "Actif"}</span>
              </button>
            </div>
          </div>

          {/* Section: Sauvegarde locale & Synchro */}
          <div className={`border rounded-3xl p-6 shadow-md transition-all ${isLight ? 'bg-white border-slate-200 text-black' : 'border-[#D4AF37]/25 bg-[#101A36]/60 text-white'}`}>
            <div className={`flex items-center justify-between border-b pb-2 mb-4 border-dashed ${isLight ? 'border-slate-200' : 'border-[#D4AF37]/20'}`}>
              <h3 className={`text-lg font-serif font-bold uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dirHandle ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${dirHandle ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                Sauvegarde Automatique
              </h3>
              {dirHandle && (
                <button 
                  onClick={handleDisconnectDirectory} 
                  className="text-xs text-red-500 hover:text-red-600 hover:underline cursor-pointer font-sans font-bold"
                >
                  Dissocier le dossier
                </button>
              )}
            </div>
            
            <p className={`text-sm leading-relaxed mb-4 font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Associez un dossier de la mémoire de votre téléphone ou ordinateur pour y sauvegarder automatiquement une copie complète <code className={`font-mono text-xs ${isLight ? 'bg-slate-100 px-1 py-0.5 rounded text-black font-bold' : 'text-[#D4AF37]'}`}>fossiles_sauvegarde_auto.json</code> ainsi qu'un fichier indexé <code className={`font-mono text-xs ${isLight ? 'bg-slate-100 px-1 py-0.5 rounded text-black font-bold' : 'text-[#D4AF37]'}`}>exposition_index_lisible.txt</code> à chaque modification.
            </p>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {!dirHandle ? (
                  <button
                    onClick={handleSelectDirectory}
                    className={`px-4 py-2.5 border font-serif uppercase tracking-widest text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm ${isLight ? 'bg-black hover:bg-slate-800 text-white border-black' : 'bg-[#D4AF37]/25 border-[#D4AF37]/40 hover:bg-[#D4AF37]/35 text-white'}`}
                  >
                    📁 Associer un dossier local
                  </button>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      📁 Dossier actif : <span className={`font-mono px-2 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-300 text-black' : 'bg-[#060B1A] border-[#D4AF37]/15 text-white'}`}>{dirHandle.name}</span>
                    </span>
                    {!dirPermissionGranted && (
                      <button
                        onClick={handleRequestDirPermission}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-700 dark:text-amber-300 text-[11px] rounded-lg transition-all cursor-pointer inline-block self-start mt-1 font-bold"
                      >
                        🔐 Autoriser l'écriture
                      </button>
                    )}
                  </div>
                )}
                
                <div className="flex items-center">
                  <label className={`flex items-center gap-2 cursor-pointer text-xs p-2.5 rounded-xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-black font-semibold' : 'bg-[#060B1A]/40 border-white/5 hover:border-white/15'}`}>
                    <input 
                      type="checkbox" 
                      checked={autoOpen} 
                      onChange={e => handleToggleAutoOpen(e.target.checked)} 
                      className="accent-black w-4 h-4 rounded cursor-pointer" 
                    />
                    <span>Ouvrir le dernier fossile au démarrage</span>
                  </label>
                </div>
              </div>

              {dirSyncStatus && (
                <span className="text-xs text-emerald-600 italic font-semibold mt-1 block">
                  {dirSyncStatus}
                </span>
              )}
            </div>
          </div>

          {/* Section: Application Autonome Hors-Ligne (.html) */}
          <div className={`border rounded-3xl p-6 shadow-md transition-all ${isLight ? 'bg-white border-slate-200 text-black' : 'border-[#D4AF37]/25 bg-[#101A36]/60 text-white'}`}>
            <div className={`flex items-center justify-between border-b pb-2 mb-4 border-dashed ${isLight ? 'border-slate-200' : 'border-[#D4AF37]/20'}`}>
              <h3 className={`text-lg font-serif font-bold uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                <Globe size={18} />
                Application Autonome Hors-Ligne
              </h3>
              <span className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full border font-bold ${isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'}`}>
                100% Hors-Ligne
              </span>
            </div>

            <div className={`text-sm leading-relaxed mb-4 space-y-2.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              <p>
                Téléchargez l'application complète compilée en <strong>un seul et unique fichier HTML</strong> (<code className={`font-mono text-xs ${isLight ? 'bg-slate-100 px-1 py-0.5 rounded text-black font-bold' : 'text-[#D4AF37]'}`}>Mon_Exposition_Fossiles.html</code>).
              </p>
              
              <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#060B1A]/60 border-[#D4AF37]/15 text-slate-300'}`}>
                <div className={`font-serif uppercase tracking-wider font-bold text-[11px] mb-1 flex items-center gap-1.5 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                  💡 Pourquoi utiliser cette version autonome ?
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><strong>Zéro connexion requise</strong> : fonctionne partout (au musée, en voyage, sur le terrain, sans réseau 4G/5G ni Wi-Fi).</li>
                  <li><strong>Autonomie totale</strong> : tout est embarqué dans le fichier unique (toutes vos fiches de fossiles, vos photographies, l'échelle des temps géologiques et les fiches techniques).</li>
                  <li><strong>Universel & Durable</strong> : il vous suffit de double-cliquer sur le fichier pour l'ouvrir dans Chrome, Safari, Firefox ou Edge sur PC, Mac, tablette ou smartphone.</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDownloadStandaloneApp}
                disabled={isDownloadingApp}
                className={`w-full sm:w-auto self-start px-6 py-3.5 border-2 font-serif uppercase tracking-widest text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-md ${
                  isDownloadingApp ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02] active:scale-[0.98]'
                } ${
                  isLight ? 'bg-black hover:bg-slate-800 text-white border-black' : 'bg-[#D4AF37] hover:bg-[#FFD700] text-[#060B1A] border-[#D4AF37]'
                }`}
              >
                {isDownloadingApp ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Compilation et téléchargement en cours...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Télécharger l'application autonome (.html)
                  </>
                )}
              </button>

              {downloadSuccessMessage && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in font-medium ${isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{downloadSuccessMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Import & Export */}
          <div className={`border rounded-3xl p-6 shadow-md transition-all ${isLight ? 'bg-white border-slate-200 text-black' : 'border-[#D4AF37]/25 bg-[#101A36]/60 text-white'}`}>
            <h3 className={`text-lg font-serif font-bold uppercase tracking-widest mb-4 flex items-center gap-2 border-b pb-2 ${isLight ? 'text-black border-slate-200' : 'text-[#D4AF37] border-[#D4AF37]/20'}`}>
              💾 Importation & Exportation
            </h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>Transférez l'intégralité de votre collection d'un appareil à l'autre à l'aide de fichiers JSON.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={handleExport} 
                className={`py-3 border-2 font-serif uppercase tracking-widest text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${isLight ? 'bg-white hover:bg-slate-50 border-slate-300 text-black hover:border-black' : 'bg-[#101A36]/40 border-[#D4AF37]/20 text-slate-300 hover:text-[#D4AF37] hover:border-[#D4AF37]'}`}
              >
                <Download size={14} /> Exporter la collection (.json)
              </button>
              
              <label className={`py-3 border-2 border-dashed font-serif uppercase tracking-widest text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-black hover:border-black' : 'bg-transparent border-[#D4AF37]/30 text-slate-300 hover:border-[#D4AF37] hover:text-[#D4AF37]'}`}>
                <Upload size={14} /> Importer une collection (.json)
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
            </div>
          </div>

          {/* Section: Goliath Applis Badge & Redirection */}
          <div className={`border-2 rounded-3xl p-6 shadow-xl transition-all relative overflow-hidden ${
            isLight 
              ? 'bg-gradient-to-br from-white via-slate-50 to-blue-50/40 border-blue-200/80 text-black' 
              : 'bg-gradient-to-br from-[#0d1633] via-[#101A36] to-[#0a122a] border-[#D4AF37]/40 text-white ring-1 ring-[#D4AF37]/20'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center sm:text-left space-y-2">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${
                  isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30'
                }`}>
                  Développeur & Créateur
                </span>
                <h3 className={`text-xl sm:text-2xl font-serif font-black tracking-wide uppercase ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Goliath Applis
                </h3>
                <p className={`text-xs sm:text-sm font-sans leading-relaxed max-w-md ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  Créateur de Web Applis sur-mesure. Visitez notre page Facebook officielle pour découvrir d'autres projets ou pour toute question !
                </p>
                <div className="pt-1">
                  <a
                    href="https://www.facebook.com/share/183KUM79rk/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider underline underline-offset-4 transition-colors ${
                      isLight ? 'text-blue-700 hover:text-blue-900' : 'text-[#D4AF37] hover:text-[#FFD700]'
                    }`}
                  >
                    <span>Rejoindre la page Facebook</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {/* Clickable Image Button Badge */}
              <div className="shrink-0 flex flex-col items-center">
                <a
                  href="https://www.facebook.com/share/183KUM79rk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Visitez notre page Goliath Applis sur Facebook"
                  className="group relative block focus:outline-none cursor-pointer"
                >
                  <div className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full p-1.5 transition-all duration-300 group-hover:scale-105 group-active:scale-95 flex items-center justify-center shadow-2xl ${
                    isLight 
                      ? 'bg-white ring-4 ring-blue-500/20 group-hover:ring-blue-600/40 shadow-blue-500/10' 
                      : 'bg-[#060B1A] ring-4 ring-[#D4AF37]/30 group-hover:ring-[#D4AF37]/70 shadow-[#D4AF37]/20'
                  }`}>
                    <img 
                      src={goliathBadgeDataUri} 
                      alt="Goliath Applis - Visitez notre page Facebook" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain rounded-full filter drop-shadow-md group-hover:brightness-105 transition-all duration-300"
                    />
                  </div>
                  <span className={`mt-2 block text-center text-[10px] font-mono font-bold uppercase tracking-wider opacity-80 group-hover:opacity-100 transition-opacity ${
                    isLight ? 'text-blue-800' : 'text-[#D4AF37]'
                  }`}>
                    ↗ Cliquer pour visiter
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Version tag at the bottom */}
          <div className="text-center mt-8 pb-4 flex flex-col items-center gap-1.5 opacity-60">
            <span className={`text-[10px] font-mono tracking-widest uppercase ${isLight ? 'text-slate-600 font-bold' : 'text-slate-400'}`}>
              Ma Collection de Fossiles
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider border shadow-inner ${isLight ? 'bg-slate-200 text-black border-slate-300' : 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30'}`}>
              {APP_VERSION}
            </span>
            <span className={`text-[9px] italic ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Enregistré dans l'IndexedDB locale du terminal</span>
          </div>

        </div>
      </div>
    );
  };

  const renderPeriod = () => {
    const periodFossils = fossils.filter(f => f.period === selectedPeriod);
    
    return (
      <div className={`flex flex-col min-h-screen bg-texture relative overflow-hidden transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0] text-black' : 'bg-[#060B1A] text-white'}`}>
        <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-md transition-colors ${isLight ? 'bg-[#F7F5F0]/95 border-slate-200 text-black' : 'bg-[#060B1A]/95 border-[#D4AF37]/20 text-white'}`}>
          <button onClick={() => navigate('home')} className={`p-2 hover:scale-110 active:scale-95 transition-all ${isLight ? 'text-black hover:text-slate-700' : 'text-slate-300 hover:text-[#D4AF37]'}`}><ChevronLeft size={28} /></button>
          <h2 className={`text-2xl sm:text-4xl font-serif font-bold tracking-widest uppercase drop-shadow-sm ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>{selectedPeriod}</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPeriodViewMode('scroll')}
              className={`p-2 transition-colors ${periodViewMode === 'scroll' ? (isLight ? 'text-black font-bold' : 'text-[#D4AF37]') : (isLight ? 'text-slate-400 hover:text-black' : 'text-slate-400 hover:text-white')}`}
            >
              <GalleryHorizontal size={24} />
            </button>
            <button 
              onClick={() => setPeriodViewMode('grid')}
              className={`p-2 transition-colors ${periodViewMode === 'grid' ? (isLight ? 'text-black font-bold' : 'text-[#D4AF37]') : (isLight ? 'text-slate-400 hover:text-black' : 'text-slate-400 hover:text-white')}`}
            >
              <LayoutGrid size={24} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-4 md:p-8 flex flex-col items-center relative z-0">
          {periodViewMode === 'scroll' ? (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-8 pb-8 flex-1 items-center w-full max-w-6xl px-4 scrollbar-hide">
              {periodFossils.map((fossil, index) => (
                <div key={fossil.id} className={`snap-center shrink-0 w-[75vw] sm:w-72 h-[26rem] sm:h-[30rem] border-2 rounded-2xl overflow-hidden shadow-2xl relative cursor-pointer group hover:-translate-y-1 transition-all duration-300 animate-fade-in flex flex-col ${
                  isLight ? 'bg-white border-slate-200 hover:border-black' : 'bg-[#101A36]/60 border-[#D4AF37]/30 hover:border-[#D4AF37]'
                } ${index % 3 === 0 ? 'delay-0' : index % 3 === 1 ? 'delay-100' : 'delay-200'}`} onClick={() => {
                  setEditingFossil(fossil);
                  navigate('form');
                }}>
                  <div className={`flex-1 w-full relative flex items-center justify-center p-4 overflow-hidden ${isLight ? 'bg-slate-50' : 'bg-[#060B1A]/80'}`}>
                    {fossil.carouselImage || fossil.mainImage ? (
                      <img 
                        src={fossil.carouselImage || fossil.mainImage} 
                        alt={fossil.title || 'Fossile'} 
                        className="max-w-full max-h-full object-contain filter drop-shadow-md brightness-95 group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center font-serif italic text-sm ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>Pas d'image</div>
                    )}
                  </div>
                  <div className={`p-4 text-center border-t shrink-0 ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36] border-[#D4AF37]/20 text-white'}`}>
                    <h3 className={`text-lg sm:text-xl font-serif font-bold tracking-wide truncate transition-colors ${isLight ? 'text-black group-hover:text-slate-700' : 'text-white group-hover:text-[#D4AF37]'}`}>{fossil.title || 'Sans titre'}</h3>
                  </div>
                </div>
              ))}
              
              <div className={`snap-center shrink-0 w-[75vw] sm:w-72 h-[26rem] sm:h-[30rem] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1 group animate-fade-in delay-300 ${
                isLight ? 'bg-white/60 border-slate-300 hover:border-black hover:bg-white' : 'bg-[#101A36]/40 border-[#D4AF37]/20 hover:border-[#D4AF37]/60 hover:bg-[#101A36]/80'
              }`} onClick={() => {
                setEditingFossil(null);
                navigate('form');
              }}>
                <div className={`p-4 mb-4 transform group-hover:scale-110 transition-transform ${isLight ? 'text-black' : 'text-[#D4AF37] filter drop-shadow-[0_0_4px_rgba(212,175,55,0.2)]'}`}>
                  <Plus size={48} strokeWidth={1} />
                </div>
                <span className={`text-xl font-serif italic transition-colors text-center px-4 font-bold ${isLight ? 'text-slate-700 group-hover:text-black' : 'text-slate-300 group-hover:text-white'}`}>Ajouter un fossile</span>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 overflow-y-auto pb-16">
              {periodFossils.map((fossil, index) => (
                <div key={fossil.id} className={`border-2 rounded-2xl overflow-hidden shadow-lg relative cursor-pointer group flex flex-col h-64 md:h-72 hover:-translate-y-1 transition-all duration-300 ${
                  isLight ? 'bg-white border-slate-200 hover:border-black' : 'bg-transparent border-[#D4AF37]/20 hover:border-[#D4AF37]/60'
                } ${index % 4 === 0 ? 'delay-0' : index % 4 === 1 ? 'delay-100' : index % 4 === 2 ? 'delay-200' : 'delay-300'}`} onClick={() => {
                  setEditingFossil(fossil);
                  navigate('form');
                }}>
                  <div className={`flex-1 w-full overflow-hidden relative flex items-center justify-center p-3 ${isLight ? 'bg-slate-50' : 'bg-[#060B1A]/80'}`}>
                    {fossil.carouselImage || fossil.mainImage ? (
                      <img 
                        src={fossil.carouselImage || fossil.mainImage} 
                        alt={fossil.title || 'Fossile'} 
                        className="max-w-full max-h-full object-contain filter drop-shadow-md brightness-95 group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center font-serif italic text-sm ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>Pas d'image</div>
                    )}
                  </div>
                  <div className={`p-3 md:p-4 border-t z-10 w-full overflow-hidden shrink-0 ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36] border-[#D4AF37]/10 text-white'}`}>
                    <h3 className={`text-sm md:text-base font-serif font-bold truncate transition-colors ${isLight ? 'text-black group-hover:text-slate-700' : 'text-white group-hover:text-[#D4AF37]'}`}>{fossil.title || 'Sans titre'}</h3>
                  </div>
                </div>
              ))}
              
              <div className={`border-2 border-dashed rounded-2xl flex flex-col h-64 md:h-72 items-center justify-center cursor-pointer transition-all hover:-translate-y-1 group ${
                isLight ? 'bg-white/60 border-slate-300 hover:border-black hover:bg-white' : 'bg-[#101A36]/40 border-[#D4AF37]/20 hover:border-[#D4AF37]/60 hover:bg-[#101A36]/80'
              }`} onClick={() => {
                setEditingFossil(null);
                navigate('form');
              }}>
                <div className={`p-4 mb-2 transform group-hover:scale-110 transition-transform ${isLight ? 'text-black' : 'text-[#D4AF37] filter drop-shadow-[0_0_4px_rgba(212,175,55,0.2)]'}`}>
                  <Plus size={32} strokeWidth={1} />
                </div>
                <span className={`text-sm md:text-base font-serif italic transition-colors text-center px-4 font-bold ${isLight ? 'text-slate-700 group-hover:text-black' : 'text-slate-300 group-hover:text-white'}`}>Ajouter un fossile</span>
              </div>
            </div>
          )}
          
          <div className="w-full max-w-6xl mx-auto flex justify-center mt-12 mb-8">
            <button onClick={() => navigate('home')} className={`flex items-center gap-2 px-8 py-3 border-2 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest font-serif text-sm font-bold rounded-xl ${
              isLight ? 'bg-white border-slate-300 text-black hover:bg-slate-100 hover:border-black' : 'border-[#D4AF37]/35 text-white hover:bg-[#101A36] hover:border-[#D4AF37]'
            }`}>
              <ChevronLeft size={16} /> Retour
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {currentView === 'welcome' && <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderWelcome()}</motion.div>}
        {currentView === 'home' && <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderHome()}</motion.div>}
        {currentView === 'period' && <motion.div key="period" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>{renderPeriod()}</motion.div>}
        
        {currentView === 'form' && (
        <motion.div key="form" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <FossilFormView 
            onBack={() => navigate('period')} 
            onHome={() => navigate('home')}
            isLight={isLight}
            onSave={async (f) => {
              const newFossils = editingFossil ? fossils.map(x => x.id === f.id ? f : x) : [...fossils, f];
              setFossils(newFossils);
              await saveFossils(newFossils);
              navigate('period');
            }}
            onDelete={async (fossilId) => {
              const newFossils = fossils.filter(x => x.id !== fossilId);
              setFossils(newFossils);
              await saveFossils(newFossils);
              
              const { getSheets, saveSheets } = await import('./store');
              const sheets = await getSheets();
              const newSheets = sheets.filter(s => s.id !== fossilId);
              await saveSheets(newSheets);
              
              navigate('period');
            }}
            period={selectedPeriod!}
            existingFossil={editingFossil}
          />
        </motion.div>
      )}

      {currentView === 'timescale' && (
        <motion.div key="timescale" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <TimescaleView 
            fossils={fossils} 
            isLight={isLight}
            onBack={() => navigate('home')} 
            onNavigateToPeriod={(period) => navigate('period', period)} 
            onEditFossil={(fossil) => {
              setEditingFossil(fossil);
              setSelectedPeriod(fossil.period as Period);
              setCurrentView('form');
            }}
          />
        </motion.div>
      )}
      {currentView === 'grid' && (
        <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <GridView 
            fossils={fossils} 
            isLight={isLight}
            onBack={() => navigate('home')} 
            onFossilClick={(fossil) => {
              setEditingFossil(fossil);
              navigate('form', fossil.period as Period);
            }} 
          />
        </motion.div>
      )}
      {currentView === 'sheets' && <motion.div key="sheets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><TechnicalSheetsView isLight={isLight} onBack={() => navigate('home')} /></motion.div>}
      {currentView === 'settings' && <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderSettings()}</motion.div>}
      
    </AnimatePresence>
    </>
  );
}
