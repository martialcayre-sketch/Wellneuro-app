'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  C5B_RECOMMENDED_PLATES,
  getCurrentRecommendedPlateRef,
  getRecommendedPlate,
} from '@/lib/food-compass/plates';
import {
  FRICTIONS,
  LABELS_CONSTATS_DIRECTS,
  LABELS_ISSUE_TRACE,
  LABELS_MOMENT_PRISE,
  LABELS_TYPE_JOURNEE,
  type FrictionCode,
  buildEpisodeDepuisProtocole,
  couvertureJournees,
  createTrialTrace,
  joursObservables,
  listDirectFindings,
  type FoodObservationEpisode,
  type IntraEpisodeSolution,
  type JourneeRepere,
  type MinimalPlanEvent,
  type PatientPauseEvent,
  type TraceIssue,
  type TrialTrace,
} from '@/lib/food-observation';

function dateLocale(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// L'épisode praticien n'est plus un gabarit (lot 2, item 5) : il vient du
// protocole diffusé, via `GET /api/praticien/ja/cycle`, et porte le MÊME
// `episodeId` que celui du panneau patient. Sans protocole diffusé, il n'y a
// pas d'épisode — l'ancien gabarit annonçait « Version ideale decidee en
// consultation » sans que rien ne l'y relie.
type VueCyclePraticien = {
  purpose: string;
  actionPrincipale: { type: string; title: string; minimalPlan: string } | null;
  cycleRef: string;
  debutCycle: string;
};

type JaSnapshotRecu = {
  draftId: string;
  createdAt: string;
  actor: 'praticien' | 'patient';
  tracesCount: number;
  pausesCount: number;
  solutionsCount: number;
  journeesCount: number;
};

/** Contenu d'une transmission — ce que le patient a réellement écrit. */
type JaSnapshotDetail = JaSnapshotRecu & {
  traces: TrialTrace[];
  pauses: PatientPauseEvent[];
  plans: MinimalPlanEvent[];
  solutions: IntraEpisodeSolution[];
  journees: JourneeRepere[];
  elementsEcartes: number;
};

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

function defaultDecisionNote(assietteCode: string): string {
  const assiette = getRecommendedPlate(assietteCode);
  if (!assiette) {
    return 'Décision proposée : poursuivre l’essai sans substitution d’assiette automatique pendant 7 jours.';
  }
  const label = assiette.label;
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
    const assietteCode = typeof parsed.assietteCode === 'string'
      && (parsed.assietteCode === '' || getRecommendedPlate(parsed.assietteCode))
      ? parsed.assietteCode
      : '';
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
  const [episode, setEpisode] = useState<FoodObservationEpisode | null>(null);
  const [cycleCharge, setCycleCharge] = useState(false);
  const [transmissions, setTransmissions] = useState<JaSnapshotRecu[]>([]);
  const [listeTronquee, setListeTronquee] = useState(false);
  const [detailOuvert, setDetailOuvert] = useState<string | null>(null);
  const [calibrage, setCalibrage] = useState<JaSnapshotDetail | null>(null);
  // Dernière ouverture demandée. Comparer la réponse à l'argument de l'appel ne
  // sert à rien — il correspond toujours ; c'est à l'ouverture COURANTE qu'il
  // faut la comparer, et l'état React est périmé dans la clôture.
  const detailDemande = useRef<string | null>(null);
  const [detail, setDetail] = useState<JaSnapshotDetail | null>(null);
  const [detailErreur, setDetailErreur] = useState('');
  const [traces, setTraces] = useState<TrialTrace[]>(() => initialDraft?.traces ?? []);
  const [decisionMode, setDecisionMode] = useState<'accepter' | 'modifier'>(
    () => initialDraft?.decisionMode ?? 'accepter'
  );
  const [assietteCode, setAssietteCode] = useState<string>(
    () => initialDraft?.assietteCode ?? ''
  );
  const [decisionNote, setDecisionNote] = useState<string>(
    () => initialDraft?.decisionNote ?? defaultDecisionNote('')
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

  // Jours DISTINCTS sans trace sur la fenêtre de l'épisode. Le 7 en dur qui
  // tenait cette place ne comptait aucun jour : il affirmait « 7 jours sans
  // trace » dès que la liste était vide, et « 0 » dès qu'une trace existait,
  // fût-elle du premier jour d'une période de trois semaines.
  //
  // BORNE À CONNAÎTRE : `traces` est le brouillon LOCAL du praticien, jamais ce
  // que le patient a transmis — la route de lecture ne rend que des compteurs,
  // sans les dates. Le constat ne vaut donc que du carnet de ce poste. Il est
  // tu dès qu'une transmission patient existe, plutôt que d'affirmer une
  // absence que cette surface ne peut pas constater.
  const joursSansTrace = useMemo(() => {
    if (!episode || transmissions.length > 0) return 0;
    const datesTracees = new Set(traces.map(t => t.localDate));
    return joursObservables(episode.startDate, episode.endDate, dateLocale(new Date()))
      .filter(jour => !datesTracees.has(jour)).length;
  }, [episode, traces, transmissions]);

  const constats = useMemo(() => listDirectFindings({
    joursSansTrace,
    occasionAbsente: traces.some(trace => trace.occasionPresentee === false),
    planMinimalActif: false,
    actionDeclareeImpossible: traces.some(trace => trace.issue === 'partiel_empeche'),
  }), [joursSansTrace, traces]);

  useEffect(() => {
    writeDraft(idPatient, { traces, decisionMode, decisionNote, assietteCode });
  }, [idPatient, traces, decisionMode, decisionNote, assietteCode]);

  // Transmissions reçues du patient (lot 2, item 4). Sans ce lecteur, le bouton
  // « Transmettre à mon praticien » promettait un partage sans destinataire.
  useEffect(() => {
    let mounted = true;

    const chargerTransmissions = async () => {
      try {
        const res = await fetch(
          `/api/praticien/ja/observations?idPatient=${encodeURIComponent(idPatient)}&actor=patient`,
          { method: 'GET', credentials: 'same-origin', cache: 'no-store' },
        );
        const json = (await res.json()) as {
          ok: boolean;
          snapshots?: JaSnapshotRecu[];
          tronquee?: boolean;
        };
        if (!mounted || !res.ok || !json.ok || !json.snapshots) return;
        // Le filtre d'acteur est déjà posé en base ; celui-ci n'est qu'une
        // ceinture, il ne porte plus la fenêtre de lecture.
        const duPatient = json.snapshots.filter(s => s.actor === 'patient');
        setTransmissions(duPatient);
        setListeTronquee(json.tronquee === true);

        // Le bilan de calibrage porte l'ÉTAT DU RECUEIL, pas ce que le
        // praticien a déplié. Il suit donc la transmission la plus récente, et
        // elle seule : les transmissions sont cumulatives par cycle — le
        // patient renvoie tout son brouillon — donc la dernière est la plus
        // complète, et sommer les instantanés compterait deux fois les mêmes
        // journées.
        const derniere = duPatient[0];
        if (derniere) {
          const resDetail = await fetch(
            `/api/praticien/ja/observations?idPatient=${encodeURIComponent(idPatient)}&draftId=${encodeURIComponent(derniere.draftId)}`,
            { method: 'GET', credentials: 'same-origin', cache: 'no-store' },
          );
          const jsonDetail = (await resDetail.json()) as { ok: boolean; snapshot?: JaSnapshotDetail };
          if (mounted && resDetail.ok && jsonDetail.ok && jsonDetail.snapshot) {
            setCalibrage(jsonDetail.snapshot);
          }
        }
      } catch {
        // Repli silencieux : la revue praticien reste utilisable.
      }
    };

    void chargerTransmissions();
    return () => { mounted = false; };
  }, [idPatient]);

  // Épisode dérivé du protocole diffusé, identique à celui du panneau patient.
  useEffect(() => {
    let mounted = true;

    const chargerCycle = async () => {
      try {
        const res = await fetch(`/api/praticien/ja/cycle?idPatient=${encodeURIComponent(idPatient)}`, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const json = (await res.json()) as {
          ok: boolean;
          protocoleDiffuse?: boolean;
          vue?: VueCyclePraticien | null;
        };
        if (!mounted) return;
        if (!res.ok || !json.ok || !json.protocoleDiffuse || !json.vue) {
          setEpisode(null);
          return;
        }
        setEpisode(buildEpisodeDepuisProtocole({ idPatient, protocole: json.vue }));
      } catch {
        if (mounted) setEpisode(null);
      } finally {
        if (mounted) setCycleCharge(true);
      }
    };

    void chargerCycle();
    return () => { mounted = false; };
  }, [idPatient]);

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
        episodeId: episode?.episodeId ?? `ja_praticien_${idPatient}_hors_cycle`,
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
    setAssietteCode('');
    setDecisionNote(defaultDecisionNote(''));
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

  // Le contenu n'est chargé qu'à l'ouverture : la liste sert à choisir, pas à
  // tout rapatrier.
  const basculerDetail = async (draftId: string) => {
    setDetailErreur('');
    if (detailOuvert === draftId) {
      detailDemande.current = null;
      setDetailOuvert(null);
      setDetail(null);
      return;
    }
    detailDemande.current = draftId;
    setDetailOuvert(draftId);
    setDetail(null);
    try {
      const res = await fetch(
        `/api/praticien/ja/observations?idPatient=${encodeURIComponent(idPatient)}&draftId=${encodeURIComponent(draftId)}`,
        { method: 'GET', credentials: 'same-origin', cache: 'no-store' },
      );
      const json = (await res.json()) as { ok: boolean; snapshot?: JaSnapshotDetail };
      if (!res.ok || !json.ok || !json.snapshot) {
        if (detailDemande.current === draftId) {
          setDetailErreur('Cette transmission n’a pas pu être ouverte.');
        }
        return;
      }
      // Deux ouvertures rapprochées peuvent revenir dans le désordre : sans ce
      // contrôle, le mot libre d'une transmission s'affichait sous la date
      // d'une autre.
      if (detailDemande.current !== draftId || json.snapshot.draftId !== draftId) return;
      setDetail(json.snapshot);
    } catch {
      setDetailErreur('Cette transmission n’a pas pu être ouverte.');
    }
  };

  // Ce que le praticien voit du calibrage vient de la DERNIÈRE transmission,
  // chargée d'office — jamais de ce qu'il a déplié. Faire dépendre ce bloc du
  // dépliant faisait dire « aucune journée décrite » au-dessus d'une liste
  // annonçant douze journées, et faisait sous-estimer la couverture dès qu'une
  // transmission ancienne était ouverte.
  const journeesTransmises = calibrage?.journees ?? [];
  const couvertureTransmise = useMemo(
    () => couvertureJournees(journeesTransmises),
    [journeesTransmises],
  );

  const validerRevue = () => {
    if (decisionMode === 'modifier' && decisionNote.trim().length < 10) {
      setError('En mode Modifier, ajoute une note de décision plus précise (10 caractères minimum).');
      return;
    }
    setError('');
    const assiette = getRecommendedPlate(assietteCode);
    const modeLabel = decisionMode === 'accepter' ? 'Accepté' : 'Modifié';
    setReviewSummary(
      `${modeLabel} — ${assiette?.label ?? 'Aucune assiette proposée'}. ${decisionNote}`
      + ' · Préparée, non transmise : cliquez sur « Activer la décision » pour l’envoyer au patient.',
    );
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

    // Sans protocole diffusé, il n'y a pas d'épisode à figer : l'activation
    // écrirait un instantané rattaché à un épisode inventé.
    if (!episode) {
      setError('Aucun protocole diffusé : diffusez un protocole avant d’activer une décision JA.');
      return;
    }

    setError('');
    setActivationInfo('');
    setActivationSubmitting(true);

    try {
      const episodeForSnapshot: FoodObservationEpisode = episode.content.regime === 'essai'
        ? {
            ...episode,
            content: {
              ...episode.content,
              action: {
                ...episode.content.action,
                ...(assietteCode
                  ? { recommendedPlateRef: getCurrentRecommendedPlateRef(assietteCode) }
                  : {}),
              },
            },
          }
        : episode;
      const snapshotRes = await fetch('/api/praticien/ja/observations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPatient,
          episode: episodeForSnapshot,
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
          <h2 className="font-display text-3xl font-bold text-foreground">Trajectoire alimentaire</h2>
          <p className="text-base text-muted-foreground mt-1">
            Prototype JA5-03 local: revue praticien guidée, sans persistance.
          </p>
        </div>
        <Link href={`/dashboard/patients/${encodeURIComponent(idPatient)}`} className="text-sm text-muted-foreground hover:underline">
          ← Retour fiche patient
        </Link>
      </div>

      {cycleCharge && (
        episode && episode.content.regime === 'essai' ? (
          <section
            className="bg-surface border border-border rounded-xl p-4 space-y-1"
            data-testid="ja-praticien-cycle"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Action du protocole diffusé
            </h3>
            <p className="text-sm font-medium text-foreground">{episode.content.action.labelPatient}</p>
            <p className="text-sm text-muted-foreground">{episode.content.action.simplePlan}</p>
            <p className="text-xs text-muted-foreground">
              Période du {episode.startDate} au {episode.endDate}.
            </p>
          </section>
        ) : (
          <p
            className="rounded-lg px-4 py-2 text-base text-primary bg-primary/10"
            data-testid="ja-praticien-sans-cycle"
          >
            Aucun protocole diffusé pour ce patient : la saisie reste locale et aucune décision JA
            ne peut être activée.
          </p>
        )
      )}

      <section
        className="bg-surface border border-border rounded-xl p-4 space-y-2"
        data-testid="ja-praticien-transmissions"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ce que le patient a transmis
        </h3>
        {listeTronquee && (
          <p className="text-xs text-muted-foreground">
            Les transmissions les plus récentes. Il peut en exister d’autres, plus anciennes.
          </p>
        )}
        {transmissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune transmission du patient à ce jour.</p>
        ) : (
          <ul className="space-y-2 text-sm text-foreground">
            {transmissions.map((snapshot) => (
              <li key={snapshot.draftId} className="border-t border-border pt-2 first:border-0 first:pt-0">
                <button
                  type="button"
                  data-testid={`ja-praticien-transmission-${snapshot.draftId}`}
                  onClick={() => basculerDetail(snapshot.draftId)}
                  className="text-left w-full hover:underline"
                  aria-expanded={detailOuvert === snapshot.draftId}
                >
                  {dateLocale(new Date(snapshot.createdAt))} — {snapshot.tracesCount} trace(s),{' '}
                  {snapshot.pausesCount} pause(s), {snapshot.solutionsCount} solution(s),{' '}
                  {snapshot.journeesCount} journée(s) décrite(s)
                  <span className="text-muted-foreground">
                    {detailOuvert === snapshot.draftId ? ' — masquer' : ' — ouvrir'}
                  </span>
                </button>

                {detailOuvert === snapshot.draftId && (
                  <div className="mt-2 space-y-2" data-testid="ja-praticien-transmission-detail">
                    {detailErreur ? (
                      <p className="text-sm text-destructive">{detailErreur}</p>
                    ) : !detail ? (
                      <p className="text-sm text-muted-foreground">Ouverture…</p>
                    ) : (
                      <>
                        {detail.journees.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="text-left pr-3 font-medium">Date</th>
                                  <th className="text-left pr-3 font-medium">Type de journée</th>
                                  <th className="text-left pr-3 font-medium">Prises</th>
                                  <th className="text-left font-medium">Moments</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detail.journees.map((journee) => (
                                  <tr key={journee.journeeId}>
                                    <td className="pr-3 py-1">{journee.localDate}</td>
                                    <td className="pr-3 py-1">
                                      {LABELS_TYPE_JOURNEE[journee.typeJournee]}
                                    </td>
                                    <td className="pr-3 py-1">
                                      {journee.rienDeParticulier
                                        ? '—'
                                        : (journee.nombrePrises ?? '—')}
                                    </td>
                                    <td className="py-1">
                                      {journee.rienDeParticulier
                                        ? 'Rien de particulier'
                                        : journee.momentsObserves
                                            .map((m) => LABELS_MOMENT_PRISE[m])
                                            .join(' · ') || '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {detail.traces.length > 0 && (
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {detail.traces.map((trace) => (
                              <li key={trace.traceId}>
                                {trace.localDate} · {LABELS_ISSUE_TRACE[trace.issue]}
                                {trace.frictionCode
                                  ? ` · friction : ${FRICTIONS[trace.frictionCode]}`
                                  : ''}
                                {trace.motLibre ? ` — « ${trace.motLibre} »` : ''}
                              </li>
                            ))}
                          </ul>
                        )}

                        {detail.pauses.length > 0 && (
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {detail.pauses.map((pause) => (
                              <li key={pause.eventId}>
                                Semaine du {pause.semaineDu} · pause déclarée par le patient
                                {pause.motifCode ? ` — ${FRICTIONS[pause.motifCode]}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}

                        {detail.solutions.length > 0 && (
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {detail.solutions.map((solution) => (
                              <li key={solution.solutionId}>
                                Solution : {solution.labelPatient} — {solution.contexte}
                              </li>
                            ))}
                          </ul>
                        )}

                        {detail.plans.length > 0 && (
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {detail.plans.map((plan) => (
                              <li key={plan.eventId}>
                                {plan.from} · plan minimal de {plan.dureeJours} jour(s), activé par{' '}
                                {plan.activatedBy === 'patient' ? 'le patient' : 'le praticien'}
                              </li>
                            ))}
                          </ul>
                        )}

                        {detail.elementsEcartes > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {detail.elementsEcartes} élément(s) illisible(s), non affiché(s) — le
                            décompte ci-dessus les inclut.
                          </p>
                        )}

                        {detail.journees.length === 0
                          && detail.traces.length === 0
                          && detail.pauses.length === 0
                          && detail.plans.length === 0
                          && detail.solutions.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Cette transmission ne porte aucun élément lisible.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Comptes de ce qui a été transmis, sans interprétation. Une transmission patient
          n’alimente aucune dérivation clinique tant que vous n’avez pas activé de décision.
        </p>
      </section>

      {draftRestored && (
        <p className="rounded-lg px-4 py-2 text-base text-primary bg-primary/10" data-testid="ja-praticien-restored-info">
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

        {error && <p className="text-base text-status-danger">{error}</p>}

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
          <p className="text-base text-muted-foreground">Aucun constat direct pour l’instant.</p>
        ) : (
          <ul className="space-y-1 text-base text-foreground">
            {constats.map((constat) => (
              <li key={constat.code}>• {LABELS_CONSTATS_DIRECTS[constat.code]}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Ce bloc affichait trois phrases écrites en dur — « 3 prises principales,
          variabilité surtout le soir » — identiques pour tout patient, qu'il ait
          transmis vingt journées ou aucune. Le praticien y lisait une
          observation qui n'existait pas, au moment où il décide. Il ne rend plus
          que ce que le patient a effectivement décrit. */}
      <section className="bg-surface border border-border rounded-xl p-4 space-y-3" data-testid="ja-praticien-calibrage">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bilan de calibrage</h3>
        {journeesTransmises.length === 0 ? (
          <p className="text-base text-muted-foreground">
            Aucune journée décrite à ce jour.
          </p>
        ) : (
          <>
            <p className="text-base text-foreground">
              {couvertureTransmise.compte} journée(s) décrite(s),{' '}
              {couvertureTransmise.typesCouverts.length} type(s) de journée sur 4.
            </p>
            <p className="text-xs text-muted-foreground">
              D’après la transmission du {calibrage ? dateLocale(new Date(calibrage.createdAt)) : '—'}.
            </p>
            {couvertureTransmise.typesAbsents.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Non décrites à ce jour :{' '}
                {couvertureTransmise.typesAbsents.map((t) => LABELS_TYPE_JOURNEE[t]).join(', ')}.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Ouvrez une transmission ci-dessus pour lire le détail de chaque journée.
            </p>
          </>
        )}
      </section>

      <section className="bg-surface border border-border rounded-xl p-4 space-y-2" data-testid="ja-praticien-moments-explorer">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">3 moments à explorer</h3>
        <ul className="space-y-1 text-base text-foreground">
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
            <option value="">Aucune assiette proposée</option>
            {C5B_RECOMMENDED_PLATES.map((assiette) => (
              <option key={assiette.plateCode} value={assiette.plateCode}>{assiette.label}</option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          Catalogue {C5B_RECOMMENDED_PLATES[0].catalogVersion}. Aucune famille clinique de substitution
          n’est validée dans cette version : ne rien proposer reste le choix par défaut.
        </p>

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
          Préparer la décision
        </button>

        {reviewSummary && (
          <p className="text-base text-foreground rounded-lg border border-border px-3 py-2" data-testid="ja-praticien-review-summary">
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
          <p className="text-base text-muted-foreground">Aucune trace praticien enregistrée.</p>
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
