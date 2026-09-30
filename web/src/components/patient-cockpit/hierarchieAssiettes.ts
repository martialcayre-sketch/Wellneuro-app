import { BESOIN_SOURCES } from '@/lib/equilibre/constants';

// LA HIÉRARCHIE DES ASSIETTES INDIQUÉES — l'aide au choix ([[D-254]]).
//
// DEUX CRITÈRES, ARBITRÉS PAR LE RESPONSABLE, dans cet ordre :
// 1. le LIEN AVEC LA PRIORITÉ VISÉE — un instrument d'une voie atteinte mesure
//    un besoin qui fonde cette priorité ;
// 2. la CONVERGENCE — le nombre de voies atteintes de la règle.
// À égalité, l'ordre de la table signée : un tri stable ne réordonne rien qu'un
// critère ne justifie.
//
// AUCUN POIDS, AUCUNE VALEUR DE SCORE. Le lien passe par `BESOIN_SOURCES`, la
// table signée des besoins et de leurs questionnaires, déjà lue par la
// re-passation ciblée ([[D-058]]) : aucune correspondance nouvelle n'est
// inventée (`DC-19`, `DC-26`). La convergence COMPTE des voies, elle ne mesure
// pas de combien un score dépasse sa borne : ce serait interpréter ([[D-157]]).

type Instrument = { idQuestionnaire: string; sousScore?: string };

type AssietteClassable = {
  voiesAtteintes: readonly { instruments: readonly Instrument[] }[];
};

export type Hierarchie<T> = {
  /** Au moins une voie atteinte mesure un besoin de la priorité visée. */
  liees: T[];
  /** Les autres — toutes, si aucune priorité n'est visée. */
  autres: T[];
};

/**
 * UN SOUS-SCORE NE VAUT QUE POUR LUI-MÊME. Une source de besoin qui vise un
 * questionnaire ENTIER couvre toutes ses lectures ; une source qui vise un
 * sous-score ne couvre que ce sous-score — ni le total, ni un sous-score voisin
 * (`Q_INF_03` : `DA`, `NA` et `SE` fondent le même besoin, chacun pour soi).
 */
function instrumentMesureLaPriorite(instrument: Instrument, needIds: readonly number[]): boolean {
  return needIds.some(besoin =>
    (BESOIN_SOURCES[besoin] ?? []).some(source =>
      source.idQuestionnaire === instrument.idQuestionnaire
      && (source.sousScore === undefined || source.sousScore === instrument.sousScore),
    ),
  );
}

export function estLieeALaPriorite(assiette: AssietteClassable, needIds: readonly number[]): boolean {
  return assiette.voiesAtteintes.some(voie =>
    voie.instruments.some(instrument => instrumentMesureLaPriorite(instrument, needIds)),
  );
}

function parConvergence<T extends AssietteClassable>(assiettes: T[]): T[] {
  // `sort` est stable depuis ES2019 : l'ordre de la table tient à égalité.
  return [...assiettes].sort((a, b) => b.voiesAtteintes.length - a.voiesAtteintes.length);
}

/** `needIds` vide ⇒ aucune priorité visée : tout est dans `autres`. */
export function hierarchiserAssiettes<T extends AssietteClassable>(
  indiquees: readonly T[],
  needIds: readonly number[],
): Hierarchie<T> {
  const liees = indiquees.filter(assiette => estLieeALaPriorite(assiette, needIds));
  const autres = indiquees.filter(assiette => !liees.includes(assiette));
  return { liees: parConvergence(liees), autres: parConvergence(autres) };
}
