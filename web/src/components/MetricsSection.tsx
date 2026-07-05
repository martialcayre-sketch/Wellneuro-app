'use client';

import { useEffect, useState } from 'react';
import type { MetricsResponse } from '@/app/api/praticien/metrics/route';
import { MetricCard, MetricCardSkeleton } from '@/components/ui/MetricCard';

export function MetricsSection() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/praticien/metrics')
      .then(async r => {
        const json = (await r.json()) as MetricsResponse;
        if (!r.ok && !json.reason) {
          return {
            patients: null,
            questionnairesEnCours: null,
            synthesiesIA: null,
            bookletsEnvoyes: null,
            unavailable: true,
            reason: 'exception',
          } satisfies MetricsResponse;
        }
        return json;
      })
      .then((json: MetricsResponse) => setData(json))
      .catch(() =>
        setData({
          patients: null,
          questionnairesEnCours: null,
          synthesiesIA: null,
          bookletsEnvoyes: null,
          unavailable: true,
          reason: 'exception',
        })
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    );
  }

  if (data?.unavailable) {
    const reasonText: Record<NonNullable<MetricsResponse['reason']>, string> = {
      unauthenticated: 'Session expirée. Déconnectez-vous puis reconnectez-vous.',
      exception: 'Erreur technique côté serveur. Vérifiez le terminal Next.js.',
    };

    const message = data.reason ? reasonText[data.reason] : 'Cause inconnue.';

    return (
      <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground">
        Métriques indisponibles.{' '}
        <span className="text-muted-foreground">
          {message}
        </span>
      </div>
    );
  }

  const fmt = (v: number | null) => (v !== null ? v : '—');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <MetricCard label="Patients" value={fmt(data?.patients ?? null)} />
      <MetricCard
        label="Questionnaires en cours"
        value={fmt(data?.questionnairesEnCours ?? null)}
      />
      <MetricCard label="Synthèses IA" value={fmt(data?.synthesiesIA ?? null)} />
      <MetricCard label="Booklets envoyés" value={fmt(data?.bookletsEnvoyes ?? null)} />
    </div>
  );
}
