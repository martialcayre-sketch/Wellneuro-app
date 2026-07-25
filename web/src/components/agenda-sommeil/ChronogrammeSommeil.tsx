'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  LABEL_DUREE_REVEILS,
  LABEL_FACTEURS,
  LABEL_LATENCE,
} from '@/lib/agenda-sommeil/libelles';
import type { NuitRow } from '@/lib/agenda-sommeil/types';

// Chronogramme praticien — recharts, AVEC chiffres (contrairement à la frise
// patient). Barres flottantes coucher→lever sur un axe horaire réel 20 h → 12 h.
// Une nuit manquante ne trace pas de barre (trou visible, jamais un 0).

// Heures écoulées depuis 20 h (fenêtre visuelle 20 h → 12 h, 16 h), borné.
function heuresDepuis20(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const depuis = (((h * 60 + m - 1200) % 1440) + 1440) % 1440;
  return Math.min(16, depuis / 60);
}

type Point = {
  label: string;
  plage: [number, number] | null;
  nuit: NuitRow['reponses'] | null;
};

function tickHeure(t: number): string {
  const heure = (20 + Math.round(t)) % 24;
  return `${heure}h`;
}

function Tooltipilote({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p.nuit) return null;
  const n = p.nuit;
  const facteurs = n.facteurs
    ? Object.entries(n.facteurs)
        .filter(([, v]) => v)
        .map(([k]) => LABEL_FACTEURS[k])
    : [];
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-card">
      <p className="font-semibold">{p.label}</p>
      <p>Coucher {n.heureCoucher} · lever {n.heureLever}</p>
      <p>Endormissement : {LABEL_LATENCE[n.latence]}</p>
      {n.reveils && (
        <p>
          Réveils : {n.reveils.nombre} ({LABEL_DUREE_REVEILS[n.reveils.dureeTotale]})
        </p>
      )}
      <p>Qualité : {n.qualite}/5{n.forme ? ` · forme ${n.forme}/5` : ''}</p>
      {facteurs.length > 0 && <p>{facteurs.join(' · ')}</p>}
      {n.commentaire && <p className="italic">« {n.commentaire} »</p>}
    </div>
  );
}

export function ChronogrammeSommeil({ nuits }: { nuits: NuitRow[] }) {
  // Indexé sur la date de début pour numéroter les nuits 1..N dans l'ordre.
  const points: Point[] = nuits.map((row, i) => {
    const debut = heuresDepuis20(row.reponses.heureCoucher);
    const fin = Math.max(debut + 0.1, heuresDepuis20(row.reponses.heureReveilFinal ?? row.reponses.heureLever));
    return { label: `Nuit ${i + 1}`, plage: [debut, fin], nuit: row.reponses };
  });

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune nuit renseignée pour le moment.</p>;
  }

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-40} textAnchor="end" height={48} />
          <YAxis
            domain={[0, 16]}
            reversed
            ticks={[0, 2, 4, 6, 8, 10, 12, 14, 16]}
            tickFormatter={tickHeure}
            tick={{ fontSize: 10 }}
            width={34}
          />
          <Tooltip content={<Tooltipilote />} />
          <Bar dataKey="plage" radius={4} isAnimationActive={false}>
            {points.map((p, i) => (
              <Cell key={i} fill={p.nuit ? '#6366f1' : 'transparent'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
