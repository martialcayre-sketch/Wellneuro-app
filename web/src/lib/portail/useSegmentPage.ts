'use client';

import { useParams } from 'next/navigation';

// LE SEGMENT DE LA PAGE, LU PAR UN COMPOSANT SANS PROP ([[D-481]], DOC-14).
//
// Le segment `[token]` de `/portail/<segment>` n'authentifie rien (LOT-04) ; il
// sert ici à une seule chose : l'en-tête `x-wn-dossier-page` que la garde
// serveur compare à l'`idPatient` de la session (`enTeteDossierPage`). Un
// composant qui ne reçoit pas le segment en prop le lit par ce crochet.
//
// Il ne sert JAMAIS de clé de stockage local : les clés de l'appareil sont
// indexées par l'`idPatient` (`portail-identite-locale.guard.test.ts`).
// Hors d'une page `/portail/[token]` (banc, aperçu praticien), il rend
// `undefined` : l'envoi part sans en-tête, et la route le refuse.
export function useSegmentPage(): string | undefined {
  const params = useParams<{ token?: string }>();
  return params?.token;
}
