import { BESOIN_SOURCES } from './constants';
import { calculerCouvertureBesoin, evaluerCouvertureSource } from './score';
import type { ReponsesParQuestionnaire } from './types';
import type { MotifNonMesureServi } from '../praticien/motifNonMesure';

// LE MOTIF D'UN BESOIN NON MESURÉ, SUR LE CHEMIN DE LA VALEUR — r3_08 (Q4).
//
// Le motif n'est pas recalculé à côté : chaque source passe par
// `evaluerCouvertureSource`, celle-là même dont `calculerCouvertureSource` est
// la projection. Et la question « ce besoin est-il mesuré ? » n'est jamais
// reposée ici : `calculerCouvertureBesoin` y répond, et un besoin qu'il mesure
// ne reçoit aucun motif. Un banc tient l'égalité null ⇔ motif contre
// `calculerCouverturesTousLesBesoins`.
//
// Les motifs sont dérivés de `BESOIN_SOURCES`, jamais copiés : J3-12f changera
// les sources des besoins 8, 9 et 12, et les motifs suivront.
//
// Rien de clinique n'est touché : aucune valeur, aucun mapping, aucune version
// (`VERSION_SCORE_EQUILIBRE` inchangée).

/** Le besoin 2 est hors score ([[D-122]]) : ses variables d'entrée sont des
 *  biomarqueurs, jamais un questionnaire. Les autres besoins sans source
 *  (6, 7, 11) n'ont simplement aucun instrument au mapping. */
const BESOIN_HORS_SCORE = 2;

export type ContexteMotifs = {
  /** `questionnairesEcartesParValidite` des passations brutes. */
  ecartes: ReadonlySet<string>;
  /** `datesDesReponsesRetenues` des passations brutes. */
  datesRetenues: Readonly<Record<string, Date>>;
};

/**
 * Les motifs d'un besoin non mesuré, regroupés par motif (une ligne par motif,
 * ses questionnaires dans l'ordre du mapping) ; `null` quand le besoin est
 * mesuré. Aucun « N sur M » : le calcul fait la moyenne des sources
 * disponibles, et aucune norme de complétude n'est signée.
 */
export function motifsNonMesureBesoin(
  besoinId: number,
  reponses: ReponsesParQuestionnaire,
  contexte: ContexteMotifs
): MotifNonMesureServi[] | null {
  if (calculerCouvertureBesoin(besoinId, reponses) !== null) return null;

  const sources = BESOIN_SOURCES[besoinId] ?? [];
  if (sources.length === 0) {
    return [
      {
        motif: besoinId === BESOIN_HORS_SCORE ? 'hors_score' : 'sans_instrument',
        idsQuestionnaire: [],
        dateDernierePassation: null,
      },
    ];
  }

  const parMotif = new Map<string, MotifNonMesureServi>();
  for (const source of sources) {
    const evaluation = evaluerCouvertureSource(source, reponses);
    if (!('motif' in evaluation)) continue;
    // Une source absente de la carte des réponses n'a pas toujours été
    // « non passée » : si toutes ses passations ont été écartées par le filtre
    // de validité, c'est lui qui l'a retirée, un étage plus haut.
    const motif =
      evaluation.motif === 'aucune_passation' && contexte.ecartes.has(source.idQuestionnaire)
        ? 'passation_ecartee'
        : evaluation.motif;
    // « Recueil incomplet » se date, et donc une ligne par questionnaire : la
    // déduplication garde la plus récente passation, même partielle — sans sa
    // date, une re-passation incomplète effacerait en silence une mesure
    // complète. Les sous-scores d'un même questionnaire partagent sa passation.
    const date = motif === 'recueil_incomplet' ? contexte.datesRetenues[source.idQuestionnaire] : undefined;
    const cle = motif === 'recueil_incomplet' ? `${motif}:${source.idQuestionnaire}` : motif;
    const ligne = parMotif.get(cle) ?? {
      motif,
      idsQuestionnaire: [],
      dateDernierePassation: date ? date.toISOString() : null,
    };
    if (!ligne.idsQuestionnaire.includes(source.idQuestionnaire)) ligne.idsQuestionnaire.push(source.idQuestionnaire);
    parMotif.set(cle, ligne);
  }
  return [...parMotif.values()];
}
