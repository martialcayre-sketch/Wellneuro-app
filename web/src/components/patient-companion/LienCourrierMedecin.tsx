'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { TITRE_LETTRE } from '@/components/patient/lettre-adressage/textesLettre';

// Le lien vers « Courrier pour votre médecin » ([[D-262]], LOT-03a), dans la
// navigation « Autres espaces » du hub. Patron de `LienFichesRemises` : la route
// décide, par son mode `?interrupteur=1`, sans qu'aucun texte ne voyage.
//
// DEUX CONDITIONS : la surface est ouverte, ET un courrier a été remis.
// FAIL-CLOSED : tant que la sonde n'a pas répondu oui aux deux, le lien
// n'existe pas.

export function LienCourrierMedecin({ token, onSonde }: { token: string; onSonde?: (ouvert: boolean) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/lettre-adressage?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean; lettreRemise?: boolean };
        const ouvert = res.ok && data.ok === true && data.ouvert === true && data.lettreRemise === true;
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
    <a href={`/portail/${token}/courrier-medecin`} className={patientButtonClassName('ghost')}>
      {TITRE_LETTRE}
    </a>
  );
}
