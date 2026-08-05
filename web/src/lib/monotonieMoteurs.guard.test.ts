// Banc de la MONOTONIE — 2026-08-05, lot du plancher garanti.
//
// CE QU'IL TIENT, et pourquoi c'est lui qui porte le risque du lot. Un plancher
// garanti n'est vrai que si RÉPONDRE NE PEUT JAMAIS FAIRE BAISSER LE TOTAL. Sans
// cette propriété, la bande décrochée par un recueil partiel n'est pas une borne
// inférieure : c'est une bande fausse, servie sous la marque du garanti — soit
// exactement le faux positif rassurant que `D-014` combattait, en pire.
//
// LA PROPRIÉTÉ N'ÉTAIT PAS VRAIE avant ce lot. Sur le PSQI, `ITEMS_C2` vaut
// `['Q2','Q5a']` sous la frontière « au moins un item », si bien que `Q5a` seul
// renseigné faisait calculer `C2` avec un `Q2` absent — dont le défaut valait
// trente minutes, donc `lat = 1`. La vraie réponse à dix minutes rend `lat = 0` :
// le total BAISSAIT en répondant. Le défaut est passé à `0`. Le remettre à `30`
// fait rougir ce banc, et c'est sa raison d'être.
//
// COMMENT IL PROUVE, et pourquoi pas autrement. `bornesAtteignables.guard.test.ts`
// explique déjà en tête qu'un balayage par saturation est trompeur sur un moteur
// non monotone, et que les propriétés s'y établissent par construction ciblée.
// Ici : pour chaque item, on part d'une passation complète PRIVÉE de cet item et
// l'on rejoue toutes ses valeurs légales. C'est le pas élémentaire — « une
// réponse de plus » —, et il suffit, les composantes du PSQI étant indépendantes
// et les autres moteurs purement additifs. Une énumération globale serait
// déraisonnable : `C5` seule a 4⁹ combinaisons.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';

/**
 * Valeurs légales d'une question.
 *
 * Les items à options les déclarent. Les quatre items numériques du PSQI (`Q1`
 * à `Q4`) n'en ont pas : leur balayage est écrit ici, bornes réelles de
 * l'instrument comprises — minuit et 23 h pour un horaire, zéro minute et deux
 * heures pour une latence, zéro et douze heures pour une durée. Les valeurs
 * extrêmes sont celles qui font tomber les défauts, donc celles qui comptent.
 */
const BALAYAGES_NUMERIQUES: Record<string, number[]> = {
  Q1: [0, 21, 22, 23],
  Q2: [0, 5, 10, 15, 16, 30, 31, 60, 61, 120],
  Q3: [0, 5, 6, 7, 8, 12],
  Q4: [0, 3, 4, 5, 6, 7, 8, 12],
};

function questionsDe(def: any): any[] {
  return (def.sections || []).flatMap((s: any) => s.questions || []);
}

function valeursLegales(q: any): number[] {
  if (Array.isArray(q.options) && q.options.length > 0) {
    return q.options.map((o: any) => o.v).filter((v: any) => typeof v === 'number');
  }
  return BALAYAGES_NUMERIQUES[q.id] || [];
}

/**
 * Le cœur du banc : pour chaque item, retirer sa réponse d'une passation
 * complète, puis vérifier qu'AUCUNE valeur légale ne fait baisser le total.
 *
 * PLUSIEURS LIGNES DE BASE, et non une seule — c'est la correction qui a été
 * apportée à ce banc avant sa première livraison, après qu'il eut laissé passer
 * le défaut qu'il existe pour attraper. Depuis une passation où tous les items
 * valent 1, retirer `Q2` laissait `latSum = 1` et `C2 = 1` ; répondre « dix
 * minutes » donnait `latSum = 1` et `C2 = 1` — aucune baisse visible, alors que
 * la monotonie ÉTAIT rompue. Depuis une passation où `Q5a` vaut 0, la même
 * réponse fait tomber `C2` de 1 à 0, et le défaut apparaît. Les seuils d'une
 * composante ne se franchissent pas aux mêmes endroits selon ses voisins : une
 * ligne de base unique ne prouve la monotonie de personne.
 *
 * Rend le nombre de couples (ligne de base, item, valeur) réellement éprouvés —
 * un banc qui n'éprouverait rien passerait sans rien prouver.
 */
function eprouverMonotonie(id: string, lignesDeBase: Record<string, number>[]): number {
  const def: any = (QUESTIONNAIRE_CATALOGUE as any)[id];
  let couples = 0;
  for (const complet of lignesDeBase) {
    for (const q of questionsDe(def)) {
      if (!(q.id in complet)) continue;
      const sans = { ...complet };
      delete sans[q.id];
      const totalSans: number | null = (calculateScore(id, sans) as any).total;
      if (totalSans === null) continue; // sans total, pas de plancher : hors sujet

      for (const v of valeursLegales(q)) {
        const totalAvec: number | null = (calculateScore(id, { ...sans, [q.id]: v }) as any).total;
        if (totalAvec === null) continue;
        expect(
          totalAvec,
          `${id} — depuis ${JSON.stringify(sans)}, répondre ${q.id}=${v} fait passer le total de ${totalSans} à ${totalAvec} : la monotonie est rompue, et le plancher garanti devient un faux positif.`,
        ).toBeGreaterThanOrEqual(totalSans);
        couples++;
      }
    }
  }
  return couples;
}

/** Trois lignes de base d'un instrument à options : basse, médiane, haute. */
function troisLignesDeBase(def: any): Record<string, number>[] {
  const rang = (v: number[], i: 'bas' | 'median' | 'haut') => {
    const t = [...v].sort((a, b) => a - b);
    return i === 'bas' ? t[0] : i === 'haut' ? t[t.length - 1] : t[Math.floor(t.length / 2)];
  };
  return (['bas', 'median', 'haut'] as const).map((i) => {
    const base: Record<string, number> = {};
    for (const q of questionsDe(def)) {
      const v = valeursLegales(q);
      base[q.id] = v.length === 0 ? 0 : rang(v, i);
    }
    return base;
  });
}

describe('monotonie — répondre ne peut jamais faire baisser un total', () => {
  it('PSQI — les dix-huit items cotés, toutes valeurs légales, trois lignes de base', () => {
    // La ligne BASSE est celle qui compte : c'est la seule où la marche de `C2`
    // peut redescendre quand `Q2` reçoit sa réponse. Les deux autres sont là
    // pour éprouver les autres composantes à d'autres hauteurs de seuil.
    const lignes: Record<string, number>[] = [
      { Q1: 23, Q2: 0, Q3: 7, Q4: 8, Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0, Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0, Q6: 0, Q7: 0, Q8: 0, Q9: 0 },
      { Q1: 23, Q2: 30, Q3: 7, Q4: 6, Q5a: 1, Q5b: 1, Q5c: 1, Q5d: 1, Q5e: 1, Q5f: 1, Q5g: 1, Q5h: 1, Q5i: 1, Q5j: 1, Q6: 1, Q7: 1, Q8: 1, Q9: 1 },
      { Q1: 0, Q2: 120, Q3: 7, Q4: 2, Q5a: 3, Q5b: 3, Q5c: 3, Q5d: 3, Q5e: 3, Q5f: 3, Q5g: 3, Q5h: 3, Q5i: 3, Q5j: 3, Q6: 3, Q7: 3, Q8: 3, Q9: 3 },
    ];
    const couples = eprouverMonotonie('Q_SOM_01', lignes);
    // Le compte protège le banc de lui-même : si `valeursLegales` cessait de
    // rendre quoi que ce soit, tout passerait en silence. Il est épinglé À
    // L'UNITÉ ici, et seulement ici, parce que c'est le PSQI qui porte les
    // défauts subtils : `Q1`, `Q3` et `Q4` n'y contribuent aucun couple — les
    // retirer annule `C4`, donc le total, donc le sujet. Le chiffre bouge si le
    // balayage change ; il doit alors être relu, pas rehaussé.
    expect(couples).toBe(174);
  });

  it('PSQI — le cas exact de `Q2`, celui qui rompait la monotonie', () => {
    // `Q5a` renseigné, `Q2` absent : `C2` est calculé sur un `Q2` par défaut.
    // Avec l'ancien défaut de trente minutes, `lat` valait 1 et le total sortait
    // à 1 ; répondre « dix minutes » le ramenait à 0. Ce test-ci vise le défaut
    // nommément, là où le précédent le trouverait par balayage.
    const base: Record<string, number> = {
      Q1: 23, Q3: 7, Q4: 8,
      Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0,
      Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
      Q6: 0, Q7: 0, Q8: 0, Q9: 0,
    };
    const sansQ2: any = calculateScore('Q_SOM_01', base);
    const avecQ2: any = calculateScore('Q_SOM_01', { ...base, Q2: 10 });
    expect(sansQ2.total).toBe(0);
    expect(avecQ2.total).toBe(0);
    expect(avecQ2.total).toBeGreaterThanOrEqual(sansQ2.total);
  });

  it('TFD — les trente-et-un items', () => {
    const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_GAS_01;
    const couples = eprouverMonotonie('Q_GAS_01', troisLignesDeBase(def));
    expect(couples).toBeGreaterThan(300);
  });

  it('sum — tous les instruments déclarés éligibles au plancher', () => {
    let instruments = 0;
    let couples = 0;
    for (const def of Object.values(QUESTIONNAIRE_CATALOGUE as any) as any[]) {
      const sc = def?.scoring;
      if (!sc || sc.type !== 'sum' || sc.severiteCroissante !== true) continue;
      couples += eprouverMonotonie(def.id, troisLignesDeBase(def));
      instruments++;
    }
    // Vingt-et-un instruments `sum` sont déclarés croissants, drapeau
    // `WN_ALI_01_SIIN57` éteint comme allumé — `Q_ALI_01` n'en fait pas partie.
    expect(instruments).toBe(21);
    expect(couples).toBeGreaterThan(200);
  });
});
