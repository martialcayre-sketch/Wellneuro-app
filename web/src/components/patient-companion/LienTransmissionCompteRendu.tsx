'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';

// Le lien vers « Transmettre un compte rendu d'analyses » ([[D-269]], LOT-04),
// dans la navigation « Autres espaces » du hub. Patron de `LienCourrierMedecin` :
// la route décide. UNE CONDITION, la surface ouverte : le patient doit pouvoir
// déposer son premier document, et relire ensuite le statut des précédents —
// même sur un suivi clos.
//
// FAIL-CLOSED : tant que la route n'a pas répondu `ok`, le lien n'existe pas.

export function LienTransmissionCompteRendu({ token }: { token: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/comptes-rendus', { cache: 'no-store' });
        const data = (await res.json()) as { ok?: boolean };
        if (vivant && res.ok && data.ok === true) setVisible(true);
      } catch {
        // Silence délibéré, même motif que `LienCourrierMedecin`.
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!visible) return null;

  return (
    <a href={`/portail/${token}/comptes-rendus`} className={patientButtonClassName('ghost')}>
      Transmettre un compte rendu d’analyses
    </a>
  );
}
