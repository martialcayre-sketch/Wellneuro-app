'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SuiviAgendasApiResponse } from '@/app/api/praticien/agenda-sommeil/suivi/route';
import type { LigneSuiviAgenda } from '@/lib/agenda-sommeil/suivi';
import { NB_JOURS_AGENDA } from '@/lib/agenda-sommeil/types';
import { JOURS_ENTRE_RELANCES } from '@/lib/agenda-sommeil/relanceEmail';

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
    case 'jamais_commence': {
      const depuis =
        ligne.joursDepuisAssignation === 0
          ? "Assigné aujourd'hui"
          : `Assigné il y a ${ligne.joursDepuisAssignation} jour${ligne.joursDepuisAssignation > 1 ? 's' : ''}`;
      return {
        titre: 'Pas encore commencé',
        detail: `${depuis} — aucune nuit notée. La fenêtre de ${NB_JOURS_AGENDA} nuits s'ouvrira à la première.`,
      };
    }
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
  // Un envoi en cours, et le retour de la dernière tentative — par
  // assignation : un patient peut porter deux agendas ouverts.
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);
  const [retours, setRetours] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/praticien/agenda-sommeil/suivi')
      .then(async r => (await r.json()) as SuiviAgendasApiResponse)
      .then(setData)
      .catch(() => setData({ ok: false, lignes: [], unavailable: true }))
      .finally(() => setLoading(false));
  }, []);

  async function relancer(ligne: LigneSuiviAgenda) {
    const confirme = window.confirm(
      `Envoyer un e-mail de relance à ${ligne.patient} ?\n\n` +
        "Il ne contient aucune donnée de santé et pointe la page d'accès à son espace. " +
        `Une relance au plus tous les ${JOURS_ENTRE_RELANCES} jours pour ce recueil.`,
    );
    if (!confirme) return;
    setEnvoiEnCours(ligne.idAssignation);
    try {
      const r = await fetch('/api/praticien/agenda-sommeil/relance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          idPatient: ligne.idPatient,
          idAssignation: ligne.idAssignation,
        }),
      });
      const json = (await r.json()) as { ok: boolean; error?: string };
      setRetours(p => ({
        ...p,
        [ligne.idAssignation]: json.ok ? 'Relance envoyée.' : (json.error ?? 'Envoi impossible.'),
      }));
    } catch {
      setRetours(p => ({
        ...p,
        [ligne.idAssignation]: "L'envoi a échoué. Vous pouvez réessayer.",
      }));
    } finally {
      setEnvoiEnCours(null);
    }
  }

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
                {ligne.relancable && data.relanceActive && (
                  <button
                    type="button"
                    onClick={() => relancer(ligne)}
                    disabled={envoiEnCours === ligne.idAssignation}
                    className="mt-1 self-start rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    {envoiEnCours === ligne.idAssignation ? 'Envoi…' : 'Relancer ce patient'}
                  </button>
                )}
                {retours[ligne.idAssignation] && (
                  <p role="status" className="text-xs text-muted-foreground">
                    {retours[ligne.idAssignation]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
