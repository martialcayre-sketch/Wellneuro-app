import { proposeAssessmentEpisode, confirmAssessmentEpisode } from '@/lib/clinical-engine/assessmentEpisode';
import { buildClinicalSnapshot } from '@/lib/clinical-engine/clinicalSnapshot';
import { buildClinicalReview } from '@/lib/clinical-engine/clinicalReview';
import { buildDecisionCard } from '@/lib/clinical-engine/decisionCard';
import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import type {
  ClinicalRuleRef,
  DiscordanceFinding,
  MissingDataFinding,
  ProtocolAction,
  QuestionnaireResponseInput,
} from '@/lib/clinical-engine/types';
import { MissingDataPanel } from '@/components/patient-cockpit/MissingDataPanel';
import { DecisionSummaryCard } from '@/components/patient-cockpit/DecisionSummaryCard';
import { ProtocolMiniBuilder } from '@/components/patient-cockpit/ProtocolMiniBuilder';
import { ProtocolConsultationPanel } from '@/components/patient-cockpit/ProtocolConsultationPanel';

// Fixture de démonstration pour la validation ergonomique C1 (gate SP-RUN-00,
// grille : docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/
// GRILLE_VALIDATION_ERGONOMIQUE_C1.md). Données entièrement fictives
// (Sophie Nicola), construites par le moteur C1 pur — aucune lecture ni
// écriture serveur, aucune portée clinique.

const reponseDemo: QuestionnaireResponseInput = {
  responseId: 'reponse-demo-sommeil',
  questionnaireId: 'Q_SOM_06',
  observedAt: '2026-07-01T00:00:00.000Z',
  scoreVersion: 'demo-ergonomie-v1',
  scoresJson: { rawAnswers: { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' } },
};

const regleDemo: ClinicalRuleRef = {
  ruleId: 'RULE_DEMO_ERGONOMIE',
  version: 'demo-v1',
  lifecycle: 'clinically_validated',
  validation: {
    validatedAt: '2026-07-01T00:00:00.000Z',
    validatorRole: 'practitioner',
    sourceReference: 'Démo ergonomique C1 — fixture sans portée clinique',
  },
};

const manqueDemo: MissingDataFinding = {
  findingId: 'manque-demo-alimentation',
  kind: 'missing_data',
  confidence: 'à_documenter',
  priority: 'critical_for_decision',
  uncertaintyExplanation:
    'Le questionnaire alimentaire T0 n’a pas été complété : les habitudes déclarées du soir ne sont pas documentées (donnée fictive de démonstration).',
  potentialDecisionImpact:
    'Sans ce repère, la priorité sommeil ne peut pas être croisée avec le contenu et l’horaire du dîner.',
  provenance: { responseIds: [reponseDemo.responseId], needIds: [], clinicalObjectCodes: [] },
  ruleId: 'RULE_DEMO_ERGONOMIE',
  limitations: [],
};

const discordanceDemo: DiscordanceFinding = {
  findingId: 'discordance-demo-sommeil',
  kind: 'discordance',
  confidence: 'à_documenter',
  audience: 'practitioner_only',
  interpretation: 'point_to_explore',
  signal:
    'Sommeil décrit comme « plutôt réparateur » en entretien, alors que le questionnaire sommeil rapporte des réveils fréquents (données fictives).',
  questionToExplore: 'Les nuits de semaine et de week-end sont-elles comparables ?',
  possibleProtocolImpact: 'Le moment choisi pour les actions du soir pourrait changer.',
  provenance: { responseIds: [reponseDemo.responseId], needIds: [], clinicalObjectCodes: [] },
  ruleId: regleDemo.ruleId,
  limitations: [],
};

const actionsDemo: ProtocolAction[] = [
  {
    actionId: 'action-demo-1',
    type: 'food',
    title: 'Dîner plus léger et plus tôt (démo)',
    idealPlan: 'Dîner terminé avant 20 h, assiette légère, quatre soirs par semaine.',
    minimalPlan: 'Un seul soir cette semaine, au choix.',
    rescuePlan: 'Si dîner tardif inévitable : portion réduite et marche de 10 minutes.',
    limitations: [],
  },
  {
    actionId: 'action-demo-2',
    type: 'calming_routine',
    title: 'Routine d’apaisement avant le coucher (démo)',
    idealPlan: 'Vingt minutes sans écran avec lecture ou respiration, chaque soir.',
    minimalPlan: 'Cinq minutes de respiration au moment du coucher.',
    rescuePlan: 'Reporter au lendemain sans rattrapage.',
    limitations: [],
  },
  {
    actionId: 'action-demo-3',
    type: 'chronobiology',
    title: 'Lever à heure régulière (démo)',
    idealPlan: 'Lever à la même heure sept jours sur sept, lumière du jour dans la première heure.',
    minimalPlan: 'Écart de lever limité à une heure le week-end.',
    rescuePlan: 'Après une mauvaise nuit : lever inchangé, sieste courte avant 15 h si besoin.',
    limitations: [],
  },
];

function construireFixture() {
  const proposition = proposeAssessmentEpisode({
    assessmentEpisodeId: 'episode-demo',
    patientId: 'patient-demo-sophie-nicola',
    milestone: 'T0',
    targetAt: '2026-07-01T00:00:00.000Z',
    responses: [reponseDemo],
  });
  const episode = confirmAssessmentEpisode(proposition, [reponseDemo.responseId], '2026-07-02T00:00:00.000Z');
  const snapshot = buildClinicalSnapshot({
    snapshotId: 'snapshot-demo',
    patientId: 'patient-demo-sophie-nicola',
    asOf: '2026-07-02T00:00:00.000Z',
    assessmentEpisode: episode,
    responses: [reponseDemo],
    patientContext: {
      mainReason: 'Fatigue au réveil malgré des nuits complètes (démo).',
      priorityGoal: 'Retrouver un réveil reposé (démo).',
      expectations: [],
      constraints: [],
    },
  });
  const review = buildClinicalReview({
    reviewId: 'review-demo',
    createdAt: '2026-07-03T00:00:00.000Z',
    snapshot,
    rules: [regleDemo],
    findings: {
      missingData: [manqueDemo],
      discordances: [discordanceDemo],
      abstention: { status: 'not_required', ruleIds: [regleDemo.ruleId], limitations: [] },
    },
  });
  const decisionCard = buildDecisionCard({
    decisionCardId: 'decision-demo',
    createdAt: '2026-07-04T00:00:00.000Z',
    snapshot,
    review,
    candidates: [
      {
        candidateId: 'priorite-demo-sommeil',
        origin: 'engine',
        label: 'Sommeil et récupération (démonstration)',
        rank: 1,
        confidence: 'à_documenter',
        ruleId: regleDemo.ruleId,
        rationale: 'Fixture de démonstration ergonomique, sans portée clinique.',
        provenance: { responseIds: [reponseDemo.responseId], needIds: [], clinicalObjectCodes: [] },
        limitations: [],
      },
    ],
    proposedMainPriorityId: 'priorite-demo-sommeil',
    selectedMainPriority: {
      candidateId: 'priorite-demo-sommeil',
      selectedAt: '2026-07-04T00:00:00.000Z',
      selectedBy: 'practitioner',
      rationale: 'Sélection fictive pour la séance d’ergonomie.',
    },
  });
  const protocolDraft = buildProtocolDraft({
    protocolDraftId: 'protocole-demo',
    decisionCard,
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z',
    purpose: 'Soutenir la récupération nocturne sur 21 jours (protocole fictif de démonstration).',
    followUpCriterion: 'Nombre de réveils nocturnes noté sur 7 jours consécutifs.',
    actions: actionsDemo,
    therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
    review: { reviewedAt: '2026-07-06T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
  });
  return { review, decisionCard, protocolDraft };
}

export default function DemoErgonomieC1Page() {
  const { review, decisionCard, protocolDraft } = construireFixture();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-4 pb-16">
      <header className="rounded-xl border border-border bg-surface p-4">
        <h1 className="text-lg font-semibold text-foreground">Démo ergonomique C1 — données fictives</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Patient fictif : <span className="font-medium text-foreground">Sophie Nicola</span>. Fixture construite par le
          moteur C1 pur — rien n’est lu ni enregistré, rien n’est transmis. Support de la grille de validation
          ergonomique (gate SP-RUN-00) : ne rien expliquer au praticien avant le départ du chronomètre.
        </p>
      </header>

      <section aria-labelledby="epreuve-1-titre" className="flex flex-col gap-4">
        <h2 id="epreuve-1-titre" className="text-base font-semibold text-foreground">
          Épreuve 1 — Comprendre la décision (moins de 2 minutes)
        </h2>
        <MissingDataPanel missingData={review.missingData} discordances={review.discordances} />
        <DecisionSummaryCard decisionCard={decisionCard} />
        <ProtocolConsultationPanel decisionCard={decisionCard} protocolDraft={protocolDraft} />
      </section>

      <section aria-labelledby="epreuve-2-titre" className="flex flex-col gap-4">
        <h2 id="epreuve-2-titre" className="text-base font-semibold text-foreground">
          Épreuve 2 — Préparer le protocole (moins de 10 minutes)
        </h2>
        <p className="text-sm text-muted-foreground">
          Saisir trois actions fictives complètes (plans idéal, minimal et de secours), choisir la charge, renseigner le
          critère J21, marquer le brouillon comme relu. Brouillon local : rien n’est enregistré.
        </p>
        <ProtocolMiniBuilder decisionCard={decisionCard} />
      </section>
    </div>
  );
}
