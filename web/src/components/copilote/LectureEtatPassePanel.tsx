'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Repere } from '@/lib/praticien/lectureAsOf';

// Lecture d'un état passé (SP-TT LOT-01) — surface praticien.
//
// On ne relit pas un enregistrement : on **recalcule** l'état à partir des
// données brutes tronquées à la date choisie. La date n'est pas libre — elle
// doit correspondre à un repère réel du patient, ce qui fait de cette lecture
// une navigation entre événements datés plutôt qu'un curseur temporel.
//
// L'état relu, lui, reste INTOUCHABLE : le serveur refuse toute écriture dès
// qu'un `asOf` est transmis, et la garantie ne dépend pas de cet écran.
//
// Le dépôt de note (LOT-02) ne franchit pas cette ligne, il la souligne : la
// note part sur une route dédiée qui reçoit l'instant relu **dans son corps,
// comme une donnée**, et sa date d'écriture est le présent, posée par la base.
// On n'écrit pas dans le passé, on écrit aujourd'hui à propos du passé — et
// c'est ce que l'écran doit dire au praticien.

type EtatLecture = 'inactif' | 'chargement' | 'chargee' | 'erreur';
type EtatNote = 'repos' | 'envoi' | 'erreur';

type PropositionDatee = {
  asOf?: string | null;
  proposal?: { candidateResponses?: unknown[]; milestone?: string };
};

type NoteRelecture = {
  id: string;
  instantRelu: string;
  texte: string;
  creeLe: string;
  corrigeDepuisNoteId: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Pilotage externe (SP-CONV LOT-03) : l'index Spirale de l'onglet Trajectoire
// sélectionne le repère et monte ce panneau — même mécanique `asOf`, même
// garantie de lecture seule, une seule navigation temporelle dans le code.
// `repereInitial` (ISO) déclenche la lecture datée ; `masquerSelecteur` retire
// la liste interne de repères (la sélection vient d'ailleurs) ;
// `onRetourPresent` est notifié quand le praticien revient au présent.
export function LectureEtatPassePanel({
  idPatient,
  repereInitial,
  masquerSelecteur = false,
  onRetourPresent,
}: {
  idPatient: string;
  repereInitial?: string | null;
  masquerSelecteur?: boolean;
  onRetourPresent?: () => void;
}) {
  const [reperes, setReperes] = useState<Repere[]>([]);
  const [repereActif, setRepereActif] = useState<string | null>(null);
  const [lecture, setLecture] = useState<PropositionDatee | null>(null);
  const [etat, setEtat] = useState<EtatLecture>('inactif');
  const [erreur, setErreur] = useState('');
  const [notes, setNotes] = useState<NoteRelecture[]>([]);
  const [brouillon, setBrouillon] = useState('');
  const [etatNote, setEtatNote] = useState<EtatNote>('repos');
  const [erreurNote, setErreurNote] = useState('');

  useEffect(() => {
    let annule = false;
    void (async () => {
      try {
        const reponse = await fetch(`/api/praticien/reperes?idPatient=${encodeURIComponent(idPatient)}`);
        const payload = (await reponse.json()) as { ok: boolean; reperes?: Repere[] };
        if (!annule && reponse.ok && payload.ok) setReperes(payload.reperes ?? []);
      } catch {
        // Les repères sont un confort de navigation : leur absence n'empêche
        // pas de lire le pré-vol au présent.
      }
    })();
    return () => {
      annule = true;
    };
  }, [idPatient]);

  const chargerNotes = useCallback(
    async (date: string) => {
      try {
        const reponse = await fetch(
          `/api/praticien/relecture-notes?idPatient=${encodeURIComponent(idPatient)}&instantRelu=${encodeURIComponent(date)}`,
        );
        const payload = (await reponse.json()) as { ok: boolean; notes?: NoteRelecture[] };
        if (reponse.ok && payload.ok) setNotes(payload.notes ?? []);
      } catch {
        // Les notes déjà déposées sont un rappel, pas une condition de lecture :
        // leur absence n'empêche pas de relire l'état ni d'en déposer une.
      }
    },
    [idPatient],
  );

  const lireA = useCallback(
    async (date: string) => {
      setRepereActif(date);
      setEtat('chargement');
      setNotes([]);
      setBrouillon('');
      setEtatNote('repos');
      setErreurNote('');
      void chargerNotes(date);
      try {
        const reponse = await fetch(
          `/api/praticien/cockpit?idPatient=${encodeURIComponent(idPatient)}&asOf=${encodeURIComponent(date)}`,
        );
        const payload = (await reponse.json()) as PropositionDatee & { error?: string };
        if (!reponse.ok) {
          setErreur(payload.error ?? 'Cet état n’a pas pu être relu.');
          setEtat('erreur');
          return;
        }
        setLecture(payload);
        setEtat('chargee');
      } catch {
        setErreur('Cet état n’a pas pu être relu.');
        setEtat('erreur');
      }
    },
    [idPatient, chargerNotes],
  );

  const revenirAuPresent = useCallback(() => {
    setRepereActif(null);
    setLecture(null);
    setEtat('inactif');
    setErreur('');
    setNotes([]);
    setBrouillon('');
    setEtatNote('repos');
    setErreurNote('');
  }, []);

  // Le dépôt de note ne passe PAS par le cockpit : route dédiée, instant relu
  // dans le corps. Voir `api/praticien/relecture-notes/route.ts`.
  const deposerNote = useCallback(async () => {
    if (!repereActif || brouillon.trim().length === 0) return;
    setEtatNote('envoi');
    setErreurNote('');
    try {
      const reponse = await fetch('/api/praticien/relecture-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, instantRelu: repereActif, texte: brouillon }),
      });
      const payload = (await reponse.json()) as { ok: boolean; error?: string };
      if (!reponse.ok || !payload.ok) {
        setErreurNote(payload.error ?? 'La note n’a pas pu être enregistrée.');
        setEtatNote('erreur');
        return;
      }
      setBrouillon('');
      setEtatNote('repos');
      await chargerNotes(repereActif);
    } catch {
      setErreurNote('La note n’a pas pu être enregistrée.');
      setEtatNote('erreur');
    }
  }, [idPatient, repereActif, brouillon, chargerNotes]);

  // Pilotage externe (SP-CONV LOT-03) : la sélection venue de l'index Spirale
  // déclenche la lecture datée ; sa désélection ramène au présent. Le serveur
  // reste seul juge de la validité du repère (résolution `asOf`).
  useEffect(() => {
    if (repereInitial === undefined) return; // panneau autonome (copilote)
    if (repereInitial === null) {
      if (repereActif !== null) revenirAuPresent();
      return;
    }
    if (repereInitial !== repereActif) void lireA(repereInitial);
  }, [repereInitial, repereActif, lireA, revenirAuPresent]);

  // En mode autonome, pas de repère = rien à proposer. En mode piloté, le
  // panneau doit pouvoir rendre la lecture même si la liste locale de repères
  // n'est pas (encore) disponible.
  if (reperes.length === 0 && repereActif === null) return null;

  return (
    <section aria-labelledby="lecture-passee" className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <h3 id="lecture-passee" className="font-display text-lg font-semibold text-foreground">
        Lire l’état de la fiche à une date passée
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        L’état est <strong>recalculé</strong> à partir des données connues à cette date, jamais relu depuis un
        enregistrement. Il ne peut pas être modifié : aucune décision ne se prend depuis cet écran. Vous pouvez y
        déposer une note — elle sera datée d’aujourd’hui.
      </p>

      {!masquerSelecteur && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {reperes.map((repere) => {
            const actif = repereActif === repere.date;
            return (
              <li key={`${repere.source}-${repere.date}`}>
                <button
                  type="button"
                  aria-pressed={actif}
                  onClick={() => void lireA(repere.date)}
                  className={`min-h-11 rounded-lg border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                    actif
                      ? 'border-primary bg-primary/10 font-semibold text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {formatDate(repere.date)} · {repere.libelle}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {etat !== 'inactif' && repereActif && (
        <div className="mt-3 rounded-lg border border-accent bg-accent/5 p-3">
          {/* Bandeau permanent : on ne doit jamais confondre ce que l'on lit
              avec l'état actuel du patient. */}
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 text-base font-medium text-solar-ink">
              Vous lisez l’état du {formatDate(repereActif)} — ce n’est pas l’état actuel du patient.
            </p>
            {/* Toujours visible en vue datée (maquette SP-CONV) : une seule
                sortie, explicite — jamais un état daté qui « colle ». */}
            <button
              type="button"
              onClick={() => {
                revenirAuPresent();
                onRetourPresent?.();
              }}
              className="ml-auto flex min-h-11 shrink-0 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Retour au présent
            </button>
          </div>

          {etat === 'chargement' && (
            <p role="status" className="mt-2 text-base text-muted-foreground">
              Recalcul de l’état&hellip;
            </p>
          )}

          {etat === 'erreur' && (
            <p role="alert" className="mt-2 text-base text-foreground">
              {erreur} Rien ne peut être conclu de cet écran tant qu’il n’a pas été relu.
            </p>
          )}

          {etat === 'chargee' && (
            <p className="mt-2 text-base text-foreground">
              {lecture?.proposal?.candidateResponses?.length ?? 0} réponse
              {(lecture?.proposal?.candidateResponses?.length ?? 0) > 1 ? 's' : ''} de questionnaire étaient connues à
              cette date. Aucune donnée postérieure n’entre dans cette lecture.
            </p>
          )}

          {etat === 'chargee' && (
            <div className="mt-4 border-t border-border pt-3">
              <h4 className="text-sm font-semibold text-foreground">
                Noter ce que vous observez sur cet état
              </h4>
              {/* La phrase qui porte tout le gate : deux dates, jamais confondues. */}
              <p className="mt-1 text-xs text-muted-foreground">
                Votre note porte sur l’état du {formatDate(repereActif)}, mais elle est écrite aujourd’hui : elle sera
                datée du jour, jamais de la date relue. Elle reste entre praticiens — le patient ne la voit pas.
              </p>

              {notes.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {notes.map((note) => (
                    <li key={note.id} className="rounded-lg border border-border bg-surface p-2 text-base text-foreground">
                      <p className="whitespace-pre-wrap">{note.texte}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Écrite le {formatDate(note.creeLe)}
                        {note.corrigeDepuisNoteId ? ' · corrige une note précédente' : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <label htmlFor="note-relecture" className="mt-3 block text-xs font-medium text-foreground">
                Note de relecture
              </label>
              <textarea
                id="note-relecture"
                value={brouillon}
                onChange={(evenement) => setBrouillon(evenement.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Ce que cet état passé éclaire aujourd’hui…"
                className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />

              {etatNote === 'erreur' && (
                <p role="alert" className="mt-2 text-base text-foreground">
                  {erreurNote}
                </p>
              )}

              <button
                type="button"
                onClick={() => void deposerNote()}
                disabled={brouillon.trim().length === 0 || etatNote === 'envoi'}
                className="mt-2 min-h-11 rounded-lg border border-primary bg-primary/10 px-3 py-1 text-sm font-medium text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {etatNote === 'envoi' ? 'Enregistrement…' : 'Déposer la note (datée d’aujourd’hui)'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={revenirAuPresent}
            className="mt-3 min-h-11 rounded-lg border border-border bg-surface px-3 py-1 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Revenir au présent
          </button>
        </div>
      )}
    </section>
  );
}
