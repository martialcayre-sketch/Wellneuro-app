'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { TITRE_DOCUMENT_MEDECIN } from '@/components/patient/document-medecin/textesDocumentMedecin';

// Le lien vers « Pour votre médecin » ([[D-307]] §3, F38), dans la navigation
// « Autres espaces » du hub. Patron de `LienCourrierMedecin` : la route décide,
// par son mode `?interrupteur=1`, sans qu'aucun contenu ne voyage.
//
// DEUX CONDITIONS : la surface est ouverte, ET un document est à remettre.
// FAIL-CLOSED : tant que la sonde n'a pas répondu oui aux deux, le lien
// n'existe pas.

export function LienPourVotreMedecin({ token }: { token: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/document-medecin?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean; disponible?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true && data.disponible === true) setVisible(true);
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
    <a href={`/portail/${token}/pour-votre-medecin`} className={patientButtonClassName('ghost')}>
      {TITRE_DOCUMENT_MEDECIN}
    </a>
  );
}
