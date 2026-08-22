'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';

// Le lien vers le « dossier à deux voix » (Alliance 6.0-A, LOT-06), posé dans
// la navigation « Autres espaces » du hub du portail.
//
// POURQUOI UNE SONDE ET PAS UNE LECTURE DIRECTE : le hub est un composant
// CLIENT, et `WN_DOSSIER_DEUX_VOIX` n'est pas `NEXT_PUBLIC_*` — elle est absente
// du bundle navigateur. C'est donc la route qui décide de la visibilité du lien,
// par son mode `?interrupteur=1` : deux `findMany` en moins, aucun texte
// clinique transporté pour être jeté, et surtout aucun événement « un texte a
// été SERVI » émis pour une page que personne n'a ouverte (revue LOT-04, M3).
//
// FAIL-CLOSED : tant que la sonde n'a pas répondu OUI, le lien n'existe pas.
// Une erreur réseau, un 503 ou une réponse illisible laissent la navigation
// telle qu'elle était — jamais un lien vers un écran qui rendra `notFound()`.
//
// CE COMPOSANT EST DANS LA NAV DU HUB, ET PAS DANS `PatientCompanionHome` :
// celui-ci est replié dans un `<details>` fermé par défaut ET placé après un
// retour anticipé qui exige un protocole diffusé. Un patient sans protocole n'y
// verrait jamais ce lien — l'écran serait livré et jamais ouvert.

export function LienDossierDeuxVoix({ token }: { token: string }) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/dossier?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true) setOuvert(true);
      } catch {
        // Silence délibéré : la surface reste fermée. Afficher un message
        // d'erreur pour une surface que le patient ne connaît pas encore
        // l'informerait d'une panne sur une page qui n'existe pas pour lui.
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!ouvert) return null;

  return (
    <a href={`/portail/${token}/dossier`} className={patientButtonClassName('ghost')}>
      Ouvrir mon dossier à deux voix
    </a>
  );
}
