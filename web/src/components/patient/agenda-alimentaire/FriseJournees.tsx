'use client';

import type { EmplacementFenetreAli } from '@/lib/agenda-alimentaire/fenetre';

// Frise des 21 journées — SVG PUR, VOLONTAIREMENT SANS CHIFFRES ET SANS ALARME.
//
// Aucune heure, aucune graduation, aucune moyenne, aucune tendance, aucun indice,
// et aucune couleur d'alerte : un emplacement non noté est un TROU VISIBLE, pas
// un zéro et pas du rouge (même doctrine que `FriseNuits.tsx`). Le seul chiffre
// de tout l'écran est un compte de saisies, et il vit SOUS la frise.
//
// ── TROIS RENDUS, DISTINGUABLES AUTREMENT QUE PAR LA COULEUR ────────────────
// La FORME porte l'information, la couleur ne fait que l'appuyer :
//   vide      → trait pointillé fin
//   notée     → capsule pleine
//   illisible → croix, sur un trait continu
// Un daltonien, un écran en niveaux de gris et une impression noir et blanc les
// séparent aussi bien qu'un écran couleur.
//
// ── `renseignee` ET `illisible` NE SONT PAS EXCLUSIFS ───────────────────────
// Le modèle est append-only : une même date peut porter une tête de chaîne
// relue ET une ligne qu'on ne sait pas relire. Les deux drapeaux valent alors
// `true`, et le rendu superpose la capsule et la croix — il ne choisit pas.

const COL_W = 16;
const TOP = 12;
const TRACK_H = 72;
const MARQUE_Y = TOP + TRACK_H + 12;

export type EtatEmplacement = 'vide' | 'notee' | 'illisible' | 'notee-illisible';

/** Exporté pour les tests : le tri-état de la frise, sans passer par le DOM. */
export function etatEmplacement(emp: {
  renseignee: boolean;
  illisible: boolean;
}): EtatEmplacement {
  // Comparaisons explicites : ces deux drapeaux sont indépendants, et le cas
  // « les deux » est un état à part entière, pas une priorité à trancher.
  if (emp.renseignee === true && emp.illisible === true) return 'notee-illisible';
  if (emp.illisible === true) return 'illisible';
  if (emp.renseignee === true) return 'notee';
  return 'vide';
}

const ARIA_ETAT: Record<EtatEmplacement, string> = {
  vide: 'journée non notée',
  notee: 'journée notée',
  illisible: 'journée que nous n’avons pas pu relire',
  'notee-illisible': 'journée notée, avec une saisie que nous n’avons pas pu relire',
};

type Props = { emplacements: EmplacementFenetreAli[] };

export function FriseJournees({ emplacements }: Props) {
  const largeur = Math.max(emplacements.length, 1) * COL_W;
  const hauteur = MARQUE_Y + 10;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`}
        className="w-full min-w-[320px] text-foreground"
        role="img"
        aria-label="Frise de vos journées notées"
        style={{ maxHeight: 160 }}
      >
        {emplacements.map((emp) => {
          const cx = emp.index * COL_W - COL_W / 2;
          const etat = etatEmplacement(emp);
          return (
            <g key={emp.dateJour} data-etat={etat} data-date={emp.dateJour}>
              <title>{ARIA_ETAT[etat]}</title>

              {emp.estAujourdHui && (
                <rect
                  x={cx - 7}
                  y={TOP - 4}
                  width={14}
                  height={TRACK_H + 8}
                  rx={7}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                />
              )}

              {etat === 'vide' && (
                <line
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
              )}

              {(etat === 'notee' || etat === 'notee-illisible') && (
                <rect
                  x={cx - 4}
                  y={TOP + 8}
                  width={8}
                  height={TRACK_H - 16}
                  rx={4}
                  fill="currentColor"
                  fillOpacity={0.55}
                />
              )}

              {(etat === 'illisible' || etat === 'notee-illisible') && (
                <>
                  <line
                    x1={cx}
                    y1={TOP}
                    x2={cx}
                    y2={TOP + TRACK_H}
                    stroke="currentColor"
                    strokeOpacity={0.25}
                    strokeWidth={1}
                  />
                  {/* Croix : une FORME, pas une teinte — et pas un signal d'alarme. */}
                  <path
                    d={`M ${cx - 4} ${MARQUE_Y - 4} l 8 8 M ${cx + 4} ${MARQUE_Y - 4} l -8 8`}
                    stroke="currentColor"
                    strokeOpacity={0.55}
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
