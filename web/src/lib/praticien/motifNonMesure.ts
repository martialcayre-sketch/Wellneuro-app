// LE MOTIF D'UN BESOIN NON MESURÉ, EN LISTE FERMÉE — r3_08 (Q3, Q4 de l'audit
// des instruments des 12 besoins, arbitrages du 2026-10-22 ; libellés relus et
// validés par le responsable le 2026-10-24, avant le code).
//
// Le tiret reste ([[D-301]] §1) ; le motif se lit sur une ligne dépliable
// d'un geste, sous lui (`DC-25` : données insuffisantes ⇒ le dire). Un motif
// décrit l'état du RECUEIL tel que le calcul l'a lu (Q5 : les routes, pas le
// snapshot) : il ne juge aucune valeur et ne se lit pas comme une relance.
//
// Six motifs, un par étage du code qui rend `null` (`score.ts`,
// `depuisPrisma.ts`), plus B2 « hors score » et les deux branches résiduelles
// du moteur. Les codes sont produits par `lib/equilibre/motifsBesoins.ts`, sur
// le même chemin que la valeur.
//
// CE MODULE N'IMPORTE RIEN, et c'est une propriété : `FichePatientPanel.tsx`
// et `DetailBesoinsPanel.tsx` sont `'use client'` (même contrainte que
// `provenanceChiffre.ts`).

export type MotifNonMesure =
  | 'hors_score'
  | 'sans_instrument'
  | 'aucune_passation'
  | 'passation_ecartee'
  | 'source_suspendue'
  | 'recueil_incomplet'
  | 'forme_sans_sous_score'
  | 'calcul_en_erreur'
  | 'sous_score_absent_ou_double';

/** Un motif, les questionnaires qu'il concerne, et pour un recueil incomplet
 *  la date de la passation retenue. */
export type MotifNonMesureServi = {
  motif: MotifNonMesure;
  idsQuestionnaire: string[];
  dateDernierePassation: string | null; // ISO
};

/** Libellé du geste qui ouvre le motif. */
export const LIBELLE_GESTE_MOTIF = 'Motif';

const PREFIXE = 'Non mesuré';

const LIBELLES: Record<MotifNonMesure, string> = {
  hors_score: 'hors score (D-122)',
  sans_instrument: 'aucun instrument au mapping',
  aucune_passation: 'aucune passation exploitable',
  passation_ecartee: 'passation écartée par le filtre de validité',
  source_suspendue: 'source suspendue',
  recueil_incomplet: 'recueil incomplet à la dernière passation',
  forme_sans_sous_score: 'sous-score non servi par la forme du questionnaire',
  calcul_en_erreur: 'calcul du questionnaire en erreur',
  sous_score_absent_ou_double: 'sous-score absent ou en double dans le résultat',
};

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

/** La ligne servie au praticien, au mot près des libellés validés. */
export function ligneMotif(m: MotifNonMesureServi): string {
  const date = m.motif === 'recueil_incomplet' && m.dateDernierePassation ? `, du ${dateCourte(m.dateDernierePassation)}` : '';
  const ids = m.idsQuestionnaire.length > 0 ? ` (${m.idsQuestionnaire.join(', ')})` : '';
  return `${PREFIXE} · ${LIBELLES[m.motif]}${date}${ids}`;
}
