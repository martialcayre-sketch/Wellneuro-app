import { BESOIN_SOURCES } from './constants';
import { calculerCouvertureBesoin, evaluerCouvertureSource } from './score';
import type { ReponsesParQuestionnaire } from './types';
import type { EcartDecisionServi, MotifNonMesureServi } from '../praticien/motifNonMesure';
import { hasExploitableRawAnswers } from '../clinical-engine/clinicalSnapshot';

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

/**
 * L'écart avec la décision d'un besoin MESURÉ (r3_10, Q5) : les sources qui
 * alimentent sa valeur et dont la passation retenue est écartée par le
 * snapshot, une ligne par questionnaire ; `null` sans écart ou quand le
 * besoin n'est pas mesuré — l'écart va des routes vers la décision, jamais
 * l'inverse.
 *
 * Rien n'est jugé ici : la contribution, c'est `evaluerCouvertureSource` ;
 * la passation entière, c'est le prédicat du snapshot lui-même, appliqué aux
 * mêmes réponses brutes que celles que les routes ont retenues. Les sources
 * sont celles de `BESOIN_SOURCES`, jamais une liste copiée : la HAD (besoin 8)
 * en est, que [[D-359]] §3 ne nommait pas, et J3-12f suivra.
 *
 * « Incomplète » est exact parce que les instruments à sous-score ne portent
 * que des items numériques (`likert`, `select` à valeurs entières) : un refus
 * du prédicat sur une source qui compte vient d'un item absent ou vide hors de
 * ceux qu'elle lit — ou d'une valeur non numérique, qu'aucun de leurs
 * formulaires n'écrit. Les réponses brutes sont l'objet stocké, inchangé
 * (`extraireRawAnswers`) : l'agenda y garde ses `null`, que le snapshot admet.
 */
export function ecartsDecisionBesoin(
  besoinId: number,
  reponses: ReponsesParQuestionnaire,
  contexte: ContexteMotifs
): EcartDecisionServi[] | null {
  if (calculerCouvertureBesoin(besoinId, reponses) === null) return null;
  const parQuestionnaire = new Map<string, EcartDecisionServi>();
  for (const source of BESOIN_SOURCES[besoinId] ?? []) {
    const id = source.idQuestionnaire;
    if (parQuestionnaire.has(id)) continue;
    if (!('couverture' in evaluerCouvertureSource(source, reponses))) continue;
    if (hasExploitableRawAnswers({ questionnaireId: id, scoresJson: { rawAnswers: reponses[id] } })) continue;
    const date = contexte.datesRetenues[id];
    parQuestionnaire.set(id, { idQuestionnaire: id, dateDernierePassation: date ? date.toISOString() : null });
  }
  return parQuestionnaire.size > 0 ? [...parQuestionnaire.values()] : null;
}
