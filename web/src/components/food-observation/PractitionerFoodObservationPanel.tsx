'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FRICTIONS,
  LABELS_CONSTATS_DIRECTS,
  LABELS_ISSUE_TRACE,
  createAttentionBudget,
  createEpisode,
  createTrialTrace,
  listDirectFindings,
  type FoodObservationEpisode,
  type TraceIssue,
  type TrialTrace,
} from '@/lib/food-observation';

function dateLocale(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function plusDays(value: Date, days: number): Date {
  const clone = new Date(value);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildEpisode(patientId: string): FoodObservationEpisode {
  const start = new Date();
  return createEpisode({
    episodeId: `ja_praticien_${patientId}`,
    patientId,
    startDate: dateLocale(start),
    endDate: dateLocale(plusDays(start, 6)),
    budget: createAttentionBudget(3),
    content: {
      regime: 'essai',
      hypothese: 'Observer la praticabilite de l’action alimentaire sans surcharge de saisie.',
      action: {
        actionId: 'action_ja5_02',
        labelPatient: 'Action alimentaire de la semaine',
        idealPlan: 'Version ideale decidee en consultation.',
        simplePlan: 'Version simple decidee en consultation.',
      },
    },
  });
}

type PractitionerFoodObservationDraft = {
  traces: TrialTrace[];
};

function draftKey(idPatient: string): string {
  return `wellneuro:ja5-02:praticien:${idPatient}`;
}

function readDraft(idPatient: string): PractitionerFoodObservationDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(draftKey(idPatient));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PractitionerFoodObservationDraft>;
    if (!Array.isArray(parsed.traces)) return null;
    return { traces: parsed.traces };
  } catch {
    return null;
  }
}

function writeDraft(idPatient: string, draft: PractitionerFoodObservationDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(draftKey(idPatient), JSON.stringify(draft));
  } catch {
    // no-op: ne pas bloquer la saisie.
  }
}

function clearDraft(idPatient: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(draftKey(idPatient));
  } catch {
    // no-op
  }
}

export function PractitionerFoodObservationPanel({ idPatient }: { idPatient: string }) {
  const [initialDraft] = useState<PractitionerFoodObservationDraft | null>(() => readDraft(idPatient));
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    if (!initialDraft) return false;
    return initialDraft.traces.length > 0;
  });
  const [episode] = useState<FoodObservationEpisode>(() => buildEpisode(idPatient));
  const [traces, setTraces] = useState<TrialTrace[]>(() => initialDraft?.traces ?? []);
  const [issue, setIssue] = useState<TraceIssue>('fait');
  const [frictionCode, setFrictionCode] = useState('');
  const [motLibre, setMotLibre] = useState('');
  const [error, setError] = useState('');

  const constats = useMemo(() => listDirectFindings({
    joursSansTrace: traces.length === 0 ? 7 : 0,
    occasionAbsente: traces.some(trace => trace.occasionPresentee === false),
    planMinimalActif: false,
    actionDeclareeImpossible: traces.some(trace => trace.issue === 'partiel_empeche'),
  }), [traces]);

  useEffect(() => {
    writeDraft(idPatient, { traces });
  }, [idPatient, traces]);

  const enregistrerTrace = () => {
    setError('');
    try {
      const trace = createTrialTrace({
        traceId: makeId('trace_praticien'),
        episodeId: episode.episodeId,
        localDate: dateLocale(new Date()),
        occasionPresentee: true,
        faisable: issue === 'fait' || issue === 'adapte',
        issue,
        frictionCode: issue === 'partiel_empeche' ? frictionCode || undefined : undefined,
        motLibre: motLibre || undefined,
      });
      setTraces(prev => [trace, ...prev]);
      setIssue('fait');
      setFrictionCode('');
      setMotLibre('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’enregistrer la trace praticien.');
    }
  };

  const resetLocalDraft = () => {
    clearDraft(idPatient);
    setTraces([]);
    setIssue('fait');
    setFrictionCode('');
    setMotLibre('');
    setError('');
    setDraftRestored(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Trajectoire alimentaire</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Prototype JA5-02 local: saisie praticien en 30 secondes, sans persistance.
          </p>
        </div>
        <Link href={`/dashboard/patients/${encodeURIComponent(idPatient)}`} className="text-sm text-muted-foreground hover:underline">
          ← Retour fiche patient
        </Link>
      </div>

      {draftRestored && (
        <p className="rounded-lg px-4 py-2 text-sm text-primary bg-primary/10" data-testid="ja-praticien-restored-info">
          Brouillon local restauré sur cet appareil.
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          data-testid="ja-praticien-reset-local"
          className="text-xs text-status-danger hover:underline"
          onClick={resetLocalDraft}
        >
          Réinitialiser le brouillon local
        </button>
      </div>

      <section className="bg-surface border border-border rounded-xl p-4 space-y-3" data-testid="ja-praticien-formulaire">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saisie rapide praticien</h3>
        <p className="text-xs text-muted-foreground">
          Mobile: privilégier une friction principale et une note courte optionnelle.
        </p>

        <label className="block text-sm text-muted-foreground">
          Issue observée
          <select
            data-testid="ja-praticien-issue"
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            value={issue}
            onChange={(e) => setIssue(e.target.value as TraceIssue)}
          >
            {Object.entries(LABELS_ISSUE_TRACE).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        {issue === 'partiel_empeche' && (
          <label className="block text-sm text-muted-foreground">
            Friction principale
            <select
              data-testid="ja-praticien-friction"
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
              value={frictionCode}
              onChange={(e) => setFrictionCode(e.target.value)}
            >
              <option value="">Sélectionnez…</option>
              {Object.entries(FRICTIONS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm text-muted-foreground">
          Note courte (optionnelle)
          <input
            data-testid="ja-praticien-note"
            type="text"
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            value={motLibre}
            onChange={(e) => setMotLibre(e.target.value)}
            maxLength={80}
            placeholder="Exemple: adaptation validee en consultation"
          />
        </label>

        {error && <p className="text-sm text-status-danger">{error}</p>}

        <button
          data-testid="ja-praticien-enregistrer"
          type="button"
          onClick={enregistrerTrace}
          className="w-full sm:w-auto rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Enregistrer la trace (≤ 30 s)
        </button>
      </section>

      <section className="bg-surface border border-border rounded-xl p-4 space-y-2" data-testid="ja-praticien-constats">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Constats directs</h3>
        {constats.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun constat direct pour l’instant.</p>
        ) : (
          <ul className="space-y-1 text-sm text-foreground">
            {constats.map((constat) => (
              <li key={constat.code}>• {LABELS_CONSTATS_DIRECTS[constat.code]}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-surface border border-border rounded-xl p-4 space-y-2" data-testid="ja-praticien-historique">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historique local</h3>
        {traces.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune trace praticien enregistrée.</p>
        ) : (
          <ul className="space-y-2 text-sm max-h-80 overflow-y-auto pr-1">
            {traces.map((trace) => (
              <li key={trace.traceId} className="rounded-lg border border-border p-2">
                <p className="font-medium text-foreground">{trace.localDate} · {LABELS_ISSUE_TRACE[trace.issue]}</p>
                {trace.frictionCode && <p className="text-muted-foreground">{FRICTIONS[trace.frictionCode]}</p>}
                {trace.motLibre && <p className="text-muted-foreground">{trace.motLibre}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-muted border border-border rounded-xl p-4 text-xs text-muted-foreground">
        Version locale de travail JA5-02: aucune ecriture base, aucune migration, aucune diffusion patient automatique.
      </section>
    </div>
  );
}
