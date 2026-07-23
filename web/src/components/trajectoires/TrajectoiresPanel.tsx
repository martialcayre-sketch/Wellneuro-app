'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LigneCabinet } from '@/lib/praticien/chargementCabinet';
import { rattacherReperesAuxCycles } from '@/lib/protocol/trajectoire';
import { resumerTrajectoire } from '@/lib/protocol/resumeTrajectoire';
import { SpiraleEpisodes } from '@/components/ui/SpiraleEpisodes';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

// Porte d'entrée « Trajectoires » (SP-TRAJ LOT-04, maquette 5.0) : la liste
// des patients ORIENTÉE TRAJECTOIRE — Spirale miniature, épisode en cours,
// dernier jalon mesuré, prochaine échéance — chaque ligne ouvrant la fiche
// directement sur l'onglet Trajectoire (deep-link LOT-01). Rien d'inventé :
// sans épisode confirmé, la ligne dit « T0 à confirmer » (A8-2). Trois états
// distincts : chargement, erreur (jamais déguisée en liste vide), vide.

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TrajectoiresPanel() {
  const [lignes, setLignes] = useState<LigneCabinet[]>([]);
  const [etat, setEtat] = useState<'chargement' | 'chargee' | 'erreur'>('chargement');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    let annule = false;
    fetch('/api/praticien/trajectoires')
      .then((r) => r.json())
      .then((payload: { ok?: boolean; lignes?: LigneCabinet[] }) => {
        if (annule) return;
        if (!payload?.ok) {
          setEtat('erreur');
          return;
        }
        setLignes(payload.lignes ?? []);
        setEtat('chargee');
      })
      .catch(() => {
        if (!annule) setEtat('erreur');
      });
    return () => {
      annule = true;
    };
  }, []);

  const lignesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return lignes;
    return lignes.filter((ligne) =>
      `${ligne.prenom} ${ligne.nom} ${ligne.email}`.toLowerCase().includes(terme),
    );
  }, [lignes, recherche]);

  if (etat === 'chargement') {
    return (
      <div role="status" className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
        Chargement des trajectoires...
      </div>
    );
  }

  // Une erreur de lecture n'est JAMAIS présentée comme un cabinet vide.
  if (etat === 'erreur') {
    return (
      <div role="alert" className="rounded-xl border border-accent bg-status-warning/10 p-4 text-base text-status-warning">
        Les trajectoires n’ont pas pu être lues (erreur technique ou session expirée). Aucune liste n’est affichée.
      </div>
    );
  }

  if (lignes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
        Aucun patient dans le cabinet pour l’instant. Créez un patient depuis « Questionnaires &amp; packs ».
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-xs">
        <Input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un patient..."
          aria-label="Rechercher un patient"
        />
      </div>

      <ul className="flex flex-col gap-2">
        {lignesFiltrees.map((ligne) => {
          const reperes = rattacherReperesAuxCycles(ligne.trajectoire.index, ligne.trajectoire.cycles);
          const resume = resumerTrajectoire(ligne.trajectoire, new Date());
          const nomComplet = `${ligne.prenom} ${ligne.nom}`.trim();
          return (
            <li key={ligne.idPatient}>
              <Link
                href={`/dashboard/patients/${encodeURIComponent(ligne.idPatient)}?onglet=trajectoire`}
                className="flex min-h-[64px] items-center gap-4 rounded-xl border border-border bg-surface p-3 shadow-card transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center">
                  {reperes.length > 0 ? (
                    <SpiraleEpisodes reperes={reperes} cycles={ligne.trajectoire.cycles} taille={44} />
                  ) : (
                    <span className="h-3 w-3 rounded-full border-2 border-border" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium text-foreground">{nomComplet}</span>
                  <span className="block truncate text-sm text-muted-foreground">{ligne.email}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  {/* L'état d'épisode reste visible sur mobile — seuls les
                      détails (jalon, échéance) se replient sous sm. */}
                  {resume.episodeEnCours ? (
                    <Badge variant="info">
                      Épisode {resume.episodeEnCours.numero} · T0 + {resume.episodeEnCours.positionJours} j
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Aucun épisode confirmé</Badge>
                  )}
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {resume.dernierJalonMesure
                      ? `Dernier jalon ${resume.dernierJalonMesure.jalon} · indice ${resume.dernierJalonMesure.valeur} · ${formatDate(resume.dernierJalonMesure.date)}`
                      : 'Aucun jalon mesuré'}
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {resume.prochaineEcheance
                      ? resume.prochaineEcheance.date
                        ? `Prochaine échéance : ${resume.prochaineEcheance.libelle} vers le ${formatDate(resume.prochaineEcheance.date)}`
                        : `Prochaine échéance : ${resume.prochaineEcheance.libelle}`
                      : 'Cycle complet : les 4 jalons sont mesurés'}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {lignesFiltrees.length === 0 && (
        <p className="text-base text-muted-foreground">Aucun patient ne correspond à la recherche.</p>
      )}
    </div>
  );
}
