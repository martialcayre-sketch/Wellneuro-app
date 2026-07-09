import { agregerEquilibre, calculerCouvertureBesoin } from './score';
import { PLAFOND_FONDATION_CRITIQUE } from './constants';

// Vérification zéro-dépendance du moteur "Mon équilibre" (pas de framework
// de test dans ce repo). Appelée depuis web/prisma/seed.ts derrière le flag
// SEED_VERIFY_EQUILIBRE_SCORE=1 — ne touche à aucune donnée en base.
// Lève une erreur explicite au premier écart plutôt que de continuer.

function assertEgal(valeur: unknown, attendu: unknown, message: string): void {
  const ok =
    typeof valeur === 'number' && typeof attendu === 'number'
      ? Math.abs(valeur - attendu) < 1e-6
      : valeur === attendu;
  if (!ok) {
    throw new Error(`[equilibre/score.check] ${message} — attendu ${attendu}, obtenu ${valeur}`);
  }
}

export function verifierMoteurEquilibre(): void {
  // 1. Aucune couverture disponible → score global non évaluable, pas de plafond.
  const vide = agregerEquilibre({});
  assertEgal(vide.scoreGlobal, null, 'score global sans aucune donnée doit être null');
  assertEgal(vide.plafondApplique, false, 'pas de plafond sans donnée');

  // 2. Tout au maximum (1.0 partout) → score global = 100, pas de plafond.
  const couverturesParfaites = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [i + 1, 1])
  );
  const parfait = agregerEquilibre(couverturesParfaites);
  assertEgal(parfait.scoreGlobal, 100, 'score global parfait doit être 100');
  assertEgal(parfait.plafondApplique, false, 'pas de plafond quand tout est bon');

  // 3. Fondation critique effondrée (besoin 5, sommeil) malgré le reste parfait :
  //    le plafonnement doit s'appliquer même si la moyenne brute serait haute —
  //    "aucune moyenne ne masque une carence sévère" (MON_EQUILIBRE_CONTEXTE.md §2).
  const couverturesAvecEffondrement = { ...couverturesParfaites, 5: 0.1 };
  const effondre = agregerEquilibre(couverturesAvecEffondrement);
  if (effondre.scoreGlobalAvantPlafond === null || effondre.scoreGlobalAvantPlafond <= PLAFOND_FONDATION_CRITIQUE) {
    throw new Error(
      '[equilibre/score.check] le scénario de test doit produire un score avant plafond supérieur au plafond, sinon le test ne prouve rien'
    );
  }
  assertEgal(effondre.plafondApplique, true, 'le plafond doit se déclencher sur une fondation critique effondrée');
  assertEgal(effondre.scoreGlobal, PLAFOND_FONDATION_CRITIQUE, 'le score global doit être plafonné');
  assertEgal(
    effondre.fondationsCritiquesDeclenchees.some(f => f.besoin === 5),
    true,
    'le besoin 5 doit apparaître dans les fondations critiques déclenchées'
  );

  // 4. Besoin sans questionnaire mappé (besoin 3, rythme alimentaire) :
  //    toujours null, quelles que soient les réponses fournies — jamais 0 par défaut.
  const couvertureBesoin3 = calculerCouvertureBesoin(3, { Q_ALI_01: { MO1: '4' } });
  assertEgal(couvertureBesoin3, null, 'besoin 3 doit rester non évaluable en v1 (aucune source mappée)');

  // 5. Intégration légère avec un vrai questionnaire (Q_SOM_06 — Pichot, fatigue) :
  //    8 items notés 2,2,1,1,1,1,1,1 sur 0-4 → total 10/32, inversé → couverture 0,6875.
  const couvertureBesoin2 = calculerCouvertureBesoin(2, {
    Q_SOM_06: { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' },
  });
  assertEgal(couvertureBesoin2, 0.6875, 'couverture besoin 2 (Pichot 10/32 inversé) incorrecte');

  // eslint-disable-next-line no-console
  console.log('[equilibre/score.check] OK — 5 vérifications passées.');
}
