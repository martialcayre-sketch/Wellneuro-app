'use client';

import { useEffect, useRef, useState } from 'react';
import type { AssignationInfo } from '@/app/api/patient/questionnaire/route';
import type { PatientSubmitResponse } from '@/app/api/patient/submit/route';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { clearDraft, readDraft, writeDraft } from '@/lib/questionnaire-draft';
import { QuestionField } from './QuestionField';

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
  const [brouillonMessage, setBrouillonMessage] = useState('');
  const premierRendu = useRef(true);

  // Autosave local à chaque changement de réponse (sauf premier rendu).
  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return; }
    writeDraft(assignation.idAssignation, answers);
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
    else {
      if (!window.confirm('Transmettre vos réponses à votre praticien ? Après transmission, elles seront verrouillées.')) return;
      handleSubmit();
    }
  };

  const handleSauvegarder = () => {
    writeDraft(assignation.idAssignation, answers);
    setBrouillonMessage('Brouillon enregistré sur cet appareil. Il ne sera transmis au praticien qu’après validation.');
  };

  const handleReinitialiser = () => {
    if (!window.confirm('Cette action effacera les réponses non transmises de ce questionnaire. Elle ne supprimera aucune réponse déjà envoyée à votre praticien.')) return;
    clearDraft(assignation.idAssignation);
    setAnswers({});
    setCurrentSection(0);
    setBrouillonMessage('');
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setError('');
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
      if (!data.ok) { setError(data.error); }
      else { clearDraft(assignation.idAssignation); onDone(); }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!section) return null;

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
        {/* En-tête */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 text-xs text-gray-400">
            <span>Partie {currentSection + 1} / {sections.length}</span>
            <span>{progress}% complété</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full">
            <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mt-4">{questionnaire.titre}</h2>
          {currentSection === 0 && questionnaire.instructions && (
            <p className="text-sm text-gray-500 mt-1">{questionnaire.instructions}</p>
          )}
          {section.titre && <p className="text-sm font-semibold text-primary mt-3">{section.titre}</p>}
          {section.description && <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>}
        </div>

        {assignation.notes && currentSection === 0 && (
          <div className="mb-4 px-4 py-3 bg-primary/10 rounded-lg text-sm text-primary">
            <span className="font-medium">Note de votre praticien : </span>{assignation.notes}
          </div>
        )}

        <form onSubmit={handleNext} className="space-y-6">
          {section.questions.map(q => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id] ?? ''}
              onChange={val => { setAnswers(a => ({ ...a, [q.id]: val })); setBrouillonMessage(''); }}
            />
          ))}

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}
          {brouillonMessage && <p className="text-primary text-sm bg-primary/10 rounded-lg px-4 py-2">{brouillonMessage}</p>}

          <div className="flex gap-3">
            {currentSection > 0 && (
              <button
                type="button"
                onClick={() => { setCurrentSection(s => s - 1); window.scrollTo(0, 0); }}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                ← Précédent
              </button>
            )}
            <button
              type="submit"
              disabled={!sectionAnswered || submitting}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting ? 'Envoi…' : isLast ? 'Transmettre au praticien' : 'Suivant →'}
            </button>
          </div>

          {/* Actions brouillon */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSauvegarder}
              className="flex-1 py-2 px-4 text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
            >
              Sauvegarder le brouillon
            </button>
            <button
              type="button"
              onClick={handleReinitialiser}
              className="flex-1 py-2 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Réinitialiser ce questionnaire
            </button>
          </div>
          <p className="text-xs text-gray-400">Ce brouillon est conservé uniquement sur cet appareil.</p>
        </form>
      </div>
    </div>
  );
}
