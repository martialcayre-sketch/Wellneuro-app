import type { ProtocolAction } from '@/lib/clinical-engine/types';
import type { ActionPatient } from '@/lib/protocol/vuePatientSurLeFil';

// `WN_PORTAIL_TROIS_PLANS` — LES TROIS PLANS DE CHAQUE ACTION (lettre bb, fiche
// H49, [[D-384]], [[D-386]]). Fermé, l'accueil du portail sert le protocole
// exactement comme avant : le plan minimal seul, dans le détail et dans « Jour
// difficile ? ». Ouvert, la route du protocole sert aussi le plan idéal et le
// plan de secours des actions fermes — et seulement pour une version admise.
// Aucune écriture, aucune trace, aucune migration.
//
// Activation : une place de la file C, porte 18, après l'encart « quand
// ralentir » ([[D-384]] §6). Convention des drapeaux produit
// (`docs/FEATURE_FLAGS.md` § A) : la chaîne exacte `'true'`, absent = fermé.

export function troisPlansOuverts(): boolean {
  return process.env.WN_PORTAIL_TROIS_PLANS === 'true';
}

/**
 * MISE EN SERVICE CONSTATÉE DE LA GARDE ÉTENDUE ([[D-386]] §2), en UTC : la
 * garde de `termeAnxiogene` lit le plan idéal et le plan de secours à
 * l'enregistrement d'une version depuis le lot 1 (#1725), relevé une fois la
 * bascule finie sur Scalingo.
 */
export const INSTANT_GARDE_ETENDUE = new Date('2026-10-27T00:00:00Z');

/**
 * LA VERSION A-T-ELLE ÉTÉ RELUE PAR LA GARDE ÉTENDUE ? Sa date de création
 * (`protocol_drafts.created_at`, posée à l'insertion de la ligne) est
 * strictement postérieure à l'instant — jamais le `createdAt` du payload, hérité
 * d'une version à l'autre. Une date absente ou illisible se lit comme un refus
 * ([[D-386]] §3) : la version sert son plan minimal seul.
 */
export function versionSousGardeEtendue(creeeLe: unknown): boolean {
  return creeeLe instanceof Date && creeeLe.getTime() > INSTANT_GARDE_ETENDUE.getTime();
}

export type TroisPlansAction = { actionId: string; idealPlan: string; rescuePlan: string };

/**
 * LES PLANS QUI PARTENT SUR LE FIL : ceux des actions FERMES et hors pause
 * seulement ([[D-384]] §3). Une action en attente de bilan ou en pause garde
 * son régime : ses plans idéal et de secours ne quittent pas le serveur. La
 * fermeté se lit sur la vue servie (aucun statut d'intervention, comme à
 * l'accueil) ; les textes, sur le protocole relu, par `actionId`.
 */
export function troisPlansServis(input: {
  actionsServies: readonly ActionPatient[];
  actionsDuProtocole: readonly ProtocolAction[];
  enPause: ReadonlySet<string>;
}): TroisPlansAction[] {
  const parId = new Map(input.actionsDuProtocole.map(action => [action.actionId, action]));
  return input.actionsServies.flatMap(servie => {
    if (servie.interventionStatus || input.enPause.has(servie.actionId)) return [];
    const action = parId.get(servie.actionId);
    // Rognés comme le plan minimal l'est par le contrat (`nonEmpty`).
    const idealPlan = action?.idealPlan.trim();
    const rescuePlan = action?.rescuePlan.trim();
    if (!idealPlan || !rescuePlan) return [];
    return [{ actionId: servie.actionId, idealPlan, rescuePlan }];
  });
}
