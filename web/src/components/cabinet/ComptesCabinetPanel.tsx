'use client';

import { useEffect, useState } from 'react';
import type { ComptesCabinetApiResponse } from '@/app/api/praticien/comptes-cabinet/route';
import type {
  ComptesCabinet,
  EtapeCompte,
  EtatProtocoleCompte,
  TableauComptes,
} from '@/lib/praticien/comptesCabinet';

// Les comptes du cabinet ([[D-385]]) : deux tableaux, chacun avec son
// effectif. Le serveur a déjà masqué ([[D-298]]) : l'écran rend ce qu'il
// reçoit, il ne recompte rien et ne nomme aucun dossier. Trois états
// distincts, patron de Trajectoires : chargement, erreur (jamais déguisée en
// cabinet vide), vide.
//
// Imports de TYPES seulement : le chargeur rejoue les dossiers par Prisma, et
// rien de lui ne doit entrer dans le paquet client.
//
// Chaque texte de cette page a été validé mot pour mot par le responsable le
// 2026-10-29. Les libellés des sept phases sont ceux du rail de la fiche
// (`PHASES`, `FichePatientPanel`) — un banc les tient égaux.

export const LIBELLES_ETAPES: Record<EtapeCompte, string> = {
  patient: 'Patient',
  donnees: 'Données fiables',
  comprehension: 'Compréhension',
  decision: 'Décision 21 j',
  actions: 'Actions',
  suivi: 'Suivi',
  reevaluation: 'Réévaluation',
  rien_n_attend: 'Rien n’attend',
  indetermine: 'Indéterminé',
};

export const LIBELLES_PROTOCOLE: Record<EtatProtocoleCompte, string> = {
  sans_protocole: 'Sans protocole diffusé',
  cycle_en_cours: 'Protocole diffusé, cycle en cours',
  fin_de_cycle: 'À la fin de leur cycle',
  indetermine: 'Indéterminé',
};

function libelleEffectif(effectif: number): string {
  return effectif === 1 ? 'Effectif : 1 dossier' : `Effectif : ${effectif} dossiers`;
}

function TableauDesComptes<K extends string>({
  titre,
  note,
  tableau,
  libelles,
}: {
  titre: string;
  note?: string;
  tableau: TableauComptes<K>;
  libelles: Record<K, string>;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-card">
      <h3 className="font-display text-xl font-semibold text-foreground">{titre}</h3>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      <p className="text-base font-medium text-foreground">{libelleEffectif(tableau.effectif)}</p>
      {tableau.repartitionMasquee && (
        <p className="text-sm text-muted-foreground">
          Répartition masquée (moins de cinq dossiers sur au moins une ligne).
        </p>
      )}
      <table className="w-full border-collapse text-base">
        <caption className="sr-only">{titre}</caption>
        <thead>
          <tr className="border-b border-border">
            <td />
            <th scope="col" className="py-2 text-right font-medium text-muted-foreground">
              Dossiers
            </th>
          </tr>
        </thead>
        <tbody>
          {tableau.lignes.map(ligne => (
            <tr key={ligne.cle} className="border-b border-border last:border-b-0">
              <th scope="row" className="py-2 pr-4 text-left font-normal text-foreground">
                {libelles[ligne.cle]}
              </th>
              <td className="py-2 text-right tabular-nums text-foreground">
                {ligne.compte === 'masqué' ? <span className="text-muted-foreground">masqué</span> : ligne.compte}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function ComptesCabinetPanel() {
  const [comptes, setComptes] = useState<ComptesCabinet | null>(null);
  const [etat, setEtat] = useState<'chargement' | 'charge' | 'erreur'>('chargement');

  useEffect(() => {
    let annule = false;
    fetch('/api/praticien/comptes-cabinet')
      .then(r => r.json())
      .then((payload: ComptesCabinetApiResponse) => {
        if (annule) return;
        if (!payload?.ok) {
          setEtat('erreur');
          return;
        }
        setComptes(payload.comptes);
        setEtat('charge');
      })
      .catch(() => {
        if (!annule) setEtat('erreur');
      });
    return () => {
      annule = true;
    };
  }, []);

  if (etat === 'chargement') {
    return (
      <div role="status" className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
        Comptage des dossiers en cours… Cela peut prendre quelques secondes.
      </div>
    );
  }

  // Une erreur de lecture n'est JAMAIS présentée comme un cabinet vide.
  if (etat === 'erreur' || !comptes) {
    return (
      <div role="alert" className="rounded-xl border border-accent bg-status-warning/10 p-4 text-base text-status-warning">
        Les comptes n’ont pas pu être établis (erreur technique ou session expirée). Aucun compte n’est affiché.
      </div>
    );
  }

  if (comptes.prochaineEtape.effectif === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
        Aucun dossier dans le cabinet pour l’instant.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <TableauDesComptes
          titre="Prochaine étape"
          note="Même calcul que « Prochaine étape » sur la fiche patient."
          tableau={comptes.prochaineEtape}
          libelles={LIBELLES_ETAPES}
        />
        <TableauDesComptes titre="Protocole" tableau={comptes.protocole} libelles={LIBELLES_PROTOCOLE} />
      </div>
      <p className="text-sm text-muted-foreground">
        Indéterminé : l’état du dossier n’a pas pu être établi. Il n’est compté nulle part ailleurs.
      </p>
    </div>
  );
}
