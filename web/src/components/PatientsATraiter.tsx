'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PatientsApiResponse } from '@/app/api/praticien/patients/route';
import { Badge } from '@/components/ui/Badge';

const MAX_LIGNES = 8;

type LigneATraiter = {
  idPatient: string;
  nomComplet: string;
  titre: string;
  statut: string;
  dateAssignation: string;
};

/**
 * Liste courte des patients ayant au moins un questionnaire en attente
 * (assignation non « Complété »). Dérivée de l'API praticien/patients :
 * aucune route nouvelle. Chaque ligne mène à la fiche patient.
 */
export function PatientsATraiter() {
  const [lignes, setLignes] = useState<LigneATraiter[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/praticien/patients')
      .then(async r => {
        const json = (await r.json()) as PatientsApiResponse;
        if (!r.ok || json.unavailable) {
          setErreur(true);
          return;
        }
        const nomParPatient = new Map(
          json.patients.map(p => [p.idPatient, `${p.prenom} ${p.nom}`.trim()]),
        );
        const enAttente = json.assignations
          .filter(a => a.statut !== 'Complété')
          .map(a => ({
            idPatient: a.idPatient,
            nomComplet: nomParPatient.get(a.idPatient) ?? a.emailPatient,
            titre: a.titre,
            statut: a.statut,
            dateAssignation: a.dateAssignation,
          }));
        setLignes(enAttente);
      })
      .catch(() => setErreur(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-5 animate-pulse h-32 shadow-sm" />
    );
  }

  if (erreur) {
    return (
      <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground">
        Liste des patients à traiter indisponible. Réessayez plus tard.
      </div>
    );
  }

  if (!lignes || lignes.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4 text-sm text-muted-foreground shadow-sm">
        Aucun questionnaire en attente. Tout est à jour ✨
      </div>
    );
  }

  const affichees = lignes.slice(0, MAX_LIGNES);
  const reste = lignes.length - affichees.length;

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm divide-y divide-border">
      {affichees.map(l => (
        <Link
          key={`${l.idPatient}-${l.titre}-${l.dateAssignation}`}
          href={`/dashboard/patients/${l.idPatient}`}
          className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50 transition first:rounded-t-xl last:rounded-b-xl"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{l.nomComplet}</p>
            <p className="text-xs text-muted-foreground truncate">{l.titre}</p>
          </div>
          <Badge variant={l.statut === 'En attente' ? 'warning' : 'neutral'}>
            {l.statut}
          </Badge>
        </Link>
      ))}
      <Link
        href="/dashboard/patients"
        className="block px-5 py-3 text-sm text-primary hover:underline last:rounded-b-xl"
      >
        {reste > 0 ? `Voir tous les patients (+${reste})` : 'Voir tous les patients'} →
      </Link>
    </div>
  );
}
