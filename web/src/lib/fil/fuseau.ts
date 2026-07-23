// Fuseau du cabinet (accueil-observatoire LOT-04). Les rendez-vous sont stockés
// en UTC ; le Fil et l'agenda tournent côté serveur en TZ=UTC sur Vercel. Sans
// ce fuseau explicite, une consultation de 09:00 Paris s'afficherait « à 07:00 »
// et le jour civil serait décalé de 1-2 h. Tout ce fichier est indépendant du
// fuseau de la machine : il force `Europe/Paris`.

const FUSEAU = 'Europe/Paris';

const FORMAT_HEURE = new Intl.DateTimeFormat('fr-FR', {
  timeZone: FUSEAU,
  hour: '2-digit',
  minute: '2-digit',
});

/** Heure d'un instant en heure de Paris (« 09:00 »). */
export function formatHeureParis(d: Date): string {
  return FORMAT_HEURE.format(d);
}

const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function composantesParis(instant: Date): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { type, value } of PARTS.formatToParts(instant)) {
    if (type !== 'literal') out[type] = Number(value);
  }
  // `en-CA` peut rendre minuit comme « 24 » : on le ramène à 0.
  if (out.hour === 24) out.hour = 0;
  return out;
}

/** Décalage (ms) Paris↔UTC à cet instant (positif : Paris en avance sur UTC). */
function decalageParisMs(instant: Date): number {
  const p = composantesParis(instant);
  const naifCommeUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return naifCommeUtc - instant.getTime();
}

/**
 * Bornes UTC du jour civil de Paris contenant `instant` : `[debut, fin)`. Sert
 * à décider « les rendez-vous d'aujourd'hui » sans se tromper de journée près de
 * minuit (le bug serait un RDV du matin rangé la veille).
 */
export function bornesJourParis(instant: Date): { debut: Date; fin: Date } {
  const decalage = decalageParisMs(instant);
  const p = composantesParis(instant);
  const minuitNaif = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0);
  const debut = new Date(minuitNaif - decalage);
  const fin = new Date(debut.getTime() + 24 * 60 * 60 * 1000);
  return { debut, fin };
}
