// LE VOCABULAIRE DU COMPTEUR « Voir les sources et limites » — module-feuille.
//
// MODULE-FEUILLE, ET IL DOIT LE RESTER : il n'importe rien. Un composant client
// le lit pour nommer ce qu'il envoie, la route le lit pour valider ce qu'elle
// reçoit, un banc le lit pour les tenir ensemble. Lui faire importer `prisma` ou
// `auth` le rendrait inimportable depuis le navigateur — c'est la contrainte de
// bundle déjà payée deux fois dans ce dépôt (`lib/anthropic.ts`, `lib/prisma`).

/**
 * LES DEUX ESPÈCES COMPTÉES, ET POURQUOI ELLES VONT PAR PAIRE.
 *
 * `affichage` est le DÉNOMINATEUR. Sans lui, « 40 ouvertures » se lit comme un
 * résultat sans en être un : il ne distingue pas une surface consultée
 * systématiquement d'une surface ignorée quatre-vingt-dix-neuf fois sur cent.
 * Servir le numérateur seul serait produire exactement le nombre sans
 * dénominateur que cette campagne poursuit depuis son premier lot.
 *
 * L'ordre est celui du calcul : dénominateur d'abord, numérateur ensuite.
 */
export const ESPECES_MESUREES = ['affichage', 'ouverture'] as const;

export type EspeceMesuree = (typeof ESPECES_MESUREES)[number];

/**
 * L'espèce reçue est-elle l'une des deux ?
 *
 * La liste étroite est tenue ICI et en base (`CHECK`), pas seulement à l'écran :
 * un écran qui n'offre pas un geste ne l'interdit pas ([[D-164]]).
 */
export function estEspeceMesuree(valeur: unknown): valeur is EspeceMesuree {
  return typeof valeur === 'string' && (ESPECES_MESUREES as readonly string[]).includes(valeur);
}

/**
 * LE TAUX D'OUVERTURE, ou `null` quand il n'a pas de sens.
 *
 * `null` SUR UN DÉNOMINATEUR NUL, ET JAMAIS ZÉRO. Zéro se lit « personne
 * n'ouvre » ; l'absence d'affichage se lit « on ne sait pas ». Rendre `0` ferait
 * porter à la surface un désintérêt qui vient de l'absence de mesure — c'est la
 * lecture d'une absence comme une normalité que `DC-24` interdit.
 *
 * `null` AUSSI QUAND LES OUVERTURES DÉPASSENT LES AFFICHAGES. Ce n'est pas un
 * taux supérieur à 1, c'est une mesure cassée : un montage non compté, un double
 * envoi. La rendre comme « 120 % » donnerait un chiffre à quelque chose qui n'en
 * a pas.
 */
export function tauxOuverture(compteurs: { affichage: number; ouverture: number }): number | null {
  const { affichage, ouverture } = compteurs;
  if (!Number.isFinite(affichage) || !Number.isFinite(ouverture)) return null;
  if (affichage <= 0) return null;
  if (ouverture > affichage) return null;
  return ouverture / affichage;
}

/**
 * LE JOUR D'UN INSTANT, en UTC, pour la clé du compteur.
 *
 * UTC ET NON L'HEURE LOCALE : le serveur, la base et les bancs doivent tomber
 * sur la même journée. Une bascule de fuseau ferait glisser des incréments d'un
 * jour à l'autre et rendrait deux quotients faux au lieu d'un.
 */
export function jourDeMesure(instant: Date): Date {
  return new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()));
}
