'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DocumentRemis, DocumentsRemisResponse } from '@/app/api/praticien/documents-remis/route';
import { libelleLecture } from '@/lib/portail/lectureDatee';

/*
 * « DOCUMENTS REMIS » ([[D-297]] §5, encart arbitré le 2026-10-18).
 *
 * Chaque version remise au patient, la plus récente en haut : son nom, le jour
 * de sa remise et, s'il a été enregistré, celui de sa première lecture —
 * « Lu le JJ/MM/AAAA », « Lu, date non enregistrée » ou RIEN.
 *
 * Ce que l'encart ne dit pas, délibérément : ni « non lu », ni nombre
 * d'ouvertures, ni total de documents en attente. L'absence de lecture n'est
 * pas un constat sur le patient (`DC-19`/`DC-20`) ; aucune alerte ni relance
 * n'en découle (§5).
 */

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur' }
  | { statut: 'charge'; documents: DocumentRemis[] };

function jourDeRemise(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `Remis le ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' })}`;
}

export function DocumentsRemisPanel({ idPatient }: { idPatient: string }) {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });

  const charger = useCallback(async () => {
    setEtat({ statut: 'chargement' });
    try {
      const res = await fetch(`/api/praticien/documents-remis?idPatient=${encodeURIComponent(idPatient)}`);
      const data = (await res.json()) as DocumentsRemisResponse;
      setEtat(res.ok && data.ok ? { statut: 'charge', documents: data.documents } : { statut: 'erreur' });
    } catch {
      setEtat({ statut: 'erreur' });
    }
  }, [idPatient]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-base font-semibold text-foreground">Documents remis</h3>

      {etat.statut === 'chargement' && <p className="mt-2 text-sm text-muted-foreground">Chargement…</p>}

      {/* Une lecture en échec ne se rend jamais comme une liste vide. */}
      {etat.statut === 'erreur' && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Les documents remis n’ont pas pu être lus.</span>
          <button
            type="button"
            onClick={() => void charger()}
            className="min-h-9 rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Réessayer la lecture des documents remis
          </button>
        </div>
      )}

      {etat.statut === 'charge' && etat.documents.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">Aucun document remis à ce patient.</p>
      )}

      {etat.statut === 'charge' && etat.documents.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {etat.documents.map(remis => {
            const lecture = libelleLecture(remis);
            return (
              <li key={`${remis.espece}:${remis.idObjet}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                <span className="min-w-0 text-sm font-medium text-foreground">{remis.libelle}</span>
                <span className="text-sm text-muted-foreground">{jourDeRemise(remis.remisLe)}</span>
                {lecture && <span className="text-sm text-foreground">{lecture}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
