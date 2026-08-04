import { describe, expect, it } from 'vitest';
import { Q_ALI_01, Q_ALI_01_SIIN_57, Q_ALI_01_COURT_14 } from '@/lib/questionnaires/alimentaire';
import {
  BESOIN_SOURCES,
  BESOINS_FONDATIONS_CRITIQUES,
  MAX_RYTHME_CHRONO,
  SEUIL_EFFONDREMENT,
  VERSION_SCORE_EQUILIBRE,
} from './constants';

// Cohérence de la forme alimentaire servie.
//
// Trois valeurs doivent basculer ENSEMBLE avec `WN_ALI_01_SIIN57` : la
// définition servie, le `max` du besoin 1, et l'étiquette de version du score.
// Si l'une reste en arrière, le défaut est silencieux et grave :
//
//   — `max` resté à 42 sur un total /90  → couverture saturée à 1,0 ;
//   — `max` passé à 90 sur un total /42  → couverture écrasée, et le besoin 1
//     étant une FONDATION CRITIQUE, le score global est plafonné à 50 ;
//   — étiquette figée              → des épisodes annoncés sous un barème qui
//     n'a pas été appliqué, et `resoudreComparaison` bloqué sans raison.
//
// Le test lit le drapeau plutôt que de présumer son état : il vaut dans les
// deux positions, et c'est ce qui le rend utile au moment de l'allumage.

const SIIN57_ACTIF = process.env.WN_ALI_01_SIIN57 === 'true';

function nbItems(def: { sections: Array<{ questions: unknown[] }> }): number {
  return def.sections.flatMap(s => s.questions).length;
}

describe('forme alimentaire servie', () => {
  it('sert la forme correspondant au drapeau', () => {
    expect(Q_ALI_01).toBe(SIIN57_ACTIF ? Q_ALI_01_SIIN_57 : Q_ALI_01_COURT_14);
    expect(nbItems(Q_ALI_01)).toBe(SIIN57_ACTIF ? 57 : 14);
  });

  it('le `max` du besoin 1 suit le barème réellement servi', () => {
    const source = BESOIN_SOURCES[1].find(s => s.idQuestionnaire === 'Q_ALI_01');
    expect(source, 'Q_ALI_01 n’est plus source du besoin 1').toBeDefined();
    expect(source!.max).toBe(Q_ALI_01.scoring.maxTotal);
    expect(source!.max).toBe(SIIN57_ACTIF ? 90 : 42);
  });

  it('l’étiquette de version suit le barème réellement servi', () => {
    // v10 / v11 depuis la garde de recueil partiel du PSQI (2026-08-04) : la
    // disponibilité de `Q_SOM_01` comme source du besoin 5 change, et le
    // fichier `constants.ts` range le mapping parmi ce qui impose un bump.
    // L'étape précédente était v8 / v9 (regroupement du besoin 5, 2026-07-28) ;
    // chaque branche avance d'un cran, comme à chaque fois. Voir la note de
    // `constants.ts` pour la DIRECTION de l'effet, qui est rassurante et non
    // protectrice — c'est elle qui rend le bump obligatoire.
    expect(VERSION_SCORE_EQUILIBRE).toBe(SIIN57_ACTIF ? 'v11' : 'v10');
  });

  it('le besoin 1 reste une fondation critique — d’où l’exigence ci-dessus', () => {
    // Ce n'est pas décoratif : c'est ce qui transforme un `max` faux en
    // plafonnement du score global, et non en simple imprécision.
    expect([...BESOINS_FONDATIONS_CRITIQUES]).toContain(1);
  });

  it('aucune autre source du besoin 1 n’a été ajoutée en passant', () => {
    // Le lot ne change pas le mapping des besoins : il change la forme d'un
    // instrument. Le branchement des sous-catégories est un lot distinct.
    expect(BESOIN_SOURCES[1].map(s => s.idQuestionnaire)).toEqual(['Q_ALI_01']);
  });

  it('le besoin 2 n’a toujours aucune source, et ne peut PAS en avoir', () => {
    // Ce n'est pas « pas encore » : le guide des 12 besoins donne au besoin 2
    // des biomarqueurs pour seules variables d'entrée (ferritine, zinc,
    // magnésium, iode, sélénium, vitamine D, B9, B12). Aucun questionnaire ne
    // mesure un statut micronutritionnel — l'y brancher referait le défaut
    // Q_SOM_06, sur une fondation critique.
    expect(BESOIN_SOURCES[2]).toEqual([]);
  });

  it('le besoin 3 est servi par le sous-score de rythme, dans la position SIIN', () => {
    const sources = BESOIN_SOURCES[3];
    expect(sources.map(s => s.idQuestionnaire)).toEqual(['Q_ALI_01']);
    expect(sources[0].sousScore).toBe('RYTHME_CHRONO');
    // `max` DÉRIVÉ du barème servi, jamais littéral : 7 sous la forme SIIN
    // (2+2+2+1), 0 sous la forme courte qui ne déclare pas ce sous-score.
    expect(sources[0].max).toBe(SIIN57_ACTIF ? 7 : 0);
    expect(sources[0].max).toBe(MAX_RYTHME_CHRONO);
  });

  it('le sous-score servi ne se confond pas avec la catégorie d’affichage', () => {
    // `RYTHME_ALIMENTAIRE` en affiche 6 (/10), `RYTHME_CHRONO` en sert 4 (/7).
    // Les confondre ferait porter au besoin 3 la restauration rapide et la
    // régularité des prises, que le guide ne lui donne pas.
    const scoring = Q_ALI_01_SIIN_57.scoring as any;
    const categorie = scoring.dimensions.find((d: any) => d.id === 'RYTHME_ALIMENTAIRE');
    const servi = scoring.sousScoresBesoins.find((s: any) => s.id === 'RYTHME_CHRONO');
    expect(categorie.items).toEqual(['SIIN50', 'SIIN51', 'SIIN52', 'SIIN53', 'SIIN54', 'SIIN55']);
    expect(servi.items).toEqual(['SIIN52', 'SIIN53', 'SIIN54', 'SIIN55']);
    expect(categorie.max).toBe(10);
  });

  it('la liste des besoins SANS source est figée — sinon un branchement passe en silence', () => {
    // Le trou que ce lot ferme : rien n'empêchait le besoin 3 de quitter cette
    // liste sans qu'aucun test ne rougisse. Désormais, brancher 2, 6, 7 ou 11
    // — ou débrancher 1, 3, 4, 5, 8, 9, 10, 12 — fait échouer ici.
    const sansSource = Object.entries(BESOIN_SOURCES)
      .filter(([, sources]) => sources.length === 0)
      .map(([id]) => Number(id))
      .sort((a, b) => a - b);
    expect(sansSource).toEqual([2, 6, 7, 11]);
  });
});

// ── Le seuil d'effondrement change de portée sans changer de valeur ──────────
//
// `SEUIL_EFFONDREMENT` vaut 0,34 et reste global aux cinq fondations critiques.
// Mais l'échelle du besoin 1 passe de /42 à /90, donc le total qui déclenche le
// plafonnement de « Mon équilibre » à 50 passe de ≤ 14 à ≤ 30.
//
// Sur /42, 14 était exactement le haut de la bande la plus basse du dépistage.
// Sur /90, 30 dépasse le haut de la bande source « très déséquilibrée » (25) et
// mord sur « déséquilibrée » (26-50). Arbitrage praticien du 2026-07-28 :
// GARDER 0,34 et le documenter — le seuil étant partagé, le recalibrer
// déplacerait aussi le sommeil, le digestif, le stress et les micronutriments.
//
// Ce test ne juge pas la valeur : il rend le déclencheur EXPLICITE, pour qu'un
// changement d'échelle futur ne le déplace plus en silence.
describe('seuil d’effondrement — portée sur l’échelle servie', () => {
  it('nomme le total à partir duquel le plafonnement se déclenche', () => {
    const maxServi = Q_ALI_01.scoring.maxTotal;
    const totalDeclencheur = Math.floor(SEUIL_EFFONDREMENT * maxServi);
    expect({ maxServi, totalDeclencheur }).toEqual(
      SIIN57_ACTIF ? { maxServi: 90, totalDeclencheur: 30 } : { maxServi: 42, totalDeclencheur: 14 },
    );
  });

  it('le seuil reste global — aucune fondation critique n’a le sien', () => {
    // Si un seuil par besoin est introduit un jour, ce test doit tomber : la
    // décision de 2026-07-28 repose précisément sur le caractère partagé.
    expect(typeof SEUIL_EFFONDREMENT).toBe('number');
    expect(SEUIL_EFFONDREMENT).toBe(0.34);
  });
});
