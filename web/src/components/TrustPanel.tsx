'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { SignalementPraticien, TrustPraticienResponse } from '@/app/api/praticien/trust/route';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';

const LIBELLE_STATUT: Record<string, string> = {
  recu: 'Reçu',
  en_cours: 'En cours',
  traite: 'Traité',
  clos: 'Clos',
};
const BADGE_STATUT: Record<string, BadgeVariant> = {
  recu: 'warning',
  en_cours: 'info',
  traite: 'success',
  clos: 'neutral',
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/**
 * File praticien des signalements et demandes TRUST (LOT-03/04) : effets
 * indésirables (avec l'orientation produite par la règle versionnée),
 * incidents de confidentialité, demandes de droits. Les statuts évoluent,
 * rien ne se supprime.
 */
export function TrustPanel() {
  const [data, setData] = useState<TrustPraticienResponse | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch('/api/praticien/trust');
      setData((await res.json()) as TrustPraticienResponse);
    } catch {
      setData({ ok: false, error: 'Erreur réseau. Rechargez la page.' });
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const changerStatut = async (signalement: SignalementPraticien, statutTraitement: string) => {
    setEnCours(signalement.id);
    try {
      await fetch('/api/praticien/trust', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: signalement.kind, id: signalement.id, statutTraitement }),
      });
      await charger();
    } finally {
      setEnCours(null);
    }
  };

  if (!data) {
    return <div className="bg-surface rounded-xl border border-border p-5 animate-pulse h-32 shadow-sm" />;
  }
  if (!data.ok) {
    return (
      <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground">
        {data.error}
      </div>
    );
  }
  if (data.signalements.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 text-sm text-muted-foreground shadow-sm">
        Aucun signalement ni demande pour le moment. Les dépôts des patients (effets indésirables,
        incidents de confidentialité, demandes de droits) apparaîtront ici et dans le Fil.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.signalements.map(s => (
        <article key={s.id} className="bg-surface text-surface-foreground rounded-xl border border-border p-4 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="flex items-baseline gap-2 min-w-0">
              <Badge variant={BADGE_STATUT[s.statutTraitement] ?? 'neutral'}>
                {LIBELLE_STATUT[s.statutTraitement] ?? s.statutTraitement}
              </Badge>
              <Link href={`/dashboard/patients/${s.idPatient}`} className="text-sm font-semibold text-foreground hover:underline truncate">
                {s.patient}
              </Link>
            </div>
            <span className="text-xs text-muted-foreground">{formatDate(s.soumisLe)}</span>
          </div>
          <p className="text-sm text-foreground mt-2">{s.resume}</p>
          {s.detail && <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>}
          {s.orientation && (
            <p className="text-xs text-muted-foreground mt-1">
              Orientation donnée au patient : {s.orientation}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor={`statut-${s.id}`}>
              Statut de traitement
            </label>
            <select
              id={`statut-${s.id}`}
              value={s.statutTraitement}
              disabled={enCours === s.id}
              onChange={e => void changerStatut(s, e.target.value)}
              className="text-sm rounded-lg border border-border bg-surface px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {Object.entries(LIBELLE_STATUT).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>{libelle}</option>
              ))}
            </select>
          </div>
        </article>
      ))}
    </div>
  );
}
