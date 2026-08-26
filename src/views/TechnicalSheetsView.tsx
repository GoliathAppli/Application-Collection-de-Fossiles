import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, Edit2, Eye, Printer, Coins, Layers, Compass, Tag } from 'lucide-react';
import { TechnicalSheet, Fossil } from '../types';
import { getSheets, saveSheets, getFossils, saveFossils } from '../store';
import { v4 as uuidv4 } from 'uuid';
import ImageUpload from '../components/ImageUpload';
import { parseFossilPrice } from '../utils/pricing';

interface TechnicalSheetsViewProps {
  onBack: () => void;
  isLight?: boolean;
}

export default function TechnicalSheetsView({ onBack, isLight = false }: TechnicalSheetsViewProps) {
  const [sheets, setSheets] = useState<TechnicalSheet[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    Promise.all([getSheets(), getFossils()]).then(([loadedSheets, loadedFossils]) => {
      let merged = [...loadedSheets];
      let hasChanges = false;

      // Ensure each fossil in the user's collection is represented in technical sheets
      loadedFossils.forEach((f: Fossil) => {
        const existing = merged.find(s => s.fossilId === f.id || (f.title && s.nom === f.title));
        if (!existing) {
          merged.push({
            id: f.id || uuidv4(),
            fossilId: f.id,
            nom: f.title || 'Sans nom',
            nomPhoto: f.carouselImage || f.mainImage || '',
            provenance: f.discoveryLocation || '',
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
          });
          hasChanges = true;
        } else {
          // If the sheet has 0 / empty price but the fossil record has a price
          const sheetPrice = parseFossilPrice(existing.prix);
          const fossilPrice = parseFossilPrice(f.techSheetPrix);
          if (sheetPrice === 0 && fossilPrice > 0) {
            existing.prix = fossilPrice;
            hasChanges = true;
          }
          if (!existing.nomPhoto && (f.carouselImage || f.mainImage)) {
            existing.nomPhoto = f.carouselImage || f.mainImage;
            hasChanges = true;
          }
          if (!existing.fossilId) {
            existing.fossilId = f.id;
            hasChanges = true;
          }
        }
      });

      setSheets(merged);
      if (hasChanges && merged.length > 0) {
        saveSheets(merged);
      }
    });
  }, []);

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
      dateAchat: '',
      lieuAchat: '',
      certificat: '',
      certificatPhoto: '',
      prix: 0,
      typeSheet: 'achat'
    };
    save([...sheets, newSheet]);
    setIsEditing(true);
  };

  const update = async (id: string, field: keyof TechnicalSheet, value: any) => {
    const finalValue = field === 'prix' ? parseFossilPrice(value) : value;
    const newSheets = sheets.map(s => s.id === id ? { ...s, [field]: finalValue } : s);
    save(newSheets);

    // Also update corresponding fossil if present
    try {
      const targetSheet = newSheets.find(s => s.id === id);
      if (targetSheet && (targetSheet.fossilId || targetSheet.nom)) {
        const fossils = await getFossils();
        const fIdx = fossils.findIndex(f => f.id === targetSheet.fossilId || (targetSheet.nom && f.title === targetSheet.nom));
        if (fIdx >= 0) {
          if (field === 'prix') fossils[fIdx].techSheetPrix = finalValue;
          if (field === 'typeSheet') fossils[fIdx].techSheetType = finalValue;
          if (field === 'dateAchat') fossils[fIdx].techSheetDateAchat = finalValue;
          if (field === 'lieuAchat') fossils[fIdx].techSheetLieuAchat = finalValue;
          if (field === 'datePrelevement') fossils[fIdx].techSheetDatePrelevement = finalValue;
          if (field === 'lieuPrelevement') fossils[fIdx].techSheetLieuPrelevement = finalValue;
          if (field === 'certificat') fossils[fIdx].techSheetCertificat = finalValue;
          if (field === 'certificatPhoto') fossils[fIdx].techSheetCertificatPhoto = finalValue;
          await saveFossils(fossils);
        }
      }
    } catch (err) {
      console.warn("Fossil sync notice:", err);
    }
  };

  const removeRow = (id: string) => {
    save(sheets.filter(s => s.id !== id));
  };

  const totalValue = sheets.reduce((sum, s) => {
    if (s.typeSheet === 'prelevement') return sum;
    const p = parseFossilPrice(s.prix);
    return sum + p;
  }, 0);

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
      
      {/* Top Bar (Screen only) */}
      <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-50 print:hidden backdrop-blur-md transition-colors ${
        isLight ? 'bg-[#F7F5F0]/95 border-slate-200 text-black' : 'bg-[#060B1A]/95 border-[#D4AF37]/20 text-white'
      }`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack} 
            className={`flex items-center gap-2 p-2 hover:scale-110 active:scale-95 transition-all ${
              isLight ? 'text-black hover:text-[#D4AF37]' : 'text-slate-300 hover:text-[#D4AF37]'
            }`}
          >
            <ChevronLeft size={24} /> 
            <span className="hidden sm:inline font-serif tracking-widest text-sm uppercase font-bold text-black">Retour</span>
          </button>
        </div>

        <h2 className={`text-xl md:text-3xl font-bold font-serif tracking-widest uppercase text-center flex-1 hidden sm:block animate-fade-in drop-shadow-sm ${
          isLight ? 'text-black' : 'text-[#D4AF37]'
        }`}>
          Fiches Techniques & Valeur
        </h2>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`px-3.5 py-2 border rounded-xl transition-all flex items-center gap-2 font-serif uppercase tracking-wider text-xs sm:text-sm shadow-sm ${
              isEditing 
                ? (isLight ? 'bg-black text-white font-bold border-black' : 'bg-[#D4AF37] text-[#060B1A] font-bold border-[#D4AF37]') 
                : (isLight ? 'bg-white text-black border-slate-300 hover:bg-slate-100' : 'bg-transparent text-white border-[#D4AF37]/40 hover:bg-[#101A36] hover:border-[#D4AF37]')
            }`}
          >
            {isEditing ? <><Eye size={16} /><span className="hidden sm:inline">Visualisation</span></> : <><Edit2 size={16} /><span className="hidden sm:inline">Édition</span></>}
          </button>

          <button 
            onClick={addRow} 
            className={`px-3.5 py-2 font-bold rounded-xl transition-all flex items-center gap-1.5 font-serif uppercase tracking-wider text-xs sm:text-sm shadow-md active:scale-95 ${
              isLight ? 'bg-black text-white hover:bg-slate-800' : 'bg-[#D4AF37] text-[#060B1A] hover:bg-[#FFD700]'
            }`}
          >
            <Plus size={18} /> <span className="hidden sm:inline">Ajouter</span>
          </button>

          <button 
            onClick={handlePrint} 
            title="Imprimer le registre complet"
            className={`p-2.5 border rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1.5 ${
              isLight ? 'border-slate-300 text-black hover:bg-slate-100' : 'border-[#D4AF37]/40 text-slate-200 hover:border-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#101A36]'
            }`}
          >
            <Printer size={18} />
            <span className="hidden md:inline text-xs font-serif uppercase tracking-wider font-bold">Imprimer</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-4 md:p-8 flex flex-col gap-6 max-w-[1900px] w-full mx-auto print:p-0 print:m-0 print:max-w-none print:w-full print:gap-2">

        {/* PRINT HEADER: Appears only during print/PDF generation */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-black pb-3 mb-3 text-black">
          <div>
            <h1 className="text-xl font-serif font-black uppercase tracking-wider text-black">
              Registre & Fiches Techniques de la Collection de Fossiles
            </h1>
            <p className="text-xs font-serif italic text-slate-700 mt-0.5">
              Inventaire scientifique et évaluation financière
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Valeur Totale Estimée</div>
            <div className="text-2xl font-serif font-black text-black">{totalValue.toFixed(2)} €</div>
            <div className="text-[10px] font-mono text-slate-600">
              {sheets.length} spécimen{sheets.length > 1 ? 's' : ''} ({boughtCount} achats, {prelevementCount} prélèvements)
            </div>
          </div>
        </div>

        {/* FIXED TOTAL VALUE BANNER: Remains FIXED at screen width when table scrolls horizontally */}
        <div className={`print:hidden p-4 sm:p-5 border-2 rounded-2xl shadow-xl transition-all flex flex-wrap items-center justify-between gap-4 sticky top-18 z-40 backdrop-blur-lg ${
          isLight 
            ? 'bg-white/95 border-slate-300 text-black shadow-slate-200/60' 
            : 'bg-[#0d1633]/95 border-[#D4AF37]/40 text-white shadow-black/60 ring-1 ring-[#D4AF37]/20'
        }`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`p-3 rounded-xl border flex items-center justify-center shrink-0 ${
              isLight ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]'
            }`}>
              <Coins size={28} />
            </div>
            <div>
              <span className={`block text-[11px] sm:text-xs font-serif uppercase tracking-widest font-black ${
                isLight ? 'text-slate-600' : 'text-[#D4AF37]'
              }`}>
                Valeur Totale du Registre
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-4xl font-serif italic font-black tracking-tight ${
                  isLight ? 'text-black' : 'text-white'
                }`}>
                  {totalValue.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-serif">
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#101A36] border-slate-700 text-slate-200'
            }`}>
              <Layers size={14} className={isLight ? 'text-slate-600' : 'text-[#D4AF37]'} />
              <span><strong>{sheets.length}</strong> spécimen{sheets.length > 1 ? 's' : ''}</span>
            </div>

            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-[#101A36] border-slate-700 text-slate-200'
            }`}>
              <Tag size={14} className={isLight ? 'text-emerald-700' : 'text-emerald-400'} />
              <span><strong>{boughtCount}</strong> achat{boughtCount > 1 ? 's' : ''}</span>
            </div>

            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}>
              <Compass size={14} />
              <span><strong>{prelevementCount}</strong> prélèvement{prelevementCount > 1 ? 's' : ''}</span>
            </div>

            {certifiedCount > 0 && (
              <div className={`px-3 py-1.5 rounded-xl border hidden lg:flex items-center gap-1.5 ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              }`}>
                <span><strong>{certifiedCount}</strong> certifié{certifiedCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* HORIZONTALLY SCROLLABLE TABLE CONTAINER (Screen) & FULL-WIDTH EXPANDED (Print) */}
        <div className={`w-full overflow-x-auto custom-scrollbar border rounded-2xl shadow-xl print:overflow-visible print:w-full print:border-none print:shadow-none ${
          isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/40 border-[#D4AF37]/25 text-white'
        }`}>
          <table className={`w-full min-w-[950px] print:min-w-full text-left border-collapse font-sans text-sm print:text-[9.5pt] ${
            isLight ? 'text-black' : 'text-white'
          }`}>
            <thead>
              <tr className={`border-b font-serif uppercase tracking-wider ${
                isLight 
                  ? 'bg-slate-100 border-slate-300 text-black font-black print:bg-slate-200' 
                  : 'bg-[#101A36] border-[#D4AF37]/30 text-[#D4AF37]'
              }`}>
                <th className="p-3.5 w-60 print:w-[22%] print:p-2">Nom du fossile</th>
                <th className="p-3.5 w-64 print:w-[22%] print:p-2">Provenance / Découverte</th>
                <th className="p-3.5 w-48 print:w-[16%] print:p-2">Datation (Période)</th>
                <th className="p-3.5 w-48 print:w-[15%] print:p-2">Acquisition / Type</th>
                <th className="p-3.5 w-48 print:w-[13%] print:p-2">Certificat</th>
                <th className="p-3.5 w-32 print:w-[12%] print:p-2 text-right">Prix (€)</th>
                {isEditing && <th className="p-3.5 w-16 print:hidden"></th>}
              </tr>
            </thead>

            <tbody>
              {sheets.map((sheet, index) => (
                <tr 
                  key={sheet.id} 
                  className={`border-b transition-colors print:border-black/30 print-avoid-break ${
                    isLight 
                      ? (index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/70') + ' border-slate-200' 
                      : (index % 2 === 0 ? 'bg-[#060B1A]/30 hover:bg-[#101A36]/60' : 'bg-[#0a1229]/40 hover:bg-[#101A36]/70') + ' border-[#D4AF37]/10'
                  }`}
                >
                  {/* Photo & Nom */}
                  <td className="p-3.5 align-top print:p-2">
                    {isEditing ? (
                      <div>
                        <input 
                          type="text" 
                          value={sheet.nom} 
                          onChange={e => update(sheet.id, 'nom', e.target.value)}
                          placeholder="Nom du fossile"
                          className={`w-full p-2 border rounded-xl outline-none mb-2 font-serif font-bold ${
                            isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                          }`}
                        />
                        <ImageUpload 
                          value={sheet.nomPhoto} 
                          onChange={val => update(sheet.id, 'nomPhoto', val)}
                          className={`h-20 w-full rounded-xl object-contain ${isLight ? 'bg-slate-100' : 'bg-[#060B1A]'}`}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <p className={`font-serif font-bold text-base leading-snug ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                          {sheet.nom || 'Sans nom'}
                        </p>
                        {sheet.nomPhoto && (
                          <div className="relative inline-block w-fit">
                            <img 
                              src={sheet.nomPhoto} 
                              alt={sheet.nom} 
                              className={`h-16 w-24 object-contain cursor-pointer rounded-lg p-0.5 border transition-all print:h-14 print:w-auto print:border-black/30 ${
                                isLight ? 'bg-slate-100 border-slate-200 hover:border-slate-400' : 'bg-[#060B1A]/60 border-[#D4AF37]/20 hover:border-[#D4AF37]/50'
                              }`} 
                              onClick={() => setEnlargedImage(sheet.nomPhoto)} 
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Provenance & Lieu */}
                  <td className="p-3.5 align-top print:p-2">
                    {isEditing ? (
                      <textarea 
                        value={sheet.provenance} 
                        onChange={e => update(sheet.id, 'provenance', e.target.value)}
                        placeholder="Provenance, pays, région, formation..."
                        className={`w-full p-2 border rounded-xl outline-none min-h-[4.5rem] resize-none text-xs ${
                          isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                        }`}
                      />
                    ) : (
                      <p className={`whitespace-pre-wrap leading-relaxed text-xs sm:text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        {sheet.provenance || 'Non renseignée'}
                      </p>
                    )}
                  </td>

                  {/* Datation & Période */}
                  <td className="p-3.5 align-top print:p-2">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input 
                          type="text" 
                          value={sheet.fossilDating || ''} 
                          onChange={e => update(sheet.id, 'fossilDating', e.target.value)}
                          placeholder="Datation (ex: -400 Ma)"
                          className={`w-full p-2 border rounded-xl outline-none text-xs ${
                            isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                          }`}
                        />
                        <input 
                          type="text" 
                          value={sheet.periode} 
                          onChange={e => update(sheet.id, 'periode', e.target.value)}
                          placeholder="Période (ex: Dévonien)"
                          className={`w-full p-2 border rounded-xl outline-none text-xs font-semibold ${
                            isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                          }`}
                        />
                      </div>
                    ) : (
                      <div>
                        <p className={`font-serif font-bold text-sm leading-tight ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                          {sheet.fossilDating || 'Non spécifiée'}
                        </p>
                        {sheet.periode && (
                          <p className={`text-xs mt-1 font-serif uppercase tracking-wider font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            {sheet.periode}
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Type / Acquisition */}
                  <td className="p-3.5 align-top print:p-2">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <select 
                          value={sheet.typeSheet || 'achat'} 
                          onChange={e => update(sheet.id, 'typeSheet', e.target.value)}
                          className={`w-full p-2 border rounded-xl outline-none text-xs font-semibold ${
                            isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                          }`}
                        >
                          <option value="achat">💰 Achat</option>
                          <option value="prelevement">⛏️ Prélèvement</option>
                        </select>

                        {(sheet.typeSheet || 'achat') === 'prelevement' ? (
                          <div className="flex flex-col gap-1.5">
                            <textarea 
                              value={sheet.datePrelevement || ''} 
                              onChange={e => update(sheet.id, 'datePrelevement', e.target.value)}
                              placeholder="Date de découverte"
                              className={`w-full p-2 border rounded-xl outline-none min-h-[2.5rem] resize-none text-xs ${
                                isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                              }`}
                            />
                            <textarea 
                              value={sheet.lieuPrelevement || ''} 
                              onChange={e => update(sheet.id, 'lieuPrelevement', e.target.value)}
                              placeholder="Lieu précis"
                              className={`w-full p-2 border rounded-xl outline-none min-h-[2.5rem] resize-none text-xs ${
                                isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                              }`}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <textarea 
                              value={sheet.dateAchat || ''} 
                              onChange={e => update(sheet.id, 'dateAchat', e.target.value)}
                              placeholder="Date d'achat"
                              className={`w-full p-2 border rounded-xl outline-none min-h-[2.5rem] resize-none text-xs ${
                                isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                              }`}
                            />
                            <textarea 
                              value={sheet.lieuAchat || ''} 
                              onChange={e => update(sheet.id, 'lieuAchat', e.target.value)}
                              placeholder="Lieu d'achat"
                              className={`w-full p-2 border rounded-xl outline-none min-h-[2.5rem] resize-none text-xs ${
                                isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs leading-relaxed">
                        {(sheet.typeSheet || 'achat') === 'prelevement' ? (
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1.5 border ${
                              isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/35'
                            }`}>⛏️ Prélèvement</span>
                            {sheet.datePrelevement && <p><span className="font-bold opacity-80">Date :</span> {sheet.datePrelevement}</p>}
                            {sheet.lieuPrelevement && <p><span className="font-bold opacity-80">Lieu :</span> {sheet.lieuPrelevement}</p>}
                            {!sheet.datePrelevement && !sheet.lieuPrelevement && <p className="italic opacity-60">Terrain</p>}
                          </div>
                        ) : (
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1.5 border ${
                              isLight ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/35'
                            }`}>💰 Achat</span>
                            {sheet.dateAchat && <p><span className="font-bold opacity-80">Date :</span> {sheet.dateAchat}</p>}
                            {sheet.lieuAchat && <p><span className="font-bold opacity-80">Lieu :</span> {sheet.lieuAchat}</p>}
                            {!sheet.dateAchat && !sheet.lieuAchat && <p className="italic opacity-60">Acquis</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Certificat */}
                  <td className="p-3.5 align-top print:p-2">
                    {isEditing ? (
                      (sheet.typeSheet || 'achat') === 'prelevement' ? (
                        <p className={`text-xs italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>N/A (Prélèvement)</p>
                      ) : (
                        <div>
                          <div className="flex gap-3 mb-2 text-xs font-semibold">
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
                              className={`h-16 w-full rounded-lg object-contain ${isLight ? 'bg-slate-50' : 'bg-[#060B1A]'}`}
                            />
                          )}
                        </div>
                      )
                    ) : (
                      (sheet.typeSheet || 'achat') === 'prelevement' ? (
                        <p className="text-xs italic opacity-60">N/A</p>
                      ) : (
                        <div>
                          <p className={`uppercase tracking-wider font-bold text-[11px] mb-1 ${
                            sheet.certificat === 'oui' 
                              ? (isLight ? 'text-emerald-700' : 'text-emerald-400') 
                              : 'opacity-60'
                          }`}>
                            {sheet.certificat === 'oui' ? '✓ Certifié' : sheet.certificat === 'non' ? 'Sans certificat' : '-'}
                          </p>
                          {sheet.certificat === 'oui' && sheet.certificatPhoto && (
                            <img 
                              src={sheet.certificatPhoto} 
                              alt="Certificat" 
                              className={`h-12 w-auto object-contain cursor-pointer rounded border p-0.5 transition-all print:h-10 print:border-black/30 ${
                                isLight ? 'bg-slate-100 border-slate-200 hover:border-slate-400' : 'border-[#D4AF37]/20 bg-[#060B1A]/50 hover:border-[#D4AF37]/50'
                              }`} 
                              onClick={() => setEnlargedImage(sheet.certificatPhoto)} 
                            />
                          )}
                        </div>
                      )
                    )}
                  </td>

                  {/* Prix (€) */}
                  <td className="p-3.5 align-top text-right print:p-2">
                    {isEditing ? (
                      (sheet.typeSheet || 'achat') === 'prelevement' ? (
                        <p className="text-xs italic opacity-60 text-right">-</p>
                      ) : (
                        <input 
                          type="text"
                          inputMode="decimal" 
                          value={sheet.prix === 0 || sheet.prix === undefined ? '' : sheet.prix} 
                          onChange={e => update(sheet.id, 'prix', e.target.value)}
                          placeholder="0 €"
                          className={`w-24 p-2 border rounded-xl outline-none text-right font-serif font-bold text-xs ${
                            isLight ? 'bg-slate-50 border-slate-300 text-black focus:border-black' : 'bg-[#060B1A] border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                          }`}
                        />
                      )
                    ) : (
                      (sheet.typeSheet || 'achat') === 'prelevement' ? (
                        <span className="text-xs italic opacity-50 font-serif">-</span>
                      ) : (
                        <span className={`font-serif italic font-bold text-sm sm:text-base ${
                          isLight ? 'text-black' : 'text-[#D4AF37]'
                        }`}>
                          {parseFossilPrice(sheet.prix) > 0 ? `${parseFossilPrice(sheet.prix).toFixed(2)} €` : '-'}
                        </span>
                      )
                    )}
                  </td>

                  {/* Edit remove button */}
                  {isEditing && (
                    <td className="p-3.5 align-top text-center print:hidden">
                      <button 
                        onClick={() => removeRow(sheet.id)} 
                        title="Supprimer la ligne"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {sheets.length === 0 && (
                <tr>
                  <td 
                    colSpan={isEditing ? 7 : 6} 
                    className={`p-12 text-center font-serif italic text-base border-b ${
                      isLight ? 'text-slate-500 border-slate-200 bg-slate-50' : 'text-slate-400 border-[#D4AF37]/10 bg-[#101A36]/10'
                    }`}
                  >
                    Aucune fiche technique enregistrée pour le moment. Cliquez sur Ajouter pour commencer.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer with Total summary row */}
            <tfoot>
              <tr className={`border-t-2 font-serif ${
                isLight 
                  ? 'bg-slate-100 border-slate-400 text-black' 
                  : 'bg-[#0c142e] border-[#D4AF37]/50 text-white'
              }`}>
                <td colSpan={5} className="p-4 font-bold uppercase tracking-wider text-xs sm:text-sm print:p-2">
                  Total de la collection ({sheets.length} spécimen{sheets.length > 1 ? 's' : ''})
                </td>
                <td className={`p-4 text-right font-serif font-black text-base sm:text-lg print:p-2 ${
                  isLight ? 'text-black' : 'text-[#D4AF37]'
                }`}>
                  {totalValue.toFixed(2)} €
                </td>
                {isEditing && <td className="print:hidden"></td>}
              </tr>
            </tfoot>
          </table>
        </div>

      </div>

      {/* Image zoom modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out flex-col print:hidden" 
          onClick={() => setEnlargedImage(null)}
        >
          <img src={enlargedImage} alt="Aperçu grand format" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          <p className="text-white mt-4 font-serif uppercase tracking-widest text-xs opacity-75">Cliquez n'importe où pour fermer</p>
        </div>
      )}
    </div>
  );
}
