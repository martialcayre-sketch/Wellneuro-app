'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { JalonMomentum } from '@/lib/equilibre/types';
import type { TrajectoireCycle } from '@/lib/protocol/trajectoire';
import type { MedianesCabinet } from '@/lib/protocol/cabinet';

// Momentum en courbe (A6-R2, décision utilisateur 2026-07-23) — surface
// praticien seule. Chaque point est un jalon RÉELLEMENT mesuré (Δ vs T0) ;
// un jalon non mesuré est un trou visible (`connectNulls` désactivé), jamais
// un 0 (A8-2). Aucun point interpolé, aucun prolongement prédictif. La
// médiane de cabinet est un repère descriptif (n= toujours affiché, masquée
// sous le seuil de cohorte — A6-2), jamais un objectif. Sous 2 jalons
// mesurés : pas de courbe, un texte de repli.

const ORDRE_JALONS: readonly JalonMomentum[] = ['T0', 'J21', 'J42', 'J90'] as const;

function signe(valeur: number): string {
  return valeur > 0 ? `+${valeur}` : `${valeur}`;
}

export function MomentumPanel({
  cycle,
  cabinet,
  libelle,
}: {
  /** Cycle lu (courant au présent, sélectionné en vue datée). */
  cycle: TrajectoireCycle | null;
  /** Repère de cabinet — null/absent : ligne médiane non affichée. */
  cabinet?: MedianesCabinet | null;
  /** Ex. « épisode 2 ». */
  libelle?: string;
}) {
  const t0 = cycle?.jalons.find((jalon) => jalon.jalon === 'T0');
  const ancre = t0 && t0.mesure && t0.valeur !== null ? t0.valeur : null;

  const points = ORDRE_JALONS.map((jalon) => {
    const lecture = cycle?.jalons.find((candidat) => candidat.jalon === jalon);
    const patient =
      ancre !== null && lecture && lecture.mesure && lecture.valeur !== null ? lecture.valeur - ancre : null;
    const medianeJalon = cabinet && !cabinet.masque ? cabinet.parJalon.find((m) => m.jalon === jalon) : undefined;
    const median = jalon === 'T0' && cabinet && !cabinet.masque ? 0 : (medianeJalon?.mediane ?? null);
    return { jalon, patient, cabinet: median, nCabinet: medianeJalon?.n ?? null };
  });

  const jalonsMesures = points.filter((p) => p.patient !== null);
  const courbePossible = jalonsMesures.length >= 2;

  return (
    <section
      aria-label="Momentum du cycle"
      className="rounded-lg border border-border/60 p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Momentum{libelle ? ` — ${libelle}` : ''}</h4>
        <span className="text-xs text-muted-foreground">
          Δ vs T0 aux jalons mesurés — jamais une prédiction
        </span>
      </div>

      {!courbePossible ? (
        <p className="mt-2 text-base text-muted-foreground">
          Courbe indisponible : moins de deux jalons mesurés sur ce cycle. Le momentum textuel des cartes de cycle
          reste la lecture de référence.
        </p>
      ) : (
        <>
          <div role="img" aria-label={`Momentum : ${jalonsMesures.map((p) => `${p.jalon} ${signe(p.patient!)}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="jalon" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                {cabinet && !cabinet.masque && (
                  <Line
                    dataKey="cabinet"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
                <Line
                  dataKey="patient"
                  stroke="var(--viz-corps)"
                  strokeWidth={2.4}
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={{ r: 4, fill: 'var(--viz-corps)', stroke: 'var(--surface)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Équivalent textuel complet — la courbe n'est jamais seule. */}
          <table className="sr-only">
            <caption>Momentum par jalon de mesure : écart vs T0, et médiane du cabinet quand elle est disponible.</caption>
            <thead>
              <tr>
                <th scope="col">Jalon</th>
                <th scope="col">Écart vs T0</th>
                <th scope="col">Médiane cabinet</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.jalon}>
                  <th scope="row">{p.jalon}</th>
                  <td>{p.patient === null ? 'jalon non mesuré' : signe(p.patient)}</td>
                  <td>{p.cabinet === null ? '—' : `${signe(p.cabinet)}${p.nCabinet ? ` (n=${p.nCabinet})` : ''}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {cabinet &&
        (cabinet.masque ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Repère de cabinet disponible à partir de 5 cycles comparables — aujourd’hui : n={cabinet.nTotal}
            {cabinet.versionScoreReference === null ? ' (version de score du cycle inconnue)' : ''}.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            ┄ médiane du cabinet (n={cabinet.nTotal} cycles comparables, version {cabinet.versionScoreReference}) — un
            repère descriptif, jamais une prédiction ni un objectif.
          </p>
        ))}
    </section>
  );
}
