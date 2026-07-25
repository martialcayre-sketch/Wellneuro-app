'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EpisodeAgenda } from '@/app/api/praticien/agenda-sommeil/route';
import type { AgregatsAgenda } from '@/lib/agenda-sommeil/agregats';
import { NB_JOURS_AGENDA } from '@/lib/agenda-sommeil/types';
import { ChronogrammeSommeil } from './ChronogrammeSommeil';

// Panneau praticien de l'agenda du sommeil : détail nuit par nuit + agrégats
// (avec chiffres) + clôture manuelle. Le score global et son interprétation
// restent affichés par le tableau des réponses standard (la clôture y crée une
// QuestionnaireReponse Q_SOM_09) ; ce panneau montre la matière brute.

function minutesEnHeures(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

function Tuile({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-xs text-muted-foreground">{libelle}</p>
      <p className="text-base font-semibold text-foreground tabular-nums">{valeur}</p>
    </div>
  );
}

function TuilesAgregats({ a }: { a: AgregatsAgenda }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Tuile libelle="Sommeil moyen" valeur={minutesEnHeures(a.AGD_TST_MOY)} />
      <Tuile libelle="Efficacité" valeur={`${a.AGD_EFF_MOY} %`} />
      <Tuile libelle="Endormissement médian" valeur={`${a.AGD_LAT_MED} min`} />
      <Tuile libelle="Réveils / nuit" valeur={`${a.AGD_REV_MOY}`} />
      <Tuile libelle="Régularité" valeur={`± ${a.AGD_REG_ECT} min`} />
      <Tuile libelle="Nuits notées" valeur={`${a.AGD_NB_NUITS} / ${NB_JOURS_AGENDA}`} />
    </div>
  );
}

export function AgendaSommeilPraticienPanel({ idPatient }: { idPatient: string }) {
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement');
  const [episodes, setEpisodes] = useState<EpisodeAgenda[]>([]);
  const [message, setMessage] = useState('');
  const [clotureEnCours, setClotureEnCours] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setEtat('chargement');
    try {
      const res = await fetch(`/api/praticien/agenda-sommeil?idPatient=${encodeURIComponent(idPatient)}`);
      const json = (await res.json()) as { ok: boolean; episodes?: EpisodeAgenda[]; error?: string };
      if (!json.ok || !json.episodes) {
        setMessage(json.error ?? 'Chargement impossible.');
        setEtat('erreur');
        return;
      }
      setEpisodes(json.episodes);
      setEtat('pret');
    } catch {
      setMessage('Connexion interrompue.');
      setEtat('erreur');
    }
  }, [idPatient]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function cloturer(idAssignation: string) {
    setClotureEnCours(idAssignation);
    try {
      const res = await fetch('/api/praticien/agenda-sommeil/cloture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, idAssignation }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) setMessage(json.error ?? 'Clôture impossible.');
      else await charger();
    } catch {
      setMessage('Connexion interrompue.');
    } finally {
      setClotureEnCours(null);
    }
  }

  if (etat === 'chargement') {
    return <p className="text-sm text-muted-foreground">Chargement de l’agenda du sommeil…</p>;
  }
  if (etat === 'erreur') {
    return <p className="text-sm text-status-danger">{message}</p>;
  }
  if (episodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun agenda du sommeil assigné à ce patient. Assignez l’instrument « Agenda du sommeil — 21 nuits ».
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {message && <p className="text-sm text-status-danger">{message}</p>}
      {episodes.map((ep) => (
        <section key={ep.idAssignation} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{ep.titre}</p>
              <p className="text-xs text-muted-foreground">
                {ep.statut === 'cloture' ? 'Clôturé' : 'En cours'} ·{' '}
                {ep.fenetre.nbRenseignees} nuit{ep.fenetre.nbRenseignees > 1 ? 's' : ''} notée
                {ep.fenetre.nbRenseignees > 1 ? 's' : ''}
                {ep.fenetre.jourCourant !== null ? ` · jour ${ep.fenetre.jourCourant}/${NB_JOURS_AGENDA}` : ''}
              </p>
            </div>
            {ep.statut === 'en_cours' && ep.fenetre.nbRenseignees > 0 && (
              <button
                type="button"
                onClick={() => cloturer(ep.idAssignation)}
                disabled={clotureEnCours === ep.idAssignation}
                className="inline-flex min-h-9 items-center rounded-lg border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {clotureEnCours === ep.idAssignation ? 'Clôture…' : 'Clôturer et agréger'}
              </button>
            )}
          </div>

          {ep.agregats ? (
            <TuilesAgregats a={ep.agregats} />
          ) : (
            <p className="text-xs text-muted-foreground">
              Moins de 5 nuits notées : les moyennes ne sont pas encore calculées.
            </p>
          )}

          <ChronogrammeSommeil nuits={ep.nuits} />
        </section>
      ))}
    </div>
  );
}
