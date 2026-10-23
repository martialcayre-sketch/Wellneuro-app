// LA NATURE D'UNE INTENTION DE COMPLÉMENT ET SES SITUATIONS — [[D-345]] §1
// et §3, J3-12h, lot 1. Module FEUILLE : aucun import, pour qu'un composant
// client le lise sans tirer `node:crypto` (`bundleClient.guard.test.ts`).
//
// DEUX LISTES FERMÉES, ET RIEN D'AUTRE. Le praticien marque chaque action
// `supplement_exploration` « ciblé » ou « multivitaminé en vente libre » ;
// seule « ciblé » est gardée. Aucune valeur par défaut : une ligne neuve n'en
// porte pas, et c'est au clic de diffusion (lot 3) qu'une absence se refuse.
//
// LES SITUATIONS SONT DES IDENTIFIANTS OPAQUES (forme opaque du plan unique,
// [[D-285]]) : leurs libellés, et le claim qui adosse l'une d'elles, restent
// au dossier de preuve privé. Ce module n'en dit pas plus que l'identifiant.
// Leur provenance vit dans la table signée
// `lib/clinical/declencheursComplementCibleV1.ts`, dont le verrou exige que
// ses situations soient exactement celles-ci.

export const NATURES_COMPLEMENT = ['cible', 'multivitamine_vente_libre'] as const;
export type NatureComplement = (typeof NATURES_COMPLEMENT)[number];

export const SITUATIONS_COMPLEMENT = ['S-MG-1', 'S-MG-2'] as const;
export type SituationComplement = (typeof SITUATIONS_COMPLEMENT)[number];

export function estNatureComplement(valeur: unknown): valeur is NatureComplement {
  return typeof valeur === 'string' && (NATURES_COMPLEMENT as readonly string[]).includes(valeur);
}

export function estSituationComplement(valeur: unknown): valeur is SituationComplement {
  return typeof valeur === 'string' && (SITUATIONS_COMPLEMENT as readonly string[]).includes(valeur);
}
