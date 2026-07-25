'use client';

import { EMOJI_QUALITE } from '@/lib/agenda-sommeil/libelles';
import type { EmplacementFenetre } from '@/lib/agenda-sommeil/fenetre';
import type { NuitReponses } from '@/lib/agenda-sommeil/types';

// Frise du sommeil — SVG PUR, VOLONTAIREMENT SANS CHIFFRES. Chaque nuit
// renseignée est une capsule posée sur un axe implicite (soir → matin), sans
// aucune graduation, heure, durée, moyenne ni tendance (réserve R1 + doctrine
// « côté patient, jamais un chiffre alarmant »). Un emplacement vide est un
// pointillé discret — un trou visible, jamais un zéro, jamais du rouge.

const COL_W = 16; // largeur d'une colonne (unités viewBox)
const TOP = 14; // marge haute (place pour la lune)
const TRACK_H = 118; // hauteur de la piste nuit
const EMOJI_Y = TOP + TRACK_H + 16;

// Position verticale d'une heure sur la piste : fenêtre visuelle 20 h → 12 h
// (16 h). `minutesDepuisMinuit` ramené à « heures depuis 20 h », borné [0,16].
function yPour(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const depuis20 = (((h * 60 + m - 1200) % 1440) + 1440) % 1440;
  const heures = Math.min(16, depuis20 / 60);
  return TOP + (heures / 16) * TRACK_H;
}

type Props = {
  emplacements: EmplacementFenetre[];
  nuitsParDate: Map<string, NuitReponses>;
};

export function FriseNuits({ emplacements, nuitsParDate }: Props) {
  const largeur = Math.max(emplacements.length, 1) * COL_W;
  const hauteur = EMOJI_Y + 14;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`}
        className="w-full min-w-[320px]"
        role="img"
        aria-label="Frise de vos nuits notées"
        style={{ maxHeight: 220 }}
      >
        <defs>
          <linearGradient id="agd-nuit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="100%" stopColor="#f0abfc" />
          </linearGradient>
        </defs>

        {/* Lune décorative en haut à gauche */}
        <circle cx={COL_W * 0.7} cy={TOP - 4} r={4} fill="#fde68a" opacity={0.85} />
        <circle cx={COL_W * 0.7 + 2} cy={TOP - 5} r={4} fill="var(--color-surface, #fff)" />

        {emplacements.map((emp) => {
          const cx = emp.index * COL_W - COL_W / 2;
          const nuit = nuitsParDate.get(emp.dateNuit);
          if (!nuit) {
            // Emplacement non renseigné : pointillé discret, aucun signal négatif.
            return (
              <line
                key={emp.dateNuit}
                x1={cx}
                y1={TOP}
                x2={cx}
                y2={TOP + TRACK_H}
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth={2}
                strokeDasharray="2 5"
                strokeLinecap="round"
              />
            );
          }
          const y1 = yPour(nuit.heureCoucher);
          const y2 = Math.max(y1 + 6, yPour(nuit.heureReveilFinal ?? nuit.heureLever));
          const emoji = EMOJI_QUALITE[Math.min(4, Math.max(0, nuit.qualite - 1))];
          return (
            <g key={emp.dateNuit}>
              {emp.estAujourdHui && (
                <rect
                  x={cx - 7}
                  y={TOP - 4}
                  width={14}
                  height={TRACK_H + 8}
                  rx={7}
                  fill="none"
                  stroke="#a5b4fc"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                />
              )}
              <rect
                x={cx - 4}
                y={y1}
                width={8}
                height={y2 - y1}
                rx={4}
                fill="url(#agd-nuit)"
              />
              <text x={cx} y={EMOJI_Y} textAnchor="middle" fontSize={11} aria-hidden="true">
                {emoji}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
