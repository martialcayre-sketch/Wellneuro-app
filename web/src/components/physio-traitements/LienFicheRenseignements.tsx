'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';

// Le lien vers « Ma fiche de renseignements » ([[D-335]]), dans la navigation
// du hub. Patron de `LienDepotDocuments` : la route décide, par son mode
// `?interrupteur=1`, sans qu'aucune donnée du dossier ne voyage.
//
// FAIL-CLOSED : tant que la sonde n'a pas répondu « ouvert », le lien n'existe pas.

export function LienFicheRenseignements({ token, onSonde }: { token: string; onSonde?: (ouvert: boolean) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/physio-traitements?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
        const ouvert = res.ok && data.ok === true && data.ouvert === true;
        if (!vivant) return;
        if (ouvert) setVisible(true);
        onSonde?.(ouvert);
      } catch {
        // Silence délibéré, même motif que `LienDepotDocuments`.
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
    <a href={`/portail/${token}/renseignements`} className={patientButtonClassName('ghost')}>
      Ma fiche de renseignements
    </a>
  );
}
