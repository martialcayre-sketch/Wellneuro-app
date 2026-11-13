'use client';

import { useRef } from 'react';
import type { EtatMeteoAdhesion, MeteoAdhesion } from '@/lib/protocol/adhesion';

// Météo d'adhésion (SP-MET) — PRATICIEN SEUL, lecture seule.
// Trois états nommés + la cause observable citée. Jamais un score, jamais un
// pourcentage d'observance, jamais un classement. Le statut n'est jamais porté
// par la seule couleur : un mot et un symbole l'accompagnent toujours.
// Sans point d'étape exploitable, l'état est « indéterminée » — une absence de
// réponse n'est pas une preuve d'abandon.

const LIBELLE_ETAT: Record<EtatMeteoAdhesion, string> = {
  reguliere: 'Régulière',
  fragile: 'Fragile',
  interrompue: 'Interrompue',
  indeterminee: 'Indéterminée',
};

// Symbole redondant au mot (jamais une information portée par la couleur seule).
const SYMBOLE_ETAT: Record<EtatMeteoAdhesion, string> = {
  reguliere: '●',
  fragile: '◐',
  interrompue: '○',
  indeterminee: '—',
};

const STYLE_ETAT: Record<EtatMeteoAdhesion, string> = {
  reguliere: 'border-border text-status-success',
  fragile: 'border-accent text-solar-ink',
  interrompue: 'border-border text-foreground',
  indeterminee: 'border-border text-muted-foreground',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function MeteoAdhesionPanel({
  meteo,
  echecLecture = false,
  onRelire,
}: {
  meteo: MeteoAdhesion;
  /**
   * Les points d'étape n'ont pas pu être lus. Ce n'est pas une absence de
   * réponse : aucun état n'est affiché, pas même « Indéterminée » (T-61,
   * [[D-488]]).
   */
  echecLecture?: boolean;
  /** « Réessayer » (T-17) : relit les seuls points d'étape. */
  onRelire?: () => Promise<void> | void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const relire = async () => {
    await onRelire?.();
    sectionRef.current?.focus();
  };
  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      aria-labelledby="meteo-adhesion-title"
      className="rounded-xl border border-border bg-surface p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 id="meteo-adhesion-title" className="text-sm font-semibold text-foreground">
          Météo d’adhésion
        </h4>
        <span className="text-xs text-muted-foreground">Signal praticien — jamais affiché au patient</span>
      </div>

      {echecLecture ? (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 text-base text-status-warning">
          <span className="min-w-0">
            Les points d’étape n’ont pas pu être lus. Ce n’est pas une absence de réponse du patient.
          </span>
          {onRelire && (
            <button
              type="button"
              onClick={() => void relire()}
              className="ml-auto min-h-11 shrink-0 rounded-lg border border-accent px-3 py-1 text-sm font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Réessayer
            </button>
          )}
        </div>
      ) : (
      <>
      <p className="mt-2">
        <span
          className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 py-1 text-sm font-medium ${STYLE_ETAT[meteo.etat]}`}
        >
          <span aria-hidden="true">{SYMBOLE_ETAT[meteo.etat]}</span>
          {LIBELLE_ETAT[meteo.etat]}
        </span>
      </p>

      {meteo.etat === 'indeterminee' ? (
        <p className="mt-2 text-base text-muted-foreground">
          Aucun point d’étape exploitable pour l’instant. L’absence de réponse ne dit rien de l’adhésion : elle n’est
          pas comptée comme une interruption.
        </p>
      ) : (
        <>
          <ul className="mt-2 space-y-1">
            {meteo.faitsObserves.map((fait) => (
              <li key={fait} className="text-base text-foreground">
                {fait}
              </li>
            ))}
          </ul>
          {meteo.pointEtapeSource && meteo.dateSource && (
            <p className="mt-2 text-xs text-muted-foreground">
              Source : point d’étape {meteo.pointEtapeSource} du {formatDate(meteo.dateSource)}.
            </p>
          )}
        </>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {meteo.pointsEtapeRenseignes} point{meteo.pointsEtapeRenseignes > 1 ? 's' : ''} d’étape renseigné
        {meteo.pointsEtapeRenseignes > 1 ? 's' : ''} sur 3. Réponses du patient rapportées telles quelles, sans
        interprétation.
      </p>
      </>
      )}
    </section>
  );
}
