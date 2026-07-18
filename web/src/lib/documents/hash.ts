// Sérialisation canonique + hash déterministe pour le versionnage C3. PUR et
// ISOMORPHE (client + serveur) : le domaine `documents` est monté côté praticien
// (DocumentComposer), il ne doit donc PAS dépendre de `node:crypto` (non
// « bundlable » côté navigateur). Le hash est un empreinte d'INTÉGRITÉ / d'ÉGALITÉ
// de version — non cryptographique ; il ne protège ni n'anonymise aucune donnée.

/** Sérialisation JSON à clés triées (ordre stable), pure. */
export function canonicalString(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalString).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalString(record[k])}`).join(',')}}`;
}

/**
 * Hash déterministe (variante cyrb53, 53 bits) de la forme canonique d'une valeur,
 * rendu en hexadécimal (14 caractères). Deux valeurs canoniquement identiques →
 * même hash ; une différence → hash différent (avec très forte probabilité).
 */
export function hashStable(value: unknown): string {
  const str = canonicalString(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, '0');
}
