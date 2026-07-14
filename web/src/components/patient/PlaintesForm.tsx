'use client';

import { useEffect, useRef, useState } from 'react';
import type { AssignationInfo } from '@/app/api/patient/questionnaire/route';
import type { PatientSubmitResponse } from '@/app/api/patient/submit/route';
import { clearDraft, readDraft, readDraftSavedAt, writeDraft } from '@/lib/questionnaire-draft';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { SaveStatusIndicator, type SaveError } from '@/components/patient/SaveStatusIndicator';
import { PatientConfirmDialog } from '@/components/patient/PatientConfirmDialog';

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
  const [savedAt, setSavedAt] = useState<Date | null>(() => readDraftSavedAt(assignation.idAssignation));
  const [saveError, setSaveError] = useState<SaveError | undefined>(undefined);
  const [confirmDialog, setConfirmDialog] = useState<'reset' | 'submit' | null>(null);
  const premierRendu = useRef(true);

  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return; }
    writeDraft(assignation.idAssignation, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])));
    setSavedAt(readDraftSavedAt(assignation.idAssignation));
  }, [values, assignation.idAssignation]);

  const handleSauvegarder = () => {
    writeDraft(assignation.idAssignation, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])));
    setSavedAt(readDraftSavedAt(assignation.idAssignation));
  };

  const confirmerReinitialiser = () => {
    clearDraft(assignation.idAssignation);
    setValues(Object.fromEntries(PLAINTES.map(p => [p.key, 5])));
    setSavedAt(null);
    setSaveError(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmDialog('submit');
  };

  const confirmerTransmission = async () => {
    setError('');
    setSaveError(undefined);
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
      if (!data.ok) { setError(data.error); setSaveError('submission-incomplete'); }
      else { clearDraft(assignation.idAssignation); onDone(); }
    } catch {
      setError('Erreur réseau. Réessayez.');
      setSaveError('network');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PatientCard as="form" onSubmit={handleSubmit} className="space-y-6">
      <div>
        <PatientPageHeader as="h2" title={assignation.titre} />
        <p className="text-sm text-muted-foreground mb-2">Évaluez chaque dimension de 1 (pas de gêne) à 10 (gêne maximale).</p>
      </div>
      {assignation.notes && (
        <div className="px-4 py-3 bg-primary/10 rounded-lg text-sm text-primary">
          <span className="font-medium">Note de votre praticien : </span>{assignation.notes}
        </div>
      )}
      {PLAINTES.map(p => (
        <div key={p.key}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-muted-foreground">{p.icon} {p.label}</span>
            <span className="text-sm font-bold text-primary w-6 text-right">{values[p.key]}</span>
          </div>
          <input
            type="range" min={1} max={10} step={1}
            value={values[p.key]}
            onChange={e => { const n = Number(e.target.value); setValues(v => ({ ...v, [p.key]: n })); }}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground/70 mt-0.5">
            <span>1 — Pas de gêne</span><span>10 — Gêne maximale</span>
          </div>
        </div>
      ))}
      {error && <PatientInlineMessage tone="error">{error}</PatientInlineMessage>}
      <SaveStatusIndicator savedAt={savedAt} error={saveError} />
      <PatientButton type="submit" variant="primary" loading={submitting} loadingLabel="Envoi en cours…" className="w-full">
        Transmettre au praticien
      </PatientButton>

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
