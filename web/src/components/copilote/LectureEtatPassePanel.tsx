'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Repere } from '@/lib/praticien/lectureAsOf';

// Lecture d'un état passé (SP-TT LOT-01) — surface praticien, LECTURE SEULE.
//
// On ne relit pas un enregistrement : on **recalcule** l'état à partir des
// données brutes tronquées à la date choisie. La date n'est pas libre — elle
// doit correspondre à un repère réel du patient, ce qui fait de cette lecture
// une navigation entre événements datés plutôt qu'un curseur temporel.
//
// Le serveur refuse toute écriture dès qu'un `asOf` est transmis : la garantie
// ne dépend pas de cet écran.

type EtatLecture = 'inactif' | 'chargement' | 'chargee' | 'erreur';

type PropositionDatee = {
  asOf?: string | null;
  proposal?: { candidateResponses?: unknown[]; milestone?: string };
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function LectureEtatPassePanel({ idPatient }: { idPatient: string }) {
  const [reperes, setReperes] = useState<Repere[]>([]);
  const [repereActif, setRepereActif] = useState<string | null>(null);
  const [lecture, setLecture] = useState<PropositionDatee | null>(null);
  const [etat, setEtat] = useState<EtatLecture>('inactif');
  const [erreur, setErreur] = useState('');

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

  const lireA = useCallback(
    async (date: string) => {
      setRepereActif(date);
      setEtat('chargement');
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
    [idPatient],
  );

  const revenirAuPresent = useCallback(() => {
    setRepereActif(null);
    setLecture(null);
    setEtat('inactif');
    setErreur('');
  }, []);

  if (reperes.length === 0) return null;

  return (
    <section aria-labelledby="lecture-passee" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="lecture-passee" className="text-sm font-semibold text-foreground">
        Lire l’état de la fiche à une date passée
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        L’état est <strong>recalculé</strong> à partir des données connues à cette date, jamais relu depuis un
        enregistrement. Lecture seule : aucune action n’est possible depuis cet écran.
      </p>

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

      {etat !== 'inactif' && repereActif && (
        <div className="mt-3 rounded-lg border border-accent bg-accent/5 p-3">
          {/* Bandeau permanent : on ne doit jamais confondre ce que l'on lit
              avec l'état actuel du patient. */}
          <p className="text-sm font-medium text-solar-ink">
            Vous lisez l’état du {formatDate(repereActif)} — ce n’est pas l’état actuel du patient.
          </p>

          {etat === 'chargement' && (
            <p role="status" className="mt-2 text-sm text-muted-foreground">
              Recalcul de l’état&hellip;
            </p>
          )}

          {etat === 'erreur' && (
            <p role="alert" className="mt-2 text-sm text-foreground">
              {erreur} Rien ne peut être conclu de cet écran tant qu’il n’a pas été relu.
            </p>
          )}

          {etat === 'chargee' && (
            <p className="mt-2 text-sm text-foreground">
              {lecture?.proposal?.candidateResponses?.length ?? 0} réponse
              {(lecture?.proposal?.candidateResponses?.length ?? 0) > 1 ? 's' : ''} de questionnaire étaient connues à
              cette date. Aucune donnée postérieure n’entre dans cette lecture.
            </p>
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
