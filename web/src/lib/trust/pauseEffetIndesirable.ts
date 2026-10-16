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
 * Les trois textes de la pause, SIGNÉS (D-281 §4 : les deux de l'attente le
 * 2026-10-12, celui de l'avis rendu le 2026-10-14) et recopiés au caractère
 * près : un banc relit la décision et rougit au premier écart.
 */
export const TEXTE_PAUSE_ELEMENT =
  "Vous nous avez signalé un effet que vous associez à cet élément. Il est en pause en attendant l'avis de votre praticien : ne le reprenez pas avant sa réponse. Le reste de votre programme continue.";
export const TEXTE_PAUSE_COMPLEMENTS =
  "Vous nous avez signalé un effet sans pouvoir l'associer à un élément précis. Vos compléments sont en pause en attendant l'avis de votre praticien : ne les reprenez pas avant sa réponse. Votre alimentation et vos routines continuent.";
/** L'avis rendu, élément impliqué : il ne dit rien d'une cause (`DC-27`). */
export const TEXTE_PAUSE_AVIS_RENDU =
  'Votre praticien a examiné votre signalement : cet élément reste en pause. Ne le reprenez pas ; votre programme va être adapté.';

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

type ActionProgramme = { actionId: string; type: string; title: string; interventionStatus?: string };

function designable(action: ActionProgramme): boolean {
  return !TYPES_NON_DESIGNABLES.includes(action.type);
}

/**
 * Les éléments désignables d'un programme : ceux que le praticien peut
 * désigner dans son avis (D-281 §5), et que la pause peut viser.
 */
export function elementsDesignables(actions: readonly ActionProgramme[]): { actionId: string; title: string }[] {
  return actions
    .filter(designable)
    .map(action => ({ actionId: action.actionId, title: action.title }));
}

/**
 * Les éléments que le PATIENT peut désigner : les désignables, moins les
 * interventions NON FERMES — différée, écartée, pas indiquée, en attente du
 * bilan (`D-056`). Le portail lui dit, sur la même page, qu'il ne les prend
 * pas (arbitrage du responsable du 2026-10-16, D-281 §2). Une action sans
 * statut (contrat antérieur à V4) reste désignable : c'est ce qu'il prend.
 *
 * Retirées de SA liste seulement : le praticien peut toujours les désigner
 * (il sait si le patient en a pris une quand même), et la pause des
 * compléments les couvre encore. Le patient qui en a pris une répond « Un
 * autre produit » : tous les compléments passent en pause — plus large,
 * jamais moins.
 */
export function elementsDesignablesParLePatient(actions: readonly ActionProgramme[]): { actionId: string; title: string }[] {
  return elementsDesignables(actions.filter(action =>
    action.interventionStatus === undefined || action.interventionStatus === 'active'));
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
  /** `null` : le formulaire d'avant — il attend l'avis, rien n'est jamais en pause pour lui. */
  rattachement: Rattachement | null;
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
 * `element` et `complements` : les deux états d'attente. `avis_rendu` : le
 * praticien a rendu « impliqué » — l'élément ne repart pas à l'identique (§5).
 * Chacun a son texte signé (D-281 §4).
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
 * Le signalement reçoit-il l'avis du praticien (D-281 §5) ? Rattaché — un
 * élément, « Je ne sais pas » ou « un autre produit » —, ou FORMULAIRE D'AVANT :
 * « oui » au programme sans élément désigné (dossier mineur ou sans date de
 * naissance, adulte resté sur l'ancien formulaire), qui porte alors le
 * programme diffusé au dépôt sans rattachement. La base tient la même règle
 * (migration `20261014230000_saf_ei_verdict_formulaire_avant_v1`).
 *
 * Sans l'un ni l'autre — aucun programme diffusé, « non » au programme,
 * désignation illisible —, aucun avis : la base le refuserait.
 */
export function recoitUnAvis(signalement: { rattachement: string | null; protocolDraftId: string | null }): boolean {
  return signalement.rattachement !== null || signalement.protocolDraftId !== null;
}

/**
 * Les signalements qui ATTENDENT l'avis du praticien (D-281 §3, §5) : ceux qui
 * en reçoivent un (`recoitUnAvis`), sans verdict en tête de chaîne. Tant qu'il
 * en reste un, aucun programme ne se diffuse pour le dossier, quelle que soit
 * la version qu'il vise.
 *
 * LE STATUT N'Y ENTRE PAS (§5, « le statut ne lève rien ») : un signalement
 * passé à « traité » ou « clos » sans verdict attend toujours. Le FORMULAIRE
 * D'AVANT attend comme les autres (arbitrage du 2026-10-14) ; rien n'y est en
 * pause au portail, faute d'élément désigné. Un signalement qui ne reçoit
 * aucun avis n'attend rien : compter une attente qu'aucun geste ne lève
 * enfermerait le dossier. Une chaîne à deux têtes n'élit aucun verdict : le
 * signalement attend — fail-closed, comme la pause.
 *
 * Ordre d'entrée conservé.
 */
export function signalementsEnAttente<
  S extends { id: string; rattachement: string | null; protocolDraftId: string | null },
>(
  signalements: readonly S[],
  verdicts: readonly VerdictEffetIndesirable[],
): S[] {
  return signalements.filter(s => recoitUnAvis(s) && verdictCourant(s.id, verdicts) === null);
}

/** Les deux statuts ouverts d'un signalement — la seule règle de ceux qui ne reçoivent aucun avis. */
export const STATUTS_NON_TRAITES = ['recu', 'en_cours'] as const;

/**
 * Les signalements d'effet indésirable NON TRAITÉS — une seule règle pour le
 * panneau TRUST, le Fil du jour et le prévol du copilote (D-281 §5). Celui qui
 * reçoit un avis l'est tant qu'il l'attend (`signalementsEnAttente`), quel que
 * soit son statut : passé à « traité » sans verdict, il ne sort d'aucun
 * compteur (« le statut ne lève rien »). Les autres se comptent par statut.
 *
 * Aucun verrou : le compte est un affichage, actif dès le déploiement ; seule
 * la garde de la diffusion attend la signature (D-281 §6).
 *
 * Ordre d'entrée conservé.
 */
export function effetsNonTraites<
  S extends { id: string; statutTraitement: string; rattachement: string | null; protocolDraftId: string | null },
>(
  effets: readonly S[],
  verdicts: readonly VerdictEffetIndesirable[],
): S[] {
  const enAttente = new Set(signalementsEnAttente(effets, verdicts).map(e => e.id));
  return effets.filter(e => (recoitUnAvis(e)
    ? enAttente.has(e.id)
    : (STATUTS_NON_TRAITES as readonly string[]).includes(e.statutTraitement)));
}

/**
 * Ce qui est en pause dans la version COURANTE du programme.
 *
 * - Sans verdict : l'élément désigné, ou TOUS les compléments pour « Je ne sais
 *   pas » et « un autre produit » (§3).
 * - Verdict « non impliqué » : la pause est levée (§5).
 * - Verdict « impliqué » : l'élément désigné par le praticien reste en pause —
 *   il ne repart jamais à l'identique (§5) ; l'aménagement passe par une
 *   nouvelle version du programme. Sans élément (« élément non identifiable »,
 *   programme illisible, arbitrage du 2026-10-16) : tous les compléments
 *   restent en pause.
 *
 * SEULE LA VERSION VISÉE PAR LE SIGNALEMENT est mise en pause. Les
 * identifiants d'action étant positionnels, les appliquer à une autre version
 * mettrait en pause un élément sans rapport ; et la version qui suit un verdict
 * « impliqué » EST l'aménagement du praticien. Le signalement, lui, survit au
 * remplacement (§3) : il attend son verdict côté praticien, et aucune nouvelle
 * version ne se diffuse avant (`signalementsEnAttente`, garde de la
 * diffusion). Une orientation ou une prise de sang n'est jamais en pause.
 * Le formulaire d'avant (sans rattachement) n'y met rien, avis rendu ou non :
 * aucun élément n'a été désigné au portail (D-281 §5).
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
    if (signalement.rattachement === null) continue;
    if (signalement.protocolDraftId !== input.protocolDraftId) continue;
    const verdict = verdictCourant(signalement.id, input.verdicts);
    if (verdict?.verdict === 'non_implique') continue;
    if (verdict?.verdict === 'implique') {
      if (verdict.elementActionId) poser(verdict.elementActionId, 'avis_rendu');
      // « Impliqué, élément non identifiable » (arbitrage du 2026-10-16) :
      // aucun complément n'est disculpé, aucun ne repart à l'identique — la
      // pause des compléments est MAINTENUE jusqu'à la nouvelle version.
      else for (const actionId of complements) poser(actionId, 'avis_rendu');
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

const DATE_PARIS = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric',
});

/**
 * Le refus de diffusion (D-281 §3) : il NOMME le ou les signalements en
 * attente, par leur date de dépôt — celle que la file des signalements affiche.
 * Aucun mot du patient : ni produit, ni symptôme.
 */
export function messageDiffusionEnAttente(enAttente: readonly { soumisLe: Date }[]): string {
  // Une date par jour : deux signalements du même jour ne la répètent pas.
  const dates = [...new Set(enAttente.map(s => DATE_PARIS.format(s.soumisLe)))];
  const liste = dates.length > 1 ? `${dates.slice(0, -1).join(', le ')} et le ${dates[dates.length - 1]}` : dates[0];
  const sujet = enAttente.length > 1
    ? `${enAttente.length} signalements d’effet indésirable, déposés le ${liste}, attendent`
    : `Un signalement d’effet indésirable, déposé le ${liste}, attend`;
  return `${sujet} votre avis : aucun programme ne peut être diffusé à ce patient avant que vous l’ayez rendu,`
    + ' dans la file des signalements. Vos propositions et la version en préparation restent disponibles.';
}
