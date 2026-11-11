'use client';

import { useId } from 'react';

/*
 * Marque Empreinte (A5-R3, [[D-481]] ; artefact « Wellneuro Lien —
 * Empreinte », composant EmpreinteBrand) : symbole WN lié, graine et arc
 * avoine, suivi du nom « Wellneuro » en Lora.
 *
 * - Le symbole est dessiné en ligne, aux couleurs des jetons : pétrole
 *   (`fill-primary`) sur clair, encre du rail (`fill-rail-foreground`) sur la
 *   nuit praticien ; l'arc en champagne mat. Aucune couleur codée en dur.
 * - Sous 32 px, petit format : ni graine ni arc.
 * - `compact` garde le nom en texte masqué : la marque reste nommée.
 * - Jamais une icône d'action ni un signe de validation ; pas d'animation à
 *   chaque navigation ; aucun numéro de version dans le symbole.
 *
 * Tracés : `web/public/wellneuro-lien/brand/empreinte-mark.svg` (kit
 * v2.0.0, provenance dans `web/public/wellneuro-lien/PROVENANCE.md`).
 */

const CONTOUR =
  'M39 68 C58 36 91 24 127 24 H157 C204 24 232 48 232 88 V157 C232 199 204 222 157 222 H101 C53 222 24 200 24 155 V114 C24 94 28 79 39 68 Z';
const LIEN =
  'M7 84 C37 64 48 85 60 119 L77 164 C87 133 94 100 107 94 C126 83 137 128 149 165 C156 144 153 120 167 108 C191 88 216 144 245 169 L257 204 C217 199 191 145 175 133 C169 128 166 131 165 139 L156 184 C151 214 131 219 119 190 L101 143 C90 169 84 194 74 199 C62 205 55 190 50 178 L28 121 C20 98 11 100 6 105 Z';
const GRAINE = 'M137 88 C139 63 152 49 176 45 C176 66 163 82 137 88 Z';
const ARC = 'M132 15 C164 -3 210 0 239 32 C251 47 258 66 254 87 C253 57 237 33 212 20 C185 6 156 5 132 15 Z';

/** Seuil du petit format (artefact : « sous 32 px »). */
export const EMPREINTE_PETIT_FORMAT = 32;

type Props = {
  /** `light` sur fond clair ; `night` dans le rail praticien. */
  tone?: 'light' | 'night';
  /** Côté du symbole en pixels (44 par défaut). */
  size?: number;
  /** Symbole seul ; le nom reste lisible par les lecteurs d'écran. */
  compact?: boolean;
  className?: string;
};

export function EmpreinteMarque({ tone = 'light', size = 44, compact = false, className = '' }: Props) {
  // useId peut contenir « : » ou « « » » : un identifiant SVG sûr n'en garde
  // que les caractères alphanumériques.
  const clipId = `empreinte-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const petit = size < EMPREINTE_PETIT_FORMAT;
  const encre = tone === 'night' ? 'fill-rail-foreground' : 'fill-primary';
  const nom = tone === 'night' ? 'text-rail-foreground' : 'text-primary';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} data-tone={tone}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className="shrink-0"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={CONTOUR} />
          </clipPath>
        </defs>
        <path
          d={petit ? `${CONTOUR} ${LIEN}` : `${CONTOUR} ${LIEN} ${GRAINE}`}
          fillRule="evenodd"
          clipPath={`url(#${clipId})`}
          className={encre}
        />
        {petit ? null : <path d={ARC} className="fill-lien-champagne" />}
      </svg>
      <span className={compact ? 'sr-only' : `font-marque text-2xl font-medium leading-tight tracking-tight ${nom}`}>
        Wellneuro
      </span>
    </span>
  );
}
