'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FRICTIONS,
  LABELS_CONSTATS_DIRECTS,
  LABELS_ISSUE_TRACE,
  type FrictionCode,
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
  decisionMode: 'accepter' | 'modifier';
  decisionNote: string;
  assietteCode: string;
};

type JaMilestone = 'J7' | 'J14' | 'J21';
type JaChargePercue = 'faible' | 'moderee' | 'elevee';

type JaActivationSummary = {
  draftId: string;
  sourceDraftId: string;
  milestone: JaMilestone;
  deltaDecision: string;
  feedbackPatient: string;
  chargePercue: JaChargePercue;
  budgetChargeGlobal: number;
  reviewedAt: string;
};

const ASSIETTES_RECOMMANDEES: Array<{ code: string; label: string }> = [
  { code: 'ASSIETTE_PETIT_DEJEUNER_SIMPLE', label: 'Assiette recommandée — Petit-déjeuner simple' },
  { code: 'ASSIETTE_DEJEUNER_EXTERIEUR', label: 'Assiette recommandée — Déjeuner extérieur' },
  { code: 'ASSIETTE_SOIR_LEGER', label: 'Assiette recommandée — Soir léger' },
];

function defaultDecisionNote(assietteCode: string): string {
  const assiette = ASSIETTES_RECOMMANDEES.find((item) => item.code === assietteCode);
  const label = assiette?.label ?? ASSIETTES_RECOMMANDEES[0].label;
  return `Décision proposée : poursuivre l’essai avec ${label.toLowerCase()} pendant 7 jours.`;
}

function topMomentsToExplore(traces: TrialTrace[]): string[] {
  const counts = new Map<FrictionCode, number>();
  traces.forEach((trace) => {
    if (!trace.frictionCode) return;
    const current = counts.get(trace.frictionCode) ?? 0;
    counts.set(trace.frictionCode, current + 1);
  });

  const ordered = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([code]) => FRICTIONS[code]);

  if (ordered.length === 3) {
    return ordered;
  }

  const fallback = [
    'Le matin, quand le rythme démarre vite',
    'Le déjeuner hors de chez soi',
    'Le soir en cas de fatigue',
  ];

  return [...ordered, ...fallback].slice(0, 3);
}

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
    const decisionMode = parsed.decisionMode === 'modifier' ? 'modifier' : 'accepter';
    const assietteCode = typeof parsed.assietteCode === 'string' && parsed.assietteCode.length > 0
      ? parsed.assietteCode
      : ASSIETTES_RECOMMANDEES[0].code;
    const decisionNote = typeof parsed.decisionNote === 'string'
      ? parsed.decisionNote
      : defaultDecisionNote(assietteCode);
    return {
      traces: parsed.traces,
      decisionMode,
      decisionNote,
      assietteCode,
    };
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
    return initialDraft.traces.length > 0 || initialDraft.decisionNote.length > 0;
  });
  const [episode] = useState<FoodObservationEpisode>(() => buildEpisode(idPatient));
  const [traces, setTraces] = useState<TrialTrace[]>(() => initialDraft?.traces ?? []);
  const [decisionMode, setDecisionMode] = useState<'accepter' | 'modifier'>(
    () => initialDraft?.decisionMode ?? 'accepter'
  );
  const [assietteCode, setAssietteCode] = useState<string>(
    () => initialDraft?.assietteCode ?? ASSIETTES_RECOMMANDEES[0].code
  );
  const [decisionNote, setDecisionNote] = useState<string>(
    () => initialDraft?.decisionNote ?? defaultDecisionNote(ASSIETTES_RECOMMANDEES[0].code)
  );
  const [reviewSummary, setReviewSummary] = useState<string>('');
  const [milestone, setMilestone] = useState<JaMilestone>('J7');
  const [feedbackPatient, setFeedbackPatient] = useState<string>('');
  const [chargePercue, setChargePercue] = useState<JaChargePercue>('moderee');
  const [budgetChargeGlobal, setBudgetChargeGlobal] = useState<number>(7);
  const [activation, setActivation] = useState<JaActivationSummary | null>(null);
  const [activationInfo, setActivationInfo] = useState<string>('');
  const [activationLoading, setActivationLoading] = useState<boolean>(false);
  const [activationSubmitting, setActivationSubmitting] = useState<boolean>(false);
  const [issue, setIssue] = useState<TraceIssue>('fait');
  const [frictionCode, setFrictionCode] = useState('');
  const [motLibre, setMotLibre] = useState('');
  const [error, setError] = useState('');

  const momentsToExplore = useMemo(() => topMomentsToExplore(traces), [traces]);

  const constats = useMemo(() => listDirectFindings({
    joursSansTrace: traces.length === 0 ? 7 : 0,
    occasionAbsente: traces.some(trace => trace.occasionPresentee === false),
    planMinimalActif: false,
    actionDeclareeImpossible: traces.some(trace => trace.issue === 'partiel_empeche'),
  }), [traces]);

  useEffect(() => {
    writeDraft(idPatient, { traces, decisionMode, decisionNote, assietteCode });
  }, [idPatient, traces, decisionMode, decisionNote, assietteCode]);

  useEffect(() => {
    let mounted = true;
    setActivationLoading(true);
    setActivationInfo('');

    const loadActivation = async () => {
      try {
        const res = await fetch(`/api/praticien/ja/activation?idPatient=${encodeURIComponent(idPatient)}`, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const json = (await res.json()) as { ok: boolean; activation?: JaActivationSummary | null; error?: string };
        if (!mounted) return;
        if (!res.ok || !json.ok) {
          setActivationInfo(json.error ?? 'Activation JA indisponible pour le moment.');
          setActivation(null);
          return;
        }
        setActivation(json.activation ?? null);
      } catch {
        if (!mounted) return;
        setActivationInfo('Activation JA indisponible pour le moment.');
      } finally {
        if (mounted) setActivationLoading(false);
      }
    };

    void loadActivation();
    return () => {
      mounted = false;
    };
  }, [idPatient]);

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
    setDecisionMode('accepter');
    setAssietteCode(ASSIETTES_RECOMMANDEES[0].code);
    setDecisionNote(defaultDecisionNote(ASSIETTES_RECOMMANDEES[0].code));
    setReviewSummary('');
    setIssue('fait');
    setFrictionCode('');
    setMotLibre('');
    setError('');
    setDraftRestored(false);
  };

  const onAssietteChange = (value: string) => {
    setAssietteCode(value);
    if (decisionMode === 'accepter') {
      setDecisionNote(defaultDecisionNote(value));
    }
  };

  const validerRevue = () => {
    if (decisionMode === 'modifier' && decisionNote.trim().length < 10) {
      setError('En mode Modifier, ajoute une note de décision plus précise (10 caractères minimum).');
      return;
    }
    setError('');
    const assiette = ASSIETTES_RECOMMANDEES.find((item) => item.code === assietteCode);
    const modeLabel = decisionMode === 'accepter' ? 'Accepté' : 'Modifié';
    setReviewSummary(`${modeLabel} — ${assiette?.label ?? assietteCode}. ${decisionNote}`);
  };

  const activerDecision = async () => {
    if (decisionNote.trim().length < 10) {
      setError('Ajoutez une note de décision d au moins 10 caractères avant activation.');
      return;
    }
    if (feedbackPatient.trim().length < 10) {
      setError('Ajoutez un retour patient de 10 caractères minimum.');
      return;
    }

    setError('');
    setActivationInfo('');
    setActivationSubmitting(true);

    try {
      const snapshotRes = await fetch('/api/praticien/ja/observations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPatient,
          episode,
          traces,
          pauses: [],
          plans: [],
          solutions: [],
          actionCareer: [],
        }),
      });

      const snapshotJson = (await snapshotRes.json()) as {
        ok: boolean;
        snapshot?: { draftId: string };
        error?: string;
      };

      if (!snapshotRes.ok || !snapshotJson.ok || !snapshotJson.snapshot?.draftId) {
        setError(snapshotJson.error ?? 'Impossible de créer le snapshot JA.');
        return;
      }

      const activationRes = await fetch('/api/praticien/ja/activation', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPatient,
          draftId: snapshotJson.snapshot.draftId,
          milestone,
          deltaDecision: decisionNote,
          feedbackPatient,
          chargePercue,
          budgetChargeGlobal,
        }),
      });

      const activationJson = (await activationRes.json()) as {
        ok: boolean;
        activation?: JaActivationSummary;
        error?: string;
      };

      if (!activationRes.ok || !activationJson.ok || !activationJson.activation) {
        setError(activationJson.error ?? 'Impossible d activer la décision JA.');
        return;
      }

      setActivation(activationJson.activation);
      setActivationInfo('Décision activée et rendue disponible sur le portail patient.');
      setReviewSummary(`Activation ${activationJson.activation.milestone} validée.`);
    } catch {
      setError('Erreur réseau pendant l activation JA.');
    } finally {
      setActivationSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Trajectoire alimentaire</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Prototype JA5-03 local: revue praticien guidée, sans persistance.
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

      <section className="bg-surface border border-border rounded-xl p-4 space-y-3" data-testid="ja-praticien-calibrage">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bilan de calibrage restitué</h3>
        <p className="text-sm text-foreground">Structure observée: 3 prises principales, variabilité surtout le soir.</p>
        <p className="text-sm text-foreground">Charge supportable déclarée: 3 traces par semaine.</p>
        <p className="text-sm text-muted-foreground">Marqueurs saillants: petit-déjeuner sauté, dîner tardif, collation de fatigue.</p>
      </section>

      <section className="bg-surface border border-border rounded-xl p-4 space-y-2" data-testid="ja-praticien-moments-explorer">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">3 moments à explorer</h3>
        <ul className="space-y-1 text-sm text-foreground">
          {momentsToExplore.map((moment) => (
            <li key={moment}>• {moment}</li>
          ))}
        </ul>
      </section>

      <section className="bg-surface border border-border rounded-xl p-4 space-y-3" data-testid="ja-praticien-revue-decision">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Revue pré-remplie (Accepter / Modifier)</h3>

        <label className="block text-sm text-muted-foreground">
          Action liée à une assiette recommandée
          <select
            data-testid="ja-praticien-assiette"
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
            value={assietteCode}
            onChange={(e) => onAssietteChange(e.target.value)}
          >
            {ASSIETTES_RECOMMANDEES.map((assiette) => (
              <option key={assiette.code} value={assiette.code}>{assiette.label}</option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2" data-testid="ja-praticien-decision-mode">
          <legend className="text-sm text-muted-foreground">Décision praticien</legend>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="decision-mode"
              value="accepter"
              checked={decisionMode === 'accepter'}
              onChange={() => {
                setDecisionMode('accepter');
                setDecisionNote(defaultDecisionNote(assietteCode));
              }}
            />
            Accepter
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="decision-mode"
              value="modifier"
              checked={decisionMode === 'modifier'}
              onChange={() => setDecisionMode('modifier')}
            />
            Modifier
          </label>
        </fieldset>

        <label className="block text-sm text-muted-foreground">
          Note de décision
          <textarea
            data-testid="ja-praticien-decision-note"
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground min-h-24"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            placeholder="Exemple: version simple maintenue, secours activé sur les dîners tardifs"
          />
        </label>

        <button
          data-testid="ja-praticien-valider-revue"
          type="button"
          onClick={validerRevue}
          className="w-full sm:w-auto rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Valider la revue locale
        </button>

        {reviewSummary && (
          <p className="text-sm text-foreground rounded-lg border border-border px-3 py-2" data-testid="ja-praticien-review-summary">
            {reviewSummary}
          </p>
        )}

        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-3" data-testid="ja-praticien-activation">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activation protocole JA5-05</p>

          <label className="block text-sm text-muted-foreground">
            Jalon de phase
            <select
              data-testid="ja-praticien-activation-milestone"
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
              value={milestone}
              onChange={(e) => setMilestone(e.target.value as JaMilestone)}
            >
              <option value="J7">J7</option>
              <option value="J14">J14</option>
              <option value="J21">J21</option>
            </select>
          </label>

          <label className="block text-sm text-muted-foreground">
            Retour patient (visible portail)
            <textarea
              data-testid="ja-praticien-feedback-patient"
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground min-h-20"
              value={feedbackPatient}
              onChange={(e) => setFeedbackPatient(e.target.value)}
              placeholder="Exemple: cette version est mieux tenue sur les jours chargés"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-muted-foreground">
              Charge perçue
              <select
                data-testid="ja-praticien-charge-percue"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
                value={chargePercue}
                onChange={(e) => setChargePercue(e.target.value as JaChargePercue)}
              >
                <option value="faible">Faible</option>
                <option value="moderee">Modérée</option>
                <option value="elevee">Élevée</option>
              </select>
            </label>

            <label className="block text-sm text-muted-foreground">
              Budget charge global (1-21)
              <input
                data-testid="ja-praticien-budget-global"
                type="number"
                min={1}
                max={21}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
                value={budgetChargeGlobal}
                onChange={(e) => setBudgetChargeGlobal(Number(e.target.value || 1))}
              />
            </label>
          </div>

          <button
            data-testid="ja-praticien-activer-decision"
            type="button"
            onClick={activerDecision}
            disabled={activationSubmitting}
            className="w-full sm:w-auto rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {activationSubmitting ? 'Activation en cours…' : 'Activer la décision JA'}
          </button>

          {activationLoading && <p className="text-xs text-muted-foreground">Chargement de l activation en cours…</p>}
          {activationInfo && <p className="text-xs text-primary">{activationInfo}</p>}
          {activation && (
            <p className="text-xs text-foreground rounded-lg border border-border px-3 py-2" data-testid="ja-praticien-activation-summary">
              Activation active: {activation.milestone} · charge {activation.chargePercue} · budget {activation.budgetChargeGlobal}.
            </p>
          )}
        </div>
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
        Version JA5-05: activation praticien et restitution patient via API, sans migration Prisma.
      </section>
    </div>
  );
}
