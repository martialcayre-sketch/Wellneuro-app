'use client';

import { useEffect, useState } from 'react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';

// Le lien vers « Ce que j'ai compris de vous » (Alliance 6.0-A, LOT-04), posé
// dans la navigation « Autres espaces » du hub du portail.
//
// L'ÉCRAN N'ÉTAIT ATTEIGNABLE QUE PAR « MON ACCOMPAGNEMENT », REPLIÉ, ou par le
// dossier à deux voix. Un texte que le praticien a écrit POUR le patient, et
// qu'il faut deux gestes et un dépliage pour trouver, est un texte qui n'arrive
// pas.
//
// POURQUOI UNE SONDE : le hub est un composant CLIENT, `WN_COMPREHENSION` n'est
// pas `NEXT_PUBLIC_*`. Le mode `?interrupteur=1` de la route répond « ouvert »
// SANS lire ni transporter la moindre synthèse — pas de texte clinique servi
// pour être jeté, et aucun événement « un texte a été SERVI » émis pour une page
// que personne n'a ouverte (revue LOT-04, M3).
//
// FAIL-CLOSED : tant que la sonde n'a pas répondu OUI, le lien n'existe pas.
//
// LE LIEN NE DIT PAS S'IL Y A QUELQUE CHOSE À LIRE, et c'est voulu : le savoir
// demanderait de lire la synthèse, donc de la servir. La page sait dire
// « votre praticien n'a pas encore partagé » ; une porte qui s'explique vaut
// mieux qu'une porte qui s'efface (`DC-24`).

export function LienComprehension({ token }: { token: string }) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/comprehension?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true) setOuvert(true);
      } catch {
        // Silence délibéré : la surface reste fermée.
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (!ouvert) return null;

  return (
    <a href={`/portail/${token}/comprehension`} className={patientButtonClassName('ghost')}>
      Lire ce que mon praticien a compris
    </a>
  );
}
