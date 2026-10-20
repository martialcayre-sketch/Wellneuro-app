'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PortailEchangesResponse } from '@/app/api/portail/echanges/route';
import { LIBELLE_SENS, libelleAfficheDepuis, regrouperParJour, type EntreeEchange } from '@/lib/portail/mesEchanges';
import { EncartUrgenceSuicide } from '@/components/patient/EncartUrgenceSuicide';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import {
  AUCUN_ECHANGE,
  BLOCS_MES_ECHANGES,
  BLOCS_MES_ECHANGES_DEPOT_OUVERT,
  CHARGEMENT_MES_ECHANGES,
  TITRE_MES_ECHANGES,
} from './textesMesEchanges';

// « Mes échanges » ([[D-293]]) : le journal daté, en lecture. Patron de
// `CourrierMedecinLecture` : la route garde l'accès et le drapeau ; 401 renvoie
// au portail, 403, 404 et 409 (dossier hors majeur) sont définitifs, le reste
// se réessaie.
//
// L'ENCART D'URGENCE EST RENDU SANS CONDITION, avant tout état de chargement
// ([[D-293]] §3) : une panne de la route ne peut pas le faire disparaître.
//
// Rien ne s'écrit d'ici : chaque ligne est un lien vers la page qui porte
// l'élément ; c'est elle qui consigne la lecture, et la date ([[D-297]]).
//
// `depotOuvert` vient de la page (serveur), qui lit `WN_PORTAIL_DEPOT_DOCUMENTS` :
// ouvert, le bloc « Ce que vous trouvez ici » nomme les documents déposés
// ([[D-330]], ACT-4).

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string; definitif: boolean }
  | { statut: 'pret'; entrees: EntreeEchange[] };

export function MesEchangesJournal({ token, depotOuvert = false }: { token: string; depotOuvert?: boolean }) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const annuleRef = useRef(false);

  const charger = useCallback(async () => {
    setEtat({ statut: 'chargement' });
    try {
      const res = await fetch('/api/portail/echanges', { cache: 'no-store' });
      if (annuleRef.current) return;
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as PortailEchangesResponse;
      if (annuleRef.current) return;
      if (!data.ok) {
        setEtat({ statut: 'erreur', message: data.error, definitif: res.status === 403 || res.status === 404 || res.status === 409 });
        return;
      }
      if (!Array.isArray(data.entrees)) {
        setEtat({ statut: 'erreur', message: 'Réponse inattendue. Réessayez.', definitif: false });
        return;
      }
      setEtat({ statut: 'pret', entrees: data.entrees });
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
    <article className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{TITRE_MES_ECHANGES}</h1>
      <EncartUrgenceSuicide ecran="mes_echanges" />

      {etat.statut === 'chargement' && (
        <PatientCard padding="sm">
          <p className="text-sm text-muted-foreground">{CHARGEMENT_MES_ECHANGES}</p>
        </PatientCard>
      )}
      {etat.statut === 'erreur' && (
        <PatientCard padding="sm">
          <PatientErrorState message={etat.message} onReessayer={etat.definitif ? undefined : () => void charger()} />
        </PatientCard>
      )}
      {etat.statut === 'pret' &&
        (etat.entrees.length === 0 ? (
          <PatientCard padding="sm">
            <p className="text-base text-foreground">{AUCUN_ECHANGE}</p>
          </PatientCard>
        ) : (
          <PatientCard>
            <ol aria-label={TITRE_MES_ECHANGES} className="space-y-5">
              {regrouperParJour(etat.entrees).map(jour => (
                <li key={jour.jour}>
                  <h2 className="text-sm font-semibold text-muted-foreground">{jour.libelle}</h2>
                  <ul className="mt-2 divide-y divide-border">
                    {jour.entrees.map(entree => (
                      <li key={entree.cle}>
                        <a
                          href={`/portail/${token}/${entree.chemin}`}
                          className="flex items-center justify-between gap-3 py-2 text-base text-foreground hover:underline"
                        >
                          <span>
                            <span className="font-semibold">{LIBELLE_SENS[entree.sens]}</span> · {entree.objet}
                            {/* Surface ouverte après la remise (t14) : le fait reste à son jour, la ligne dit depuis quand il se voit. */}
                            {entree.afficheDepuis && (
                              <span className="block text-sm text-muted-foreground">
                                {libelleAfficheDepuis(entree.afficheDepuis, new Date())}
                              </span>
                            )}
                          </span>
                          <span aria-hidden="true" className="text-muted-foreground">
                            ›
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </PatientCard>
        ))}

      <PatientCard>
        <div className="space-y-4">
          {(depotOuvert ? BLOCS_MES_ECHANGES_DEPOT_OUVERT : BLOCS_MES_ECHANGES).map(bloc => (
            <section key={bloc.titre}>
              <h2 className="text-base font-semibold text-foreground">{bloc.titre}</h2>
              <p className="mt-1 text-base text-foreground">{bloc.texte}</p>
            </section>
          ))}
        </div>
      </PatientCard>
    </article>
  );
}
