'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RendezVousApiResponse, RendezVousExpose } from '@/app/api/praticien/rendez-vous/route';

type PatientOption = { idPatient: string; nomComplet: string };

const FORMAT_JOUR = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const FORMAT_HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Regroupe les rendez-vous par jour civil, pour une liste lisible. */
function grouperParJour(rdvs: RendezVousExpose[]): { jour: string; libelle: string; items: RendezVousExpose[] }[] {
  const groupes = new Map<string, { libelle: string; items: RendezVousExpose[] }>();
  for (const r of rdvs) {
    const d = new Date(r.dateHeure);
    const cle = d.toISOString().slice(0, 10);
    const groupe = groupes.get(cle);
    if (groupe) groupe.items.push(r);
    else groupes.set(cle, { libelle: FORMAT_JOUR.format(d), items: [r] });
  }
  return [...groupes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([jour, { libelle, items }]) => ({ jour, libelle, items }));
}

/**
 * Agenda praticien (accueil-observatoire LOT-04) : planifier un rendez-vous et
 * voir la semaine. CRUD minimal — pas de vue calendrier, pas de récurrence.
 * L'annulation retire le rendez-vous de la liste (statut `annule` côté base).
 */
export function AgendaPraticien({ patients }: { patients: PatientOption[] }) {
  const [rdvs, setRdvs] = useState<RendezVousExpose[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [idPatient, setIdPatient] = useState('');
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [motif, setMotif] = useState('');
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    try {
      const reponse = await fetch('/api/praticien/rendez-vous');
      const payload = (await reponse.json()) as RendezVousApiResponse;
      if (payload.ok && Array.isArray(payload.rendezVous)) setRdvs(payload.rendezVous);
      else setRdvs([]);
    } catch {
      setRdvs([]);
      setErreur('La liste des rendez-vous est momentanément indisponible.');
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function planifier(e: React.FormEvent) {
    e.preventDefault();
    setErreur('');
    if (!idPatient || !date || !heure) {
      setErreur('Choisissez un patient, une date et une heure.');
      return;
    }
    setEnCours(true);
    try {
      const dateHeure = new Date(`${date}T${heure}:00`);
      const reponse = await fetch('/api/praticien/rendez-vous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, dateHeure: dateHeure.toISOString(), motif: motif.trim() || undefined }),
      });
      const payload = (await reponse.json()) as RendezVousApiResponse;
      if (!reponse.ok || !payload.ok) {
        setErreur('error' in payload ? payload.error : 'Le rendez-vous n’a pas pu être planifié.');
        return;
      }
      setMotif('');
      setHeure('');
      await charger();
    } catch {
      setErreur('Le rendez-vous n’a pas pu être planifié.');
    } finally {
      setEnCours(false);
    }
  }

  async function annuler(id: string) {
    setErreur('');
    try {
      const reponse = await fetch('/api/praticien/rendez-vous/annulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const payload = (await reponse.json()) as { ok: boolean; error?: string };
      if (!reponse.ok || !payload.ok) {
        setErreur(payload.error ?? 'Le rendez-vous n’a pas pu être annulé.');
        return;
      }
      setRdvs(prev => (prev ? prev.filter(r => r.id !== id) : prev));
    } catch {
      setErreur('Le rendez-vous n’a pas pu être annulé.');
    }
  }

  const groupes = rdvs ? grouperParJour(rdvs) : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Formulaire de planification */}
      <form onSubmit={planifier} className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold text-foreground">Planifier un rendez-vous</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Patient</span>
            <select
              value={idPatient}
              onChange={e => setIdPatient(e.target.value)}
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <option value="">Choisir un patient…</option>
              {patients.map(p => (
                <option key={p.idPatient} value={p.idPatient}>
                  {p.nomComplet}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Motif (facultatif)</span>
            <input
              type="text"
              value={motif}
              onChange={e => setMotif(e.target.value)}
              maxLength={500}
              placeholder="Consultation de suivi…"
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Date</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Heure</span>
            <input
              type="time"
              value={heure}
              onChange={e => setHeure(e.target.value)}
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
          </label>
        </div>
        {erreur && (
          <p role="alert" className="mt-3 rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground">
            {erreur}
          </p>
        )}
        <button
          type="submit"
          disabled={enCours}
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-transparent bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60"
        >
          {enCours ? 'Planification…' : 'Planifier'}
        </button>
      </form>

      {/* Liste des rendez-vous à venir, par jour */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold text-foreground">Rendez-vous à venir</h3>
        {rdvs === null ? (
          <div className="mt-3 flex flex-col gap-2">
            <div className="h-11 animate-pulse rounded-lg bg-muted" />
            <div className="h-11 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : groupes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun rendez-vous planifié pour les 7 prochains jours.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {groupes.map(groupe => (
              <div key={groupe.jour}>
                <p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">
                  {groupe.libelle}
                </p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {groupe.items.map(r => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="font-mono text-sm text-foreground">
                          {FORMAT_HEURE.format(new Date(r.dateHeure))}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{r.patient}</span>
                        {r.motif && <span className="text-sm text-muted-foreground">— {r.motif}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => void annuler(r.id)}
                        className="min-h-9 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Annuler
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
