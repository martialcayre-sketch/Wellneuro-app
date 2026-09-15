'use client';

import { ESPECES_MESUREES, type EspeceMesuree } from './ouvertureSources';

// L'ENVOI D'UNE MESURE, DEPUIS LE NAVIGATEUR — et son échec, qui ne se voit pas.
//
// FAIL-OPEN, SANS EXCEPTION ([[D-146]]). Ce que ce module mesure est la surface
// qui porte la provenance et les limitations d'une décision clinique. Une mesure
// qui empêcherait de la lire, ou qui ferait remonter une erreur par-dessus,
// serait un renversement complet de l'ordre des choses. Rien n'est attendu, rien
// n'est affiché, et toute erreur est avalée ici — y compris un rejet réseau, que
// `fetch` rend par une promesse REJETÉE et non par un `ok: false`.
//
// AUCUNE RELANCE. Un incrément perdu déplace un quotient à la marge ; un
// incrément rejoué le fausse dans le sens qui flatte. Entre les deux, on perd.

export { ESPECES_MESUREES };
export type { EspeceMesuree };

const ROUTE = '/api/praticien/mesure/ouverture-sources';

export function envoyerMesure(espece: EspeceMesuree): void {
  try {
    void fetch(ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ espece }),
      // `keepalive` : l'affichage part au montage, et le praticien peut quitter
      // la fiche aussitôt. Sans lui, le navigateur annule la requête en vol et
      // le DÉNOMINATEUR sous-compte — ce qui gonflerait le taux d'ouverture.
      keepalive: true,
    }).catch(() => {});
  } catch {
    // `fetch` absent (rendu serveur, banc sans navigateur) : il n'y a rien à
    // mesurer et rien à signaler.
  }
}
