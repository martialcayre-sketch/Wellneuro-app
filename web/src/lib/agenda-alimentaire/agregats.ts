// Agrégats du recueil (domaine PUR). Aucune notion de score : ce module rend
// des GRANDEURS OBSERVÉES et leurs compteurs de couverture. La conversion en
// axes /25 et en indice /100 appartient au scorer (lot suivant) — la séparation
// est celle de `agenda-sommeil/agregats.ts`, et elle vaut pour la même raison :
// une grandeur mal couverte doit pouvoir remonter `null` sans qu'aucun barème
// n'ait eu l'occasion de la lire comme un zéro.
//
// Doctrine de fuseau, reprise mot pour mot du sommeil : les heures sont des
// chaînes HH:MM en horloge murale locale, jamais converties. Une bascule d'heure
// d'été introduit au pire ±60 min sur une journée de la fenêtre — bruit clinique
// accepté et documenté, plutôt qu'un stockage UTC qui ferait mentir l'heure
// affichée au patient.

import { fenetreAlimentaire, fenetrePlausible, minutesDepuisAncre } from './jour';
import {
  JEUNE_MAX_PLAUSIBLE,
  MIN_JOURS_AGREGATS,
  MIN_JOURS_AXE,
  MIN_JOURS_INDICE,
  MIN_JOURS_WEEKEND_INDICE,
  MIN_PAIRES_JEUNE,
  type JourReponses,
} from './types';

export type JourAgregable = { dateJour: string; reponses: JourReponses };

export type AgregatsAgendaAli = {
  // — Couverture —
  nbJours: number;
  nbJoursWeekEnd: number;
  nbJoursSansPrise: number;
  /** Journées PORTEUSES de prises — dénominateur des grandeurs horaires. */
  nbJoursAvecPrises: number;
  /** Journées dont la fenêtre alimentaire est connue (≥ 2 prises, bornes tenues). */
  nbJoursFenetreConnue: number;
  nbPairesJeune: number;
  nbJoursProteinesConnu: number;
  nbJoursContenuConnu: number;
  nbJoursSoirConnu: number;

  // — Rythme —
  /** Médiane du jeûne nocturne, en minutes. Médiane et non moyenne : une
   *  grasse matinée du dimanche ne doit pas déplacer le repère. */
  jeuneMedian: number | null;
  fenetreAliMoyenne: number | null;
  regularitePremiereEcartType: number | null;
  regulariteDerniereEcartType: number | null;

  // — Structure —
  nbPrisesMoyen: number | null;
  nbRepasMoyen: number | null;
  nbHorsRepasMoyen: number | null;
  /** Jours par semaine portant au moins une prise hors repas. */
  freqHorsRepasSem: number | null;
  /** Jours par semaine à moins de deux repas structurés. */
  freqMoinsDeuxRepasSem: number | null;

  // — Contenu observé —
  freqProteinesMatinSem: number | null;
  freqLegumesSem: number | null;
  freqFruitsSem: number | null;
  freqUltraTransformesSem: number | null;
  freqSoirCopieuxSem: number | null;
};

// ─── Primitives statistiques ─────────────────────────────────────────────────

function moyenne(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function mediane(xs: number[]): number {
  const t = [...xs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 === 1 ? t[m] : (t[m - 1] + t[m]) / 2;
}

/**
 * Écart-type d'ÉCHANTILLON (n−1). Sur une série courte, le diviseur n sous-estime
 * la dispersion : prendre un patient irrégulier pour régulier est l'erreur à ne
 * pas commettre ici.
 */
function ecartType(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = moyenne(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function arrondi(x: number, decimales = 0): number {
  const f = 10 ** decimales;
  return Math.round(x * f) / f;
}

/**
 * Moyenne d'une série éventuellement vide : `null` — métrique non couverte —
 * et jamais 0. Un 0 se lirait ici comme « zéro repas », pas comme « inconnu ».
 */
function moyenneOuNull(xs: number[], decimales = 0): number | null {
  return xs.length === 0 ? null : arrondi(moyenne(xs), decimales);
}

function medianeOuNull(xs: number[], decimales = 0): number | null {
  return xs.length === 0 ? null : arrondi(mediane(xs), decimales);
}

/**
 * Fréquence hebdomadaire : nombre de jours vrais ramené à sept jours. `null`
 * quand aucun jour ne porte l'information — une fréquence de 0 affirmerait que
 * le patient n'a jamais mangé de légumes, là où personne ne le lui a demandé.
 */
function freqSem(nbVrais: number, nbConnus: number): number | null {
  return nbConnus === 0 ? null : arrondi((nbVrais / nbConnus) * 7, 1);
}

export function estWeekEnd(date: string): boolean {
  const [a, m, j] = date.split('-').map(Number);
  const jour = new Date(Date.UTC(a, m - 1, j)).getUTCDay();
  return jour === 0 || jour === 6;
}

// ─── Dérivés d'une journée ───────────────────────────────────────────────────

type JourDerive = {
  dateJour: string;
  weekEnd: boolean;
  sansPrise: boolean;
  /** Minutes depuis l'ancre — `null` sur une journée sans prise. */
  premiere: number | null;
  derniere: number | null;
  nbPrises: number;
  nbRepas: number;
  nbHorsRepas: number;
  fenetre: number | null;
};

function derive(jour: JourAgregable): JourDerive {
  const { reponses } = jour;
  const prises = reponses.prises ?? [];
  const sansPrise = reponses.aucunePrise === true || prises.length === 0;

  return {
    dateJour: jour.dateJour,
    weekEnd: estWeekEnd(jour.dateJour),
    sansPrise,
    premiere: sansPrise ? null : minutesDepuisAncre(prises[0].heure),
    derniere: sansPrise ? null : minutesDepuisAncre(prises[prises.length - 1].heure),
    nbPrises: prises.length,
    nbRepas: prises.filter((p) => p.nature === 'repas').length,
    nbHorsRepas: prises.filter((p) => p.nature === 'hors_repas').length,
    // Hors bornes ⇒ grandeur inconnue, et la journée reste comptée.
    fenetre: fenetrePlausible(reponses) ? fenetreAlimentaire(reponses) : null,
  };
}

/**
 * Jeûnes nocturnes, en minutes, sur les PAIRES de jours consécutifs dont les
 * deux membres portent des prises.
 *
 * Une journée déclarée sans prise invalide les deux paires qui la touchent : un
 * intervalle de plus de vingt-quatre heures n'est pas un jeûne *nocturne*, et
 * l'y compter gonflerait la médiane d'un patient qui a sauté une journée.
 */
function jeunesNocturnes(derives: JourDerive[]): number[] {
  const parDate = new Map(derives.map((d) => [d.dateJour, d]));
  const jeunes: number[] = [];

  for (const jour of derives) {
    // `premiere`/`derniere` valent `null` exactement sur les journées sans
    // prise : tester la nullité suffit, et ne peut pas se désynchroniser d'un
    // second drapeau.
    if (jour.premiere === null) continue;
    // Appariement par DATE, jamais par position dans la liste : deux entrées
    // voisines d'un recueil en pointillé peuvent être distantes de trois jours,
    // et l'intervalle qui les sépare n'est pas un jeûne nocturne.
    const veille = parDate.get(decalerDateLocale(jour.dateJour, -1));
    if (!veille || veille.derniere === null) continue;
    // Échelle absolue depuis l'ancre du jour de référence : la dernière prise de
    // la veille et la première du jour vivent sur deux journées distinctes.
    const jeune = jour.premiere + 1440 - veille.derniere;
    // Deux journées porteuses de prises suffisent à produire plus de 24 h :
    // dernière prise à 05:00, première du lendemain à 03:45. Ce n'est plus un
    // jeûne nocturne — l'admettre décrirait un patient qui n'existe pas.
    if (jeune > JEUNE_MAX_PLAUSIBLE) continue;
    jeunes.push(jeune);
  }
  return jeunes;
}

function decalerDateLocale(date: string, n: number): string {
  const [a, m, j] = date.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// ─── Couverture et agrégats ──────────────────────────────────────────────────

/** Journées dont la fenêtre alimentaire est exploitable. */
export function compterFenetresConnues(jours: JourAgregable[]): number {
  return jours.filter((j) => fenetrePlausible(j.reponses) && fenetreAlimentaire(j.reponses) !== null)
    .length;
}

/**
 * Déduplication par date. `calculerAgregatsAli` consomme normalement la sortie
 * de `resolveJoursActifs`, mais une précondition non tenue doublerait les
 * journées ET les paires de jeûne sans que rien ne le signale. À date égale, la
 * dernière reçue l'emporte, comme la résolution de chaîne.
 */
function dedupliquerParDate(jours: JourAgregable[]): JourAgregable[] {
  const parDate = new Map<string, JourAgregable>();
  for (const jour of jours) parDate.set(jour.dateJour, jour);
  return [...parDate.values()].sort((a, b) => a.dateJour.localeCompare(b.dateJour));
}

/**
 * Couverture suffisante pour l'INDICE — distincte du seuil des agrégats. Le
 * week-end fait dériver les horaires alimentaires comme il fait dériver ceux du
 * sommeil : sans lui, la régularité mesurée est celle d'une semaine de travail
 * et se présenterait pour celle d'une vie.
 */
export function couvertureSuffisante(jours: JourAgregable[]): boolean {
  const uniques = dedupliquerParDate(jours);
  const weekEnd = uniques.filter((j) => estWeekEnd(j.dateJour)).length;
  // Troisième condition, et non la moindre : des journées PORTEUSES de prises.
  // Vingt et une journées « aucune prise » satisfont le compte et le week-end,
  // et ne mesurent aucune heure — déclarer ce recueil exploitable ferait lire
  // quinze grandeurs nulles comme un profil.
  const avecPrises = uniques.filter(
    (j) => j.reponses.aucunePrise !== true && (j.reponses.prises?.length ?? 0) > 0,
  ).length;
  return (
    uniques.length >= MIN_JOURS_INDICE
    && weekEnd >= MIN_JOURS_WEEKEND_INDICE
    && avecPrises >= MIN_JOURS_AXE
  );
}

/**
 * `null` en dessous de `MIN_JOURS_AGREGATS` : sous sept jours, aucune moyenne ni
 * dispersion ne veut dire quoi que ce soit. L'appelant ne reçoit alors que le
 * compte, qu'il tient d'ailleurs lui-même — pas un objet rempli de zéros.
 */
export function calculerAgregatsAli(jours: JourAgregable[]): AgregatsAgendaAli | null {
  const plausibles = dedupliquerParDate(jours);
  if (plausibles.length < MIN_JOURS_AGREGATS) return null;

  const derives = plausibles.map(derive);
  const avecPrises = derives.filter((d) => !d.sansPrise);

  const jeunes = jeunesNocturnes(derives);

  // Chaque booléen porte sa propre couverture : un patient qui a répondu aux
  // protéines mais pas au contenu doit voir l'un mesuré et l'autre non.
  const proteinesConnues = plausibles.filter(
    (j) => !j.reponses.aucunePrise && j.reponses.premierePriseProteines !== undefined,
  );
  const contenuConnu = plausibles.filter(
    (j) =>
      !j.reponses.aucunePrise &&
      j.reponses.legumesDeuxPrises !== undefined &&
      j.reponses.fruitsOuOleagineux !== undefined &&
      j.reponses.ultraTransformes !== undefined,
  );
  const soirConnu = plausibles.filter(
    (j) => !j.reponses.aucunePrise && j.reponses.soirPlusCopieux !== undefined,
  );

  return {
    nbJours: plausibles.length,
    nbJoursWeekEnd: derives.filter((d) => d.weekEnd).length,
    nbJoursSansPrise: derives.filter((d) => d.sansPrise).length,
    nbJoursAvecPrises: avecPrises.length,
    nbJoursFenetreConnue: avecPrises.filter((d) => d.fenetre !== null).length,
    nbPairesJeune: jeunes.length,
    nbJoursProteinesConnu: proteinesConnues.length,
    nbJoursContenuConnu: contenuConnu.length,
    nbJoursSoirConnu: soirConnu.length,

    jeuneMedian: jeunes.length >= MIN_PAIRES_JEUNE ? medianeOuNull(jeunes) : null,
    fenetreAliMoyenne: moyenneOuNull(
      avecPrises.map((d) => d.fenetre).filter((f): f is number => f !== null),
    ),
    regularitePremiereEcartType:
      avecPrises.length < 2
        ? null
        : arrondi(ecartType(avecPrises.map((d) => d.premiere as number))),
    regulariteDerniereEcartType:
      avecPrises.length < 2
        ? null
        : arrondi(ecartType(avecPrises.map((d) => d.derniere as number))),

    nbPrisesMoyen: moyenneOuNull(avecPrises.map((d) => d.nbPrises), 1),
    nbRepasMoyen: moyenneOuNull(avecPrises.map((d) => d.nbRepas), 1),
    nbHorsRepasMoyen: moyenneOuNull(avecPrises.map((d) => d.nbHorsRepas), 1),
    freqHorsRepasSem: freqSem(
      avecPrises.filter((d) => d.nbHorsRepas >= 1).length,
      avecPrises.length,
    ),
    freqMoinsDeuxRepasSem: freqSem(
      avecPrises.filter((d) => d.nbRepas < 2).length,
      avecPrises.length,
    ),

    freqProteinesMatinSem: freqSem(
      proteinesConnues.filter((j) => j.reponses.premierePriseProteines === true).length,
      proteinesConnues.length,
    ),
    freqLegumesSem: freqSem(
      contenuConnu.filter((j) => j.reponses.legumesDeuxPrises === true).length,
      contenuConnu.length,
    ),
    freqFruitsSem: freqSem(
      contenuConnu.filter((j) => j.reponses.fruitsOuOleagineux === true).length,
      contenuConnu.length,
    ),
    freqUltraTransformesSem: freqSem(
      contenuConnu.filter((j) => j.reponses.ultraTransformes === true).length,
      contenuConnu.length,
    ),
    freqSoirCopieuxSem: freqSem(
      soirConnu.filter((j) => j.reponses.soirPlusCopieux === true).length,
      soirConnu.length,
    ),
  };
}

/**
 * Heures habituelles observées, pour pré-positionner la saisie du jour. Ce sont
 * des suggestions affichées en pointillé : le patient doit toucher pour qu'une
 * prise compte, sans quoi l'agenda mesurerait ses propres suggestions.
 */
export function heuresHabituelles(jours: JourAgregable[]): number[] | null {
  const avecPrises = jours
    .filter((j) => !j.reponses.aucunePrise && j.reponses.prises?.length)
    .map((j) => j.reponses.prises as NonNullable<JourReponses['prises']>);
  if (avecPrises.length < 3) return null;

  const parRang = new Map<number, number[]>();
  for (const prises of avecPrises) {
    prises.forEach((p, rang) => {
      const lot = parRang.get(rang) ?? [];
      lot.push(minutesDepuisAncre(p.heure));
      parRang.set(rang, lot);
    });
  }
  // Un rang n'est suggéré que s'il est observé la majorité des jours : suggérer
  // une cinquième prise vue deux fois inviterait à la saisir.
  return [...parRang.entries()]
    .filter(([, valeurs]) => valeurs.length >= avecPrises.length / 2)
    .sort(([a], [b]) => a - b)
    .map(([, valeurs]) => arrondi(mediane(valeurs)));
}
