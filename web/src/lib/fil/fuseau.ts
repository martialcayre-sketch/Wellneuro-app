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
 * Instant UTC du minuit de Paris pour la date civile (année/mois/jour) donnée.
 * Le décalage est échantillonné À CE MINUIT (via son approximation UTC), pas à
 * un autre moment de la journée : les 2 jours de bascule DST, minuit et midi
 * n'ont pas le même décalage. `Date.UTC` gère le débordement de mois/année.
 */
function minuitParisUTC(annee: number, moisZeroIndexe: number, jour: number): Date {
  const minuitNaif = Date.UTC(annee, moisZeroIndexe, jour, 0, 0, 0);
  // Le décalage à ~minuit (00:00 UTC est à 1-2 h du vrai minuit Paris, tous deux
  // AVANT la bascule DST de 01:00-02:00 UTC → même décalage, pré-transition).
  const decalage = decalageParisMs(new Date(minuitNaif));
  return new Date(minuitNaif - decalage);
}

/**
 * Bornes UTC du jour civil de Paris contenant `instant` : `[debut, fin)`. Sert
 * à décider « les rendez-vous d'aujourd'hui » sans se tromper de journée près de
 * minuit (le bug serait un RDV du matin rangé la veille). Chaque borne calcule
 * son propre décalage, donc les jours de bascule DST font bien 23 h ou 25 h.
 */
export function bornesJourParis(instant: Date): { debut: Date; fin: Date } {
  const p = composantesParis(instant);
  return {
    debut: minuitParisUTC(p.year, p.month - 1, p.day),
    fin: minuitParisUTC(p.year, p.month - 1, p.day + 1),
  };
}
