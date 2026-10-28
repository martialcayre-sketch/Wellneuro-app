import { prisma } from '@/lib/prisma';
import { filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { construireReperes, resoudreAsOf, tronquerA } from '@/lib/praticien/lectureAsOf';
import { ORDRE_CONSULTATION_PORTEUSE, whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { filtrerPassationsExploitables } from '@/lib/scoring/validite';
import { canonicalJson, canonicalSha256 } from './canonical';
import type { ChaineC1 } from './chaineC1';
import {
  adaptRuntimeInputs,
  identifiantAncre,
  type AncreCycleCourant,
  type AncrePosee,
} from './runtimeFromPrisma';
import { lireCouverturesAdressage } from './adressagesSignalAlertePrisma';
import type { CouvertureAdressage } from './safetyFindingSource';
import { construireChaineC1Tolerante, lireSelectionPriorite } from './selectionPrioritePrisma';
import {
  ancreCourante,
  lireAncresPersistees,
  type AncrePersistee,
} from '@/lib/protocol/ancresPersistees';
import { lireCalendriersSuivi } from '@/lib/protocol/calendriersPersistes';
import { estAncreDeCycle, indexDeCycle } from '@/lib/protocol/cycles';
import type { ConfirmedAssessmentEpisode, ProposedAssessmentEpisode } from './types';
import type { JalonMomentum } from '@/lib/equilibre/types';

// LE REJEU D'ÉPISODE DU COCKPIT, HORS DE SA ROUTE ([[D-385]], J3-cabinet PR 2).
//
// Ces fonctions vivaient dans `api/praticien/cockpit/route.ts`. Elles en
// sortent pour que la page des comptes du cabinet rejoue un dossier par le
// même chemin que le cockpit — un seul rejeu, jamais deux. Transcription
// littérale : mêmes signatures, même ordre d'évaluation, mêmes journaux. La
// route les importe ; son GET et son POST n'ont pas changé.
//
// HORS DE `lib/clinical/` À DESSEIN : ce chemin retient le déploiement jusqu'à
// une release-db ([[D-044]]) ; rien ici n'est une table signée.

// `emailPraticien` scope la lecture au praticien connecté : un patient d'un
// autre praticien est traité comme introuvable, ce qui évite d'en révéler
// l'existence. Point de passage unique du GET comme du POST.
// `asOfBrut` : lecture d'un état passé (SP-TT). Absent ⇒ présent, comportement
// strictement inchangé. Présent ⇒ doit correspondre à un repère réel du patient,
// sinon la lecture est refusée — jamais silencieusement ramenée au présent.
export async function loadRuntimeInputs(idPatient: string, emailPraticien: string, asOfBrut?: string | null) {
  const patient = await prisma.patient.findFirst({
    where: { idPatient, ...filtrePatientsDuPraticien(emailPraticien) },
    select: { idPatient: true, createdAt: true },
  });
  if (!patient) return null;

  const [responses, consultation] = await Promise.all([
    prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idReponse: true, idQuestionnaire: true, dateReponse: true, scoresJson: true, statutValidite: true },
      orderBy: [{ dateReponse: 'asc' }, { idReponse: 'asc' }],
    }),
    prisma.consultation.findFirst({
      where: whereConsultationPorteuse(idPatient),
      // `id` AVEC `anamnese` ([[D-257]], LOT-04) : même lecture que
      // `entreesRuntime`, la couverture se compare à CETTE porteuse.
      select: { id: true, anamnese: true },
      orderBy: ORDRE_CONSULTATION_PORTEUSE,
    }),
  ]);

  const episodes = asOfBrut
    ? await prisma.assessmentEpisode.findMany({
        where: { idPatient },
        select: { milestone: true, confirmedAt: true },
      })
    : [];
  const resolution = resoudreAsOf(asOfBrut, construireReperes({ episodes, reponses: responses }));
  if (resolution.mode === 'refus') return { refus: resolution.raison } as const;

  const asOf = resolution.mode === 'passe' ? resolution.date : null;
  // Le passé est RECALCULÉ depuis les données brutes tronquées, jamais relu
  // depuis un snapshot : aucune donnée postérieure ne peut fuir dans la lecture.
  //
  // Filtre de validité (LOT-00, drapeau éteint par défaut) sur les entrées du
  // runtime clinique SEULEMENT : les repères as-of, eux, restent calculés sur
  // la liste complète — un repère est un fait administratif, pas une mesure.
  return {
    // Les réponses de sécurité, elles, ne se tronquent pas ([[D-275]] §2) :
    // toutes les passations, comme le vérificateur et le Fil.
    ...adaptRuntimeInputs(patient, filtrerPassationsExploitables(tronquerA(responses, asOf)), consultation, responses),
    idConsultationPorteuse: consultation?.id ?? null,
    asOf: asOf ? asOf.toISOString() : null,
  };
}

// Ancre du cycle courant pour un jalon de MESURE : `confirmedAt` de l'ancre du
// rang le plus haut — la même ancre que la trajectoire et `resoudreJalonDu`
// (LOT-08 A8-1 ; revue LOT-07 B2 : deux ancres rendaient les fenêtres du
// client et du serveur disjointes). Une ancre, elle, ne se compte depuis
// aucune autre : c'est le jour 0 de son propre cycle, et sa date de référence
// est résolue par `proposeRuntimeEpisode`. En lecture datée (`asOf`), seules
// les ancres confirmées à cette date comptent — un épisode postérieur ne doit
// pas fuir dans une lecture du passé.
//
// LE JOUR 0 DU SUIVI ([[D-255]]). Un jalon de mesure se compte depuis la
// diffusion qui a ouvert le calendrier du cycle, lue par
// `lireCalendriersSuivi` — la même que la trajectoire sert au client pour
// `resoudreJalonDu`. Les deux côtés partagent donc toujours la même date.
export function ancreCycleDepuis(
  ancres: readonly AncrePersistee[],
  calendriers: Awaited<ReturnType<typeof lireCalendriersSuivi>>,
  milestone: JalonMomentum,
): AncreCycleCourant | null {
  if (estAncreDeCycle(milestone)) return null;
  const ancre = ancreCourante([...ancres]);
  if (!ancre) return null;
  const calendrier = calendriers.parCycle.get(ancre.cycleId ?? ancre.id);
  // Le NOM autant que la date : il entre dans l'identifiant de l'épisode, que
  // deux cycles partageraient sinon (`identifiantEpisode`, `runtimeFromPrisma`).
  return {
    ancre: ancre.milestone,
    confirmedAt: ancre.confirmedAt.toISOString(),
    jourZero: calendrier ? calendrier.jourZero.toISOString() : null,
  };
}

// Les ancres lues sont RENDUES avec l'ancre du cycle (revue t41) : la cible de
// re-passation part de la même lecture que la proposition du jalon. Deux
// lectures pourraient encadrer la confirmation d'une nouvelle ancre, et servir
// la proposition d'un cycle avec la cible d'un autre.
export async function ancreCycleCourant(
  idPatient: string,
  milestone: JalonMomentum,
  asOf: string | null,
): Promise<{ ancreCycle: AncreCycleCourant | null; ancres: readonly AncrePersistee[] }> {
  if (estAncreDeCycle(milestone)) return { ancreCycle: null, ancres: [] };
  const avantOuA = asOf ? new Date(asOf) : null;
  const ancres = await lireAncresPersistees(idPatient, avantOuA);
  return {
    ancreCycle: ancreCycleDepuis(ancres, await lireCalendriersSuivi(idPatient, avantOuA, ancres), milestone),
    ancres,
  };
}

/**
 * L'ancre demandée, quand c'est celle d'un cycle ROUVERT (`T1`, `T2`…) déjà
 * posée — sa date de référence, relue sur sa ligne (t42). Sans elle, un `T1`
 * se datait sur la réponse la plus récente du dossier : toute passation reçue
 * après la confirmation le rendait méconnaissable, et l'écran redemandait de
 * confirmer un acte déjà posé.
 *
 * `T0` n'est pas lu : la première réponse le date, et elle ne bouge pas. En
 * lecture datée, une ancre confirmée APRÈS la date lue n'existe pas encore.
 * Une ligne sans date lisible rend `null` : la proposition se date comme une
 * ouverture, jamais sur une date devinée.
 */
export async function ancrePoseeDe(
  idPatient: string,
  milestone: JalonMomentum,
  asOf: string | null,
): Promise<AncrePosee | null> {
  if (!estAncreDeCycle(milestone) || (indexDeCycle(milestone) ?? 0) === 0) return null;
  const ligne = await prisma.assessmentEpisode.findUnique({
    where: { id: identifiantAncre(idPatient, milestone) },
    select: { targetAt: true, confirmedAt: true },
  });
  if (!(ligne?.targetAt instanceof Date)) return null;
  if (asOf && ligne.confirmedAt instanceof Date && ligne.confirmedAt > new Date(asOf)) return null;
  return { targetAt: ligne.targetAt.toISOString() };
}

/** Le préfixe que `identifiantEpisode` pose sur tout identifiant d'épisode runtime. */
const PREFIXE_EPISODE = 'runtime-episode-';

/**
 * Le suffixe des identifiants d'ENVELOPPE — `runtime-snapshot-…`,
 * `runtime-review-…`, `runtime-decision-…`.
 *
 * IL DÉRIVE DE L'IDENTITÉ DE L'ÉPISODE, JAMAIS D'UNE EMPREINTE DE CONTENU. Il
 * valait `<jalon>-<16 premiers caractères du proposalHash>`, et ce hash se
 * calcule sur les réponses du dossier : l'identifiant de la carte se déplaçait
 * donc à chaque passation nouvelle. Or `schema.prisma` dit de
 * `decision_card_id` qu'il est « l'identité de la carte, pas celle de son
 * contenu » — et c'est par lui que la sélection de priorité ([[D-127]]), les
 * brouillons de protocole et les check-ins retrouvent la carte qu'ils
 * commentent. Une identité qui bouge avec le contenu les en détache.
 *
 * `assessmentEpisodeId` porte déjà le patient, le cycle et le jalon
 * (`identifiantEpisode`) : il est unique par point de décision et stable par
 * construction. Le CONTENU, lui, continue de se dire par
 * `decisionCardInputHash`, qui est fait pour ça et que rien ici ne touche.
 *
 * AUCUNE REPRISE DE DONNÉES. Lecture par conteneur du 2026-09-12 : la
 * production ne porte aucune sélection de priorité, et son unique brouillon de
 * protocole est accroché à une carte de calibrage, pas à un
 * `runtime-decision-…`. Rien n'est rendu orphelin par ce changement.
 */
export function suffixeEnveloppe(assessmentEpisodeId: string): string {
  return assessmentEpisodeId.startsWith(PREFIXE_EPISODE)
    ? assessmentEpisodeId.slice(PREFIXE_EPISODE.length)
    : assessmentEpisodeId;
}

/**
 * Ce qui IDENTIFIE un point de décision — et rien de ce qui s'en dérive.
 *
 * Les cinq champs ci-dessous sont ceux qu'un acte confirmé fixe : le même
 * épisode, pour le même patient, au même jalon, compté depuis la même date de
 * référence et sur la même fenêtre nominale. Ils ne bougent que si l'ancre
 * bouge — et une ancre qui bouge n'est plus le même acte.
 */
function identiteActe(episode: ProposedAssessmentEpisode | ConfirmedAssessmentEpisode) {
  return {
    assessmentEpisodeId: episode.assessmentEpisodeId,
    patientId: episode.patientId,
    milestone: episode.milestone,
    targetAt: episode.targetAt,
    fenetreDebut: episode.window.start,
    toleranceJours: episode.window.toleranceDays,
  };
}

/**
 * L'épisode persisté est-il REJOUABLE (`D-118`) ?
 *
 * Trois conditions, et chacune protège une propriété distincte :
 *
 * 1. L'INTÉGRITÉ — le blob relu se re-hache à son `payloadHash`. Un payload qui
 *    ne se recoupe pas ne se rejoue pas : on journalise et on sert la
 *    proposition, jamais une chaîne calculée sur un épisode altéré.
 * 2. L'IDENTITÉ DE L'ACTE — `identiteActe` ci-dessus, canoniquement identique
 *    de part et d'autre.
 * 3. L'INTÉGRITÉ DES RÉPONSES CITÉES — chaque réponse incluse par l'épisode est
 *    encore LISIBLE dans le dossier. Une passation retirée ou invalidée fait
 *    tomber le rejeu : la carte citerait une mesure que le dossier ne porte
 *    plus. Une passation AJOUTÉE, elle, ne fait plus rien tomber.
 *
 * CE QUI A ÉTÉ RETIRÉ DE LA COMPARAISON, ET POURQUOI. La condition 2 lisait le
 * SOCLE entier de la proposition — `candidateResponses`, `inWindowResponseIds`,
 * `outOfWindowResponseIds`, borne haute de fenêtre. Ces champs ne décrivent pas
 * l'acte : ils décrivent comment le dossier se composerait AUJOURD'HUI, sous la
 * règle d'inclusion d'aujourd'hui. Les comparer accrochait un acte signé à une
 * dérivation qui bouge — et elle a bougé deux fois :
 *
 *   · à chaque passation nouvelle du dossier : un patient qui répondait à un
 *     questionnaire de plus éteignait le `T0` de son propre dossier ;
 *   · au déploiement de [[D-156]], qui a fait tomber la borne haute de l'ancre
 *     initiale : un épisode signé sous la règle précédente — ses réponses hors
 *     fenêtre réintégrées une à une par le praticien — ne pouvait plus
 *     coïncider avec une proposition qui met tout dans la fenêtre.
 *
 * CONSTATÉ EN PRODUCTION LE 2026-09-12, par conteneur : quatre des sept épisodes
 * `T0` confirmés n'étaient plus rejouables, et leur fiche affichait « Décision
 * clinique non préparée » sur un acte posé. Le geste du praticien était intact
 * en base ; c'est la lecture qui refusait de le servir. Les trois épisodes
 * rejouables avaient tous été confirmés le jour même.
 *
 * CE QUE LE REJEU NE DIT PLUS, ET QUI SE DIT AILLEURS : les réponses arrivées
 * DEPUIS la confirmation n'entrent pas dans l'épisode, et la réponse `ready`
 * les COMPTE (`reponsesDepuisConfirmation`) pour que l'écran le dise. Un fait
 * porté par l'écran, jamais un refus silencieux — même patron que
 * `selectionEcartee` ([[D-127]] §11).
 */
function episodeRejouable(
  persiste: { payload: unknown; payloadHash: string },
  proposal: ProposedAssessmentEpisode,
  /**
   * Les identifiants des réponses LISIBLES aujourd'hui. `loadRuntimeInputs` les
   * a déjà passées par `filtrerPassationsExploitables` : une passation
   * invalidée n'y est plus, et c'est exactement ce que la condition 3 doit
   * voir.
   */
  reponsesLisibles: ReadonlySet<string>,
): ConfirmedAssessmentEpisode | null {
  const episode = persiste.payload as ConfirmedAssessmentEpisode;
  try {
    if (canonicalSha256(episode) !== persiste.payloadHash) {
      console.error('[cockpit GET] payload d’épisode incohérent avec son empreinte', episode.assessmentEpisodeId);
      return null;
    }
    if (canonicalJson(identiteActe(episode)) !== canonicalJson(identiteActe(proposal))) return null;
    if (!episode.includedResponseIds.every(responseId => reponsesLisibles.has(responseId))) return null;
  } catch {
    // Sérialisation canonique impossible : un épisode qu'on ne sait pas hacher
    // est un épisode qu'on ne rejoue pas.
    return null;
  }
  return episode;
}

/** Les entrées runtime d'un dossier lu au présent ou à une date résolue. */
export type EntreesRuntime = Exclude<NonNullable<Awaited<ReturnType<typeof loadRuntimeInputs>>>, { refus: unknown }>;

/**
 * L'épisode persisté que cette proposition désigne, s'il se rejoue — sinon
 * `null` (absent, ou refusé par `episodeRejouable`).
 */
export async function episodePersisteRejouable(
  inputs: EntreesRuntime,
  proposal: ProposedAssessmentEpisode,
): Promise<ConfirmedAssessmentEpisode | null> {
  const persiste = await prisma.assessmentEpisode.findUnique({
    where: { id: proposal.assessmentEpisodeId },
    select: { payload: true, payloadHash: true },
  });
  const reponsesLisibles = new Set(inputs.responses.map(reponse => reponse.responseId));
  return persiste ? episodeRejouable(persiste, proposal, reponsesLisibles) : null;
}

/**
 * La chaîne C1 d'un épisode persisté, REJOUÉE (`D-118`) — d'un seul geste pour
 * ses deux lecteurs : la carte du jalon demandé, et la cible de re-passation
 * tirée de la carte de l'ancre (t41). Deux rejeux divergeraient un jour sur la
 * sélection qu'ils servent. JETTE si le dossier ne porte plus ce que l'épisode
 * cite : chaque lecteur décide de son repli.
 */
export async function rejouerChaine(
  idPatient: string,
  inputs: EntreesRuntime,
  episode: ConfirmedAssessmentEpisode,
): Promise<{ chaine: ChaineC1; selectionEcartee: boolean; couverturesAdressage: CouvertureAdressage[] | undefined }> {
  const idSuffix = suffixeEnveloppe(episode.assessmentEpisodeId);
  const decisionCardIdRejeu = `runtime-decision-${idSuffix}`;
  // Même lecture que `verifierChaineC1` et que le POST ([[D-257]]).
  const couverturesAdressage = await lireCouverturesAdressage(idPatient, inputs.idConsultationPorteuse);
  // La sélection praticien, relue en base ([[D-127]]) par la MÊME
  // fonction que `verifierChaineC1` — deux lectures divergentes
  // rendraient 409 sur une carte honnête ([[D-101]]) — et construite par
  // le MÊME repli : une sélection devenue inapplicable est écartée, elle
  // n'emporte pas l'épisode confirmé ([[D-118]]).
  const { chaine, selectionEcartee } = construireChaineC1Tolerante({
    snapshotId: `runtime-snapshot-${idSuffix}`,
    reviewId: `runtime-review-${idSuffix}`,
    decisionCardId: decisionCardIdRejeu,
    patientId: idPatient,
    horodatage: episode.confirmedAt as string,
    episode,
    patientContext: inputs.patientContext,
    responses: inputs.responses,
    signauxAlerte: inputs.signauxAlerte,
    reponsesSecurite: inputs.reponsesSecurite,
    etatPopulation: inputs.etatPopulation,
    couverturesAdressage,
  }, await lireSelectionPriorite(idPatient, decisionCardIdRejeu));
  return { chaine, selectionEcartee, couverturesAdressage };
}
