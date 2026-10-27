// LES TROIS PLANS DE CHAQUE ACTION — lettre bb, fiche H49, [[D-384]] §2.
//
// MODULE PUR, LISIBLE PAR LE NAVIGATEUR : le détail du protocole en tire ses
// intitulés. Aucune horloge, aucune base, aucune variable d'environnement — le
// drapeau et la marque se jugent côté serveur (`troisPlans.ts`), et la route du
// protocole sert les plans ou ne les sert pas.
//
// TEXTE VALIDÉ MOT POUR MOT LE 2026-10-26 ([[D-384]] §2), recopié ici : un banc
// relit la décision et rougit au premier écart. Seule l'apostrophe est
// typographique, comme sur tout le portail. Aucune couleur, aucun chiffre,
// aucun rang.

export const CHAPEAU_TROIS_PLANS = 'Selon votre journée :';

/** Dans cet ordre : idéal, minimal, secours ([[D-384]] §2). */
export const INTITULES_TROIS_PLANS = {
  idealPlan: 'Si tout va bien',
  minimalPlan: 'Au quotidien',
  rescuePlan: 'Si c’est plus dur',
} as const;
