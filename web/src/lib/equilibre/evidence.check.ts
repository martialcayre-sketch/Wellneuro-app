import { calculerNiveauPreuveBesoin, listerSourcesPreuveBesoin } from './evidence';

// Vérification zéro-dépendance du module niveaux de preuve (feat/e2-evidence-levels).
// Même convention que score.check.ts : pas de framework de test, appelé depuis
// web/prisma/seed.ts derrière SEED_VERIFY_EQUILIBRE_SCORE=1.

function assertEgal(valeur: unknown, attendu: unknown, message: string): void {
  if (valeur !== attendu) {
    throw new Error(`[equilibre/evidence.check] ${message} — attendu ${attendu}, obtenu ${valeur}`);
  }
}

export function verifierNiveauxPreuve(): void {
  // 1. Besoin sans aucune réponse → NON_MESURE, jamais 'D'.
  assertEgal(
    calculerNiveauPreuveBesoin(5, {}),
    'NON_MESURE',
    'besoin sans réponse doit être NON_MESURE'
  );

  // 2. Besoin 3 (aucune source mappée en v1) → NON_MESURE même avec des réponses ailleurs.
  assertEgal(
    calculerNiveauPreuveBesoin(3, { Q_ALI_01: { MO1: '4' } }),
    'NON_MESURE',
    'besoin 3 (aucune source catalogue) doit rester NON_MESURE'
  );

  // 3. Besoin 5 (Q_SOM_01 = A, Q_MOD_01 = B) : si seul Q_SOM_01 est répondu → niveau A.
  assertEgal(
    calculerNiveauPreuveBesoin(5, { Q_SOM_01: { P1: '1' } }),
    'A',
    'besoin 5 avec seule source Q_SOM_01 répondue doit être A'
  );

  // 4. Besoin 5 avec les deux sources répondues (A + B) → le plus faible gagne, donc B.
  //    Règle actée : jamais de dilution d'une source faible par une source robuste.
  assertEgal(
    calculerNiveauPreuveBesoin(5, { Q_SOM_01: { P1: '1' }, Q_MOD_01: { ACT1: '1' } }),
    'B',
    'besoin 5 avec sources A+B répondues doit retomber au plus faible (B)'
  );

  // 5. listerSourcesPreuveBesoin ne renvoie que les sources effectivement répondues.
  const sources = listerSourcesPreuveBesoin(5, { Q_SOM_01: { P1: '1' } });
  assertEgal(sources.length, 1, 'seule la source répondue doit apparaître');
  assertEgal(sources[0]?.idQuestionnaire, 'Q_SOM_01', 'la source listée doit être Q_SOM_01');
  assertEgal(sources[0]?.grade, 'A', 'le grade de Q_SOM_01 doit être A');

  // eslint-disable-next-line no-console
  console.log('[equilibre/evidence.check] OK — 5 vérifications passées.');
}
