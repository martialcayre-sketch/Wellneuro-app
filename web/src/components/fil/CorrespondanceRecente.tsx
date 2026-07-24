'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CorrespondanceRecentesApiResponse } from '@/app/api/praticien/correspondance-medecin/recentes/route';
import { libelleTemporel } from '@/lib/fil/horodatage';

const LIBELLE_SENS = { sortant: 'Envoi consigné', entrant: 'Réponse transcrite' } as const;

/** Panneau « Correspondance récente » de l'aside (accueil Observatoire
 * LOT-02) : dernières consignations d'échanges médecin (C3 LOT-06). Le
 * courrier ne part jamais d'ici — la consignation vit sur la fiche patient ;
 * ce panneau est une fenêtre, pas une messagerie. */
export function CorrespondanceRecente() {
  const [data, setData] = useState<CorrespondanceRecentesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/praticien/correspondance-medecin/recentes')
      .then(async r => (await r.json()) as CorrespondanceRecentesApiResponse)
      .then(setData)
      .catch(() => setData({ ok: false, lignes: [], nbRecentes7j: 0, unavailable: true }))
      .finally(() => setLoading(false));
  }, []);

  const maintenant = new Date();

  return (
    <section
      data-testid="correspondance-recente"
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <h3 className="font-display text-lg font-semibold text-foreground">Correspondance récente</h3>

      {loading ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : !data || data.unavailable ? (
        <p className="mt-3 text-sm text-muted-foreground">
          La correspondance est momentanément indisponible. Rechargez la page.
        </p>
      ) : data.lignes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aucune consignation pour l&apos;instant — le fil de correspondance se consigne depuis la
          fiche patient.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-1.5">
          {data.lignes.map(ligne => (
            <Link
              key={ligne.id}
              href={`/dashboard/patients/${ligne.idPatient}`}
              className="rounded-lg border border-border px-3 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {ligne.patient}
                </span>
                <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                  {libelleTemporel(ligne.consigneLe, maintenant).texte}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {LIBELLE_SENS[ligne.sens]} — {ligne.medecinLibelle} · {ligne.extrait}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
