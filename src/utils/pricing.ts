/**
 * Robust pricing utilities for fossil technical sheets and inventory evaluation
 */

export function parseFossilPrice(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) || val < 0 ? 0 : val;
  }
  if (typeof val === 'string') {
    let s = val.trim();
    if (!s) return 0;

    // Remove non-breaking spaces and invisible unicode whitespace characters
    s = s.replace(/[\s\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, '');

    // Remove common non-numeric currency words/symbols
    s = s.replace(/(?:EUR|€|\$|£|euros?|euro|ttc|ht|valeur|estimation|prix|environ|env\.?|~)/gi, '').trim();

    if (!s) return 0;

    // Handle string format with both dots and commas (e.g. "1.250,50" or "1,250.50")
    if (s.includes('.') && s.includes(',')) {
      const lastDot = s.lastIndexOf('.');
      const lastComma = s.lastIndexOf(',');
      if (lastComma > lastDot) {
        // "1.250,50" -> dots are thousands separators, comma is decimal
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        // "1,250.50" -> commas are thousands separators, dot is decimal
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',')) {
      // Only comma: e.g. "150,50" or "1500,00"
      s = s.replace(',', '.');
    } else if (s.includes('.')) {
      // Only dots:
      const parts = s.split('.');
      if (parts.length > 2) {
        // e.g. "1.000.000" -> all are thousand separators
        s = s.replace(/\./g, '');
      } else if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
        // In European numbers: "1.500" or "12.000" -> 1500, 12000 (3 digits after dot)
        s = parts[0] + parts[1];
      }
    }

    // Keep only digits, minus sign, and decimal point
    const cleaned = s.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) || !isFinite(num) || num < 0 ? 0 : num;
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

