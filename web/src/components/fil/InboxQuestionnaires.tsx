'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { InboxQuestionnairesApiResponse } from '@/app/api/praticien/inbox-questionnaires/route';
import { libelleTemporel } from '@/lib/fil/horodatage';

/** Inbox des questionnaires en attente de consultation (accueil Observatoire
 * LOT-02) : une ligne PAR PATIENT — nombre, dernière date, derniers titres —
 * jamais une ligne par questionnaire. Remplace les cartes « Reçu » du Fil
 * (décision propriétaire 2026-07-23). */
export function InboxQuestionnaires() {
  const [data, setData] = useState<InboxQuestionnairesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/praticien/inbox-questionnaires')
      .then(async r => (await r.json()) as InboxQuestionnairesApiResponse)
      .then(setData)
      .catch(() => setData({ ok: false, lignes: [], unavailable: true }))
      .finally(() => setLoading(false));
  }, []);

  const maintenant = new Date();

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
            <Link
              key={ligne.idPatient}
              href={`/dashboard/patients/${ligne.idPatient}`}
              className="group rounded-lg border border-border px-3 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
