import { prisma } from '../prisma';
import { ANAMNESE_CHAMP_REQUIS } from '../consultation/anamnese';
import { contradictionsPourPatient } from '../clinical/contradictionsService';
import {
  evaluerPreconditionsT0,
  messageRefusPreconditions,
  type EntreesPreconditionsT0,
  type PreconditionsT0,
} from './preconditionsT0';

/**
 * Lecture en base des entrées de préconditions T0 ([[D-052]]).
 *
 * TOUJOURS DEPUIS LA BASE, JAMAIS DEPUIS LE CORPS DE REQUÊTE. L'épisode qui
 * atteint les points de persistance transite par le navigateur
 * (`ClinicalRuntimeSection` le renvoie au POST) : une précondition qui lirait
 * ce qu'elle doit vérifier serait un contrôle client déguisé, ce que le lot
 * s'interdit explicitement.
 *
 * Ce module NE FAIT PAS : ni authentification, ni contrôle d'appartenance, ni
 * journalisation d'accès — mêmes frontières qu'`orientationService`. C'est
 * l'appelant qui les porte, et les trois routes appellent APRÈS leur garde
 * d'appartenance : on ne lit pas le dossier d'un patient qu'on n'a pas prouvé
 * sien.
 *
 * REQUÊTE DÉLIBÉRÉMENT REDONDANTE côté cockpit, qui a déjà lu les passations
 * dans `loadRuntimeInputs` : le prix d'une lecture de plus achète un chemin de
 * calcul UNIQUE pour les trois routes. Trois calculs qui divergeraient
 * refuseraient un T0 à un endroit et l'accepteraient à un autre.
 */
export async function chargerEntreesPreconditionsT0(idPatient: string): Promise<EntreesPreconditionsT0> {
  const [passations, consultation, synthese, contradictions] = await Promise.all([
    prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: {
        idQuestionnaire: true,
        dateReponse: true,
        scoresJson: true,
        statutValidite: true,
      },
      orderBy: [{ dateReponse: 'asc' }],
    }),
    // La consultation VALIDÉE la plus récente : une anamnèse portée par une
    // consultation non validée n'est pas consignée, elle est en cours.
    prisma.consultation.findFirst({
      where: { idPatient, statut: 'validee' },
      select: { anamnese: true },
      orderBy: [{ dateValidation: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.syntheseIA.findFirst({
      where: { idPatient },
      select: { statut: true, dateValidation: true },
      orderBy: [{ createdAt: 'desc' }],
    }),
    contradictionsPourPatient(idPatient),
  ]);

  return {
    passations: passations.map(passation => ({
      idQuestionnaire: passation.idQuestionnaire,
      dateReponse: passation.dateReponse,
      scoresJson: passation.scoresJson,
      statutValidite: passation.statutValidite,
    })),
    anamnese: consultation?.anamnese ?? null,
    consultationValidee: consultation !== null,
    synthese: synthese ? { statut: synthese.statut, dateValidation: synthese.dateValidation } : null,
    contradictionsOuvertes: contradictions.length,
  };
}

/** Raccourci des trois routes : lire, puis évaluer. */
export async function preconditionsT0PourPatient(idPatient: string): Promise<PreconditionsT0> {
  return evaluerPreconditionsT0(await chargerEntreesPreconditionsT0(idPatient));
}

/**
 * Garde des deux POINTS DE PERSISTANCE ([[D-052]]).
 *
 * Le cockpit a déjà refusé en amont, mais son POST n'écrit rien : c'est ici que
 * la base est gardée. L'épisode arrive du NAVIGATEUR — les conditions dures
 * sont donc recalculées en base, et les contournements reçus ne sont crus que
 * sur leur présence et leur motif, jamais sur ce qu'ils affirment couvrir.
 *
 * Hors T0, aucune précondition : les jalons de suivi ne sont pas gouvernés par
 * cette porte.
 */
export async function refusPreconditionsPersistance(
  episode: { patientId: string; milestone: string; preconditionOverrides?: { conditionId: string; motif: string }[] },
): Promise<string | null> {
  if (episode.milestone !== 'T0') return null;

  const preconditions = await preconditionsT0PourPatient(episode.patientId);
  if (preconditions.bloquant) return messageRefusPreconditions(preconditions);

  const motifsPresents = new Set(
    (episode.preconditionOverrides ?? [])
      .filter(override => typeof override?.motif === 'string' && override.motif.trim() !== '')
      .map(override => override.conditionId),
  );
  const nonJustifiees = preconditions.contournementsRequis.filter(id => !motifsPresents.has(id));
  if (nonJustifiees.length > 0) {
    return 'Un motif est requis pour passer outre un avertissement.';
  }
  return null;
}

// Ré-export : les routes n'ont besoin que de ce module, et le champ requis de
// l'anamnèse sert au message d'erreur comme à l'écran.
export { ANAMNESE_CHAMP_REQUIS };
