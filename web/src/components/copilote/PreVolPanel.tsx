'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { PreVol, SourcePreVol } from '@/lib/copilote/prevol';

// Pré-vol T-10 min (SP-COP LOT-01) — surface praticien, LECTURE SEULE.
// Aucun bouton d'action, aucune écriture : la vue prépare la consultation, elle
// ne la conduit pas. Les faits sont rapportés datés et sourcés ; les questions
// suggérées ne sont que la reformulation d'un fait présent dans la liste.

const LIBELLE_SOURCE: Record<SourcePreVol, string> = {
  reponse_questionnaire: 'Questionnaire',
  point_etape: 'Point d’étape',
  episode_confirme: 'Épisode',
  protocole_relu: 'Protocole',
  diffusion_approuvee: 'Diffusion',
  demande_correction: 'Patient',
  signalement: 'Signalement',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type Etat = 'chargement' | 'chargee' | 'erreur';

export function PreVolPanel({ idPatient }: { idPatient: string }) {
  const [prevol, setPrevol] = useState<PreVol | null>(null);
  const [etat, setEtat] = useState<Etat>('chargement');
  const [erreur, setErreur] = useState<string>('');

  const charger = useCallback(async () => {
    setEtat('chargement');
    try {
      const reponse = await fetch(`/api/praticien/copilote/prevol?idPatient=${encodeURIComponent(idPatient)}`);
      const payload = (await reponse.json()) as { ok: boolean; prevol?: PreVol; error?: string };
      if (!reponse.ok || !payload.ok || !payload.prevol) {
        setErreur(payload.error ?? 'Le pré-vol n’a pas pu être lu.');
        setEtat('erreur');
        return;
      }
      setPrevol(payload.prevol);
      setEtat('chargee');
    } catch {
      setErreur('Le pré-vol n’a pas pu être lu.');
      setEtat('erreur');
    }
  }, [idPatient]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (etat === 'chargement') {
    return (
      <div role="status" className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
        Lecture du pré-vol&hellip;
      </div>
    );
  }

  if (etat === 'erreur' || !prevol) {
    // Un échec de lecture n'est jamais présenté comme « rien de nouveau » : ce
    // serait une affirmation fausse juste avant une consultation.
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-xl border border-accent bg-status-warning/10 p-4 text-base text-status-warning">
        <span>{erreur} Rien ne peut être conclu de cet écran tant qu’il n’a pas été relu.</span>
        <button
          type="button"
          onClick={() => void charger()}
          className="min-h-9 self-start rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="prevol-changements" className="rounded-xl border border-border bg-surface p-4">
        <h3 id="prevol-changements" className="text-sm font-semibold text-foreground">
          Ce qui a changé
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {prevol.ancre.type === 'consultation'
            ? `Depuis la dernière consultation validée, le ${formatDate(prevol.ancre.date)}.`
            : 'Aucune consultation validée à ce jour : tout l’historique est présenté.'}
        </p>

        {prevol.faits.length === 0 ? (
          <p className="mt-3 text-base text-muted-foreground">
            Aucun élément nouveau depuis cette date.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {prevol.faits.map((fait, position) => (
              <li key={`${fait.source}-${fait.date}-${position}`} className="text-base text-foreground">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {LIBELLE_SOURCE[fait.source]}
                </span>{' '}
                · {fait.libelle}{' '}
                <span className="text-muted-foreground">· {formatDate(fait.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="prevol-questions" className="rounded-xl border border-border bg-surface p-4">
        <h3 id="prevol-questions" className="text-sm font-semibold text-foreground">
          Questions suggérées
        </h3>
        {prevol.questionsSuggerees.length === 0 ? (
          <p className="mt-2 text-base text-muted-foreground">
            Aucune question suggérée : rien dans les éléments ci-dessus n’en appelle une.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {prevol.questionsSuggerees.map((question) => (
              <li key={question} className="text-base text-foreground">
                {question}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Chaque question reformule un élément de la liste ci-dessus. Aucune n’est déduite d’une absence de donnée.
        </p>
      </section>

      <section aria-labelledby="prevol-ailleurs" className="rounded-xl border border-border bg-muted/40 p-4">
        <h3 id="prevol-ailleurs" className="text-sm font-semibold text-foreground">
          Discordances et objets cliniques
        </h3>
        <p className="mt-2 text-base text-muted-foreground">
          Ils restent lus dans le poste de pilotage, phase « Compréhension » — le pré-vol n’en fait pas une seconde
          copie, qui pourrait diverger de la première.
        </p>
        <Link
          href={`/dashboard/patients/${encodeURIComponent(idPatient)}`}
          className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-border px-3 py-1 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Ouvrir le poste de pilotage →
        </Link>
      </section>
    </div>
  );
}
