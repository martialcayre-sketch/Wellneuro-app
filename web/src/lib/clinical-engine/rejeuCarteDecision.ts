import { prisma } from '@/lib/prisma';
import { canonicalSha256 } from './canonical';
import { lireEffetsIndesirables } from './effetsIndesirablesPrisma';
import { construireChaineC1Tolerante, lireSelectionPriorite } from './selectionPrioritePrisma';
import { entreesRuntime } from './verifierChaineC1';
import type { ConfirmedAssessmentEpisode, DecisionCard } from './types';

// REJEU DE LA CARTE DE DÉCISION SUR LE CHEMIN PATIENT — [[D-054]] arbitrage 6,
// [[D-118]], et l'arbitrage de campagne du 2026-09-15.
//
// POURQUOI CE MODULE EXISTE. `buildPatientProtocolView` — le contrat
// `c1-patient-protocol-view-v2`, le seul producteur légitime de ce qu'un patient
// lit de son protocole — exige une `DecisionCard` ENTIÈRE. Or aucune table ne la
// porte : `decision_cards` n'existe pas, et `protocol_drafts` n'en garde que les
// ancres (`decision_card_id`, `decision_card_input_hash`, `selected_priority_id`).
// Le contrat était donc écrit, testé, et sans appelant de production ; la route
// du portail réécrivait à la main une projection plus pauvre, qui servait UNE
// action sur trois.
//
// CE QU'IL FAIT. Il REJOUE la chaîne C1 depuis la base, à l'horodatage de
// confirmation de l'épisode que le brouillon nomme, et rend la carte recomposée
// — à la condition que son empreinte soit encore celle que le praticien a
// approuvée pour diffusion.
//
// UN SEUL CHEMIN DE CONSTRUCTION, TROIS APPELANTS. Le cockpit rejoue déjà
// (`D-118`), le vérificateur recalcule pour comparer (`D-054` arbitrage 5), et
// ce module rejoue pour servir. Les trois passent par `construireChaineC1Tolerante`
// et par `entreesRuntime` : une quatrième lecture « équivalente » finirait par
// diverger, et une divergence ici éteint l'écran d'un patient sur une carte
// honnête.
//
// CE QU'IL NE FAIT PAS : ni authentification, ni contrôle d'appartenance. La
// route du portail a prouvé la session du patient avant d'appeler.
//
// LA DÉRIVE EST LE MODE DE PANNE ASSUMÉ, ET ELLE EST BORNÉE. Le snapshot est
// borné à `episode.includedResponseIds` et l'horodatage est `episode.confirmedAt` :
// une passation NOUVELLE ne bouge rien. Ce qui bouge l'empreinte après diffusion
// est une retouche d'anamnèse, un signalement d'effet indésirable, une
// re-sélection de priorité — trois actes cliniques qui méritent d'interrompre ce
// qui est servi — ou un déploiement touchant une table signée, qui les
// interromprait tous à la fois. C'est pour ce dernier cas que le refus est
// BRUYANT côté praticien et jamais muet : un écran patient qui s'éteint sans que
// personne ne le sache est la panne que `D-160` §4 nomme « le défaut déplacé ».

/**
 * Pourquoi la carte n'a pas pu être servie. Aucun de ces motifs ne traverse
 * jusqu'au patient : il lit une indisponibilité, pas un diagnostic.
 */
export type MotifRefusRejeu =
  /** Le brouillon ne nomme aucun épisode, ou l'épisode nommé a disparu. */
  | 'episode_absent'
  /** Payload d'épisode incohérent avec son empreinte, ou passation devenue illisible. */
  | 'episode_illisible'
  /** Le moteur clinique refuse de rejouer ce dossier. */
  | 'chaine_irrejouable'
  /** Carte recomposée, mais son empreinte n'est plus celle qui a été approuvée. */
  | 'carte_derivee';

export type RejeuCarteDecision =
  | { ok: true; decisionCard: DecisionCard; selectionEcartee: boolean }
  | { ok: false; motif: MotifRefusRejeu };

const PREFIXE_DECISION = 'runtime-decision-';
const PREFIXE_SNAPSHOT = 'runtime-snapshot-';
const PREFIXE_REVIEW = 'runtime-review-';

/**
 * Les identifiants d'enveloppe du rejeu, dérivés de celui de la carte.
 *
 * Ils sont EXCLUS des trois empreintes par construction : les reprendre à
 * l'identique du cockpit n'achète donc aucune égalité de hash, seulement la
 * comparabilité champ à champ d'un objet rejoué avec celui qui a été écrit. Un
 * identifiant de carte qui ne suit pas la convention `runtime-decision-…` sert
 * de suffixe tel quel — sous-promettre plutôt que fabriquer.
 */
function enveloppeDuRejeu(decisionCardId: string): { snapshotId: string; reviewId: string } {
  const suffixe = decisionCardId.startsWith(PREFIXE_DECISION)
    ? decisionCardId.slice(PREFIXE_DECISION.length)
    : decisionCardId;
  return { snapshotId: `${PREFIXE_SNAPSHOT}${suffixe}`, reviewId: `${PREFIXE_REVIEW}${suffixe}` };
}

/**
 * L'épisode confirmé que le brouillon nomme, relu et vérifié — ou `null`.
 *
 * Trois conditions, et la troisième n'est pas une précaution de style : une
 * passation rendue illisible depuis la confirmation (invalidée, dépubliée) ferait
 * jeter `buildClinicalSnapshot` plus bas, et le refus serait alors un accident du
 * moteur au lieu d'un constat. Même contrôle que le rejeu du cockpit.
 *
 * L'identité de l'acte, elle, n'est PAS recomparée à une proposition fraîche
 * comme le fait le cockpit : ici l'épisode n'est pas proposé, il est NOMMÉ par un
 * brouillon que le praticien a relu puis approuvé. La question n'est pas « est-ce
 * le bon épisode », c'est « ce payload est-il intact ».
 */
function episodeRelu(
  persiste: { payload: unknown; payloadHash: string },
  idPatient: string,
  reponsesLisibles: ReadonlySet<string>,
): ConfirmedAssessmentEpisode | null {
  const episode = persiste.payload as ConfirmedAssessmentEpisode;
  try {
    if (canonicalSha256(episode) !== persiste.payloadHash) return null;
    if (episode.status !== 'confirmed') return null;
    if (episode.patientId !== idPatient) return null;
    if (!episode.includedResponseIds.every(responseId => reponsesLisibles.has(responseId))) return null;
  } catch {
    // Sérialisation canonique impossible : un épisode qu'on ne sait pas hacher
    // est un épisode qu'on ne rejoue pas.
    return null;
  }
  return episode;
}

/**
 * La carte de décision derrière un protocole diffusé, recomposée au serveur.
 *
 * `decisionCardInputHash` est l'empreinte APPROUVÉE — celle que porte la ligne
 * de diffusion. La comparaison finale est la garde de fraîcheur du chemin
 * patient : elle dit que ce qui va être servi repose encore sur le dossier que
 * le praticien avait sous les yeux quand il a validé.
 */
export async function rejouerCarteDecision(input: {
  idPatient: string;
  decisionCardId: string;
  assessmentEpisodeId: string | null;
  decisionCardInputHash: string;
}): Promise<RejeuCarteDecision> {
  if (!input.assessmentEpisodeId) return { ok: false, motif: 'episode_absent' };

  const persiste = await prisma.assessmentEpisode.findUnique({
    where: { id: input.assessmentEpisodeId },
    select: { payload: true, payloadHash: true },
  });
  if (!persiste) return { ok: false, motif: 'episode_absent' };

  const inputs = await entreesRuntime(input.idPatient);
  const episode = episodeRelu(
    persiste,
    input.idPatient,
    new Set(inputs.responses.map(reponse => reponse.responseId)),
  );
  if (!episode) return { ok: false, motif: 'episode_illisible' };

  const { snapshotId, reviewId } = enveloppeDuRejeu(input.decisionCardId);
  let chaine;
  let selectionEcartee = false;
  try {
    ({ chaine, selectionEcartee } = construireChaineC1Tolerante({
      snapshotId,
      reviewId,
      decisionCardId: input.decisionCardId,
      patientId: input.idPatient,
      // L'HORODATAGE DE LA CONFIRMATION, JAMAIS L'HEURE COURANTE. Il entre dans
      // les trois empreintes : rejouer « maintenant » ferait diverger toute
      // carte honnête, dès la première seconde.
      horodatage: episode.confirmedAt,
      episode,
      patientContext: inputs.patientContext,
      responses: inputs.responses,
      signauxAlerte: inputs.signauxAlerte,
      etatPopulation: inputs.etatPopulation,
      effetsIndesirables: await lireEffetsIndesirables(input.idPatient),
    }, await lireSelectionPriorite(input.idPatient, input.decisionCardId)));
  } catch {
    // Fail-closed : une exception du moteur est un refus, jamais un laissez-passer.
    return { ok: false, motif: 'chaine_irrejouable' };
  }

  if (chaine.decisionCard.inputHash !== input.decisionCardInputHash) {
    return { ok: false, motif: 'carte_derivee' };
  }
  return { ok: true, decisionCard: chaine.decisionCard, selectionEcartee };
}
