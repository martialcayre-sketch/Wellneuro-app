import { CONTEXTES_PRISE, MOMENTS_PRISE } from './markerRegistry';
import { isMarqueurVedette } from './markerRegistry';
import { VERSION_REGISTRE_MARQUEURS, VERSION_SCHEMA_FOOD_OBSERVATION } from './types';
import type { CouvertureJournees, JourneeRepere, MomentPrise, TypeJournee } from './types';
import { localDate, nonEmpty } from './validation';

/**
 * Journée repère du bilan de calibrage (lot 3).
 *
 * La trace d'essai répond à « l'action a-t-elle tenu ? ». Elle ne peut pas dire
 * à quoi ressemble une journée : elle ne porte qu'une `localDate` qu'aucun
 * calcul ne lit, et rien n'empêche N traces le même jour — c'est ce qui rendait
 * faux le « silence utile » retiré au lot 1. La journée repère répond à l'autre
 * question, et elle est **unique par date et par épisode**.
 *
 * Bornes de conception, arbitrées et non renégociées ici :
 * — aucune heure réelle, seulement le moment approximatif (gate JA-00, A1) ;
 * — aucune quantité, aucune valeur nutritionnelle (A7-12) ;
 * — le profil qui en dérive est une annexe éclairante NON SCORÉE : il n'entre
 *   dans aucun calcul de « Mon équilibre » et ne conclut jamais seul.
 *
 * Le patron entier — dérivation calendaire, seuils nommés, couverture qui exige
 * compte ET composition — est transposé de l'agenda du sommeil
 * (`lib/agenda-sommeil/`), qui l'a établi pour la nuit.
 */

/**
 * En deçà, aucun profil n'est dérivé — jamais un profil pauvre, jamais des
 * zéros. Trois journées, borne basse de l'arbitrage.
 */
export const MIN_JOURNEES_PROFIL = 3;

/**
 * Un COMPTE ne suffit pas. Cinq journées toutes de poste du matin décrivent un
 * poste du matin, pas une alimentation : ce sont les journées d'un autre type
 * qui font apparaître ce qui change. Même raisonnement que
 * `MIN_NUITS_WEEKEND_INDICE` côté sommeil, où le week-end fait dériver les
 * horaires.
 */
export const MIN_TYPES_DISTINCTS_PROFIL = 2;

const TYPES_JOURNEE: readonly TypeJournee[] = [
  'travail_matin',
  'travail_apres_midi',
  'repos',
  'week_end',
] as const;

const NOMBRE_PRISES_MAX = 8;

export function isTypeJournee(value: string): value is TypeJournee {
  return (TYPES_JOURNEE as readonly string[]).includes(value);
}

export function isMomentPrise(value: string): value is MomentPrise {
  return (MOMENTS_PRISE as readonly string[]).includes(value);
}

/**
 * Une date tombe-t-elle un samedi ou un dimanche ? Calculé en UTC pour
 * neutraliser tout fuseau — une date-calendrier n'a pas d'heure. Transposé de
 * `agenda-sommeil/nuit.ts`.
 *
 * Sert à PROPOSER le type par défaut, jamais à l'imposer : un samedi de poste
 * est une journée de travail, et le patient est seul à le savoir.
 */
export function estWeekEnd(date: string): boolean {
  localDate(date, 'date');
  const [a, m, j] = date.split('-').map(Number);
  const jour = new Date(Date.UTC(a, m - 1, j)).getUTCDay(); // 0 = dimanche
  return jour === 0 || jour === 6;
}

function decalerDate(date: string, n: number): string {
  const [a, m, j] = date.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/**
 * Jours déjà écoulés de la fenêtre d'un épisode, bornés à aujourd'hui.
 *
 * Sert à compter des jours SANS trace. Un décompte qui irait jusqu'à
 * `endDate` compterait comme « sans trace » des jours qui ne sont pas encore
 * arrivés — un trou fabriqué, pas un trou observé.
 */
export function joursObservables(startDate: string, endDate: string, aujourdHui: string): string[] {
  localDate(startDate, 'startDate');
  localDate(endDate, 'endDate');
  localDate(aujourdHui, 'aujourdHui');
  const borne = aujourdHui < endDate ? aujourdHui : endDate;
  if (borne < startDate) return [];
  const jours: string[] = [];
  for (let jour = startDate; jour <= borne; jour = decalerDate(jour, 1)) {
    jours.push(jour);
  }
  return jours;
}

export function typeJourneeParDefaut(date: string): TypeJournee {
  return estWeekEnd(date) ? 'week_end' : 'repos';
}

/**
 * Crée une journée repère. Même contrat de validation que `createTrialTrace` :
 * on refuse à la construction plutôt que de porter une donnée douteuse.
 *
 * `rienDeParticulier` est EXCLUSIF des moments et marqueurs (patron
 * `agenda-sommeil`) : « rien de particulier » est une réponse, l'absence de
 * réponse n'en est pas une, et les confondre fabriquerait une observation.
 */
export function createJourneeRepere(input: {
  journeeId: string;
  episodeId: string;
  localDate: string;
  typeJournee: TypeJournee;
  nombrePrises?: number;
  momentsObserves?: string[];
  contexte?: string;
  marqueursPresents?: string[];
  rienDeParticulier?: boolean;
}): JourneeRepere {
  nonEmpty(input.journeeId, 'journeeId');
  nonEmpty(input.episodeId, 'episodeId');
  localDate(input.localDate, 'localDate');

  if (!isTypeJournee(input.typeJournee)) {
    throw new TypeError(`Type de journée inconnu : ${String(input.typeJournee)}.`);
  }

  const moments = input.momentsObserves ?? [];
  const marqueurs = input.marqueursPresents ?? [];

  if (input.rienDeParticulier
    && (moments.length > 0
      || marqueurs.length > 0
      || input.nombrePrises !== undefined
      || input.contexte !== undefined)) {
    throw new TypeError(
      '« Rien de particulier » exclut toute observation de la journée : ce sont deux réponses différentes.'
    );
  }

  if (input.nombrePrises !== undefined) {
    if (!Number.isInteger(input.nombrePrises)
      || input.nombrePrises < 0
      || input.nombrePrises > NOMBRE_PRISES_MAX) {
      throw new TypeError(
        `Le nombre de prises est un entier de 0 à ${NOMBRE_PRISES_MAX}.`
      );
    }
  }

  const momentInconnu = moments.find(m => !isMomentPrise(m));
  if (momentInconnu !== undefined) {
    throw new TypeError(`Moment de prise inconnu au registre : ${momentInconnu}.`);
  }

  if (input.contexte !== undefined && !CONTEXTES_PRISE.includes(input.contexte)) {
    throw new TypeError(`Contexte inconnu au registre : ${input.contexte}.`);
  }

  const marqueurInconnu = marqueurs.find(m => !isMarqueurVedette(m));
  if (marqueurInconnu !== undefined) {
    throw new TypeError(`Marqueur hors registre pilote : ${marqueurInconnu}.`);
  }

  return {
    journeeId: input.journeeId,
    episodeId: input.episodeId,
    localDate: input.localDate,
    typeJournee: input.typeJournee,
    nombrePrises: input.nombrePrises,
    momentsObserves: moments.filter(isMomentPrise),
    contexte: input.contexte,
    marqueursPresents: [...marqueurs],
    rienDeParticulier: input.rienDeParticulier ? true : undefined,
    schemaVersion: VERSION_SCHEMA_FOOD_OBSERVATION,
    marqueursVersion: VERSION_REGISTRE_MARQUEURS,
  };
}

/**
 * Relit une journée reçue d'un client. Rien de ce que le navigateur envoie
 * n'est cru sur parole : les bornes du domaine ne valent que si le serveur les
 * applique aussi. Même rôle que `readFoodObservationEpisode` pour l'épisode, et
 * même conséquence — un `TypeError` ressort en 400, jamais en 500.
 */
export function readJourneeRepere(value: unknown): JourneeRepere {
  if (!value || typeof value !== 'object') throw new TypeError('Journée repère invalide.');
  const j = value as Record<string, unknown>;
  const chaine = (v: unknown, champ: string): string => {
    if (typeof v !== 'string') throw new TypeError(`${champ} doit être une chaîne.`);
    return v;
  };
  return createJourneeRepere({
    journeeId: chaine(j.journeeId, 'journeeId'),
    episodeId: chaine(j.episodeId, 'episodeId'),
    localDate: chaine(j.localDate, 'localDate'),
    typeJournee: j.typeJournee as TypeJournee,
    nombrePrises: j.nombrePrises === undefined ? undefined : Number(j.nombrePrises),
    momentsObserves: Array.isArray(j.momentsObserves) ? j.momentsObserves.map(String) : [],
    contexte: j.contexte === undefined ? undefined : chaine(j.contexte, 'contexte'),
    marqueursPresents: Array.isArray(j.marqueursPresents) ? j.marqueursPresents.map(String) : [],
    rienDeParticulier: j.rienDeParticulier === true,
  });
}

/**
 * Couverture du bilan par TYPES de journées, et non par volume.
 *
 * `profilPossible` exige compte ET composition, comme `couvertureSuffisante`
 * côté sommeil. Un compte seul reproduirait exactement le défaut retiré au
 * lot 1 : trois observations du même lundi ne prouvent rien sur ce qui change
 * d'une journée à l'autre.
 *
 * Une même date ne compte qu'une fois, quel que soit le nombre d'objets reçus.
 */
export function couvertureJournees(journees: readonly JourneeRepere[]): CouvertureJournees {
  const parDate = new Map<string, TypeJournee>();
  journees.forEach(j => parDate.set(j.localDate, j.typeJournee));

  const typesCouverts = TYPES_JOURNEE.filter(t => [...parDate.values()].includes(t));
  const typesAbsents = TYPES_JOURNEE.filter(t => !typesCouverts.includes(t));
  const compte = parDate.size;

  return {
    compte,
    typesCouverts,
    typesAbsents,
    profilPossible:
      compte >= MIN_JOURNEES_PROFIL && typesCouverts.length >= MIN_TYPES_DISTINCTS_PROFIL,
  };
}
