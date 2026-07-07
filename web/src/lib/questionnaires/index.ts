// @ts-nocheck
/* eslint-disable */
// ═══════════════════════════════════════════════════════════════════════════════
// Wellneuro — Point d'entrée des modules de catalogue par domaine (lot 7)
// ═══════════════════════════════════════════════════════════════════════════════
// Réexporte les helpers partagés et les questionnaires extraits de
// `web/src/lib/questions.ts`. Le catalogue global reste assemblé et exporté par
// `questions.ts` (`QUESTIONNAIRE_CATALOGUE`) : cet index n'est qu'une commodité
// d'accès aux définitions par domaine. L'extraction est incrémentale — seuls les
// domaines déjà déplacés apparaissent ici.
// ═══════════════════════════════════════════════════════════════════════════════

export * from './shared';
export { Q_CAN_01, Q_CAN_02 } from './cancerologie';
