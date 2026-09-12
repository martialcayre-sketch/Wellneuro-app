'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';

// Le lien vers « Ce qui compte pour moi » (Alliance 6.0-A, LOT-03), posé dans
// la navigation « Autres espaces » du hub du portail.
//
// L'ÉCRAN EXISTAIT ET N'AVAIT AUCUNE PORTE. `/portail/<token>/ce-qui-compte`
// était atteignable depuis le dossier à deux voix — lui-même derrière un lien
// de la même nav — et de nulle part ailleurs. Un patient qui n'ouvrait pas son
// dossier ne savait pas que l'écran existait.
//
// POURQUOI UNE SONDE ET PAS UNE LECTURE DIRECTE : le hub est un composant
// CLIENT, et `WN_CE_QUI_COMPTE` n'est pas `NEXT_PUBLIC_*` — elle est absente du
// bundle navigateur. C'est donc la route qui décide de la visibilité du lien.
// Son GET ne sert QUE d'interrupteur : il ne transporte aucun texte de patient.
//
// FAIL-CLOSED : tant que la sonde n'a pas répondu OUI, le lien n'existe pas.
// Une erreur réseau, un 503 ou une réponse illisible laissent la navigation
// telle qu'elle était — jamais un lien vers un écran qui rendra `notFound()`.
//
// LA FENÊTRE DE DÉPÔT N'EST PAS CONSULTÉE ICI, et c'est délibéré. `D-166` ferme
// le dépôt à une fois par cycle ; masquer la porte hors fenêtre ferait
// disparaître l'écran sans rien dire, là où la page, elle, sait expliquer
// pourquoi le dépôt est clos. Une porte qui s'explique vaut mieux qu'une porte
// qui s'efface (`DC-24`).

export function LienCeQuiCompte({ token }: { token: string }) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/ce-qui-compte');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true) setOuvert(true);
      } catch {
        // Silence délibéré : la surface reste fermée. Annoncer une panne sur une
        // page que le patient ne connaît pas encore l'informerait d'un incident
        // sur un écran qui n'existe pas pour lui.
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!ouvert) return null;

  return (
    <a href={`/portail/${token}/ce-qui-compte`} className={patientButtonClassName('ghost')}>
      Dire ce qui compte pour moi
    </a>
  );
}
