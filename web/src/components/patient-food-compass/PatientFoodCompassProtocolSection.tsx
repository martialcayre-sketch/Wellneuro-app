'use client';

import { useEffect, useState } from 'react';
import type { PatientFoodCompassSafeView } from '@/lib/food-compass/patientSafe';
import { PatientFoodCompassSummary } from './PatientFoodCompassSummary';

export function PatientFoodCompassProtocolSection({ token }: { token: string }) {
  const [items, setItems] = useState<PatientFoodCompassSafeView[]>([]);

  useEffect(() => {
    let mounted = true;
    setItems([]);
    const load = async () => {
      try {
        const response = await fetch('/api/portail/protocole', { cache: 'no-store' });
        const payload = await response.json() as {
          ok: boolean;
          protocoleDiffuse?: boolean;
          vue?: { boussoles?: PatientFoodCompassSafeView[] } | null;
        };
        if (mounted && response.ok && payload.ok && payload.protocoleDiffuse) {
          setItems(payload.vue?.boussoles ?? []);
        }
      } catch {
        if (mounted) setItems([]);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [token]);

  return <PatientFoodCompassSummary token={token} items={items} />;
}
