// Les dates d'un traitement ([[D-335]] §4) — PUR, lu par les routes et les
// écrans. Début et fin se disent au jour, au mois ou à l'année, ou `inconnu` :
// une date ramenée au premier du mois serait une précision que personne n'a
// donnée. Sur le fil, une seule chaîne dont la FORME dit la précision :
// `AAAA-MM-JJ`, `AAAA-MM`, `AAAA`, ou `inconnu`. En base, le premier jour de
// la période et sa précision, que la base accorde (CHECK).

import type { Precision } from './liste';

export type DatePeriode = {
  precision: Precision;
  /** AAAA-MM-JJ, premier jour de la période ; `null` si `inconnu`. */
  premierJour: string | null;
};

// L'an 0000 n'existe pas pour la base (1 av. J.-C.) : refusé par la forme.
const RE_PERIODE = /^(?!0000)(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

/** Une date civile réelle (le 31 février n'en est pas une). */
function estDateCivile(valeur: string): boolean {
  const d = new Date(`${valeur}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valeur;
}

/** La date d'une période, lue sur le fil — ou `null` si elle est illisible. */
export function lireDatePeriode(valeur: unknown): DatePeriode | null {
  if (valeur === 'inconnu') return { precision: 'inconnu', premierJour: null };
  if (typeof valeur !== 'string') return null;
  const m = RE_PERIODE.exec(valeur);
  if (!m) return null;
  const [, annee, mois, jour] = m;
  const premierJour = jour ? valeur : mois ? `${annee}-${mois}-01` : `${annee}-01-01`;
  if (!estDateCivile(premierJour)) return null;
  return { precision: jour ? 'jour' : mois ? 'mois' : 'annee', premierJour };
}

/** La valeur de fil d'une date en base : l'inverse de `lireDatePeriode`. */
export function valeurDatePeriode(premierJour: string | null, precision: string | null): string | null {
  if (precision === null) return null;
  if (precision === 'inconnu' || premierJour === null) return 'inconnu';
  if (precision === 'annee') return premierJour.slice(0, 4);
  if (precision === 'mois') return premierJour.slice(0, 7);
  return premierJour.slice(0, 10);
}

/** Le lendemain de la période : son premier jour, plus un jour, un mois ou un an. */
function finExclusive(periode: DatePeriode): string | null {
  if (periode.premierJour === null) return null;
  const d = new Date(`${periode.premierJour}T00:00:00Z`);
  if (periode.precision === 'annee') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else if (periode.precision === 'mois') d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Une fin connue ne précède pas un début connu : la période de la fin doit
 * FINIR après le début — la règle du CHECK `fin_apres_debut` (arbitrage du
 * 2026-10-21). Un début le 10 mai et une fin « mai » passent.
 */
export function finApresDebut(debut: DatePeriode, fin: DatePeriode | null): boolean {
  if (fin === null || fin.premierJour === null || debut.premierJour === null) return true;
  const lendemain = finExclusive(fin);
  return lendemain !== null && lendemain > debut.premierJour;
}

/** Une période commence-t-elle après aujourd'hui ? (AAAA-MM-JJ, Europe/Paris) */
export function estFuture(periode: DatePeriode, aujourdhui: string): boolean {
  return periode.premierJour !== null && periode.premierJour > aujourdhui;
}

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Une date de période, dite à sa précision : « 12/05/2024 », « mai 2024 », « 2024 ». */
export function formaterDatePeriode(premierJour: string | null, precision: string | null, inconnue: string): string {
  if (precision === null) return '';
  if (precision === 'inconnu' || premierJour === null) return inconnue;
  const [annee, mois, jour] = premierJour.slice(0, 10).split('-');
  if (precision === 'annee') return annee;
  if (precision === 'mois') return `${MOIS[Number(mois) - 1] ?? mois} ${annee}`;
  return `${jour}/${mois}/${annee}`;
}

/** Une date civile AAAA-MM-JJ dite au jour : « 12/05/2024 ». */
export function formaterJour(iso: string): string {
  const [annee, mois, jour] = iso.slice(0, 10).split('-');
  return `${jour}/${mois}/${annee}`;
}
