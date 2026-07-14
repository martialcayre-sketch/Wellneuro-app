import { createHash } from 'node:crypto';

function canonicalize(value: unknown, seen: Set<object>, allowUndefined: boolean): string | undefined {
  if (value === undefined) {
    if (allowUndefined) return undefined;
    throw new TypeError('Une valeur undefined n’est pas autorisée dans un tableau canonique.');
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Les nombres non finis ne sont pas sérialisables.');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') throw new TypeError('Valeur non JSON dans la sérialisation canonique.');
  if (value instanceof Date) throw new TypeError('Les dates doivent être converties en chaîne ISO avant sérialisation.');
  if (seen.has(value)) throw new TypeError('Les références circulaires ne sont pas sérialisables.');

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        if (!(index in value)) throw new TypeError('Les tableaux creux ne sont pas sérialisables.');
      }
      const items = value.map(item => canonicalize(item, seen, false));
      return `[${items.join(',')}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Seuls les objets JSON simples sont sérialisables.');
    }
    const entries: string[] = [];
    for (const key of Object.keys(value as object).sort()) {
      const serialized = canonicalize((value as Record<string, unknown>)[key], seen, true);
      if (serialized !== undefined) entries.push(`${JSON.stringify(key)}:${serialized}`);
    }
    return `{${entries.join(',')}}`;
  } finally {
    seen.delete(value);
  }
}

export function canonicalJson(value: unknown): string {
  const serialized = canonicalize(value, new Set<object>(), false);
  if (serialized === undefined) throw new TypeError('La racine canonique ne peut pas être undefined.');
  return serialized;
}

/** Hash d’intégrité uniquement : il n’anonymise ni ne pseudonymise les données. */
export function canonicalSha256(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}
