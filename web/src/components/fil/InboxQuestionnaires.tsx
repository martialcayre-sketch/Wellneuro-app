'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCheck, ExternalLink, Eye, X } from 'lucide-react';
import type { InboxQuestionnairesApiResponse } from '@/app/api/praticien/inbox-questionnaires/route';
import { libelleTemporel } from '@/lib/fil/horodatage';
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';

type DetailState = {
  idPatient: string;
  patient: string;
  payload: InboxQuestionnairesApiResponse | null;
  loading: boolean;
  error: string;
};

function valeurLisible(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === '') return '—';
  if (typeof valeur === 'string' || typeof valeur === 'number' || typeof valeur === 'boolean') return String(valeur);
  return JSON.stringify(valeur);
}

function ReponsesBrutes({ rawAnswers }: { rawAnswers: Record<string, unknown> | null }) {
  const entrees = rawAnswers ? Object.entries(rawAnswers) : [];
  if (entrees.length === 0) {
    return <p className="text-sm text-muted-foreground">Réponses brutes non disponibles pour ce questionnaire.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <tbody>
          {entrees.map(([cle, valeur]) => (
            <tr key={cle} className="border-t border-border first:border-t-0">
              <th className="w-32 bg-muted px-3 py-2 text-left font-mono text-xs text-muted-foreground">{cle}</th>
              <td className="px-3 py-2 text-foreground">{valeurLisible(valeur)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Inbox des questionnaires en attente de consultation (accueil Observatoire
 * LOT-02) : une ligne PAR PATIENT — nombre, dernière date, derniers titres —
 * jamais une ligne par questionnaire. Remplace les cartes « Reçu » du Fil
 * (décision propriétaire 2026-07-23). */
export function InboxQuestionnaires() {
  const [data, setData] = useState<InboxQuestionnairesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [saving, setSaving] = useState(false);

  const chargerInbox = useCallback(async () => {
    setLoading(true);
    await fetch('/api/praticien/inbox-questionnaires')
      .then(async r => (await r.json()) as InboxQuestionnairesApiResponse)
      .then(setData)
      .catch(() => setData({ ok: false, lignes: [], unavailable: true }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void chargerInbox();
  }, [chargerInbox]);

  const ouvrirDetail = async (idPatient: string, patient: string) => {
    setDetail({ idPatient, patient, payload: null, loading: true, error: '' });
    try {
      const reponse = await fetch(`/api/praticien/inbox-questionnaires?idPatient=${encodeURIComponent(idPatient)}`);
      const payload = (await reponse.json()) as InboxQuestionnairesApiResponse;
      if (!reponse.ok || !payload.ok) {
        setDetail({ idPatient, patient, payload: null, loading: false, error: payload.error ?? 'Lecture impossible.' });
        return;
      }
      setDetail({ idPatient, patient: payload.patient?.nom ?? patient, payload, loading: false, error: '' });
    } catch {
      setDetail({ idPatient, patient, payload: null, loading: false, error: 'Lecture impossible.' });
    }
  };

  const confirmerLecture = async () => {
    if (!detail?.payload?.reponses || detail.payload.reponses.length === 0) return;
    setSaving(true);
    const idsReponses = detail.payload.reponses.map(r => r.idReponse);
    try {
      const reponse = await fetch('/api/praticien/inbox-questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient: detail.idPatient, idsReponses }),
      });
      const payload = (await reponse.json()) as InboxQuestionnairesApiResponse;
      if (!reponse.ok || !payload.ok) {
        setDetail(d => d ? { ...d, error: payload.error ?? 'Confirmation impossible.' } : d);
        return;
      }
      setDetail(null);
      await chargerInbox();
    } catch {
      setDetail(d => d ? { ...d, error: 'Confirmation impossible.' } : d);
    } finally {
      setSaving(false);
    }
  };

  const maintenant = new Date();
  const reponsesDetail = detail?.payload?.reponses ?? [];

  return (
    <section
      data-testid="inbox-questionnaires"
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">Inbox questionnaires</h3>
        {data && !data.unavailable && data.lignes.length > 0 && (
          <span className="font-mono text-13 text-muted-foreground">
            {data.lignes.reduce((somme, l) => somme + l.nb, 0)}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">En attente de consultation</p>

      {loading ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : !data || data.unavailable ? (
        <p className="mt-3 text-sm text-muted-foreground">
          L&apos;inbox est momentanément indisponible. Rechargez la page.
        </p>
      ) : data.lignes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun questionnaire en attente — tout a été vu en consultation.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-1.5">
          {data.lignes.map(ligne => (
            <button
              key={ligne.idPatient}
              type="button"
              onClick={() => void ouvrirDetail(ligne.idPatient, ligne.patient)}
              className="group rounded-lg border border-border px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {ligne.patient}
                </span>
                <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                  {ligne.nb} · {libelleTemporel(ligne.derniereDate, maintenant).texte}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {ligne.titres.join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}
      <Dialog.Root open={detail !== null} onOpenChange={open => { if (!open) setDetail(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 bg-foreground/35" />
          <Dialog.Content
            data-theme="praticien"
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[86dvh] w-[min(920px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-pop focus:outline-none"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">Lecture questionnaires</p>
                <Dialog.Title className="font-display text-xl font-bold text-foreground">
                  {detail?.patient ?? 'Patient'}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  Questionnaires en attente de lecture praticien.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Fermer la lecture des questionnaires"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <X aria-hidden="true" size={20} strokeWidth={2} />
                </button>
              </Dialog.Close>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {detail?.loading ? (
                <div className="flex flex-col gap-2">
                  <div className="h-24 animate-pulse rounded-lg bg-muted" />
                  <div className="h-24 animate-pulse rounded-lg bg-muted" />
                </div>
              ) : detail?.error ? (
                <p role="alert" className="rounded-lg border border-border bg-muted px-4 py-3 text-base text-foreground">
                  {detail.error}
                </p>
              ) : reponsesDetail.length === 0 ? (
                <p className="rounded-lg border border-border bg-muted px-4 py-3 text-base text-muted-foreground">
                  Aucun questionnaire ne reste en attente pour ce patient.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {reponsesDetail.map(reponse => {
                    const miniSynthese = buildMiniSynthese(reponse.scoresParsed);
                    return (
                      <article key={reponse.idReponse} className="rounded-lg border border-border bg-background p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-display text-lg font-semibold text-foreground">{reponse.titre}</h4>
                            <p className="font-mono text-xs text-muted-foreground">
                              {new Date(reponse.dateSoumission).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
                            {reponse.scorePrincipal !== null ? `Score ${reponse.scorePrincipal}` : 'Sans score principal'}
                          </span>
                        </div>
                        {reponse.interpretation && (
                          <p className="mt-2 text-sm font-medium text-foreground">{reponse.interpretation}</p>
                        )}
                        {miniSynthese && (
                          <p className="mt-2 text-sm italic text-foreground/80">Synthèse : {miniSynthese}</p>
                        )}
                        <div className="mt-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">
                            Réponses enregistrées
                          </p>
                          <ReponsesBrutes rawAnswers={reponse.rawAnswers} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
              <Link
                href={detail ? `/dashboard/patients/${encodeURIComponent(detail.idPatient)}?onglet=trajectoire` : '#'}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <ExternalLink aria-hidden="true" size={16} />
                Ouvrir la fiche-trajectoire
              </Link>
              <button
                type="button"
                onClick={() => void confirmerLecture()}
                disabled={saving || reponsesDetail.length === 0 || Boolean(detail?.loading)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {saving ? <Eye aria-hidden="true" size={16} /> : <CheckCheck aria-hidden="true" size={16} />}
                {saving ? 'Confirmation...' : 'Confirmer la lecture'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
