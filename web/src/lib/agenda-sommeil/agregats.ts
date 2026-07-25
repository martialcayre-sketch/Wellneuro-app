// Agrégats de l'agenda du sommeil (domaine PUR) — cœur des calculs de durées et
// de régularité. Aucune dépendance Prisma ni conversion de fuseau : les heures
// sont des chaînes `HH:MM` en horloge murale LOCALE.
//
// Deux pièges traités à la racine :
//   (a) Traversée de minuit : une durée se calcule modulo 1440 minutes —
//       `((fin − début) + 1440) % 1440`. Coucher 23:30 → lever 07:00 = 450 min.
//   (b) Statistiques d'heures autour de minuit : on ancre à MIDI
//       (`minutesDepuisMidi`), car le sommeil ne traverse jamais midi. Le milieu
//       de nuit devient une valeur linéaire dont on peut prendre moyenne et
//       écart-type sans statistique circulaire.
//   (c) Changement d'heure été/hiver : chaînes locales, aucune conversion — la
//       bascule DST introduit au pire ±60 min sur UNE seule nuit de la fenêtre
//       (bruit clinique accepté et documenté, jamais une exception).

import { MIN_NUITS_AGREGATS, type NuitReponses } from './types';

// Bornes de plausibilité d'un temps au lit (minutes). Hors de [120, 960] la nuit
// est exclue des agrégats (saisie manifestement erronée) mais reste visible nuit
// par nuit côté praticien.
const TIB_MIN_PLAUSIBLE = 120;
const TIB_MAX_PLAUSIBLE = 960;

// Centres de classe (minutes) — une classe qualitative devient une estimation
// ponctuelle pour l'agrégation. Jamais montrés au patient.
const CENTRE_LATENCE: Record<string, number> = { lt15: 8, e15_30: 22, e30_60: 45, gt60: 75 };
const CENTRE_DUREE_REVEILS: Record<string, number> = { lt15: 8, e15_45: 30, gt45: 60 };

export type AgregatsAgenda = {
  AGD_NB_NUITS: number; // nuits plausibles retenues
  AGD_TIB_MOY: number; // temps au lit moyen (minutes)
  AGD_TST_MOY: number; // temps de sommeil total moyen (minutes)
  AGD_EFF_MOY: number; // efficacité moyenne (%)
  AGD_LAT_MED: number; // latence médiane (minutes, centres de classe)
  AGD_REV_MOY: number; // réveils nocturnes moyens par nuit
  AGD_REG_ECT: number; // régularité = écart-type du milieu de sommeil (minutes)
  AGD_QUAL_MOY: number; // qualité subjective moyenne (1..5)
};

// ─── Primitives horaires ─────────────────────────────────────────────────────
function minutesDepuisMinuit(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Durée d'un intervalle horaire, minuit traversé (modulo 1440).
export function dureeMinutes(hDebut: string, hFin: string): number {
  return (minutesDepuisMinuit(hFin) - minutesDepuisMinuit(hDebut) + 1440) % 1440;
}

// Minutes écoulées depuis midi (ancrage anti-minuit : le sommeil ne traverse
// jamais midi, donc cette valeur est linéaire et comparable d'une nuit à l'autre).
export function minutesDepuisMidi(hhmm: string): number {
  return (minutesDepuisMinuit(hhmm) - 720 + 1440) % 1440;
}

// ─── Statistiques élémentaires ───────────────────────────────────────────────
function moyenne(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function mediane(xs: number[]): number {
  const tri = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(tri.length / 2);
  return tri.length % 2 === 0 ? (tri[mid - 1] + tri[mid]) / 2 : tri[mid];
}

function ecartType(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = moyenne(xs);
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

function arrondi(x: number, decimales = 0): number {
  const f = 10 ** decimales;
  return Math.round(x * f) / f;
}

// ─── Dérivés d'une nuit ──────────────────────────────────────────────────────
type NuitDerivee = {
  tib: number; // temps au lit (minutes)
  tst: number; // temps de sommeil total estimé (minutes)
  efficacite: number; // %
  latence: number; // centre de classe (minutes)
  nbReveils: number;
  milieu: number; // milieu de sommeil, minutes depuis midi
  qualite: number;
};

function derivee(nuit: NuitReponses): NuitDerivee {
  const tib = dureeMinutes(nuit.heureCoucher, nuit.heureLever);
  const latence = CENTRE_LATENCE[nuit.latence] ?? 0;
  const nbReveils = nuit.reveils?.nombre ?? 0;
  const dureeReveils = nuit.reveils ? (CENTRE_DUREE_REVEILS[nuit.reveils.dureeTotale] ?? 0) : 0;
  const tst = Math.max(0, tib - latence - dureeReveils);
  const efficacite = tib > 0 ? (tst / tib) * 100 : 0;
  const milieu = minutesDepuisMidi(nuit.heureCoucher) + tib / 2;
  return { tib, tst, efficacite, latence, nbReveils, milieu, qualite: nuit.qualite };
}

// Nuit plausible = temps au lit dans [120, 960] minutes.
function estPlausible(nuit: NuitReponses): boolean {
  const tib = dureeMinutes(nuit.heureCoucher, nuit.heureLever);
  return tib >= TIB_MIN_PLAUSIBLE && tib <= TIB_MAX_PLAUSIBLE;
}

// Nombre de nuits plausibles (sert au seuil d'agrégation et à la note « recueil
// transmis sans agrégation »).
export function compterNuitsPlausibles(nuits: NuitReponses[]): number {
  return nuits.filter(estPlausible).length;
}

// Agrège les nuits plausibles. Retourne `null` sous le seuil `MIN_NUITS_AGREGATS`
// (jamais un objet à zéros — l'absence d'agrégat est distincte d'un mauvais
// sommeil, cf. doctrine « trou, jamais 0 »).
export function calculerAgregats(nuits: NuitReponses[]): AgregatsAgenda | null {
  const plausibles = nuits.filter(estPlausible).map(derivee);
  if (plausibles.length < MIN_NUITS_AGREGATS) return null;

  return {
    AGD_NB_NUITS: plausibles.length,
    AGD_TIB_MOY: arrondi(moyenne(plausibles.map((n) => n.tib))),
    AGD_TST_MOY: arrondi(moyenne(plausibles.map((n) => n.tst))),
    AGD_EFF_MOY: arrondi(moyenne(plausibles.map((n) => n.efficacite))),
    AGD_LAT_MED: arrondi(mediane(plausibles.map((n) => n.latence))),
    AGD_REV_MOY: arrondi(moyenne(plausibles.map((n) => n.nbReveils)), 1),
    AGD_REG_ECT: arrondi(ecartType(plausibles.map((n) => n.milieu))),
    AGD_QUAL_MOY: arrondi(moyenne(plausibles.map((n) => n.qualite)), 1),
  };
}
