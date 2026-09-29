'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { TITRE_ESPACE } from '@/components/patient/fiches-assiette/textesFiches';

// Le lien vers « Fiches remises par mon praticien » ([[D-251]] §8, lot 10),
// dans la navigation « Autres espaces » du hub. Même patron que
// `LienDossierDeuxVoix` : la route décide, par son mode `?interrupteur=1`, sans
// qu'aucun texte de fiche ne voyage ni qu'aucun contrôle ne soit rejoué.
//
// DEUX CONDITIONS, comme « Consulter mon bilan » : la surface est ouverte, ET au
// moins une fiche a été remise. Un patient sans fiche ne voit pas de porte vers
// un espace vide.
//
// FAIL-CLOSED : tant que la sonde n'a pas répondu oui aux deux, le lien
// n'existe pas.

export function LienFichesRemises({ token }: { token: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/fiches-assiette?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean; fichesRemises?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true && data.fichesRemises === true) setVisible(true);
      } catch {
        // Silence délibéré, même motif que `LienDossierDeuxVoix`.
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!visible) return null;

  return (
    <a href={`/portail/${token}/fiches`} className={patientButtonClassName('ghost')}>
      {TITRE_ESPACE}
    </a>
  );
}
