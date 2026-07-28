/**
 * Contrat de stockage des instantanés du carnet alimentaire (JA).
 *
 * Les instantanés JA sont écrits **dans `protocol_drafts`**, la table des
 * brouillons de protocole, avec leur propre `contractVersion` et un
 * `selectedPriorityId` dédié. Ils n'en sont pas pour autant des versions de
 * protocole : toute lecture praticien **non bornée par un `decisionCardId`**
 * doit les exclure, sans quoi le brouillon le plus récent d'un patient peut
 * être un instantané de carnet.
 *
 * Le lot 2 rend cette exclusion indispensable : le patient écrit désormais
 * lui-même, à volonté. Sans elle, une transmission patient devient le « fil
 * courant » de la clôture de consultation (`copilote/cloture`) et fait
 * apparaître le protocole du praticien comme non relu et sa diffusion comme
 * caduque — un état clinique faux, déclenché depuis le portail patient.
 */
export const JA_FOOD_OBSERVATION_CONTRACT_VERSION = 'ja-food-observation-v1' as const;
export const JA_SELECTED_PRIORITY_ID = 'JA_FOOD_OBSERVATION' as const;

/**
 * Fragment `where` Prisma à composer avec toute lecture de `protocol_drafts`
 * qui cherche des **versions de protocole** et non des instantanés de carnet.
 */
export const EXCLURE_INSTANTANES_JA = {
  contractVersion: { not: JA_FOOD_OBSERVATION_CONTRACT_VERSION },
} as const;
