'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Focus après un « Réessayer » (PRA-6h, arbitrage du responsable
 * 20261118-2228-d). Le bouton se démonte pendant la relecture : sans rien
 * faire, le focus retombe sur `body` et le lecteur d'écran perd sa place.
 *
 * - La relecture échoue encore : le bouton est rendu de nouveau, le focus y
 *   revient.
 * - Elle réussit : le focus va au TITRE du panneau rechargé, rendu focusable
 *   par programme (`tabIndex={-1}` sur l'élément qui porte `titreRef`).
 *
 * Aucun texte : le titre existe déjà. Un panneau sans titre visible ne reçoit
 * pas de titre neuf — le focus reste alors au bouton s'il existe.
 */
export function useFocusApresRelecture<T extends HTMLElement = HTMLHeadingElement>() {
  const titreRef = useRef<T | null>(null);
  const boutonRef = useRef<HTMLButtonElement | null>(null);
  const [aRendre, setARendre] = useState(0);

  useEffect(() => {
    if (aRendre === 0) return;
    (boutonRef.current ?? titreRef.current)?.focus();
  }, [aRendre]);

  const relire = useCallback(async (charger: () => unknown) => {
    try {
      await charger();
    } finally {
      setARendre(n => n + 1);
    }
  }, []);

  return { titreRef, boutonRef, relire };
}
