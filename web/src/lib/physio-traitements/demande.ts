// La demande d'une ligne de donnée physiologique ou de traitement, lue et
// validée AVANT toute écriture ([[D-335]] §2-§5, BP-13) — PUR. La base refuse
// de son côté (CHECK, triggers) ; la route le dit avant, avec un refus nommé.
// Ce que la base ne tient pas, la demande le tient : des textes normalisés
// (blancs Unicode), aucune date future, et les critères que le patient pose.
//
// La main (`patient` ou `praticien`) vient de la ROUTE, jamais du corps : un
// corps ne choisit pas sa source.

import { identifiant } from '@/lib/bio-parcours/constats/demande';
import { estFuture, finApresDebut, lireDatePeriode, type DatePeriode } from './dates';
import {
  CRITERES_DU_PATIENT,
  DOSE_MAX,
  estCritere,
  estCritereMesure,
  MOMENT_MAX,
  MOTIF_MAX,
  NATURES,
  NOM_MAX,
  normaliserTexte,
  POIDS_MAX_KG,
  POIDS_MIN_KG,
  PRESCRIT_PAR_TIERS,
  REPONSES_PAR_CRITERE,
  TAILLE_MAX_CM,
  TAILLE_MIN_CM,
  type Critere,
  type CritereFerme,
  type Nature,
  type PrescritParTiers,
  type Source,
} from './liste';

export type DemandePhysio =
  | {
      acte: 'pose';
      critere: Critere;
      remplace: string | null;
      reponse: string | null;
      /** Mesure en chaîne décimale (`72.5`), avec sa date. */
      mesure: string | null;
      mesureLe: string | null;
    }
  | { acte: 'retrait'; critere: Critere; remplace: string };

export type DemandeTraitement =
  | {
      acte: 'pose';
      remplace: string | null;
      nature: Nature;
      nom: string;
      dose: string | null;
      moment: string | null;
      motif: string | null;
      debut: DatePeriode;
      /** `null` : en cours. */
      fin: DatePeriode | null;
      prescritParTiers: PrescritParTiers;
    }
  | { acte: 'retrait'; remplace: string };

export type Lecture<T> = { ok: true; demande: T } | { ok: false; raison: string };

const absent = (v: unknown) => v === undefined || v === null;

// L'an 0000 n'existe pas pour la base : refusé par la forme, comme dans `dates.ts`.
const RE_DATE = /^(?!0000)\d{4}-\d{2}-\d{2}$/;
const RE_POIDS = /^\d{1,3}(?:[.,]\d)?$/;
const RE_TAILLE = /^\d{1,3}$/;

function lireRemplace(valeur: unknown): string | null | false {
  if (absent(valeur)) return null;
  const id = identifiant(valeur);
  return id || false;
}

/** Une mesure lue en chaîne décimale normalisée, ou `null` si elle est illisible ou hors des bornes techniques. */
function lireMesure(critere: 'poids' | 'taille', valeur: unknown): string | null {
  const brute = typeof valeur === 'number' ? String(valeur) : typeof valeur === 'string' ? valeur.trim() : '';
  const forme = critere === 'poids' ? RE_POIDS : RE_TAILLE;
  if (!forme.test(brute)) return null;
  const texte = brute.replace(',', '.');
  const nombre = Number(texte);
  const [min, max] = critere === 'poids' ? [POIDS_MIN_KG, POIDS_MAX_KG] : [TAILLE_MIN_CM, TAILLE_MAX_CM];
  if (!Number.isFinite(nombre) || nombre < min || nombre > max) return null;
  return String(nombre);
}

function estDateCivile(valeur: string): boolean {
  if (!RE_DATE.test(valeur)) return false;
  const d = new Date(`${valeur}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valeur;
}

export function lireDemandePhysio(
  corps: Record<string, unknown>,
  main: Source,
  aujourdhui: string,
): Lecture<DemandePhysio> {
  const acte = corps.acte;
  if (acte !== 'pose' && acte !== 'retrait') return { ok: false, raison: 'acte_invalide' };
  const critere = corps.critere;
  if (!estCritere(critere)) return { ok: false, raison: 'critere_invalide' };
  if (main === 'patient' && !CRITERES_DU_PATIENT.includes(critere)) return { ok: false, raison: 'critere_non_ouvert' };

  const remplace = lireRemplace(corps.remplace);
  if (remplace === false) return { ok: false, raison: 'remplacement_invalide' };

  if (acte === 'retrait') {
    if (remplace === null) return { ok: false, raison: 'remplacement_invalide' };
    if (!absent(corps.reponse) || !absent(corps.mesure) || !absent(corps.mesureLe)) return { ok: false, raison: 'acte_invalide' };
    return { ok: true, demande: { acte, critere, remplace } };
  }

  if (estCritereMesure(critere)) {
    if (!absent(corps.reponse)) return { ok: false, raison: 'acte_invalide' };
    const mesure = lireMesure(critere, corps.mesure);
    if (mesure === null) return { ok: false, raison: 'mesure_invalide' };
    const mesureLe = corps.mesureLe;
    if (typeof mesureLe !== 'string' || !estDateCivile(mesureLe)) return { ok: false, raison: 'date_invalide' };
    if (mesureLe > aujourdhui) return { ok: false, raison: 'date_future' };
    return { ok: true, demande: { acte, critere, remplace, reponse: null, mesure, mesureLe } };
  }

  if (!absent(corps.mesure) || !absent(corps.mesureLe)) return { ok: false, raison: 'acte_invalide' };
  const reponse = corps.reponse;
  if (typeof reponse !== 'string' || !REPONSES_PAR_CRITERE[critere as CritereFerme].includes(reponse)) {
    return { ok: false, raison: 'reponse_invalide' };
  }
  return { ok: true, demande: { acte, critere, remplace, reponse, mesure: null, mesureLe: null } };
}

/** Un texte facultatif : `null` s'il est absent ou fait de blancs, `false` s'il est illisible ou trop long. */
function texteFacultatif(valeur: unknown, max: number): string | null | false {
  if (absent(valeur)) return null;
  if (typeof valeur !== 'string') return false;
  const texte = normaliserTexte(valeur);
  if (texte !== null && texte.length > max) return false;
  return texte;
}

export function lireDemandeTraitement(
  corps: Record<string, unknown>,
  aujourdhui: string,
): Lecture<DemandeTraitement> {
  const acte = corps.acte;
  if (acte !== 'pose' && acte !== 'retrait') return { ok: false, raison: 'acte_invalide' };
  const remplace = lireRemplace(corps.remplace);
  if (remplace === false) return { ok: false, raison: 'remplacement_invalide' };

  if (acte === 'retrait') {
    if (remplace === null) return { ok: false, raison: 'remplacement_invalide' };
    for (const cle of ['nature', 'nom', 'dose', 'moment', 'motif', 'debut', 'fin', 'prescritParTiers']) {
      if (!absent(corps[cle])) return { ok: false, raison: 'acte_invalide' };
    }
    return { ok: true, demande: { acte, remplace } };
  }

  const nature = corps.nature;
  if (typeof nature !== 'string' || !(NATURES as readonly string[]).includes(nature)) return { ok: false, raison: 'nature_invalide' };
  if (typeof corps.nom !== 'string') return { ok: false, raison: 'nom_requis' };
  const nom = normaliserTexte(corps.nom);
  if (nom === null) return { ok: false, raison: 'nom_requis' };
  if (nom.length > NOM_MAX) return { ok: false, raison: 'texte_trop_long' };
  const dose = texteFacultatif(corps.dose, DOSE_MAX);
  const moment = texteFacultatif(corps.moment, MOMENT_MAX);
  const motif = texteFacultatif(corps.motif, MOTIF_MAX);
  if (dose === false || moment === false || motif === false) return { ok: false, raison: 'texte_trop_long' };

  const debut = lireDatePeriode(corps.debut);
  if (debut === null) return { ok: false, raison: 'date_invalide' };
  let fin: DatePeriode | null = null;
  if (!absent(corps.fin)) {
    fin = lireDatePeriode(corps.fin);
    if (fin === null) return { ok: false, raison: 'date_invalide' };
  }
  if (estFuture(debut, aujourdhui) || (fin !== null && estFuture(fin, aujourdhui))) return { ok: false, raison: 'date_future' };
  if (!finApresDebut(debut, fin)) return { ok: false, raison: 'fin_avant_debut' };

  const prescrit = corps.prescritParTiers;
  if (typeof prescrit !== 'string' || !(PRESCRIT_PAR_TIERS as readonly string[]).includes(prescrit)) {
    return { ok: false, raison: 'prescrit_invalide' };
  }

  return {
    ok: true,
    demande: {
      acte,
      remplace,
      nature: nature as Nature,
      nom,
      dose,
      moment,
      motif,
      debut,
      fin,
      prescritParTiers: prescrit as PrescritParTiers,
    },
  };
}
