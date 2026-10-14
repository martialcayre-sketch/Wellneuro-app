import type { ProtocolActionType } from '@/lib/clinical-engine/types';

// LA PAUSE SUR EFFET INDÉSIRABLE — [[D-281]] §2 à §5, étape 3.
//
// MODULE PUR, LISIBLE PAR LE NAVIGATEUR : le formulaire du portail en tire la
// liste des éléments désignables, et la route du programme le calcul de ce qui
// est en pause. Aucune horloge, aucune base : l'appelant fournit les lignes.
//
// CE QU'IL NE DÉCIDE PAS : quand la pause est SERVIE. D'ici la signature de la
// règle amendée (D-281 §6, étape 5), les signalements sont capturés et
// notifiés, rien ne s'interrompt — c'est l'appelant qui lit le verrou
// `interruptionEffetIndesirableActive()` avant de servir le résultat.

/**
 * Les deux textes de la pause, SIGNÉS le 2026-10-12 (D-281 §4) et recopiés au
 * caractère près : un banc relit la décision et rougit au premier écart.
 */
export const TEXTE_PAUSE_ELEMENT =
  "Vous nous avez signalé un effet que vous associez à cet élément. Il est en pause en attendant l'avis de votre praticien : ne le reprenez pas avant sa réponse. Le reste de votre programme continue.";
export const TEXTE_PAUSE_COMPLEMENTS =
  "Vous nous avez signalé un effet sans pouvoir l'associer à un élément précis. Vos compléments sont en pause en attendant l'avis de votre praticien : ne les reprenez pas avant sa réponse. Votre alimentation et vos routines continuent.";

export type Rattachement = 'element' | 'ne_sait_pas' | 'autre_produit';
export const RATTACHEMENTS: readonly Rattachement[] = ['element', 'ne_sait_pas', 'autre_produit'];

/** Le type d'action qui porte un complément dans le programme. */
const TYPE_COMPLEMENT: ProtocolActionType = 'supplement_exploration';

/**
 * Les types qu'aucun patient ne peut désigner, ni voir en pause (arbitrages du
 * responsable du 2026-10-14, D-281 §2) : TOUTE orientation vers le médecin —
 * la réservée comme celle qu'écrit le praticien — et toute prise de sang. Les
 * mettre en pause afficherait « ne le reprenez pas avant sa réponse » sur une
 * consultation ou un bilan ; elles restent actives quoi qu'il arrive.
 */
const TYPES_NON_DESIGNABLES: readonly string[] = ['medical_referral', 'biological_exploration'] satisfies ProtocolActionType[];

type ActionProgramme = { actionId: string; type: string; title: string };

function designable(action: ActionProgramme): boolean {
  return !TYPES_NON_DESIGNABLES.includes(action.type);
}

/** Les éléments que le patient peut désigner. */
export function elementsDesignables(actions: readonly ActionProgramme[]): { actionId: string; title: string }[] {
  return actions
    .filter(designable)
    .map(action => ({ actionId: action.actionId, title: action.title }));
}

/**
 * La version du programme telle que le formulaire l'a reçue. Les identifiants
 * d'action sont POSITIONNELS (`action-1`, `action-2`… à chaque version) : sans
 * elle, un élément choisi sur une version déjà remplacée serait attribué à
 * l'action qui porte le même identifiant dans la nouvelle, puis figé.
 */
export function versionProgramme(protocolDraftInputHash: string): string {
  return protocolDraftInputHash.slice(0, 16);
}

export type SignalementRattache = {
  id: string;
  rattachement: Rattachement;
  elementActionId: string | null;
  /** Le programme visé, figé avec le rattachement. */
  protocolDraftId: string | null;
};

export type VerdictEffetIndesirable = {
  id: string;
  reportId: string;
  verdict: 'implique' | 'non_implique';
  elementActionId: string | null;
  /** L'aménagement choisi — lu par la surface praticien, pas par le calcul de la pause. */
  amenagement?: string | null;
  supersedesVerdictId: string | null;
};

/**
 * `element` et `complements` : les deux états d'attente, chacun avec son texte
 * signé (D-281 §4). `avis_rendu` : le praticien a rendu « impliqué » — l'élément
 * ne repart pas à l'identique (§5), mais AUCUN texte signé ne dit cet état (les
 * deux du §4 disent « en attendant l'avis ») : seul le marqueur « En pause »
 * s'affiche, jusqu'à ce qu'une décision en signe un.
 */
export type ElementEnPause = { actionId: string; texte: 'element' | 'complements' | 'avis_rendu' };

/**
 * Le verdict qui fait foi pour un signalement : la tête de sa chaîne, celui
 * qu'aucun autre ne supplante (D-281 §5, « un verdict se corrige »). `null`
 * quand le praticien n'a encore rien rendu.
 */
export function verdictCourant(reportId: string, verdicts: readonly VerdictEffetIndesirable[]): VerdictEffetIndesirable | null {
  const chaine = verdicts.filter(v => v.reportId === reportId);
  const supplantes = new Set(chaine.map(v => v.supersedesVerdictId).filter((id): id is string => id !== null));
  const tetes = chaine.filter(v => !supplantes.has(v.id));
  // Une chaîne à deux têtes ne devrait pas exister (index unique sur
  // `supersedes_verdict_id`, une racine par signalement) ; si elle existait,
  // aucune tête n'est élue et la pause tient — fail-closed.
  return tetes.length === 1 ? tetes[0] : null;
}

/**
 * Ce qui est en pause dans la version COURANTE du programme.
 *
 * - Sans verdict : l'élément désigné, ou TOUS les compléments pour « Je ne sais
 *   pas » et « un autre produit » (§3).
 * - Verdict « non impliqué » : la pause est levée (§5).
 * - Verdict « impliqué » : l'élément désigné par le praticien reste en pause —
 *   il ne repart jamais à l'identique (§5) ; l'aménagement passe par une
 *   nouvelle version du programme.
 *
 * SEULE LA VERSION VISÉE PAR LE SIGNALEMENT est mise en pause. Les
 * identifiants d'action étant positionnels, les appliquer à une autre version
 * mettrait en pause un élément sans rapport ; et la version qui suit un verdict
 * « impliqué » EST l'aménagement du praticien. Le signalement, lui, survit au
 * remplacement (§3) : il attend son verdict côté praticien, et aucune nouvelle
 * version ne se diffuse avant (garde de l'étape 4). Une orientation ou une
 * prise de sang n'est jamais en pause.
 */
export function elementsEnPause(input: {
  signalements: readonly SignalementRattache[];
  verdicts: readonly VerdictEffetIndesirable[];
  /** L'identifiant de la version courante du programme. */
  protocolDraftId: string;
  actions: readonly ActionProgramme[];
}): ElementEnPause[] {
  const designables = input.actions.filter(designable);
  const presents = new Set(designables.map(action => action.actionId));
  const complements = designables.filter(action => action.type === TYPE_COMPLEMENT).map(action => action.actionId);
  const pauses = new Map<string, ElementEnPause['texte']>();
  const poser = (actionId: string, texte: ElementEnPause['texte']) => {
    if (!presents.has(actionId)) return;
    // Une ATTENTE l'emporte sur un avis rendu : un autre signalement attend
    // encore, et son texte dit vrai. Entre les deux attentes, l'élément
    // désigné est le plus précis.
    const rang = { element: 2, complements: 1, avis_rendu: 0 } as const;
    const actuel = pauses.get(actionId);
    if (actuel !== undefined && rang[actuel] >= rang[texte]) return;
    pauses.set(actionId, texte);
  };

  for (const signalement of input.signalements) {
    if (signalement.protocolDraftId !== input.protocolDraftId) continue;
    const verdict = verdictCourant(signalement.id, input.verdicts);
    if (verdict?.verdict === 'non_implique') continue;
    if (verdict?.verdict === 'implique') {
      if (verdict.elementActionId) poser(verdict.elementActionId, 'avis_rendu');
      continue;
    }
    if (signalement.rattachement === 'element') {
      if (signalement.elementActionId) poser(signalement.elementActionId, 'element');
    } else {
      for (const actionId of complements) poser(actionId, 'complements');
    }
  }

  return designables
    .filter(action => pauses.has(action.actionId))
    .map(action => ({ actionId: action.actionId, texte: pauses.get(action.actionId)! }));
}
