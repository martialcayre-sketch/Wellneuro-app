'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { CarteFicheRemise } from '@/components/patient/fiches-assiette/CarteFicheRemise';
import { useFichesRemises } from '@/components/patient/fiches-assiette/useFichesRemises';
import type { PortailBibliothequeResponse } from '@/app/api/portail/bibliotheque/route';
import { TITRE_BIBLIOTHEQUE, TITRE_RAYON_REMIS } from './textesBibliotheque';

// « Ma bibliothèque » ([[D-357]], lettre ap) : le contenant seul. La route de
// la bibliothèque dit si elle est servie au dossier et quels rayons ont
// quelque chose à montrer ; chaque rayon lit ses documents par leur propre
// route.
//
// UN RAYON VIDE NE S'AFFICHE PAS (§2). Le socle commun n'a encore aucun
// document : il ne se rend pas. Le rayon des documents remis porte les fiches
// d'assiette déjà remises, sans changer leur régime ([[D-251]]) : chaque carte
// renvoie à la page de la fiche, dont l'ouverture acquitte la lecture.
//
// Aucun texte d'état neuf : les messages viennent des routes ou de l'espace des
// fiches, déjà servis.

type EtatSonde =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string; definitif: boolean }
  | { statut: 'pret'; fichesRemises: boolean };

export function Bibliotheque({ token }: { token: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<EtatSonde>({ statut: 'chargement' });
  const annuleRef = useRef(false);

  const charger = useCallback(async () => {
    setEtat({ statut: 'chargement' });
    try {
      const res = await fetch('/api/portail/bibliotheque', { cache: 'no-store' });
      if (annuleRef.current) return;
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as PortailBibliothequeResponse;
      if (annuleRef.current) return;
      if (!data.ok) {
        // 403 (compte refusé), 404 (fermée) et 409 (dossier hors majeur) ne se
        // règlent pas en réessayant.
        setEtat({ statut: 'erreur', message: data.error, definitif: [403, 404, 409].includes(res.status) });
        return;
      }
      setEtat({ statut: 'pret', fichesRemises: data.fichesRemises === true });
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

  return (
    <div className="space-y-4">
      <PatientCard padding="sm">
        <PatientPageHeader title={TITRE_BIBLIOTHEQUE} />
      </PatientCard>
      {etat.statut === 'erreur' && (
        <PatientCard padding="sm">
          <PatientErrorState message={etat.message} onReessayer={etat.definitif ? undefined : () => void charger()} />
        </PatientCard>
      )}
      {etat.statut === 'pret' && etat.fichesRemises && <RayonRemis token={token} />}
    </div>
  );
}

// Le rayon des documents remis ([[D-357]] §1) : monté seulement quand la route
// en a annoncé, pour ne lire les fiches que s'il y en a.
function RayonRemis({ token }: { token: string }) {
  const { etat, recharger } = useFichesRemises(token);

  if (etat.statut === 'pret' && etat.fiches.length === 0) return null;

  return (
    <section aria-labelledby="rayon-remis" className="space-y-3">
      <h2 id="rayon-remis" className="font-display text-lg font-bold text-foreground">
        {TITRE_RAYON_REMIS}
      </h2>
      {etat.statut === 'chargement' && (
        <PatientCard padding="sm">
          <p className="text-sm text-muted-foreground">Chargement de vos fiches…</p>
        </PatientCard>
      )}
      {etat.statut === 'erreur' && (
        <PatientCard padding="sm">
          <PatientErrorState message={etat.message} onReessayer={etat.definitif ? undefined : recharger} />
        </PatientCard>
      )}
      {etat.statut === 'pret' && (
        <ul className="space-y-3">
          {etat.fiches.map(fiche => (
            <li key={fiche.idRemise}>
              <CarteFicheRemise token={token} fiche={fiche} niveauTitre="h3" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
