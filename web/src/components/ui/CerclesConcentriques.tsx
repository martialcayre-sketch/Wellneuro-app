'use client';

import type { StrateCode } from '@/lib/equilibre/types';

export type BesoinPoint = {
  id: number;
  libelle: string;
  strate: StrateCode;
  couverture: number | null; // 0-100, plus haut = mieux
};

// Repli 2D des trois sphères concentriques prévues par
// docs/claude/MON_EQUILIBRE_CONTEXTE.md §6 (pas de librairie 3D — cf.
// décision actée). Une couleur fixe par strate (jamais de dégradé unique à
// décoder) ; l'intensité (opacité) reflète la couverture, jamais un
// changement de teinte vers le rouge/gris/noir — un creux reste dans la
// même couleur, juste plus clair/transparent.
// Couleurs d'entité fixes via les tokens --viz-* (révision A5-R1 « la
// Spirale » : menthe/indigo/solaire) — jamais de teinte en dur ici.
const COULEUR_STRATE: Record<StrateCode, string> = {
  CORPS: 'var(--viz-corps)',
  ANCRAGE: 'var(--viz-ancrage)',
  ESPRIT: 'var(--viz-esprit)',
};

const RAYON_ANNEAU: Record<StrateCode, number> = {
  CORPS: 130,
  ANCRAGE: 85,
  ESPRIT: 40,
};

const CENTRE = 150;
const VIEWBOX = 300;

function opaciteMarqueur(couverture: number | null): number {
  if (couverture === null) return 0.2;
  return 0.3 + 0.6 * (Math.max(0, Math.min(100, couverture)) / 100);
}

function positionsAnneau(n: number, rayon: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2; // départ en haut
    return { x: CENTRE + rayon * Math.cos(angle), y: CENTRE + rayon * Math.sin(angle) };
  });
}

export function CerclesConcentriques({
  besoins,
  hoveredId,
  onHoverBesoin,
}: {
  besoins: BesoinPoint[];
  hoveredId?: number | null;
  onHoverBesoin?: (id: number | null) => void;
}) {
  const strates: StrateCode[] = ['CORPS', 'ANCRAGE', 'ESPRIT'];
  const positionsParBesoin = new Map<number, { x: number; y: number }>();

  for (const strate of strates) {
    const besoinsStrate = besoins.filter(b => b.strate === strate);
    const positions = positionsAnneau(besoinsStrate.length, RAYON_ANNEAU[strate]);
    besoinsStrate.forEach((b, i) => positionsParBesoin.set(b.id, positions[i]));
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-center">
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} width="100%" height="320" role="img" aria-label="Cercles concentriques des 12 besoins par strate">
        {strates.map(strate => (
          <circle
            key={strate}
            cx={CENTRE}
            cy={CENTRE}
            r={RAYON_ANNEAU[strate]}
            fill="none"
            stroke={COULEUR_STRATE[strate]}
            strokeOpacity={0.25}
            strokeWidth={1.5}
          />
        ))}
        {besoins.map(b => {
          const pos = positionsParBesoin.get(b.id);
          if (!pos) return null;
          const survole = hoveredId === b.id;
          return (
            <circle
              key={b.id}
              cx={pos.x}
              cy={pos.y}
              r={survole ? 10 : 7}
              fill={COULEUR_STRATE[b.strate]}
              fillOpacity={opaciteMarqueur(b.couverture)}
              stroke={survole ? COULEUR_STRATE[b.strate] : 'none'}
              strokeWidth={2}
              onMouseEnter={() => onHoverBesoin?.(b.id)}
              onMouseLeave={() => onHoverBesoin?.(null)}
              style={{ cursor: onHoverBesoin ? 'pointer' : undefined, transition: 'r 0.15s ease' }}
            />
          );
        })}
      </svg>
    </div>
  );
}
