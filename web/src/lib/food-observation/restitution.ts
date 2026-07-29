import { LABEL_PAUSE_PATIENT, LABELS_CONSTATS_DIRECTS } from './labels';
import type {
  AttentionBudget,
  CouvertureJournees,
  DirectFinding,
  FourReadings,
  TypeJournee,
} from './types';

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
 * Restitution de la couverture du bilan de calibrage, par TYPES de journées
 * (lot 3). C'est la seule fonction du domaine qui suggère quelque chose —
 * l'arbitrage du 2026-07-28 revient sur « affichage d'abord, aucun moteur »
 * (A7-11 amendé) pour ce point précis.
 *
 * Trois règles de rédaction, tenues ici et pas ailleurs :
 * 1. elle SUGGÈRE, elle ne conclut jamais que l'observation suffit — le
 *    verdict de suffisance retiré au lot 1 ne revient pas par cette porte ;
 * 2. elle dit ce qu'une journée APPORTERAIT, jamais ce qui ferait défaut :
 *    « manque » est un terme interdit (`TERMES_INTERDITS_SILENCE`) et
 *    `assertNeutre` lèverait ;
 * 3. aucun compte n'est comparé à un seuil affiché, aucun pourcentage.
 */
export function describeCouvertureJournees(couverture: CouvertureJournees): string {
  const journees = couverture.compte > 1 ? 'journées' : 'journée';
  const base = `${couverture.compte} ${journees} décrite${couverture.compte > 1 ? 's' : ''}`;

  // Une fois le profil possible, la suggestion se tait : la répéter
  // reviendrait à réclamer indéfiniment une journée que le patient ne vit
  // peut-être pas — un patient sans emploi n'aura jamais de journée de poste.
  const prochain = couverture.profilPossible ? undefined : couverture.typesAbsents[0];
  if (prochain === undefined) return assertNeutre(base);

  return assertNeutre(`${base}. ${SUGGESTIONS_TYPE_ABSENT[prochain]}`);
}

/**
 * Une phrase par type absent, à l'indicatif d'aide. Formulations reprises de
 * l'audit du 2026-07-26, qui les avait écrites ainsi précisément parce
 * qu'elles nomment un apport et non un défaut.
 */
const SUGGESTIONS_TYPE_ABSENT: Record<TypeJournee, string> = {
  travail_matin: 'Une journée de poste du matin aiderait à comprendre ce qui change.',
  travail_apres_midi: 'Une journée de poste d’après-midi aiderait à comprendre ce qui change.',
  repos: 'Une journée sans travail aiderait à comprendre ce qui change.',
  week_end: 'Une journée de week-end aiderait à comprendre ce qui change.',
};

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
