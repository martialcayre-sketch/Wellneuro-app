'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Vrai si personne n'a posé le focus ailleurs pendant la relecture (PRA-6h2,
 * P2 de la revue `wn-reviewer` de #2251) : il est retombé sur la page (le
 * bouton s'est démonté), ou il est resté sur un conteneur qui englobe `cible`.
 *
 * Le second cas est celui de WebKit : un clic n'y donne pas le focus à un
 * bouton, il le pose sur l'ancêtre focusable le plus proche — le
 * `<main id="contenu" tabIndex={-1}>` du tableau de bord, une zone focale.
 * Sans lui, Safari ne rendait jamais le focus (constaté en E2E iPhone 13).
 */
export function focusPerdu(cible?: Element | null): boolean {
  const actif = document.activeElement;
  if (!actif || actif === document.body) return true;
  return !!cible && actif !== cible && actif.contains(cible);
}

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
 *
 * Le focus n'est déplacé que s'il est perdu (sur `body`) : si le praticien
 * l'a posé ailleurs pendant la relecture, on ne le lui reprend pas (PRA-6h2).
 *
 * `titreExterne` : le titre appartient parfois au conteneur, pas au bloc relu
 * (en-tête de la fiche, zone focale) ; plusieurs relectures partagent alors un
 * même titre, porté par une seule ref.
 */
export function useFocusApresRelecture<T extends HTMLElement = HTMLHeadingElement>(
  titreExterne?: RefObject<T>,
) {
  const titrePropre = useRef<T | null>(null);
  const titreRef: RefObject<T> = titreExterne ?? titrePropre;
  const boutonRef = useRef<HTMLButtonElement | null>(null);
  const [aRendre, setARendre] = useState(0);

  useEffect(() => {
    const cible = boutonRef.current ?? titreRef.current;
    if (aRendre === 0 || !cible || !focusPerdu(cible)) return;
    cible.focus();
    // `titreRef` est une ref, stable : seul `aRendre` relance l'effet.
  }, [aRendre, titreRef]);

  const relire = useCallback(async (charger: () => unknown) => {
    try {
      await charger();
    } finally {
      setARendre(n => n + 1);
    }
  }, []);

  return { titreRef, boutonRef, relire };
}
