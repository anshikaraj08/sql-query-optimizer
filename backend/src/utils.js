export function splitTopLevel(text, delimiter = ',') {
  const out = []; let current = ''; let depth = 0; let quote = null;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quote) { current += char; if (char === quote && text[i - 1] !== '\\') quote = null; continue; }
    if (char === "'" || char === '"') { quote = char; current += char; continue; }
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === delimiter && depth === 0) { out.push(current.trim()); current = ''; } else current += char;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

export function cleanIdentifier(value = '') { return value.replace(/^["`]|["`]$/g, '').trim().toLowerCase(); }
export function humanNumber(number) { return new Intl.NumberFormat('en-US', { notation: number > 9999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Math.round(number)); }
export function slug(value) { return value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, ''); }
