'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { TITRE_COURRIER_COMPLEMENT } from '@/components/patient/courrier-complement/textesCourrierComplement';

// Le lien vers « Courrier à remettre à votre médecin » ([[D-345]], J3-12h
// lot 4), dans la navigation « Autres espaces » du hub. Patron de
// `LienCourrierMedecin` : la route décide, par son mode `?interrupteur=1`, sans
// qu'aucun texte ne voyage.
//
// DEUX CONDITIONS : la surface est ouverte, ET un courrier a été remis.
// FAIL-CLOSED : tant que la sonde n'a pas répondu oui aux deux, le lien
// n'existe pas.

export function LienCourrierComplement({ token }: { token: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/courrier-complement?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean; courrierRemis?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true && data.courrierRemis === true) setVisible(true);
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
    <a href={`/portail/${token}/courrier-complement`} className={patientButtonClassName('ghost')}>
      {TITRE_COURRIER_COMPLEMENT}
    </a>
  );
}
