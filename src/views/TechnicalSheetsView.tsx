import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Plus, Trash2, Edit2, Eye, Printer, Coins, Layers, Compass, Tag, CheckCircle2 } from 'lucide-react';
import { TechnicalSheet, Fossil } from '../types';
import { getSheets, saveSheets, getFossils, saveFossils } from '../store';
import { v4 as uuidv4 } from 'uuid';
import ImageUpload from '../components/ImageUpload';
import { parseFossilPrice, formatFossilPrice } from '../utils/pricing';

interface TechnicalSheetsViewProps {
  onBack: () => void;
  isLight?: boolean;
  fossils?: Fossil[];
  onUpdateFossils?: (fossils: Fossil[]) => void;
}

export default function TechnicalSheetsView({ onBack, isLight = false, fossils: fossilsProp, onUpdateFossils }: TechnicalSheetsViewProps) {
  const [sheets, setSheets] = useState<TechnicalSheet[]>(() => {
    if (fossilsProp && fossilsProp.length > 0) {
      return fossilsProp.map(f => ({
        id: f.id,
        fossilId: f.id,
        nom: f.title || 'Sans nom',
        nomPhoto: f.carouselImage || f.mainImage || '',
        provenance: f.techSheetProvenance || f.discoveryLocation || '',
        periode: f.detailedPeriodStart || f.period || '',
        fossilDating: f.fossilDating || '',
        typeSheet: f.techSheetType || 'achat',
        dateAchat: f.techSheetDateAchat || '',
        lieuAchat: f.techSheetLieuAchat || '',
        certificat: f.techSheetCertificat || 'non',
        certificatPhoto: f.techSheetCertificatPhoto || '',
        prix: parseFossilPrice(f.techSheetPrix),
        datePrelevement: f.techSheetDatePrelevement || '',
        lieuPrelevement: f.techSheetLieuPrelevement || f.discoveryLocation || ''
      }));
    }
    return [];
  });
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load sheets and sync with fossils seamlessly
  useEffect(() => {
    let isMounted = true;
    Promise.all([getSheets(), fossilsProp && fossilsProp.length > 0 ? Promise.resolve(fossilsProp) : getFossils()]).then(([loadedSheets, loadedFossils]) => {
      if (!isMounted) return;

      const mergedMap = new Map<string, TechnicalSheet>();

      // 1. Index existing sheets
      (loadedSheets || []).forEach((s) => {
        const key = s.fossilId || s.id || s.nom;
        if (key) {
          mergedMap.set(key, { ...s });
        }
      });

      // 2. Ensure each fossil is included in the sheets
      let hasNewFossils = false;
      (loadedFossils || []).forEach((f: Fossil) => {
        const existingKey = f.id && mergedMap.has(f.id) 
          ? f.id 
          : Array.from(mergedMap.keys()).find(k => {
              const item = mergedMap.get(k);
              return item && (
                (item.fossilId && f.id && item.fossilId === f.id) || 
                (item.id && f.id && item.id === f.id) || 
                (f.title && item.nom && item.nom.trim().toLowerCase() === f.title.trim().toLowerCase())
              );
            });

        const parsedFossilPrice = parseFossilPrice(f.techSheetPrix ?? (f as any).prix ?? (f as any).price ?? (f as any).valeur);

        if (existingKey) {
          const item = mergedMap.get(existingKey)!;
          // Sync missing or updated properties
          if (!item.fossilId && f.id) item.fossilId = f.id;
          if (f.title && (!item.nom || item.nom === 'Sans nom')) item.nom = f.title;
          if (!item.nomPhoto && (f.carouselImage || f.mainImage)) {
            item.nomPhoto = f.carouselImage || f.mainImage;
          }
          if (!item.provenance && (f.techSheetProvenance || f.discoveryLocation)) {
            item.provenance = f.techSheetProvenance || f.discoveryLocation || '';
          }
          if (!item.periode && (f.detailedPeriodStart || f.period)) {
            item.periode = f.detailedPeriodStart || f.period || '';
          }
          if (!item.fossilDating && f.fossilDating) {
            item.fossilDating = f.fossilDating;
          }
          
          const parsedSheetPrice = parseFossilPrice(item.prix);
          const effectivePrice = Math.max(parsedFossilPrice, parsedSheetPrice);
          if (effectivePrice > 0) {
            item.prix = effectivePrice;
          }
          
          if (!item.typeSheet && f.techSheetType) {
            item.typeSheet = f.techSheetType;
          }
          if (!item.dateAchat && f.techSheetDateAchat) item.dateAchat = f.techSheetDateAchat;
          if (!item.lieuAchat && f.techSheetLieuAchat) item.lieuAchat = f.techSheetLieuAchat;
          if (!item.datePrelevement && f.techSheetDatePrelevement) item.datePrelevement = f.techSheetDatePrelevement;
          if (!item.lieuPrelevement && f.techSheetLieuPrelevement) item.lieuPrelevement = f.techSheetLieuPrelevement;
          if (!item.certificat && f.techSheetCertificat) item.certificat = f.techSheetCertificat;
          if (!item.certificatPhoto && f.techSheetCertificatPhoto) item.certificatPhoto = f.techSheetCertificatPhoto;
        } else {
          // Add newly discovered fossil to sheets
          const newSheet: TechnicalSheet = {
            id: f.id || uuidv4(),
            fossilId: f.id,
            nom: f.title || 'Sans nom',
            nomPhoto: f.carouselImage || f.mainImage || '',
            provenance: f.techSheetProvenance || f.discoveryLocation || '',
            periode: f.detailedPeriodStart || f.period || '',
            fossilDating: f.fossilDating || '',
            typeSheet: f.techSheetType || 'achat',
            dateAchat: f.techSheetDateAchat || '',
            lieuAchat: f.techSheetLieuAchat || '',
            certificat: f.techSheetCertificat || 'non',
            certificatPhoto: f.techSheetCertificatPhoto || '',
            prix: parsedFossilPrice,
            datePrelevement: f.techSheetDatePrelevement || '',
            lieuPrelevement: f.techSheetLieuPrelevement || f.discoveryLocation || ''
          };
          mergedMap.set(newSheet.id, newSheet);
          hasNewFossils = true;
        }
      });

      const finalSheets = Array.from(mergedMap.values());
      setSheets(finalSheets);
      setIsLoading(false);

      if (hasNewFossils && finalSheets.length > 0) {
        saveSheets(finalSheets);
      }
    }).catch(err => {
      console.error("Error loading technical sheets:", err);
      setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, [fossilsProp]);

  const save = async (newSheets: TechnicalSheet[]) => {
    setSheets(newSheets);
    await saveSheets(newSheets);
  };

  const addRow = () => {
    const newSheet: TechnicalSheet = {
      id: uuidv4(),
      nom: '',
      nomPhoto: '',
      provenance: '',
      periode: '',
      fossilDating: '',
      dateAchat: '',
      lieuAchat: '',
      certificat: 'non',
      certificatPhoto: '',
      prix: 0,
      typeSheet: 'achat',
      datePrelevement: '',
      lieuPrelevement: ''
    };
    save([...sheets, newSheet]);
    setIsEditing(true);
  };

  const update = async (id: string, field: keyof TechnicalSheet, value: any) => {
    const finalValue = field === 'prix' ? (typeof value === 'string' ? value : parseFossilPrice(value)) : value;
    const newSheets = sheets.map(s => s.id === id ? { ...s, [field]: finalValue } : s);
    setSheets(newSheets);
    await saveSheets(newSheets);

    // Synchronize corresponding fossil in store if present
    try {
      const targetSheet = newSheets.find(s => s.id === id);
      if (targetSheet && (targetSheet.fossilId || targetSheet.nom)) {
        const fossils = fossilsProp || await getFossils();
        const fIdx = fossils.findIndex(f => 
          (targetSheet.fossilId && f.id === targetSheet.fossilId) || 
          (targetSheet.nom && f.title === targetSheet.nom)
        );
        if (fIdx >= 0) {
          const updatedFossils = [...fossils];
          const updatedFossil = { ...updatedFossils[fIdx] };
          if (field === 'prix') updatedFossil.techSheetPrix = parseFossilPrice(value);
          if (field === 'typeSheet') updatedFossil.techSheetType = finalValue;
          if (field === 'dateAchat') updatedFossil.techSheetDateAchat = finalValue;
          if (field === 'lieuAchat') updatedFossil.techSheetLieuAchat = finalValue;
          if (field === 'datePrelevement') updatedFossil.techSheetDatePrelevement = finalValue;
          if (field === 'lieuPrelevement') updatedFossil.techSheetLieuPrelevement = finalValue;
          if (field === 'certificat') updatedFossil.techSheetCertificat = finalValue;
          if (field === 'certificatPhoto') updatedFossil.techSheetCertificatPhoto = finalValue;
          if (field === 'nom') updatedFossil.title = finalValue;
          if (field === 'provenance') updatedFossil.discoveryLocation = finalValue;
          updatedFossils[fIdx] = updatedFossil;
          
          if (onUpdateFossils) {
            onUpdateFossils(updatedFossils);
          } else {
            await saveFossils(updatedFossils);
          }
        }
      }
    } catch (err) {
      console.warn("Fossil sync notice:", err);
    }
  };

  const removeRow = async (id: string) => {
    const newSheets = sheets.filter(s => s.id !== id);
    save(newSheets);
  };

  // Robust calculation of collection total value - sums all prices in the table
  const totalValue = useMemo(() => {
    return sheets.reduce((sum, s) => {
      const raw = s.prix !== undefined && s.prix !== null
        ? s.prix 
        : ((s as any).techSheetPrix ?? (s as any).price ?? (s as any).valeur ?? 0);
      const p = parseFossilPrice(raw);
      return sum + (isNaN(p) || p <= 0 ? 0 : p);
    }, 0);
  }, [sheets]);

  const boughtCount = sheets.filter(s => (s.typeSheet || 'achat') === 'achat').length;
  const prelevementCount = sheets.filter(s => s.typeSheet === 'prelevement').length;
  const certifiedCount = sheets.filter(s => s.certificat === 'oui').length;

  const handlePrint = () => {
    setIsEditing(false);
    window.focus();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className={`flex flex-col min-h-screen font-sans transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0] text-black' : 'bg-[#060B1A] bg-texture text-white'}`}>
      
      {/* Top Header Bar */}
      <header className={`px-4 py-3 border-b flex items-center justify-between sticky top-0 z-40 print:hidden backdrop-blur-md transition-colors ${
        isLight ? 'bg-[#F7F5F0]/95 border-slate-300 text-black' : 'bg-[#060B1A]/95 border-[#D4AF37]/25 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
              isLight 
                ? 'bg-white border-slate-300 text-black hover:bg-slate-100' 
                : 'bg-[#101A36]/80 border-[#D4AF37]/30 text-slate-200 hover:text-[#D4AF37] hover:border-[#D4AF37]'
            }`}
          >
            <ChevronLeft size={18} /> 
            <span className="font-serif tracking-wider text-xs uppercase font-bold">Retour</span>
          </button>

          <h1 className={`text-base sm:text-lg font-bold font-serif tracking-wider uppercase hidden sm:block ${
            isLight ? 'text-black' : 'text-[#D4AF37]'
          }`}>
            Fiches Techniques & Valeur
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`px-3 py-1.5 border rounded-lg transition-all flex items-center gap-1.5 font-serif uppercase tracking-wider text-xs font-semibold ${
              isEditing 
                ? (isLight ? 'bg-black text-white border-black' : 'bg-[#D4AF37] text-[#060B1A] border-[#D4AF37]') 
                : (isLight ? 'bg-white text-black border-slate-300 hover:bg-slate-100' : 'bg-transparent text-white border-[#D4AF37]/40 hover:bg-[#101A36]')
            }`}
          >
            {isEditing ? <><Eye size={14} /><span>Visualisation</span></> : <><Edit2 size={14} /><span>Édition</span></>}
          </button>

          <button 
            onClick={addRow} 
            className={`px-3 py-1.5 font-bold rounded-lg transition-all flex items-center gap-1 font-serif uppercase tracking-wider text-xs shadow-sm active:scale-95 ${
              isLight ? 'bg-black text-white hover:bg-slate-800' : 'bg-[#D4AF37] text-[#060B1A] hover:bg-[#FFD700]'
            }`}
          >
            <Plus size={15} /> <span>Ajouter</span>
          </button>

          <button 
            onClick={handlePrint} 
            title="Imprimer ou exporter en PDF"
            className={`p-2 border rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1 ${
              isLight ? 'bg-white border-slate-300 text-black hover:bg-slate-100' : 'bg-[#101A36]/80 border-[#D4AF37]/40 text-slate-200 hover:text-[#D4AF37]'
            }`}
          >
            <Printer size={15} />
            <span className="hidden md:inline text-xs font-serif uppercase tracking-wider font-bold">Imprimer</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-4 max-w-6xl w-full mx-auto print:p-0 print:m-0 print:max-w-none print:w-full">

        {/* PRINT HEADER: Visible only on print / PDF */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-black pb-2 mb-3 text-black">
          <div>
            <h1 className="text-lg font-serif font-black uppercase tracking-wider text-black">
              Registre & Fiches Techniques de la Collection
            </h1>
            <p className="text-xs font-serif italic text-slate-700">
              Inventaire des spécimens et estimation financière
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-600">Valeur Totale</div>
            <div className="text-xl font-serif font-black text-black">{formatFossilPrice(totalValue)} €</div>
            <div className="text-[10px] text-slate-600">
              {sheets.length} spécimen{sheets.length > 1 ? 's' : ''} ({boughtCount} achats, {prelevementCount} prélèvements)
            </div>
          </div>
        </div>

        {/* COMPACT SUMMARY BAR */}
        <div className={`print:hidden p-3.5 sm:p-4 border rounded-xl shadow-md transition-all flex flex-wrap items-center justify-between gap-3 ${
          isLight 
            ? 'bg-white border-slate-300 text-black' 
            : 'bg-[#0d1633] border-[#D4AF37]/35 text-white'
        }`}>
          {/* Total Value */}
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border flex items-center justify-center shrink-0 ${
              isLight ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37]'
            }`}>
              <Coins size={22} />
            </div>
            <div>
              <span className={`block text-[11px] font-serif uppercase tracking-wider font-bold ${
                isLight ? 'text-slate-600' : 'text-[#D4AF37]'
              }`}>
                Valeur Totale Estimée
              </span>
              <span className={`text-xl sm:text-2xl font-serif italic font-black ${
                isLight ? 'text-black' : 'text-white'
              }`}>
                {formatFossilPrice(totalValue)} €
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-serif">
            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#101A36] border-slate-700 text-slate-200'
            }`}>
              <Layers size={13} className={isLight ? 'text-slate-600' : 'text-[#D4AF37]'} />
              <span><strong>{sheets.length}</strong> spécimen{sheets.length > 1 ? 's' : ''}</span>
            </div>

            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#101A36] border-slate-700 text-slate-200'
            }`}>
              <Tag size={13} className={isLight ? 'text-emerald-700' : 'text-emerald-400'} />
              <span><strong>{boughtCount}</strong> achat{boughtCount > 1 ? 's' : ''}</span>
            </div>

            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
              isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}>
              <Compass size={13} />
              <span><strong>{prelevementCount}</strong> prélèvement{prelevementCount > 1 ? 's' : ''}</span>
            </div>

            {certifiedCount > 0 && (
              <div className={`px-2.5 py-1 rounded-lg border hidden sm:flex items-center gap-1.5 ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              }`}>
                <CheckCircle2 size={13} />
                <span><strong>{certifiedCount}</strong> certifié{certifiedCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* COMPACT & ELEGANT TABLE */}
        <div className={`w-full overflow-x-auto border rounded-xl shadow-sm print:overflow-visible print:border-2 print:border-black print:rounded-lg print:shadow-none print:bg-white ${
          isLight ? 'bg-white border-slate-300 text-black' : 'bg-[#060B1A]/80 border-[#D4AF37]/25 text-white'
        }`}>
          <table className={`w-full text-left border-collapse font-sans text-xs sm:text-sm print:text-[9pt] print:bg-white ${
            isLight ? 'text-black' : 'text-white'
          }`}>
            <thead>
              <tr className={`border-b font-serif uppercase tracking-wider text-xs print:bg-white print:border-b-2 print:border-black print:text-black ${
                isLight 
                  ? 'bg-slate-100 border-slate-300 text-black font-bold' 
                  : 'bg-[#101A36] border-[#D4AF37]/30 text-[#D4AF37]'
              }`}>
                <th className="py-2.5 px-3 w-48 sm:w-56 print:w-[22%] print:py-2 print:text-black">Nom du fossile</th>
                <th className="py-2.5 px-3 w-48 sm:w-56 print:w-[22%] print:py-2 print:text-black">Provenance</th>
                <th className="py-2.5 px-3 w-36 sm:w-44 print:w-[18%] print:py-2 print:text-black">Datation & Période</th>
                <th className="py-2.5 px-3 w-40 sm:w-48 print:w-[18%] print:py-2 print:text-black">Acquisition</th>
                <th className="py-2.5 px-3 w-28 sm:w-36 print:w-[10%] print:py-2 print:text-black">Certificat</th>
                <th className="py-2.5 px-3 w-24 sm:w-28 text-right print:w-[10%] print:py-2 print:text-black">Prix (€)</th>
                {isEditing && <th className="py-2.5 px-2 w-10 text-center print:hidden"></th>}
              </tr>
            </thead>

            <tbody className="print:bg-white">
              {sheets.map((sheet, index) => (
                <tr 
                  key={sheet.id} 
                  className={`border-b transition-colors print:bg-white print:border-b print:border-black/30 print:text-black ${
                    isLight 
                      ? (index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/70 hover:bg-slate-100') + ' border-slate-200' 
                      : (index % 2 === 0 ? 'bg-[#060B1A]/40 hover:bg-[#101A36]/60' : 'bg-[#0a1229]/60 hover:bg-[#101A36]/80') + ' border-[#D4AF37]/10'
                  }`}
                >
                  {/* 1. Nom & Photo */}
                  <td className="py-2.5 px-3 align-top">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5">
                        <input 
                          type="text" 
                          value={sheet.nom} 
                          onChange={e => update(sheet.id, 'nom', e.target.value)}
                          placeholder="Nom du fossile"
                          className={`w-full p-1.5 border rounded-lg outline-none font-serif font-bold text-xs ${
                            isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                          }`}
                        />
                        <ImageUpload 
                          value={sheet.nomPhoto} 
                          onChange={val => update(sheet.id, 'nomPhoto', val)}
                          className={`h-14 w-full rounded-lg object-contain ${isLight ? 'bg-slate-100' : 'bg-[#060B1A]'}`}
                        />
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        {sheet.nomPhoto ? (
                          <img 
                            src={sheet.nomPhoto} 
                            alt={sheet.nom} 
                            className={`h-11 w-11 object-cover cursor-pointer rounded-md border shrink-0 transition-all hover:scale-105 print:h-10 print:w-10 ${
                              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#060B1A] border-[#D4AF37]/25'
                            }`} 
                            onClick={() => setEnlargedImage(sheet.nomPhoto)} 
                          />
                        ) : null}
                        <div>
                          <p className={`font-serif font-bold text-xs sm:text-sm leading-tight ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                            {sheet.nom || 'Sans nom'}
                          </p>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* 2. Provenance */}
                  <td className="py-2.5 px-3 align-top">
                    {isEditing ? (
                      <textarea 
                        value={sheet.provenance} 
                        onChange={e => update(sheet.id, 'provenance', e.target.value)}
                        placeholder="Provenance, région..."
                        rows={2}
                        className={`w-full p-1.5 border rounded-lg outline-none resize-none text-xs ${
                          isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                        }`}
                      />
                    ) : (
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        {sheet.provenance || '-'}
                      </p>
                    )}
                  </td>

                  {/* 3. Datation & Période */}
                  <td className="py-2.5 px-3 align-top">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5">
                        <input 
                          type="text" 
                          value={sheet.fossilDating || ''} 
                          onChange={e => update(sheet.id, 'fossilDating', e.target.value)}
                          placeholder="Datation (ex: -400 Ma)"
                          className={`w-full p-1.5 border rounded-lg outline-none text-xs ${
                            isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                          }`}
                        />
                        <input 
                          type="text" 
                          value={sheet.periode} 
                          onChange={e => update(sheet.id, 'periode', e.target.value)}
                          placeholder="Période (ex: Dévonien)"
                          className={`w-full p-1.5 border rounded-lg outline-none text-xs font-semibold ${
                            isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                          }`}
                        />
                      </div>
                    ) : (
                      <div>
                        <p className={`font-serif font-bold text-xs ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                          {sheet.fossilDating || '-'}
                        </p>
                        {sheet.periode && (
                          <p className={`text-[11px] font-serif uppercase tracking-wider font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                            {sheet.periode}
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 4. Mode d'acquisition */}
                  <td className="py-2.5 px-3 align-top">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5">
                        <select 
                          value={sheet.typeSheet || 'achat'} 
                          onChange={e => update(sheet.id, 'typeSheet', e.target.value)}
                          className={`w-full p-1.5 border rounded-lg outline-none text-xs font-semibold ${
                            isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                          }`}
                        >
                          <option value="achat">💰 Achat</option>
                          <option value="prelevement">⛏️ Prélèvement</option>
                        </select>

                        {(sheet.typeSheet || 'achat') === 'prelevement' ? (
                          <div className="flex flex-col gap-1">
                            <input 
                              type="text"
                              value={sheet.datePrelevement || ''} 
                              onChange={e => update(sheet.id, 'datePrelevement', e.target.value)}
                              placeholder="Date"
                              className={`w-full p-1.5 border rounded-lg outline-none text-xs ${
                                isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                              }`}
                            />
                            <input 
                              type="text"
                              value={sheet.lieuPrelevement || ''} 
                              onChange={e => update(sheet.id, 'lieuPrelevement', e.target.value)}
                              placeholder="Lieu"
                              className={`w-full p-1.5 border rounded-lg outline-none text-xs ${
                                isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                              }`}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <input 
                              type="text"
                              value={sheet.dateAchat || ''} 
                              onChange={e => update(sheet.id, 'dateAchat', e.target.value)}
                              placeholder="Date d'achat"
                              className={`w-full p-1.5 border rounded-lg outline-none text-xs ${
                                isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                              }`}
                            />
                            <input 
                              type="text"
                              value={sheet.lieuAchat || ''} 
                              onChange={e => update(sheet.id, 'lieuAchat', e.target.value)}
                              placeholder="Lieu / Vendeur"
                              className={`w-full p-1.5 border rounded-lg outline-none text-xs ${
                                isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs leading-snug">
                        {(sheet.typeSheet || 'achat') === 'prelevement' ? (
                          <div>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 border ${
                              isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/35'
                            }`}>⛏️ Prélèvement</span>
                            {sheet.datePrelevement && <p className="text-[11px] text-slate-400"><strong className={isLight ? 'text-black' : 'text-slate-300'}>Date:</strong> {sheet.datePrelevement}</p>}
                            {sheet.lieuPrelevement && <p className="text-[11px] text-slate-400"><strong className={isLight ? 'text-black' : 'text-slate-300'}>Lieu:</strong> {sheet.lieuPrelevement}</p>}
                          </div>
                        ) : (
                          <div>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 border ${
                              isLight ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/35'
                            }`}>💰 Achat</span>
                            {sheet.dateAchat && <p className="text-[11px] text-slate-400"><strong className={isLight ? 'text-black' : 'text-slate-300'}>Date:</strong> {sheet.dateAchat}</p>}
                            {sheet.lieuAchat && <p className="text-[11px] text-slate-400"><strong className={isLight ? 'text-black' : 'text-slate-300'}>Lieu:</strong> {sheet.lieuAchat}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 5. Certificat */}
                  <td className="py-2.5 px-3 align-top">
                    {isEditing ? (
                      (sheet.typeSheet || 'achat') === 'prelevement' ? (
                        <span className="text-xs italic opacity-50">N/A</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-2 text-xs font-semibold">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" checked={sheet.certificat === 'oui'} onChange={() => update(sheet.id, 'certificat', 'oui')} className="accent-[#D4AF37]" /> Oui
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" checked={sheet.certificat === 'non'} onChange={() => update(sheet.id, 'certificat', 'non')} className="accent-[#D4AF37]" /> Non
                            </label>
                          </div>
                          {sheet.certificat === 'oui' && (
                            <ImageUpload 
                              value={sheet.certificatPhoto} 
                              onChange={val => update(sheet.id, 'certificatPhoto', val)}
                              className={`h-12 w-full rounded-lg object-contain ${isLight ? 'bg-slate-50' : 'bg-[#060B1A]'}`}
                            />
                          )}
                        </div>
                      )
                    ) : (
                      (sheet.typeSheet || 'achat') === 'prelevement' ? (
                        <span className="text-xs italic opacity-40">N/A</span>
                      ) : (
                        <div>
                          <p className={`uppercase tracking-wider font-bold text-[11px] ${
                            sheet.certificat === 'oui' 
                              ? (isLight ? 'text-emerald-700' : 'text-emerald-400') 
                              : 'opacity-50'
                          }`}>
                            {sheet.certificat === 'oui' ? '✓ Certifié' : 'Sans certif.'}
                          </p>
                          {sheet.certificat === 'oui' && sheet.certificatPhoto && (
                            <img 
                              src={sheet.certificatPhoto} 
                              alt="Certificat" 
                              className={`h-9 w-auto object-contain cursor-pointer rounded border p-0.5 mt-1 transition-all hover:scale-105 print:h-8 ${
                                isLight ? 'bg-slate-100 border-slate-300' : 'border-[#D4AF37]/25 bg-[#060B1A]'
                              }`} 
                              onClick={() => setEnlargedImage(sheet.certificatPhoto)} 
                            />
                          )}
                        </div>
                      )
                    )}
                  </td>

                  {/* 6. Prix (€) */}
                  <td className="py-2.5 px-3 align-top text-right">
                    {isEditing ? (
                      <input 
                        type="text"
                        inputMode="decimal" 
                        value={sheet.prix === 0 || sheet.prix === undefined ? '' : sheet.prix} 
                        onChange={e => update(sheet.id, 'prix', e.target.value)}
                        placeholder="0 €"
                        className={`w-20 p-1.5 border rounded-lg outline-none text-right font-serif font-bold text-xs ${
                          isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                        }`}
                      />
                    ) : (
                      <span className={`font-serif italic font-bold text-xs sm:text-sm ${
                        isLight ? 'text-black' : 'text-[#D4AF37]'
                      }`}>
                        {parseFossilPrice(sheet.prix) > 0 ? `${formatFossilPrice(sheet.prix)} €` : '-'}
                      </span>
                    )}
                  </td>

                  {/* 7. Action delete (edit mode) */}
                  {isEditing && (
                    <td className="py-2.5 px-2 align-top text-center print:hidden">
                      <button 
                        onClick={() => removeRow(sheet.id)} 
                        title="Supprimer"
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {sheets.length === 0 && !isLoading && (
                <tr>
                  <td 
                    colSpan={isEditing ? 7 : 6} 
                    className={`py-8 text-center font-serif italic text-xs sm:text-sm border-b ${
                      isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-[#D4AF37]/10'
                    }`}
                  >
                    Aucune fiche technique enregistrée. Cliquez sur <strong>Ajouter</strong> pour créer une nouvelle entrée.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer with Total summary row */}
            <tfoot>
              <tr className={`border-t-2 font-serif print:bg-white print:border-t-2 print:border-black print:text-black ${
                isLight 
                  ? 'bg-slate-100 border-slate-400 text-black' 
                  : 'bg-[#0c142e] border-[#D4AF37]/50 text-white'
              }`}>
                <td colSpan={5} className="py-3 px-3 font-bold uppercase tracking-wider text-xs sm:text-sm print:text-black">
                  Total collection ({sheets.length} spécimen{sheets.length > 1 ? 's' : ''})
                </td>
                <td className={`py-3 px-3 text-right font-serif font-black text-sm sm:text-base print:text-black`}>
                  {formatFossilPrice(totalValue)} €
                </td>
                {isEditing && <td className="print:hidden"></td>}
              </tr>
            </tfoot>
          </table>
        </div>

      </main>

      {/* Image zoom modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out flex-col print:hidden" 
          onClick={() => setEnlargedImage(null)}
        >
          <img src={enlargedImage} alt="Aperçu grand format" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          <p className="text-white mt-4 font-serif uppercase tracking-widest text-xs opacity-75">Cliquez n'importe où pour fermer</p>
        </div>
      )}
    </div>
  );
}
