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

export function LienMesEchanges({ token }: { token: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/echanges?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true) setVisible(true);
      } catch {
        // Silence délibéré, même motif que `LienFichesRemises`.
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!visible) return null;

  return (
    <a href={`/portail/${token}/echanges`} className={patientButtonClassName('ghost')}>
      {LIEN_MES_ECHANGES}
    </a>
  );
}
