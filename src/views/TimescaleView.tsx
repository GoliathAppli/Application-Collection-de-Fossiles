import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  Sparkles, 
  Plus, 
  Calendar, 
  Compass, 
  Clock, 
  ArrowUpRight, 
  CheckCircle2, 
  Layers, 
  Flame, 
  ArrowUpDown,
  BookOpen,
  Info,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Fossil, Period } from '../types';
import { geologicalEras, subPeriodsDetails } from '../geology';

interface TimescaleViewProps {
  fossils: Fossil[];
  onBack: () => void;
  onNavigateToPeriod: (period: Period) => void;
  onEditFossil: (fossil: Fossil) => void;
}

export default function TimescaleView({ fossils, onBack, onNavigateToPeriod, onEditFossil }: TimescaleViewProps) {
  const [selectedEra, setSelectedEra] = useState<string | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // default: newest to oldest (desc)
  const [activeTab, setActiveTab] = useState<'timeline' | 'dashboard'>('timeline');
  const [selectedSubPeriod, setSelectedSubPeriod] = useState<string | null>(null);

  // Group fossils by period for stats and lists
  const fossilsByPeriod = useMemo(() => {
    const map: Record<string, Fossil[]> = {};
    fossils.forEach(fossil => {
      const periodName = fossil.period;
      if (!map[periodName]) map[periodName] = [];
      map[periodName].push(fossil);
    });
    return map;
  }, [fossils]);

  // Total represented periods
  const representedPeriodsCount = useMemo(() => {
    return Object.keys(fossilsByPeriod).filter(p => fossilsByPeriod[p]?.length > 0).length;
  }, [fossilsByPeriod]);

  // Completeness percentage of the timeline (out of 13 periods)
  const completenessPercent = useMemo(() => {
    return Math.round((representedPeriodsCount / 13) * 100);
  }, [representedPeriodsCount]);

  // Earliest period containing at least one fossil
  const oldestRecordedPeriod = useMemo(() => {
    // order of oldest:
    const chronologicalOrder = [
      'Précambrien', 'Cambrien', 'Ordovicien', 'Silurien', 'Dévonien', 
      'Carbonifère', 'Permien', 'Trias', 'Jurassique', 'Crétacé', 
      'Paléogène', 'Néogène', 'Quaternaire'
    ];
    for (const p of chronologicalOrder) {
      if (fossilsByPeriod[p] && fossilsByPeriod[p].length > 0) {
        return p;
      }
    }
    return null;
  }, [fossilsByPeriod]);

  // Favorite Era (Era with most fossils)
  const favoriteEra = useMemo(() => {
    const eraCounts: Record<string, number> = {
      'Precambrien': 0,
      'Paléozoïque': 0,
      'Mésozoïque': 0,
      'Cénozoïque': 0
    };

    fossils.forEach(f => {
      const era = geologicalEras.find(e => e.subPeriods.includes(f.period));
      if (era) {
        eraCounts[era.name] = (eraCounts[era.name] || 0) + 1;
      }
    });

    let maxEra = 'Mésozoïque';
    let maxVal = -1;
    Object.entries(eraCounts).forEach(([name, count]) => {
      if (count > maxVal) {
        maxVal = count;
        maxEra = name;
      }
    });

    return maxVal > 0 ? { name: maxEra, count: maxVal } : null;
  }, [fossils]);

  // Filter & sort subperiods
  const filteredSubPeriods = useMemo(() => {
    // List all 13 subperiods with their eras
    let list: Array<{ name: string; eraName: string; eraColor: string; eraTextColor: string }> = [];
    
    geologicalEras.forEach(era => {
      era.subPeriods.forEach(sub => {
        list.push({
          name: sub,
          eraName: era.name,
          eraColor: era.color,
          eraTextColor: era.textColor
        });
      });
    });

    // Filter by Era
    if (selectedEra !== 'all') {
      list = list.filter(item => item.eraName === selectedEra);
    }

    // Chronological Sort Order:
    // chronologicalOrder (asc): Précambrien, Cambrien, ..., Quaternaire
    const chronologicalOrder = [
      'Précambrien', 'Cambrien', 'Ordovicien', 'Silurien', 'Dévonien', 
      'Carbonifère', 'Permien', 'Trias', 'Jurassique', 'Crétacé', 
      'Paléogène', 'Néogène', 'Quaternaire'
    ];

    list.sort((a, b) => {
      const idxA = chronologicalOrder.indexOf(a.name);
      const idxB = chronologicalOrder.indexOf(b.name);
      return sortOrder === 'asc' ? idxA - idxB : idxB - idxA;
    });

    return list;
  }, [selectedEra, sortOrder]);

  const activePeriodDetails = selectedSubPeriod ? subPeriodsDetails[selectedSubPeriod] : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#060B1A] bg-texture font-sans text-white max-w-full overflow-x-hidden">
      {/* Header bar */}
      <div className="p-2.5 sm:p-4 bg-[#060B1A]/95 border-b border-[#D4AF37]/20 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md gap-1.5 sm:gap-4">
        <div className="flex items-center shrink-0">
          <button onClick={onBack} className="flex items-center gap-1 p-1.5 text-slate-300 hover:text-[#D4AF37] hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={22} /> 
            <span className="hidden md:inline font-serif tracking-widest text-xs uppercase">Retour</span>
          </button>
        </div>
        <h2 className="text-xs xs:text-sm sm:text-lg md:text-2xl font-bold font-serif tracking-widest text-[#D4AF37] uppercase flex-1 text-center drop-shadow-sm flex items-center justify-center gap-1 sm:gap-2 truncate">
          <Layers size={16} className="text-[#D4AF37] animate-pulse shrink-0 hidden sm:inline-block" />
          <span>Échelle Géologique</span>
        </h2>
        <div className="flex items-center gap-1 bg-[#101A36]/60 p-0.5 sm:p-1 border border-[#D4AF37]/20 rounded-xl shrink-0">
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-serif uppercase tracking-wider font-semibold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'timeline' ? 'bg-[#D4AF37] text-[#060B1A]' : 'text-slate-300 hover:text-white'}`}
          >
            Fresque
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-serif uppercase tracking-wider font-semibold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-[#060B1A]' : 'text-slate-300 hover:text-white'}`}
          >
            <span className="xs:hidden">Stats</span>
            <span className="hidden xs:inline">Statistiques</span>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6 relative z-10 pb-20">
        
        {/* Dynamic header / Intro */}
        <div className="text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101A36]/40 p-6 rounded-3xl border border-white/5 shadow-inner">
          <div>
            <h1 className="text-xl md:text-2xl font-serif text-white font-bold">La Fresque du Temps Terrestre</h1>
            <p className="text-xs md:text-sm text-slate-400 font-sans mt-1">Explorez les époques géologiques et découvrez la répartition de votre collection privée sur l'échelle des temps de la vie.</p>
          </div>
          
          <button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="self-center md:self-auto px-4 py-2 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl text-xs font-serif tracking-widest uppercase font-bold transition-all flex items-center gap-2 cursor-pointer shadow"
          >
            <ArrowUpDown size={14} />
            {sortOrder === 'desc' ? 'Du plus récent au plus ancien' : 'Du plus ancien au plus récent'}
          </button>
        </div>

        {/* Dashboard statistics section */}
        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in">
            {/* Completeness Card */}
            <div className="border border-[#D4AF37]/25 p-5 bg-[#101A36]/60 rounded-2xl flex flex-col gap-3 relative overflow-hidden group hover:border-[#D4AF37]/55 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-[#D4AF37] group-hover:scale-110 transition-transform">
                <CheckCircle2 size={96} />
              </div>
              <span className="text-[10px] font-serif uppercase tracking-wider text-[#D4AF37] font-semibold">Complétude de la fresque</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-serif font-extrabold text-white">{completenessPercent}%</span>
                <span className="text-xs text-slate-400">({representedPeriodsCount} / 13 périodes)</span>
              </div>
              <div className="w-full bg-[#060B1A] h-2 rounded-full overflow-hidden mt-1 border border-white/5">
                <div className="bg-[#D4AF37] h-full rounded-full transition-all duration-1000" style={{ width: `${completenessPercent}%` }}></div>
              </div>
              <p className="text-[11px] text-slate-400 italic">Nombre d'époques géologiques distinctes représentées par au moins un de vos spécimens.</p>
            </div>

            {/* Total fossils Card */}
            <div className="border border-[#D4AF37]/25 p-5 bg-[#101A36]/60 rounded-2xl flex flex-col gap-3 relative overflow-hidden group hover:border-[#D4AF37]/55 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-[#D4AF37] group-hover:scale-110 transition-transform">
                <Clock size={96} />
              </div>
              <span className="text-[10px] font-serif uppercase tracking-wider text-[#D4AF37] font-semibold">Total de Spécimens répertoriés</span>
              <div className="text-4xl font-serif font-extrabold text-white">{fossils.length}</div>
              <p className="text-[11px] text-slate-400 italic">Total des fiches de fossiles enregistrées dans votre base de données.</p>
              <div className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider mt-auto flex items-center gap-1">
                <Sparkles size={11} /> Spécimens uniques et datés
              </div>
            </div>

            {/* Favorite Era Card */}
            <div className="border border-[#D4AF37]/25 p-5 bg-[#101A36]/60 rounded-2xl flex flex-col gap-3 relative overflow-hidden group hover:border-[#D4AF37]/55 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-[#D4AF37] group-hover:scale-110 transition-transform">
                <Flame size={96} />
              </div>
              <span className="text-[10px] font-serif uppercase tracking-wider text-[#D4AF37] font-semibold">Ère de prédilection</span>
              <div className="text-2xl font-serif font-extrabold text-white truncate">
                {favoriteEra ? favoriteEra.name : 'Aucune'}
              </div>
              {favoriteEra ? (
                <p className="text-xs text-slate-300">
                  <span className="font-bold text-[#D4AF37]">{favoriteEra.count} fossile{favoriteEra.count > 1 ? 's' : ''}</span> enregistré{favoriteEra.count > 1 ? 's' : ''} dans cette ère.
                </p>
              ) : (
                <p className="text-xs text-slate-400">Aucun fossile enregistré.</p>
              )}
              <div className="text-[10px] text-slate-400 italic mt-auto">
                L'ère géologique dans laquelle vous possédez le plus de pièces.
              </div>
            </div>

            {/* Oldest Recorded specimen Card */}
            <div className="border border-[#D4AF37]/25 p-5 bg-[#101A36]/60 rounded-2xl flex flex-col gap-3 relative overflow-hidden group hover:border-[#D4AF37]/55 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-[#D4AF37] group-hover:scale-110 transition-transform">
                <Compass size={96} />
              </div>
              <span className="text-[10px] font-serif uppercase tracking-wider text-[#D4AF37] font-semibold">Spécimen le plus ancien</span>
              <div className="text-2xl font-serif font-extrabold text-[#D4AF37] truncate">
                {oldestRecordedPeriod ? oldestRecordedPeriod : 'Aucun'}
              </div>
              {oldestRecordedPeriod ? (
                <p className="text-xs text-slate-300">
                  Datant d'environ <span className="font-bold text-white">{subPeriodsDetails[oldestRecordedPeriod]?.age || ''}</span>.
                </p>
              ) : (
                <p className="text-xs text-slate-400">Aucun fossile enregistré.</p>
              )}
              <div className="text-[10px] text-slate-400 italic mt-auto">
                La période la plus reculée représentée dans votre collection active.
              </div>
            </div>
          </div>
        ) : (
          /* Timeline Content View */
          <div className="flex flex-col gap-6 animate-fade-in">
            
            {/* Era Tabs filter bar */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-[#060B1A] border border-white/5 rounded-2xl shrink-0">
              <button 
                onClick={() => setSelectedEra('all')}
                className={`px-3 py-2 rounded-xl text-xs font-serif uppercase tracking-wider font-bold transition-all cursor-pointer whitespace-nowrap ${selectedEra === 'all' ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-white' : 'text-slate-400 hover:text-white border border-transparent'}`}
              >
                🌍 Toutes les ères ({fossils.length})
              </button>
              
              {geologicalEras.map(era => {
                const eraFossilsCount = fossils.filter(f => era.subPeriods.includes(f.period)).length;
                return (
                  <button 
                    key={era.name}
                    onClick={() => setSelectedEra(era.name)}
                    className={`px-3 py-2 rounded-xl text-xs font-serif uppercase tracking-wider font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-2 ${selectedEra === era.name ? 'bg-[#101A36] text-white border-[#D4AF37]/50 shadow-md' : 'text-slate-400 hover:text-white border-transparent'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${era.color}`} />
                    {era.name} ({eraFossilsCount})
                  </button>
                );
              })}
            </div>

            {/* Vertical Chronology Line container */}
            <div className="relative pl-1.5 xs:pl-3 sm:pl-8 border-l-2 border-[#D4AF37]/20 ml-1 xs:ml-2 sm:ml-4 py-4 space-y-8">
              
              {filteredSubPeriods.map((subItem) => {
                const periodFossils = fossilsByPeriod[subItem.name] || [];
                const hasFossils = periodFossils.length > 0;
                const details = subPeriodsDetails[subItem.name];

                return (
                  <div key={subItem.name} className="relative group animate-fade-in">
                    
                    {/* Circle Node on the timeline */}
                    <div className={`absolute -left-[16px] xs:-left-[20px] sm:-left-[43px] top-6 w-7 h-7 xs:w-9 xs:h-9 rounded-full border-2 bg-[#060B1A] flex items-center justify-center transition-all ${hasFossils ? 'border-[#D4AF37] text-[#D4AF37] scale-110 shadow-[0_0_12px_rgba(212,175,55,0.4)]' : 'border-slate-700 text-slate-500 hover:border-[#D4AF37]/40'}`}>
                      {hasFossils ? (
                        <CheckCircle2 size={14} className="text-[#D4AF37]" />
                      ) : (
                        <span className="text-[9px] font-serif">{subItem.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Period Card */}
                    <div className={`border rounded-2xl xs:rounded-3xl p-3.5 xs:p-5 sm:p-8 transition-all relative overflow-hidden bg-[#101A36]/45 ${hasFossils ? 'border-[#D4AF37]/45 shadow-[0_4px_25px_rgba(212,175,55,0.06)]' : 'border-white/5 hover:border-white/15'}`}>
                      
                      {/* Colored Left indicator tag for Era */}
                      <div className={`absolute left-0 top-0 bottom-0 w-2.5 ${subItem.eraColor}`} />

                      {/* Header elements of Card */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 ml-0.5 xs:ml-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-serif uppercase tracking-widest text-slate-400 flex items-center gap-1.5 bg-[#060B1A]/60 px-2.5 py-0.5 rounded-md border border-white/5">
                              <span className={`w-1.5 h-1.5 rounded-full ${subItem.eraColor}`} />
                              Ère {subItem.eraName}
                            </span>
                            {hasFossils && (
                              <span className="text-[10px] font-serif uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/35 px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                                ⛏️ {periodFossils.length} Spécimen{periodFossils.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl sm:text-2xl font-serif font-black text-white tracking-widest uppercase flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                            {subItem.name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-400 font-semibold font-sans">
                            <Calendar size={12} className="text-[#D4AF37]/70" />
                            <span>Âge géologique : <strong className="text-slate-200">{details?.age}</strong></span>
                            <span className="text-slate-600 hidden xs:inline">•</span>
                            <span className="text-slate-500">Durée : {details?.duration}</span>
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 self-stretch xs:self-start md:self-auto shrink-0 mt-3 md:mt-0">
                          <button 
                            onClick={() => setSelectedSubPeriod(subItem.name)}
                            className="p-2.5 bg-[#060B1A]/60 hover:bg-[#D4AF37]/10 text-slate-400 hover:text-[#D4AF37] rounded-xl border border-white/5 hover:border-[#D4AF37]/25 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Informations complémentaires"
                          >
                            <Info size={14} className="shrink-0" />
                            <span className="font-serif uppercase tracking-wider text-[10px] font-bold">
                              <span className="xs:hidden">Fiche Info</span>
                              <span className="hidden xs:inline">Fiche encyclopédique</span>
                            </span>
                          </button>

                          <button 
                            onClick={() => onNavigateToPeriod(subItem.name as Period)}
                            className={`px-3.5 py-2.5 rounded-xl text-xs font-serif tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${hasFossils ? 'bg-[#D4AF37] text-[#060B1A] hover:bg-[#FFD700]' : 'bg-[#060B1A]/40 text-slate-400 border border-white/5 hover:border-[#D4AF37]/30 hover:text-white'}`}
                          >
                            <Eye size={13} className="shrink-0" />
                            <span>{hasFossils ? `Galerie (${periodFossils.length})` : 'Ouvrir'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Scientific description summary */}
                      <p className="text-sm font-sans text-slate-300 leading-relaxed mt-4 ml-0.5 xs:ml-2 max-w-4xl">
                        {details?.desc}
                      </p>

                      {/* Typical fauna keywords */}
                      {details?.typicalFauna && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-4 ml-0.5 xs:ml-2 border-t border-white/5 pt-3">
                          <span className="text-[10px] font-serif uppercase tracking-wider text-slate-500 font-bold mr-1">Faune / Flore typique :</span>
                          {details.typicalFauna.map(fauna => (
                            <span key={fauna} className="text-xs font-sans text-slate-300 bg-[#060B1A]/50 px-2 py-0.5 rounded-lg border border-white/5">
                              {fauna}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Specimen strip of this period if any exist */}
                      {hasFossils ? (
                        <div className="mt-6 ml-0.5 xs:ml-2 border-t-2 border-[#D4AF37]/20 pt-5">
                          <h4 className="text-xs font-serif uppercase tracking-widest text-[#D4AF37] font-bold mb-3 flex items-center gap-2">
                            <Sparkles size={12} />
                            Vos fossiles répertoriés ({periodFossils.length})
                          </h4>
                          
                          {/* Horizontal scroll list of small fossil previews */}
                          <div className="flex overflow-x-auto gap-4 pb-2 custom-scrollbar">
                            {periodFossils.map(fossil => (
                              <div 
                                key={fossil.id}
                                onClick={() => onEditFossil(fossil)}
                                className="shrink-0 w-64 p-3 bg-[#060B1A]/85 hover:bg-[#101A36] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded-2xl flex gap-3 items-center cursor-pointer transition-all hover:scale-[1.02]"
                              >
                                {fossil.carouselImage || fossil.mainImage ? (
                                  <img 
                                    src={fossil.carouselImage || fossil.mainImage} 
                                    alt="" 
                                    className="w-12 h-12 object-cover rounded-xl border border-white/10"
                                  />
                                ) : (
                                  <div className="w-12 h-12 flex items-center justify-center bg-[#101A36] rounded-xl border border-white/5 text-[9px] text-slate-500 font-serif italic text-center leading-tight">Aucun visuel</div>
                                )}
                                <div className="overflow-hidden flex-1">
                                  <h5 className="text-white text-xs font-serif font-bold truncate hover:text-[#D4AF37] transition-colors">{fossil.title || 'Sans titre'}</h5>
                                  <p className="text-[10px] text-[#D4AF37] font-mono mt-0.5 font-bold truncate" title={fossil.fossilDating}>
                                    ⏱️ {fossil.fossilDating || 'Datation indéfinie'}
                                  </p>
                                  <p className="text-[9px] text-slate-400 truncate mt-0.5">
                                    📍 {fossil.discoveryLocation || 'Lieu inconnu'}
                                  </p>
                                </div>
                                <ArrowUpRight size={14} className="text-slate-500 shrink-0 group-hover:text-[#D4AF37]" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* Empty/Register invitation */
                        <div className="mt-5 ml-0.5 xs:ml-2 border-t border-dashed border-white/5 pt-4">
                          <button
                            onClick={() => onNavigateToPeriod(subItem.name as Period)}
                            className="w-full py-4 border-2 border-dashed border-slate-700/50 hover:border-[#D4AF37]/50 bg-[#060B1A]/35 hover:bg-[#101A36]/30 text-slate-400 hover:text-white rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer group"
                          >
                            <Plus size={16} className="text-[#D4AF37] group-hover:scale-125 transition-transform" />
                            <span className="font-serif italic text-xs">Ajouter votre premier fossile du {subItem.name}</span>
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        )}

      </div>

      {/* Encyclopedic Info Modal for specific subperiod */}
      {selectedSubPeriod && activePeriodDetails && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-md" onClick={() => setSelectedSubPeriod(null)}>
          <div className="bg-[#101A36] p-6 md:p-8 border-2 border-[#D4AF37]/45 rounded-3xl max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            
            {/* Colored top banner relative to Era */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-[#D4AF37]" />

            <button 
              onClick={() => setSelectedSubPeriod(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-sans hover:scale-105"
            >
              ✕ Fermer
            </button>

            <div className="mb-2">
              <span className="text-[10px] font-serif uppercase tracking-widest text-[#D4AF37] font-bold">Informations Détaillées</span>
            </div>

            <h3 className="text-3xl font-serif font-black text-[#D4AF37] uppercase border-b border-[#D4AF37]/30 pb-2 tracking-widest leading-none">
              {selectedSubPeriod}
            </h3>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
              Âge : {activePeriodDetails.age} (durée : {activePeriodDetails.duration})
            </p>

            {/* Description */}
            <div className="mt-6 text-white/90 text-sm leading-relaxed font-sans space-y-4">
              <p>{activePeriodDetails.desc}</p>
            </div>

            {/* Key geological events */}
            {activePeriodDetails.keyEvents && (
              <div className="mt-6">
                <h4 className="text-xs font-serif uppercase tracking-widest text-[#D4AF37] font-bold mb-2 flex items-center gap-1">
                  <Layers size={12} /> Événements Géologiques Clés
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activePeriodDetails.keyEvents.map((evt, idx) => (
                    <li key={idx} className="text-xs text-slate-300 font-sans flex items-start gap-1.5">
                      <span className="text-[#D4AF37] mt-0.5">•</span>
                      <span>{evt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Typical Fauna detailed */}
            {activePeriodDetails.typicalFauna && (
              <div className="mt-6 border-t border-white/5 pt-4">
                <h4 className="text-xs font-serif uppercase tracking-widest text-[#D4AF37] font-bold mb-2 flex items-center gap-1">
                  <Compass size={12} /> Écosystème majeur et Biodiversité
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activePeriodDetails.typicalFauna.map((item, idx) => (
                    <span key={idx} className="text-xs font-sans text-slate-200 bg-[#060B1A]/80 px-2.5 py-1 rounded-lg border border-white/5">
                      🦕 {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Science fun fact */}
            {activePeriodDetails.funFact && (
              <div className="mt-6 p-4 bg-[#060B1A]/80 rounded-2xl border border-[#D4AF37]/20 flex gap-3">
                <div className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl self-start">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h5 className="text-xs font-serif uppercase tracking-widest text-[#D4AF37] font-bold">Le saviez-vous ?</h5>
                  <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed italic">
                    "{activePeriodDetails.funFact}"
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons inside modal */}
            <div className="mt-8 flex flex-col xs:flex-row gap-3">
              <button 
                onClick={() => setSelectedSubPeriod(null)} 
                className="w-full xs:flex-1 py-3 bg-[#060B1A] hover:bg-slate-900 text-slate-300 border border-white/10 font-serif font-bold uppercase tracking-widest hover:text-white transition-colors rounded-xl text-xs cursor-pointer text-center"
              >
                Fermer
              </button>
              
              <button 
                onClick={() => {
                  setSelectedSubPeriod(null);
                  onNavigateToPeriod(selectedSubPeriod as Period);
                }}
                className="w-full xs:flex-1 py-3 bg-[#D4AF37] text-[#060B1A] font-serif font-bold uppercase tracking-widest hover:bg-[#FFD700] transition-colors rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 text-center"
              >
                <Eye size={14} className="shrink-0" />
                <span>Explorer l'époque</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
