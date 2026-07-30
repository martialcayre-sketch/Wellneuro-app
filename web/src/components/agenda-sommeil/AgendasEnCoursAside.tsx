'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SuiviAgendasApiResponse } from '@/app/api/praticien/agenda-sommeil/suivi/route';
import type { LigneSuiviAgenda } from '@/lib/agenda-sommeil/suivi';
import { NB_JOURS_AGENDA } from '@/lib/agenda-sommeil/types';

/** Panneau « Agendas du sommeil en cours » de l'aside du Fil. Faits datés
 * seulement — nuits notées, dernière nuit reçue — jamais un score de
 * décrochage ni le vocabulaire de la Météo (SP-MET). Chaque ligne porte sa
 * phrase, jamais la seule couleur. */

// Date AAAA-MM-JJ → « lundi 27 juillet » (affichage praticien).
function dateLisible(date: string): string {
  const [a, m, j] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(a, m - 1, j)));
}

function etiquette(ligne: LigneSuiviAgenda): { titre: string; detail: string } {
  switch (ligne.etat) {
    case 'a_transmettre':
      return {
        titre: 'Recueil terminé, à clôturer',
        detail: `${NB_JOURS_AGENDA} jours écoulés depuis la première nuit — ${ligne.nbRenseignees} nuit${ligne.nbRenseignees > 1 ? 's' : ''} notée${ligne.nbRenseignees > 1 ? 's' : ''}.`,
      };
    case 'silencieux':
      return {
        titre: `Sans nouvelle nuit depuis ${ligne.joursDepuisDerniereNuit} jours`,
        detail: `Dernière nuit reçue : ${ligne.derniereNuitNotee ? dateLisible(ligne.derniereNuitNotee) : '—'} · jour ${ligne.jourCourant ?? '—'} sur ${NB_JOURS_AGENDA}.`,
      };
    case 'jamais_commence':
      return {
        titre: 'Pas encore commencé',
        detail: `Assigné il y a ${ligne.joursDepuisAssignation} jour${ligne.joursDepuisAssignation > 1 ? 's' : ''} — aucune nuit notée. La fenêtre de ${NB_JOURS_AGENDA} nuits s'ouvrira à la première.`,
      };
    case 'nuit_du_jour_manquante':
      return {
        titre: 'Nuit du jour pas encore notée',
        detail: `Dernière nuit reçue : hier · ${ligne.nbRenseignees} nuit${ligne.nbRenseignees > 1 ? 's' : ''} sur ${NB_JOURS_AGENDA}.`,
      };
    case 'a_jour':
      return {
        titre: 'À jour',
        detail: `Nuit du jour notée · ${ligne.nbRenseignees} nuit${ligne.nbRenseignees > 1 ? 's' : ''} sur ${NB_JOURS_AGENDA}.`,
      };
  }
}

export function AgendasEnCoursAside() {
  const [data, setData] = useState<SuiviAgendasApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/praticien/agenda-sommeil/suivi')
      .then(async r => (await r.json()) as SuiviAgendasApiResponse)
      .then(setData)
      .catch(() => setData({ ok: false, lignes: [], unavailable: true }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section
      data-testid="agendas-en-cours-aside"
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Agendas du sommeil en cours
        </h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Recueil de {NB_JOURS_AGENDA} nuits — nuits notées et dernière nuit reçue.
      </p>

      {loading ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : !data || data.unavailable ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Le suivi des agendas est momentanément indisponible. Rechargez la page.
        </p>
      ) : data.lignes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun agenda du sommeil en cours. Les recueils apparaîtront ici dès qu&apos;un agenda
          est assigné.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {data.lignes.map(ligne => {
            const e = etiquette(ligne);
            return (
              <li key={ligne.idAssignation} className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/dashboard/patients/${ligne.idPatient}`}
                    className="min-w-0 truncate text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    {ligne.patient}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">{e.titre}</span>
                </div>
                <p className="text-xs text-muted-foreground">{e.detail}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
