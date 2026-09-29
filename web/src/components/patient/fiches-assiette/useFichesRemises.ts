'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PortailFichesAssietteResponse } from '@/app/api/portail/fiches-assiette/route';
import type { FicheRemiseServie } from '@/lib/fiches-assiette/ficheServie';

// Le chargement partagé par la liste et par la page d'une fiche : une seule
// route, `api/portail/fiches-assiette`, qui garde l'accès et le drapeau. Même
// traitement des réponses que `MonBilan` : 401 renvoie au portail, 403 est
// définitif, le reste se réessaie.

export type EtatFiches =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string; definitif: boolean }
  | { statut: 'pret'; fiches: FicheRemiseServie[] };

export function useFichesRemises(token: string): { etat: EtatFiches; recharger: () => void } {
  const router = useRouter();
  const [etat, setEtat] = useState<EtatFiches>({ statut: 'chargement' });
  const annuleRef = useRef(false);

  const charger = useCallback(async () => {
    setEtat({ statut: 'chargement' });
    try {
      const res = await fetch('/api/portail/fiches-assiette', { cache: 'no-store' });
      if (annuleRef.current) return;
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as PortailFichesAssietteResponse;
      if (annuleRef.current) return;
      if (!data.ok) {
        // 403 (compte refusé) et 503 (espace fermé) ne se règlent pas en
        // réessayant : pas de bouton qui ne mènerait nulle part.
        setEtat({ statut: 'erreur', message: data.error, definitif: res.status === 403 || res.status === 503 });
        return;
      }
      if (!('fiches' in data)) {
        setEtat({ statut: 'erreur', message: 'Réponse inattendue. Réessayez.', definitif: false });
        return;
      }
      setEtat({ statut: 'pret', fiches: data.fiches });
    } catch {
      if (annuleRef.current) return;
      setEtat({ statut: 'erreur', message: 'Connexion interrompue. Vérifiez votre connexion et réessayez.', definitif: false });
    }
  }, [token, router]);

  useEffect(() => {
    annuleRef.current = false;
    void charger();
    return () => {
      annuleRef.current = true;
    };
  }, [charger]);

  return { etat, recharger: () => void charger() };
}
