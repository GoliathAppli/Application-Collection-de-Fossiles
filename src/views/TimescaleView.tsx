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
import { geologicalEras, subPeriodsDetails, allSubPeriods } from '../geology';
import { calculateFossilClassification } from '../utils/dating';

interface TimescaleViewProps {
  fossils: Fossil[];
  onBack: () => void;
  onNavigateToPeriod: (period: Period) => void;
  onEditFossil: (fossil: Fossil) => void;
  isLight?: boolean;
}

export function getFossilSubPeriod(fossil: Fossil): string {
  // 1. If detailedPeriodStart is a known subperiod
  if (fossil.detailedPeriodStart && allSubPeriods.includes(fossil.detailedPeriodStart)) {
    return fossil.detailedPeriodStart;
  }
  // 2. If period itself is a subperiod
  if (fossil.period && allSubPeriods.includes(fossil.period)) {
    return fossil.period;
  }
  // 3. If datingValue/datingUnit exists, calculate using calculateFossilClassification
  if (fossil.datingValue) {
    const classification = calculateFossilClassification(
      fossil.datingUnit || 'Ma',
      fossil.datingValue,
      fossil.detailedPeriodStart || 'Jurassique',
      fossil.detailedPeriodEnd
    );
    if (classification && classification.subPeriod) {
      return classification.subPeriod;
    }
  }
  // 4. Fallback based on era
  if (fossil.period === 'Precambrien') return 'Précambrien';
  if (fossil.period === 'Paléozoïque') return 'Cambrien';
  if (fossil.period === 'Mésozoïque') return 'Jurassique';
  if (fossil.period === 'Cénozoïque') return 'Quaternaire';

  return 'Jurassique';
}

export function getFossilEra(fossil: Fossil): string {
  if (fossil.period && ['Precambrien', 'Paléozoïque', 'Mésozoïque', 'Cénozoïque'].includes(fossil.period)) {
    return fossil.period;
  }
  const sub = getFossilSubPeriod(fossil);
  const era = geologicalEras.find(e => e.subPeriods.includes(sub));
  return era ? era.name : 'Mésozoïque';
}

export default function TimescaleView({ fossils, onBack, onNavigateToPeriod, onEditFossil, isLight = false }: TimescaleViewProps) {
  const [selectedEra, setSelectedEra] = useState<string | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // default: newest to oldest (desc)
  const [activeTab, setActiveTab] = useState<'timeline' | 'dashboard'>('timeline');
  const [selectedSubPeriod, setSelectedSubPeriod] = useState<string | null>(null);

  // Group fossils by sub-period for stats and lists
  const fossilsByPeriod = useMemo(() => {
    const map: Record<string, Fossil[]> = {};
    allSubPeriods.forEach(sub => {
      map[sub] = [];
    });

    fossils.forEach(fossil => {
      const subPeriodName = getFossilSubPeriod(fossil);
      if (!map[subPeriodName]) map[subPeriodName] = [];
      map[subPeriodName].push(fossil);
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
      const eraName = getFossilEra(f);
      if (eraCounts[eraName] !== undefined) {
        eraCounts[eraName]++;
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

    if (selectedEra !== 'all') {
      list = list.filter(item => item.eraName === selectedEra);
    }

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
    <div className={`flex flex-col min-h-screen font-sans max-w-full overflow-x-hidden transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0] text-black' : 'bg-[#060B1A] bg-texture text-white'}`}>
      {/* Header bar */}
      <div className={`p-2.5 sm:p-4 border-b flex items-center justify-between sticky top-0 z-40 backdrop-blur-md gap-1.5 sm:gap-4 transition-colors duration-300 ${isLight ? 'bg-[#F7F5F0]/95 border-slate-200 text-black' : 'bg-[#060B1A]/95 border-[#D4AF37]/20 text-white'}`}>
        <div className="flex items-center shrink-0">
          <button onClick={onBack} className={`flex items-center gap-1 p-1.5 hover:scale-110 active:scale-95 transition-all cursor-pointer ${isLight ? 'text-black hover:text-[#D4AF37]' : 'text-slate-300 hover:text-[#D4AF37]'}`}>
            <ChevronLeft size={22} /> 
            <span className="hidden md:inline font-serif tracking-widest text-xs uppercase font-bold text-black">Retour</span>
          </button>
        </div>
        <h2 className={`text-xs xs:text-sm sm:text-lg md:text-2xl font-bold font-serif tracking-widest uppercase flex-1 text-center drop-shadow-sm flex items-center justify-center gap-1 sm:gap-2 truncate ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
          <Layers size={16} className={`${isLight ? 'text-black' : 'text-[#D4AF37] animate-pulse'} shrink-0 hidden sm:inline-block`} />
          <span className={isLight ? 'text-black' : 'text-[#D4AF37]'}>Échelle des Temps Géologiques</span>
        </h2>
        <div className={`flex items-center gap-1 p-0.5 sm:p-1 border rounded-xl shrink-0 ${isLight ? 'bg-white border-slate-300 shadow-sm' : 'bg-[#101A36]/60 border-[#D4AF37]/20'}`}>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-serif uppercase tracking-wider font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'timeline' ? (isLight ? 'bg-black text-white shadow-sm' : 'bg-[#D4AF37] text-[#060B1A]') : (isLight ? 'text-black hover:bg-slate-100' : 'text-slate-300 hover:text-white')}`}
          >
            Fresque
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-serif uppercase tracking-wider font-bold transition-all cursor-pointer whitespace-nowrap ${activeTab === 'dashboard' ? (isLight ? 'bg-black text-white shadow-sm' : 'bg-[#D4AF37] text-[#060B1A]') : (isLight ? 'text-black hover:bg-slate-100' : 'text-slate-300 hover:text-white')}`}
          >
            <span className="xs:hidden">Stats</span>
            <span className="hidden xs:inline">Statistiques</span>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6 relative z-10 pb-20">
        
        {/* Dynamic header / Intro */}
        <div className={`text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border shadow-sm transition-colors ${isLight ? 'bg-white border-slate-200 text-black' : 'bg-[#101A36]/40 border-white/5 shadow-inner'}`}>
          <div>
            <h1 className={`text-xl md:text-2xl font-serif font-bold ${isLight ? 'text-black' : 'text-white'}`}>Échelle des Temps Géologiques</h1>
            <p className={`text-xs md:text-sm font-sans mt-1 ${isLight ? 'text-black font-semibold' : 'text-slate-400'}`}>Explorez les époques géologiques et découvrez la répartition de votre collection privée sur l'échelle des temps de la vie.</p>
          </div>
          
          <button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className={`self-center md:self-auto px-4 py-2 rounded-xl text-xs font-serif tracking-widest uppercase font-bold transition-all flex items-center gap-2 cursor-pointer shadow ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-black border border-slate-300' : 'bg-[#D4AF37]/15 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/30'}`}
          >
            <ArrowUpDown size={14} className="text-black" />
            <span className={isLight ? 'text-black font-bold' : 'text-[#D4AF37]'}>{sortOrder === 'desc' ? 'Du plus récent au plus ancien' : 'Du plus ancien au plus récent'}</span>
          </button>
        </div>

        {/* Dashboard statistics section */}
        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-fade-in">
            {/* Completeness Card */}
            <div className={`p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden group transition-all border ${isLight ? 'bg-white border-slate-200 text-black shadow-sm hover:border-slate-400' : 'border-[#D4AF37]/25 bg-[#101A36]/60 hover:border-[#D4AF37]/55'}`}>
              <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                <CheckCircle2 size={96} />
              </div>
              <span className={`text-[10px] font-serif uppercase tracking-wider font-bold ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Complétude de la fresque</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-serif font-extrabold ${isLight ? 'text-black' : 'text-white'}`}>{completenessPercent}%</span>
                <span className={`text-xs ${isLight ? 'text-black font-semibold' : 'text-slate-400'}`}>({representedPeriodsCount} / 13 périodes)</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden mt-1 border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#060B1A] border-white/5'}`}>
                <div className={`h-full rounded-full transition-all duration-1000 ${isLight ? 'bg-black' : 'bg-[#D4AF37]'}`} style={{ width: `${completenessPercent}%` }}></div>
              </div>
              <p className={`text-[11px] italic ${isLight ? 'text-black font-medium' : 'text-slate-400'}`}>Nombre d'époques géologiques distinctes représentées par au moins un de vos spécimens.</p>
            </div>

            {/* Total fossils Card */}
            <div className={`p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden group transition-all border ${isLight ? 'bg-white border-slate-200 text-black shadow-sm hover:border-slate-400' : 'border-[#D4AF37]/25 bg-[#101A36]/60 hover:border-[#D4AF37]/55'}`}>
              <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                <Clock size={96} />
              </div>
              <span className={`text-[10px] font-serif uppercase tracking-wider font-bold ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Total de Spécimens répertoriés</span>
              <div className={`text-4xl font-serif font-extrabold ${isLight ? 'text-black' : 'text-white'}`}>{fossils.length}</div>
              <p className={`text-[11px] italic ${isLight ? 'text-black font-medium' : 'text-slate-400'}`}>Total des fiches de fossiles enregistrées dans votre base de données.</p>
              <div className={`text-[10px] font-bold uppercase tracking-wider mt-auto flex items-center gap-1 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                <Sparkles size={11} /> Spécimens uniques et datés
              </div>
            </div>

            {/* Favorite Era Card */}
            <div className={`p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden group transition-all border ${isLight ? 'bg-white border-slate-200 text-black shadow-sm hover:border-slate-400' : 'border-[#D4AF37]/25 bg-[#101A36]/60 hover:border-[#D4AF37]/55'}`}>
              <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                <Flame size={96} />
              </div>
              <span className={`text-[10px] font-serif uppercase tracking-wider font-bold ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Ère de prédilection</span>
              <div className={`text-2xl font-serif font-extrabold truncate ${isLight ? 'text-black' : 'text-white'}`}>
                {favoriteEra ? favoriteEra.name : 'Aucune'}
              </div>
              {favoriteEra ? (
                <p className={`text-xs ${isLight ? 'text-black font-medium' : 'text-slate-300'}`}>
                  <span className={`font-bold ${isLight ? 'text-black underline' : 'text-[#D4AF37]'}`}>{favoriteEra.count} fossile{favoriteEra.count > 1 ? 's' : ''}</span> enregistré{favoriteEra.count > 1 ? 's' : ''} dans cette ère.
                </p>
              ) : (
                <p className={`text-xs ${isLight ? 'text-black font-medium' : 'text-slate-400'}`}>Aucun fossile enregistré.</p>
              )}
              <div className={`text-[10px] italic mt-auto ${isLight ? 'text-black font-medium' : 'text-slate-400'}`}>
                L'ère géologique dans laquelle vous possédez le plus de pièces.
              </div>
            </div>

            {/* Oldest Recorded specimen Card */}
            <div className={`p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden group transition-all border ${isLight ? 'bg-white border-slate-200 text-black shadow-sm hover:border-slate-400' : 'border-[#D4AF37]/25 bg-[#101A36]/60 hover:border-[#D4AF37]/55'}`}>
              <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                <Compass size={96} />
              </div>
              <span className={`text-[10px] font-serif uppercase tracking-wider font-bold ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Spécimen le plus ancien</span>
              <div className={`text-2xl font-serif font-extrabold truncate ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                {oldestRecordedPeriod ? oldestRecordedPeriod : 'Aucun'}
              </div>
              {oldestRecordedPeriod ? (
                <p className={`text-xs ${isLight ? 'text-black font-medium' : 'text-slate-300'}`}>
                  Datant d'environ <span className={`font-bold ${isLight ? 'text-black' : 'text-white'}`}>{subPeriodsDetails[oldestRecordedPeriod]?.age || ''}</span>.
                </p>
              ) : (
                <p className={`text-xs ${isLight ? 'text-black font-medium' : 'text-slate-400'}`}>Aucun fossile enregistré.</p>
              )}
              <div className={`text-[10px] italic mt-auto ${isLight ? 'text-black font-medium' : 'text-slate-400'}`}>
                La période la plus reculée représentée dans votre collection active.
              </div>
            </div>
          </div>
        ) : (
          /* Timeline Content View */
          <div className="flex flex-col gap-6 animate-fade-in">
            
            {/* Era Tabs filter bar */}
            <div className={`flex flex-wrap gap-2 p-1.5 border rounded-2xl shrink-0 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#060B1A] border-white/10'}`}>
              <button 
                onClick={() => setSelectedEra('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-serif uppercase tracking-wider font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  selectedEra === 'all' 
                    ? (isLight ? 'bg-black text-white border-black shadow-sm' : 'bg-[#D4AF37]/20 border-[#D4AF37] text-white shadow-[0_0_12px_rgba(212,175,55,0.25)]') 
                    : (isLight ? 'text-black border-slate-200 hover:bg-slate-100' : 'text-slate-200 hover:text-white border-white/10 hover:border-[#D4AF37]/40 bg-[#101A36]/40')
                }`}
              >
                🌍 Toutes les ères ({fossils.length})
              </button>
              
              {geologicalEras.map(era => {
                const eraFossilsCount = fossils.filter(f => getFossilEra(f) === era.name).length;
                const isSelected = selectedEra === era.name;
                return (
                  <button 
                    key={era.name}
                    onClick={() => setSelectedEra(era.name)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-serif uppercase tracking-wider font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-2 ${
                      isSelected 
                        ? (isLight ? 'bg-black text-white border-black shadow-sm' : 'bg-[#D4AF37]/20 text-white border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.25)]') 
                        : (isLight ? 'text-black border-slate-200 hover:bg-slate-100' : 'text-slate-200 hover:text-white border-white/10 hover:border-[#D4AF37]/40 bg-[#101A36]/40')
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${era.color}`} />
                    <span className={isLight ? (isSelected ? 'text-white font-bold' : 'text-black font-semibold') : 'text-white font-semibold'}>
                      {era.name} ({eraFossilsCount})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Vertical Chronology Line container */}
            <div className={`relative pl-1.5 xs:pl-3 sm:pl-8 border-l-2 ml-1 xs:ml-2 sm:ml-4 py-4 space-y-8 ${isLight ? 'border-slate-300' : 'border-[#D4AF37]/20'}`}>
              
              {filteredSubPeriods.map((subItem) => {
                const periodFossils = fossilsByPeriod[subItem.name] || [];
                const hasFossils = periodFossils.length > 0;
                const details = subPeriodsDetails[subItem.name];

                return (
                  <div key={subItem.name} className="relative group animate-fade-in">
                    
                    {/* Circle Node on the timeline */}
                    <div className={`absolute -left-[16px] xs:-left-[20px] sm:-left-[43px] top-6 w-7 h-7 xs:w-9 xs:h-9 rounded-full border-2 flex items-center justify-center transition-all ${isLight ? (hasFossils ? 'bg-white border-black text-black scale-110 shadow-md font-bold' : 'bg-white border-slate-300 text-black') : (hasFossils ? 'bg-[#060B1A] border-[#D4AF37] text-[#D4AF37] scale-110 shadow-[0_0_12px_rgba(212,175,55,0.4)]' : 'bg-[#060B1A] border-slate-700 text-slate-500 hover:border-[#D4AF37]/40')}`}>
                      {hasFossils ? (
                        <CheckCircle2 size={14} className={isLight ? 'text-black' : 'text-[#D4AF37]'} />
                      ) : (
                        <span className={`text-[9px] font-serif font-bold ${isLight ? 'text-black' : 'text-slate-400'}`}>{subItem.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Period Card */}
                    <div className={`border rounded-2xl xs:rounded-3xl p-3.5 xs:p-5 sm:p-8 transition-all relative overflow-hidden ${isLight ? `bg-white text-black shadow-md hover:border-slate-400 ${hasFossils ? 'border-black/30 ring-1 ring-black/5' : 'border-slate-200'}` : `bg-[#101A36]/45 text-white ${hasFossils ? 'border-[#D4AF37]/45 shadow-[0_4px_25px_rgba(212,175,55,0.06)]' : 'border-white/5 hover:border-white/15'}`}`}>
                      
                      {/* Colored Left indicator tag for Era */}
                      <div className={`absolute left-0 top-0 bottom-0 w-2.5 ${subItem.eraColor}`} />

                      {/* Header elements of Card */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 ml-0.5 xs:ml-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-serif uppercase tracking-widest flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border font-bold ${isLight ? 'bg-slate-100 text-black border-slate-300' : 'bg-[#060B1A]/60 text-slate-400 border-white/5'}`}>
                              <span className={`w-2 h-2 rounded-full ${subItem.eraColor}`} />
                              Ère {subItem.eraName}
                            </span>
                            {hasFossils && (
                              <span className={`text-[10px] font-serif uppercase tracking-widest px-2.5 py-0.5 rounded-md font-black flex items-center gap-1 border ${isLight ? 'bg-amber-100 border-amber-300 text-black' : 'bg-[#D4AF37]/15 border-[#D4AF37]/35 text-[#D4AF37]'}`}>
                                ⛏️ {periodFossils.length} Spécimen{periodFossils.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          <h3 className={`text-xl sm:text-2xl font-serif font-black tracking-widest uppercase flex items-center gap-2 transition-colors ${isLight ? 'text-black group-hover:text-slate-800' : 'text-white group-hover:text-[#D4AF37]'}`}>
                            {subItem.name}
                          </h3>

                          <div className={`flex flex-wrap items-center gap-1.5 mt-1 text-xs font-semibold font-sans ${isLight ? 'text-black' : 'text-slate-400'}`}>
                            <Calendar size={12} className={isLight ? 'text-black' : 'text-[#D4AF37]/70'} />
                            <span>Âge géologique : <strong className={`font-bold ${isLight ? 'text-black' : 'text-slate-200'}`}>{details?.age}</strong></span>
                            <span className={isLight ? 'text-slate-400 hidden xs:inline' : 'text-slate-600 hidden xs:inline'}>•</span>
                            <span className={isLight ? 'text-black font-semibold' : 'text-slate-500'}>Durée : {details?.duration}</span>
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 self-stretch xs:self-start md:self-auto shrink-0 mt-3 md:mt-0">
                          <button 
                            onClick={() => setSelectedSubPeriod(subItem.name)}
                            className={`p-2.5 rounded-xl border transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300' : 'bg-[#060B1A]/60 hover:bg-[#D4AF37]/10 text-slate-300 hover:text-white border-white/10 hover:border-[#D4AF37]/25'}`}
                            title="Informations complémentaires"
                          >
                            <Info size={14} className={`shrink-0 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`} />
                            <span className={`font-serif uppercase tracking-wider text-[10px] font-bold ${isLight ? 'text-black' : 'text-slate-200'}`}>
                              <span className="xs:hidden">Fiche Info</span>
                              <span className="hidden xs:inline">Fiche encyclopédique</span>
                            </span>
                          </button>

                          <button 
                            onClick={() => onNavigateToPeriod(subItem.eraName as Period)}
                            className={`px-3.5 py-2.5 rounded-xl text-xs font-serif tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${hasFossils ? (isLight ? 'bg-black text-white hover:bg-slate-800 shadow-sm' : 'bg-[#D4AF37] text-[#060B1A] hover:bg-[#FFD700]') : (isLight ? 'bg-slate-100 text-black border border-slate-300 hover:bg-slate-200' : 'bg-[#060B1A]/40 text-slate-400 border border-white/5 hover:border-[#D4AF37]/30 hover:text-white')}`}
                          >
                            <Eye size={13} className="shrink-0" />
                            <span>{hasFossils ? `Galerie (${periodFossils.length})` : 'Ouvrir'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Scientific description summary */}
                      <p className={`text-sm font-sans leading-relaxed mt-4 ml-0.5 xs:ml-2 max-w-4xl font-medium ${isLight ? 'text-black' : 'text-slate-300'}`}>
                        {details?.desc}
                      </p>

                      {/* Typical fauna keywords */}
                      {details?.typicalFauna && (
                        <div className={`flex flex-wrap items-center gap-1.5 mt-4 ml-0.5 xs:ml-2 border-t pt-3 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                          <span className={`text-[10px] font-serif uppercase tracking-wider font-black mr-1 ${isLight ? 'text-black' : 'text-slate-500'}`}>Faune / Flore typique :</span>
                          {details.typicalFauna.map(fauna => (
                            <span key={fauna} className={`text-xs font-sans px-2 py-0.5 rounded-lg border font-semibold ${isLight ? 'bg-slate-100 text-black border-slate-300' : 'text-slate-300 bg-[#060B1A]/50 border-white/5'}`}>
                              {fauna}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Specimen strip of this period if any exist */}
                      {hasFossils && (
                        <div className={`mt-6 ml-0.5 xs:ml-2 border-t-2 pt-5 ${isLight ? 'border-slate-200' : 'border-[#D4AF37]/20'}`}>
                          <h4 className={`text-xs font-serif uppercase tracking-widest font-black mb-3 flex items-center gap-2 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                            <Sparkles size={12} className={isLight ? 'text-black' : 'text-[#D4AF37]'} />
                            Vos fossiles répertoriés ({periodFossils.length})
                          </h4>
                          
                          {/* Horizontal scroll list of small fossil previews */}
                          <div className="flex overflow-x-auto gap-4 pb-2 custom-scrollbar">
                            {periodFossils.map(fossil => (
                              <div 
                                key={fossil.id}
                                onClick={() => onEditFossil(fossil)}
                                className={`shrink-0 w-64 p-3 rounded-2xl flex gap-3 items-center cursor-pointer transition-all hover:scale-[1.02] border ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-black shadow-sm' : 'bg-[#060B1A]/85 hover:bg-[#101A36] border-[#D4AF37]/20 hover:border-[#D4AF37]'}`}
                              >
                                {fossil.carouselImage || fossil.mainImage ? (
                                  <img 
                                    src={fossil.carouselImage || fossil.mainImage} 
                                    alt="" 
                                    className="w-12 h-12 object-cover rounded-xl border border-slate-300"
                                  />
                                ) : (
                                  <div className={`w-12 h-12 flex items-center justify-center rounded-xl border text-[9px] font-serif italic text-center leading-tight ${isLight ? 'bg-slate-200 border-slate-300 text-black' : 'bg-[#101A36] border-white/5 text-slate-500'}`}>Aucun visuel</div>
                                )}
                                <div className="overflow-hidden flex-1">
                                  <h5 className={`text-xs font-serif font-bold truncate ${isLight ? 'text-black hover:text-slate-700' : 'text-white hover:text-[#D4AF37]'}`}>{fossil.title || 'Sans titre'}</h5>
                                  <p className={`text-[10px] font-mono mt-0.5 font-bold truncate ${isLight ? 'text-black' : 'text-[#D4AF37]'}`} title={fossil.fossilDating}>
                                    ⏱️ {fossil.fossilDating || 'Datation indéfinie'}
                                  </p>
                                  <p className={`text-[9px] truncate mt-0.5 font-medium ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>
                                    📍 {fossil.discoveryLocation || 'Lieu inconnu'}
                                  </p>
                                </div>
                                <ArrowUpRight size={14} className={`shrink-0 ${isLight ? 'text-black' : 'text-slate-500 group-hover:text-[#D4AF37]'}`} />
                              </div>
                            ))}
                          </div>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md" onClick={() => setSelectedSubPeriod(null)}>
          <div className={`p-6 md:p-8 border-2 rounded-3xl max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar ${isLight ? 'bg-white border-slate-300 text-black' : 'bg-[#101A36] border-[#D4AF37]/45 text-white'}`} onClick={e => e.stopPropagation()}>
            
            {/* Colored top banner relative to Era */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-[#D4AF37]" />

            <button 
              onClick={() => setSelectedSubPeriod(null)} 
              className={`absolute top-4 right-4 text-sm font-sans hover:scale-105 font-bold ${isLight ? 'text-black hover:text-slate-700' : 'text-slate-400 hover:text-white'}`}
            >
              ✕ Fermer
            </button>

            <div className="mb-2">
              <span className={`text-[10px] font-serif uppercase tracking-widest font-black ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Informations Détaillées</span>
            </div>

            <h3 className={`text-3xl font-serif font-black uppercase border-b pb-2 tracking-widest leading-none ${isLight ? 'text-black border-slate-200' : 'text-[#D4AF37] border-[#D4AF37]/30'}`}>
              {selectedSubPeriod}
            </h3>

            <p className={`text-xs font-bold uppercase tracking-widest mt-2 ${isLight ? 'text-black' : 'text-slate-400'}`}>
              Âge : {activePeriodDetails.age} (durée : {activePeriodDetails.duration})
            </p>

            {/* Description */}
            <div className={`mt-6 text-sm leading-relaxed font-sans space-y-4 font-medium ${isLight ? 'text-black' : 'text-white/90'}`}>
              <p>{activePeriodDetails.desc}</p>
            </div>

            {/* Key geological events */}
            {activePeriodDetails.keyEvents && (
              <div className="mt-6">
                <h4 className={`text-xs font-serif uppercase tracking-widest font-black mb-2 flex items-center gap-1 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                  <Layers size={12} className={isLight ? 'text-black' : 'text-[#D4AF37]'} /> Événements Géologiques Clés
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activePeriodDetails.keyEvents.map((evt, idx) => (
                    <li key={idx} className={`text-xs font-sans flex items-start gap-1.5 font-medium ${isLight ? 'text-black' : 'text-slate-300'}`}>
                      <span className={`mt-0.5 font-bold ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>•</span>
                      <span>{evt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Typical Fauna detailed */}
            {activePeriodDetails.typicalFauna && (
              <div className={`mt-6 border-t pt-4 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                <h4 className={`text-xs font-serif uppercase tracking-widest font-black mb-2 flex items-center gap-1 ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>
                  <Compass size={12} className={isLight ? 'text-black' : 'text-[#D4AF37]'} /> Écosystème majeur et Biodiversité
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activePeriodDetails.typicalFauna.map((item, idx) => (
                    <span key={idx} className={`text-xs font-sans px-2.5 py-1 rounded-lg border font-semibold ${isLight ? 'bg-slate-100 text-black border-slate-300' : 'text-slate-200 bg-[#060B1A]/80 border-white/5'}`}>
                      🦕 {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Science fun fact */}
            {activePeriodDetails.funFact && (
              <div className={`mt-6 p-4 rounded-2xl border flex gap-3 ${isLight ? 'bg-amber-50/80 border-amber-300 text-black' : 'bg-[#060B1A]/80 border-[#D4AF37]/20 text-white'}`}>
                <div className={`p-2 rounded-xl self-start ${isLight ? 'bg-amber-100 text-black' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                  <BookOpen size={16} />
                </div>
                <div>
                  <h5 className={`text-xs font-serif uppercase tracking-widest font-black ${isLight ? 'text-black' : 'text-[#D4AF37]'}`}>Le saviez-vous ?</h5>
                  <p className={`text-xs font-sans mt-1 leading-relaxed italic font-medium ${isLight ? 'text-black' : 'text-slate-300'}`}>
                    "{activePeriodDetails.funFact}"
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons inside modal */}
            <div className="mt-8 flex flex-col xs:flex-row gap-3">
              <button 
                onClick={() => setSelectedSubPeriod(null)} 
                className={`w-full xs:flex-1 py-3 border font-serif font-bold uppercase tracking-widest transition-colors rounded-xl text-xs cursor-pointer text-center ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300' : 'bg-[#060B1A] hover:bg-slate-900 text-slate-300 border-white/10 hover:text-white'}`}
              >
                Fermer
              </button>
              
              <button 
                onClick={() => {
                  setSelectedSubPeriod(null);
                  onNavigateToPeriod(selectedSubPeriod as Period);
                }}
                className={`w-full xs:flex-1 py-3 font-serif font-bold uppercase tracking-widest transition-colors rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 text-center ${isLight ? 'bg-black hover:bg-slate-800 text-white shadow-sm' : 'bg-[#D4AF37] text-[#060B1A] hover:bg-[#FFD700]'}`}
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
