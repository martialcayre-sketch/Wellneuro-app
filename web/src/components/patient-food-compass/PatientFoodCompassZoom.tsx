'use client';

import { useEffect, useState } from 'react';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import type { PatientFoodCompassSafeView } from '@/lib/food-compass/patientSafe';

export function PatientFoodCompassZoom({ foodRef }: { foodRef: string }) {
  const [view, setView] = useState<PatientFoodCompassSafeView | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/portail/boussole/${encodeURIComponent(foodRef)}`, { cache: 'no-store' });
        const payload = await response.json() as { ok: boolean; view?: PatientFoodCompassSafeView };
        if (!mounted) return;
        if (!response.ok || !payload.ok || !payload.view) {
          setMissing(true);
          return;
        }
        setView(payload.view);
      } catch {
        if (mounted) setMissing(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [foodRef]);

  if (loading) return <PatientInlineMessage tone="info">Lecture en cours…</PatientInlineMessage>;
  if (missing || !view) {
    return <PatientInlineMessage tone="info">Cette lecture alimentaire n’est pas disponible.</PatientInlineMessage>;
  }
  return (
    <PatientCard className="space-y-5">
      <PatientPageHeader title={view.foodLabel} subtitle={view.qualitativeSummary} />
      <section aria-labelledby="food-compass-reasons">
        <h2 id="food-compass-reasons" className="font-medium text-foreground">Pourquoi cette lecture ?</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {view.reasons.map(reason => <li key={reason}>{reason}</li>)}
        </ul>
      </section>
      <section aria-labelledby="food-compass-limits">
        <h2 id="food-compass-limits" className="font-medium text-foreground">À garder en tête</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {view.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}
        </ul>
      </section>
      {view.alternative && (
        <p className="text-sm text-foreground"><span className="font-medium">Alternative validée : </span>{view.alternative}</p>
      )}
      <p className="text-xs text-muted-foreground">Source : {view.sourceLabel}</p>
    </PatientCard>
  );
}
