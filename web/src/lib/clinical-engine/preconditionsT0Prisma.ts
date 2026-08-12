import { prisma } from '../prisma';
import { ANAMNESE_CHAMP_REQUIS } from '../consultation/anamnese';
import { contradictionsPourPatient } from '../clinical/contradictionsService';
import {
  STATUTS_SYNTHESE_VALIDEE,
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
    // La dernière synthèse VALIDÉE, et non la dernière ligne : chaque
    // génération crée une ligne neuve au statut `Brouillon_IA`. Sans ce
    // filtre, régénérer une synthèse pour la relire bloquait le T0 d'un
    // dossier qui en portait une validée, avec le message « Aucune synthèse
    // validée par le praticien » — factuellement faux (revue du 2026-08-12).
    // Tri sur `dateValidation` : c'est elle qui date la validation, quand
    // `createdAt` date la génération.
    prisma.syntheseIA.findFirst({
      where: { idPatient, statut: { in: [...STATUTS_SYNTHESE_VALIDEE] } },
      select: { statut: true, dateValidation: true },
      orderBy: [{ dateValidation: 'desc' }, { createdAt: 'desc' }],
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
 * Le jalon d'un épisode, DÉRIVÉ de son identifiant quand c'est possible.
 *
 * POURQUOI PAS `episode.milestone` SEUL : il vient du corps de requête. La
 * revue du 2026-08-12 l'a montré — déclarer `milestone: 'J21'` sur un épisode
 * dont l'identifiant est celui du T0 désactivait la porte, et comme la
 * persistance est un `upsert(..., update: {})`, l'identifiant T0 du patient
 * était squatté DÉFINITIVEMENT par une ligne de suivi.
 *
 * L'identifiant runtime est `runtime-episode-<patient>-<jalon>`
 * (`runtimeFromPrisma.ts`) : son suffixe fait foi contre le champ déclaré. Un
 * identifiant hors de ce format (fixtures, contrats externes) retombe sur le
 * champ, faute de mieux — c'est dit plutôt que supposé.
 */
function jalonEffectif(episode: { assessmentEpisodeId?: string; milestone: string }): string {
  const suffixe = /-(T0|J21|J42|J90)$/.exec(episode.assessmentEpisodeId ?? '');
  return suffixe ? suffixe[1] : episode.milestone;
}

/**
 * Garde des deux POINTS DE PERSISTANCE ([[D-052]]).
 *
 * Le cockpit a déjà refusé en amont, mais son POST n'écrit rien : c'est ici que
 * la base est gardée. L'épisode arrive du NAVIGATEUR, donc rien de ce qu'il
 * porte ne fait foi : les conditions dures sont recalculées en base, et la
 * trace de contournement est VÉRIFIÉE CHAMP PAR CHAMP contre la session et
 * contre les conditions réellement en défaut.
 *
 * Elle est vérifiée plutôt que réécrite : réécrire `decidePar` ferait diverger
 * l'épisode de celui qui a été haché dans `snapshot.inputHash`, et casserait
 * la chaîne de provenance que ces routes existent pour tenir.
 *
 * Hors T0, aucune précondition : les jalons de suivi ne sont pas gouvernés par
 * cette porte.
 */
export async function refusPreconditionsPersistance(
  episode: {
    patientId: string;
    milestone: string;
    assessmentEpisodeId?: string;
    preconditionOverrides?: { conditionId?: string; motif?: string; decidePar?: string; decideLe?: string }[];
  },
  emailPraticienSession: string,
): Promise<string | null> {
  if (jalonEffectif(episode) !== 'T0') return null;

  const preconditions = await preconditionsT0PourPatient(episode.patientId);
  if (preconditions.bloquant) return messageRefusPreconditions(preconditions);

  const requis = new Set(preconditions.contournementsRequis);
  const overrides = episode.preconditionOverrides ?? [];

  for (const override of overrides) {
    const conditionId = override?.conditionId ?? '';
    // Un contournement qui ne correspond à AUCUNE condition en défaut n'a rien
    // à faire dans le payload : il y resterait comme la trace d'un arbitrage
    // qui n'a jamais eu lieu.
    if (!requis.has(conditionId)) {
      return `Contournement sans objet : la condition « ${conditionId || 'inconnue'} » n’est pas en défaut sur ce dossier.`;
    }
    if (typeof override.motif !== 'string' || override.motif.trim() === '') {
      return `Un motif est requis pour passer outre l’avertissement « ${conditionId} ».`;
    }
    // L'auteur et l'horodatage sont posés par le serveur au moment de la
    // confirmation. Les recevoir du navigateur sans les recouper laisserait
    // attribuer un contournement à un autre praticien, ou le dater à volonté,
    // dans la seule ligne qui en fera foi pour toujours.
    // Une session sans email ne peut authentifier aucun auteur : le
    // contournement est alors refusé, jamais accepté par défaut.
    if (!emailPraticienSession || override.decidePar !== emailPraticienSession) {
      return 'La justification de contournement ne porte pas l’auteur de la session.';
    }
    const decideLe = override.decideLe ?? '';
    if (Number.isNaN(new Date(decideLe).getTime()) || new Date(decideLe).toISOString() !== decideLe) {
      return 'La justification de contournement porte une date invalide.';
    }
  }

  const couvertes = new Set(overrides.map(override => override?.conditionId ?? ''));
  const nonJustifiees = preconditions.contournementsRequis.filter(id => !couvertes.has(id));
  if (nonJustifiees.length > 0) {
    return `Un motif est requis pour passer outre l’avertissement « ${nonJustifiees[0]} ».`;
  }
  return null;
}

// Ré-export : les routes n'ont besoin que de ce module, et le champ requis de
// l'anamnèse sert au message d'erreur comme à l'écran.
export { ANAMNESE_CHAMP_REQUIS };
