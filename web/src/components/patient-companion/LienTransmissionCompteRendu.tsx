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

export function LienTransmissionCompteRendu({
  token,
  onSonde,
  sondeSeule = false,
}: {
  token: string;
  onSonde?: (ouvert: boolean) => void;
  /** Sonde et rapporte sans rendre de lien : le hub rend la liste ([[D-423]] §2, lot L2). */
  sondeSeule?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/comptes-rendus', { cache: 'no-store' });
        const data = (await res.json()) as { ok?: boolean };
        const ouvert = res.ok && data.ok === true;
        if (!vivant) return;
        if (ouvert) setVisible(true);
        onSonde?.(ouvert);
      } catch {
        // Silence délibéré, même motif que `LienCourrierMedecin`.
        if (vivant) onSonde?.(false);
      }
    })();
    return () => {
      vivant = false;
    };
    // `onSonde` est lu au montage seulement, comme la sonde elle-même.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible || sondeSeule) return null;

  return (
    <a href={`/portail/${token}/comptes-rendus`} className={patientButtonClassName('ghost')}>
      Transmettre un compte rendu d’analyses
    </a>
  );
}
