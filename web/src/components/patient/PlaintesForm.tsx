'use client';

import { useEffect, useRef, useState } from 'react';
import type { AssignationInfo } from '@/app/api/patient/questionnaire/route';
import type { PatientSubmitResponse } from '@/app/api/patient/submit/route';
import { clearDraft, readDraft, writeDraft } from '@/lib/questionnaire-draft';

const PLAINTES = [
  { key: 'fatigue',   label: 'Fatigue', icon: '😴' },
  { key: 'douleurs',  label: 'Douleurs', icon: '💢' },
  { key: 'digestion', label: 'Digestion', icon: '🫃' },
  { key: 'surpoids',  label: 'Surpoids / morphologie', icon: '⚖️' },
  { key: 'insomnie',  label: 'Insomnie / sommeil', icon: '🌙' },
  { key: 'moral',     label: 'Moral / anxiété', icon: '😟' },
  { key: 'mobilite',  label: 'Mobilité / douleurs musculaires', icon: '🦵' },
];

function valeursInitiales(idAssignation: string): Record<string, number> {
  const base = Object.fromEntries(PLAINTES.map(p => [p.key, 5]));
  const draft = readDraft(idAssignation);
  if (draft) {
    for (const p of PLAINTES) {
      const n = parseInt(draft[p.key], 10);
      if (!Number.isNaN(n)) base[p.key] = n;
    }
  }
  return base;
}

// Renderer spécifique Q_PLAINTES (7 curseurs 1–10). Composant présentationnel.
export function PlaintesForm({ assignation, email, onDone }: {
  assignation: AssignationInfo;
  email: string;
  onDone: () => void;
}) {
  const [values, setValues] = useState<Record<string, number>>(() => valeursInitiales(assignation.idAssignation));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [brouillonMessage, setBrouillonMessage] = useState('');
  const premierRendu = useRef(true);

  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return; }
    writeDraft(assignation.idAssignation, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])));
  }, [values, assignation.idAssignation]);

  const handleSauvegarder = () => {
    writeDraft(assignation.idAssignation, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])));
    setBrouillonMessage('Brouillon enregistré sur cet appareil. Il ne sera transmis au praticien qu’après validation.');
  };

  const handleReinitialiser = () => {
    if (!window.confirm('Cette action effacera les réponses non transmises de ce questionnaire. Elle ne supprimera aucune réponse déjà envoyée à votre praticien.')) return;
    clearDraft(assignation.idAssignation);
    setValues(Object.fromEntries(PLAINTES.map(p => [p.key, 5])));
    setBrouillonMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Transmettre vos réponses à votre praticien ? Après transmission, elles seront verrouillées.')) return;
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
      else { clearDraft(assignation.idAssignation); onDone(); }
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
                onChange={e => { const n = Number(e.target.value); setValues(v => ({ ...v, [p.key]: n })); setBrouillonMessage(''); }}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>1 — Pas de gêne</span><span>10 — Gêne maximale</span>
              </div>
            </div>
          ))}
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}
          {brouillonMessage && <p className="text-blue-700 text-sm bg-blue-50 rounded-lg px-4 py-2">{brouillonMessage}</p>}
          <button
            type="submit" disabled={submitting}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Envoi en cours…' : 'Transmettre au praticien'}
          </button>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSauvegarder}
              className="flex-1 py-2 px-4 text-sm text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
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
