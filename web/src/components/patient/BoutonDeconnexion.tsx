'use client';

import { useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';

// « Se déconnecter » du portail patient.
//
// Il arrive avec la session de 30 jours et n'a de sens qu'avec elle : tant que
// la session se fermait seule en 12 h, l'ordinateur familial se nettoyait tout
// seul le soir. Ce n'est plus le cas.
//
// Le composant ne DÉCIDE pas de sa visibilité — c'est le layout du portail qui
// ne le rend qu'en présence d'une session valide. Ainsi la page de connexion,
// qui est la cible de la déconnexion, n'affiche jamais un bouton qui la
// renverrait sur elle-même (et sa référence visuelle reste intacte).
export function BoutonDeconnexion() {
  const [enCours, setEnCours] = useState(false);

  async function deconnecter() {
    setEnCours(true);
    try {
      await fetch('/api/portail/deconnexion', { method: 'POST' });
    } catch {
      // Réseau coupé : on redirige quand même. La page de connexion relit le
      // cookie côté serveur et dira la vérité — mieux vaut y aller que laisser
      // le patient sur un écran qui prétend l'avoir déconnecté sans preuve.
    }
    // `location.assign` et non `router.push` : on veut que le navigateur
    // reparte du serveur avec le cookie effacé, sans réutiliser le cache
    // client d'un rendu fait pendant que la session vivait encore.
    window.location.assign('/portail/connexion');
  }

  return (
    <PatientButton
      variant="neutral"
      onClick={deconnecter}
      loading={enCours}
      loadingLabel="Déconnexion…"
      className="print:hidden"
    >
      Se déconnecter
    </PatientButton>
  );
}
