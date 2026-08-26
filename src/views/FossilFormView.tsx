import React, { useState, useRef, useEffect, useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import { Fossil, Period, TechnicalSheet, DatingUnit } from '../types';
import ImageUpload from '../components/ImageUpload';
import { ChevronLeft, Home, Printer, Plus, Trash2, Edit2, Info, ArrowLeft, Save, Eye, Sparkles, Calendar, Compass, Clock, BookOpen, Layers, MapPin } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { geologicalEras, allSubPeriods, subPeriodsDetails } from '../geology';
import { calculateFossilClassification, formatFossilDatingString } from '../utils/dating';
import { parseFossilPrice } from '../utils/pricing';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getSheets, saveSheets } from '../store';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Resilient Map Error Boundary to prevent any blank screen crashes
class MapErrorBoundary extends Component<{ children: ReactNode; fallbackText?: string }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("Map rendering issue intercepted gracefully:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-xs opacity-75 font-sans">
          <MapPin size={24} className="mb-2 opacity-50" />
          <span>{(this.props as any).fallbackText || "Carte temporairement indisponible."}</span>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

const LocationMarker = ({ lat, lng, setLat, setLng, readOnly }: { lat?: number, lng?: number, setLat: (l: number) => void, setLng: (l: number) => void, readOnly?: boolean }) => {
  useMapEvents({
    click(e) {
      if (!readOnly && e?.latlng) {
        const clickedLat = Number(e.latlng.lat);
        const clickedLng = Number(e.latlng.lng);
        if (!isNaN(clickedLat) && isFinite(clickedLat) && !isNaN(clickedLng) && isFinite(clickedLng)) {
          setLat(clickedLat);
          setLng(clickedLng);
        }
      }
    },
  });

  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    return null;
  }

  return <Marker position={[lat, lng]} />;
};

const ChangeView = ({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) => {
  const map = useMap();
  const prevCoordsRef = useRef<{ lat: number; lng: number }>({ lat, lng });

  useEffect(() => {
    if (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      isFinite(lat) &&
      isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      if (prevCoordsRef.current.lat !== lat || prevCoordsRef.current.lng !== lng) {
        prevCoordsRef.current = { lat, lng };
        try {
          map.setView([lat, lng], zoom, { animate: false });
        } catch (err) {
          console.warn("Leaflet setView notice:", err);
        }
      }
    }
  }, [lat, lng, zoom, map]);

  return null;
};

interface FossilFormViewProps {
  period: Period;
  existingFossil: Fossil | null;
  onSave: (f: Fossil) => void;
  onBack: () => void;
  onHome: () => void;
  onDelete?: (id: string) => void;
  isLight?: boolean;
}

export default function FossilFormView({ period, existingFossil, onSave, onBack, onHome, onDelete, isLight = false }: FossilFormViewProps) {
  const [isEditing, setIsEditing] = useState(!existingFossil);
  const [fossil, setFossil] = useState<Fossil>(() => {
    if (existingFossil) {
      return {
        ...existingFossil,
        detailedPeriodStart: existingFossil.detailedPeriodStart || existingFossil.period,
        detailedPeriodEnd: existingFossil.detailedPeriodEnd || existingFossil.period,
        speciesType: existingFossil.speciesType || 'animal',
        descriptionImages: Array.isArray(existingFossil.descriptionImages) ? existingFossil.descriptionImages : [],
        speciesImages: Array.isArray(existingFossil.speciesImages)
          ? existingFossil.speciesImages
          : existingFossil.animalImage
          ? [existingFossil.animalImage]
          : []
      };
    }
    return {
      id: uuidv4(),
      period,
      detailedPeriodStart: period,
      detailedPeriodEnd: period,
      title: '',
      reference: '',
      carouselImage: '',
      mainImage: '',
      description: '',
      descriptionImages: [],
      discoveryLocation: '',
      discoveryLat: undefined,
      discoveryLng: undefined,
      animalOrigin: '',
      alimentation: '',
      speciesSize: '',
      speciesType: 'animal',
      animalImage: '',
      speciesImages: [],
      fossilDating: '',
      didYouKnowText: '',
      didYouKnowImage: ''
    };
  });

  const [techSheet, setTechSheet] = useState<TechnicalSheet>(() => {
    return {
      id: existingFossil?.id || uuidv4(),
      fossilId: existingFossil?.id,
      nom: existingFossil?.title || '',
      nomPhoto: existingFossil?.carouselImage || existingFossil?.mainImage || '',
      provenance: existingFossil?.techSheetProvenance || existingFossil?.discoveryLocation || '',
      periode: existingFossil?.detailedPeriodStart || existingFossil?.period || period,
      fossilDating: existingFossil?.fossilDating || '',
      dateAchat: existingFossil?.techSheetDateAchat || '',
      lieuAchat: existingFossil?.techSheetLieuAchat || '',
      certificat: existingFossil?.techSheetCertificat || 'non',
      certificatPhoto: existingFossil?.techSheetCertificatPhoto || '',
      prix: existingFossil?.techSheetPrix !== undefined ? parseFossilPrice(existingFossil.techSheetPrix) : 0,
      typeSheet: existingFossil?.techSheetType || 'achat',
      datePrelevement: existingFossil?.techSheetDatePrelevement || '',
      lieuPrelevement: existingFossil?.techSheetLieuPrelevement || ''
    };
  });

  useEffect(() => {
    let isMounted = true;
    getSheets().then(sheets => {
      if (!isMounted) return;
      const match = sheets.find(s => 
        (fossil.id && s.fossilId === fossil.id) || 
        (fossil.id && s.id === fossil.id) || 
        (fossil.title && s.nom === fossil.title)
      );
      if (match) {
        setTechSheet(prev => ({
          ...prev,
          ...match,
          typeSheet: match.typeSheet || prev.typeSheet || 'achat',
          // Preserve whichever price is non-zero
          prix: match.prix !== undefined && match.prix !== null && parseFossilPrice(match.prix) > 0 
            ? parseFossilPrice(match.prix) 
            : (prev.prix !== undefined && prev.prix !== null && parseFossilPrice(prev.prix) > 0 ? parseFossilPrice(prev.prix) : (parseFossilPrice(existingFossil?.techSheetPrix) || 0))
        }));
      }
    });
    return () => { isMounted = false; };
  }, [fossil.id, fossil.title]);

  const [datingUnit, setDatingUnit] = useState<DatingUnit>(() => {
    if (existingFossil?.datingUnit) return existingFossil.datingUnit;
    if (existingFossil?.fossilDating?.toLowerCase().includes('inconnue')) return 'unknown';
    if (existingFossil?.fossilDating?.toLowerCase().includes('mille') || existingFossil?.fossilDating?.toLowerCase().includes('ka')) return 'ka';
    return 'Ma';
  });

  const [datingValue, setDatingValue] = useState<string>(() => {
    if (existingFossil?.datingValue !== undefined && existingFossil.datingValue !== '') return existingFossil.datingValue;
    if (existingFossil?.fossilDating) {
      const numMatch = existingFossil.fossilDating.match(/([0-9]+([.,][0-9]+)?)/);
      if (numMatch) return numMatch[0].replace(',', '.');
    }
    return '';
  });

  const [datingPrecision, setDatingPrecision] = useState<string>(() => {
    return existingFossil?.datingPrecision || '';
  });

  // Calculate live geological classification according to user rules
  const classification = useMemo(() => {
    return calculateFossilClassification(
      datingUnit,
      datingValue,
      fossil.detailedPeriodStart || 'Jurassique',
      fossil.detailedPeriodEnd || ''
    );
  }, [datingUnit, datingValue, fossil.detailedPeriodStart, fossil.detailedPeriodEnd]);

  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showPeriodInfo, setShowPeriodInfo] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const update = (field: keyof Fossil, value: any) => {
    setFossil(prev => ({ ...prev, [field]: value }));
  };

  const updateTechSheet = (field: keyof TechnicalSheet, value: any) => {
    setTechSheet(prev => ({ ...prev, [field]: value }));
  };

  const handleGeocode = async (locName: string) => {
    if (!locName || !locName.trim()) return;
    setIsGeocoding(true);
    setGeocodeStatus(null);
    try {
      // Clean query: remove special chars and extra comments in parentheses if present
      const cleanPrimary = locName.replace(/\([^)]*\)/g, '').trim();
      const queriesToTry = [
        cleanPrimary,
        // If comma present, try up to the first 2 segments (e.g. "Millau, Aveyron")
        cleanPrimary.includes(',') ? cleanPrimary.split(',').slice(0, 2).join(',').trim() : '',
        // If still no luck, try the first segment
        cleanPrimary.includes(',') ? cleanPrimary.split(',')[0].trim() : ''
      ].filter((q): q is string => Boolean(q && q.length > 1));

      // Remove duplicate queries
      const uniqueQueries = Array.from(new Set(queriesToTry));

      let found = false;
      for (const q of uniqueQueries) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
            {
              signal: controller.signal,
              headers: {
                'Accept-Language': 'fr,en'
              }
            }
          );
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                update('discoveryLat', lat);
                update('discoveryLng', lon);
                const displayName = data[0].display_name ? data[0].display_name.split(',').slice(0, 3).join(',') : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                setGeocodeStatus(`Position trouvée : ${displayName}`);
                found = true;
                break;
              }
            }
          }
        } catch {
          // try next query
        }
      }

      if (!found) {
        setGeocodeStatus("Lieu non repéré automatiquement. Vous pouvez cliquer directement sur la carte.");
      }
    } catch {
      setGeocodeStatus("Recherche indisponible. Vous pouvez cliquer directement sur la carte.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const addDescriptionImage = (url: string) => {
    if (!url) return;
    const current = Array.isArray(fossil.descriptionImages) ? fossil.descriptionImages : [];
    update('descriptionImages', [...current, url]);
  };

  const removeDescriptionImage = (index: number) => {
    const current = Array.isArray(fossil.descriptionImages) ? fossil.descriptionImages : [];
    update('descriptionImages', current.filter((_, i) => i !== index));
  };

  const addSpeciesImage = (url: string) => {
    if (!url) return;
    const current = fossil.speciesImages || [];
    update('speciesImages', [...current, url]);
  };

  const removeSpeciesImage = (index: number) => {
    const current = fossil.speciesImages || [];
    update('speciesImages', current.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Determine accurate formatted string and subperiods
    const computedDatingString = formatFossilDatingString(
      datingUnit,
      datingValue,
      datingPrecision,
      fossil.detailedPeriodStart || classification.subPeriod,
      fossil.detailedPeriodEnd || ''
    );

    const determinedStart = (datingUnit !== 'unknown' && datingValue.trim() !== '')
      ? classification.subPeriod
      : (fossil.detailedPeriodStart || classification.subPeriod);

    const determinedEnd = (datingUnit !== 'unknown' && datingValue.trim() !== '')
      ? classification.subPeriod
      : (fossil.detailedPeriodEnd || determinedStart);

    const parsedPrice = parseFossilPrice(techSheet.prix);

    const updatedFossil: Fossil = {
      ...fossil,
      period: classification.period,
      detailedPeriodStart: determinedStart,
      detailedPeriodEnd: determinedEnd,
      datingUnit,
      datingValue,
      datingPrecision,
      fossilDating: computedDatingString,
      techSheetType: techSheet.typeSheet || 'achat',
      techSheetDatePrelevement: techSheet.datePrelevement || '',
      techSheetLieuPrelevement: techSheet.lieuPrelevement || '',
      techSheetProvenance: techSheet.provenance || fossil.discoveryLocation || '',
      techSheetDateAchat: techSheet.dateAchat || '',
      techSheetLieuAchat: techSheet.lieuAchat || '',
      techSheetCertificat: techSheet.certificat || 'non',
      techSheetCertificatPhoto: techSheet.certificatPhoto || '',
      techSheetPrix: parsedPrice
    };

    onSave(updatedFossil);
    
    // Save or update technical sheet
    const sheets = await getSheets();
    const existingIndex = sheets.findIndex(s => s.fossilId === updatedFossil.id || (updatedFossil.title && s.nom === updatedFossil.title));
    
    const updatedSheet: TechnicalSheet = {
      ...techSheet,
      fossilId: updatedFossil.id,
      nom: updatedFossil.title,
      nomPhoto: updatedFossil.carouselImage || updatedFossil.mainImage || techSheet.nomPhoto,
      provenance: updatedFossil.discoveryLocation || techSheet.provenance,
      periode: updatedFossil.period,
      fossilDating: computedDatingString,
      typeSheet: techSheet.typeSheet || 'achat',
      prix: parsedPrice
    };

    if (existingIndex >= 0) {
      sheets[existingIndex] = updatedSheet;
    } else {
      sheets.push(updatedSheet);
    }
    await saveSheets(sheets);
    setFossil(updatedFossil);
    setIsEditing(false);
  };

  const handlePrint = () => {
    setIsEditing(false);
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const renderEditMode = () => (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in pb-12 px-2 sm:px-0">
      
      {/* Visual Identity */}
      <div className={`border p-6 md:p-8 rounded-3xl shadow-xl transition-colors ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/25 text-white'}`}>
        <h3 className={`text-lg md:text-xl font-serif font-bold mb-6 uppercase tracking-widest border-b pb-2 inline-block ${isLight ? 'text-black border-slate-300' : 'text-[#D4AF37] border-[#D4AF37]/30'}`}>Identité du Spécimen</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Titre / Nom du fossile</label>
            <input
              type="text"
              value={fossil.title}
              onChange={e => update('title', e.target.value)}
              className={`w-full p-4 border rounded-xl font-sans outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37]'}`}
              placeholder="Ex: Dactylioceras commune"
            />
          </div>
          <div>
            <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Référence d'inventaire</label>
            <input
              type="text"
              value={fossil.reference || ''}
              onChange={e => update('reference', e.target.value)}
              className={`w-full p-4 border rounded-xl font-sans outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37]'}`}
              placeholder="Ex: FOS-2023-001"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Photo de couverture / Carrousel</label>
            <div className="flex justify-center">
              <ImageUpload
                value={fossil.carouselImage || ''}
                onChange={val => update('carouselImage', val)}
                onRemove={() => update('carouselImage', '')}
                className={`w-full h-48 object-contain rounded-2xl ${isLight ? 'bg-slate-50' : 'bg-[#060B1A]/50'}`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Photo principale (Grand format)</label>
            <div className="flex justify-center">
              <ImageUpload
                value={fossil.mainImage || ''}
                onChange={val => update('mainImage', val)}
                onRemove={() => update('mainImage', '')}
                className={`w-full h-48 object-contain rounded-2xl ${isLight ? 'bg-slate-50' : 'bg-[#060B1A]/50'}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stratigraphic Period Selection & Dating */}
      <div className={`border p-6 md:p-8 rounded-3xl shadow-xl transition-colors ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/25 text-white'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 mb-6">
          <h3 className={`text-lg md:text-xl font-serif font-bold uppercase tracking-widest ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
            Datation & Classification Géologique
          </h3>
          <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border self-start sm:self-auto ${isLight ? 'bg-slate-100 border-slate-300 text-black' : 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]'}`}>
            ⚡ Classement automatique
          </span>
        </div>

        {/* Dating Type Selection: Ma, ka, unknown */}
        <div className="mb-6">
          <label className={`block text-xs font-serif uppercase tracking-widest font-bold mb-3 ${isLight ? 'text-black' : 'text-slate-300'}`}>
            Type de datation du spécimen :
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setDatingUnit('Ma')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                datingUnit === 'Ma'
                  ? (isLight ? 'bg-black text-white border-black shadow-md font-bold' : 'bg-[#D4AF37] text-[#060B1A] border-[#FFD700] shadow-md font-bold')
                  : (isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-black' : 'bg-[#060B1A]/80 hover:bg-[#101A36] border-[#D4AF37]/25 text-slate-200')
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                datingUnit === 'Ma' ? (isLight ? 'border-white bg-white' : 'border-[#060B1A] bg-[#060B1A]') : 'border-current'
              }`}>
                {datingUnit === 'Ma' && <div className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-black' : 'bg-[#D4AF37]'}`} />}
              </div>
              <div>
                <div className="text-xs font-serif uppercase tracking-wider">Millions d'années (Ma)</div>
                <div className={`text-[10px] font-sans opacity-80 ${datingUnit === 'Ma' ? '' : 'text-slate-400'}`}>Datation exacte en Ma</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDatingUnit('ka')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                datingUnit === 'ka'
                  ? (isLight ? 'bg-black text-white border-black shadow-md font-bold' : 'bg-[#D4AF37] text-[#060B1A] border-[#FFD700] shadow-md font-bold')
                  : (isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-black' : 'bg-[#060B1A]/80 hover:bg-[#101A36] border-[#D4AF37]/25 text-slate-200')
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                datingUnit === 'ka' ? (isLight ? 'border-white bg-white' : 'border-[#060B1A] bg-[#060B1A]') : 'border-current'
              }`}>
                {datingUnit === 'ka' && <div className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-black' : 'bg-[#D4AF37]'}`} />}
              </div>
              <div>
                <div className="text-xs font-serif uppercase tracking-wider">Mille ans (ka / ans)</div>
                <div className={`text-[10px] font-sans opacity-80 ${datingUnit === 'ka' ? '' : 'text-slate-400'}`}>Fossiles récents & quaternaires</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDatingUnit('unknown')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                datingUnit === 'unknown'
                  ? (isLight ? 'bg-black text-white border-black shadow-md font-bold' : 'bg-[#D4AF37] text-[#060B1A] border-[#FFD700] shadow-md font-bold')
                  : (isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-black' : 'bg-[#060B1A]/80 hover:bg-[#101A36] border-[#D4AF37]/25 text-slate-200')
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                datingUnit === 'unknown' ? (isLight ? 'border-white bg-white' : 'border-[#060B1A] bg-[#060B1A]') : 'border-current'
              }`}>
                {datingUnit === 'unknown' && <div className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-black' : 'bg-[#D4AF37]'}`} />}
              </div>
              <div>
                <div className="text-xs font-serif uppercase tracking-wider">Datation inconnue</div>
                <div className={`text-[10px] font-sans opacity-80 ${datingUnit === 'unknown' ? '' : 'text-slate-400'}`}>Selon le règne de l'espèce</div>
              </div>
            </button>
          </div>
        </div>

        {/* Input fields based on selection */}
        {datingUnit !== 'unknown' ? (
          <div className="space-y-4 mb-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-serif uppercase tracking-widest font-bold mb-2 ${isLight ? 'text-black' : 'text-slate-300'}`}>
                  {datingUnit === 'Ma' ? "Âge estimé (en Millions d'années)" : "Âge estimé (en milliers d'années)"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={datingValue}
                    onChange={e => setDatingValue(e.target.value)}
                    className={`w-full p-4 pr-24 border rounded-xl font-sans outline-none text-base font-bold ${
                      isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37]'
                    }`}
                    placeholder={datingUnit === 'Ma' ? "Ex: 180 ou 66" : "Ex: 15 ou 15 000"}
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-black uppercase pointer-events-none px-2 py-1 rounded ${
                    isLight ? 'bg-slate-200 text-black' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
                  }`}>
                    {datingUnit === 'Ma' ? 'Ma' : 'ka'}
                  </span>
                </div>
                <p className={`text-[11px] font-sans mt-1.5 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                  {datingUnit === 'Ma'
                    ? "Exemples : 66 (Crétacé), 180 (Jurassique), 250 (Trias), 500 (Cambrien)..."
                    : "Exemples : 15 (15 000 ans ➔ Quaternaire), 120 (120 000 ans)..."}
                </p>
              </div>

              <div>
                <label className={`block text-xs font-serif uppercase tracking-widest font-bold mb-2 ${isLight ? 'text-black' : 'text-slate-300'}`}>
                  Précision stratigraphique / Étage (Optionnel)
                </label>
                <input
                  type="text"
                  value={datingPrecision}
                  onChange={e => setDatingPrecision(e.target.value)}
                  className={`w-full p-4 border rounded-xl font-sans outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37]'
                  }`}
                  placeholder="Ex: Toarcien inférieur, Hettangien, etc."
                />
                <p className={`text-[11px] font-sans mt-1.5 ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                  Niveau d'étage géologique ou contexte géologique précis.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6 animate-fade-in">
            <div className={`p-4 rounded-xl border mb-4 text-xs leading-relaxed ${
              isLight ? 'bg-slate-100 border-slate-300 text-black' : 'bg-[#060B1A]/80 border-[#D4AF37]/20 text-slate-300'
            }`}>
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <Info size={14} className={isLight ? 'text-black' : 'text-[#D4AF37]'} />
                Règle de classement lorsque la date exacte est inconnue :
              </p>
              <p>
                Le fossile est automatiquement classé selon la période de vie de l'organisme. S'il a vécu à cheval sur plusieurs époques, il sera classé sur la <strong>période du début de son règne</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-serif uppercase tracking-widest font-bold mb-2 ${isLight ? 'text-black' : 'text-slate-300'}`}>
                  Période d'apparition / Début du règne
                </label>
                <select
                  value={fossil.detailedPeriodStart || 'Jurassique'}
                  onChange={e => {
                    const val = e.target.value;
                    update('detailedPeriodStart', val);
                    if (!fossil.detailedPeriodEnd) update('detailedPeriodEnd', val);
                  }}
                  className={`w-full p-4 border rounded-xl font-sans outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37]'
                  }`}
                >
                  {allSubPeriods.map(sub => (
                    <option key={sub} value={sub} className={isLight ? 'bg-white text-black' : 'bg-[#060B1A] text-white'}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-serif uppercase tracking-widest font-bold mb-2 ${isLight ? 'text-black' : 'text-slate-300'}`}>
                  Fin du règne de l'espèce (Optionnelle)
                </label>
                <select
                  value={fossil.detailedPeriodEnd || fossil.detailedPeriodStart || 'Jurassique'}
                  onChange={e => update('detailedPeriodEnd', e.target.value)}
                  className={`w-full p-4 border rounded-xl font-sans outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37]'
                  }`}
                >
                  {allSubPeriods.map(sub => (
                    <option key={sub} value={sub} className={isLight ? 'bg-white text-black' : 'bg-[#060B1A] text-white'}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic live explanatory banner / box */}
        <div className={`p-4 md:p-5 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
          isLight
            ? 'bg-amber-50/90 border-amber-300 text-black shadow-sm'
            : 'bg-[#0b1329] border-[#D4AF37]/50 text-white shadow-xl'
        }`}>
          <div className={`p-3 rounded-2xl shrink-0 ${
            isLight ? 'bg-amber-200/90 text-black' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
          }`}>
            <Compass size={26} />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-serif uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full border ${
                isLight ? 'bg-white border-amber-300 text-black' : 'bg-[#060B1A] border-[#D4AF37]/40 text-[#D4AF37]'
              }`}>
                📍 Destination dans la collection
              </span>
              <span className={`font-serif font-black text-xs sm:text-sm uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${
                isLight ? 'bg-black text-white' : 'bg-[#D4AF37] text-[#060B1A]'
              }`}>
                Ère {classification.period}
              </span>
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg ${
                isLight ? 'bg-amber-200/80 text-black' : 'bg-white/10 text-slate-200'
              }`}>
                {classification.subPeriod}
              </span>
            </div>
            <p className={`text-xs sm:text-sm font-sans leading-relaxed ${isLight ? 'text-slate-900 font-medium' : 'text-slate-200'}`}>
              {classification.explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Description & Images */}
      <div className={`border p-6 md:p-8 rounded-3xl shadow-xl transition-colors ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/25 text-white'}`}>
        <h3 className={`text-lg md:text-xl font-serif font-bold mb-6 uppercase tracking-widest border-b pb-2 inline-block ${isLight ? 'text-black border-slate-300' : 'text-[#D4AF37] border-[#D4AF37]/30'}`}>Description & Photos Additionnelles</h3>
        <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Texte descriptif</label>
        <textarea
          value={fossil.description}
          onChange={e => update('description', e.target.value)}
          className={`w-full p-4 border min-h-[140px] mb-6 rounded-xl font-sans resize-y outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37]'}`}
          placeholder="Détails scientifiques, anatomiques, historique de la pièce..."
        />

        <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Photos complémentaires</label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(fossil.descriptionImages || []).map((img, i) => (
            <div key={i} className={`relative shrink-0 border rounded-xl overflow-hidden p-1 ${isLight ? 'border-slate-300 bg-slate-100' : 'border-[#D4AF37]/20 bg-[#060B1A]/50'}`}>
              <img src={img} alt="" className="w-24 h-24 object-contain" />
              <button onClick={() => removeDescriptionImage(i)} className="absolute -top-2 -right-2 bg-red-800 text-white p-1 hover:bg-red-700 transition-colors rounded-full">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className={`w-26 h-26 shrink-0 border border-dashed rounded-xl p-1 transition-all cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-[#D4AF37]/45 hover:bg-white/10'}`}>
            <ImageUpload value="" onChange={addDescriptionImage} className="w-24 h-24 object-contain" icon={<Plus className={isLight ? 'text-black' : 'text-[#D4AF37]'} />} />
          </div>
        </div>
      </div>

      {/* Discovery Location & Interactive Map */}
      <div className={`border p-6 md:p-8 rounded-3xl shadow-xl space-y-4 transition-colors ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/25 text-white'}`}>
        <h3 className={`text-lg md:text-xl font-serif font-bold uppercase tracking-widest border-b pb-2 inline-block ${isLight ? 'text-black border-slate-300' : 'text-[#D4AF37] border-[#D4AF37]/30'}`}>Lieu de Découverte (Carte Interactive)</h3>
        <textarea
          value={fossil.discoveryLocation}
          onChange={e => update('discoveryLocation', e.target.value)}
          className={`w-full p-4 border min-h-[80px] rounded-xl font-sans resize-y outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black placeholder-slate-400' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37] placeholder-slate-500'}`}
          placeholder="Nom du lieu (ex: Millau, Aveyron, France) et autres détails..."
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => handleGeocode(fossil.discoveryLocation)}
            disabled={isGeocoding || !fossil.discoveryLocation.trim()}
            className={`px-4 py-2 font-serif uppercase tracking-widest text-xs font-bold rounded-xl border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300' : 'bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 text-[#D4AF37] border-[#D4AF37]/30'
            }`}
          >
            {isGeocoding ? (
              <>
                <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full"></span>
                Localisation en cours...
              </>
            ) : "🔍 Pointer sur la carte automatiquement"}
          </button>
          {geocodeStatus && (
            <span className={`text-xs font-sans italic ${geocodeStatus.includes('⚠️') || geocodeStatus.includes('indisponible') || geocodeStatus.includes('non repéré') ? 'text-amber-500' : 'text-emerald-600'}`}>
              {geocodeStatus}
            </span>
          )}
        </div>
        <div className={`h-64 w-full border rounded-2xl overflow-hidden relative z-0 ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#060B1A] border-[#D4AF37]/25'}`}>
          <MapErrorBoundary fallbackText="Carte en cours de chargement...">
            <MapContainer center={[fossil.discoveryLat || 46.2276, fossil.discoveryLng || 2.2137]} zoom={fossil.discoveryLat ? 10 : 4} className="w-full h-full">
              <ChangeView lat={fossil.discoveryLat || 46.2276} lng={fossil.discoveryLng || 2.2137} zoom={fossil.discoveryLat ? 10 : 4} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationMarker 
                lat={fossil.discoveryLat} 
                lng={fossil.discoveryLng} 
                setLat={(lat) => update('discoveryLat', lat)} 
                setLng={(lng) => update('discoveryLng', lng)} 
              />
            </MapContainer>
          </MapErrorBoundary>
        </div>
        <p className={`text-xs italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Cliquez sur la carte pour définir le point exact de la découverte s'il n'est pas déjà pointé.</p>
      </div>

      {/* Species info */}
      <div className={`border p-6 md:p-8 rounded-3xl shadow-xl transition-colors ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/25 text-white'}`}>
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4 ${isLight ? 'border-slate-300' : 'border-[#D4AF37]/30'}`}>
          <h3 className={`text-lg md:text-xl font-serif font-bold uppercase tracking-widest ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Espèce</h3>
          <div className={`flex mt-4 sm:mt-0 border rounded-xl overflow-hidden ${isLight ? 'border-slate-300' : 'border-[#D4AF37]/25'}`}>
            <button
              className={`px-4 py-2 font-serif uppercase tracking-widest text-xs transition-colors ${fossil.speciesType === 'animal' || !fossil.speciesType ? (isLight ? 'bg-black text-white font-bold' : 'bg-[#D4AF37] text-[#060B1A] font-bold') : (isLight ? 'bg-transparent text-slate-700 hover:bg-slate-100' : 'bg-transparent text-slate-300 hover:bg-white/10')}`}
              onClick={() => update('speciesType', 'animal')}
            >
              Animale
            </button>
            <button
              className={`px-4 py-2 font-serif uppercase tracking-widest text-xs transition-colors ${fossil.speciesType === 'vegetal' ? (isLight ? 'bg-black text-white font-bold' : 'bg-[#D4AF37] text-[#060B1A] font-bold') : (isLight ? 'bg-transparent text-slate-700 hover:bg-slate-100' : 'bg-transparent text-slate-300 hover:bg-white/10')}`}
              onClick={() => update('speciesType', 'vegetal')}
            >
              Végétale
            </button>
          </div>
        </div>

        <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Description</label>
        <textarea
          value={fossil.animalOrigin}
          onChange={e => update('animalOrigin', e.target.value)}
          className={`w-full p-4 border min-h-[80px] mb-6 rounded-xl font-sans resize-y outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37]'}`}
        />

        {fossil.speciesType !== 'vegetal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Alimentation</label>
              <textarea
                value={fossil.alimentation}
                onChange={e => update('alimentation', e.target.value)}
                className={`w-full p-4 border min-h-[80px] rounded-xl font-sans resize-y outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37]'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Taille</label>
              <input
                type="text"
                value={fossil.speciesSize || ''}
                onChange={e => update('speciesSize', e.target.value)}
                className={`w-full p-4 border rounded-xl font-sans outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37]'}`}
              />
            </div>
          </div>
        )}

        <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Photos (Carrousel)</label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {fossil.animalImage && !(fossil.speciesImages?.length) && (
            <div className={`relative shrink-0 border rounded-xl overflow-hidden p-1 ${isLight ? 'border-slate-300 bg-slate-100' : 'border-[#D4AF37]/20 bg-[#060B1A]/50'}`}>
              <img src={fossil.animalImage} alt="" className="w-24 h-24 object-contain" />
              <button onClick={() => update('animalImage', '')} className="absolute -top-2 -right-2 bg-red-800 text-white p-1 hover:bg-red-700 transition-colors rounded-full">
                <Trash2 size={12} />
              </button>
            </div>
          )}
          {(fossil.speciesImages || []).map((img, i) => (
            <div key={i} className={`relative shrink-0 border rounded-xl overflow-hidden p-1 ${isLight ? 'border-slate-300 bg-slate-100' : 'border-[#D4AF37]/20 bg-[#060B1A]/50'}`}>
              <img src={img} alt="" className="w-24 h-24 object-contain" />
              <button onClick={() => removeSpeciesImage(i)} className="absolute -top-2 -right-2 bg-red-800 text-white p-1 hover:bg-red-700 transition-colors rounded-full">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className={`w-26 h-26 shrink-0 border border-dashed rounded-xl p-1 transition-all cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-[#D4AF37]/45 hover:bg-white/10'}`}>
            <ImageUpload value="" onChange={addSpeciesImage} className="w-24 h-24 object-contain" icon={<Plus className={isLight ? 'text-black' : 'text-[#D4AF37]'} />} />
          </div>
        </div>
      </div>

      {/* Technical Sheet Infos */}
      <div className={`border p-6 md:p-8 rounded-3xl shadow-xl transition-colors ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/25 text-white'}`}>
        <h3 className={`text-lg md:text-xl font-serif font-bold mb-6 uppercase tracking-widest border-b pb-2 inline-block ${isLight ? 'text-black border-slate-300' : 'text-[#D4AF37] border-[#D4AF37]/30'}`}>Informations Fiche Technique</h3>
        <p className={`text-sm font-sans mb-6 italic ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Ces informations seront automatiquement ajoutées au tableau dans l'onglet "Fiches Techniques".</p>
        
        {/* Choice of sheet type */}
        <div className={`mb-6 flex flex-col sm:flex-row gap-4 sm:items-center border-b pb-4 ${isLight ? 'border-slate-300' : 'border-[#D4AF37]/25'}`}>
          <span className={`block text-sm font-serif uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Type de fiche technique :</span>
          <div className="flex gap-4">
            <label className={`flex items-center gap-2 cursor-pointer font-sans text-sm px-4 py-2 rounded-xl border transition-colors ${isLight ? 'bg-slate-50 border-slate-300 text-black' : 'bg-[#060B1A]/80 border-[#D4AF37]/20 text-slate-200'}`}>
              <input 
                type="radio" 
                checked={(techSheet.typeSheet || 'achat') === 'achat'} 
                onChange={() => updateTechSheet('typeSheet', 'achat')} 
                className="accent-black w-4 h-4" 
              /> 
              <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`}>💰 Fiche d'Achat</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer font-sans text-sm px-4 py-2 rounded-xl border transition-colors ${isLight ? 'bg-slate-50 border-slate-300 text-black' : 'bg-[#060B1A]/80 border-[#D4AF37]/20 text-slate-200'}`}>
              <input 
                type="radio" 
                checked={techSheet.typeSheet === 'prelevement'} 
                onChange={() => {
                  updateTechSheet('typeSheet', 'prelevement');
                  if (!techSheet.lieuPrelevement) {
                    updateTechSheet('lieuPrelevement', fossil.discoveryLocation);
                  }
                }} 
                className="accent-black w-4 h-4" 
              /> 
              <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`}>⛏️ Fiche de Prélèvement</span>
            </label>
          </div>
        </div>

        {(techSheet.typeSheet || 'achat') === 'prelevement' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4 animate-fade-in">
            <div>
              <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Date de découverte / prélèvement</label>
              <input 
                type="text"
                value={techSheet.datePrelevement || ''}
                onChange={e => updateTechSheet('datePrelevement', e.target.value)}
                className={`w-full p-3 border rounded-xl font-sans outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black placeholder-slate-400' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37] placeholder-slate-500'}`}
                placeholder="Ex: Printemps 2018, ou 15/06/2021"
              />
            </div>
            <div>
              <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Lieu précis de prélèvement</label>
              <input 
                type="text"
                value={techSheet.lieuPrelevement || ''}
                onChange={e => updateTechSheet('lieuPrelevement', e.target.value)}
                className={`w-full p-3 border rounded-xl font-sans outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black placeholder-slate-400' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37] placeholder-slate-500'}`}
                placeholder="Ex: Carrière de calcaire, Millau"
              />
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
              <div>
                <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Date d'achat</label>
                <input 
                  type="text"
                  value={techSheet.dateAchat || ''}
                  onChange={e => updateTechSheet('dateAchat', e.target.value)}
                  className={`w-full p-3 border rounded-xl font-sans outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black placeholder-slate-400' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37] placeholder-slate-500'}`}
                  placeholder="Ex: 12/05/2023"
                />
              </div>
              <div>
                <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Lieu d'achat</label>
                <input 
                  type="text"
                  value={techSheet.lieuAchat || ''}
                  onChange={e => updateTechSheet('lieuAchat', e.target.value)}
                  className={`w-full p-3 border rounded-xl font-sans outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black placeholder-slate-400' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37] placeholder-slate-500'}`}
                  placeholder="Ex: Bourse aux minéraux de Paris"
                />
              </div>
              <div>
                <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Prix d'achat (€)</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  value={techSheet.prix === 0 || techSheet.prix === undefined ? '' : techSheet.prix}
                  onChange={e => updateTechSheet('prix', e.target.value)}
                  className={`w-full p-3 border rounded-xl font-sans outline-none ${isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black placeholder-slate-400' : 'bg-[#060B1A]/70 border-[#D4AF37]/25 text-white focus:border-[#D4AF37] placeholder-slate-500'}`}
                  placeholder="Ex: 150"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Certificat d'authenticité</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-sans text-sm">
                  <input type="radio" checked={techSheet.certificat === 'oui'} onChange={() => updateTechSheet('certificat', 'oui')} className="accent-black w-4 h-4" /> 
                  <span className={isLight ? 'text-black' : 'text-slate-200'}>Oui</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-sans text-sm">
                  <input type="radio" checked={techSheet.certificat === 'non'} onChange={() => updateTechSheet('certificat', 'non')} className="accent-black w-4 h-4" /> 
                  <span className={isLight ? 'text-black' : 'text-slate-200'}>Non</span>
                </label>
              </div>
            </div>
            
            {techSheet.certificat === 'oui' && (
              <div>
                <label className={`block text-sm font-serif mb-2 uppercase tracking-widest font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>Photo du certificat</label>
                <div className="w-full max-w-sm">
                   <ImageUpload 
                     value={techSheet.certificatPhoto || ''} 
                     onChange={val => updateTechSheet('certificatPhoto', val)}
                     onRemove={() => updateTechSheet('certificatPhoto', '')}
                     className={`w-full h-48 object-contain rounded-xl ${isLight ? 'bg-slate-50' : 'bg-[#060B1A]'}`}
                   />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );

  const renderViewMode = () => (
    <div className="w-full max-w-4xl mx-auto space-y-12 pb-16 print:space-y-8 print:max-w-none px-4 sm:px-0">
      
      {/* Museum Header */}
      <div className="text-center space-y-4">
        <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif uppercase tracking-widest break-words whitespace-normal px-2 font-bold drop-shadow-md ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
          {fossil.title || 'Sans titre'}
        </h1>
        {fossil.reference && (
          <p className={`text-sm font-sans tracking-widest uppercase ${isLight ? 'text-slate-600 font-bold' : 'text-slate-400'}`}>
            Réf: {fossil.reference}
          </p>
        )}
      </div>

      {fossil.mainImage && (
        <div className={`border-2 rounded-3xl overflow-hidden p-2 shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#101A36]/50 border-[#D4AF37]/30'}`}>
          <img src={fossil.mainImage} alt={fossil.title} className="w-full max-h-[800px] object-contain cursor-pointer rounded-2xl" onClick={() => setEnlargedImage(fossil.mainImage)} />
        </div>
      )}

      {/* Main Description */}
      {fossil.description && (
        <div className={`border-2 p-8 md:p-12 relative rounded-3xl mt-12 shadow-xl ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/30 text-white'}`}>
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-2 border rounded-b-2xl shadow-md ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#101A36] border-[#D4AF37]/30'}`}>
             <span className={`font-serif uppercase tracking-widest text-xl sm:text-2xl font-bold ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Description</span>
          </div>
          <p className={`font-sans text-lg leading-relaxed whitespace-pre-wrap mt-6 font-medium ${isLight ? 'text-black' : 'text-white/95'}`}>
            {fossil.description}
          </p>
          {(fossil.descriptionImages || []).length > 0 && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {(fossil.descriptionImages || []).map((img, i) => (
                <div key={i} className={`border p-1 shadow-md rounded-xl overflow-hidden ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#060B1A] border-[#D4AF37]/20'}`}>
                  <img src={img} alt="" className="w-full h-32 object-contain cursor-pointer hover:scale-105 transition-all" onClick={() => setEnlargedImage(img)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timescale Widget */}
      <div className={`border-2 py-8 md:py-12 print:hidden shadow-xl my-12 animate-fade-in delay-200 rounded-3xl overflow-hidden ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/30 text-white'}`}>
         <div className="text-center px-4">
            <span className={`text-[10px] font-serif uppercase tracking-widest font-extrabold px-3 py-1 rounded-full border ${isLight ? 'bg-slate-100 text-black border-slate-300' : 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/25'}`}>
              🧭 Chronologie de la Terre
            </span>
            <h3 className={`font-serif uppercase tracking-widest text-2xl font-bold text-center mt-3 mb-2 inline-block border-b pb-1.5 ${isLight ? 'text-black border-slate-300' : 'text-[#D4AF37] border-[#D4AF37]/20'}`}>Période de vie & Datation</h3>
         </div>
         <p className={`text-center font-sans italic mb-8 mt-2 px-4 font-semibold ${isLight ? 'text-black' : 'text-slate-300'}`}>
           {fossil.fossilDating ? `Datation : ${fossil.fossilDating}` : "Sélectionnez une époque pour en savoir plus."}
         </p>
         
         <div className="w-full overflow-hidden relative flex flex-col">
          <div className="overflow-x-auto custom-scrollbar flex items-center px-8 pb-8">
             <div className={`flex shadow-2xl border relative min-w-max mx-auto rounded-3xl overflow-hidden animate-fade-in backdrop-blur-sm ${isLight ? 'bg-white border-slate-300' : 'bg-[#060B1A]/95 border-[#D4AF37]/20'}`}>
                 {geologicalEras.slice().reverse().map((era) => (
                    <div key={era.name} className={`flex flex-col border-r-2 border-[#000000] last:border-r-0`}>
                       <div className={`h-12 flex items-center justify-center font-serif font-black text-base md:text-lg uppercase tracking-widest border-b-2 border-[#000000] px-6 ${era.color} text-black drop-shadow-sm`}>
                          {era.name}
                       </div>
                       <div className="flex-1 flex">
                          {era.subPeriods.slice().reverse().map(sub => {
                            const stratIdx = allSubPeriods.indexOf(fossil.detailedPeriodStart || '');
                            const endIdx = fossil.detailedPeriodEnd ? allSubPeriods.indexOf(fossil.detailedPeriodEnd) : stratIdx;
                            
                            const currentIndex = allSubPeriods.indexOf(sub);
                            let isSelected = false;
                            if (stratIdx !== -1 && endIdx !== -1) {
                               const min = Math.min(stratIdx, endIdx);
                               const max = Math.max(stratIdx, endIdx);
                               isSelected = currentIndex >= min && currentIndex <= max;
                            } else if (stratIdx !== -1) {
                               isSelected = currentIndex === stratIdx;
                            }

                            const details = subPeriodsDetails[sub];

                            return (
                               <div 
                                 key={sub} 
                                 onClick={() => setShowPeriodInfo(showPeriodInfo === sub ? null : sub)}
                                 className={`group/item relative min-w-[75px] md:min-w-[90px] p-3 flex flex-col items-center justify-between cursor-pointer border-r border-black/30 last:border-r-0 transition-all duration-300 ${
                                   isSelected 
                                     ? `${era.color} scale-105 z-20 shadow-xl border-x-2 border-black ring-2 ring-black/30`
                                     : (isLight 
                                         ? 'bg-slate-100/90 hover:bg-slate-200/90' 
                                         : 'bg-[#0d1633] hover:bg-[#162248]')
                                 }`}
                                 style={{ height: '210px' }}
                               >
                                 {/* Horizontal connection line thread */}
                                 <div className={`absolute top-1/2 left-0 right-0 h-[2px] z-0 pointer-events-none ${isSelected ? 'bg-black/40' : (isLight ? 'bg-slate-300' : 'bg-slate-700/60')}`} />

                                 {/* Node circle on the thread */}
                                 <div className={`w-3.5 h-3.5 rounded-full border-2 z-10 flex items-center justify-center transition-all duration-300 ${
                                   isSelected 
                                     ? 'bg-black border-2 border-white scale-125 shadow-md ring-2 ring-black/40' 
                                     : (isLight ? 'bg-white border-slate-500 group-hover/item:border-black' : 'bg-[#060B1A] border-slate-400 group-hover/item:border-white group-hover/item:scale-110')
                                 }`} />

                                 {/* Period name vertical text */}
                                 <div className="flex-1 flex items-center justify-center py-4 z-10">
                                   <span 
                                     style={{ writingMode: 'vertical-rl' }} 
                                     className={`rotate-180 font-serif text-xs md:text-sm uppercase tracking-widest transition-all duration-300 leading-none ${
                                       isSelected 
                                         ? 'text-black font-black drop-shadow-sm' 
                                         : (isLight 
                                             ? 'text-slate-800 font-bold group-hover/item:text-black' 
                                             : 'text-slate-200 font-bold group-hover/item:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]')
                                     }`}
                                   >
                                     {sub}
                                   </span>
                                 </div>

                                 {/* Millions of years annotation at the bottom of column */}
                                 <div className="z-10 mt-auto flex flex-col items-center">
                                   <span className={`text-[8px] font-mono tracking-tight font-bold ${
                                     isSelected 
                                       ? 'text-black font-black' 
                                       : (isLight ? 'text-slate-700' : 'text-slate-400 group-hover/item:text-slate-200')
                                   }`}>
                                     {details?.age.split(' ')[0]} Ma
                                   </span>
                                 </div>

                                 {/* Small indicator on active hover */}
                                 {!isSelected && (
                                   <Info size={10} className={`absolute bottom-2 opacity-0 group-hover/item:opacity-70 transition-all ${isLight ? 'text-slate-700' : 'text-slate-300'}`} />
                                 )}
                               </div>
                            )
                          })}
                       </div>
                    </div>
                 ))}
             </div>
          </div>
         </div>

         {/* Period Info Popover */}
         {showPeriodInfo && (
            <div className={`mx-4 md:mx-8 p-6 md:p-8 border-l-4 rounded-r-3xl shadow-2xl mt-6 animate-fade-in relative overflow-hidden ${isLight ? 'bg-white border-black text-black' : 'bg-[#101A36]/80 border-[#D4AF37] text-white'}`}>
              <button 
                onClick={() => setShowPeriodInfo(null)}
                className={`absolute top-4 right-4 text-xs font-serif uppercase tracking-wider hover:scale-105 font-bold ${isLight ? 'text-black hover:text-slate-700' : 'text-slate-400 hover:text-white'}`}
              >
                ✕ Fermer
              </button>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 mb-4 relative z-10 border-slate-200">
                <div>
                  <span className={`text-[10px] font-serif uppercase tracking-widest font-bold ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Fiche Scientifique</span>
                  <h4 className={`font-serif text-2xl md:text-3xl font-black uppercase tracking-widest mt-1 ${isLight ? 'text-black' : 'text-white'}`}>
                    {showPeriodInfo}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${geologicalEras.find(e => e.subPeriods.includes(showPeriodInfo))?.color}`} />
                  <span className={`text-xs font-serif uppercase tracking-widest font-bold ${isLight ? 'text-black' : 'text-slate-300'}`}>
                    Ère {geologicalEras.find(e => e.subPeriods.includes(showPeriodInfo))?.name}
                  </span>
                </div>
              </div>

              {/* Age & Duration details */}
              {subPeriodsDetails[showPeriodInfo] && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border mb-6 relative z-10 ${isLight ? 'bg-slate-50 border-slate-200 text-black' : 'bg-[#060B1A]/60 border-white/5 text-white'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${isLight ? 'bg-slate-200 text-black' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                      <Calendar size={14} />
                    </div>
                    <div>
                      <div className={`text-[9px] font-serif uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Âge géologique</div>
                      <div className={`text-xs font-bold font-sans ${isLight ? 'text-black' : 'text-slate-200'}`}>{subPeriodsDetails[showPeriodInfo].age}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${isLight ? 'bg-slate-200 text-black' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                      <Clock size={14} />
                    </div>
                    <div>
                      <div className={`text-[9px] font-serif uppercase tracking-wider font-bold ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Durée estimée</div>
                      <div className={`text-xs font-bold font-sans ${isLight ? 'text-black' : 'text-slate-200'}`}>{subPeriodsDetails[showPeriodInfo].duration}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main description */}
              <p className={`font-sans text-sm leading-relaxed relative z-10 mb-6 font-medium ${isLight ? 'text-black' : 'text-slate-300'}`}>
                {subPeriodsDetails[showPeriodInfo]?.desc || geologicalEras.find(e => e.subPeriods.includes(showPeriodInfo))?.desc}
              </p>

              {/* Ecosystem & typical fauna */}
              {subPeriodsDetails[showPeriodInfo]?.typicalFauna && (
                <div className={`mb-6 relative z-10 border-t pt-4 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                  <h5 className={`text-[10px] font-serif uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                    <Compass size={12} /> Écosystème & Biodiversité
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {subPeriodsDetails[showPeriodInfo].typicalFauna.map((fauna) => (
                      <span key={fauna} className={`text-xs font-sans px-2.5 py-1 rounded-lg border font-semibold ${isLight ? 'bg-slate-100 text-black border-slate-300' : 'text-slate-300 bg-[#060B1A]/50 border-white/5'}`}>
                        🦕 {fauna}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Science Factoid plaque */}
              {subPeriodsDetails[showPeriodInfo]?.funFact && (
                <div className={`p-4 rounded-2xl border flex gap-3 relative z-10 ${isLight ? 'bg-amber-50 border-amber-300 text-black' : 'bg-[#060B1A]/85 border-[#D4AF37]/20 text-white'}`}>
                  <div className={`p-2 rounded-xl self-start ${isLight ? 'bg-amber-100 text-black' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                     <BookOpen size={14} />
                  </div>
                  <div>
                    <h6 className={`text-[10px] font-serif uppercase tracking-widest font-bold ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Le saviez-vous ?</h6>
                    <p className={`text-xs font-sans mt-1 leading-relaxed italic font-medium ${isLight ? 'text-black' : 'text-slate-300'}`}>
                      "{subPeriodsDetails[showPeriodInfo].funFact}"
                    </p>
                  </div>
                </div>
              )}
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Discovery & Setup */}
        {fossil.discoveryLocation && (
           <div className="space-y-8">
               <div className={`border-2 p-8 text-center rounded-3xl shadow-xl animate-fade-in delay-100 ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/30 text-white'}`}>
                  <h3 className={`font-serif uppercase tracking-widest text-2xl font-bold mb-6 border-b pb-4 inline-block ${isLight ? 'text-black border-slate-300' : 'text-[#D4AF37] border-[#D4AF37]/30'}`}>Lieu et date de découverte</h3>
                  <p className={`font-sans mb-4 font-medium ${isLight ? 'text-black' : 'text-slate-200'}`}>{fossil.discoveryLocation}</p>
                  
                  <div className={`w-full h-48 border rounded-2xl overflow-hidden relative z-0 ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#060B1A] border-[#D4AF37]/20'}`}>
                    <MapErrorBoundary fallbackText="Carte indisponible">
                      <MapContainer center={[fossil.discoveryLat || 46.2276, fossil.discoveryLng || 2.2137]} zoom={fossil.discoveryLat ? 10 : 4} className="w-full h-full" zoomControl={true} dragging={true} scrollWheelZoom={true}>
                        <ChangeView lat={fossil.discoveryLat || 46.2276} lng={fossil.discoveryLng || 2.2137} zoom={fossil.discoveryLat ? 10 : 4} />
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <LocationMarker lat={fossil.discoveryLat} lng={fossil.discoveryLng} setLat={()=>{}} setLng={()=>{}} readOnly={true} />
                      </MapContainer>
                    </MapErrorBoundary>
                  </div>
               </div>
           </div>
        )}

        {/* Species */}
        {(fossil.animalOrigin || fossil.alimentation || fossil.speciesImages?.length || fossil.animalImage) ? (
           <div className={`border-2 p-8 text-center rounded-3xl shadow-xl animate-fade-in delay-200 ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/30 text-white'}`}>
              <h3 className={`font-serif uppercase tracking-widest text-2xl font-bold mb-6 border-b pb-4 inline-block ${isLight ? 'text-black border-slate-300' : 'text-[#D4AF37] border-[#D4AF37]/30'}`}>
                Espèce {fossil.speciesType === 'vegetal' ? 'Végétale' : 'Animale'}
              </h3>
              
              {fossil.animalOrigin && (
                <p className={`font-sans mb-6 whitespace-pre-wrap leading-relaxed border-b pb-6 font-medium ${isLight ? 'text-black border-slate-200' : 'text-slate-200 border-[#D4AF37]/20'}`}>{fossil.animalOrigin}</p>
              )}
              
              {fossil.speciesType !== 'vegetal' && (fossil.alimentation || fossil.speciesSize) && (
                <div className={`grid grid-cols-2 gap-4 mb-6 border-b pb-6 text-left ${isLight ? 'border-slate-200' : 'border-[#D4AF37]/20'}`}>
                  {fossil.alimentation && (
                    <div>
                      <h4 className={`font-serif uppercase tracking-widest text-xs mb-2 font-bold ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Alimentation</h4>
                      <p className={`font-sans text-sm whitespace-pre-wrap font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{fossil.alimentation}</p>
                    </div>
                  )}
                  {fossil.speciesSize && (
                    <div>
                      <h4 className={`font-serif uppercase tracking-widest text-xs mb-2 font-bold ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Taille</h4>
                      <p className={`font-sans text-sm font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{fossil.speciesSize}</p>
                    </div>
                  )}
                </div>
              )}

              {(fossil.speciesImages && fossil.speciesImages.length > 0) || fossil.animalImage ? (
                 <div className={`flex gap-4 overflow-x-auto pb-4 snap-x border p-2 rounded-2xl ${isLight ? 'border-slate-200 bg-slate-50' : 'border-[#D4AF37]/20 bg-[#060B1A]/50'}`}>
                   {fossil.animalImage && (!fossil.speciesImages || fossil.speciesImages.length === 0) && (
                      <div className={`border shadow-md shrink-0 w-64 snap-center mx-auto rounded-xl p-1 overflow-hidden ${isLight ? 'border-slate-300 bg-white' : 'border-[#D4AF37]/30 bg-[#060B1A]'}`}>
                         <img src={fossil.animalImage} alt="Espèce" className="w-full h-48 object-contain cursor-pointer transition-transform hover:scale-105" onClick={() => setEnlargedImage(fossil.animalImage)} />
                      </div>
                   )}
                   {fossil.speciesImages && fossil.speciesImages.map((img, i) => (
                      <div key={i} className={`border shadow-md shrink-0 w-64 snap-center rounded-xl p-1 overflow-hidden ${isLight ? 'border-slate-300 bg-white' : 'border-[#D4AF37]/30 bg-[#060B1A]'}`}>
                         <img src={img} alt="Espèce" className="w-full h-48 object-contain cursor-pointer transition-transform hover:scale-105" onClick={() => setEnlargedImage(img)} />
                      </div>
                   ))}
                 </div>
              ) : null}
           </div>
        ) : null}
      </div>

     {(techSheet.dateAchat || techSheet.lieuAchat || techSheet.prix || techSheet.certificat || techSheet.typeSheet === 'prelevement') && (
        <div className={`border-2 p-8 mt-8 rounded-3xl shadow-xl animate-fade-in delay-300 print:break-inside-avoid ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/60 border-[#D4AF37]/30 text-white'}`}>
           <div className="text-center">
             <h3 className={`font-serif uppercase tracking-widest text-2xl font-bold mb-6 border-b pb-4 inline-block ${isLight ? 'text-black border-slate-300' : 'text-[#D4AF37] border-[#D4AF37]/30'}`}>
               {techSheet.typeSheet === 'prelevement' ? 'Fiche Technique : Prélèvement' : 'Fiche Technique : Achat'}
             </h3>
           </div>
           
           {techSheet.typeSheet === 'prelevement' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4 text-left">
                  <p className={`font-sans border-b pb-2 font-medium ${isLight ? 'text-black border-slate-200' : 'text-slate-200 border-[#D4AF37]/15'}`}>
                    <span className={`font-bold mr-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Type :</span> Prélèvement (Découverte de terrain)
                  </p>
                  <p className={`font-sans border-b pb-2 font-medium ${isLight ? 'text-black border-slate-200' : 'text-slate-200 border-[#D4AF37]/15'}`}>
                    <span className={`font-bold mr-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Date de découverte :</span> {techSheet.datePrelevement || 'Non précisée'}
                  </p>
                  <p className={`font-sans border-b pb-2 font-medium ${isLight ? 'text-black border-slate-200' : 'text-slate-200 border-[#D4AF37]/15'}`}>
                    <span className={`font-bold mr-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Lieu précis :</span> {techSheet.lieuPrelevement || 'Non précisé'}
                  </p>
               </div>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 text-left">
                   {techSheet.dateAchat && (
                     <p className={`font-sans border-b pb-2 font-medium ${isLight ? 'text-black border-slate-200' : 'text-slate-200 border-[#D4AF37]/15'}`}><span className={`font-bold mr-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Date d'achat:</span> {techSheet.dateAchat}</p>
                   )}
                   {techSheet.lieuAchat && (
                     <p className={`font-sans border-b pb-2 font-medium ${isLight ? 'text-black border-slate-200' : 'text-slate-200 border-[#D4AF37]/15'}`}><span className={`font-bold mr-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Lieu d'achat:</span> {techSheet.lieuAchat}</p>
                   )}
                   {techSheet.prix ? (
                     <p className={`font-sans border-b pb-2 font-medium ${isLight ? 'text-black border-slate-200' : 'text-slate-200 border-[#D4AF37]/15'}`}><span className={`font-bold mr-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Prix d'achat:</span> {techSheet.prix} €</p>
                   ) : null}
                   {techSheet.certificat && (
                     <p className={`font-sans border-b pb-2 font-medium ${isLight ? 'text-black border-slate-200' : 'text-slate-200 border-[#D4AF37]/15'}`}><span className={`font-bold mr-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Certificat d'authenticité:</span> {techSheet.certificat === 'oui' ? 'Oui' : 'Non'}</p>
                   )}
                </div>
                {techSheet.certificat === 'oui' && techSheet.certificatPhoto && (
                   <div className="flex justify-center md:justify-end">
                      <img 
                         src={techSheet.certificatPhoto} 
                         alt="Certificat" 
                         className={`max-w-xs max-h-48 object-contain cursor-pointer border rounded-xl shadow-md transition-transform hover:scale-105 ${isLight ? 'border-slate-300' : 'border-[#D4AF37]/30'}`} 
                         onClick={() => setEnlargedImage(techSheet.certificatPhoto!)}
                      />
                   </div>
                )}
             </div>
           )}
        </div>
     )}

    </div>
  );

  return (
    <div className={`flex flex-col min-h-screen font-sans transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0] text-black' : 'bg-[#060B1A] bg-texture text-white'}`}>
      <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-50 print:hidden backdrop-blur-md transition-colors ${isLight ? 'bg-[#F7F5F0]/95 border-slate-200 text-black' : 'bg-[#060B1A]/95 border-[#D4AF37]/20 text-white'}`}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className={`p-2 hover:scale-110 active:scale-95 transition-all ${isLight ? 'text-black hover:text-[#D4AF37]' : 'text-slate-300 hover:text-[#D4AF37]'}`}><ChevronLeft size={24} /></button>
          <button onClick={onHome} className={`p-2 hover:scale-110 active:scale-95 transition-all ${isLight ? 'text-black hover:text-[#D4AF37]' : 'text-slate-300 hover:text-[#D4AF37]'}`}><Home size={24} /></button>
        </div>
        <div className="flex items-center gap-4">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className={`p-2 border rounded-xl transition-all ${isLight ? 'border-slate-300 text-black hover:bg-slate-100' : 'border-[#D4AF37]/40 text-white hover:border-[#D4AF37] hover:bg-[#101A36]'}`} title="Éditer">
              <Edit2 size={20} />
            </button>
          ) : (
            <button onClick={() => setIsEditing(false)} className={`p-2 border rounded-xl transition-all ${isLight ? 'border-slate-300 text-black hover:bg-slate-100' : 'border-[#D4AF37]/40 text-white hover:border-[#D4AF37] hover:bg-[#101A36]'}`} title="Aperçu">
              <Eye size={20} />
            </button>
          )}

          {existingFossil && onDelete && (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 border border-red-500/40 rounded-xl text-red-500 hover:border-red-500 hover:bg-red-950/20 transition-all" title="Supprimer">
              <Trash2 size={20} />
            </button>
          )}

          <button onClick={handleSave} className={`p-2 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all ${isLight ? 'bg-black text-white hover:bg-slate-800' : 'bg-[#D4AF37] text-[#060B1A] hover:bg-[#FFD700]'}`} title="Enregistrer">
            <Save size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 print:p-0 print:bg-white print:text-black overflow-y-auto" ref={printRef}>
        {isEditing ? renderEditMode() : renderViewMode()}

        <div className="max-w-4xl mx-auto flex justify-center gap-4 mt-12 print:hidden relative z-10 pb-8">
          <button onClick={handlePrint} className={`flex items-center gap-2 px-8 py-3 border text-sm rounded-xl uppercase tracking-widest font-serif font-bold transition-all ${isLight ? 'border-slate-300 text-black hover:bg-slate-100' : 'border-[#D4AF37]/35 text-white hover:bg-[#101A36] hover:border-[#D4AF37]'}`}>
            <Printer size={16} /> Imprimer
          </button>
          <button onClick={onBack} className={`flex items-center gap-2 px-8 py-3 border text-sm rounded-xl uppercase tracking-widest font-serif font-bold transition-all ${isLight ? 'border-slate-300 text-black hover:bg-slate-100' : 'border-[#D4AF37]/35 text-white hover:bg-[#101A36] hover:border-[#D4AF37]'}`}>
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
      </div>
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`border-2 border-red-500/30 p-8 max-w-sm w-full rounded-2xl shadow-2xl ${isLight ? 'bg-white text-black' : 'bg-[#101A36] text-white'}`}>
            <h3 className="font-serif text-xl font-bold mb-4 text-red-500">Supprimer le fossile</h3>
            <p className={`font-sans mb-8 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Êtes-vous sûr de vouloir supprimer ce fossile ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border border-slate-400 text-slate-700 hover:border-slate-600 rounded-xl transition-all font-sans uppercase tracking-wider text-xs font-bold">
                Annuler
              </button>
              <button onClick={() => onDelete!(existingFossil!.id)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-all font-sans uppercase tracking-wider text-xs font-bold">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {enlargedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out flex-col" onClick={() => setEnlargedImage(null)}>
          <img src={enlargedImage} alt="Visuel" className="max-w-full max-h-full object-contain" />
          <p className="text-white mt-4 font-sans text-sm tracking-widest">Cliquez n'importe où pour fermer</p>
        </div>
      )}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1.5cm; }
          body { -webkit-print-color-adjust: exact; background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
