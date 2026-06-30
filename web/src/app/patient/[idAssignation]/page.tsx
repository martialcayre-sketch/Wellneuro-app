'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { PatientQuestionnaireResponse } from '@/app/api/patient/questionnaire/route';
import type { PatientSubmitResponse } from '@/app/api/patient/submit/route';

// ─── types catalogue ────────────────────────────────────────────────────────
type QuestionOption = { v: number; l: string };
type Question = {
  id: string;
  texte: string;
  type: 'likert' | 'number' | 'select';
  options?: QuestionOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  conditionnel?: string;
};
type Section = { id: string; titre?: string; description?: string; questions: Question[] };
type QuestionnaireDef = {
  id: string;
  titre: string;
  instructions?: string;
  sections: Section[];
};

// ─── plaintes spécial ───────────────────────────────────────────────────────
const PLAINTES = [
  { key: 'fatigue',   label: 'Fatigue', icon: '😴' },
  { key: 'douleurs',  label: 'Douleurs', icon: '💢' },
  { key: 'digestion', label: 'Digestion', icon: '🫃' },
  { key: 'surpoids',  label: 'Surpoids / morphologie', icon: '⚖️' },
  { key: 'insomnie',  label: 'Insomnie / sommeil', icon: '🌙' },
  { key: 'moral',     label: 'Moral / anxiété', icon: '😟' },
  { key: 'mobilite',  label: 'Mobilité / douleurs musculaires', icon: '🦵' },
];

// ─── étape 1 : email gate ───────────────────────────────────────────────────
function EmailGate({ onVerified }: { onVerified: (email: string, data: Extract<PatientQuestionnaireResponse, { ok: true }>) => void }) {
  const { idAssignation } = useParams<{ idAssignation: string }>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/patient/questionnaire?id=${encodeURIComponent(idAssignation)}&email=${encodeURIComponent(email.trim().toLowerCase())}`);
      const data = (await res.json()) as PatientQuestionnaireResponse;
      if (!data.ok) {
        setError(data.error);
      } else {
        onVerified(email.trim().toLowerCase(), data);
      }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, [idAssignation, email, onVerified]);

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Questionnaire Wellneuro</h1>
          <p className="text-gray-500 text-sm mt-2">Confirmez votre adresse email pour accéder à votre questionnaire.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="votre@email.fr"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Vérification…' : 'Accéder au questionnaire'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Q_PLAINTES renderer ────────────────────────────────────────────────────
function PlaintesForm({ assignation, email, onDone }: {
  assignation: Extract<PatientQuestionnaireResponse, { ok: true }>['assignation'];
  email: string;
  onDone: () => void;
}) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(PLAINTES.map(p => [p.key, 5]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const total = PLAINTES.reduce((s, p) => s + values[p.key], 0);
      const interpretation =
        total >= 56 ? 'Faible charge' :
        total >= 35 ? 'Charge modérée' : 'Charge élevée';
      const scores = {
        total,
        interpretation: { label: interpretation },
        subScores: PLAINTES.map(p => ({ label: p.label, total: values[p.key] })),
      };

      const res = await fetch('/api/patient/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idAssignation: assignation.idAssignation,
          idPatient: assignation.idPatient,
          email,
          idQuestionnaire: 'Q_PLAINTES',
          answers: values,
          _scoresOverride: scores,
        }),
      });
      const data = (await res.json()) as PatientSubmitResponse;
      if (!data.ok) { setError(data.error); }
      else { onDone(); }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1">{assignation.titre}</h2>
        <p className="text-sm text-gray-500 mb-6">Évaluez chaque dimension de 1 (pas de gêne) à 10 (gêne maximale).</p>
        {assignation.notes && (
          <div className="mb-6 px-4 py-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <span className="font-medium">Note de votre praticien : </span>{assignation.notes}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {PLAINTES.map(p => (
            <div key={p.key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{p.icon} {p.label}</span>
                <span className="text-sm font-bold text-blue-700 w-6 text-right">{values[p.key]}</span>
              </div>
              <input
                type="range" min={1} max={10} step={1}
                value={values[p.key]}
                onChange={e => setValues(v => ({ ...v, [p.key]: Number(e.target.value) }))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>1 — Pas de gêne</span><span>10 — Gêne maximale</span>
              </div>
            </div>
          ))}
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}
          <button
            type="submit" disabled={submitting}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Envoi en cours…' : 'Envoyer mes réponses'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── questionnaire générique renderer ───────────────────────────────────────
function GenericQuestionnaire({ assignation, questionnaire, email, onDone }: {
  assignation: Extract<PatientQuestionnaireResponse, { ok: true }>['assignation'];
  questionnaire: QuestionnaireDef;
  email: string;
  onDone: () => void;
}) {
  const sections = questionnaire.sections ?? [];
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    else { handleSubmit(); }
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
      else { onDone(); }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!section) return null;

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8">
        {/* En-tête */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 text-xs text-gray-400">
            <span>Partie {currentSection + 1} / {sections.length}</span>
            <span>{progress}% complété</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full">
            <div className="h-1.5 bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mt-4">{questionnaire.titre}</h2>
          {currentSection === 0 && questionnaire.instructions && (
            <p className="text-sm text-gray-500 mt-1">{questionnaire.instructions}</p>
          )}
          {section.titre && <p className="text-sm font-semibold text-blue-700 mt-3">{section.titre}</p>}
          {section.description && <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>}
        </div>

        {assignation.notes && currentSection === 0 && (
          <div className="mb-4 px-4 py-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <span className="font-medium">Note de votre praticien : </span>{assignation.notes}
          </div>
        )}

        <form onSubmit={handleNext} className="space-y-6">
          {section.questions.map(q => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id] ?? ''}
              onChange={val => setAnswers(a => ({ ...a, [q.id]: val }))}
            />
          ))}

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}

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
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Envoi…' : isLast ? 'Envoyer mes réponses' : 'Suivant →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── champ de question ───────────────────────────────────────────────────────
function QuestionField({ question, value, onChange }: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">{question.texte}</p>
      {question.type === 'likert' && question.options && (
        <div className="grid gap-2">
          {question.options.map(opt => (
            <label
              key={opt.v}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                value === String(opt.v)
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={String(opt.v)}
                checked={value === String(opt.v)}
                onChange={() => onChange(String(opt.v))}
                className="accent-blue-600"
              />
              <span>{opt.l}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === 'select' && question.options && (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Choisissez —</option>
          {question.options.map(opt => (
            <option key={opt.v} value={String(opt.v)}>{opt.l}</option>
          ))}
        </select>
      )}
      {question.type === 'number' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={question.min}
            max={question.max}
            step={question.step ?? 1}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {question.unit && <span className="text-sm text-gray-500">{question.unit}</span>}
          {question.min !== undefined && question.max !== undefined && (
            <span className="text-xs text-gray-400">({question.min}–{question.max})</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── écran de succès ─────────────────────────────────────────────────────────
function SuccessScreen() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Merci !</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Vos réponses ont bien été transmises à votre praticien Wellneuro.<br />
          Un email de confirmation vous a été envoyé.
        </p>
        <p className="text-xs text-gray-400 mt-4">
          Ces informations sont confidentielles et seront utilisées uniquement dans le cadre de votre suivi.
        </p>
      </div>
    </div>
  );
}

// ─── page principale ─────────────────────────────────────────────────────────
type Step =
  | { name: 'gate' }
  | { name: 'questionnaire'; email: string; data: Extract<PatientQuestionnaireResponse, { ok: true }> }
  | { name: 'success' };

export default function PatientQuestionnairePage() {
  const [step, setStep] = useState<Step>({ name: 'gate' });

  if (step.name === 'gate') {
    return (
      <EmailGate
        onVerified={(email, data) => setStep({ name: 'questionnaire', email, data })}
      />
    );
  }

  if (step.name === 'success') {
    return <SuccessScreen />;
  }

  const { email, data } = step;
  const { assignation } = data;
  const onDone = () => setStep({ name: 'success' });

  if (assignation.idQuestionnaire === 'Q_PLAINTES') {
    return <PlaintesForm assignation={assignation} email={email} onDone={onDone} />;
  }

  if (!data.questionnaire) {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-orange-100 p-8 text-center">
        <p className="text-orange-700">Ce questionnaire n&apos;est pas encore disponible en ligne. Contactez votre praticien.</p>
      </div>
    );
  }

  return (
    <GenericQuestionnaire
      assignation={assignation}
      questionnaire={data.questionnaire as QuestionnaireDef}
      email={email}
      onDone={onDone}
    />
  );
}
