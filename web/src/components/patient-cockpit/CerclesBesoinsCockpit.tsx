import type { StrateCode } from '@/lib/equilibre/types';
import type { MotifNonMesureServi } from '@/lib/praticien/motifNonMesure';
import {
  lignesProvenance,
  MENTION_SOURCE_NON_ENREGISTREE,
  provenanceEtablie,
  type ProvenanceChiffre,
} from '@/lib/praticien/provenanceChiffre';
import { DetailMotifNonMesure } from '@/components/patient-cockpit/DetailMotifNonMesure';
import { DetailProvenance } from '@/components/patient-cockpit/DetailProvenance';
import { useChiffresMasques, ValeurMasquee } from '@/components/patient-cockpit/ChiffresMasques';

// LES CERCLES DES 12 BESOINS, PROPRES AU COCKPIT — r3_08 (Q2, arbitrage du
// 2026-10-22, qui vaut besoin exprimé au sens du gel D/49).
//
// `components/ui/CerclesConcentriques` reste celui du portail, inchangé : ses
// points ne portaient leur état que par l'opacité (contraste mesuré à 1,14:1),
// sans libellé, dans l'ordre du tri reçu. Ici :
//   — un libellé Bn par point, et des anneaux nommés en mots ;
//   — une forme propre au non mesuré (anneau creux en pointillé), jamais un
//     point pâle qu'on lirait comme une valeur basse (`DC-24`) ;
//   — un ordre fixe, B1 à B12 par strate, quel que soit l'ordre reçu ;
//   — la liste en texte sous la figure, où se lisent la valeur et le motif.
// La valeur reste portée par l'intensité du point, dans la teinte fixe de sa
// strate (arbitrage du 2026-10-24) — jamais par un changement de teinte.
// Une valeur sans provenance établie ne s'affiche pas ([[D-333]] §2 règle 1) :
// ni chiffre dans la liste, ni intensité sur la figure (le point reste au
// plancher). En mode consultation ([[D-354]] §2-3), même chose pour toute
// valeur : le point mesuré reste plein, au plancher, et la liste dit la
// mention à la place du pourcentage.

type Strate = { code: StrateCode; nom: string; rayon: number; teinte: string; encre: string };

// Teintes d'entité fixes (tokens --viz-*, A5-R1). L'ENCRE du contour est un
// jeton sombre de la même famille : c'est lui qui rend chaque point lisible
// sur la surface (≥ 3:1), quelle que soit l'intensité du remplissage —
// `--viz-esprit` seul n'y atteint pas.
const STRATES: Strate[] = [
  { code: 'CORPS', nom: 'Corps', rayon: 140, teinte: 'var(--viz-corps)', encre: 'var(--mint-ink)' },
  { code: 'ANCRAGE', nom: 'Ancrage', rayon: 95, teinte: 'var(--viz-ancrage)', encre: 'var(--indigo-600)' },
  { code: 'ESPRIT', nom: 'Esprit', rayon: 50, teinte: 'var(--viz-esprit)', encre: 'var(--solar-ink)' },
];

const CENTRE = 175;
const VIEWBOX = 350;
const RAYON_POINT = 7;

/**
 * Plancher d'opacité du remplissage : un chiffre TECHNIQUE de lisibilité
 * (`DC-20`), ni seuil ni borne clinique. Au plancher, un point mesuré reste
 * un disque plein, distinct de l'anneau creux du non mesuré.
 */
export const OPACITE_PLANCHER = 0.35;

export function opaciteRemplissage(couverture: number): number {
  return OPACITE_PLANCHER + (1 - OPACITE_PLANCHER) * (Math.max(0, Math.min(100, couverture)) / 100);
}

// B9 et B10 sont servis deux fois, sous deux noms : couverture au tableau et
// dans cette liste, repère de suivi sur leur carte ([[D-333]] §3, arbitrage du
// 2026-10-23). Les deux disent que c'est la même valeur — sans renommer ni
// l'une ni l'autre (arbitrage du 2026-10-24 pour la liste).
export type CarteLiee = 'reserveAdaptation' | 'clarte';

export const MENTION_CARTE_LIEE: Record<CarteLiee, string> = {
  reserveAdaptation: 'Même valeur que la carte « Réserve d\'adaptation » (repère de suivi)',
  clarte: 'Même valeur que la carte « Clarté » (repère de suivi)',
};

export type BesoinCercle = {
  id: number;
  libelle: string;
  strate: StrateCode;
  couverture: number | null; // 0-100
  motifNonMesure: MotifNonMesureServi[] | null;
  provenance: ProvenanceChiffre | null;
  carteLiee: CarteLiee | null;
};

// Le haut de chaque anneau porte son nom : les points partent d'un
// demi-pas plus loin, pour ne jamais le recouvrir.
function position(i: number, n: number, rayon: number, ecart = 0): { x: number; y: number } {
  const angle = ((i + 0.5) / n) * 2 * Math.PI - Math.PI / 2;
  return { x: CENTRE + (rayon + ecart) * Math.cos(angle), y: CENTRE + (rayon + ecart) * Math.sin(angle) };
}

export function CerclesBesoinsCockpit({ besoins }: { besoins: BesoinCercle[] }) {
  const ordonnes = [...besoins].sort((a, b) => a.id - b.id);
  const chiffresMasques = useChiffresMasques();

  return (
    <div className="flex w-full flex-col gap-3">
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        width="100%"
        height="320"
        role="img"
        aria-label="Cercles concentriques des 12 besoins par strate"
      >
        {STRATES.map(s => (
          <g key={s.code}>
            <circle cx={CENTRE} cy={CENTRE} r={s.rayon} fill="none" stroke={s.encre} strokeOpacity={0.35} strokeWidth={1} />
            <text
              x={CENTRE}
              y={CENTRE - s.rayon - 4}
              textAnchor="middle"
              fontSize={11}
              fill="var(--muted-foreground)"
            >
              {s.nom}
            </text>
          </g>
        ))}
        {STRATES.flatMap(s => {
          const duCercle = ordonnes.filter(b => b.strate === s.code);
          return duCercle.map((b, i) => {
            const p = position(i, duCercle.length, s.rayon);
            const etiquette = position(i, duCercle.length, s.rayon, 16);
            return (
              <g key={b.id} data-besoin={b.id} data-mesure={b.couverture !== null ? 'oui' : 'non'}>
                {b.couverture !== null ? (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={RAYON_POINT}
                    fill={s.teinte}
                    fillOpacity={
                      provenanceEtablie(b.provenance) && !chiffresMasques
                        ? opaciteRemplissage(b.couverture)
                        : OPACITE_PLANCHER
                    }
                    stroke={s.encre}
                    strokeWidth={1.5}
                  />
                ) : (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={RAYON_POINT}
                    fill="var(--surface)"
                    stroke={s.encre}
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                )}
                <text
                  x={etiquette.x}
                  y={etiquette.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fill="var(--foreground)"
                >
                  {`B${b.id}`}
                </text>
              </g>
            );
          });
        })}
      </svg>

      <ol aria-label="Les 12 besoins, en texte" className="space-y-1 text-sm">
        {ordonnes.map(b => {
          const cle = `B${b.id} · ${b.libelle}`;
          return (
            <li key={b.id}>
              <span className="text-foreground">{cle}</span>
              <span className="text-muted-foreground">
                {' — '}
                {b.couverture === null ? (
                  'Non mesuré'
                ) : !provenanceEtablie(b.provenance) ? (
                  MENTION_SOURCE_NON_ENREGISTREE
                ) : chiffresMasques ? (
                  <ValeurMasquee className="text-sm" />
                ) : (
                  `${b.couverture}%`
                )}
              </span>
              {b.couverture === null && b.motifNonMesure && b.motifNonMesure.length > 0 && (
                <DetailMotifNonMesure besoin={cle} motifs={b.motifNonMesure} />
              )}
              {b.couverture !== null && provenanceEtablie(b.provenance) && !chiffresMasques && (
                <>
                  {b.carteLiee && (
                    <span className="block text-xs text-muted-foreground">{MENTION_CARTE_LIEE[b.carteLiee]}</span>
                  )}
                  <DetailProvenance objet={cle} lignes={lignesProvenance(b.provenance)} aGauche />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
