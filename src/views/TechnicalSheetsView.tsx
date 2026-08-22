import React, { useState, useEffect } from 'react';
import { ChevronLeft, Home, Plus, Trash2, Edit2, Eye, Printer } from 'lucide-react';
import { TechnicalSheet } from '../types';
import { getSheets, saveSheets } from '../store';
import { v4 as uuidv4 } from 'uuid';
import ImageUpload from '../components/ImageUpload';

interface TechnicalSheetsViewProps {
  onBack: () => void;
}

export default function TechnicalSheetsView({ onBack }: TechnicalSheetsViewProps) {
  const [sheets, setSheets] = useState<TechnicalSheet[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    getSheets().then(s => setSheets(s));
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
      prix: 0
    };
    save([...sheets, newSheet]);
    setIsEditing(true);
  };

  const update = (id: string, field: keyof TechnicalSheet, value: any) => {
    const newSheets = sheets.map(s => s.id === id ? { ...s, [field]: value } : s);
    save(newSheets);
  };

  const removeRow = (id: string) => {
    save(sheets.filter(s => s.id !== id));
  };

  const totalValue = sheets.reduce((sum, s) => sum + (s.typeSheet === 'prelevement' ? 0 : (Number(s.prix) || 0)), 0);

  const handlePrint = () => {
    setIsEditing(false);
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#060B1A] bg-texture font-sans text-white">
      <div className="p-4 bg-[#060B1A]/95 border-b border-[#D4AF37]/20 flex items-center justify-between sticky top-0 z-50 print:hidden backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="flex items-center gap-2 p-2 text-slate-300 hover:text-[#D4AF37] hover:scale-110 active:scale-95 transition-all"><ChevronLeft size={24} /> <span className="hidden sm:inline font-serif tracking-widest text-sm uppercase">Retour</span></button>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold font-serif text-[#D4AF37] tracking-widest uppercase text-center flex-1 hidden sm:block animate-fade-in drop-shadow-sm">Fiches Techniques</h2>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsEditing(!isEditing)} className={`px-4 py-2 border-2 border-[#D4AF37]/40 rounded-xl transition-all flex items-center gap-2 font-serif uppercase tracking-wider text-sm animate-fade-in ${isEditing ? 'bg-[#D4AF37] text-[#060B1A] font-bold' : 'bg-transparent text-white hover:bg-[#101A36] hover:border-[#D4AF37]'}`}>
            {isEditing ? <><Eye size={18} /><span className="hidden sm:inline">Visualisation</span></> : <><Edit2 size={18} /><span className="hidden sm:inline">Édition</span></>}
          </button>
          <button onClick={addRow} className="px-4 py-2 bg-[#D4AF37] text-[#060B1A] font-bold hover:bg-[#FFD700] rounded-xl transition-all flex items-center gap-2 font-serif uppercase tracking-wider text-sm animate-fade-in delay-100">
            <Plus size={20} /> <span className="hidden sm:inline">Ajouter</span>
          </button>
          <button onClick={handlePrint} className="p-2 border-2 border-[#D4AF37]/30 text-slate-300 hover:border-[#D4AF37] hover:text-[#D4AF37] rounded-xl transition-all">
            <Printer size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-x-auto print:overflow-visible print:p-0">
        
        <div className="min-w-[1000px] max-w-full 2xl:max-w-[1800px] print:min-w-0 print:w-full mx-auto bg-[#101A36]/40 border-2 border-[#D4AF37]/20 rounded-3xl overflow-hidden print:border-none print:shadow-none shadow-2xl">
          <table className="w-full text-left border-collapse font-sans text-white">
            <thead>
              <tr className="bg-[#101A36] border-b border-[#D4AF37]/30 font-serif uppercase tracking-widest text-[#D4AF37]">
                <th className="p-4 w-64">Nom du fossile (photo)</th>
                <th className="p-4">Provenance et lieu de découverte</th>
                <th className="p-4">Datation exacte (Période)</th>
                <th className="p-4">Type / Acquisition</th>
                <th className="p-4 w-64">Certificat / Détails</th>
                <th className="p-4 w-32">Prix (€)</th>
                {isEditing && <th className="p-4 w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {sheets.map(sheet => (
                <tr key={sheet.id} className="border-b border-[#D4AF37]/10 hover:bg-[#101A36]/40 transition-colors">
                  <td className="p-4">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={sheet.nom} 
                        onChange={e => update(sheet.id, 'nom', e.target.value)}
                        placeholder="Nom"
                        className="w-full p-2 border border-[#D4AF37]/20 rounded-xl focus:border-[#D4AF37] outline-none mb-2 bg-[#060B1A] text-white"
                      />
                    ) : (
                      <p className="font-serif font-bold text-lg mb-2 text-[#D4AF37]">{sheet.nom}</p>
                    )}
                    {isEditing ? (
                      <ImageUpload 
                        value={sheet.nomPhoto} 
                        onChange={val => update(sheet.id, 'nomPhoto', val)}
                        className="h-20 w-full rounded-xl object-contain bg-[#060B1A]"
                      />
                    ) : (
                      sheet.nomPhoto && (
                        <div className="relative">
                          <img src={sheet.nomPhoto} alt={sheet.nom} className="h-20 w-full object-contain cursor-pointer rounded-xl bg-[#060B1A]/40 p-1 border border-[#D4AF37]/15 hover:border-[#D4AF37]/40 transition-all" onClick={() => setEnlargedImage(sheet.nomPhoto)} />
                        </div>
                      )
                    )}
                  </td>
                  <td className="p-4">
                    {isEditing ? (
                      <textarea 
                        value={sheet.provenance} 
                        onChange={e => update(sheet.id, 'provenance', e.target.value)}
                        className="w-full p-2 border border-[#D4AF37]/20 rounded-xl focus:border-[#D4AF37] outline-none min-h-[4rem] bg-[#060B1A] text-white resize-none"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-slate-300">{sheet.provenance}</p>
                    )}
                  </td>
                  <td className="p-4">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input 
                          type="text" 
                          value={sheet.fossilDating || ''} 
                          onChange={e => update(sheet.id, 'fossilDating', e.target.value)}
                          placeholder="Datation exacte"
                          className="w-full p-2 border border-[#D4AF37]/20 rounded-xl focus:border-[#D4AF37] outline-none bg-[#060B1A] text-white"
                        />
                        <input 
                          type="text" 
                          value={sheet.periode} 
                          onChange={e => update(sheet.id, 'periode', e.target.value)}
                          placeholder="Période"
                          className="w-full p-2 border border-[#D4AF37]/20 rounded-xl focus:border-[#D4AF37] outline-none bg-[#060B1A] text-white text-xs"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="font-serif font-bold text-[#D4AF37] text-lg leading-tight">{sheet.fossilDating || 'Non spécifiée'}</p>
                        <p className="text-xs text-slate-400 mt-1">({sheet.periode})</p>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <select 
                          value={sheet.typeSheet || 'achat'} 
                          onChange={e => update(sheet.id, 'typeSheet', e.target.value)}
                          className="w-full p-2 border border-[#D4AF37]/20 rounded-xl focus:border-[#D4AF37] outline-none bg-[#060B1A] text-white text-xs font-semibold"
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
                              className="w-full p-2 border border-[#D4AF37]/20 rounded-xl focus:border-[#D4AF37] outline-none min-h-[3rem] bg-[#060B1A] text-white resize-none text-xs"
                            />
                            <textarea 
                              value={sheet.lieuPrelevement || ''} 
                              onChange={e => update(sheet.id, 'lieuPrelevement', e.target.value)}
                              placeholder="Lieu précis"
                              className="w-full p-2 border border-[#D4AF37]/20 rounded-xl focus:border-[#D4AF37] outline-none min-h-[3rem] bg-[#060B1A] text-white resize-none text-xs"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <textarea 
                              value={sheet.dateAchat || ''} 
                              onChange={e => update(sheet.id, 'dateAchat', e.target.value)}
                              placeholder="Date d'achat"
                              className="w-full p-2 border border-[#D4AF37]/20 rounded-xl focus:border-[#D4AF37] outline-none min-h-[3rem] bg-[#060B1A] text-white resize-none text-xs"
                            />
                            <textarea 
                              value={sheet.lieuAchat || ''} 
                              onChange={e => update(sheet.id, 'lieuAchat', e.target.value)}
                              placeholder="Lieu d'achat"
                              className="w-full p-2 border border-[#D4AF37]/20 rounded-xl focus:border-[#D4AF37] outline-none min-h-[3rem] bg-[#060B1A] text-white resize-none text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-300">
                        {(sheet.typeSheet || 'achat') === 'prelevement' ? (
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35 uppercase tracking-widest mb-2">⛏️ Prélèvement</span>
                            {sheet.datePrelevement && <p className="whitespace-pre-wrap text-sm"><span className="font-bold text-[#D4AF37]/80">Date :</span> {sheet.datePrelevement}</p>}
                            {sheet.lieuPrelevement && <p className="whitespace-pre-wrap text-sm"><span className="font-bold text-[#D4AF37]/80">Lieu :</span> {sheet.lieuPrelevement}</p>}
                          </div>
                        ) : (
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/35 uppercase tracking-widest mb-2">💰 Achat</span>
                            {sheet.dateAchat && <p className="whitespace-pre-wrap text-sm"><span className="font-bold text-[#D4AF37]/80">Date :</span> {sheet.dateAchat}</p>}
                            {sheet.lieuAchat && <p className="whitespace-pre-wrap text-sm"><span className="font-bold text-[#D4AF37]/80">Lieu :</span> {sheet.lieuAchat}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {isEditing ? (
                      (sheet.typeSheet || 'achat') === 'prelevement' ? (
                        <p className="text-xs text-slate-400 italic">Non applicable</p>
                      ) : (
                        <>
                          <div className="flex gap-4 mb-2">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" checked={sheet.certificat === 'oui'} onChange={() => update(sheet.id, 'certificat', 'oui')} className="accent-[#D4AF37]" /> Oui
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" checked={sheet.certificat === 'non'} onChange={() => update(sheet.id, 'certificat', 'non')} className="accent-[#D4AF37]" /> Non
                            </label>
                          </div>
                          {sheet.certificat === 'oui' && (
                            <div className="relative border border-[#D4AF37]/30 p-1 bg-[#060B1A] rounded-xl">
                              <ImageUpload 
                                value={sheet.certificatPhoto} 
                                onChange={val => update(sheet.id, 'certificatPhoto', val)}
                                className="h-20 w-full cursor-pointer object-contain"
                              />
                              {sheet.certificatPhoto && (
                                <button onClick={() => setEnlargedImage(sheet.certificatPhoto)} className="absolute inset-0 w-full h-full text-transparent hover:bg-black/20 focus:outline-none transition-colors">Agrandir</button>
                              )}
                            </div>
                          )}
                        </>
                      )
                    ) : (
                      (sheet.typeSheet || 'achat') === 'prelevement' ? (
                        <p className="text-xs text-slate-500 italic">Non applicable</p>
                      ) : (
                        <>
                          <p className={`uppercase tracking-widest font-bold text-xs mb-2 ${sheet.certificat === 'oui' ? 'text-emerald-400' : 'text-slate-400'}`}>{sheet.certificat === 'oui' ? 'Certifié Oui' : sheet.certificat === 'non' ? 'Pas de certificat' : ''}</p>
                          {sheet.certificat === 'oui' && sheet.certificatPhoto && (
                            <img src={sheet.certificatPhoto} alt="Certificat" className="h-20 w-auto object-contain cursor-pointer rounded-xl border border-[#D4AF37]/15 p-1 bg-[#060B1A]/40 hover:border-[#D4AF37]/40 transition-all" onClick={() => setEnlargedImage(sheet.certificatPhoto)} />
                          )}
                        </>
                      )
                    )}
                  </td>
                  <td className="p-4">
                    {isEditing ? (
                      (sheet.typeSheet || 'achat') === 'prelevement' ? (
                        <p className="text-xs text-slate-400 italic">-</p>
                      ) : (
                        <input 
                          type="number" 
                          value={sheet.prix || ''} 
                          onChange={e => update(sheet.id, 'prix', Number(e.target.value))}
                          className="w-full p-2 border border-[#D4AF37]/20 rounded-xl focus:border-[#D4AF37] outline-none bg-[#060B1A] text-white"
                        />
                      )
                    ) : (
                      (sheet.typeSheet || 'achat') === 'prelevement' ? (
                        <p className="text-slate-500 italic font-bold">-</p>
                      ) : (
                        <p className="font-serif italic font-bold text-[#D4AF37]">{sheet.prix ? `${sheet.prix} €` : '-'}</p>
                      )
                    )}
                  </td>
                  {isEditing && (
                    <td className="p-4 text-center">
                      <button onClick={() => removeRow(sheet.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors hover:scale-110"><Trash2 size={20} /></button>
                    </td>
                  )}
                </tr>
              ))}
              {sheets.length === 0 && (
                <tr>
                  <td colSpan={isEditing ? 7 : 6} className="p-12 text-center text-slate-400 font-serif italic text-lg border-b border-[#D4AF37]/10 bg-[#101A36]/10">Aucune fiche technique. Cliquez sur Ajouter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 bg-[#101A36]/60 p-6 border-2 border-[#D4AF37]/30 rounded-3xl inline-block shadow-lg">
          <h3 className="text-xl font-serif text-[#D4AF37] uppercase tracking-widest">Valeur totale du registre</h3>
          <p className="text-4xl font-serif italic text-white font-bold mt-2">{totalValue.toFixed(2)} €</p>
        </div>
      </div>

      {enlargedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out flex-col print:hidden" onClick={() => setEnlargedImage(null)}>
          <img src={enlargedImage} alt="Visuel" className="max-w-full max-h-full object-contain" />
          <p className="text-white mt-4 font-sans text-sm tracking-widest">Cliquez n'importe où pour fermer</p>
        </div>
      )}
    </div>
  );
}
