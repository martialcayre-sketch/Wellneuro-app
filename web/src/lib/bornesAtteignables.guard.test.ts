// Banc des bornes atteignables — 2026-07-30.
//
// Trois instruments étaient accusés de ne jamais atteindre les bornes de leur
// source : PSQI « balayage 2→15 » pour 0–21, QIF « 10→89,9 » pour 0–100, ECAB
// « 1→9 » pour 0–10. Le dossier #469 avait refusé de conclure : le balayage du
// banc et le mien SATURAIENT les réponses, or ces moteurs ne sont pas monotones —
// la composante « efficacité » du PSQI vaut 0 quand l'efficacité est BONNE, le
// Q12 du QIF donne 0 point à sept bons jours DÉCLARÉS, et l'item 10 de l'ECAB est
// inversé. Saturer ne maximise donc rien.
//
// Verdict, établi par CONSTRUCTION ciblée composante par composante : les trois
// étaient des artefacts de méthode. Ce banc épingle les constructions — si un
// remaniement du moteur rendait une borne réellement inatteignable, la bande
// extrême de l'instrument deviendrait morte, et personne ne le verrait sans ces
// tests : c'est exactement ce que le dossier redoutait (« si le maximum réel du
// PSQI servi était 15, la bande "troubles sévères" serait inatteignable et le
// patient le plus atteint ne la recevrait jamais »).
//
// Leçon de méthode, la troisième du même jour : mon premier essai pour le QIF
// rendait 123/100 — j'injectais 10 sur des items Likert 0–3, hors barème, par
// l'API qui ne borne pas. Un extremum construit ne vaut que DANS l'échelle des
// items ; les valeurs ci-dessous respectent chacune la sienne.
import { describe, expect, it } from 'vitest';
import { calculateScore } from '@/lib/questions';

describe('bornes atteignables — prouvées par construction, pas par saturation', () => {
  it('PSQI : 21 est atteignable — le pire dormeur existe', () => {
    // Chaque composante à 3, par des réponses RÉELLES : coucher 20 h, deux heures
    // d'endormissement, lever 11 h, trois heures dormies (efficacité 3/15 = 20 %),
    // toutes les perturbations, médication et dysfonction au maximum.
    const pire: any = calculateScore('Q_SOM_01', {
      Q1: 20, Q2: 120, Q3: 11, Q4: 3,
      Q5a: 3, Q5b: 3, Q5c: 3, Q5d: 3, Q5e: 3, Q5f: 3, Q5g: 3, Q5h: 3, Q5i: 3, Q5j: 3,
      Q6: 3, Q7: 3, Q8: 3, Q9: 3, Q10: 0,
    });
    expect(pire.components.map((c: any) => c.val)).toEqual([3, 3, 3, 3, 3, 3, 3]);
    expect(pire.total).toBe(21);
    expect(pire.interpretation?.label).toContain('sévères');
  });

  it('PSQI : 0 est atteignable — le dormeur parfait aussi', () => {
    const parfait: any = calculateScore('Q_SOM_01', {
      Q1: 23, Q2: 5, Q3: 7, Q4: 8,
      Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0, Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
      Q6: 0, Q7: 0, Q8: 0, Q9: 0, Q10: 0,
    });
    expect(parfait.total).toBe(0);
    expect(parfait.interpretation?.label).toContain('Pas de trouble');
  });

  it('QIF : 99,9 est le maximum réel, et il tombe dans la bande de tête', () => {
    // Fonction au pire (Likert 0-3 → 9,9), ZÉRO bon jour (Q12 = 0 → 10),
    // absentéisme entier (Q13 = 7 → 10), EVA saturées (70). Le 100 exact est
    // inatteignable de 0,1 : le moteur multiplie par 3,3 là où la source divise
    // par 3 — écart d'arrondi, pas bande morte, et 99,9 relève bien de la bande
    // « maximum théorique ». La saturation du banc rendait 89,9 parce qu'elle
    // mettait Q12 à 7 — sept bons jours déclarés, zéro point.
    const max: Record<string, number> = { Q12: 0, Q13: 7 };
    for (let i = 1; i <= 11; i++) max[`Q${i}`] = 3;
    for (let i = 14; i <= 20; i++) max[`Q${i}`] = 10;
    const r: any = calculateScore('Q_FIB_02', max);
    expect(r.components.map((c: any) => c.val)).toEqual([9.9, 10, 10, 70]);
    expect(r.total).toBe(99.9);
    expect(r.interpretation?.label).toContain('Maximum théorique');
  });

  it('ECAB : 0 ET 10 sont atteignables — l’item 10 inversé ne bloque rien', () => {
    // La saturation rendait 1→9 : maximiser les options met EC10 à « Vrai », qui
    // vaut 0 point (item inversé), et les minimiser le met à « Faux », qui en
    // vaut 1. Le vrai extremum inverse EC10 par rapport aux autres. Une note du
    // 2026-07-30 affirmait le plancher 0 inatteignable « établi sans balayage » :
    // elle refaisait la même erreur en sens inverse, et ce test la corrige.
    const ids = Array.from({ length: 10 }, (_, i) => `EC${i + 1}`);
    const plancher: any = calculateScore('Q_NEU_08',
      Object.fromEntries(ids.map(id => [id, id === 'EC10' ? 1 : 0])));
    expect(plancher.total).toBe(0);
    const plafond: any = calculateScore('Q_NEU_08',
      Object.fromEntries(ids.map(id => [id, id === 'EC10' ? 0 : 1])));
    expect(plafond.total).toBe(10);
  });
});
