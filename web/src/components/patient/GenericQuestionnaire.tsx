'use client';

import { useEffect, useRef, useState } from 'react';
import type { AssignationInfo } from '@/app/api/patient/questionnaire/route';
import type { PatientSubmitResponse } from '@/app/api/patient/submit/route';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { clearDraft, readDraft, readDraftSavedAt, writeDraft } from '@/lib/questionnaire-draft';
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
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => readDraft(assignation.idAssignation) ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(() => readDraftSavedAt(assignation.idAssignation));
  const [saveError, setSaveError] = useState<SaveError | undefined>(undefined);
  const [confirmDialog, setConfirmDialog] = useState<'reset' | 'submit' | null>(null);
  const premierRendu = useRef(true);

  // Autosave local à chaque changement de réponse (sauf premier rendu).
  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return; }
    writeDraft(assignation.idAssignation, answers);
    setSavedAt(readDraftSavedAt(assignation.idAssignation));
  }, [answers, assignation.idAssignation]);

  const section = sections[currentSection];
  const progress = Math.round(((currentSection) / sections.length) * 100);
  const isLast = currentSection === sections.length - 1;

  const sectionAnswered = section?.questions.every(q => {
    if (q.conditionnel) return true; // questions conditionnelles = optionnelles
    return answers[q.id] !== undefined && answers[q.id] !== '';
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLast) { setCurrentSection(s => s + 1); window.scrollTo(0, 0); }
    else { setConfirmDialog('submit'); }
  };

  const handleSauvegarder = () => {
    writeDraft(assignation.idAssignation, answers);
    setSavedAt(readDraftSavedAt(assignation.idAssignation));
  };

  const confirmerReinitialiser = () => {
    clearDraft(assignation.idAssignation);
    setAnswers({});
    setCurrentSection(0);
    setSavedAt(null);
    setSaveError(undefined);
    window.scrollTo(0, 0);
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

  if (!section) return null;

  return (
    <PatientCard as="form" onSubmit={handleNext} className="space-y-6">
      {/* En-tête */}
      <div>
        <div className="flex justify-between items-center mb-2 text-xs text-muted-foreground/70">
          <span>Partie {currentSection + 1} / {sections.length}</span>
          <span>{progress}% complété</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full">
          <div className="h-1.5 bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <h2 className="text-lg font-bold text-foreground mt-4">{questionnaire.titre}</h2>
        {currentSection === 0 && questionnaire.instructions && (
          <p className="text-sm text-muted-foreground mt-1">{questionnaire.instructions}</p>
        )}
        {section.titre && <p className="text-sm font-semibold text-primary mt-3">{section.titre}</p>}
        {section.description && <p className="text-xs text-muted-foreground/70 mt-0.5">{section.description}</p>}
      </div>

      {assignation.notes && currentSection === 0 && (
        <div className="px-4 py-3 bg-primary/10 rounded-lg text-sm text-primary">
          <span className="font-medium">Note de votre praticien : </span>{assignation.notes}
        </div>
      )}

      {section.questions.map(q => (
        <QuestionField
          key={q.id}
          question={q}
          value={answers[q.id] ?? ''}
          onChange={val => setAnswers(a => ({ ...a, [q.id]: val }))}
        />
      ))}

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
          {isLast ? 'Transmettre au praticien' : 'Suivant →'}
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
