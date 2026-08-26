/**
 * Robust pricing utilities for fossil technical sheets and inventory evaluation
 */

export function parseFossilPrice(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
  if (typeof val === 'string') {
    // Replace commas with dot, remove spaces, non-numeric characters (except digits, minus, and dot)
    const cleaned = val.replace(/\s+/g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  }
  return 0;
}

export function formatFossilPrice(val: any): string {
  const num = parseFossilPrice(val);
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
