'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { MeteoAdhesionApiResponse } from '@/app/api/praticien/meteo-adhesion/route';
import { BadgeMeteo } from '@/components/meteo/BadgeMeteo';

const MAX_LIGNES = 8;

/** Panneau « Météo d'adhésion » de l'aside (maquette Spirale, accueil
 * Observatoire LOT-02). Réutilise l'agrégat SP-MET calculé à la lecture —
 * jamais persisté, jamais un score, jamais montré aux patients. */
export function MeteoAdhesionAside() {
  const [data, setData] = useState<MeteoAdhesionApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/praticien/meteo-adhesion')
      .then(async r => (await r.json()) as MeteoAdhesionApiResponse)
      .then(setData)
      .catch(() => setData({ ok: false, determinees: [], nbIndeterminees: 0, unavailable: true }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section
      data-testid="meteo-adhesion-aside"
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">Météo d&apos;adhésion</h3>
        <span className="text-xs text-muted-foreground">Jamais montrée aux patients</span>
      </div>

      {loading ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-7 animate-pulse rounded-lg bg-muted" />
          <div className="h-7 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : !data || data.unavailable ? (
        <p className="mt-3 text-sm text-muted-foreground">
          La Météo est momentanément indisponible. Rechargez la page.
        </p>
      ) : data.determinees.length === 0 && data.nbIndeterminees === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          La Météo se remplira avec les points d&apos;étape J7/J14/J21 des protocoles en cours.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {data.determinees.slice(0, MAX_LIGNES).map(ligne => (
            <div key={ligne.idPatient} className="flex items-center justify-between gap-2">
              <Link
                href={`/dashboard/patients/${ligne.idPatient}`}
                className="min-w-0 truncate text-sm text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {ligne.patient}
              </Link>
              <BadgeMeteo etat={ligne.etat} />
            </div>
          ))}
          {data.determinees.length > MAX_LIGNES && (
            <Link
              href="/dashboard/patients"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              et {data.determinees.length - MAX_LIGNES} autres patients
            </Link>
          )}
          {/* L'abstention est visible, jamais reclassée (invariant SP-MET). */}
          {data.nbIndeterminees > 0 && (
            <p className="text-xs text-muted-foreground">
              {data.nbIndeterminees} patient{data.nbIndeterminees > 1 ? 's' : ''} sans point
              d&apos;étape exploitable
            </p>
          )}
        </div>
      )}

      <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
        Signal typé à cause observable citée — jamais un score de risque chiffré, jamais une
        prédiction.
      </p>
    </section>
  );
}
