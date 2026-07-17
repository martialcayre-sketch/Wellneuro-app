export function nonEmpty(value: string, field: string): string {
  if (!value.trim()) throw new TypeError(`${field} est requis.`);
  return value;
}

export function localDate(value: string, field: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new TypeError(`${field} doit être une date locale au format AAAA-MM-JJ.`);
  }
  return value;
}

export function canonicalIso(value: string, field: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError(`${field} doit être une date ISO canonique valide.`);
  }
  return value;
}
