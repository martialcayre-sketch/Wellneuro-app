'use client';

import { useEffect, useState } from 'react';
import type { VignetteConstat } from '@/lib/constats-besoin/vignette';

// La lecture des vignettes du constat sur un besoin ([[D-551]]). Hors du rendu
// de la vue : l'hydratation ne la déclenche pas, elle part dans un effet, et
// seulement si le drapeau `WN_CONSTAT_BESOIN` est allumé — la page le lit au
// serveur et le passe ; le client ne lit jamais l'environnement. Drapeau éteint,
// aucune requête. Un échec de lecture rend `null` : aucune vignette, jamais un
// « aucun constat » inventé ni un message d'erreur sur un écran de lecture.

const ROUTE = '/api/praticien/besoins/vignettes';

export type VignettesParBesoin = Readonly<Record<number, VignetteConstat>>;

// `relecture` : un compteur que la fiche incrémente après un geste sur un constat ; il relance la lecture.
export function useVignettesConstats(idPatient: string, actif: boolean, relecture = 0): VignettesParBesoin | null {
  const [vignettes, setVignettes] = useState<VignettesParBesoin | null>(null);

  // Un autre dossier (ou un drapeau éteint) ne montre jamais la vignette du précédent,
  // même un instant. Une RELECTURE, elle, garde l'ancienne valeur jusqu'à la réponse :
  // le tableau ne saute pas après un geste.
  useEffect(() => {
    setVignettes(null);
  }, [idPatient, actif]);

  useEffect(() => {
    if (!actif) return;
    // Un changement de dossier ou de drapeau abandonne la lecture en vol : seule
    // la dernière s'applique.
    let courante = true;
    (async () => {
      try {
        const res = await fetch(`${ROUTE}?idPatient=${encodeURIComponent(idPatient)}`);
        const corps = (await res.json().catch(() => null)) as
          | { ok: true; vignettes: Record<number, VignetteConstat> }
          | { ok: false }
          | null;
        if (!courante) return;
        setVignettes(res.ok && corps && corps.ok ? corps.vignettes : null);
      } catch {
        if (courante) setVignettes(null);
      }
    })();
    return () => {
      courante = false;
    };
  }, [idPatient, actif, relecture]);

  return vignettes;
}
