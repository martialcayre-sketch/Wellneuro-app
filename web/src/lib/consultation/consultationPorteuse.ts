import { Prisma } from '@/generated/prisma';

// LA CONSULTATION QUI FAIT FOI — [[D-101]], LOT-05 « Doctrine exécutable ».
//
// LA DETTE QUE CE MODULE FERME. Deux sélections coexistaient dans le dépôt pour
// répondre à la même question — « quelle anamnèse lire sur ce dossier ? » — et
// elles ne rendaient pas toujours la même ligne :
//
//   · la chaîne C1 (cockpit, `verifierChaineC1`, `preconditionsT0Prisma`) lisait
//     `statut: 'validee'`, triée par `dateValidation` ;
//   · l'orientation, les contradictions, la synthèse et la proposition de bilan
//     lisaient « la consultation qui PORTE une anamnèse », triée par `createdAt`.
//
// Sur un dossier portant deux consultations validées dans un ordre divergent, la
// synthèse pouvait nommer un signal que le cockpit ne voyait pas — et la
// synthèse passe par `extraireVigilanceDeterministe`, le repli exact sur lequel
// s'appuie le rang `vigilance` de la cotation signée. La divergence était
// PRÉEXISTANTE ; le LOT-04 l'a fait porter sur un chemin de sécurité et l'a
// renvoyée ici.
//
// L'ARBITRAGE, ET IL EST PLUS RESTRICTIF. `statut: 'validee'` fait foi, trié par
// `dateValidation`. Une anamnèse saisie mais non validée cesse d'alimenter la
// synthèse, l'orientation, les contradictions et la proposition de bilan.
//
// POURQUOI LA CONDITION D'ANAMNÈSE EST CONSERVÉE PAR-DESSUS, ET CE N'EST PAS UN
// COMPROMIS. Les deux sélections ne visaient pas le même défaut, et prendre
// l'une SANS l'autre en rouvrirait un :
//
//   · sans `statut: 'validee'`, une anamnèse en cours de saisie ferait foi ;
//   · sans la condition d'anamnèse, une consultation validée dont l'anamnèse est
//     nulle serait retenue, et `signauxDeclares` rendrait `[]` — « je n'ai pas
//     regardé » servi comme « aucun signal », ce que `DC-24` interdit sur
//     précisément le chemin où le LOT-04 a posé l'inhibition.
//
// Le chemin d'écriture ne rend pas la seconde condition redondante : il n'y en a
// qu'un (`api/portail/valider`, qui pose `anamnese`, `statut` et `dateValidation`
// dans le même `update`), mais rien dans le schéma ne l'impose, et une
// consultation validée sans anamnèse resterait lisible sans faire rougir
// personne. La garde tient au fait, pas à l'usage courant.

/**
 * Le `where` de la consultation qui fait foi pour un dossier.
 *
 * FONCTION PARTAGÉE, JAMAIS RECOPIÉE : c'est la recopie qui a produit la
 * divergence que ce module ferme. Sept appelants la traversent ; une huitième
 * sélection écrite à la main les ferait diverger de nouveau, en silence.
 */
export function whereConsultationPorteuse(idPatient: string) {
  return {
    idPatient,
    statut: 'validee',
    NOT: { anamnese: { equals: Prisma.DbNull } },
  } satisfies Prisma.ConsultationWhereInput;
}

/**
 * Le tri de la consultation qui fait foi : la validation d'abord.
 *
 * `dateValidation` DATE LE FAIT, `createdAt` date l'ouverture du dossier —
 * une consultation ouverte plus tôt peut être validée plus tard. Le second
 * terme n'est pas décoratif : `dateValidation` est nullable au schéma, et deux
 * lignes également nulles s'ordonneraient sinon selon ce que le moteur SQL
 * rend, c'est-à-dire selon rien de stable.
 */
export const ORDRE_CONSULTATION_PORTEUSE = [
  { dateValidation: 'desc' },
  { createdAt: 'desc' },
] satisfies Prisma.ConsultationOrderByWithRelationInput[];
