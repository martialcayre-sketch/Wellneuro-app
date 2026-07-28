import { BESOIN_SOURCES, NIVEAU_PREUVE_PAR_SOURCE, RANG_PREUVE } from './constants';
import { calculerCouvertureSource } from './score';
import type { NiveauPreuveBesoin, ReponsesParQuestionnaire, SourcePreuve } from './types';

/**
 * Niveau de preuve d'un besoin = le plus faible parmi ses sources
 * effectivement répondues par le patient (pas les sources théoriques du
 * catalogue) — jamais dilué par une source plus robuste sur le même besoin.
 * 'NON_MESURE' si aucune source n'a été répondue, distinct de 'D'.
 */
export function calculerNiveauPreuveBesoin(
  besoinId: number,
  reponses: ReponsesParQuestionnaire
): NiveauPreuveBesoin {
  const grades = listerSourcesPreuveBesoin(besoinId, reponses)
    .map(s => s.grade)
    .filter((g): g is NonNullable<typeof g> => g !== null);

  if (grades.length === 0) return 'NON_MESURE';
  return grades.reduce((pire, g) => (RANG_PREUVE[g] < RANG_PREUVE[pire] ? g : pire));
}

export function calculerNiveauxPreuveTousLesBesoins(
  reponses: ReponsesParQuestionnaire
): Record<number, NiveauPreuveBesoin> {
  const resultat: Record<number, NiveauPreuveBesoin> = {};
  for (const besoinId of Object.keys(BESOIN_SOURCES).map(Number)) {
    resultat[besoinId] = calculerNiveauPreuveBesoin(besoinId, reponses);
  }
  return resultat;
}

/**
 * Détail par source EXPLOITABLE — pour un futur tooltip listant les
 * questionnaires, et lu tel quel par `api/praticien/besoins`.
 *
 * Le prédicat est `calculerCouvertureSource(...) !== null`, le même que celui de
 * `score.ts`, et non plus la simple présence d'un objet de réponses. Un
 * `Boolean(reponses[id])` ignorait `sousScore` et ignorait l'échec de scoring :
 * un besoin pouvait afficher un grade de preuve alors que `score.ts` le tenait
 * déjà pour non couvert. Cas vivant : un agenda du sommeil ouvert sous son seuil
 * de nuits rend `{scored: false}`, sans total — le besoin restait « preuve B »
 * sur une source dont aucune mesure n'existe.
 *
 * Le prédicat n'est PAS extrait dans un troisième module : ce serait dédoubler
 * la définition de « source exploitable », le défaut même qu'on corrige.
 */
export function listerSourcesPreuveBesoin(
  besoinId: number,
  reponses: ReponsesParQuestionnaire
): SourcePreuve[] {
  const sources = BESOIN_SOURCES[besoinId] ?? [];
  return sources
    .filter(source => calculerCouvertureSource(source, reponses) !== null)
    .map(source => ({
      idQuestionnaire: source.idQuestionnaire,
      sousScore: source.sousScore,
      grade: NIVEAU_PREUVE_PAR_SOURCE[source.idQuestionnaire] ?? null,
    }));
}
