'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { TITRE_BIBLIOTHEQUE } from '@/components/patient/bibliotheque/textesBibliotheque';

// Le lien vers « Ma bibliothèque » ([[D-357]], lettre ap), dans la navigation
// « Autres espaces » du hub. Patron de `LienMesEchanges` : la route décide,
// sans qu'aucun document ne voyage.
//
// DEUX CONDITIONS : la bibliothèque est servie au dossier (drapeau ouvert,
// dossier majeur), ET un rayon a quelque chose à montrer — aujourd'hui, une
// fiche remise ; le socle commun n'a encore aucun document. Pas de porte vers
// une page vide. Servi, il remplace le lien des fiches (`LienFichesRemises`,
// arbitrage du 2026-10-25).
//
// FAIL-CLOSED : tant que la sonde n'a pas répondu oui aux deux, le lien
// n'existe pas.

export function LienBibliotheque({ token }: { token: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/bibliotheque');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean; fichesRemises?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true && data.fichesRemises === true) setVisible(true);
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
    <a href={`/portail/${token}/bibliotheque`} className={patientButtonClassName('ghost')}>
      {TITRE_BIBLIOTHEQUE}
    </a>
  );
}
