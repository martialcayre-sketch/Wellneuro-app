'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { PatientQuestionnaireResponse } from '@/app/api/patient/questionnaire/route';
import type { PatientAssignationsResponse } from '@/app/api/patient/assignations/route';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { MonEquilibreAccueil } from '@/components/patient/MonEquilibreAccueil';
import { MonEquilibreDetail } from '@/components/patient/MonEquilibreDetail';
import { ConsentScreen } from '@/components/patient/ConsentScreen';
import { ConsultationScreen } from '@/components/patient/ConsultationScreen';
import { PlaintesForm } from '@/components/patient/PlaintesForm';
import { GenericQuestionnaire } from '@/components/patient/GenericQuestionnaire';

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
