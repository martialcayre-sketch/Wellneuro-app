import { LABEL_PAUSE_PATIENT, LABELS_CONSTATS_DIRECTS } from './labels';
import type { AttentionBudget, DirectFinding, FourReadings } from './types';

/**
 * Restitutions simples du domaine — affichage-avant-moteurs (A7-14) : au
 * volume attendu, l'affichage bat le calcul. Aucun moteur, aucun agrégat,
 * aucun seuil.
 */

/**
 * Vocabulaire interdit dans toute restitution de l'absence de trace
 * (amendement terrain n° 2) : le silence patient est un état neutre, jamais
 * un signal négatif dérivé.
 */
export const TERMES_INTERDITS_SILENCE: readonly string[] = [
  'motivation',
  'adhésion',
  'oubli',
  'négligence',
  'abandon',
  'manque',
  'effort',
  'refus',
] as const;

function assertNeutre(text: string): string {
  const lower = text.toLowerCase();
  const interdit = TERMES_INTERDITS_SILENCE.find(terme => lower.includes(terme));
  if (interdit) {
    throw new TypeError(
      `Restitution non neutre du silence patient (terme interdit : « ${interdit} »).`
    );
  }
  return text;
}

/**
 * Couverture factuelle (JA-00 A3) : « X traces sur un budget de Y cette
 * semaine » — sans pourcentage-seuil, sans code couleur, sans qualificatif.
 */
export function describeCoverage(tracesCetteSemaine: number, budget: AttentionBudget): string {
  if (!Number.isInteger(tracesCetteSemaine) || tracesCetteSemaine < 0) {
    throw new TypeError('Le nombre de traces de la semaine est un entier positif ou nul.');
  }
  const unite = tracesCetteSemaine > 1 ? 'traces' : 'trace';
  return assertNeutre(
    `${tracesCetteSemaine} ${unite} sur un budget de ${budget.tracesParSemaine} cette semaine`
  );
}

/**
 * Constats directs d'adhésion (D8) — observables non agrégés, praticien
 * uniquement. Chaque constat est factuel ; aucune cause n'est inférée,
 * l'absence de trace reste un état neutre.
 */
export function listDirectFindings(input: {
  joursSansTrace?: number;
  occasionAbsente?: boolean;
  planMinimalActif?: boolean;
  actionDeclareeImpossible?: boolean;
}): DirectFinding[] {
  const findings: DirectFinding[] = [];
  if (input.joursSansTrace !== undefined && input.joursSansTrace > 0) {
    findings.push({
      code: 'absence_de_trace',
      description: assertNeutre(
        `${LABELS_CONSTATS_DIRECTS.absence_de_trace} (${input.joursSansTrace} ${
          input.joursSansTrace > 1 ? 'jours' : 'jour'
        })`
      ),
    });
  }
  if (input.occasionAbsente) {
    findings.push({
      code: 'absence_d_occasion',
      description: assertNeutre(LABELS_CONSTATS_DIRECTS.absence_d_occasion),
    });
  }
  if (input.planMinimalActif) {
    findings.push({
      code: 'plan_minimal_actif',
      description: assertNeutre(LABELS_CONSTATS_DIRECTS.plan_minimal_actif),
    });
  }
  if (input.actionDeclareeImpossible) {
    findings.push({
      code: 'action_declaree_impossible',
      description: assertNeutre(LABELS_CONSTATS_DIRECTS.action_declaree_impossible),
    });
  }
  return findings;
}

/**
 * Restitution de la pause déclarée par le patient — distincte de l'absence
 * simple de trace : ici le patient a parlé, on restitue sa déclaration telle
 * quelle, sans interprétation.
 */
export function describePatientPause(): string {
  return assertNeutre(`Le patient a indiqué : « ${LABEL_PAUSE_PATIENT} »`);
}

/**
 * Les quatre lectures (A7-11) restent séparées : déclaré / observé / vécu /
 * interprété. Aucune fonction de fusion n'existe dans le domaine.
 */
export function buildFourReadings(input: Partial<FourReadings>): FourReadings {
  return {
    declare: [...(input.declare ?? [])],
    observe: [...(input.observe ?? [])],
    vecu: [...(input.vecu ?? [])],
    interprete: [...(input.interprete ?? [])],
  };
}
