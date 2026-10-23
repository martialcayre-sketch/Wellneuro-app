// Les décisions de parcours ([[D-343]], BP-15) — listes FERMÉES, recopiées
// des CHECK de la migration `decisions_parcours_v1`, et les libellés du
// cockpit retenus par le responsable le 2026-10-22. Module PUR : l'écran en
// lit les libellés, la route les garde ; aucun import serveur, pour qu'un
// composant client le lise.
//
// Une valeur neuve exige une décision et une migration : l'ajouter ici seul
// ferait refuser par la base un geste que l'écran propose. Aucun motif
// d'efficacité (DC-39) : ni « inefficace », ni « objectif atteint », ni
// « amélioration ».

export const NATURES = ['preference', 'refus', 'debut', 'interruption', 'reprise', 'arret', 'revision'] as const;
export type Nature = (typeof NATURES)[number];

export type Famille = 'choix' | 'mise_en_oeuvre' | 'revision';

export const NATURES_CHOIX: readonly Nature[] = ['preference', 'refus'];
export const NATURES_MISE_EN_OEUVRE: readonly Nature[] = ['debut', 'interruption', 'reprise', 'arret'];

/** La famille d'une nature ([[D-343]] §3) : un remplacement n'en change pas. */
export function famille(nature: Nature): Famille {
  if (NATURES_CHOIX.includes(nature)) return 'choix';
  if (NATURES_MISE_EN_OEUVRE.includes(nature)) return 'mise_en_oeuvre';
  return 'revision';
}

export const ISSUES = ['maintenir', 'ajuster', 'arreter'] as const;
export type Issue = (typeof ISSUES)[number];

export const SOURCES = ['rapporte_par_patient', 'constate_par_praticien'] as const;
export type Source = (typeof SOURCES)[number];

export const MOTIFS_CHOIX = ['choix_du_patient', 'contrainte_pratique', 'avis_autre_soignant', 'autre'] as const;
export const MOTIFS_INTERRUPTION = [
  'effet_indesirable_rapporte',
  'contrainte_pratique',
  'choix_du_patient',
  'avis_autre_soignant',
  'evenement_intercurrent',
  'autre',
] as const;
export const MOTIFS_REVISION = [
  'mise_en_oeuvre_incomplete',
  'nouvelle_donnee_au_dossier',
  'effet_indesirable_rapporte',
  'choix_du_patient',
  'autre',
] as const;

/**
 * Les motifs admis pour une nature (et l'issue d'une révision) ; une liste
 * vide : aucun motif ne se pose (début, reprise, maintien).
 */
export function motifsPermis(nature: Nature, issue: Issue | null): readonly string[] {
  if (NATURES_CHOIX.includes(nature)) return MOTIFS_CHOIX;
  if (nature === 'interruption' || nature === 'arret') return MOTIFS_INTERRUPTION;
  if (nature === 'revision' && (issue === 'ajuster' || issue === 'arreter')) return MOTIFS_REVISION;
  return [];
}

/** La note : obligatoire avec `autre` et pour une préférence ([[D-343]] §4). */
export function noteRequise(nature: Nature, motif: string | null): boolean {
  return motif === 'autre' || nature === 'preference';
}

/** Les bornes des CHECK. */
export const NOTE_MAX = 2000;
export const ACTION_MAX = 200;

// ── Les libellés du cockpit (retenus tels quels le 2026-10-22) ──────────────

export const LIBELLES_NATURE: Record<Nature, string> = {
  preference: 'préférence du patient',
  refus: 'refus du patient',
  debut: 'début réel',
  interruption: 'interruption',
  reprise: 'reprise',
  arret: 'arrêt',
  revision: 'révision',
};

export const LIBELLES_ISSUE: Record<Issue, string> = {
  maintenir: 'maintenir',
  ajuster: 'ajuster',
  arreter: 'arrêter',
};

export const LIBELLES_SOURCE: Record<Source, string> = {
  rapporte_par_patient: 'rapporté par le patient',
  constate_par_praticien: 'constaté par le praticien',
};

export const LIBELLES_MOTIF: Record<string, string> = {
  choix_du_patient: 'choix du patient',
  contrainte_pratique: 'contrainte pratique',
  avis_autre_soignant: 'avis d’un autre soignant',
  effet_indesirable_rapporte: 'effet indésirable rapporté',
  evenement_intercurrent: 'événement intercurrent',
  mise_en_oeuvre_incomplete: 'mise en œuvre incomplète',
  nouvelle_donnee_au_dossier: 'nouvelle donnée au dossier',
  autre: 'autre motif (note obligatoire)',
};

export const TEXTES = {
  titre: 'Décisions de parcours',
  dateInconnue: 'date inconnue',
  rappelEffetIndesirable: 'Noter ici ne remplace pas le signalement d’effet indésirable.',
  sequenceIncomplete: 'Séquence incomplète : rien n’est déduit des événements absents.',
  confirmerRetrait: 'Retirer cette décision ? Elle restera lisible dans l’historique.',
} as const;

export const estNature = (v: unknown): v is Nature => typeof v === 'string' && (NATURES as readonly string[]).includes(v);
export const estIssue = (v: unknown): v is Issue => typeof v === 'string' && (ISSUES as readonly string[]).includes(v);
export const estSource = (v: unknown): v is Source => typeof v === 'string' && (SOURCES as readonly string[]).includes(v);
