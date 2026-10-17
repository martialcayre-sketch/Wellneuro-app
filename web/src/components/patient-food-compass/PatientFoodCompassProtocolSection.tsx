'use client';

import { useEffect, useState } from 'react';
import type { PatientFoodCompassSafeView } from '@/lib/food-compass/patientSafe';
import { PatientFoodCompassSummary, type BoussoleEnPause } from './PatientFoodCompassSummary';

export function PatientFoodCompassProtocolSection({ token }: { token: string }) {
  const [items, setItems] = useState<PatientFoodCompassSafeView[]>([]);
  const [enPause, setEnPause] = useState<BoussoleEnPause[]>([]);

  useEffect(() => {
    let mounted = true;
    setItems([]);
    setEnPause([]);
    const load = async () => {
      try {
        const response = await fetch('/api/portail/protocole', { cache: 'no-store' });
        const payload = await response.json() as {
          ok: boolean;
          protocoleDiffuse?: boolean;
          vue?: { boussoles?: PatientFoodCompassSafeView[] } | null;
          boussolesEnPause?: BoussoleEnPause[];
        };
        if (mounted && response.ok && payload.ok && payload.protocoleDiffuse) {
          setItems(payload.vue?.boussoles ?? []);
          setEnPause(payload.boussolesEnPause ?? []);
        }
      } catch {
        if (mounted) {
          setItems([]);
          setEnPause([]);
        }
      }
    };
    void load();
    return () => { mounted = false; };
  }, [token]);

  return <PatientFoodCompassSummary token={token} items={items} enPause={enPause} />;
}
