// LE REGISTRE DES LIBELLÉS D'HYPOTHÈSE ([[D-477]] §2, [[D-331]] §3, [[D-535]]) — pur.
//
// Un libellé d'hypothèse nomme un ÉTAT FONCTIONNEL, jamais le résultat d'un
// dosage, sa comparaison à un seuil, ni une qualification diagnostique
// ([[D-477]] §2, DC-31). Il suit le registre des constats : la réponse du
// responsable à la question `20261111-0008-b` (« même règle, garde dans le
// code ») veut que la garde refuse à l'atelier les termes exclus et les
// formulations diagnostiques, selon une liste explicite et relisible. La voici,
// et rien d'autre : chaque entrée cite sa provenance, aucune n'est inventée.
//
// Elle COMPLÈTE la validation par acte, elle ne la remplace pas : un libellé qui
// passe cette liste n'en est pas validé pour autant. Elle ne vise que les
// hypothèses ; les populations n'en relèvent pas.
//
// Comparaison sans casse ni accents, par sous-chaîne : « Déficitaire » et
// « deficit » tombent sous « déficit », « excessif » sous « excès » — et
// « relevé » sous « élevé » : le libellé se reformule ([[D-535]] §2).
// Module PUR, sans import : l'écran pourra le lire.

/** Les termes écartés par [[D-331]] §3 : ils jugent une valeur ou posent un diagnostic. */
export const TERMES_ECARTES_D331 = ['normal', 'anormal', 'déficit', 'carence', 'excès'] as const;

/**
 * Les formulations diagnostiques : la racine de « diagnostic », mot interdit
 * sans dérogation (`REGISTRE_FRONTIERES.md` §1, DC-31, DC-32).
 */
export const RACINES_DIAGNOSTIQUES_LIBELLE = ['diagnos'] as const;

/**
 * Les formulations diagnostiques dictées par le responsable le 2026-11-16
 * ([[D-535]], question `20261116-2208-c-2`) : « hors plage » et « élevé »
 * viennent de la sentinelle de [[D-157]] §3, sans « bas » — les hypothèses de
 * [[D-477]] sont de sens bas ; les quatre autres, du responsable.
 */
export const FORMULATIONS_DIAGNOSTIQUES_D535 = [
  'hors plage',
  'élevé',
  'pathologie',
  'maladie',
  'syndrome',
  'trouble',
] as const;

const TERMES_DU_REGISTRE: readonly string[] = [
  ...TERMES_ECARTES_D331,
  ...RACINES_DIAGNOSTIQUES_LIBELLE,
  ...FORMULATIONS_DIAGNOSTIQUES_D535,
];

// Caractères invisibles (trait d'union conditionnel, largeur nulle) supprimés ;
// espaces de toute sorte et tirets ramenés à une espace : « hors-plage », une
// espace insécable ou un « car­ence » coupé ne passent pas la liste.
const INVISIBLES = /[­​-‍⁠﻿]/g;
const SEPARATEURS = /[\s‐-―-]+/gu;

function replier(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(INVISIBLES, '')
    .replace(SEPARATEURS, ' ')
    .toLowerCase();
}

/**
 * Les termes du registre que porte ce libellé, dans l'ordre de la liste, sans
 * doublon. Vide : le libellé n'en porte aucun. Ne rend jamais le texte lu.
 */
export function termesHorsRegistre(libelle: string): string[] {
  const replie = replier(libelle);
  return TERMES_DU_REGISTRE.filter(terme => replie.includes(replier(terme)));
}
