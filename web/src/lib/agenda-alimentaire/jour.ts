// Validation et chaînage des journées (domaine PUR). Patron `agenda-sommeil/nuit.ts` :
// `ensureJourReponses` rejette (TypeError → 400 côté route), `resolveJoursActifs`
// résout la tête de chaîne par date, `estDateSaisissable` borne la saisie.

import {
  ANCRE_JOURNEE_MIN,
  FENETRE_ALI_MAX_PLAUSIBLE,
  NATURES_PRISE,
  NB_PRISES_MAX,
  type JourReponses,
  type JourRow,
  type NaturePrise,
  type PriseJour,
} from './types';

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_HEURE = /^([01]\d|2[0-3]):(00|15|30|45)$/; // HH:MM au pas de 15 min

// ─── Primitives de temps ─────────────────────────────────────────────────────

/**
 * Minutes écoulées depuis l'ancre de journée (04:00). C'est l'échelle sur
 * laquelle les prises s'ordonnent et sur laquelle les statistiques d'heures se
 * calculent : depuis minuit, 23:45 et 00:15 sembleraient distants de douze
 * heures alors qu'ils le sont d'une demi-heure.
 */
export function minutesDepuisAncre(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60 + m - ANCRE_JOURNEE_MIN + 1440) % 1440;
}

/** Durée d'un intervalle horaire, minuit traversé (modulo 1440). */
export function dureeMinutes(hDebut: string, hFin: string): number {
  const [hd, md] = hDebut.split(':').map(Number);
  const [hf, mf] = hFin.split(':').map(Number);
  return (hf * 60 + mf - (hd * 60 + md) + 1440) % 1440;
}

export function decalerDate(date: string, n: number): string {
  const [a, m, j] = date.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function estDateValide(value: unknown): value is string {
  if (typeof value !== 'string' || !RE_DATE.test(value)) return false;
  const [a, m, j] = value.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
}

/**
 * La saisie est bornée à aujourd'hui ou la veille — plus strict que l'agenda du
 * sommeil, et délibérément. Au-delà de 24 heures, un rappel alimentaire est une
 * reconstruction de mémoire et non une observation : le remplir ferait passer
 * du souvenir pour de la mesure, dans un instrument dont tout le régime de
 * preuve tient au mot « observé ». Le trou est assumé.
 */
export function estDateSaisissable(dateJour: string, aujourdHui: string): boolean {
  return dateJour === aujourdHui || dateJour === decalerDate(aujourdHui, -1);
}

// ─── Validation des formats atomiques ────────────────────────────────────────

function ensureHeure(value: unknown, champ: string): string {
  if (typeof value !== 'string' || !RE_HEURE.test(value)) {
    throw new TypeError(`Heure invalide pour « ${champ} ».`);
  }
  return value;
}

function ensureBooleen(value: unknown, champ: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`Réponse invalide pour « ${champ} ».`);
  }
  return value;
}

function ensurePrise(value: unknown, index: number): PriseJour {
  if (!value || typeof value !== 'object') {
    throw new TypeError(`Prise n° ${index + 1} illisible.`);
  }
  const v = value as Record<string, unknown>;
  const nature = v.nature;
  if (typeof nature !== 'string' || !(NATURES_PRISE as readonly string[]).includes(nature)) {
    throw new TypeError(`Nature invalide pour la prise n° ${index + 1}.`);
  }
  return {
    heure: ensureHeure(v.heure, `heure de la prise n° ${index + 1}`),
    nature: nature as NaturePrise,
  };
}

// ─── Validation d'une journée complète ───────────────────────────────────────

/**
 * `exigerObligatoires` sépare l'ÉCRITURE de la LECTURE, comme côté sommeil. En
 * écriture, les protéines du matin et les trois présences sont obligatoires dès
 * qu'il y a des prises : sans elles, l'agrégation devrait inventer un « non ».
 * En lecture elles restent facultatives — une ligne écrite sous une version
 * antérieure doit rester relisible.
 *
 * Les clés supplémentaires (`contractVersion` rangé dans le JSON stocké) sont
 * ignorées.
 */
export function ensureJourReponses(
  value: unknown,
  options: { exigerObligatoires?: boolean } = {},
): JourReponses {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Réponses de journée illisibles.');
  }
  const v = value as Record<string, unknown>;

  const aucunePrise = v.aucunePrise === true;
  const prisesBrutes = v.prises;

  if (aucunePrise) {
    // Une journée sans prise est une réponse entière : elle ne se panache pas
    // avec des observations qui la contrediraient.
    if (Array.isArray(prisesBrutes) && prisesBrutes.length > 0) {
      throw new TypeError('Une journée sans prise ne peut pas porter de prises.');
    }
    for (const champ of [
      'premierePriseProteines',
      'soirPlusCopieux',
      'legumesDeuxPrises',
      'fruitsOuOleagineux',
      'ultraTransformes',
    ] as const) {
      if (v[champ] !== undefined && v[champ] !== null) {
        throw new TypeError('Une journée sans prise ne porte aucune observation de contenu.');
      }
    }
    return { aucunePrise: true };
  }

  if (!Array.isArray(prisesBrutes) || prisesBrutes.length === 0) {
    throw new TypeError('Renseignez au moins une prise, ou déclarez une journée sans prise.');
  }
  if (prisesBrutes.length > NB_PRISES_MAX) {
    throw new TypeError(`Au plus ${NB_PRISES_MAX} prises par journée.`);
  }

  const prises = prisesBrutes.map((p, i) => ensurePrise(p, i));

  // Strictement croissantes sur l'échelle ancrée : deux prises à la même heure
  // ne se distinguent pas, et un ordre inversé ferait un jeûne négatif.
  for (let i = 1; i < prises.length; i += 1) {
    if (minutesDepuisAncre(prises[i].heure) <= minutesDepuisAncre(prises[i - 1].heure)) {
      throw new TypeError('Les prises doivent être renseignées dans l’ordre, sans doublon d’heure.');
    }
  }

  const out: JourReponses = { prises };

  if (options.exigerObligatoires) {
    out.premierePriseProteines = ensureBooleen(
      v.premierePriseProteines,
      'protéines à la première prise',
    );
    out.legumesDeuxPrises = ensureBooleen(v.legumesDeuxPrises, 'légumes à au moins deux prises');
    out.fruitsOuOleagineux = ensureBooleen(v.fruitsOuOleagineux, 'fruits ou fruits à coque');
    out.ultraTransformes = ensureBooleen(v.ultraTransformes, 'produits ultra-transformés');
  } else {
    if (v.premierePriseProteines !== undefined && v.premierePriseProteines !== null) {
      out.premierePriseProteines = ensureBooleen(v.premierePriseProteines, 'protéines');
    }
    if (v.legumesDeuxPrises !== undefined && v.legumesDeuxPrises !== null) {
      out.legumesDeuxPrises = ensureBooleen(v.legumesDeuxPrises, 'légumes');
    }
    if (v.fruitsOuOleagineux !== undefined && v.fruitsOuOleagineux !== null) {
      out.fruitsOuOleagineux = ensureBooleen(v.fruitsOuOleagineux, 'fruits ou fruits à coque');
    }
    if (v.ultraTransformes !== undefined && v.ultraTransformes !== null) {
      out.ultraTransformes = ensureBooleen(v.ultraTransformes, 'produits ultra-transformés');
    }
  }

  if (v.soirPlusCopieux !== undefined && v.soirPlusCopieux !== null) {
    out.soirPlusCopieux = ensureBooleen(v.soirPlusCopieux, 'repas du soir le plus copieux');
  }

  return out;
}

/**
 * Fenêtre alimentaire d'une journée : première → dernière prise, en minutes.
 * `null` sur une journée sans prise ou à prise unique — une fenêtre suppose
 * deux bornes, et 0 se lirait comme « toutes les prises au même instant ».
 */
export function fenetreAlimentaire(reponses: JourReponses): number | null {
  const prises = reponses.prises;
  if (!prises || prises.length < 2) return null;
  return minutesDepuisAncre(prises[prises.length - 1].heure) - minutesDepuisAncre(prises[0].heure);
}

/**
 * Une journée dont la fenêtre dépasse la borne de plausibilité est exclue des
 * agrégats mais reste visible au praticien : elle signale plus probablement une
 * saisie erronée qu'un comportement, et la trancher silencieusement priverait
 * le praticien de l'information.
 */
export function estPlausible(reponses: JourReponses): boolean {
  const fenetre = fenetreAlimentaire(reponses);
  return fenetre === null || fenetre <= FENETRE_ALI_MAX_PLAUSIBLE;
}

// ─── Chaînage ────────────────────────────────────────────────────────────────

/**
 * Têtes de chaîne par date : une correction crée une ligne qui en supplante une
 * autre, jamais un `update`. La ligne active d'une date est celle qu'aucune
 * autre ne supplante ; à égalité, la plus récemment soumise.
 */
export function resolveJoursActifs(lignes: JourRow[]): JourRow[] {
  const supplantees = new Set(
    lignes.map((l) => l.supersedesJourId).filter((id): id is string => Boolean(id)),
  );
  const parDate = new Map<string, JourRow>();
  for (const ligne of lignes) {
    if (supplantees.has(ligne.id)) continue;
    const courante = parDate.get(ligne.dateJour);
    if (!courante || ligne.soumisLe > courante.soumisLe) {
      parDate.set(ligne.dateJour, ligne);
    }
  }
  return [...parDate.values()].sort((a, b) => a.dateJour.localeCompare(b.dateJour));
}
