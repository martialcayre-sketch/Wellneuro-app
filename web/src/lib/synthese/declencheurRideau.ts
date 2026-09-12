import { prisma } from '@/lib/prisma';
import { preconditionsT0PourPatient } from '@/lib/clinical-engine/preconditionsT0Prisma';
import { accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import { isSyntheseParRideauEnabled } from '@/lib/patient/featureFlag';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { finalizeLogContext } from '@/lib/observability/requestContext';
import type { RequestContext } from '@/lib/observability/types';
import { genererSynthesePersistee, preparerGeneration } from './generation';

/**
 * UNE SYNTHÈSE À LA FERMETURE D'UN RIDEAU, ET DEUX FOIS SEULEMENT.
 *
 * CE QUE CE MODULE REMPLACE. Le Fil rappelait « synthèse à générer » à chaque
 * lecture confirmée d'un questionnaire sans synthèse depuis (`lib/fil/cartes`,
 * `cartesSynthesesAGenerer`) : sur un dossier qui rend ses questionnaires en
 * plusieurs vagues, la même demande revenait vague après vague. Le geste
 * attendu, lui, n'est pertinent qu'à deux moments — quand la matière est
 * complète.
 *
 * LES DEUX MOMENTS SONT DÉJÀ NOMMÉS PAR LE DOMAINE, et ce module n'en invente
 * aucun : ce sont deux conditions de `preconditionsT0` ([[D-052]], [[D-158]]).
 *
 *   · `rideau_t0` satisfaite — les quatre instruments de la table signée sont
 *     renseignés et exploitables. **Pas le pack de base** : `D-052` §1 refuse
 *     de dériver le rideau d'une ligne éditable depuis l'UI, et `Q_SOM_09` est
 *     au pack sans être au rideau — un agenda du sommeil sur 21 nuits ferait
 *     attendre trois semaines une synthèse que le rideau permet le jour même.
 *   · `second_rideau` satisfaite — tout ce qui a été assigné depuis la première
 *     synthèse validée est rendu.
 *
 * IL NE VALIDE RIEN, ET NE TRANSMET RIEN. Ce qu'il produit est un
 * `Brouillon_IA` : la validation et l'envoi restent deux gestes du praticien,
 * et ce sont eux qui atteignent le patient. L'automatisation ne franchit que la
 * première des trois portes — celle qui n'est qu'un appel d'API.
 *
 * IDEMPOTENT PAR MARQUEUR, jamais par date. Une génération automatique inscrit
 * son origine dans `donneesEntree.source` ; la présence de ce marqueur ferme
 * définitivement le rideau correspondant. Conséquence assumée : un brouillon
 * REJETÉ ne se régénère pas — un rejet est une décision, pas une panne.
 */

/** Le marqueur d'origine, inscrit dans `donneesEntree.source`. */
export const SOURCE_PREMIER_RIDEAU = 'auto_rideau_premier';
export const SOURCE_SECOND_RIDEAU = 'auto_rideau_second';

export type VerdictRideau =
  | { genere: true; rideau: 'premier' | 'second'; idSynthese: string }
  | {
      genere: false;
      raison:
        | 'drapeau_eteint'
        | 'dossier_clos'
        | 'rideau_incomplet'
        | 'deja_genere'
        | 'aucune_passation'
        | 'echec';
    };

/** `true` quand la condition existe ET qu'elle est satisfaite. */
function satisfaite(conditions: { id: string; satisfaite: boolean }[], id: string): boolean {
  return conditions.find(condition => condition.id === id)?.satisfaite === true;
}

/**
 * QUEL RIDEAU VIENT DE SE FERMER SANS QUE RIEN N'AIT ÉTÉ PRODUIT POUR LUI ?
 *
 * L'ORDRE EST CELUI DU PARCOURS : le second rideau ne peut pas se fermer avant
 * le premier, et le tester d'abord ferait produire la seconde synthèse sur un
 * dossier qui n'a jamais eu la première.
 */
async function rideauAServir(
  idPatient: string,
): Promise<'premier' | 'second' | 'rideau_incomplet' | 'deja_genere'> {
  const preconditions = await preconditionsT0PourPatient(idPatient, 'T0');
  const conditions = [...preconditions.dures, ...preconditions.souples];
  if (!satisfaite(conditions, 'rideau_t0')) return 'rideau_incomplet';

  // UNE SEULE LECTURE POUR LES DEUX MARQUEURS : deux requêtes diraient la même
  // chose et pourraient se contredire si une génération s'intercalait.
  const marqueurs = await prisma.syntheseIA.findMany({
    where: {
      idPatient,
      OR: [
        { donneesEntree: { path: ['source'], equals: SOURCE_PREMIER_RIDEAU } },
        { donneesEntree: { path: ['source'], equals: SOURCE_SECOND_RIDEAU } },
      ],
    },
    select: { donneesEntree: true },
  });
  const sources = new Set(
    marqueurs.map(ligne => (ligne.donneesEntree as { source?: string } | null)?.source),
  );

  if (!sources.has(SOURCE_PREMIER_RIDEAU)) return 'premier';
  if (satisfaite(conditions, 'second_rideau') && !sources.has(SOURCE_SECOND_RIDEAU)) return 'second';
  // LE RIDEAU EST COMPLET ET DÉJÀ SERVI. Ce n'est pas « incomplet », et les
  // confondre ferait chercher une matière manquante là où tout est là.
  return 'deja_genere';
}

/**
 * GÉNÈRE SI UN RIDEAU VIENT DE SE FERMER — et ne lève jamais.
 *
 * APPELÉ APRÈS LA RÉPONSE DU PATIENT (`after()`), jamais pendant : une
 * génération dure des dizaines de secondes, et la faire attendre au patient qui
 * vient de valider son questionnaire transformerait un service rendu en écran
 * bloqué. C'est aussi pourquoi rien ici ne remonte à l'appelant : son travail
 * est fini.
 *
 * TOUT REFUS EST UNE VALEUR, JAMAIS UNE EXCEPTION. Un échec de génération — API
 * indisponible, réponse tronquée — ne doit pas laisser de trace d'erreur sur la
 * soumission du patient, qui, elle, a parfaitement réussi.
 */
export async function genererSiRideauFerme(
  idPatient: string,
  emailPatient: string,
  requestContext: RequestContext,
): Promise<VerdictRideau> {
  try {
    // DRAPEAU D'ABORD : ce qui s'ouvre ici est un appel au modèle qu'aucun
    // humain n'a demandé. Il se décide, il ne se déploie pas.
    if (!isSyntheseParRideauEnabled()) return { genere: false, raison: 'drapeau_eteint' };

    // Dossier au suivi clôturé : on ne produit plus rien dessus. La garde est
    // la même que celle de l'envoi et de l'assignation — un dossier clos ne
    // reçoit pas de brouillon neuf.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (patient && !accepteNouvelEnvoi(patient)) return { genere: false, raison: 'dossier_clos' };

    const rideau = await rideauAServir(idPatient);
    if (rideau === 'rideau_incomplet' || rideau === 'deja_genere') {
      return { genere: false, raison: rideau };
    }

    const preparation = await preparerGeneration(idPatient, emailPatient, requestContext);
    if (!preparation.ok) return { genere: false, raison: 'aucune_passation' };

    const state = { idSynthese: '' };
    const payload = await genererSynthesePersistee(
      {
        ...preparation.args,
        source: rideau === 'premier' ? SOURCE_PREMIER_RIDEAU : SOURCE_SECOND_RIDEAU,
      },
      state,
    );

    // AUCUN JOURNAL DE SUCCÈS, et aucun code d'événement inventé pour ce lot :
    // la ligne écrite en base EST la trace, datée, et elle porte son origine
    // (`donneesEntree.source`). Un second récit du même fait finirait par le
    // contredire.
    return { genere: true, rideau, idSynthese: payload.idSynthese };
  } catch (err) {
    // NE JAMAIS LEVER : la soumission du patient a réussi, et son parcours ne
    // doit pas porter l'échec d'un travail qu'il n'a pas demandé.
    logger.error({
      event: EVENT_CODES.SYNTHESE_POST_EXCEPTION,
      domain: 'SYNTHESE_IA',
      message: 'Génération automatique à la fermeture d’un rideau impossible',
      context: finalizeLogContext(requestContext, { retryable: true }),
      error: err,
    });
    return { genere: false, raison: 'echec' };
  }
}
