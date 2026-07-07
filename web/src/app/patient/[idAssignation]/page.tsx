'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { PatientQuestionnaireResponse } from '@/app/api/patient/questionnaire/route';
import type { PatientAssignationsResponse } from '@/app/api/patient/assignations/route';
import type { PatientSubmitResponse } from '@/app/api/patient/submit/route';
import { MonEquilibreAccueil } from '@/components/patient/MonEquilibreAccueil';
import { MonEquilibreDetail } from '@/components/patient/MonEquilibreDetail';

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

// ─── étape 1bis : consentement ──────────────────────────────────────────────
function ConsentScreen({ idAssignation, email, onAccepted }: {
  idAssignation: string;
  email: string;
  onAccepted: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/patient/consentement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idAssignation, email, action: 'donner' }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) { setError(data.error ?? 'Erreur. Réessayez.'); }
      else { onAccepted(); }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Avant de commencer</h1>

        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Vous avez été invité·e par votre praticien à répondre à un ou
            plusieurs questionnaires dans le cadre de WellNeuro, un outil
            d&apos;accompagnement bien-être et de suivi personnalisé.
          </p>
          <div>
            <p className="font-semibold text-gray-900">Ce que nous collectons</p>
            <p>
              Vos réponses aux questionnaires (habitudes de sommeil, énergie,
              stress, et selon les cas d&apos;autres axes de suivi), ainsi que
              la date de vos réponses.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Pourquoi</p>
            <p>
              Ces réponses permettent à votre praticien de mieux comprendre
              votre situation et de vous proposer des recommandations et un
              protocole personnalisé adaptés. Il ne s&apos;agit pas d&apos;un
              outil de diagnostic médical : les résultats constituent un
              indice de suivi destiné à accompagner l&apos;échange avec votre
              praticien, pas à le remplacer.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Qui peut voir vos réponses</p>
            <p>Seul votre praticien a accès à vos réponses. Elles ne sont partagées avec aucun tiers.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Combien de temps sont-elles conservées</p>
            <p>Vos réponses sont conservées le temps de votre suivi. Vous pouvez en demander la suppression à tout moment.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Vos droits</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Vous pouvez consulter vos réponses à tout moment via ce même lien.</li>
              <li>Vous pouvez demander une modification de vos réponses ; elle sera effective après accord de votre praticien.</li>
              <li>Vous pouvez demander la suppression de vos données à tout moment, en contactant votre praticien.</li>
              <li>Vous pouvez retirer votre consentement à tout moment, ce qui arrêtera la collecte sans affecter les réponses déjà nécessaires au suivi en cours.</li>
            </ul>
          </div>
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
            Cet outil est actuellement en phase de test. Vos retours sur
            l&apos;usage de l&apos;outil (pas seulement vos réponses
            cliniques) sont les bienvenus auprès de votre praticien.
          </p>
        </div>

        <label className="flex items-start gap-3 mt-6 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-1 accent-blue-600"
          />
          <span className="text-sm text-gray-800">
            J&apos;ai lu ces informations et j&apos;accepte que mes réponses
            soient collectées et utilisées dans les conditions décrites
            ci-dessus.
          </span>
        </label>

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2 mt-4">{error}</p>}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!checked || loading}
          className="w-full mt-6 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Enregistrement…' : 'Continuer vers le questionnaire'}
        </button>
      </div>
    </div>
  );
}

// ─── écran de consultation (réponses verrouillées) ──────────────────────────
function ConsultationScreen({ idAssignation, email, statutReponses, onVoirEquilibre }: {
  idAssignation: string;
  email: string;
  statutReponses: string;
  onVoirEquilibre: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reponse, setReponse] = useState<{ titre: string; dateReponse: string } | null>(null);
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(statutReponses === 'modification_demandee');
  const [demandeLoading, setDemandeLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/patient/reponses?id=${encodeURIComponent(idAssignation)}&email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (!data.ok) { setError(data.error); }
        else { setReponse({ titre: data.titre, dateReponse: data.dateReponse }); }
      } catch {
        setError('Erreur réseau. Réessayez.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDemande = async () => {
    setDemandeLoading(true);
    try {
      const res = await fetch('/api/patient/consentement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idAssignation, email, action: 'demander_modification' }),
      });
      const data = await res.json();
      if (data.ok) setDemandeEnvoyee(true);
    } finally {
      setDemandeLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Vos réponses</h2>
        {loading && <p className="text-sm text-gray-500">Chargement…</p>}
        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}
        {reponse && (
          <p className="text-sm text-gray-600 mb-6">
            « {reponse.titre} » — envoyé le{' '}
            {new Date(reponse.dateReponse).toLocaleDateString('fr-FR')}.<br />
            Vos réponses sont verrouillées en lecture seule.
          </p>
        )}
        <button
          type="button"
          onClick={onVoirEquilibre}
          className="w-full mb-3 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          Voir Mon équilibre
        </button>

        {demandeEnvoyee ? (
          <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-4 py-3">
            Votre demande de modification a été transmise à votre praticien.
          </p>
        ) : (
          <button
            type="button"
            onClick={handleDemande}
            disabled={demandeLoading}
            className="w-full py-2.5 px-4 border border-blue-600 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {demandeLoading ? 'Envoi…' : 'Demander une modification'}
          </button>
        )}
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

function QuestionnairesEnAttentePanel({ idAssignation, email }: {
  idAssignation: string;
  email: string;
}) {
  const [assignations, setAssignations] = useState<Extract<PatientAssignationsResponse, { ok: true }>['assignations']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetch(`/api/patient/assignations?id=${encodeURIComponent(idAssignation)}&email=${encodeURIComponent(email)}`);
        const data = (await res.json()) as PatientAssignationsResponse;
        if (!active) return;
        if (data.ok) {
          setAssignations(data.assignations);
        } else {
          setAssignations([]);
        }
      } catch {
        if (active) setAssignations([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [idAssignation, email]);

  const ordrePrioritaire = ['Q_PLAINTES', 'Q_MOD_03', 'Q_MOD_01', 'Q_ALI_01', 'Q_INF_03'];
  const indexPriorite = new Map(ordrePrioritaire.map((id, idx) => [id, idx]));

  const pending = assignations
    .filter(a => a.estEnAttenteSaisie)
    .sort((a, b) => {
      const pa = indexPriorite.get(a.idQuestionnaire);
      const pb = indexPriorite.get(b.idQuestionnaire);
      if (pa !== undefined && pb !== undefined) return pa - pb;
      if (pa !== undefined) return -1;
      if (pb !== undefined) return 1;
      return a.titre.localeCompare(b.titre, 'fr');
    });

  return (
    <div className="w-full max-w-2xl mb-5">
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-4 sm:p-5">
        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-blue-900">Suivi de vos questionnaires</p>
            {loading ? (
              <span className="text-xs text-blue-700">Chargement...</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-blue-600 text-white text-xs font-semibold px-2.5 py-1">
                Restants: {pending.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900">Questionnaires en attente</h2>
          {!loading && (
            <span className="text-xs text-blue-700 bg-blue-50 rounded-full px-2.5 py-1">{pending.length} à compléter</span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Récupération de vos questionnaires...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-600">Aucun autre questionnaire en attente pour le moment.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pending.map(a => {
              const isCurrent = a.idAssignation === idAssignation;
              return (
                <li key={a.idAssignation} className={`rounded-xl border p-3 ${isCurrent ? 'border-blue-300 bg-blue-50/60' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.titre}</p>
                      <p className="text-xs text-gray-500 mt-1">{a.idQuestionnaire}</p>
                      {a.dateLimite && (
                        <p className="text-xs text-gray-500 mt-1">À compléter avant le {new Date(`${a.dateLimite}T00:00:00`).toLocaleDateString('fr-FR')}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {isCurrent ? (
                      <span className="text-xs font-medium text-blue-700 bg-blue-100 rounded-full px-2 py-1">En cours</span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-1">À saisir</span>
                    )}
                    {!isCurrent && (
                      <a
                        href={`/patient/${encodeURIComponent(a.idAssignation)}`}
                        className="shrink-0 inline-flex items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-blue-700 transition-colors"
                      >
                        Ouvrir
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── écran de succès ─────────────────────────────────────────────────────────
function SuccessScreen({ idAssignation, email }: {
  idAssignation: string;
  email: string;
}) {
  return (
    <div className="w-full max-w-2xl">
      <QuestionnairesEnAttentePanel idAssignation={idAssignation} email={email} />
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Merci !</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Vos réponses ont bien été transmises à votre praticien Wellneuro.<br />
          Vous pouvez ouvrir un autre questionnaire en attente juste au-dessus.
        </p>
        <p className="text-xs text-gray-400 mt-4">
          Ces informations sont confidentielles et seront utilisées uniquement dans le cadre de votre suivi.
        </p>
      </div>
    </div>
  );
}

// ─── page principale ─────────────────────────────────────────────────────────
type VerifiedData = Extract<PatientQuestionnaireResponse, { ok: true }>;

type Step =
  | { name: 'gate' }
  | { name: 'consent'; email: string; data: VerifiedData }
  | { name: 'consultation'; email: string; data: VerifiedData }
  | { name: 'questionnaire'; email: string; data: VerifiedData }
  | { name: 'equilibre'; email: string; data: VerifiedData }
  | { name: 'equilibre-detail'; email: string; data: VerifiedData }
  | { name: 'success'; email: string; data: VerifiedData };

function stepAfterVerification(email: string, data: VerifiedData): Step {
  const { consentement, statutReponses } = data.assignation;
  if (consentement !== 'donne') return { name: 'consent', email, data };
  if (statutReponses === 'verrouille' || statutReponses === 'modification_demandee') {
    return { name: 'consultation', email, data };
  }
  return { name: 'questionnaire', email, data };
}

export default function PatientQuestionnairePage() {
  const [step, setStep] = useState<Step>({ name: 'gate' });

  if (step.name === 'gate') {
    return (
      <EmailGate
        onVerified={(email, data) => setStep(stepAfterVerification(email, data))}
      />
    );
  }

  if (step.name === 'success') {
    return <SuccessScreen idAssignation={step.data.assignation.idAssignation} email={step.email} />;
  }

  if (step.name === 'consent') {
    const { email, data } = step;
    return (
      <div className="w-full max-w-2xl">
        <QuestionnairesEnAttentePanel idAssignation={data.assignation.idAssignation} email={email} />
        <ConsentScreen
          idAssignation={data.assignation.idAssignation}
          email={email}
          onAccepted={() => setStep(stepAfterVerification(email, {
            ...data,
            assignation: { ...data.assignation, consentement: 'donne' },
          }))}
        />
      </div>
    );
  }

  if (step.name === 'consultation') {
    const { email, data } = step;
    return (
      <div className="w-full max-w-2xl">
        <QuestionnairesEnAttentePanel idAssignation={data.assignation.idAssignation} email={email} />
        <ConsultationScreen
          idAssignation={data.assignation.idAssignation}
          email={email}
          statutReponses={data.assignation.statutReponses}
          onVoirEquilibre={() => setStep({ name: 'equilibre', email, data })}
        />
      </div>
    );
  }

  if (step.name === 'equilibre') {
    const { email, data } = step;
    return (
      <MonEquilibreAccueil
        idAssignation={data.assignation.idAssignation}
        email={email}
        onVoirDetail={() => setStep({ name: 'equilibre-detail', email, data })}
        onRetour={() => setStep({ name: 'consultation', email, data })}
      />
    );
  }

  if (step.name === 'equilibre-detail') {
    const { email, data } = step;
    return (
      <MonEquilibreDetail
        idAssignation={data.assignation.idAssignation}
        email={email}
        onRetour={() => setStep({ name: 'equilibre', email, data })}
      />
    );
  }

  const { email, data } = step;
  const { assignation } = data;
  const onDone = () => setStep({ name: 'success', email, data });

  if (assignation.idQuestionnaire === 'Q_PLAINTES') {
    return (
      <div className="w-full max-w-2xl">
        <QuestionnairesEnAttentePanel idAssignation={assignation.idAssignation} email={email} />
        <PlaintesForm assignation={assignation} email={email} onDone={onDone} />
      </div>
    );
  }

  if (!data.questionnaire) {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-orange-100 p-8 text-center">
        <p className="text-orange-700">Ce questionnaire n&apos;est pas encore disponible en ligne. Contactez votre praticien.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <QuestionnairesEnAttentePanel idAssignation={assignation.idAssignation} email={email} />
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={data.questionnaire as QuestionnaireDef}
        email={email}
        onDone={onDone}
      />
    </div>
  );
}
