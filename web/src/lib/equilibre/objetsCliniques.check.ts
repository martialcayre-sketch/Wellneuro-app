import { calculerClarte, calculerObjetsCliniques, calculerReserveAdaptation, calculerStabiliteMetabolique } from './objetsCliniques';

// Vérification zéro-dépendance des objets cliniques dérivés (formules
// validées en conversation, 2026-07-06/07). Même convention que
// score.check.ts — appelée depuis web/prisma/seed.ts derrière
// SEED_VERIFY_EQUILIBRE_SCORE=1.

function assertEgal(valeur: unknown, attendu: unknown, message: string): void {
  const ok =
    typeof valeur === 'number' && typeof attendu === 'number'
      ? Math.abs(valeur - attendu) < 1e-6
      : valeur === attendu;
  if (!ok) {
    throw new Error(`[equilibre/objetsCliniques.check] ${message} — attendu ${attendu}, obtenu ${valeur}`);
  }
}

export function verifierObjetsCliniques(): void {
  // 1. Aucune réponse → les 3 objets dérivés sont null, jamais 0 par défaut.
  assertEgal(calculerClarte({}), null, 'clarté sans réponse doit être null');
  assertEgal(calculerReserveAdaptation({}), null, "réserve d'adaptation sans réponse doit être null");
  assertEgal(calculerStabiliteMetabolique({}), null, 'stabilité métabolique sans réponse doit être null');

  // 2. Clarté = couverture du besoin 10 (DNST DA/NA/SE) — score bas → couverture basse une fois inversée.
  //    D1-D10 tous à 4 (max d'invalidité) sur une échelle 0-4 par item, 10 items → total 40/40, inversé → 0.
  const reponsesInf03Basses = {
    Q_INF_03: Object.fromEntries([
      ...Array.from({ length: 10 }, (_, i) => [`D${i + 1}`, '4']),
      ...Array.from({ length: 10 }, (_, i) => [`N${i + 1}`, '4']),
      ...Array.from({ length: 10 }, (_, i) => [`S${i + 1}`, '4']),
      ...Array.from({ length: 10 }, (_, i) => [`ME${i + 1}`, '0']),
    ]),
  };
  assertEgal(calculerClarte(reponsesInf03Basses), 0, 'clarté doit être 0 quand DA/NA/SE sont au pire score');

  // 3. Stabilité métabolique : Q_INF_01 seul répondu au minimum (0 partout, max d'hyperexcitabilité
  //    absente) → couverture 1 après inversion (0/96 inversé = 1).
  const reponsesInf01Nulles = {
    Q_INF_01: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`H${i + 1}`, '0'])),
  };
  assertEgal(
    calculerStabiliteMetabolique(reponsesInf01Nulles),
    1,
    'stabilité métabolique avec hyperexcitabilité nulle (seule source répondue) doit être 1'
  );

  // 4. calculerObjetsCliniques regroupe bien les 4 objets calculables en une photo.
  const objets = calculerObjetsCliniques({});
  assertEgal(objets.indiceGlobal.scoreGlobal, null, 'indice global sans donnée doit être null');
  assertEgal(objets.clarte, null, 'objets.clarte doit être null sans donnée');

  // eslint-disable-next-line no-console
  console.log('[equilibre/objetsCliniques.check] OK — 4 vérifications passées.');
}
