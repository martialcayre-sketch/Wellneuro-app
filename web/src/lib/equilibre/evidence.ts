import { BESOIN_SOURCES, NIVEAU_PREUVE_PAR_SOURCE, RANG_PREUVE } from './constants';
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

/** Détail par source répondue — pour un futur tooltip listant les questionnaires. */
export function listerSourcesPreuveBesoin(
  besoinId: number,
  reponses: ReponsesParQuestionnaire
): SourcePreuve[] {
  const sources = BESOIN_SOURCES[besoinId] ?? [];
  return sources
    .filter(source => Boolean(reponses[source.idQuestionnaire]))
    .map(source => ({
      idQuestionnaire: source.idQuestionnaire,
      sousScore: source.sousScore,
      grade: NIVEAU_PREUVE_PAR_SOURCE[source.idQuestionnaire] ?? null,
    }));
}
