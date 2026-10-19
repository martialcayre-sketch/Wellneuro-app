'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { LIEN_DEPOT } from '@/components/patient/collecte/textesDepot';

// Le lien vers « Déposer un document » ([[D-330]]), dans la navigation « Autres
// espaces » du hub. Patron de `LienMesEchanges` : la route décide, par son mode
// `?interrupteur=1`, sans qu'aucune donnée du dossier ne voyage.
//
// FAIL-CLOSED : tant que la sonde n'a pas répondu « ouvert », le lien n'existe pas.

export function LienDepotDocuments({ token }: { token: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/documents?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true) setVisible(true);
      } catch {
        // Silence délibéré, même motif que `LienMesEchanges`.
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!visible) return null;

  return (
    <a href={`/portail/${token}/documents`} className={patientButtonClassName('ghost')}>
      {LIEN_DEPOT}
    </a>
  );
}
