import { calculerCouvertureSource } from '@/lib/equilibre/score';
import type { ReponsesParQuestionnaire, SourceQuestionnaire } from '@/lib/equilibre/types';
import type { ProvenanceChiffre } from '@/lib/praticien/provenanceChiffre';

// PROVENANCE DATÉE ([[D-333]] §2 règle 1), ÉTABLIE CÔTÉ SERVEUR : les
// questionnaires que la formule a RÉELLEMENT lus — mêmes listes, même fonction
// que le calcul —, chacun à la date de la passation retenue (même sélection
// que `construireReponsesParQuestionnaire`). Rien n'est inféré : un chiffre
// dont la provenance ne s'établit pas n'est pas affiché par le panneau.
//
// Une seule règle pour les deux routes qui servent la couverture d'un besoin
// (`api/praticien/equilibre`, tiroir ; `api/praticien/besoins`, onglet,
// r3_09) : la même valeur ne peut pas dire deux provenances.
export function provenanceDesSources(
  valeur: number | null,
  sources: SourceQuestionnaire[],
  reponses: ReponsesParQuestionnaire,
  datesRetenues: Record<string, Date>,
  versionCalcul: string | null
): ProvenanceChiffre | null {
  if (valeur === null) return null;
  const lues = [
    ...new Set(sources.filter(s => calculerCouvertureSource(s, reponses) !== null).map(s => s.idQuestionnaire)),
  ];
  return {
    sources: lues.map(id => ({ idQuestionnaire: id, dateReponse: datesRetenues[id]?.toISOString() ?? null })),
    versionCalcul,
  };
}
