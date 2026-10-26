'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Polygon,
  Radar,
  RadarChart,
  ResponsiveContainer,
  type BaseTickContentProps,
} from 'recharts';
import { LIBELLE_NON_MESURE, estMesure, pointsAvecTrous } from './scoreRadarPoints';

// `value: null` = non mesuré ([[D-301]]) : l'axe reste, sans point, nommé
// « non mesuré » ; le contour s'y interrompt. `absence` nomme un autre manque
// (une valeur sans provenance, r3_09) à la place de « non mesuré ».
export type ScoreRadarPoint = { axe: string; value: number | null; absence?: string };

type PointRadar = { x: number; y: number; value?: unknown };

// `valeursMasquees` : mode consultation de la fiche ([[D-354]] §3). Les axes et
// leur « non mesuré » restent ; ni contour, ni points, ni graduation — rien
// qui dise une valeur, et aucun axe mesuré ramené à zéro.
export function ScoreRadar({
  data,
  max = 100,
  valeursMasquees = false,
}: {
  data: ScoreRadarPoint[];
  max?: number;
  valeursMasquees?: boolean;
}) {
  const absences = new Map(data.filter(d => !estMesure(d.value)).map(d => [d.axe, d.absence ?? LIBELLE_NON_MESURE]));
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="axe"
            tick={({ x, y, textAnchor, payload }: BaseTickContentProps) => {
              const axe = String(payload.value);
              return (
                <text x={x} y={y} textAnchor={textAnchor} fill="var(--muted-foreground)" fontSize={12}>
                  <tspan x={x}>{axe}</tspan>
                  {absences.has(axe) && (
                    <tspan x={x} dy="1.2em" fontSize={10}>{absences.get(axe)}</tspan>
                  )}
                </text>
              );
            }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, max]}
            tick={valeursMasquees ? false : { fill: 'var(--muted-foreground)', fontSize: 10 }}
            axisLine={!valeursMasquees}
          />
          {!valeursMasquees && (
          <Radar
            dataKey="value"
            stroke="var(--color-primary)"
            fill="var(--color-primary)"
            fillOpacity={0.35}
            shape={(props: { points: PointRadar[]; stroke?: string; fill?: string; fillOpacity?: number }) => (
              <Polygon
                points={pointsAvecTrous(props.points)}
                stroke={props.stroke}
                fill={props.fill}
                fillOpacity={props.fillOpacity}
              />
            )}
            // Un sommet seul, entre deux axes non mesurés, n'aurait aucun
            // segment visible : chaque mesure porte son point.
            dot={({ cx, cy, value }: { cx?: number; cy?: number; value?: unknown }) =>
              estMesure(value) && cx !== undefined && cy !== undefined
                ? <circle cx={cx} cy={cy} r={3} fill="var(--color-primary)" />
                : <g />}
          />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
