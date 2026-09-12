'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * CONSIGNE LA LECTURE D'UN TYPE DE CARTE À L'ATTERRISSAGE — rien à l'écran.
 *
 * Monté par la fiche patient UNIQUEMENT quand l'URL porte le marqueur de
 * provenance du Fil (`?fil=geste_objectif`), déjà validé au serveur. Le geste
 * du praticien est donc complet : il a cliqué la carte, il a atterri sur la
 * phase où la parole se lit — la carte a fait son travail et peut s'effacer.
 *
 * UN SEUL ENVOI PAR MONTAGE. `useRef` plutôt qu'un état : en mode strict de
 * développement, React monte deux fois, et deux lectures seraient écrites pour
 * un seul atterrissage. La table est chaînée, cela ne casserait rien — mais
 * elle raconterait une lecture qui n'a pas eu lieu.
 *
 * L'ÉCHEC EST SILENCIEUX, ET C'EST LE BON SENS DE L'ÉCHEC. Si la lecture ne
 * s'écrit pas, la carte reste au Fil : le praticien la retrouvera demain, ce
 * qui est exactement l'état d'avant ce lot. Une bannière rouge sur la fiche
 * pour un acquittement raté ferait du bruit pour une régression invisible.
 */
export function ConsignerLectureFil({
  idPatient,
  typeCarte,
  urlPropre,
}: {
  idPatient: string;
  typeCarte: string;
  /** La même page, sans le marqueur — pour qu'un F5 ne réécrive pas. */
  urlPropre: string;
}) {
  const router = useRouter();
  const envoye = useRef(false);

  useEffect(() => {
    if (envoye.current) return;
    envoye.current = true;
    void (async () => {
      try {
        await fetch('/api/praticien/fil/lecture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idPatient, typeCarte, lue: true }),
        });
      } catch {
        // Voir plus haut : sans lecture consignée, la carte reste au Fil.
      }
      // LE MARQUEUR PART DANS TOUS LES CAS. Le laisser ferait d'un onglet
      // rouvert, d'un signet ou d'un F5 une seconde lecture — et l'échec
      // n'appelle pas davantage une nouvelle tentative : le Fil, lui, est
      // resté juste.
      router.replace(urlPropre, { scroll: false });
    })();
  }, [idPatient, typeCarte, urlPropre, router]);

  return null;
}
