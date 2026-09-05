// Invariant du seuil de comparaison visuelle (`web/e2e/visual.spec.ts`).
//
// Un seuil est le réglage qu'on desserre quand un rouge dérange, et le diff ne
// montre alors qu'un chiffre qui grandit. C'est arrivé sans que personne le
// décide : `maxDiffPixelRatio: 0.02` tolérait ~48 960 pixels sur le cockpit,
// 1 483 fois le bruit réel — et une baseline périmée a vécu dessous jusqu'à
// #872, verte, en photographiant un état que le code ne produisait plus.
//
// Ce banc ne défend pas une valeur pour elle-même. Il défend le fait qu'elle
// ait été MESURÉE : le bruit entre le contexte de génération et celui de
// comparaison a été relevé le 2026-09-05 (run 33923782703) à 33 pixels au pire,
// cinq comparaisons sur huit étant identiques au bit près.
//
// Deux exigences, et la seconde n'est pas cosmétique :
//
// 1. LE SEUIL RESTE ABSOLU. Un ratio se paie en surface : les mêmes 2 %
//    achetaient 48 960 px au cockpit (1440×1700) contre 7 560 à
//    `portail-connexion` (420×900). L'indulgence suivait la taille de l'image
//    au lieu de l'importance de l'écran, et des pixels morts gonflaient le
//    dénominateur (#871).
// 2. IL RESTE SOUS 196 PIXELS — l'aire de boîte d'une icône de statut de 14 px,
//    le plus petit élément dont le changement doit rougir. Au-dessus, la garde
//    cesse de voir ce qu'elle est là pour voir.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHEMIN = path.join(RACINE, 'web/e2e/visual.spec.ts');
const SOURCE = fs.readFileSync(CHEMIN, 'utf8');

/** Source privée de ses commentaires — un seuil cité en prose n'est pas un réglage. */
function sansCommentaires(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

const EFFECTIF = sansCommentaires(SOURCE);

// L'aire de boîte d'une icône de statut de 14 px (`IconeStatut`, size={14}) :
// le plus petit élément dont un changement doit faire rougir la comparaison.
const AIRE_ICONE_STATUT = 14 * 14;

test('la comparaison visuelle se règle en pixels absolus, jamais en ratio', () => {
  assert.doesNotMatch(
    EFFECTIF,
    /maxDiffPixelRatio/,
    'visual.spec.ts est revenu à `maxDiffPixelRatio` : un ratio fait suivre la tolérance à la TAILLE de '
      + 'l’image et non à l’importance de l’écran — 2 % valaient 48 960 px sur le cockpit contre 7 560 sur '
      + '`portail-connexion` — et des pixels morts y gonflent le dénominateur. Utiliser `maxDiffPixels`.',
  );
});

test('le seuil en pixels est déclaré, et sous l’aire d’une icône de statut', () => {
  const declares = [...EFFECTIF.matchAll(/maxDiffPixels\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(
    declares.length > 0,
    'visual.spec.ts ne déclare plus aucun `maxDiffPixels` : la comparaison au pixel n’a plus de seuil explicite.',
  );

  for (const valeur of declares) {
    assert.ok(
      valeur <= AIRE_ICONE_STATUT,
      `seuil de ${valeur} pixels : au-dessus de ${AIRE_ICONE_STATUT} (l’aire de boîte d’une icône de statut `
        + 'de 14 px), la comparaison cesse de voir le plus petit élément dont le changement doit la faire '
        + 'rougir. Le bruit mesuré le 2026-09-05 (run 33923782703) est de 33 pixels au pire, cinq '
        + 'comparaisons sur huit étant identiques au bit près : desserrer au-delà demande une NOUVELLE '
        + 'mesure, pas une estimation.',
    );
  }
});
