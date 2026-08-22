import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fossil, Period, TechnicalSheet } from './types';
import { getFossils, saveFossils, exportData, importData, getHomeImage, saveHomeImage } from './store';
import { playDinoSound, isMuted, setMuted } from './utils/audio';
import { Shell, Dna, ChevronLeft, ChevronRight, Plus, Download, Upload, LayoutGrid, GalleryHorizontal, Settings, Volume2, VolumeX, Moon, Sun } from 'lucide-react';
import { TrilobiteIcon, MammothIcon, AmmoniteIcon } from './components/Icons';
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
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'dark';
  });
  const [muted, setMutedState] = useState<boolean>(isMuted());

  // Apply theme to document body
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
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

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#060B1A] bg-texture p-6 text-center animate-fade-in">
      <div className="border-2 border-[#D4AF37]/40 rounded-3xl p-8 md:p-16 bg-[#101A36]/80 backdrop-blur-md shadow-2xl shadow-[#D4AF37]/10 flex flex-col items-center relative overflow-hidden max-w-4xl w-full">
        <div className="absolute inset-0 bg-transparent opacity-10" style={{ backgroundImage: 'radial-gradient(#D4AF37 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <h1 className="text-4xl md:text-6xl font-serif text-white tracking-widest mb-6 uppercase animate-float relative z-10 drop-shadow-md">
          Ma Collection
          <br /><span className="text-[#D4AF37] font-bold text-4xl md:text-7xl italic mt-4 block drop-shadow-xl">de Fossiles</span>
        </h1>
        
        {/* Quick Access to Last Saved Fossil right on Welcome Screen */}
        {lastFossil && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10 relative z-10 p-4 border border-[#D4AF37]/35 bg-[#060B1A]/80 rounded-2xl max-w-sm w-full text-left shadow-lg"
          >
            <div className="text-xs font-serif text-[#D4AF37] uppercase tracking-widest mb-2 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
              Dernier fossile enregistré
            </div>
            <div className="flex gap-3 items-center">
              {lastFossil.carouselImage || lastFossil.mainImage ? (
                <img src={lastFossil.carouselImage || lastFossil.mainImage} alt="" className="w-12 h-12 object-cover rounded-lg border border-[#D4AF37]/20 shrink-0" />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center bg-[#101A36] rounded-lg border border-[#D4AF37]/20 shrink-0 text-slate-400 font-serif italic text-[10px]">Image</div>
              )}
              <div className="overflow-hidden flex-1">
                <h4 className="text-white text-sm font-serif font-bold truncate">{lastFossil.title || 'Sans titre'}</h4>
                <p className="text-xs text-slate-400 truncate">{lastFossil.period} {lastFossil.fossilDating ? `• ${lastFossil.fossilDating}` : ''}</p>
              </div>
              <button 
                onClick={() => {
                  setEditingFossil(lastFossil);
                  setSelectedPeriod(lastFossil.period as Period);
                  navigate('form');
                }}
                className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#FFD700] hover:scale-105 active:scale-95 text-[#060B1A] font-bold font-serif text-[11px] rounded-lg transition-all cursor-pointer uppercase shrink-0"
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
            className="flex flex-col items-center justify-center p-3 text-[#D4AF37] hover:text-[#FFD700] hover:scale-110 active:scale-95 transition-all focus:outline-none cursor-pointer filter drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]"
            title="Entrer dans la galerie"
          >
            <AmmoniteIcon size={80} />
          </motion.button>
          <span className="font-serif text-slate-300 italic text-sm tracking-wider uppercase mt-2">Cliquez pour Entrer</span>
        </div>
      </div>
    </div>
  );

  const renderHome = () => {
    const isLight = theme === 'light';
    return (
      <div className={`flex flex-col min-h-screen bg-texture font-sans transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0] text-slate-800' : 'bg-[#060B1A] text-white'}`}>
        
        {/* Top bar with discrete settings button */}
        <div className="w-full max-w-4xl mx-auto px-4 pt-4 md:px-8 flex justify-end">
          <button 
            onClick={() => navigate('settings')} 
            className={`p-2.5 rounded-xl border transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center shadow-md ${isLight ? 'bg-white border-slate-200 text-slate-600 hover:text-[#D4AF37] hover:border-[#D4AF37]/50' : 'bg-[#101A36]/60 border-[#D4AF37]/25 text-slate-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/60'}`}
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
              className="text-[#D4AF37] mb-3 filter drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
            >
              <AmmoniteIcon size={72} />
            </motion.div>
            <h1 className={`text-3xl md:text-5xl font-serif font-bold tracking-widest uppercase mb-1 drop-shadow-md ${isLight ? 'text-slate-800' : 'text-[#D4AF37]'}`}>
              Ma Collection
            </h1>
            <p className={`font-serif italic text-lg tracking-wider ${isLight ? 'text-slate-600' : 'text-white/80'}`}>
              de Fossiles
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 md:gap-6 mt-2">
            <button onClick={() => navigate('period', 'Precambrien')} className={`flex flex-col items-center justify-center p-4 md:p-8 rounded-2xl shadow-lg hover:shadow-[#D4AF37]/15 hover:-translate-y-1 transition-all duration-300 group animate-fade-in delay-100 ${isLight ? 'bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50 hover:border-[#D4AF37]/50' : 'bg-[#101A36]/80 text-white border-2 border-[#D4AF37]/20 hover:bg-[#18264F]/90 hover:border-[#D4AF37]/60'}`}>
              <Dna className="w-10 h-10 md:w-12 md:h-12 mb-2 text-[#D4AF37] group-hover:scale-125 duration-500 filter drop-shadow-[0_0_4px_rgba(212,175,55,0.3)]" opacity={0.9} />
              <span className={`font-serif text-sm sm:text-xl font-bold tracking-widest uppercase group-hover:text-[#D4AF37] text-center ${isLight ? 'text-slate-800' : 'text-white'}`}>Précambrien</span>
            </button>
            
            <button onClick={() => navigate('period', 'Paléozoïque')} className={`flex flex-col items-center justify-center p-4 md:p-8 rounded-2xl shadow-lg hover:shadow-[#D4AF37]/15 hover:-translate-y-1 transition-all duration-300 group animate-fade-in delay-100 ${isLight ? 'bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50 hover:border-[#D4AF37]/50' : 'bg-[#101A36]/80 text-white border-2 border-[#D4AF37]/20 hover:bg-[#18264F]/90 hover:border-[#D4AF37]/60'}`}>
              <TrilobiteIcon className="w-10 h-10 md:w-12 md:h-12 mb-2 text-[#D4AF37] group-hover:scale-125 duration-500 filter drop-shadow-[0_0_4px_rgba(212,175,55,0.3)]" />
              <span className={`font-serif text-sm sm:text-xl font-bold tracking-widest uppercase group-hover:text-[#D4AF37] text-center ${isLight ? 'text-slate-800' : 'text-white'}`}>Paléozoïque</span>
            </button>

            <button onClick={() => navigate('period', 'Mésozoïque')} className={`flex flex-col items-center justify-center p-4 md:p-8 rounded-2xl shadow-lg hover:shadow-[#D4AF37]/15 hover:-translate-y-1 transition-all duration-300 group animate-fade-in delay-200 ${isLight ? 'bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50 hover:border-[#D4AF37]/50' : 'bg-[#101A36]/80 text-white border-2 border-[#D4AF37]/20 hover:bg-[#18264F]/90 hover:border-[#D4AF37]/60'}`}>
              <Shell className="w-10 h-10 md:w-12 md:h-12 mb-2 text-[#D4AF37] group-hover:scale-125 duration-500 filter drop-shadow-[0_0_4px_rgba(212,175,55,0.3)]" opacity={0.9} />
              <span className={`font-serif text-sm sm:text-xl font-bold tracking-widest uppercase group-hover:text-[#D4AF37] text-center ${isLight ? 'text-slate-800' : 'text-white'}`}>Mésozoïque</span>
            </button>

            <button onClick={() => navigate('period', 'Cénozoïque')} className={`flex flex-col items-center justify-center p-4 md:p-8 rounded-2xl shadow-lg hover:shadow-[#D4AF37]/15 hover:-translate-y-1 transition-all duration-300 group animate-fade-in delay-200 ${isLight ? 'bg-white text-slate-800 border-2 border-slate-200 hover:bg-slate-50 hover:border-[#D4AF37]/50' : 'bg-[#101A36]/80 text-white border-2 border-[#D4AF37]/20 hover:bg-[#18264F]/90 hover:border-[#D4AF37]/60'}`}>
              <MammothIcon className="w-10 h-10 md:w-12 md:h-12 mb-2 text-[#D4AF37] group-hover:scale-125 duration-500 filter drop-shadow-[0_0_4px_rgba(212,175,55,0.3)]" />
              <span className={`font-serif text-sm sm:text-xl font-bold tracking-widest uppercase group-hover:text-[#D4AF37] text-center ${isLight ? 'text-slate-800' : 'text-white'}`}>Cénozoïque</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <button onClick={() => navigate('grid')} className="py-4 bg-[#D4AF37] text-[#060B1A] font-bold font-serif uppercase tracking-widest hover:bg-[#FFD700] hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl shadow-lg shadow-[#D4AF37]/10 text-center text-xs sm:text-sm">
              Galerie Complète
            </button>

            <button onClick={() => navigate('timescale')} className={`py-4 border-2 font-serif uppercase tracking-widest rounded-xl text-center text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] transition-all ${isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-[#D4AF37]/60' : 'bg-transparent border-[#D4AF37]/30 text-white hover:bg-[#101A36] hover:border-[#D4AF37]/70'}`}>
              Échelle Géologique
            </button>
            
            <button onClick={() => navigate('sheets')} className={`py-4 border-2 font-serif uppercase tracking-widest rounded-xl text-center text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] transition-all ${isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-[#D4AF37]/60' : 'bg-transparent border-[#D4AF37]/30 text-white hover:bg-[#101A36] hover:border-[#D4AF37]/70'}`}>
              Fiches Techniques
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const isLight = theme === 'light';
    return (
      <div className={`flex flex-col min-h-screen font-sans bg-texture transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0] text-slate-800' : 'bg-[#060B1A] text-white'}`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-40 backdrop-blur-md transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0]/95 border-slate-200' : 'bg-[#060B1A]/95 border-[#D4AF37]/20'}`}>
          <button onClick={() => navigate('home')} className={`p-2 hover:scale-110 active:scale-95 transition-all ${isLight ? 'text-slate-600 hover:text-[#D4AF37]' : 'text-slate-300 hover:text-[#D4AF37]'}`}>
            <ChevronLeft size={28} />
          </button>
          <h2 className={`text-xl md:text-3xl font-bold font-serif tracking-widest uppercase flex-1 text-center drop-shadow-sm flex items-center justify-center gap-2 ${isLight ? 'text-slate-900' : 'text-[#D4AF37]'}`}>
            <Settings size={22} className={`${isLight ? 'text-slate-700' : 'text-[#D4AF37]'}`} />
            Paramètres
          </h2>
          <div className="w-10"></div> {/* empty spacing on right to balance back button */}
        </div>

        <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-8 flex flex-col gap-6 relative z-10 pb-20">
          
          {/* Section: Affichage & Thème */}
          <div className={`border rounded-3xl p-6 shadow-md transition-all ${isLight ? 'bg-white border-slate-200' : 'border-[#D4AF37]/25 bg-[#101A36]/60'}`}>
            <h3 className={`text-lg font-serif font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isLight ? 'text-[#D4AF37] border-b border-slate-100 pb-2' : 'text-[#D4AF37] border-b border-[#D4AF37]/20 pb-2'}`}>
              🎨 Thème & Apparence
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Mode d'affichage</p>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Basculez entre le mode clair historique et le mode sombre musée.</p>
              </div>
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`px-4 py-2 rounded-xl border font-serif uppercase tracking-wider text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${isLight ? 'bg-[#060B1A] text-white border-transparent hover:bg-black/80' : 'bg-[#F7F5F0] text-slate-800 border-transparent hover:bg-white'}`}
              >
                {theme === 'light' ? (
                  <>
                    <Moon size={14} /> Mode Sombre
                  </>
                ) : (
                  <>
                    <Sun size={14} /> Mode Clair
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section: Audio */}
          <div className={`border rounded-3xl p-6 shadow-md transition-all ${isLight ? 'bg-white border-slate-200' : 'border-[#D4AF37]/25 bg-[#101A36]/60'}`}>
            <h3 className={`text-lg font-serif font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isLight ? 'text-[#D4AF37] border-b border-slate-100 pb-2' : 'text-[#D4AF37] border-b border-[#D4AF37]/20 pb-2'}`}>
              🔊 Effets Sonores
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Couper le son</p>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Activez ou désactivez les effets sonores préhistoriques lors de la navigation.</p>
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
                className={`p-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${muted ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}
                title={muted ? "Activer le son" : "Couper le son"}
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                <span className="ml-2 text-xs font-serif uppercase font-bold tracking-wider">{muted ? "Sourdine" : "Actif"}</span>
              </button>
            </div>
          </div>

          {/* Section: Sauvegarde locale & Synchro */}
          <div className={`border rounded-3xl p-6 shadow-md transition-all ${isLight ? 'bg-white border-slate-200' : 'border-[#D4AF37]/25 bg-[#101A36]/60'}`}>
            <div className="flex items-center justify-between border-b pb-2 mb-4 border-dashed border-slate-200 dark:border-[#D4AF37]/20">
              <h3 className="text-lg font-serif font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dirHandle ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${dirHandle ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                Sauvegarde Automatique
              </h3>
              {dirHandle && (
                <button 
                  onClick={handleDisconnectDirectory} 
                  className="text-xs text-red-500 hover:text-red-400 hover:underline cursor-pointer font-sans font-bold"
                >
                  Dissocier le dossier
                </button>
              )}
            </div>
            
            <p className={`text-sm leading-relaxed mb-4 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Associez un dossier de la mémoire de votre téléphone ou ordinateur pour y sauvegarder automatiquement une copie complète <code className={`font-mono text-xs ${isLight ? 'bg-slate-100 px-1 py-0.5 rounded text-slate-800' : 'text-[#D4AF37]'}`}>fossiles_sauvegarde_auto.json</code> ainsi qu'un fichier indexé <code className={`font-mono text-xs ${isLight ? 'bg-slate-100 px-1 py-0.5 rounded text-slate-800' : 'text-[#D4AF37]'}`}>exposition_index_lisible.txt</code> à chaque modification.
            </p>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {!dirHandle ? (
                  <button
                    onClick={handleSelectDirectory}
                    className={`px-4 py-2.5 border font-serif uppercase tracking-widest text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-[#D4AF37]/25 border-[#D4AF37]/40 hover:bg-[#D4AF37]/35 text-white'}`}
                  >
                    📁 Associer un dossier local
                  </button>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                      📁 Dossier actif : <span className={`font-mono px-2 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#060B1A] border-[#D4AF37]/15 text-white'}`}>{dirHandle.name}</span>
                    </span>
                    {!dirPermissionGranted && (
                      <button
                        onClick={handleRequestDirPermission}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-600 dark:text-amber-300 text-[11px] rounded-lg transition-all cursor-pointer inline-block self-start mt-1"
                      >
                        🔐 Autoriser l'écriture
                      </button>
                    )}
                  </div>
                )}
                
                <div className="flex items-center">
                  <label className={`flex items-center gap-2 cursor-pointer text-xs p-2.5 rounded-xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-[#060B1A]/40 border-white/5 hover:border-white/15'}`}>
                    <input 
                      type="checkbox" 
                      checked={autoOpen} 
                      onChange={e => handleToggleAutoOpen(e.target.checked)} 
                      className="accent-[#D4AF37] w-4 h-4 rounded cursor-pointer animate-none" 
                    />
                    <span>Ouvrir le dernier fossile au démarrage</span>
                  </label>
                </div>
              </div>

              {dirSyncStatus && (
                <span className="text-xs text-emerald-500 italic font-semibold mt-1 block">
                  {dirSyncStatus}
                </span>
              )}
            </div>
          </div>

          {/* Section: Import & Export */}
          <div className={`border rounded-3xl p-6 shadow-md transition-all ${isLight ? 'bg-white border-slate-200' : 'border-[#D4AF37]/25 bg-[#101A36]/60'}`}>
            <h3 className={`text-lg font-serif font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isLight ? 'text-[#D4AF37] border-b border-slate-100 pb-2' : 'text-[#D4AF37] border-b border-[#D4AF37]/20 pb-2'}`}>
              💾 Importation & Exportation
            </h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Transférez l'intégralité de votre collection d'un appareil à l'autre à l'aide de fichiers JSON.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={handleExport} 
                className={`py-3 border-2 font-serif uppercase tracking-widest text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#101A36]/40 border-[#D4AF37]/20 text-slate-300 hover:text-[#D4AF37] hover:border-[#D4AF37]'}`}
              >
                <Download size={14} /> Exporter la collection (.json)
              </button>
              
              <label className={`py-3 border-2 border-dashed font-serif uppercase tracking-widest text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-transparent border-[#D4AF37]/30 text-slate-300 hover:border-[#D4AF37] hover:text-[#D4AF37]'}`}>
                <Upload size={14} /> Importer une collection (.json)
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
            </div>
          </div>

          {/* Version tag at the bottom */}
          <div className="text-center mt-8 pb-4 flex flex-col items-center gap-1.5 opacity-60">
            <span className={`text-[10px] font-mono tracking-widest uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Ma Collection de Fossiles
            </span>
            <span className="px-2.5 py-0.5 bg-[#D4AF37]/15 text-[#D4AF37] rounded-full text-xs font-mono font-bold tracking-wider border border-[#D4AF37]/30 shadow-inner">
              {APP_VERSION}
            </span>
            <span className="text-[9px] text-slate-500 italic">Enregistré dans l'IndexedDB locale du terminal</span>
          </div>

        </div>
      </div>
    );
  };

  const renderPeriod = () => {
    const periodFossils = fossils.filter(f => f.period === selectedPeriod);
    
    return (
      <div className="flex flex-col min-h-screen bg-[#060B1A] bg-texture text-white relative overflow-hidden">
        <div className="p-4 bg-[#060B1A]/95 border-b border-[#D4AF37]/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <button onClick={() => navigate('home')} className="p-2 text-slate-300 hover:text-[#D4AF37] hover:scale-110 active:scale-95 transition-all"><ChevronLeft size={28} /></button>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#D4AF37] tracking-widest uppercase drop-shadow-sm">{selectedPeriod}</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPeriodViewMode('scroll')}
              className={`p-2 transition-colors ${periodViewMode === 'scroll' ? 'text-[#D4AF37]' : 'text-slate-400 hover:text-white'}`}
            >
              <GalleryHorizontal size={24} />
            </button>
            <button 
              onClick={() => setPeriodViewMode('grid')}
              className={`p-2 transition-colors ${periodViewMode === 'grid' ? 'text-[#D4AF37]' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid size={24} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-4 md:p-8 flex flex-col items-center relative z-0">
          {periodViewMode === 'scroll' ? (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-8 pb-8 flex-1 items-center w-full max-w-6xl px-4 scrollbar-hide">
              {periodFossils.map((fossil, index) => (
                <div key={fossil.id} className={`snap-center shrink-0 w-[75vw] sm:w-72 h-[26rem] sm:h-[30rem] bg-transparent border-2 border-[#D4AF37]/30 rounded-2xl overflow-hidden shadow-2xl relative cursor-pointer group hover:-translate-y-1 hover:border-[#D4AF37] transition-all duration-300 animate-fade-in ${index % 3 === 0 ? 'delay-0' : index % 3 === 1 ? 'delay-100' : 'delay-200'}`} onClick={() => {
                  setEditingFossil(fossil);
                  navigate('form');
                }}>
                  <div className="w-full h-full bg-[#101A36] relative">
                    {fossil.carouselImage || fossil.mainImage ? (
                      <img src={fossil.carouselImage || fossil.mainImage} alt="" className="w-full h-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-serif italic text-sm">Pas d'image</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-[#101A36]/95 border-t border-[#D4AF37]/10 p-4 text-center rounded-b-2xl">
                    <h3 className="text-white text-xl font-serif font-bold tracking-wide truncate group-hover:text-[#D4AF37] transition-colors">{fossil.title || 'Sans titre'}</h3>
                  </div>
                </div>
              ))}
              
              <div className="snap-center shrink-0 w-[75vw] sm:w-72 h-[26rem] sm:h-[30rem] bg-[#101A36]/40 border-2 border-dashed border-[#D4AF37]/20 hover:border-[#D4AF37]/60 hover:bg-[#101A36]/80 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:-translate-y-1 group animate-fade-in delay-300" onClick={() => {
                setEditingFossil(null);
                navigate('form');
              }}>
                <div className="p-4 text-[#D4AF37] mb-4 transform group-hover:scale-110 transition-transform filter drop-shadow-[0_0_4px_rgba(212,175,55,0.2)]">
                  <Plus size={48} strokeWidth={1} />
                </div>
                <span className="text-xl font-serif italic text-slate-300 group-hover:text-white transition-colors text-center px-4">Ajouter un fossile</span>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 overflow-y-auto pb-16">
              {periodFossils.map((fossil, index) => (
                <div key={fossil.id} className={`bg-transparent border-2 border-[#D4AF37]/20 rounded-2xl overflow-hidden shadow-lg relative cursor-pointer group flex flex-col h-64 md:h-72 hover:-translate-y-1 hover:border-[#D4AF37]/60 transition-all duration-300 ${index % 4 === 0 ? 'delay-0' : index % 4 === 1 ? 'delay-100' : index % 4 === 2 ? 'delay-200' : 'delay-300'}`} onClick={() => {
                  setEditingFossil(fossil);
                  navigate('form');
                }}>
                  <div className="flex-1 w-full bg-[#101A36] overflow-hidden relative">
                    {fossil.carouselImage || fossil.mainImage ? (
                      <img src={fossil.carouselImage || fossil.mainImage} alt="" className="w-full h-full object-cover filter brightness-95 group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-serif italic text-sm">Pas d'image</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="p-3 md:p-4 bg-[#101A36] border-t border-[#D4AF37]/10 z-10 w-full overflow-hidden">
                    <h3 className="text-sm md:text-base font-serif font-bold text-white truncate group-hover:text-[#D4AF37] transition-colors">{fossil.title || 'Sans titre'}</h3>
                  </div>
                </div>
              ))}
              
              <div className="bg-[#101A36]/40 border-2 border-dashed border-[#D4AF37]/20 hover:border-[#D4AF37]/60 hover:bg-[#101A36]/80 rounded-2xl flex flex-col h-64 md:h-72 items-center justify-center cursor-pointer transition-all hover:-translate-y-1 group" onClick={() => {
                setEditingFossil(null);
                navigate('form');
              }}>
                <div className="p-4 text-[#D4AF37] mb-2 transform group-hover:scale-110 transition-transform filter drop-shadow-[0_0_4px_rgba(212,175,55,0.2)]">
                  <Plus size={32} strokeWidth={1} />
                </div>
                <span className="text-sm md:text-base font-serif italic text-slate-300 group-hover:text-white transition-colors text-center px-4">Ajouter un fossile</span>
              </div>
            </div>
          )}
          
          <div className="w-full max-w-6xl mx-auto flex justify-center mt-12 mb-8">
            <button onClick={() => navigate('home')} className="flex items-center gap-2 px-8 py-3 border-2 border-[#D4AF37]/35 text-white hover:bg-[#101A36] hover:border-[#D4AF37] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest font-serif text-sm rounded-xl">
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
            onBack={() => navigate('home')} 
            onFossilClick={(fossil) => {
              setEditingFossil(fossil);
              navigate('form', fossil.period as Period);
            }} 
          />
        </motion.div>
      )}
      {currentView === 'sheets' && <motion.div key="sheets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><TechnicalSheetsView onBack={() => navigate('home')} /></motion.div>}
      {currentView === 'settings' && <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{renderSettings()}</motion.div>}
      
    </AnimatePresence>
    </>
  );
}
