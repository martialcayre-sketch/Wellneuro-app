/**
 * LES LECTURES QUE LE COCKPIT AFFICHE SOUS UN QUESTIONNAIRE — la lecture publiée
 * quand il y en a une, la grille servie nommée pour ce qu'elle est, et la
 * population de lecture (J3-12f, vague 1 : [[D-548]] §2.3 à §2.5).
 *
 * UN AFFICHAGE, PAS UNE RÈGLE. Rien ici n'entre dans un calcul, une bande ou un
 * déclencheur : les bornes et les couleurs servies ne changent pas, et aucune
 * ligne ne change de comportement ([[D-529]] §5.2, [[D-541]] §5.2). Le module ne
 * touche aucun `scoring` : une note ajoutée à un bloc cité par une table signée
 * ferait bouger ses empreintes ; cet affichage vit donc HORS du catalogue.
 *
 * MODULE-FEUILLE : il n'importe rien. FORME OPAQUE ([[D-251]] §4) : des nombres,
 * des identifiants de claim et des renvois à des décisions ; aucun texte de claim
 * n'est recopié. Une valeur publiée vit en constante nommée avec l'identifiant de
 * son claim ; une grille servie sans source se dit « lecture du cabinet » ou
 * « lecture WellNeuro », avec la décision qui l'arbitre.
 */

/** PSQI — la lecture publiée : un seuil unique, sans conduite ([[D-529]] §3.2). */
export const PSQI_LECTURE_PUBLIEE = {
  /** « score global supérieur à 5 » : mauvais dormeur. */
  seuilSuperieurA: 5,
  claimSeuil: 'WN-CL-0666-002',
  /** Seuil fixé après coup. */
  claimPostHoc: 'WN-CL-0666-010',
  /** La source n'y attache aucune conduite et ne pose pas de diagnostic. */
  claimSansConduite: 'WN-CL-0666-013',
} as const;

/** Epworth — la plage normale publiée et les deux autres lectures ([[D-529]] §3.3). */
export const EPWORTH_LECTURE_PUBLIEE = {
  /** Dormeurs sans trouble : scores de 0 à 10. */
  plageNormale: { min: 0, max: 10 },
  claimPlageNormale: 'WN-CL-0668-001',
  /** « supérieur à 10 » : somnolence diurne excessive. */
  somnolenceExcessiveSuperieurA: 10,
  claimSomnolenceExcessive: 'WN-CL-0668-002',
  /** Recommandation de pratique : « normal < 10 » — une lecture qui coexiste. */
  normalInferieurA: 10,
  claimRecommandation: 'WN-CL-0575-006',
} as const;

/**
 * Les grilles servies qui n'ont pas de source publiée, et la décision qui
 * l'arbitre. `lecture` nomme ce que le praticien lit : `cabinet` quand la grille
 * vient de la pièce du cabinet, `wellneuro` quand c'est la gradation WellNeuro.
 */
export const GRILLES_SERVIES_SANS_SOURCE = {
  Q_SOM_01: { lecture: 'wellneuro', decision: 'D-529', sections: '§3.2 et §6.2' },
  Q_SOM_02: { lecture: 'cabinet', decision: 'D-529', sections: '§3.3 et §6.2' },
  Q_STR_02: { lecture: 'cabinet', decision: 'D-541', sections: '§3.2 et §5.2' },
} as const;

/**
 * La décision qui borne la population de lecture, par questionnaire.
 * `sansValidation` : la décision dit que le questionnaire n'a pas de population
 * de validation ([[D-526]] §4) — la ligne affichée ne suggère alors aucune
 * validation partielle.
 */
export const POPULATION_DE_LECTURE = {
  Q_SOM_01: { decision: 'D-529', sections: '§4', sansValidation: false },
  Q_SOM_02: { decision: 'D-529', sections: '§4', sansValidation: false },
  Q_GAS_01: { decision: 'D-526', sections: '§4', sansValidation: true },
  Q_INF_01: { decision: 'D-526', sections: '§4', sansValidation: true },
  Q_STR_02: { decision: 'D-541', sections: '§4', sansValidation: false },
} as const;

const NOM_LECTURE = { cabinet: 'lecture du cabinet', wellneuro: 'lecture WellNeuro' } as const;

export type LigneLecture = { genre: 'publiee' | 'servie' | 'population'; texte: string };

/**
 * Les lignes à afficher sous un questionnaire du cockpit ; `[]` pour les autres.
 * Aucune ne dépend du score du patient.
 */
export function lecturesAffichees(idQuestionnaire: string | null | undefined): LigneLecture[] {
  if (!idQuestionnaire) return [];
  const lignes: LigneLecture[] = [];

  if (idQuestionnaire === 'Q_SOM_01') {
    const p = PSQI_LECTURE_PUBLIEE;
    lignes.push({
      genre: 'publiee',
      texte: `Lecture publiée : un score global supérieur à ${p.seuilSuperieurA} distingue les mauvais dormeurs (${p.claimSeuil}) ; seuil fixé après coup (${p.claimPostHoc}) ; aucune conduite ni diagnostic (${p.claimSansConduite}).`,
    });
  }
  if (idQuestionnaire === 'Q_SOM_02') {
    const e = EPWORTH_LECTURE_PUBLIEE;
    lignes.push({
      genre: 'publiee',
      texte: `Lectures publiées : plage normale de ${e.plageNormale.min} à ${e.plageNormale.max} chez des dormeurs sans trouble (${e.claimPlageNormale}), au-delà de ${e.somnolenceExcessiveSuperieurA} somnolence diurne excessive (${e.claimSomnolenceExcessive}) ; recommandation de pratique : normal inférieur à ${e.normalInferieurA} (${e.claimRecommandation}). Les lectures coexistent.`,
    });
  }
  const servie = (GRILLES_SERVIES_SANS_SOURCE as Record<string, { lecture: 'cabinet' | 'wellneuro'; decision: string; sections: string }>)[idQuestionnaire];
  if (servie) {
    lignes.push({
      genre: 'servie',
      texte: `Grille servie : ${NOM_LECTURE[servie.lecture]}, sans source publiée (${servie.decision} ${servie.sections}).`,
    });
  }
  const pop = (POPULATION_DE_LECTURE as Record<string, { decision: string; sections: string; sansValidation: boolean }>)[idQuestionnaire];
  if (pop) {
    lignes.push({
      genre: 'population',
      texte: pop.sansValidation
        ? `Population de lecture : l'adulte ; ce questionnaire n'a pas de population de validation (${pop.decision} ${pop.sections}).`
        : `Population de lecture : l'adulte ; ne vaut pas validation pour tout adulte ni pour toute situation clinique (${pop.decision} ${pop.sections}).`,
    });
  }
  return lignes;
}
