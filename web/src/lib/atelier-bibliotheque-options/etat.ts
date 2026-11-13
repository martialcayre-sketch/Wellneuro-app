// L'ÉTAT DU TEXTE D'UNE RUBRIQUE D'UNE OPTION ([[D-480]] §3, contrat de lecture
// de la migration `20261111180000_bibliotheque_options_textes_v1`) — pur.
//
// Rien ne stocke l'état : il se DÉRIVE de la DERNIÈRE version du couple option
// × rubrique (plus grand `numero`) et de ses actes, dernier acte au sens
// d'`ordre`. Une version neuve sans acte MASQUE la précédente : une ancienne
// version validée ne réapparaît jamais d'elle-même.
//
// Dans l'ordre (patron des libellés des fiches d'usage, `fiches-usage/etat.ts`) :
// l'illisible d'abord (`DC-24`), puis l'option hors de la structure, puis le
// lien à la structure — une version dont l'empreinte de structure n'est plus
// celle du jour est « à relire », quels que soient ses actes, jusqu'à une
// version neuve et son acte —, enfin l'état de ses actes.
//
// Module PUR : l'écran l'importe (types), le serveur le calcule.

import { etatDuTexte, type ActeLu, type EtatTexte } from '@/lib/fiches-usage/etat';

export type { ActeLu, EtatTexte };

export type EtatRubriqueOption =
  /** Aucune version saisie. */
  | { etat: 'vide' }
  /** L'option n'est plus (ou pas) déclarée par la structure du jour. */
  | { etat: 'hors_structure' }
  /** La version accompagne une autre structure que celle du jour. */
  | { etat: 'a_relire' }
  | EtatTexte;

export type VersionLue = { texteSha256: string; structureSha256: string; actes: readonly ActeLu[] };

export function etatDeLaRubrique(
  derniere: VersionLue | null,
  contexte: { empreinteStructure: string; optionDeclaree: boolean },
): EtatRubriqueOption {
  if (derniere === null) return { etat: 'vide' };
  const etat = etatDuTexte(derniere.texteSha256, derniere.actes);
  if (etat.etat === 'illisible') return etat;
  if (!contexte.optionDeclaree) return { etat: 'hors_structure' };
  if (derniere.structureSha256 !== contexte.empreinteStructure) return { etat: 'a_relire' };
  return etat;
}
