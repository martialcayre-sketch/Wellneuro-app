'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { LIEN_MES_ECHANGES } from '@/components/patient/mes-echanges/textesMesEchanges';

// Le lien vers « Mes échanges » ([[D-293]]), dans la navigation « Autres
// espaces » du hub (arbitrage du 2026-10-18 : un accès permanent, jamais une
// tâche du fil). Patron de `LienCourrierMedecin` : la route décide, par son mode
// `?interrupteur=1`, sans qu'aucune donnée du dossier ne voyage.
//
// FAIL-CLOSED : tant que la sonde n'a pas répondu « ouvert », le lien n'existe pas.

export function LienMesEchanges({ token, onSonde }: { token: string; onSonde?: (ouvert: boolean) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/echanges?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
        const ouvert = res.ok && data.ok === true && data.ouvert === true;
        if (!vivant) return;
        if (ouvert) setVisible(true);
        onSonde?.(ouvert);
      } catch {
        // Silence délibéré, même motif que `LienFichesRemises`.
        if (vivant) onSonde?.(false);
      }
    })();
    return () => {
      vivant = false;
    };
    // `onSonde` est lu au montage seulement, comme la sonde elle-même.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <a href={`/portail/${token}/echanges`} className={patientButtonClassName('ghost')}>
      {LIEN_MES_ECHANGES}
    </a>
  );
}
