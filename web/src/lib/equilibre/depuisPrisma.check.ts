import {
  construireHistoriqueEquilibre,
  construireReponsesParQuestionnaire,
  resoudreDateT0,
} from './depuisPrisma';
import type { ReponseBrute } from './depuisPrisma';

// Vérification zéro-dépendance de l'adaptateur Prisma → moteur d'équilibre.
// Même convention que les autres .check.ts : pas de framework de test,
// appelé depuis web/prisma/seed.ts derrière SEED_VERIFY_EQUILIBRE_SCORE=1.

function assertEgal(valeur: unknown, attendu: unknown, message: string): void {
  const ok =
    typeof valeur === 'number' && typeof attendu === 'number'
      ? Math.abs(valeur - attendu) < 1e-6
      : valeur === attendu;
  if (!ok) {
    throw new Error(`[equilibre/depuisPrisma.check] ${message} — attendu ${attendu}, obtenu ${valeur}`);
  }
}

// Fixture Q_SOM_06 (Pichot, fatigue) déjà vérifiée dans score.check.ts :
// 8 items notés 2,2,1,1,1,1,1,1 sur 0-4 → total 10/32, inversé → couverture 0,6875.
const RAW_ANSWERS_Q_SOM_06 = { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' };

export function verifierDepuisPrisma(): void {
  // 1. Deux réponses au même questionnaire → seule la plus récente est retenue.
  const dateAncienne = new Date('2026-01-01T00:00:00.000Z');
  const dateRecente = new Date('2026-01-15T00:00:00.000Z');
  const dedoublonnees = construireReponsesParQuestionnaire([
    { idQuestionnaire: 'Q_SOM_06', dateReponse: dateAncienne, scoresJson: { rawAnswers: { P1: '4' } } },
    { idQuestionnaire: 'Q_SOM_06', dateReponse: dateRecente, scoresJson: { rawAnswers: RAW_ANSWERS_Q_SOM_06 } },
  ]);
  assertEgal(
    dedoublonnees.Q_SOM_06?.P1,
    '2',
    'la réponse la plus récente au même questionnaire doit être retenue'
  );

  // 2. Réponse sans rawAnswers exploitable (ex. données de seed antérieures à
  //    ce chantier, scoresJson déjà agrégé) → ignorée, jamais recalculée sur
  //    un résultat déjà agrégé.
  const sansRawAnswers = construireReponsesParQuestionnaire([
    { idQuestionnaire: 'Q_STR_01', dateReponse: dateRecente, scoresJson: { A: { total: 16 }, global: 32 } },
  ]);
  assertEgal(
    sansRawAnswers.Q_STR_01,
    undefined,
    'une réponse sans rawAnswers exploitable doit être ignorée, pas recalculée'
  );

  // 3. dateLimite : une réponse postérieure à la date limite est ignorée.
  const avecDateLimite = construireReponsesParQuestionnaire(
    [{ idQuestionnaire: 'Q_SOM_06', dateReponse: dateRecente, scoresJson: { rawAnswers: RAW_ANSWERS_Q_SOM_06 } }],
    dateAncienne
  );
  assertEgal(
    avecDateLimite.Q_SOM_06,
    undefined,
    'une réponse postérieure à dateLimite ne doit pas être incluse'
  );

  // 4. resoudreDateT0 : la plus ancienne réponse, pas la plus récente ; null si aucune réponse.
  assertEgal(
    resoudreDateT0([
      { idQuestionnaire: 'Q_SOM_06', dateReponse: dateRecente, scoresJson: {} },
      { idQuestionnaire: 'Q_STR_01', dateReponse: dateAncienne, scoresJson: {} },
    ])?.getTime(),
    dateAncienne.getTime(),
    'dateT0 doit être la date de la toute première réponse, pas la plus récente'
  );
  assertEgal(resoudreDateT0([]), null, 'dateT0 doit être null sans aucune réponse');

  // 5. construireHistoriqueEquilibre : un jalon futur (pas encore atteint) est omis.
  const dateT0Future = new Date();
  const historiqueFutur = construireHistoriqueEquilibre([
    { idQuestionnaire: 'Q_SOM_06', dateReponse: dateT0Future, scoresJson: { rawAnswers: RAW_ANSWERS_Q_SOM_06 } },
  ]);
  assertEgal(
    historiqueFutur.length <= 1,
    true,
    'seuls les jalons déjà atteints (T0 au minimum) doivent produire une lecture'
  );

  // 6. construireHistoriqueEquilibre : jalon T0 atteint avec une couverture
  //    partielle disponible produit une lecture dans les bornes attendues (0-100).
  if (historiqueFutur.length === 1) {
    const { valeur } = historiqueFutur[0];
    assertEgal(valeur >= 0 && valeur <= 100, true, 'la valeur de la lecture T0 doit être comprise entre 0 et 100');
  }

  // eslint-disable-next-line no-console
  console.log('[equilibre/depuisPrisma.check] OK — 6 vérifications passées.');
}
