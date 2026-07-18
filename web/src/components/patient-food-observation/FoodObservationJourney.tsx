'use client';

import { useState } from 'react';
import {
  FRICTIONS,
  FRICTION_AVEC_MOT_LIBRE,
  LABELS_ISSUE_TRACE,
  LABEL_INSTRUMENT_PATIENT,
  LABEL_PAUSE_PATIENT,
  LONGUEUR_MAX_MOT_LIBRE,
  MESSAGE_SILENCE_UTILE,
  createTrialTrace,
  declarePatientPause,
} from '@/lib/food-observation';
import type {
  DailyQuestion,
  FoodObservationEpisode,
  FrictionCode,
  IntraEpisodeSolution,
  MinimalPlanEvent,
  PatientPauseEvent,
  TraceIssue,
  TrialTrace,
} from '@/lib/food-observation';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientField, patientInputClassName } from '@/components/patient/ui/PatientField';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';

export type FoodObservationJourneyMode = 'patient' | 'papier';

export type FoodObservationJourneyProps = {
  episode: FoodObservationEpisode;
  question: DailyQuestion;
  mode?: FoodObservationJourneyMode;
  onQuestionAnswered?: (question: DailyQuestion) => void;
  onTraceRecorded?: (trace: TrialTrace) => void;
  onPauseDeclared?: (pause: PatientPauseEvent) => void;
  onMinimalPlanActivated?: (event: MinimalPlanEvent) => void;
  onSolutionRecorded?: (solution: IntraEpisodeSolution) => void;
};

const TRACE_ISSUES = Object.entries(LABELS_ISSUE_TRACE) as Array<[TraceIssue, string]>;
const FRICTION_ENTRIES = Object.entries(FRICTIONS) as Array<[FrictionCode, string]>;
const SHORT_ANSWER_MAX_LENGTH = 80;

type BooleanChoice = '' | 'oui' | 'non';

function nextLocalId(prefix: string, count: number): string {
  return `ja5-02-${prefix}-${count + 1}`;
}

function ChoiceFieldset({
  legend,
  name,
  value,
  choices,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  choices: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-muted-foreground">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map(choice => (
          <label
            key={choice.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary"
          >
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              className="accent-primary"
            />
            {choice.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FoodObservationJourney({
  episode,
  question,
  mode = 'patient',
  onQuestionAnswered,
  onTraceRecorded,
  onPauseDeclared,
  onMinimalPlanActivated,
  onSolutionRecorded,
}: FoodObservationJourneyProps) {
  const [answer, setAnswer] = useState('');
  const [occasion, setOccasion] = useState<BooleanChoice>('');
  const [faisable, setFaisable] = useState<BooleanChoice>('');
  const [issue, setIssue] = useState<TraceIssue | ''>('');
  const [frictionCode, setFrictionCode] = useState<FrictionCode | ''>('');
  const [motLibre, setMotLibre] = useState('');
  const [solutionLabel, setSolutionLabel] = useState('');
  const [solutionContext, setSolutionContext] = useState('');
  const [traces, setTraces] = useState<TrialTrace[]>([]);
  const [pauses, setPauses] = useState<PatientPauseEvent[]>([]);
  const [minimalPlans, setMinimalPlans] = useState<MinimalPlanEvent[]>([]);
  const [solutions, setSolutions] = useState<IntraEpisodeSolution[]>([]);
  const [confirmation, setConfirmation] = useState('');

  if (episode.content.regime === 'silence') {
    return (
      <PatientCard maxWidth="2xl" className="space-y-3 text-center">
        <h2 className="text-xl font-semibold">{LABEL_INSTRUMENT_PATIENT}</h2>
        <PatientInlineMessage tone="info">{MESSAGE_SILENCE_UTILE}</PatientInlineMessage>
      </PatientCard>
    );
  }

  if (episode.content.regime !== 'essai') {
    return null;
  }

  const paperMode = mode === 'papier';
  const action = episode.content.action;

  const confirm = (message: string) => {
    setConfirmation(`${message} Cette confirmation est locale et sera perdue au rechargement.`);
  };

  const handleOccasionChange = (value: string) => {
    const next = value as BooleanChoice;
    setOccasion(next);
    if (next === 'non') setFaisable('');
  };

  const handleIssueChange = (value: string) => {
    const next = value as TraceIssue;
    setIssue(next);
    if (next !== 'partiel_empeche') {
      setFrictionCode('');
      setMotLibre('');
    }
  };

  const handleFrictionChange = (value: string) => {
    const next = value as FrictionCode;
    setFrictionCode(next);
    if (next !== FRICTION_AVEC_MOT_LIBRE) setMotLibre('');
  };

  const submitQuestion = (event: React.FormEvent) => {
    event.preventDefault();
    const answeredQuestion: DailyQuestion = {
      ...question,
      reponsePatient: answer.trim() || undefined,
    };
    onQuestionAnswered?.(answeredQuestion);
    confirm(answer.trim() ? 'Réponse du jour notée.' : 'Question du jour laissée sans réponse.');
  };

  const submitTrace = (event: React.FormEvent) => {
    event.preventDefault();
    if (!occasion || !issue || (occasion === 'oui' && !faisable)) return;
    if (issue === 'partiel_empeche' && !frictionCode) return;

    const trace = createTrialTrace({
      traceId: nextLocalId('trace', traces.length),
      episodeId: episode.episodeId,
      localDate: question.localDate,
      occasionPresentee: occasion === 'oui',
      faisable: occasion === 'oui' ? faisable === 'oui' : null,
      issue,
      frictionCode: frictionCode || undefined,
      motLibre: motLibre || undefined,
    });
    setTraces(previous => [...previous, trace]);
    onTraceRecorded?.(trace);
    confirm(paperMode ? 'Trace de la carte papier saisie.' : 'Votre trace est notée.');
    setOccasion('');
    setFaisable('');
    setIssue('');
    setFrictionCode('');
    setMotLibre('');
  };

  const declarePause = () => {
    const pause = declarePatientPause({
      eventId: nextLocalId('pause', pauses.length),
      episodeId: episode.episodeId,
      semaineDu: episode.startDate,
    });
    setPauses(previous => [...previous, pause]);
    onPauseDeclared?.(pause);
    confirm(paperMode ? 'Pause de la carte papier saisie.' : 'Votre semaine sans possibilité est notée.');
  };

  const activateMinimalPlan = (duration: 1 | 3 | 7) => {
    const minimalPlan: MinimalPlanEvent = {
      eventId: nextLocalId('plan-minimal', minimalPlans.length),
      episodeId: episode.episodeId,
      from: question.localDate,
      dureeJours: duration,
      activatedBy: paperMode ? 'praticien' : 'patient',
      rationaleRequired: false,
    };
    setMinimalPlans(previous => [...previous, minimalPlan]);
    onMinimalPlanActivated?.(minimalPlan);
    confirm(`Plan minimal activé pour ${duration} jour${duration > 1 ? 's' : ''}.`);
  };

  const submitSolution = (event: React.FormEvent) => {
    event.preventDefault();
    if (!solutionLabel.trim() || !solutionContext.trim()) return;
    const solution: IntraEpisodeSolution = {
      solutionId: nextLocalId('solution', solutions.length),
      episodeId: episode.episodeId,
      labelPatient: solutionLabel.trim(),
      contexte: solutionContext.trim(),
    };
    setSolutions(previous => [...previous, solution]);
    onSolutionRecorded?.(solution);
    confirm('Votre solution pour cet essai est notée comme repère local.');
    setSolutionLabel('');
    setSolutionContext('');
  };

  const traceReady = Boolean(
    occasion
    && issue
    && (occasion === 'non' || faisable)
    && (issue !== 'partiel_empeche' || frictionCode),
  );

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <PatientCard className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {paperMode ? 'Saisie praticien — carte papier' : 'Essai en cours'}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{LABEL_INSTRUMENT_PATIENT}</h2>
          {paperMode && (
            <p className="mt-2 text-sm text-muted-foreground">
              Les champs et libellés sont identiques à ceux du parcours patient. Objectif de saisie : moins de 30 secondes.
            </p>
          )}
        </div>
        <dl className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action essayée</dt>
            <dd className="mt-1 text-sm font-medium">{action.labelPatient}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan simple</dt>
            <dd className="mt-1 text-sm">{action.simplePlan}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">
          Quelques repères suffisent. Une absence de trace n’est jamais interprétée comme un échec.
        </p>
      </PatientCard>

      {confirmation && (
        <div className="w-full max-w-2xl" aria-live="polite">
          <PatientInlineMessage tone="success">{confirmation}</PatientInlineMessage>
        </div>
      )}

      <PatientCard as="form" onSubmit={submitQuestion} className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Question du jour</p>
          <h3 className="mt-1 text-lg font-semibold">{question.questionPraticien}</h3>
        </div>
        <PatientField label="Votre réponse" suffixe="facultative">
          <input
            value={answer}
            onChange={event => setAnswer(event.target.value)}
            maxLength={SHORT_ANSWER_MAX_LENGTH}
            className={patientInputClassName}
            aria-label="Votre réponse"
            aria-describedby="daily-answer-help"
          />
        </PatientField>
        <p id="daily-answer-help" className="text-xs text-muted-foreground">
          Réponse courte, {SHORT_ANSWER_MAX_LENGTH} caractères maximum. Vous pouvez continuer sans répondre.
        </p>
        <PatientButton type="submit" variant="ghost">Noter et continuer</PatientButton>
      </PatientCard>

      <PatientCard as="form" onSubmit={submitTrace} className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Une trace rapide</p>
          <h3 className="mt-1 text-lg font-semibold">Ce qui s’est passé aujourd’hui</h3>
        </div>

        <ChoiceFieldset
          legend="L'occasion s'est-elle présentée ?"
          name={`${mode}-occasion`}
          value={occasion}
          choices={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
          onChange={handleOccasionChange}
        />

        {occasion === 'oui' && (
          <ChoiceFieldset
            legend="C'était faisable ?"
            name={`${mode}-faisable`}
            value={faisable}
            choices={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
            onChange={value => setFaisable(value as BooleanChoice)}
          />
        )}

        {occasion && (
          <ChoiceFieldset
            legend="Qu'est-ce qui a compté ?"
            name={`${mode}-issue`}
            value={issue}
            choices={TRACE_ISSUES.map(([value, label]) => ({ value, label }))}
            onChange={handleIssueChange}
          />
        )}

        {issue === 'partiel_empeche' && (
          <>
            <PatientField label="Qu'est-ce qui a surtout compté ?" requis>
              <select
                value={frictionCode}
                onChange={event => handleFrictionChange(event.target.value)}
                className={patientInputClassName}
                aria-label="Qu'est-ce qui a surtout compté ?"
              >
                <option value="">Choisir une réponse</option>
                {FRICTION_ENTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </PatientField>
            {frictionCode === FRICTION_AVEC_MOT_LIBRE && (
              <PatientField label="Un mot si vous le souhaitez" suffixe={`${LONGUEUR_MAX_MOT_LIBRE} caractères maximum`}>
                <input
                  value={motLibre}
                  onChange={event => setMotLibre(event.target.value)}
                  maxLength={LONGUEUR_MAX_MOT_LIBRE}
                  className={patientInputClassName}
                  aria-label="Un mot si vous le souhaitez"
                />
              </PatientField>
            )}
          </>
        )}

        <PatientButton type="submit" disabled={!traceReady} className="w-full sm:w-auto">
          {paperMode ? 'Saisir la trace papier' : 'Noter cette trace'}
        </PatientButton>
      </PatientCard>

      <PatientCard className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Cette semaine n’a pas permis l’essai ?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cette déclaration volontaire reste distincte d’une simple absence de trace.
          </p>
        </div>
        <PatientButton variant="neutral" onClick={declarePause}>{LABEL_PAUSE_PATIENT}</PatientButton>
      </PatientCard>

      <PatientCard className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Activer le plan minimal</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez librement une durée. Aucune justification n’est demandée.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Durée du plan minimal">
          {([1, 3, 7] as const).map(duration => (
            <PatientButton key={duration} variant="ghost" onClick={() => activateMinimalPlan(duration)}>
              {duration} jour{duration > 1 ? 's' : ''}
            </PatientButton>
          ))}
        </div>
      </PatientCard>

      <PatientCard as="form" onSubmit={submitSolution} className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Une solution qui fonctionne pour moi</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Facultatif. Ce repère reste lié à cet essai et ne devient jamais automatiquement une recommandation.
          </p>
        </div>
        <PatientField label="Ma solution" suffixe="facultative">
          <input aria-label="Ma solution" value={solutionLabel} onChange={event => setSolutionLabel(event.target.value)} className={patientInputClassName} />
        </PatientField>
        <PatientField label="Dans quel contexte ?" suffixe="facultatif">
          <input aria-label="Dans quel contexte ?" value={solutionContext} onChange={event => setSolutionContext(event.target.value)} className={patientInputClassName} />
        </PatientField>
        <PatientButton type="submit" variant="ghost" disabled={!solutionLabel.trim() || !solutionContext.trim()}>
          Garder ce repère pour l’essai
        </PatientButton>
      </PatientCard>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        État local : {traces.length} trace{traces.length > 1 ? 's' : ''}, {pauses.length} pause{pauses.length > 1 ? 's' : ''}, {' '}
        {minimalPlans.length} plan{minimalPlans.length > 1 ? 's' : ''} minimal(aux), {solutions.length} solution{solutions.length > 1 ? 's' : ''}.
      </p>
    </div>
  );
}
