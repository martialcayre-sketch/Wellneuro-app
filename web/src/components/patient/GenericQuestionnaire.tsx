'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssignationInfo } from '@/app/api/patient/questionnaire/route';
import type { PatientSubmitResponse } from '@/app/api/patient/submit/route';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { getEnabledRenderer, getMicroBatches } from '@/lib/questionnaire-display';
import {
  clearDraft,
  readDraftSavedAt,
  readQuestionnaireDraft,
  resolveResumePage,
  writeQuestionnaireDraft,
} from '@/lib/questionnaire-draft';
import { QuestionField } from './QuestionField';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { SaveStatusIndicator, type SaveError } from '@/components/patient/SaveStatusIndicator';
import { PatientConfirmDialog } from '@/components/patient/PatientConfirmDialog';

// Questionnaire générique piloté par le catalogue, section par section.
// Composant présentationnel : la navigation (retour hub / succès) est confiée
// à onDone par la page appelante.
export function GenericQuestionnaire({ assignation, questionnaire, email, onDone }: {
  assignation: AssignationInfo;
  questionnaire: QuestionnaireDef;
  email: string;
  onDone: () => void;
}) {
  const sections = questionnaire.sections ?? [];
  const renderer = getEnabledRenderer(questionnaire.id);
  const microBatches = getMicroBatches(questionnaire.id);
  const allQuestions = useMemo(
    () => sections.flatMap(questionnaireSection => questionnaireSection.questions),
    [sections],
  );
  const questionsById = useMemo(
    () => new Map(allQuestions.map(question => [question.id, question])),
    [allQuestions],
  );
  const isMicroBatch = renderer === 'micro_batch' && microBatches.length > 0;
  const pageQuestions = useMemo(() => (
    isMicroBatch
      ? microBatches.map(ids => ids.map(id => questionsById.get(id)).filter((question): question is NonNullable<typeof question> => Boolean(question)))
      : sections.map(questionnaireSection => questionnaireSection.questions)
  ), [isMicroBatch, microBatches, questionsById, sections]);
  const requiredQuestionIdsByPage = useMemo(
    () => pageQuestions.map(questions => questions.filter(question => !question.conditionnel).map(question => question.id)),
    [pageQuestions],
  );
  const [initialDraft] = useState(() => readQuestionnaireDraft(assignation.idAssignation));
  const [currentSection, setCurrentSection] = useState(() => resolveResumePage(
    initialDraft?.currentPage ?? 0,
    initialDraft?.answers ?? {},
    requiredQuestionIdsByPage,
  ));
  const [answers, setAnswers] = useState<Record<string, string>>(() => initialDraft?.answers ?? {});
  const [view, setView] = useState<'form' | 'summary'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(() => readDraftSavedAt(assignation.idAssignation));
  const [saveError, setSaveError] = useState<SaveError | undefined>(undefined);
  const [confirmDialog, setConfirmDialog] = useState<'reset' | 'submit' | null>(null);
  const premierRendu = useRef(true);
  const ignorerProchaineSauvegarde = useRef(false);
  const batchTitleRef = useRef<HTMLHeadingElement>(null);
  const summaryTitleRef = useRef<HTMLHeadingElement>(null);
  const previousPage = useRef(0);

  // Autosave local des réponses et de la position (sauf premier rendu).
  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return; }
    if (ignorerProchaineSauvegarde.current) {
      ignorerProchaineSauvegarde.current = false;
      return;
    }
    writeQuestionnaireDraft(assignation.idAssignation, { version: 1, answers, currentPage: currentSection });
    setSavedAt(readDraftSavedAt(assignation.idAssignation));
  }, [answers, currentSection, assignation.idAssignation]);

  useEffect(() => {
    if (isMicroBatch && previousPage.current !== currentSection) {
      batchTitleRef.current?.focus();
    }
    previousPage.current = currentSection;
  }, [currentSection, isMicroBatch]);

  useEffect(() => {
    if (view === 'summary') summaryTitleRef.current?.focus();
  }, [view]);

  const section = isMicroBatch ? sections[0] : sections[currentSection];
  const activeQuestions = pageQuestions[currentSection] ?? [];
  const pageCount = pageQuestions.length;
  const answeredCount = allQuestions.filter(question => answers[question.id] !== undefined && answers[question.id] !== '').length;
  const progress = isMicroBatch
    ? Math.round((answeredCount / allQuestions.length) * 100)
    : Math.round(((currentSection) / sections.length) * 100);
  const isLast = currentSection === pageCount - 1;

  const sectionAnswered = activeQuestions.every(q => {
    if (q.conditionnel) return true; // questions conditionnelles = optionnelles
    return answers[q.id] !== undefined && answers[q.id] !== '';
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionAnswered) return;
    if (!isLast) { setCurrentSection(s => s + 1); window.scrollTo(0, 0); }
    else { setView('summary'); window.scrollTo(0, 0); }
  };

  const handleSauvegarder = () => {
    writeQuestionnaireDraft(assignation.idAssignation, { version: 1, answers, currentPage: currentSection });
    setSavedAt(readDraftSavedAt(assignation.idAssignation));
  };

  const confirmerReinitialiser = () => {
    clearDraft(assignation.idAssignation);
    ignorerProchaineSauvegarde.current = true;
    setAnswers({});
    setCurrentSection(0);
    setView('form');
    setSavedAt(null);
    setSaveError(undefined);
    window.scrollTo(0, 0);
  };

  const pageEstComplete = (pageIndex: number) => requiredQuestionIdsByPage[pageIndex]?.every(
    id => answers[id] !== undefined && answers[id] !== '',
  ) ?? false;
  const questionnaireComplet = requiredQuestionIdsByPage.every((_, pageIndex) => pageEstComplete(pageIndex));

  const pageLabel = (pageIndex: number) => {
    if (!isMicroBatch) return sections[pageIndex]?.titre || `Partie ${pageIndex + 1}`;
    const questions = pageQuestions[pageIndex] ?? [];
    const debut = allQuestions.indexOf(questions[0]) + 1;
    const fin = allQuestions.indexOf(questions[questions.length - 1]) + 1;
    return debut === fin ? `Question ${debut}` : `Questions ${debut} à ${fin}`;
  };

  const confirmerTransmission = async () => {
    setError('');
    setSaveError(undefined);
    setSubmitting(true);
    try {
      const numericAnswers: Record<string, number> = {};
      for (const [k, v] of Object.entries(answers)) {
        const n = parseFloat(v);
        if (!isNaN(n)) numericAnswers[k] = n;
      }
      const res = await fetch('/api/patient/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idAssignation: assignation.idAssignation,
          idPatient: assignation.idPatient,
          email,
          idQuestionnaire: assignation.idQuestionnaire,
          answers: numericAnswers,
        }),
      });
      const data = (await res.json()) as PatientSubmitResponse;
      if (!data.ok) { setError(data.error); setSaveError('submission-incomplete'); }
      else { clearDraft(assignation.idAssignation); onDone(); }
    } catch {
      setError('Erreur réseau. Réessayez.');
      setSaveError('network');
    } finally {
      setSubmitting(false);
    }
  };

  if (!section || activeQuestions.length === 0) return null;

  if (view === 'summary') {
    return (
      <PatientCard className="space-y-6">
        <div>
          <p className="text-xs text-muted-foreground/70">Résumé avant transmission</p>
          <h2
            ref={summaryTitleRef}
            tabIndex={-1}
            className="text-lg font-bold text-foreground mt-1 outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Vérifiez votre questionnaire
          </h2>
          <p className="text-sm text-muted-foreground mt-2" role="status">
            {answeredCount} réponses sur {allQuestions.length}.{' '}
            {questionnaireComplet ? 'Toutes les parties sont complètes.' : 'Certaines parties restent à compléter.'}
          </p>
        </div>

        <ol className="space-y-3" aria-label="Parties du questionnaire">
          {pageQuestions.map((_, pageIndex) => (
            <li key={pageIndex} className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">{pageLabel(pageIndex)}</p>
                <p className="text-sm text-muted-foreground">
                  {pageEstComplete(pageIndex) ? 'Complète' : 'À compléter'}
                </p>
              </div>
              <PatientButton
                variant="neutral"
                onClick={() => {
                  setCurrentSection(pageIndex);
                  setView('form');
                  window.scrollTo(0, 0);
                }}
                aria-label={`Vérifier cette partie : ${pageLabel(pageIndex)}`}
              >
                Vérifier cette partie
              </PatientButton>
            </li>
          ))}
        </ol>

        {error && <PatientInlineMessage tone="error">{error}</PatientInlineMessage>}
        <SaveStatusIndicator savedAt={savedAt} error={saveError} />

        <div className="flex flex-col gap-3 sm:flex-row">
          <PatientButton
            variant="neutral"
            className="flex-1"
            onClick={() => { setCurrentSection(pageCount - 1); setView('form'); window.scrollTo(0, 0); }}
          >
            Revenir au questionnaire
          </PatientButton>
          <PatientButton
            variant="primary"
            className="flex-1"
            disabled={!questionnaireComplet}
            loading={submitting}
            loadingLabel="Envoi…"
            onClick={() => setConfirmDialog('submit')}
          >
            Transmettre au praticien
          </PatientButton>
        </div>

        <PatientConfirmDialog
          open={confirmDialog === 'submit'}
          onOpenChange={open => setConfirmDialog(open ? 'submit' : null)}
          message="Transmettre vos réponses à votre praticien ? Après transmission, elles seront verrouillées."
          confirmLabel="Transmettre"
          onConfirm={confirmerTransmission}
        />
      </PatientCard>
    );
  }

  return (
    <PatientCard as="form" onSubmit={handleNext} className="space-y-6">
      {/* En-tête */}
      <div>
        <div className="flex justify-between items-center mb-2 text-xs text-muted-foreground/70">
          <span>Partie {currentSection + 1} / {pageCount}</span>
          <span aria-live={isMicroBatch ? 'polite' : undefined}>
            {isMicroBatch ? `${answeredCount} réponses sur ${allQuestions.length}` : `${progress}% complété`}
          </span>
        </div>
        <div
          className="w-full h-1.5 bg-muted rounded-full"
          role="progressbar"
          aria-label="Progression du questionnaire"
          aria-valuemin={0}
          aria-valuemax={isMicroBatch ? allQuestions.length : 100}
          aria-valuenow={isMicroBatch ? answeredCount : progress}
          aria-valuetext={isMicroBatch ? `${answeredCount} réponses sur ${allQuestions.length}` : `${progress} % complété`}
        >
          <div className="h-1.5 bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <h2 className="text-lg font-bold text-foreground mt-4">{questionnaire.titre}</h2>
        {currentSection === 0 && questionnaire.instructions && (
          <p className="text-sm text-muted-foreground mt-1">{questionnaire.instructions}</p>
        )}
        {section.titre && <p className="text-sm font-semibold text-primary mt-3">{section.titre}</p>}
        {section.description && <p className="text-xs text-muted-foreground/70 mt-0.5">{section.description}</p>}
        {isMicroBatch && (
          <h3
            ref={batchTitleRef}
            tabIndex={-1}
            className="mt-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Questions {allQuestions.indexOf(activeQuestions[0]) + 1}
            {activeQuestions.length > 1 && ` à ${allQuestions.indexOf(activeQuestions[activeQuestions.length - 1]) + 1}`}
            {' '}sur {allQuestions.length}
          </h3>
        )}
      </div>

      {assignation.notes && currentSection === 0 && (
        <div className="px-4 py-3 bg-primary/10 rounded-lg text-sm text-primary">
          <span className="font-medium">Note de votre praticien : </span>{assignation.notes}
        </div>
      )}

      {activeQuestions.map(q => (
        <QuestionField
          key={q.id}
          question={q}
          value={answers[q.id] ?? ''}
          onChange={val => setAnswers(a => ({ ...a, [q.id]: val }))}
          displaySelectAsRadioCards={isMicroBatch}
        />
      ))}

      {isMicroBatch && !sectionAnswered && (
        <p className="text-xs text-muted-foreground" role="status">
          Répondez à toutes les questions de cette partie pour continuer.
        </p>
      )}

      {error && <PatientInlineMessage tone="error">{error}</PatientInlineMessage>}
      <SaveStatusIndicator savedAt={savedAt} error={saveError} />

      <div className="flex gap-3">
        {currentSection > 0 && (
          <PatientButton
            variant="neutral"
            className="flex-1"
            onClick={() => { setCurrentSection(s => s - 1); window.scrollTo(0, 0); }}
          >
            ← Précédent
          </PatientButton>
        )}
        <PatientButton
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={!sectionAnswered}
          loading={submitting}
          loadingLabel="Envoi…"
        >
          {isLast ? 'Voir le résumé' : 'Suivant →'}
        </PatientButton>
      </div>

      {/* Actions brouillon */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
        <PatientButton variant="ghost" onClick={handleSauvegarder} className="flex-1">
          Sauvegarder le brouillon
        </PatientButton>
        <PatientButton variant="neutral" onClick={() => setConfirmDialog('reset')} className="flex-1">
          Réinitialiser ce questionnaire
        </PatientButton>
      </div>
      <p className="text-xs text-muted-foreground/70">Ce brouillon est conservé uniquement sur cet appareil.</p>

      <PatientConfirmDialog
        open={confirmDialog === 'reset'}
        onOpenChange={open => setConfirmDialog(open ? 'reset' : null)}
        message="Cette action effacera les réponses non transmises de ce questionnaire. Elle ne supprimera aucune réponse déjà envoyée à votre praticien."
        confirmLabel="Réinitialiser"
        onConfirm={confirmerReinitialiser}
      />
      <PatientConfirmDialog
        open={confirmDialog === 'submit'}
        onOpenChange={open => setConfirmDialog(open ? 'submit' : null)}
        message="Transmettre vos réponses à votre praticien ? Après transmission, elles seront verrouillées."
        confirmLabel="Transmettre"
        onConfirm={confirmerTransmission}
      />
    </PatientCard>
  );
}
