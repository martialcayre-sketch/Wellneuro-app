import { calculerDeltaMomentum, resoudreLectureJalon } from './momentum';
import type { LectureDatee } from './types';

// Vérification zéro-dépendance du module momentum (feat/e2-momentum-tracking).
// Même convention que score.check.ts : pas de framework de test, appelé
// depuis web/prisma/seed.ts derrière SEED_VERIFY_EQUILIBRE_SCORE=1.

function assertEgal(valeur: unknown, attendu: unknown, message: string): void {
  if (valeur !== attendu) {
    throw new Error(`[equilibre/momentum.check] ${message} — attendu ${attendu}, obtenu ${valeur}`);
  }
}

function jours(n: number): number {
  return n * 24 * 60 * 60 * 1000;
}

export function verifierMomentum(): void {
  const dateT0 = new Date('2026-01-01T00:00:00.000Z');

  // 1. Aucune lecture dans la fenêtre du jalon → null, pas de valeur par défaut.
  const lecturesLoin: LectureDatee[] = [
    { date: new Date(dateT0.getTime() + jours(21) + jours(20)), valeur: 60 },
  ];
  assertEgal(
    resoudreLectureJalon(dateT0, 'J21', lecturesLoin),
    null,
    'aucune lecture à ±20j du jalon J21 (tolérance ±8j) ne doit résoudre'
  );

  // 2. Une lecture dans la fenêtre (+5j du centre J21) → résolue.
  const lectureDansFenetre: LectureDatee = { date: new Date(dateT0.getTime() + jours(21) + jours(5)), valeur: 55 };
  const resolue = resoudreLectureJalon(dateT0, 'J21', [lectureDansFenetre]);
  assertEgal(resolue?.valeur, 55, 'la lecture à +5j du centre J21 doit être résolue');

  // 3. Deux lectures valides dans la fenêtre → celle la plus proche du centre gagne.
  const lecturesConcurrentes: LectureDatee[] = [
    { date: new Date(dateT0.getTime() + jours(21) - jours(7)), valeur: 40 }, // à 7j du centre
    { date: new Date(dateT0.getTime() + jours(21) + jours(2)), valeur: 70 }, // à 2j du centre — plus proche
  ];
  const gagnante = resoudreLectureJalon(dateT0, 'J21', lecturesConcurrentes);
  assertEgal(gagnante?.valeur, 70, 'la lecture la plus proche du centre du jalon doit être retenue');

  // 4. Delta positif → tendance 'hausse'.
  const hausse = calculerDeltaMomentum({ date: dateT0, valeur: 40 }, { date: new Date(dateT0.getTime() + jours(21)), valeur: 55 });
  assertEgal(hausse?.delta, 15, 'delta doit être 55-40=15');
  assertEgal(hausse?.tendance, 'hausse', 'tendance doit être hausse pour un delta positif');

  // 5. Une des deux lectures absente → null (jamais de comparaison partielle).
  assertEgal(
    calculerDeltaMomentum(null, { date: dateT0, valeur: 55 }),
    null,
    'delta doit être null si une lecture manque'
  );

  // eslint-disable-next-line no-console
  console.log('[equilibre/momentum.check] OK — 5 vérifications passées.');
}
