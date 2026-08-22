import React, { useState, useRef, useEffect } from 'react';
import { Fossil, Period, TechnicalSheet } from '../types';
import ImageUpload from '../components/ImageUpload';
import { ChevronLeft, Home, Printer, Plus, Trash2, Edit2, Info, ArrowLeft, Save, Eye, Sparkles, Calendar, Compass, Clock, BookOpen, Layers } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { geologicalEras, allSubPeriods, subPeriodsDetails } from '../geology';
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

const LocationMarker = ({ lat, lng, setLat, setLng, readOnly }: { lat?: number, lng?: number, setLat: (l: number) => void, setLng: (l: number) => void, readOnly?: boolean }) => {
  useMapEvents({
    click(e) {
      if (!readOnly) {
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
      }
    },
  });
  return lat && lng ? (
    <Marker position={[lat, lng]} />
  ) : null;
};

const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

interface FossilFormViewProps {
  period: Period;
  existingFossil: Fossil | null;
  onSave: (f: Fossil) => void;
  onBack: () => void;
  onHome: () => void;
  onDelete?: (id: string) => void;
}

export default function FossilFormView({ period, existingFossil, onSave, onBack, onHome, onDelete }: FossilFormViewProps) {
  const [isEditing, setIsEditing] = useState<boolean>(!existingFossil);
  const [showPeriodInfo, setShowPeriodInfo] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [techSheet, setTechSheet] = useState<Partial<TechnicalSheet>>({
    typeSheet: 'achat',
    dateAchat: '',
    lieuAchat: '',
    certificat: '',
    certificatPhoto: '',
    prix: 0,
    datePrelevement: '',
    lieuPrelevement: ''
  });

  useEffect(() => {
    if (existingFossil) {
      getSheets().then(sheets => {
        const sheet = sheets.find(s => s.id === existingFossil.id);
        if (sheet) {
          setTechSheet(sheet);
        }
      });
    }
  }, [existingFossil]);

  const updateTechSheet = (field: keyof TechnicalSheet, value: any) => {
    setTechSheet(prev => ({ ...prev, [field]: value }));
  };

  const [fossil, setFossil] = useState<Fossil>(existingFossil || {
    id: uuidv4(),
    period: period,
    carouselImage: '',
    title: '',
    mainImage: '',
    reference: '',
    description: '',
    descriptionImages: [],
    discoveryLocation: '',
    discoveryLat: undefined,
    discoveryLng: undefined,
    animalOrigin: '',
    animalImage: '',
    alimentation: '',
    speciesType: 'animal',
    speciesImages: [],
    speciesSize: '',
    fossilDating: '',
    didYouKnowText: '',
    didYouKnowImage: ''
  });

  const printRef = useRef<HTMLDivElement>(null);

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<string | null>(null);

  useEffect(() => {
    if (fossil && fossil.id) {
      import('../store').then(({ saveLastActiveFossilId }) => {
        saveLastActiveFossilId(fossil.id);
      });
    }
  }, [fossil.id]);

  const handleGeocode = async (text: string) => {
    if (!text || !text.trim()) return;
    
    // Clean up typical entries (e.g. "Shark Bay, Australie" -> "Shark Bay, Australie")
    // Split by common non-address indicators like dates, collection info, bracketed comments
    const cleanedText = text.replace(/(trouvé|découvert|achat|coll|ref|date|an|le\s+\d).*$/i, '').trim();
    const query = cleanedText.split(/[\n,;-\d]/)[0].trim() || cleanedText || text.trim();
    if (!query || query.length < 2) return;

    setIsGeocoding(true);
    setGeocodeStatus("Recherche du lieu sur la carte...");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'User-Agent': 'FossilCollectorApp/1.0 (contact: fabien.piazza@hotmail.fr)'
          }
        }
      );
      
      if (!response.ok) throw new Error("Erreur réseau");
      const results = await response.json();
      
      if (results && results.length > 0) {
        const item = results[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        
        update('discoveryLat', lat);
        update('discoveryLng', lng);
        
        const shortName = item.display_name.split(',').slice(0, 2).join(', ');
        setGeocodeStatus(`📍 Carte centrée sur : ${shortName}`);
      } else {
        // Fallback to searching the original text
        const secondResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text.trim())}&limit=1`,
          {
            headers: {
              'User-Agent': 'FossilCollectorApp/1.0 (contact: fabien.piazza@hotmail.fr)'
            }
          }
        );
        const secondResults = await secondResponse.json();
        if (secondResults && secondResults.length > 0) {
          const item = secondResults[0];
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          update('discoveryLat', lat);
          update('discoveryLng', lng);
          const shortName = item.display_name.split(',').slice(0, 2).join(', ');
          setGeocodeStatus(`📍 Carte centrée sur : ${shortName}`);
        } else {
          setGeocodeStatus("⚠️ Lieu introuvable sur la carte");
        }
      }
    } catch (e) {
      console.error(e);
      setGeocodeStatus("⚠️ Problème de connexion pour la recherche");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const update = (field: keyof Fossil, value: any) => {
    setFossil(prev => ({ ...prev, [field]: value }));
  };

  const addDescriptionImage = (img: string) => {
    if (fossil.descriptionImages.length < 6) {
      update('descriptionImages', [...fossil.descriptionImages, img]);
    }
  };

  const removeDescriptionImage = (index: number) => {
    const newImages = [...fossil.descriptionImages];
    newImages.splice(index, 1);
    update('descriptionImages', newImages);
  };

  const addSpeciesImage = (img: string) => {
    const images = fossil.speciesImages || [];
    update('speciesImages', [...images, img]);
  };

  const handleSave = async () => {
    const sheets = await getSheets();
    const existingIndex = sheets.findIndex(s => s.id === fossil.id);
    
    const updatedSheet: TechnicalSheet = {
      id: fossil.id,
      nom: fossil.title,
      nomPhoto: fossil.carouselImage || fossil.mainImage,
      provenance: fossil.discoveryLocation,
      periode: fossil.period,
      fossilDating: fossil.fossilDating || '',
      typeSheet: techSheet.typeSheet || 'achat',
      dateAchat: techSheet.typeSheet === 'prelevement' ? '' : (techSheet.dateAchat || ''),
      lieuAchat: techSheet.typeSheet === 'prelevement' ? '' : (techSheet.lieuAchat || ''),
      certificat: techSheet.typeSheet === 'prelevement' ? '' : (techSheet.certificat || ''),
      certificatPhoto: techSheet.typeSheet === 'prelevement' ? '' : (techSheet.certificatPhoto || ''),
      prix: techSheet.typeSheet === 'prelevement' ? 0 : (techSheet.prix || 0),
      datePrelevement: techSheet.typeSheet === 'prelevement' ? (techSheet.datePrelevement || '') : '',
      lieuPrelevement: techSheet.typeSheet === 'prelevement' ? (techSheet.lieuPrelevement || '') : ''
    };
    
    if (existingIndex >= 0) {
      sheets[existingIndex] = updatedSheet;
    } else {
      sheets.push(updatedSheet);
    }
    await saveSheets(sheets);
    
    onSave(fossil);
    setIsEditing(false);
  };

  const removeSpeciesImage = (index: number) => {
    const images = [...(fossil.speciesImages || [])];
    images.splice(index, 1);
    update('speciesImages', images);
  };

  const renderEditMode = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-[#101A36]/60 border border-[#D4AF37]/25 p-4 rounded-2xl shadow-xl">
        <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Image du carrousel</label>
        <ImageUpload 
          value={fossil.carouselImage} 
          onChange={val => update('carouselImage', val)} 
          className="h-32 w-32 object-contain"
        />
      </div>

      <div className="border border-[#D4AF37]/25 p-6 md:p-8 bg-[#101A36]/60 rounded-3xl shadow-xl">
        <input 
          type="text" 
          value={fossil.title}
          onChange={e => update('title', e.target.value)}
          placeholder="Titre du fossile"
          className="w-full text-3xl font-serif border-b border-[#D4AF37]/30 focus:border-[#D4AF37] focus:outline-none mb-6 p-2 bg-transparent text-white placeholder-slate-500"
        />

        <ImageUpload 
          value={fossil.mainImage} 
          onChange={val => update('mainImage', val)} 
          className="w-full h-64 md:h-96 mb-4 object-contain"
        />

        <input 
           type="text"
           value={fossil.reference}
           onChange={e => update('reference', e.target.value)}
           placeholder="Référence (ex: FOS-001)"
           className="w-full max-w-sm p-3 border border-[#D4AF37]/25 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans"
        />
      </div>

      <div className="border border-[#D4AF37]/25 p-6 md:p-8 bg-[#101A36]/60 rounded-3xl shadow-xl">
        <h3 className="text-lg md:text-xl font-serif font-bold mb-6 uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37]/30 pb-2 inline-block">Description du fossile</h3>
        <textarea
          value={fossil.description}
          onChange={e => update('description', e.target.value)}
          className="w-full p-4 border border-[#D4AF37]/25 min-h-[120px] mb-4 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans resize-y"
        />
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {fossil.descriptionImages.map((img, i) => (
            <div key={i} className="relative shrink-0 border border-[#D4AF37]/20 bg-[#060B1A]/50 rounded-xl overflow-hidden p-1">
              <img src={img} alt="" className="w-24 h-24 object-contain" />
              <button onClick={() => removeDescriptionImage(i)} className="absolute -top-2 -right-2 bg-red-800 text-white p-1 hover:bg-red-700 transition-colors rounded-full">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {fossil.descriptionImages.length < 6 && (
            <div className="w-26 h-26 shrink-0 border border-dashed border-[#D4AF37]/45 rounded-xl p-1 hover:bg-white/10 transition-all cursor-pointer">
              <ImageUpload value="" onChange={addDescriptionImage} className="w-24 h-24 object-contain" icon={<Plus className="text-[#D4AF37]" />} />
            </div>
          )}
        </div>
      </div>

      <div className="border border-[#D4AF37]/25 p-6 md:p-8 bg-[#101A36]/60 rounded-3xl shadow-xl">
         <h3 className="text-lg md:text-xl font-serif font-bold mb-6 uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37]/30 pb-2 inline-block">Datation (Echelle des temps)</h3>
         <input 
            type="text" 
            value={fossil.fossilDating}
            onChange={e => update('fossilDating', e.target.value)}
            placeholder="Ex: -150 Millions d'années"
            className="w-full p-3 mb-4 border border-[#D4AF37]/25 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans placeholder-slate-500"
         />
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Période de début</label>
              <select 
                value={fossil.detailedPeriodStart || ''} 
                onChange={e => update('detailedPeriodStart', e.target.value)}
                className="w-full p-3 border border-[#D4AF37]/25 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans"
              >
                <option value="" className="bg-[#101A36] text-slate-400">Sélectionner...</option>
                {allSubPeriods.map(p => <option key={p} value={p} className="bg-[#101A36] text-white">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Période de fin (Optionnel)</label>
              <select 
                value={fossil.detailedPeriodEnd || ''} 
                onChange={e => update('detailedPeriodEnd', e.target.value)}
                className="w-full p-3 border border-[#D4AF37]/25 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans"
              >
                <option value="" className="bg-[#101A36] text-slate-400">Sélectionner...</option>
                {allSubPeriods.map(p => <option key={p} value={p} className="bg-[#101A36] text-white">{p}</option>)}
              </select>
            </div>
         </div>
      </div>

      <div className="border border-[#D4AF37]/25 p-6 md:p-8 bg-[#101A36]/60 rounded-3xl shadow-xl flex flex-col gap-4">
        <h3 className="text-lg md:text-xl font-serif font-bold mb-6 uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37]/30 pb-2 inline-block">Lieu et date de découverte</h3>
        <textarea
          value={fossil.discoveryLocation}
          onChange={e => update('discoveryLocation', e.target.value)}
          onBlur={e => handleGeocode(e.target.value)}
          className="w-full p-4 border border-[#D4AF37]/25 min-h-[80px] focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans resize-y placeholder-slate-500"
          placeholder="Nom du lieu (ex: Millau, Aveyron, France) et autres détails..."
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => handleGeocode(fossil.discoveryLocation)}
            disabled={isGeocoding || !fossil.discoveryLocation.trim()}
            className="px-4 py-2 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 text-[#D4AF37] font-serif uppercase tracking-widest text-xs font-bold rounded-xl border border-[#D4AF37]/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGeocoding ? (
              <>
                <span className="animate-spin inline-block w-3 h-3 border-2 border-[#D4AF37] border-t-transparent rounded-full"></span>
                Localisation en cours...
              </>
            ) : "🔍 Pointer sur la carte automatiquement"}
          </button>
          {geocodeStatus && (
            <span className={`text-xs font-sans italic ${geocodeStatus.includes('⚠️') ? 'text-red-400' : 'text-emerald-400'}`}>
              {geocodeStatus}
            </span>
          )}
        </div>
        <div className="h-64 w-full bg-[#060B1A] border border-[#D4AF37]/25 rounded-2xl overflow-hidden relative z-0">
          <MapContainer center={[fossil.discoveryLat || 46.2276, fossil.discoveryLng || 2.2137]} zoom={fossil.discoveryLat ? 10 : 4} className="w-full h-full">
            <ChangeView center={[fossil.discoveryLat || 46.2276, fossil.discoveryLng || 2.2137]} zoom={fossil.discoveryLat ? 10 : 4} />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationMarker 
              lat={fossil.discoveryLat} 
              lng={fossil.discoveryLng} 
              setLat={(lat) => update('discoveryLat', lat)} 
              setLng={(lng) => update('discoveryLng', lng)} 
            />
          </MapContainer>
        </div>
        <p className="text-xs text-slate-400 italic">Cliquez sur la carte pour définir le point exact de la découverte s'il n'est pas déjà pointé.</p>
      </div>

      <div className="border border-[#D4AF37]/25 p-6 md:p-8 bg-[#101A36]/60 rounded-3xl shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-[#D4AF37]/30 pb-4">
          <h3 className="text-lg md:text-xl font-serif font-bold uppercase tracking-widest text-[#D4AF37]">Espèce</h3>
          <div className="flex mt-4 sm:mt-0 border border-[#D4AF37]/25 rounded-xl overflow-hidden">
            <button
              className={`px-4 py-2 font-serif uppercase tracking-widest text-xs transition-colors ${fossil.speciesType === 'animal' || !fossil.speciesType ? 'bg-[#D4AF37] text-[#060B1A] font-bold' : 'bg-transparent text-slate-300 hover:bg-white/10'}`}
              onClick={() => update('speciesType', 'animal')}
            >
              Animale
            </button>
            <button
              className={`px-4 py-2 font-serif uppercase tracking-widest text-xs transition-colors ${fossil.speciesType === 'vegetal' ? 'bg-[#D4AF37] text-[#060B1A] font-bold' : 'bg-transparent text-slate-300 hover:bg-white/10'}`}
              onClick={() => update('speciesType', 'vegetal')}
            >
              Végétale
            </button>
          </div>
        </div>

        <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Description</label>
        <textarea
          value={fossil.animalOrigin}
          onChange={e => update('animalOrigin', e.target.value)}
          className="w-full p-4 border border-[#D4AF37]/25 min-h-[80px] mb-6 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans resize-y"
        />

        {fossil.speciesType !== 'vegetal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Alimentation</label>
              <textarea
                value={fossil.alimentation}
                onChange={e => update('alimentation', e.target.value)}
                className="w-full p-4 border border-[#D4AF37]/25 min-h-[80px] focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Taille</label>
              <input
                type="text"
                value={fossil.speciesSize || ''}
                onChange={e => update('speciesSize', e.target.value)}
                className="w-full p-4 border border-[#D4AF37]/25 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans"
              />
            </div>
          </div>
        )}

        <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Photos (Carrousel)</label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {fossil.animalImage && !(fossil.speciesImages?.length) && (
            <div className="relative shrink-0 border border-[#D4AF37]/20 bg-[#060B1A]/50 rounded-xl overflow-hidden p-1">
              <img src={fossil.animalImage} alt="" className="w-24 h-24 object-contain" />
              <button onClick={() => update('animalImage', '')} className="absolute -top-2 -right-2 bg-red-800 text-white p-1 hover:bg-red-700 transition-colors rounded-full">
                <Trash2 size={12} />
              </button>
            </div>
          )}
          {(fossil.speciesImages || []).map((img, i) => (
            <div key={i} className="relative shrink-0 border border-[#D4AF37]/20 bg-[#060B1A]/50 rounded-xl overflow-hidden p-1">
              <img src={img} alt="" className="w-24 h-24 object-contain" />
              <button onClick={() => removeSpeciesImage(i)} className="absolute -top-2 -right-2 bg-red-800 text-white p-1 hover:bg-red-700 transition-colors rounded-full">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="w-26 h-26 shrink-0 border border-dashed border-[#D4AF37]/45 rounded-xl p-1 hover:bg-white/10 transition-all cursor-pointer">
            <ImageUpload value="" onChange={addSpeciesImage} className="w-24 h-24 object-contain" icon={<Plus className="text-[#D4AF37]" />} />
          </div>
        </div>
      </div>

      <div className="border border-[#D4AF37]/25 p-6 md:p-8 bg-[#101A36]/60 rounded-3xl shadow-xl">
        <h3 className="text-lg md:text-xl font-serif font-bold mb-6 uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37]/30 pb-2 inline-block">Informations Fiche Technique</h3>
        <p className="text-sm font-sans text-slate-300 mb-6 italic">Ces informations seront automatiquement ajoutées au tableau dans l'onglet "Fiches Techniques".</p>
        
        {/* Choice of sheet type */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center border-b border-[#D4AF37]/25 pb-4">
          <span className="block text-sm font-serif uppercase tracking-widest text-slate-300 font-semibold">Type de fiche technique :</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer font-sans text-sm text-slate-200 bg-[#060B1A]/80 px-4 py-2 rounded-xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/45 transition-colors">
              <input 
                type="radio" 
                checked={(techSheet.typeSheet || 'achat') === 'achat'} 
                onChange={() => updateTechSheet('typeSheet', 'achat')} 
                className="accent-[#D4AF37] w-4 h-4" 
              /> 
              <span className="font-semibold text-white">💰 Fiche d'Achat</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-sans text-sm text-slate-200 bg-[#060B1A]/80 px-4 py-2 rounded-xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/45 transition-colors">
              <input 
                type="radio" 
                checked={techSheet.typeSheet === 'prelevement'} 
                onChange={() => {
                  updateTechSheet('typeSheet', 'prelevement');
                  if (!techSheet.lieuPrelevement) {
                    updateTechSheet('lieuPrelevement', fossil.discoveryLocation);
                  }
                }} 
                className="accent-[#D4AF37] w-4 h-4" 
              /> 
              <span className="font-semibold text-white">⛏️ Fiche de Prélèvement</span>
            </label>
          </div>
        </div>

        {(techSheet.typeSheet || 'achat') === 'prelevement' ? (
          // Fiche prelevement edit
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4 animate-fade-in">
            <div>
              <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Date de découverte / prélèvement</label>
              <input 
                type="text"
                value={techSheet.datePrelevement || ''}
                onChange={e => updateTechSheet('datePrelevement', e.target.value)}
                className="w-full p-3 border border-[#D4AF37]/25 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans placeholder-slate-500"
                placeholder="Ex: Printemps 2018, ou 15/06/2021"
              />
            </div>
            <div>
              <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Lieu précis de prélèvement</label>
              <input 
                type="text"
                value={techSheet.lieuPrelevement || ''}
                onChange={e => updateTechSheet('lieuPrelevement', e.target.value)}
                className="w-full p-3 border border-[#D4AF37]/25 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans placeholder-slate-500"
                placeholder="Ex: Carrière de calcaire, Millau"
              />
            </div>
          </div>
        ) : (
          // Fiche achat edit (current structure)
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
              <div>
                <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Date d'achat</label>
                <input 
                  type="text"
                  value={techSheet.dateAchat || ''}
                  onChange={e => updateTechSheet('dateAchat', e.target.value)}
                  className="w-full p-3 border border-[#D4AF37]/25 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans placeholder-slate-500"
                  placeholder="Ex: 12/05/2023"
                />
              </div>
              <div>
                <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Lieu d'achat</label>
                <input 
                  type="text"
                  value={techSheet.lieuAchat || ''}
                  onChange={e => updateTechSheet('lieuAchat', e.target.value)}
                  className="w-full p-3 border border-[#D4AF37]/25 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans placeholder-slate-500"
                  placeholder="Ex: Bourse aux minéraux de Paris"
                />
              </div>
              <div>
                <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Prix d'achat (€)</label>
                <input 
                  type="number"
                  value={techSheet.prix || ''}
                  onChange={e => updateTechSheet('prix', Number(e.target.value))}
                  className="w-full p-3 border border-[#D4AF37]/25 focus:outline-none focus:border-[#D4AF37] bg-[#060B1A]/70 text-white rounded-xl font-sans placeholder-slate-500"
                  placeholder="Ex: 150"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Certificat d'authenticité</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-sans text-sm text-slate-200">
                  <input type="radio" checked={techSheet.certificat === 'oui'} onChange={() => updateTechSheet('certificat', 'oui')} className="accent-[#D4AF37] w-4 h-4" /> 
                  <span>Oui</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-sans text-sm text-slate-200">
                  <input type="radio" checked={techSheet.certificat === 'non'} onChange={() => updateTechSheet('certificat', 'non')} className="accent-[#D4AF37] w-4 h-4" /> 
                  <span>Non</span>
                </label>
              </div>
            </div>
            
            {techSheet.certificat === 'oui' && (
              <div>
                <label className="block text-sm font-serif mb-2 uppercase tracking-widest text-slate-300 font-semibold">Photo du certificat</label>
                <div className="w-full max-w-sm">
                   <ImageUpload 
                     value={techSheet.certificatPhoto || ''} 
                     onChange={val => updateTechSheet('certificatPhoto', val)}
                     className="w-full h-48 object-contain"
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
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-[#D4AF37] uppercase tracking-widest break-words whitespace-normal px-2 font-bold drop-shadow-md">
          {fossil.title || 'Sans titre'}
        </h1>
        {fossil.reference && (
          <p className="text-sm font-sans text-slate-400 tracking-widest uppercase">
            Réf: {fossil.reference}
          </p>
        )}
      </div>

      {fossil.mainImage && (
        <div className="border-2 border-[#D4AF37]/30 rounded-3xl overflow-hidden p-2 bg-[#101A36]/50 shadow-2xl">
          <img src={fossil.mainImage} alt={fossil.title} className="w-full max-h-[800px] object-contain cursor-pointer rounded-2xl" onClick={() => setEnlargedImage(fossil.mainImage)} />
        </div>
      )}

      {/* Main Description */}
      {fossil.description && (
        <div className="border-2 border-[#D4AF37]/30 p-8 md:p-12 relative bg-[#101A36]/60 rounded-3xl mt-12 shadow-xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#101A36] px-8 py-2 border-x-2 border-b-2 border-t-2 sm:border-t-0 border-[#D4AF37]/30 rounded-b-2xl shadow-md">
             <span className="font-serif uppercase tracking-widest text-[#D4AF37] text-xl sm:text-2xl font-bold">Description</span>
          </div>
          <p className="font-sans text-lg text-white/95 leading-relaxed whitespace-pre-wrap mt-6">
            {fossil.description}
          </p>
          {fossil.descriptionImages.length > 0 && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {fossil.descriptionImages.map((img, i) => (
                <div key={i} className="border border-[#D4AF37]/20 p-1 shadow-md bg-[#060B1A] rounded-xl overflow-hidden">
                  <img src={img} alt="" className="w-full h-32 object-contain cursor-pointer hover:scale-105 transition-all" onClick={() => setEnlargedImage(img)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timescale Widget */}
      <div className="border-2 border-[#D4AF37]/30 py-8 md:py-12 bg-[#101A36]/60 print:hidden shadow-xl my-12 animate-fade-in delay-200 rounded-3xl overflow-hidden">
         <div className="text-center px-4">
            <span className="text-[10px] font-serif uppercase tracking-widest text-[#D4AF37] font-extrabold bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/25">
              🧭 Chronologie de la Terre
            </span>
            <h3 className="font-serif uppercase tracking-widest text-[#D4AF37] text-2xl font-bold text-center mt-3 mb-2 inline-block border-b border-[#D4AF37]/20 pb-1.5">Période de vie & Datation</h3>
         </div>
         <p className="text-center font-sans italic text-slate-300 mb-8 mt-2 px-4">
           {fossil.fossilDating ? `Datation : ${fossil.fossilDating}` : "Sélectionnez une époque pour en savoir plus."}
         </p>
         
         <div className="w-full overflow-hidden relative flex flex-col">
          <div className="overflow-x-auto custom-scrollbar flex items-center px-8 pb-8">
             <div className="flex shadow-2xl border border-[#D4AF37]/20 bg-[#060B1A]/95 relative min-w-max mx-auto rounded-3xl overflow-hidden animate-fade-in backdrop-blur-sm">
                 {geologicalEras.slice().reverse().map((era) => (
                    <div key={era.name} className={`flex flex-col border-r-2 border-[#000000] last:border-r-0`}>
                       <div className={`h-12 flex items-center justify-center font-serif font-black text-base md:text-lg uppercase tracking-widest border-b-2 border-[#000000] px-6 ${era.color} ${era.textColor} drop-shadow-sm`}>
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
                                 className={`group/item relative min-w-[75px] md:min-w-[90px] p-3 flex flex-col items-center justify-between cursor-pointer border-r border-[#000000]/30 last:border-r-0 transition-all duration-300 ${
                                   isSelected 
                                     ? 'bg-gradient-to-b from-[#D4AF37]/20 via-[#D4AF37]/05 to-[#060B1A] border-t-2 border-b-2 border-[#D4AF37] scale-105 z-10 shadow-[inset_0_0_12px_rgba(212,175,55,0.1),0_4px_20px_rgba(212,175,55,0.08)]' 
                                     : `${era.color} bg-opacity-5 hover:bg-opacity-20 ${era.textColor} hover:text-white transition-colors`
                                 }`}
                                 style={{ height: '210px' }}
                               >
                                 {/* Horizontal connection line thread */}
                                 <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-800/40 z-0 pointer-events-none" />

                                 {/* Node circle on the thread */}
                                 <div className={`w-3.5 h-3.5 rounded-full border-2 z-10 flex items-center justify-center transition-all duration-300 ${
                                   isSelected 
                                     ? 'bg-[#D4AF37] border-[#FFD700] scale-125 shadow-[0_0_8px_rgba(212,175,55,0.8)]' 
                                     : 'bg-[#101A36] border-slate-600 group-hover/item:border-[#D4AF37]/60 group-hover/item:scale-110'
                                 }`} />

                                 {/* Specimen banner */}
                                 {isSelected && (
                                   <span className="absolute top-2.5 px-1 py-0.5 bg-[#D4AF37] text-[#060B1A] text-[7px] font-black tracking-widest rounded uppercase scale-90 flex items-center gap-0.5 font-serif shadow-sm">
                                     ⛏️ Spécimen
                                   </span>
                                 )}

                                 {/* Period name vertical text */}
                                 <div className="flex-1 flex items-center justify-center py-4 z-10">
                                   <span 
                                     style={{ writingMode: 'vertical-rl' }} 
                                     className={`rotate-180 font-serif text-xs md:text-sm uppercase tracking-widest transition-all duration-300 leading-none ${
                                       isSelected 
                                         ? 'text-[#D4AF37] font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]' 
                                         : 'text-slate-300 group-hover/item:text-white font-medium'
                                     }`}
                                   >
                                     {sub}
                                   </span>
                                 </div>

                                 {/* Millions of years annotation at the bottom of column */}
                                 <div className="z-10 mt-auto flex flex-col items-center">
                                   <span className={`text-[8px] font-mono tracking-tight ${isSelected ? 'text-[#D4AF37] font-bold' : 'text-slate-500 group-hover/item:text-slate-400'}`}>
                                     {details?.age.split(' ')[0]} Ma
                                   </span>
                                 </div>

                                 {/* Small indicator on active hover */}
                                 {!isSelected && (
                                   <Info size={10} className="absolute bottom-2 opacity-0 group-hover/item:opacity-70 transition-all text-[#D4AF37]" />
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
            <div className="mx-4 md:mx-8 p-6 md:p-8 border-l-4 border-[#D4AF37] bg-[#101A36]/80 rounded-r-3xl shadow-2xl mt-6 animate-fade-in relative overflow-hidden">
              <button 
                onClick={() => setShowPeriodInfo(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-xs font-serif uppercase tracking-wider hover:scale-105"
              >
                ✕ Fermer
              </button>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4 relative z-10">
                <div>
                  <span className="text-[10px] font-serif uppercase tracking-widest text-[#D4AF37] font-bold">Fiche Scientifique</span>
                  <h4 className="font-serif text-2xl md:text-3xl font-black uppercase tracking-widest text-white mt-1">
                    {showPeriodInfo}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${geologicalEras.find(e => e.subPeriods.includes(showPeriodInfo))?.color}`} />
                  <span className="text-xs font-serif uppercase tracking-widest text-slate-300 font-bold">
                    Ère {geologicalEras.find(e => e.subPeriods.includes(showPeriodInfo))?.name}
                  </span>
                </div>
              </div>

              {/* Age & Duration details */}
              {subPeriodsDetails[showPeriodInfo] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#060B1A]/60 p-4 rounded-2xl border border-white/5 mb-6 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg">
                      <Calendar size={14} />
                    </div>
                    <div>
                      <div className="text-[9px] font-serif uppercase tracking-wider text-slate-500 font-semibold">Âge géologique</div>
                      <div className="text-xs text-slate-200 font-bold font-sans">{subPeriodsDetails[showPeriodInfo].age}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg">
                      <Clock size={14} />
                    </div>
                    <div>
                      <div className="text-[9px] font-serif uppercase tracking-wider text-slate-500 font-semibold">Durée estimée</div>
                      <div className="text-xs text-slate-200 font-bold font-sans">{subPeriodsDetails[showPeriodInfo].duration}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main description */}
              <p className="font-sans text-sm text-slate-300 leading-relaxed relative z-10 mb-6">
                {subPeriodsDetails[showPeriodInfo]?.desc || geologicalEras.find(e => e.subPeriods.includes(showPeriodInfo))?.desc}
              </p>

              {/* Ecosystem & typical fauna */}
              {subPeriodsDetails[showPeriodInfo]?.typicalFauna && (
                <div className="mb-6 relative z-10 border-t border-white/5 pt-4">
                  <h5 className="text-[10px] font-serif uppercase tracking-widest text-[#D4AF37] font-bold mb-2 flex items-center gap-1.5">
                    <Compass size={12} /> Écosystème & Biodiversité
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {subPeriodsDetails[showPeriodInfo].typicalFauna.map((fauna) => (
                      <span key={fauna} className="text-xs font-sans text-slate-300 bg-[#060B1A]/50 px-2.5 py-1 rounded-lg border border-white/5">
                        🦕 {fauna}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Science Factoid plaque */}
              {subPeriodsDetails[showPeriodInfo]?.funFact && (
                <div className="p-4 bg-[#060B1A]/85 rounded-2xl border border-[#D4AF37]/20 flex gap-3 relative z-10">
                  <div className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl self-start">
                     <BookOpen size={14} />
                  </div>
                  <div>
                    <h6 className="text-[10px] font-serif uppercase tracking-widest text-[#D4AF37] font-bold">Le saviez-vous ?</h6>
                    <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed italic">
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
               <div className="border-2 border-[#D4AF37]/30 p-8 text-center bg-[#101A36]/60 rounded-3xl shadow-xl animate-fade-in delay-100">
                  <h3 className="font-serif uppercase tracking-widest text-[#D4AF37] text-2xl font-bold mb-6 border-b border-[#D4AF37]/30 pb-4 inline-block">Lieu et date de découverte</h3>
                  <p className="font-sans text-slate-200 mb-4">{fossil.discoveryLocation}</p>
                  
                  <div className="w-full h-48 bg-[#060B1A] border border-[#D4AF37]/20 rounded-2xl overflow-hidden relative z-0">
                     <MapContainer center={[fossil.discoveryLat || 46.2276, fossil.discoveryLng || 2.2137]} zoom={fossil.discoveryLat ? 10 : 4} className="w-full h-full" zoomControl={true} dragging={true} scrollWheelZoom={true}>
                       <ChangeView center={[fossil.discoveryLat || 46.2276, fossil.discoveryLng || 2.2137]} zoom={fossil.discoveryLat ? 10 : 4} />
                       <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                       <LocationMarker lat={fossil.discoveryLat} lng={fossil.discoveryLng} setLat={()=>{}} setLng={()=>{}} readOnly={true} />
                     </MapContainer>
                  </div>
               </div>
           </div>
        )}

        {/* Species */}
        {(fossil.animalOrigin || fossil.alimentation || fossil.speciesImages?.length || fossil.animalImage) ? (
           <div className="border-2 border-[#D4AF37]/30 p-8 text-center bg-[#101A36]/60 rounded-3xl shadow-xl animate-fade-in delay-200">
              <h3 className="font-serif uppercase tracking-widest text-[#D4AF37] text-2xl font-bold mb-6 border-b border-[#D4AF37]/30 pb-4 inline-block">
                Espèce {fossil.speciesType === 'vegetal' ? 'Végétale' : 'Animale'}
              </h3>
              
              {fossil.animalOrigin && (
                <p className="font-sans text-slate-200 mb-6 whitespace-pre-wrap leading-relaxed border-b border-[#D4AF37]/20 pb-6">{fossil.animalOrigin}</p>
              )}
              
              {fossil.speciesType !== 'vegetal' && (fossil.alimentation || fossil.speciesSize) && (
                <div className="grid grid-cols-2 gap-4 mb-6 border-b border-[#D4AF37]/20 pb-6 text-left">
                  {fossil.alimentation && (
                    <div>
                      <h4 className="font-serif uppercase tracking-widest text-xs text-[#D4AF37] mb-2 font-bold">Alimentation</h4>
                      <p className="font-sans text-slate-300 text-sm whitespace-pre-wrap">{fossil.alimentation}</p>
                    </div>
                  )}
                  {fossil.speciesSize && (
                    <div>
                      <h4 className="font-serif uppercase tracking-widest text-xs text-[#D4AF37] mb-2 font-bold">Taille</h4>
                      <p className="font-sans text-slate-300 text-sm">{fossil.speciesSize}</p>
                    </div>
                  )}
                </div>
              )}

              {(fossil.speciesImages && fossil.speciesImages.length > 0) || fossil.animalImage ? (
                 <div className="flex gap-4 overflow-x-auto pb-4 snap-x border border-[#D4AF37]/20 p-2 bg-[#060B1A]/50 rounded-2xl">
                   {fossil.animalImage && (!fossil.speciesImages || fossil.speciesImages.length === 0) && (
                      <div className="border border-[#D4AF37]/30 shadow-md bg-[#060B1A] shrink-0 w-64 snap-center mx-auto rounded-xl p-1 overflow-hidden">
                         <img src={fossil.animalImage} alt="Espèce" className="w-full h-48 object-contain cursor-pointer transition-transform hover:scale-105" onClick={() => setEnlargedImage(fossil.animalImage)} />
                      </div>
                   )}
                   {fossil.speciesImages && fossil.speciesImages.map((img, i) => (
                      <div key={i} className="border border-[#D4AF37]/30 shadow-md bg-[#060B1A] shrink-0 w-64 snap-center rounded-xl p-1 overflow-hidden">
                         <img src={img} alt="Espèce" className="w-full h-48 object-contain cursor-pointer transition-transform hover:scale-105" onClick={() => setEnlargedImage(img)} />
                      </div>
                   ))}
                 </div>
              ) : null}
           </div>
        ) : null}
      </div>

     {(techSheet.dateAchat || techSheet.lieuAchat || techSheet.prix || techSheet.certificat || techSheet.typeSheet === 'prelevement') && (
        <div className="border-2 border-[#D4AF37]/30 p-8 mt-8 bg-[#101A36]/60 rounded-3xl shadow-xl animate-fade-in delay-300 print:break-inside-avoid">
           <div className="text-center">
             <h3 className="font-serif uppercase tracking-widest text-[#D4AF37] text-2xl font-bold mb-6 border-b border-[#D4AF37]/30 pb-4 inline-block">
               {techSheet.typeSheet === 'prelevement' ? 'Fiche Technique : Prélèvement' : 'Fiche Technique : Achat'}
             </h3>
           </div>
           
           {techSheet.typeSheet === 'prelevement' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4 text-left">
                  <p className="font-sans text-slate-200 border-b border-[#D4AF37]/15 pb-2">
                    <span className="font-bold text-[#D4AF37] mr-2">Type :</span> Prélèvement (Découverte de terrain)
                  </p>
                  <p className="font-sans text-slate-200 border-b border-[#D4AF37]/15 pb-2">
                    <span className="font-bold text-[#D4AF37] mr-2">Date de découverte :</span> {techSheet.datePrelevement || 'Non précisée'}
                  </p>
                  <p className="font-sans text-slate-200 border-b border-[#D4AF37]/15 pb-2">
                    <span className="font-bold text-[#D4AF37] mr-2">Lieu précis :</span> {techSheet.lieuPrelevement || 'Non précisé'}
                  </p>
               </div>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 text-left">
                   {techSheet.dateAchat && (
                     <p className="font-sans text-slate-200 border-b border-[#D4AF37]/15 pb-2"><span className="font-bold text-[#D4AF37] mr-2">Date d'achat:</span> {techSheet.dateAchat}</p>
                   )}
                   {techSheet.lieuAchat && (
                     <p className="font-sans text-slate-200 border-b border-[#D4AF37]/15 pb-2"><span className="font-bold text-[#D4AF37] mr-2">Lieu d'achat:</span> {techSheet.lieuAchat}</p>
                   )}
                   {techSheet.prix ? (
                     <p className="font-sans text-slate-200 border-b border-[#D4AF37]/15 pb-2"><span className="font-bold text-[#D4AF37] mr-2">Prix d'achat:</span> {techSheet.prix} €</p>
                   ) : null}
                   {techSheet.certificat && (
                     <p className="font-sans text-slate-200 border-b border-[#D4AF37]/15 pb-2"><span className="font-bold text-[#D4AF37] mr-2">Certificat d'authenticité:</span> {techSheet.certificat === 'oui' ? 'Oui' : 'Non'}</p>
                   )}
                </div>
                {techSheet.certificat === 'oui' && techSheet.certificatPhoto && (
                   <div className="flex justify-center md:justify-end">
                      <img 
                         src={techSheet.certificatPhoto} 
                         alt="Certificat" 
                         className="max-w-xs max-h-48 object-contain cursor-pointer border border-[#D4AF37]/30 rounded-xl shadow-md transition-transform hover:scale-105" 
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
    <div className="flex flex-col min-h-screen bg-[#060B1A] bg-texture font-sans text-white">
      <div className="p-4 bg-[#060B1A]/95 border-b border-[#D4AF37]/20 flex items-center justify-between sticky top-0 z-50 print:hidden backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 text-slate-300 hover:text-[#D4AF37] hover:scale-110 active:scale-95 transition-all"><ChevronLeft size={24} /></button>
          <button onClick={onHome} className="p-2 text-slate-300 hover:text-[#D4AF37] hover:scale-110 active:scale-95 transition-all"><Home size={24} /></button>
        </div>
        <div className="flex items-center gap-4">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="p-2 border-2 border-[#D4AF37]/40 rounded-xl text-white hover:border-[#D4AF37] hover:bg-[#101A36] transition-all" title="Éditer">
              <Edit2 size={20} />
            </button>
          ) : (
            <button onClick={() => setIsEditing(false)} className="p-2 border-2 border-[#D4AF37]/40 rounded-xl text-white hover:border-[#D4AF37] hover:bg-[#101A36] transition-all" title="Aperçu">
              <Eye size={20} />
            </button>
          )}

          {existingFossil && onDelete && (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 border-2 border-red-500/40 rounded-xl text-red-400 hover:border-red-500 hover:bg-red-950/20 transition-all" title="Supprimer">
              <Trash2 size={20} />
            </button>
          )}

          <button onClick={handleSave} className="p-2 bg-[#D4AF37] text-[#060B1A] rounded-xl font-bold hover:bg-[#FFD700] hover:scale-105 active:scale-95 transition-all" title="Enregistrer">
            <Save size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 print:p-0 print:bg-white print:text-black overflow-y-auto" ref={printRef}>
        {isEditing ? renderEditMode() : renderViewMode()}

        <div className="max-w-4xl mx-auto flex justify-center gap-4 mt-12 print:hidden relative z-10 pb-8">
          <button onClick={handlePrint} className="flex items-center gap-2 px-8 py-3 border-2 border-[#D4AF37]/35 text-white hover:bg-[#101A36] hover:border-[#D4AF37] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest font-serif text-sm rounded-xl">
            <Printer size={16} /> Imprimer
          </button>
          <button onClick={onBack} className="flex items-center gap-2 px-8 py-3 border-2 border-[#D4AF37]/35 text-white hover:bg-[#101A36] hover:border-[#D4AF37] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest font-serif text-sm rounded-xl">
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
      </div>
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#101A36] border-2 border-red-500/30 p-8 max-w-sm w-full rounded-2xl shadow-2xl">
            <h3 className="font-serif text-xl font-bold mb-4 text-red-400">Supprimer le fossile</h3>
            <p className="font-sans text-slate-300 mb-8">Êtes-vous sûr de vouloir supprimer ce fossile ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border-2 border-slate-500/30 text-slate-300 hover:border-slate-400 rounded-xl transition-all font-sans uppercase tracking-wider text-xs font-bold">
                Annuler
              </button>
              <button onClick={() => onDelete!(existingFossil!.id)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-all font-sans uppercase tracking-wider text-xs font-bold">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Basic print styles */}
      {enlargedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out flex-col" onClick={() => setEnlargedImage(null)}>
          <img src={enlargedImage} alt="Visuel" className="max-w-full max-h-full object-contain" />
          <p className="text-white mt-4 font-sans text-sm tracking-widest">Cliquez n'importe où pour fermer</p>
        </div>
      )}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 1.5cm; }
          body { -webkit-print-color-adjust: exact; background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
