// `WN_PORTAIL_TROIS_PLANS` — LES TROIS PLANS DE CHAQUE ACTION AU PORTAIL
// (lettre bb, fiche H49, [[D-384]] §2-§4, [[D-386]]). Fermé, l'accueil du
// portail sert le protocole exactement comme avant : plan minimal seul, et
// « Jour difficile ? » propose le plan minimal. Ouvert, la route du protocole
// sert le plan idéal et le plan de secours des actions fermes d'une version
// créée sous la garde étendue ; le détail les lit sous « Selon votre
// journée : », et « Jour difficile ? » propose le plan de secours. Aucune
// écriture, aucune trace, aucune migration.
//
// Activation : une place de la file C, porte 18, après l'encart « quand
// ralentir » ([[D-384]] §6) ; constat sur un vrai dossier.
//
// Convention des drapeaux produit (`docs/FEATURE_FLAGS.md` § A) : la chaîne
// exacte `'true'`, absent = fermé. Variable serveur : un composant client ne la
// lit pas, c'est la route du protocole qui le lui dit.

import { estActionOrientation } from '@/lib/clinical-engine/orientationAdressage';
import type { ElementEnPause } from '@/lib/trust/pauseEffetIndesirable';

export function troisPlansOuverts(): boolean {
  return process.env.WN_PORTAIL_TROIS_PLANS === 'true';
}

/**
 * LA MISE EN SERVICE CONSTATÉE DE LA GARDE ÉTENDUE ([[D-386]] §2), en UTC.
 * La garde (#1725, 39131a45) a fini sa bascule sur Scalingo le 2026-10-26 à
 * 23:55:49 UTC ; l'instant retenu laisse une marge de quatre minutes. Il ne se
 * déplace pas : une version créée avant sert le plan minimal seul.
 */
export const MISE_EN_SERVICE_GARDE_ETENDUE = '2026-10-27T00:00:00.000Z';

/**
 * Une version a-t-elle été enregistrée sous la garde étendue ? La marque est la
 * colonne `created_at` de sa ligne `protocol_drafts`, posée à l'insertion —
 * JAMAIS le `createdAt` du contenu, hérité d'une version à l'autre. Strictement
 * postérieure à l'instant ; une date absente ou illisible vaut refus ([[D-386]]
 * §3 : le doute se lit comme un refus).
 */
export function creeeSousGardeEtendue(createdAt: unknown): boolean {
  if (!(createdAt instanceof Date)) return false;
  const t = createdAt.getTime();
  return Number.isFinite(t) && t > Date.parse(MISE_EN_SERVICE_GARDE_ETENDUE);
}

/** Les deux plans servis en plus du minimal, par action — hors de la vue signée. */
export type TroisPlansAction = { actionId: string; idealPlan: string; rescuePlan: string };

function texteLisible(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

/**
 * Les plans à servir, dans l'ordre des actions servies. Une action en attente
 * de bilan ou en pause garde son régime actuel ([[D-384]] §3) : elle n'y entre
 * pas. Une action absente du protocole relu, ou dont l'un des deux plans est
 * vide, n'y entre pas non plus — le doute vaut refus, et le détail lui garde
 * son plan minimal seul.
 *
 * L'ORIENTATION VERS LE MÉDECIN ([[D-257]]) N'Y ENTRE JAMAIS (arbitrage du
 * responsable du 2026-10-27, [[D-386]] lot 2) : ferme et en tête du protocole,
 * elle recevrait « Au quotidien » sur un rendez-vous à prendre une fois, et
 * « Jour difficile ? » proposerait son repli au lieu de l'appel au médecin. Elle
 * garde son régime actuel — plan minimal seul, proposé au jour difficile.
 */
export function troisPlansServis(input: {
  actionsServies: readonly { actionId: string; type: string; interventionStatus?: unknown }[];
  actionsDuProtocole: readonly { actionId: string; idealPlan?: unknown; rescuePlan?: unknown }[];
  pauses: readonly Pick<ElementEnPause, 'actionId'>[];
}): TroisPlansAction[] {
  const enPause = new Set(input.pauses.map((p) => p.actionId));
  const duProtocole = new Map(input.actionsDuProtocole.map((a) => [a.actionId, a]));
  return input.actionsServies.flatMap((servie) => {
    if (servie.interventionStatus || enPause.has(servie.actionId) || estActionOrientation(servie)) return [];
    const action = duProtocole.get(servie.actionId);
    if (!action || !texteLisible(action.idealPlan) || !texteLisible(action.rescuePlan)) return [];
    return [{ actionId: servie.actionId, idealPlan: action.idealPlan, rescuePlan: action.rescuePlan }];
  });
}
