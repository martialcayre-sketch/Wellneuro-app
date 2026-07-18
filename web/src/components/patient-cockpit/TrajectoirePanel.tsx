'use client';

import type { JalonMomentum, TendanceMomentum } from '@/lib/equilibre/types';
import type { Trajectoire } from '@/lib/protocol/trajectoire';

// Fiche-trajectoire praticien (C2B LOT-09, registre A8) — LECTURE SEULE.
// « La Spirale comme index temporel » : une liste de repères datés, jamais une
// courbe (A6). Un jalon sans couverture est « non mesuré » (A8-2, jamais un 0) ;
// deux cycles de versionScore différents sont « non comparables » (A8-3, jamais
// de delta). Le comparateur ne s'active qu'à partir de 2 cycles (A8-5-ii).

const LABEL_JALON: Record<JalonMomentum, string> = { T0: 'T0', J21: 'J21', J42: 'J42', J90: 'J90' };

const LABEL_TENDANCE: Record<TendanceMomentum, string> = {
  hausse: 'en hausse',
  stable: 'stable',
  baisse: 'en baisse',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TrajectoirePanel({ trajectoire }: { trajectoire: Trajectoire | null }) {
  return (
    <section aria-labelledby="trajectoire-title" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="trajectoire-title" className="text-sm font-semibold text-foreground">
        Fiche-trajectoire — repères datés
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Index des jalons de mesure confirmés (lecture seule). Les points d’étape J7/J14/J21 (pilotage) n’y figurent
        pas — seuls les jalons de mesure T0/J21/J42/J90.
      </p>

      {!trajectoire || trajectoire.cycles.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Aucun épisode confirmé pour l’instant.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {trajectoire.cycles.map((cycle) => (
            <div key={cycle.cycleId} className="rounded-lg border border-border/60 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Cycle depuis le {formatDate(cycle.dateT0)}</p>
                <span className="text-xs text-muted-foreground">version de score : {cycle.versionScore}</span>
              </div>
              <ul className="mt-2 space-y-1">
                {cycle.jalons.map((jalon) => (
                  <li key={jalon.jalon} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{LABEL_JALON[jalon.jalon]}</span>{' '}
                    {jalon.mesure && jalon.valeur !== null && jalon.date ? (
                      <>· indice {jalon.valeur} · {formatDate(jalon.date)}</>
                    ) : (
                      <span className="italic">· jalon non mesuré</span>
                    )}
                  </li>
                ))}
              </ul>
              {cycle.momentum && (
                <p className="mt-2 text-sm text-foreground">
                  Momentum T0 → dernier jalon mesuré :{' '}
                  <span className="font-medium">{LABEL_TENDANCE[cycle.momentum.tendance]}</span>{' '}
                  <span className="text-muted-foreground">(écart {Math.abs(cycle.momentum.delta)})</span>
                </p>
              )}
            </div>
          ))}

          {/* Comparateur multi-épisodes — s'active à partir de 2 cycles (A8-5-ii). */}
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comparaison multi-épisodes</p>
            {trajectoire.comparaison.disponible ? (
              <p className="mt-1 text-foreground">
                {trajectoire.cycles.length} cycles comparables (même version de score) — repères présentés côte à côte
                ci-dessus.
              </p>
            ) : trajectoire.comparaison.raison === 'versions_differentes' ? (
              <p className="mt-1 text-foreground">
                Non comparable : les cycles n’utilisent pas la même version de score (score recalibré). Aucun écart
                n’est calculé entre eux.
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">Comparaison disponible dès un 2ᵉ cycle confirmé.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
