import { describe, expect, it } from 'vitest';
import { calculateScore } from '@/lib/questions';

// Les moteurs `had`, `sum_two_phases` et `francis` publient leurs comptes de
// complétude depuis le 2026-08-16 ([[D-066]], extension de la campagne du
// 2026-08-04). Ce banc les épingle valeur par valeur, sur recueil partiel —
// parce que la défaillance serait SILENCIEUSE : un moteur qui cesse de publier
// ne casse rien, il rend simplement toute branche de disjonction ([[D-060]] §2)
// visant son instrument inerte à vie, sans erreur ni test rouge. C'est le mode
// de panne que la revue de D-060 a nommé (« l'inertie est silencieuse et un
// audit décale ») — le banc est la version qui ne décale pas.

describe('comptes de complétude — les trois moteurs de D-066 publient, aux valeurs exactes', () => {
  it('HAD : par axe ET à la racine', () => {
    // 14 items — 7 par axe (`A1..A13` impairs, `D2..D14` pairs). Quatre
    // réponses sur l'axe A, aucune sur l'axe D.
    const reponses: Record<string, number> = { A1: 1, A3: 1, A5: 1, A7: 1 };
    const partiel: any = calculateScore('Q_NEU_11', reponses);
    const axeA = partiel.subScores.find((s: any) => s.id === 'A');
    const axeD = partiel.subScores.find((s: any) => s.id === 'D');
    expect(axeA.repondus).toBe(4);
    expect(axeA.missing).toBe(3);
    expect(axeD.repondus).toBe(0);
    expect(axeD.missing).toBe(7);
    expect(partiel.repondus).toBe(4);
    expect(partiel.missing).toBe(10);

    // Recueil complet : plus rien de manquant — la forme que la garde de
    // complétude accepte, et la seule qu'une branche `ou` accepte.
    const complet: any = calculateScore('Q_NEU_11', Object.fromEntries([
      ...['A1', 'A3', 'A5', 'A7', 'A9', 'A11', 'A13'].map(id => [id, 1]),
      ...['D2', 'D4', 'D6', 'D8', 'D10', 'D12', 'D14'].map(id => [id, 1]),
    ]));
    expect(complet.subScores.every((s: any) => s.missing === 0 && s.repondus === 7)).toBe(true);
    expect(complet.missing).toBe(0);
    expect(complet.repondus).toBe(14);
  });

  it('test des 5 mots : par phase ET à la racine', () => {
    const partiel: any = calculateScore('Q_GEO_06', { DU1a: 1, DU2a: 1 });
    const phase1 = partiel.phases.find((p: any) => p.id === 'phase1');
    const phase2 = partiel.phases.find((p: any) => p.id === 'phase2');
    expect(phase1.repondus + phase2.repondus).toBe(2);
    expect(phase1.missing + phase2.missing).toBe(8);
    expect(partiel.repondus).toBe(2);
    expect(partiel.missing).toBe(8);
  });

  it('IBS-SSS (Francis) : à la racine, au grain de la composante', () => {
    // Cinq composantes ; deux renseignées. Le grain est la COMPOSANTE, pas
    // l'item — la frontière qu'`aUneMesure` pose déjà pour ce moteur.
    const partiel: any = calculateScore('Q_GAS_02', { FR_Q002: 40, FR_Q005: 60 });
    expect(partiel.repondus).toBe(2);
    expect(partiel.missing).toBe(3);

    const complet: any = calculateScore('Q_GAS_02',
      { FR_Q002: 40, FR_Q003: 5, FR_Q005: 60, FR_Q006: 30, FR_Q007: 20 });
    expect(complet.repondus).toBe(5);
    expect(complet.missing).toBe(0);
  });
});
