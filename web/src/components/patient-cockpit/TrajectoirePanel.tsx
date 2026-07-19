'use client';

import { useMemo, useState } from 'react';
import type { JalonMomentum, TendanceMomentum } from '@/lib/equilibre/types';
import { rattacherReperesAuxCycles, type Trajectoire } from '@/lib/protocol/trajectoire';

// Fiche-trajectoire praticien (C2B LOT-09, registre A8) — LECTURE SEULE.
// « La Spirale comme index temporel » : une liste de repères datés navigable,
// jamais une courbe (A6). Un jalon sans couverture est « non mesuré » (A8-2,
// jamais un 0) ; deux cycles de versionScore différents sont « non comparables »
// (A8-3, jamais de delta). Le comparateur ne s'active qu'à partir de 2 cycles
// (A8-5-ii) et présente des VALEURS côte à côte — il ne calcule aucun écart
// inter-cycles, qui serait une mesure dérivée nouvelle et non sourcée.

const ORDRE_JALONS: readonly JalonMomentum[] = ['T0', 'J21', 'J42', 'J90'] as const;

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
  // Index de repère sélectionné (navigation seule — aucune écriture, aucun filtre
  // de données : le contenu affiché est identique, seule la mise en avant change).
  const [repereActif, setRepereActif] = useState<number | null>(null);

  const reperes = useMemo(
    () => rattacherReperesAuxCycles(trajectoire?.index ?? [], trajectoire?.cycles ?? []),
    [trajectoire],
  );

  const repereSelectionne = repereActif === null ? null : (reperes[repereActif] ?? null);
  const cycleSelectionne = repereSelectionne?.cycleId ?? null;

  return (
    <section aria-labelledby="trajectoire-title" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="trajectoire-title" className="text-sm font-semibold text-foreground">
        Fiche-trajectoire — repères datés
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Index des jalons de mesure confirmés (lecture seule). Les points d’étape J7/J14/J21 (pilotage) n’y figurent
        pas — seuls les jalons de mesure T0/J21/J42/J90.
      </p>

      {reperes.length > 0 && (
        <nav aria-label="Index de la Spirale" className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Index de la Spirale</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {reperes.map((repere, position) => {
              const actif = repereActif === position;
              return (
                <li key={`${repere.milestone}-${repere.date}-${position}`}>
                  <button
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setRepereActif(actif ? null : position)}
                    className={`min-h-11 rounded-lg border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                      actif
                        ? 'border-primary bg-primary/10 font-semibold text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {LABEL_JALON[repere.milestone]} · {formatDate(repere.date)}
                  </button>
                </li>
              );
            })}
          </ul>
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            {repereSelectionne === null
              ? 'Sélectionnez un repère pour mettre en avant le cycle qu’il documente.'
              : cycleSelectionne === null
                ? `Repère ${LABEL_JALON[repereSelectionne.milestone]} du ${formatDate(repereSelectionne.date)} — antérieur à tout épisode T0 confirmé, aucun cycle ne lui est rattaché.`
                : `Repère ${LABEL_JALON[repereSelectionne.milestone]} du ${formatDate(repereSelectionne.date)} — cycle mis en avant ci-dessous.`}
          </p>
        </nav>
      )}

      {!trajectoire || trajectoire.cycles.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Aucun épisode confirmé pour l’instant.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {trajectoire.cycles.map((cycle) => {
            const misEnAvant = cycleSelectionne === cycle.cycleId;
            return (
              <div
                key={cycle.cycleId}
                aria-current={misEnAvant ? 'true' : undefined}
                className={`rounded-lg border p-3 ${misEnAvant ? 'border-primary bg-primary/5' : 'border-border/60'}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Cycle depuis le {formatDate(cycle.dateT0)}
                    {/* Jamais la couleur seule : la mise en avant est aussi écrite. */}
                    {misEnAvant && <span className="text-primary"> · repère sélectionné</span>}
                  </p>
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
            );
          })}

          {/* Comparateur multi-épisodes — s'active à partir de 2 cycles (A8-5-ii). */}
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comparaison multi-épisodes</p>
            {trajectoire.comparaison.disponible ? (
              <>
                <p className="mt-1 text-foreground">
                  {trajectoire.cycles.length} cycles comparables (même version de score) — repères présentés côte à
                  côte.
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
                    <caption className="sr-only">
                      Valeurs des jalons de mesure, cycle par cycle. Aucun écart inter-cycles n’est calculé.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col" className="border-b border-border px-2 py-1 font-medium text-muted-foreground">
                          Jalon
                        </th>
                        {trajectoire.cycles.map((cycle) => (
                          <th
                            key={cycle.cycleId}
                            scope="col"
                            className="border-b border-border px-2 py-1 font-medium text-foreground"
                          >
                            Cycle du {formatDate(cycle.dateT0)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ORDRE_JALONS.map((jalon) => (
                        <tr key={jalon}>
                          <th scope="row" className="px-2 py-1 font-medium text-foreground">
                            {LABEL_JALON[jalon]}
                          </th>
                          {trajectoire.cycles.map((cycle) => {
                            const lecture = cycle.jalons.find((candidat) => candidat.jalon === jalon);
                            const mesure = lecture?.mesure === true && lecture.valeur !== null;
                            return (
                              <td key={`${cycle.cycleId}-${jalon}`} className="px-2 py-1 text-muted-foreground">
                                {mesure ? (
                                  <>indice {lecture?.valeur}</>
                                ) : (
                                  <span className="italic">jalon non mesuré</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Aucun écart n’est calculé entre cycles : seules les valeurs mesurées sont présentées côte à côte.
                </p>
              </>
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
