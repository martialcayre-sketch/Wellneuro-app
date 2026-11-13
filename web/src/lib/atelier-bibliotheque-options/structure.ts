import {
  BIBLIOTHEQUE_BESOIN2_SHA256,
  BIBLIOTHEQUE_BESOIN2_V1,
  etatBibliotheque,
  type EtatBibliotheque,
} from '@/lib/bibliotheque-options/bibliothequeBesoin2V1';
import { estIdentifiantOption, estRubriqueOption, RUBRIQUES_OPTION, type RubriqueOption } from '@/lib/bibliotheque-options/vocabulaire';

// LE SEUL LECTEUR ADMIS DE LA BIBLIOTHÈQUE DES OPTIONS HORS DE SON DOSSIER
// ([[D-480]] §8, banc `bibliotheque-options/importeurs.guard.test.ts`). Les
// routes, la lecture, l'écriture et l'écran de l'atelier passent par lui :
// aucun autre fichier n'importe `bibliotheque-options/`.
//
// Ce qu'il rend est la STRUCTURE DE RÉFÉRENCES (D-480 §3, première couche) :
// identifiants opaques, hypothèses, populations et renvois. Aucun texte
// clinique, aucune valeur. Il ne lit aucun dossier et n'en reçoit aucun : la
// bibliothèque énumère, elle ne choisit pas (§5.4). Rien de ce qu'il rend ne
// va au patient, au courrier, au scoring, à la recherche ni à un modèle (§8).

export { estIdentifiantOption, estRubriqueOption, RUBRIQUES_OPTION, type RubriqueOption, type EtatBibliotheque };

/** Une option telle que la structure la déclare — références seules. */
export type OptionDeclaree = {
  id: string;
  hypothese: string;
  populations: readonly string[];
  renvois: Readonly<Record<RubriqueOption, readonly string[]>>;
};

export type ContexteAtelier = {
  /** L'empreinte de la structure du jour, celle que porte chaque version neuve (`structure_sha256`). */
  empreinteStructure: string;
  /** `etatBibliotheque(...)`, le prédicat à consommer : valider un texte exige `signee`. */
  etatStructure: EtatBibliotheque;
  options: readonly OptionDeclaree[];
};

/** La structure du dépôt (besoin 2), son empreinte et son état du jour. */
export function contexteDuDepot(): ContexteAtelier {
  return {
    empreinteStructure: BIBLIOTHEQUE_BESOIN2_SHA256,
    etatStructure: etatBibliotheque(),
    options: BIBLIOTHEQUE_BESOIN2_V1.options.map(o => ({
      id: o.id,
      hypothese: o.hypothese,
      populations: [...o.populations],
      renvois: Object.fromEntries(RUBRIQUES_OPTION.map(r => [r, [...(o.renvois[r] ?? [])]])) as Record<RubriqueOption, string[]>,
    })),
  };
}
