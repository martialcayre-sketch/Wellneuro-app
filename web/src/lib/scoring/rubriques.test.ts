import { describe, expect, it } from 'vitest';
import { calculateScore, QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { rubriquesComparables, rubriquesDuScore } from './rubriques';

// Le banc exécute le MOTEUR RÉEL et normalise sa sortie. Aucune fixture écrite
// à la main : une fixture recopiée de mémoire prouverait que le normaliseur sait
// lire ce que j'ai écrit, pas ce que l'application produit. Même principe que le
// banc de certification du corpus — on exécute, on ne relit pas.

type IdQuestionnaire = keyof typeof QUESTIONNAIRE_CATALOGUE;

function itemsDe(idQuestionnaire: IdQuestionnaire): string[] {
  const q = QUESTIONNAIRE_CATALOGUE[idQuestionnaire];
  return (q?.sections ?? []).flatMap((s: { questions?: { id: string }[] }) =>
    (s.questions ?? []).map((x) => x.id),
  );
}

function toutesA(idQuestionnaire: IdQuestionnaire, valeur: string): Record<string, string> {
  return Object.fromEntries(itemsDe(idQuestionnaire).map((id) => [id, valeur]));
}

describe('rubriquesDuScore — les cinq formes du moteur, une seule sortie', () => {
  it('subScores (HAD) : deux sous-échelles bornées et interprétées', () => {
    const r = rubriquesDuScore(calculateScore('Q_NEU_11', toutesA('Q_NEU_11', '2')));

    expect(r.map((x) => x.id)).toEqual(['A', 'D']);
    expect(r.every((x) => x.origine === 'subScores')).toBe(true);
    expect(r[0]).toMatchObject({ label: 'Anxiété', valeur: 14, max: 21, maxOrigine: 'champ' });
    expect(r[0].interpretation?.label).toBe('Symptomatologie certaine');
    expect(rubriquesComparables(r)).toBe(true);
  });

  it('components (PSQI) : sept composantes, valeur sous `val`, maximum non déclaré', () => {
    const reponses: Record<string, string> = {
      Q1: '23', Q2: '45', Q3: '7', Q4: '5', Q5a: '2', Q6: '2', Q7: '1', Q8: '1', Q9: '1',
    };
    for (const id of ['Q5b', 'Q5c', 'Q5d', 'Q5e', 'Q5f', 'Q5g', 'Q5h', 'Q5i', 'Q5j']) reponses[id] = '1';
    const r = rubriquesDuScore(calculateScore('Q_SOM_01', reponses));

    // C'est le cas qui motive tout le module : sept composantes que
    // `buildMiniSynthese` ne voit pas, parce qu'il ne lit que `subScores`.
    expect(r).toHaveLength(7);
    expect(r.every((x) => x.origine === 'components')).toBe(true);
    expect(r[0]).toMatchObject({ id: 'C1', label: 'Qualité subjective', valeur: 2 });

    // Le moteur ne déclare aucun maximum par composante. Supposer 3 (la borne
    // de l'algorithme officiel) serait une affirmation sur le servi, or c'est
    // précisément ce que la campagne de certification doit établir.
    expect(r.every((x) => x.max === null && x.maxOrigine === 'inconnu')).toBe(true);
    expect(rubriquesComparables(r)).toBe(false);
  });

  it('components (QIF) : le maximum est dans le libellé, et il est lu comme tel', () => {
    const r = rubriquesDuScore(calculateScore('Q_FIB_02', toutesA('Q_FIB_02', '2')));

    expect(r.map((x) => x.id)).toEqual(['FN', 'JB', 'AB', 'EV']);
    expect(r.map((x) => x.max)).toEqual([9.9, 10, 10, 70]);
    expect(r.every((x) => x.maxOrigine === 'libelle')).toBe(true);
    // Lu, donc utilisable ; mais l'appelant sait d'où ça vient.
    expect(rubriquesComparables(r)).toBe(true);
  });

  it('phases (test des 5 mots) : rappel immédiat et différé, bornés par le champ', () => {
    const r = rubriquesDuScore(calculateScore('Q_GEO_06', toutesA('Q_GEO_06', '1')));

    expect(r.map((x) => x.label)).toEqual(['Rappel immédiat', 'Rappel différé']);
    expect(r.every((x) => x.origine === 'phases' && x.maxOrigine === 'champ')).toBe(true);
    expect(r[1]).toMatchObject({ valeur: 5, max: 5 });
  });

  it('parts (IDTAS-AE) : cinq parties hétérogènes, toutes bornées', () => {
    const r = rubriquesDuScore(calculateScore('Q_NEU_12', toutesA('Q_NEU_12', '1')));

    expect(r.map((x) => x.id)).toEqual(['P1', 'P2', 'P3A', 'P3B', 'P4']);
    expect(r.every((x) => x.origine === 'parts')).toBe(true);
    expect(r[1]).toMatchObject({ label: 'Score GSS', valeur: 6, max: 24 });
    expect(r[1].interpretation?.label).toBe('Forme légère possible de trouble affectif saisonnier');
  });

  it('categories (Berlin) : trois axes de présence, jamais convertis en zéro', () => {
    const r = rubriquesDuScore(
      calculateScore('Q_SOM_03', {
        BE1: '1', BE2: '2', BE3: '2', BE4: '1', BE5: '1', BE6: '2', BE7: '1', BE8: '1', BE9: '32',
      }),
    );

    expect(r).toHaveLength(3);
    expect(r.every((x) => x.origine === 'categories' && x.binaire)).toBe(true);
    expect(r.map((x) => x.positif)).toEqual([true, true, true]);

    // Le piège : seule C1 porte un `score`. Sans le drapeau `binaire`, C2 et C3
    // se liraient « valeur nulle » — soit un axe au plus bas — alors qu'ils sont
    // POSITIFS. Dessiner Berlin en réglette est donc interdit par construction.
    expect(r[1].valeur).toBeNull();
    expect(rubriquesComparables(r)).toBe(false);
  });
});

describe('rubriquesDuScore — ce qu\'il ne fait pas', () => {
  it('un score global sans rubrique renvoie un tableau vide, pas une anomalie', () => {
    const r = rubriquesDuScore(calculateScore('Q_SOM_06', toutesA('Q_SOM_06', '2')));
    expect(r).toEqual([]);
  });

  it('tolère null, une valeur non objet, et un tableau de rubriques vide', () => {
    expect(rubriquesDuScore(null)).toEqual([]);
    expect(rubriquesDuScore(undefined)).toEqual([]);
    expect(rubriquesDuScore('psqi')).toEqual([]);
    expect(rubriquesDuScore({ subScores: [] })).toEqual([]);
  });

  it('ne confond jamais le maximum de la rubrique avec la borne haute de sa bande', () => {
    // `interpretation.max` est la borne SUPÉRIEURE DE LA BANDE d'interprétation
    // (« 11 à 21 → symptomatologie certaine »), pas le maximum de l'échelle. Sur
    // HAD les deux valent 21 par coïncidence ; ici elles diffèrent, et lire la
    // mauvaise afficherait 4 sur 8 pour un score de 4 sur 20.
    const r = rubriquesDuScore({
      subScores: [
        { id: 'X', label: 'Axe', total: 4, max: 20, interpretation: { min: 3, max: 8, label: 'Modéré' } },
      ],
    });
    expect(r[0].max).toBe(20);
    expect(r[0].interpretation?.label).toBe('Modéré');
  });

  it('ne concatène pas deux découpages : la première clé non vide gagne', () => {
    const r = rubriquesDuScore({
      subScores: [{ id: 'A', label: 'A', total: 1, max: 2 }],
      components: [{ id: 'C', label: 'C', val: 9 }],
    });
    expect(r).toHaveLength(1);
    expect(r[0].origine).toBe('subScores');
  });

  it('donne un identifiant de repli plutôt que de perdre une rubrique anonyme', () => {
    const r = rubriquesDuScore({ components: [{ label: 'Sans identifiant', val: 3 }] });
    expect(r[0].id).toBe('components-0');
    expect(r[0].valeur).toBe(3);
  });
});
