import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateScore } from '@/lib/questions';
import { calculerCouvertureSource } from './score';
import { Q_ALI_01, Q_ALI_01_SIIN_57, Q_ALI_01_COURT_14 } from '@/lib/questionnaires/alimentaire';
import * as constantes from './constants';
import {
  BESOIN_SOURCES,
  MAX_MESURE_DERIVEE_ALIMENTAIRE,
  MAX_RYTHME_CHRONO,
  VERSION_SCORE_EQUILIBRE,
} from './constants';

// Cohérence de la forme alimentaire servie.
//
// Trois valeurs doivent basculer ENSEMBLE avec `WN_ALI_01_SIIN57` : la
// définition servie, le `max` du besoin 1, et l'étiquette de version du score.
// Si l'une reste en arrière, le défaut est silencieux et grave :
//
//   — `max` resté sur l'ancien barème → couverture saturée à 1,0 ;
//   — `max` d'un barème plus grand que le total → couverture écrasée, et le
//     besoin 1 pèse un douzième de la moyenne directe à tort ;
//   — étiquette figée              → des épisodes annoncés sous un barème qui
//     n'a pas été appliqué, et `resoudreComparaison` bloqué sans raison.
//
// Depuis v18/v19 ([[D-548]]), le besoin 1 lit la MESURE DÉRIVÉE : le total de la
// forme servie moins le sous-score du rythme. Son `max` est dérivé de ces deux
// barèmes, jamais littéral, et vaut 0 sous la forme courte (besoin non évalué).
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
    // Dérivé : le total servi moins le sous-score du rythme (90 − 7 = 83), et 0
    // sous la forme courte, qui ne déclare pas ce sous-score ([[D-516]] §6.2).
    expect(source!.max).toBe(MAX_MESURE_DERIVEE_ALIMENTAIRE);
    expect(source!.max).toBe(SIIN57_ACTIF ? Q_ALI_01.scoring.maxTotal - MAX_RYTHME_CHRONO : 0);
    expect(source!.max).toBe(SIIN57_ACTIF ? 83 : 0);
  });

  it('l’étiquette de version suit le barème réellement servi', () => {
    // v14 / v15 depuis les comptes de recueil de `group_majority` (2026-08-13,
    // D-055 / LOT-08), v16 / v17 ([[D-438]], appliquée par [[D-474]], 2026-11-10),
    // puis v18 / v19 ([[D-548]], première vague de J3-12f : la moyenne directe, le
    // besoin 1 sur la mesure dérivée, la PSS-10 seule au besoin 9), puis v20 / v21
    // ([[D-565]], le besoin 12 sur la sous-échelle « Relation aux autres »).
    // Chaque branche avance d'un cran, comme à chaque fois.
    expect(VERSION_SCORE_EQUILIBRE).toBe(SIIN57_ACTIF ? 'v21' : 'v20');
  });

  it('le plafonnement n’existe plus : ni constante, ni liste de fondations ([[D-547]])', () => {
    // Le besoin 1 n'est plus une fondation critique, et aucun besoin ne l'est :
    // un `max` faux ne plafonne plus le total, il fausse seulement la moyenne.
    const noms = Object.keys(constantes);
    expect(noms).not.toContain('BESOINS_FONDATIONS_CRITIQUES');
    expect(noms).not.toContain('SEUIL_EFFONDREMENT');
    expect(noms).not.toContain('PLAFOND_FONDATION_CRITIQUE');
    expect(noms).not.toContain('POIDS_STRATE');
  });

  it('aucune autre source du besoin 1 n’a été ajoutée en passant', () => {
    // Le lot ne change pas le mapping des besoins : il change la forme d'un
    // instrument. Le branchement des sous-catégories est un lot distinct.
    expect(BESOIN_SOURCES[1].map(s => s.idQuestionnaire)).toEqual(['Q_ALI_01']);
  });

  it('le besoin 1 lit la mesure dérivée, sans le sous-score du rythme, sans autre arithmétique', () => {
    // Le sous-score retiré est celui que sert le besoin 3 : les mêmes quatre
    // items ne comptent plus deux fois ([[D-516]] §2.1).
    const source = BESOIN_SOURCES[1][0];
    expect(source.sansSousScore).toBe('RYTHME_CHRONO');
    expect(source.sansSousScore).toBe(BESOIN_SOURCES[3][0].sousScore);
    expect(source.sousScore).toBeUndefined();
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

// ── La mesure dérivée n'est lue que par « Mon équilibre » ([[D-516]] §5.5) ──
describe('mesure dérivée du besoin 1 — périmètre de lecture', () => {
  it('aucune source ne porte à la fois `sousScore` et `sansSousScore` (exclusifs)', () => {
    for (const sources of Object.values(BESOIN_SOURCES)) {
      for (const source of sources) {
        expect(source.sousScore !== undefined && source.sansSousScore !== undefined).toBe(false);
      }
    }
  });

  it('aucune règle, aucune tranche, aucune table clinique ne lit la mesure dérivée', () => {
    // Le mécanisme (`sansSousScore`, `MAX_MESURE_DERIVEE_ALIMENTAIRE`) n'existe que
    // dans le moteur de « Mon équilibre » : un lecteur de plus dans `clinical/`,
    // `scoring/` ou le catalogue de questionnaires lirait une mesure que la table
    // d'orientation ne signe pas.
    const racine = path.resolve(__dirname, '..');
    const interdits = ['clinical', 'scoring', 'questionnaires'];
    const fichiers: string[] = [];
    const parcourir = (dossier: string): void => {
      for (const nom of readdirSync(dossier)) {
        const complet = path.join(dossier, nom);
        if (statSync(complet).isDirectory()) parcourir(complet);
        else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) fichiers.push(complet);
      }
    };
    for (const d of interdits) parcourir(path.join(racine, d));
    expect(fichiers.length).toBeGreaterThan(20);
    for (const f of fichiers) {
      const texte = readFileSync(f, 'utf8');
      expect(texte, f).not.toMatch(/sansSousScore|MAX_MESURE_DERIVEE_ALIMENTAIRE/);
    }
  });

  it('la couverture dérivée vaut (total − rythme) / maximum dérivé, sur une passation choisie', () => {
    if (!SIIN57_ACTIF) return;
    const reponses: Record<string, number> = Object.fromEntries(
      Q_ALI_01_SIIN_57.sections.flatMap(sec => sec.questions).map(qu => [qu.id, Number((qu.options ?? [])[0]?.v)]),
    );
    const total = calculerCouvertureSource({ idQuestionnaire: 'Q_ALI_01', max: 90, inverser: false }, { Q_ALI_01: reponses });
    const rythme = calculerCouvertureSource({ idQuestionnaire: 'Q_ALI_01', sousScore: 'RYTHME_CHRONO', max: 7, inverser: false }, { Q_ALI_01: reponses });
    const derivee = calculerCouvertureSource(BESOIN_SOURCES[1][0], { Q_ALI_01: reponses });
    expect(total).not.toBeNull();
    expect(rythme).not.toBeNull();
    expect(derivee).toBeCloseTo(((total as number) * 90 - (rythme as number) * 7) / 83, 9);
  });
});

// ── Aucun total stocké n'est réécrit ([[D-552]] §4) ─────────────────────────
describe('PSS-10 — la borne basse ne change aucun total', () => {
  it('le total servi et son maximum restent ceux du barème : seule la lecture de la couverture change', () => {
    const reponses = Object.fromEntries(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'].map(id => [id, 3]));
    const resultat: any = calculateScore('Q_STR_02', reponses);
    expect(resultat.total).toBe(30);
    expect(resultat.maxTotal).toBe(50);
  });
});
