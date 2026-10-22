'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';

// Le lien vers « Ma fiche de renseignements » ([[D-335]]), dans la navigation
// du hub. Patron de `LienDepotDocuments` : la route décide, par son mode
// `?interrupteur=1`, sans qu'aucune donnée du dossier ne voyage.
//
// FAIL-CLOSED : tant que la sonde n'a pas répondu « ouvert », le lien n'existe pas.

export function LienFicheRenseignements({ token }: { token: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/physio-traitements?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true) setVisible(true);
      } catch {
        // Silence délibéré, même motif que `LienDepotDocuments`.
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!visible) return null;

  return (
    <a href={`/portail/${token}/renseignements`} className={patientButtonClassName('ghost')}>
      Ma fiche de renseignements
    </a>
  );
}
