// Les motifs d'annulation et de révocation d'un résultat de biologie
// ([[D-294]] §2 et §4) — listes FERMÉES, recopiées des CHECK de la migration
// `annulations_resultats_biologiques_v1`. Module PUR : l'écran en lit les
// libellés, la route les gardes ; aucun import serveur ici.
//
// Un motif neuf exige une décision et une migration : l'ajouter ici seul
// ferait refuser par la base un geste que l'écran propose.

export const MOTIFS_ANNULATION = ['mauvais_dossier', 'mauvaise_date_prelevement', 'mauvais_analyte'] as const;
export type MotifAnnulation = (typeof MOTIFS_ANNULATION)[number];

export const MOTIFS_REVOCATION = [
  'mauvais_resultat_annule',
  'resultat_verifie_exact',
  'motif_annulation_errone',
] as const;
export type MotifRevocation = (typeof MOTIFS_REVOCATION)[number];

export const LIBELLES_MOTIF_ANNULATION: Record<MotifAnnulation, string> = {
  mauvais_dossier: 'saisi dans le mauvais dossier',
  mauvaise_date_prelevement: 'mauvaise date de prélèvement',
  mauvais_analyte: 'mauvais analyte',
};

export const LIBELLES_MOTIF_REVOCATION: Record<MotifRevocation, string> = {
  mauvais_resultat_annule: 'l’annulation visait un autre résultat',
  resultat_verifie_exact: 'vérification faite, le résultat était exact',
  motif_annulation_errone: 'motif d’annulation erroné (à ré-annuler sous le bon motif)',
};

export function estMotifAnnulation(valeur: unknown): valeur is MotifAnnulation {
  return typeof valeur === 'string' && (MOTIFS_ANNULATION as readonly string[]).includes(valeur);
}

export function estMotifRevocation(valeur: unknown): valeur is MotifRevocation {
  return typeof valeur === 'string' && (MOTIFS_REVOCATION as readonly string[]).includes(valeur);
}
