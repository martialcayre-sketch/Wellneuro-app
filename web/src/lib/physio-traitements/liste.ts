// Les données physiologiques déclarées et les traitements en cours
// ([[D-335]] §2-§5, BP-13) — listes FERMÉES, recopiées des CHECK de la
// migration `donnees_physiologiques_traitements_v1`. Module PUR : les écrans
// en lisent les libellés, les routes les gardent ; aucun import ici, pour
// qu'un composant client le lise (`'use client'` ne supporte pas
// `node:crypto`).
//
// Une valeur neuve exige une décision et une migration : l'ajouter ici seul
// ferait refuser par la base un geste que l'écran propose. Aucune liste ne
// porte une classe de traitement, un IMC ni un code de référentiel (§10).

export const CRITERES = ['sexe_declare', 'statut_menstruel', 'grossesse', 'allaitement', 'poids', 'taille'] as const;
export type Critere = (typeof CRITERES)[number];

export const CRITERES_FERMES = ['sexe_declare', 'statut_menstruel', 'grossesse', 'allaitement'] as const;
export type CritereFerme = (typeof CRITERES_FERMES)[number];

export const CRITERES_MESURES = ['poids', 'taille'] as const;
export type CritereMesure = (typeof CRITERES_MESURES)[number];

/** Au portail, le patient pose ces deux critères ; le reste reste à l'anamnèse (arbitrage du 2026-10-21). */
export const CRITERES_DU_PATIENT: readonly Critere[] = ['sexe_declare', 'statut_menstruel'];

export const REPONSES_PAR_CRITERE: Record<CritereFerme, readonly string[]> = {
  sexe_declare: ['feminin', 'masculin', 'autre', 'inconnu'],
  statut_menstruel: ['cycles_reguliers', 'cycles_irreguliers', 'absence_de_cycles', 'menopause', 'inconnu'],
  grossesse: ['oui', 'non', 'inconnu'],
  allaitement: ['oui', 'non', 'inconnu'],
};

/** Le statut menstruel se pose si le sexe déclaré en vigueur est l'un de ceux-ci ([[D-335]] §2). */
export const SEXES_OUVRANT_LE_STATUT: readonly string[] = ['feminin', 'autre'];

/**
 * Bornes TECHNIQUES de saisie (arbitrage du 2026-10-20) : elles refusent une
 * saisie absurde et n'ont AUCUN sens clinique. Les mêmes que les CHECK.
 */
export const POIDS_MIN_KG = 1;
export const POIDS_MAX_KG = 500;
export const TAILLE_MIN_CM = 30;
export const TAILLE_MAX_CM = 260;

export const NATURES = ['medicament', 'complement'] as const;
export type Nature = (typeof NATURES)[number];

export const PRECISIONS = ['jour', 'mois', 'annee', 'inconnu'] as const;
export type Precision = (typeof PRECISIONS)[number];

export const PRESCRIT_PAR_TIERS = ['oui', 'non', 'inconnu'] as const;
export type PrescritParTiers = (typeof PRESCRIT_PAR_TIERS)[number];

/** Longueurs maximales des textes d'un traitement : celles des CHECK (bornes de saisie). */
export const NOM_MAX = 200;
export const DOSE_MAX = 200;
export const MOMENT_MAX = 200;
export const MOTIF_MAX = 500;

export const SOURCES = ['patient', 'praticien'] as const;
export type Source = (typeof SOURCES)[number];

export function estCritere(valeur: unknown): valeur is Critere {
  return typeof valeur === 'string' && (CRITERES as readonly string[]).includes(valeur);
}

export function estCritereMesure(critere: Critere): critere is CritereMesure {
  return (CRITERES_MESURES as readonly string[]).includes(critere);
}

/**
 * Un texte tel qu'il s'écrit : tous les blancs Unicode (espaces insécables,
 * blancs de largeur nulle compris) ramenés à une espace, sans blanc en tête ni
 * en queue — le `~ '\S'` de la base ne le garantit pas selon sa locale
 * (revue `wn-reviewer` de la migration). Un texte fait de blancs : `null`.
 */
export function normaliserTexte(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null;
  // Les caractères de contrôle (U+0000 compris, que PostgreSQL refuse dans un
  // texte) deviennent des blancs comme les autres (revue `wn-reviewer`).
  // eslint-disable-next-line no-control-regex
  const texte = valeur.normalize('NFC').replace(/[\s\u0000-\u001F\u007F​-‍⁠﻿]+/gu, ' ').trim();
  return texte.length > 0 ? texte : null;
}

// ── Les libellés du cockpit (praticien) ─────────────────────────────────────

export const LIBELLES_CRITERE: Record<Critere, string> = {
  sexe_declare: 'Sexe déclaré',
  statut_menstruel: 'Statut menstruel',
  grossesse: 'Grossesse',
  allaitement: 'Allaitement',
  poids: 'Poids',
  taille: 'Taille',
};

export const LIBELLES_REPONSE: Record<string, string> = {
  feminin: 'féminin',
  masculin: 'masculin',
  autre: 'autre',
  inconnu: 'inconnu',
  cycles_reguliers: 'cycles réguliers',
  cycles_irreguliers: 'cycles irréguliers',
  absence_de_cycles: 'absence de cycles',
  menopause: 'ménopause',
  oui: 'oui',
  non: 'non',
};

export const UNITES: Record<CritereMesure, string> = { poids: 'kg', taille: 'cm' };

export const LIBELLES_NATURE: Record<Nature, string> = { medicament: 'Médicament', complement: 'Complément' };

export const LIBELLES_SOURCE_PRATICIEN: Record<Source, string> = {
  patient: 'déclaré par le patient',
  praticien: 'confirmé par le praticien',
};

/** Un critère sans ligne. Ni « inconnu » (une réponse écrite), ni « non » (DC-24). */
export const NON_RENSEIGNE = 'non renseigné';

// ── Les libellés du portail (patient), validés le 2026-10-21 ───────────────

export const QUESTION_SEXE = 'Quel est votre sexe ?';
export const QUESTION_CYCLES = 'Où en sont vos cycles ?';

export const LIBELLES_REPONSE_PATIENT: Record<'sexe_declare' | 'statut_menstruel', Record<string, string>> = {
  sexe_declare: {
    feminin: 'Féminin',
    masculin: 'Masculin',
    autre: 'Autre',
    inconnu: 'Je préfère ne pas répondre',
  },
  statut_menstruel: {
    cycles_reguliers: 'Réguliers',
    cycles_irreguliers: 'Irréguliers',
    absence_de_cycles: 'Pas de cycles en ce moment',
    menopause: 'Ménopause',
    inconnu: 'Je ne sais pas',
  },
};

export const BLOCS_PATIENT: Record<Nature, { titre: string; ajout: string; motif: string }> = {
  medicament: { titre: 'Médicaments en cours', ajout: 'Ajouter un médicament', motif: 'Motif' },
  complement: { titre: 'Compléments alimentaires en cours', ajout: 'Ajouter un complément', motif: 'Objectif' },
};

export const CHAMPS_PATIENT = {
  nom: 'Nom',
  dose: 'Dose',
  moment: 'Moment de prise',
  depuis: 'Depuis quand',
  prescrit: 'Prescrit par un autre soignant ?',
  arret: 'Je ne le prends plus',
  arretDepuis: 'Depuis quand ?',
  supprimer: 'Supprimer cette ligne',
} as const;

export const LIBELLES_PRESCRIT_PATIENT: Record<PrescritParTiers, string> = {
  oui: 'Oui',
  non: 'Non',
  inconnu: 'Je ne sais pas',
};

/** Une date de traitement que le patient ne connaît pas ([[D-335]] §4). */
export const DATE_INCONNUE_PATIENT = 'Je ne sais pas';

export const MENTION_SOURCE_PATIENT: Record<Source, string> = {
  patient: 'Ajouté par vous le',
  praticien: 'Confirmé par votre praticien le',
};
