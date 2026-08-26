import { Period } from '../types';

export type DatingUnit = 'Ma' | 'ka' | 'unknown';

export interface SubPeriodBoundary {
  name: string;
  era: Period;
  minMa: number;
  maxMa: number;
  label: string;
}

export const CHRONOLOGICAL_SUBPERIODS: SubPeriodBoundary[] = [
  { name: 'Précambrien', era: 'Precambrien', minMa: 541, maxMa: 4600, label: '4600 à 541 Ma' },
  { name: 'Cambrien', era: 'Paléozoïque', minMa: 485, maxMa: 541, label: '541 à 485 Ma' },
  { name: 'Ordovicien', era: 'Paléozoïque', minMa: 443, maxMa: 485, label: '485 à 443 Ma' },
  { name: 'Silurien', era: 'Paléozoïque', minMa: 419, maxMa: 443, label: '443 à 419 Ma' },
  { name: 'Dévonien', era: 'Paléozoïque', minMa: 359, maxMa: 419, label: '419 à 359 Ma' },
  { name: 'Carbonifère', era: 'Paléozoïque', minMa: 299, maxMa: 359, label: '359 à 299 Ma' },
  { name: 'Permien', era: 'Paléozoïque', minMa: 252, maxMa: 299, label: '299 à 252 Ma' },
  { name: 'Trias', era: 'Mésozoïque', minMa: 201, maxMa: 252, label: '252 à 201 Ma' },
  { name: 'Jurassique', era: 'Mésozoïque', minMa: 145, maxMa: 201, label: '201 à 145 Ma' },
  { name: 'Crétacé', era: 'Mésozoïque', minMa: 66, maxMa: 145, label: '145 à 66 Ma' },
  { name: 'Paléogène', era: 'Cénozoïque', minMa: 23, maxMa: 66, label: '66 à 23 Ma' },
  { name: 'Néogène', era: 'Cénozoïque', minMa: 2.58, maxMa: 23, label: '23 à 2.58 Ma' },
  { name: 'Quaternaire', era: 'Cénozoïque', minMa: 0, maxMa: 2.58, label: '2.58 Ma à aujourd\'hui' },
];

export interface ClassificationResult {
  period: Period; // Main era
  subPeriod: string; // Sub-period (e.g. Jurassique)
  mode: 'exact_ma' | 'exact_ka' | 'species_reign';
  explanation: string;
  ageInMa?: number;
}

/**
 * Automatically determines the Era and Sub-period based on the fossil's exact dating or species lifespan.
 */
export function calculateFossilClassification(
  datingUnit: DatingUnit = 'Ma',
  datingValue: string = '',
  periodStart: string = 'Jurassique',
  periodEnd: string = ''
): ClassificationResult {
  // Case 1: Exact date provided in Millions of years (Ma) or Thousand of years (ka)
  if (datingUnit !== 'unknown' && datingValue.trim() !== '') {
    const rawNum = parseFloat(datingValue.replace(/\s+/g, '').replace(',', '.'));
    if (!isNaN(rawNum) && rawNum >= 0) {
      const ageInMa = datingUnit === 'ka' ? rawNum / 1000 : rawNum;

      // Find matching geological period
      let matched = CHRONOLOGICAL_SUBPERIODS.find(p => {
        if (p.name === 'Précambrien') {
          return ageInMa >= p.minMa;
        }
        return ageInMa >= p.minMa && ageInMa <= p.maxMa;
      });

      // Fallback if very high number
      if (!matched && ageInMa > 4600) {
        matched = CHRONOLOGICAL_SUBPERIODS[0]; // Précambrien
      }

      if (matched) {
        const unitLabel = datingUnit === 'ka' 
          ? `${rawNum.toLocaleString('fr-FR')} mille ans (${ageInMa < 1 ? (ageInMa * 1000).toLocaleString('fr-FR') + ' ans' : ageInMa + ' Ma'})` 
          : `${rawNum.toLocaleString('fr-FR')} Ma`;

        return {
          period: matched.era,
          subPeriod: matched.name,
          mode: datingUnit === 'ka' ? 'exact_ka' : 'exact_ma',
          explanation: `Classé automatiquement dans le ${matched.era} (${matched.name}) d'après la datation exacte de ${unitLabel}.`,
          ageInMa
        };
      }
    }
  }

  // Case 2: Exact date is unknown or not given -> Classify by species lifespan (beginning of reign)
  const startIdx = CHRONOLOGICAL_SUBPERIODS.findIndex(p => p.name === periodStart);
  const endIdx = periodEnd ? CHRONOLOGICAL_SUBPERIODS.findIndex(p => p.name === periodEnd) : startIdx;

  let effectiveIdx = startIdx >= 0 ? startIdx : 8; // Default to Jurassique if unknown
  if (startIdx >= 0 && endIdx >= 0) {
    // Earliest in chronological history is the minimum index (index 0 is Précambrien = oldest)
    effectiveIdx = Math.min(startIdx, endIdx);
  }

  const reignStartPeriod = CHRONOLOGICAL_SUBPERIODS[effectiveIdx];

  const spanExplanation = periodEnd && periodEnd !== periodStart
    ? `Espèce à cheval sur plusieurs époques (${periodStart} ➔ ${periodEnd}). Classé sur le début de son règne géologique (${reignStartPeriod.name}).`
    : `Classé d'après la période de vie de l'espèce (${reignStartPeriod.name}).`;

  return {
    period: reignStartPeriod.era,
    subPeriod: reignStartPeriod.name,
    mode: 'species_reign',
    explanation: `Datation exacte inconnue : ${spanExplanation} ➔ Rangé dans l'ère ${reignStartPeriod.era}.`
  };
}

/**
 * Formats a clean dating label string to be saved in fossilDating & technical sheet
 */
export function formatFossilDatingString(
  datingUnit: DatingUnit,
  datingValue: string,
  datingPrecision: string,
  periodStart: string,
  periodEnd: string
): string {
  if (datingUnit !== 'unknown' && datingValue.trim()) {
    const rawNum = parseFloat(datingValue.replace(/\s+/g, '').replace(',', '.'));
    const valFormatted = !isNaN(rawNum) ? rawNum.toLocaleString('fr-FR') : datingValue;
    const unitText = datingUnit === 'ka' ? 'mille ans' : 'Ma (Millions d\'années)';
    const precisionText = datingPrecision.trim() ? ` — ${datingPrecision.trim()}` : '';
    return `~${valFormatted} ${unitText}${precisionText}`;
  }

  const periodSpan = periodEnd && periodEnd !== periodStart ? `${periodStart} à ${periodEnd}` : periodStart;
  const precisionText = datingPrecision.trim() ? ` (${datingPrecision.trim()})` : '';
  return `Datation inconnue — Période de vie : ${periodSpan}${precisionText}`;
}
