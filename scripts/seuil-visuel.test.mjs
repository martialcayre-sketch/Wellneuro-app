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
// 2. IL RESTE SOUS 219 PIXELS — le plus petit changement RÉEL mesuré à l'écran.
//    Au-dessus, la garde cesse de voir ce qu'elle est là pour voir.
//
// La borne valait 196 = 14×14, l'aire de BOÎTE d'une icône de statut. C'était un
// chiffre inventé : les traits d'une icône en occupent bien moins. Les aires
// réelles, relevées le 2026-09-05 sur la baseline `fiche-cockpit` (colonne des
// icônes du rail, x 316–344) :
//
//   ✓ (fait)              33 px d'encre
//   ○ (à ouvrir)          74 px
//   horloge (en attente)  97 px
//
//   substitution ✓ ↔ horloge         96 px
//   substitution ✓ ↔ ○               89 px
//   substitution horloge ↔ ○         23 px   ← sous le bruit mesuré (31–33 px)
//
// PRISE ISOLÉMENT, une icône ne peut donc pas être gardée : l'horloge et le
// cercle sont deux disques de 14 px que seules les aiguilles séparent, et leur
// écart est plus petit que le bruit entre contexte de génération et contexte de
// comparaison. Aucun seuil ne tolère l'un et voit l'autre.
//
// Mais une icône ne change JAMAIS seule. `IconeStatut statut={statut}` et
// `libelleStatut(phase.id, statut)` dérivent du même `statut` : le libellé bouge
// avec elle, et il pèse bien davantage — « renseignée » ↔ « à ouvrir » vaut
// 219 px (bande x 418–500, même relevé). C'est ce 219 qui borne utilement le
// seuil, parce que c'est le plus petit changement d'état réellement observable.

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

// Le plus petit changement d'état RÉELLEMENT observable, mesuré le 2026-09-05 :
// la substitution de libellé « renseignée » ↔ « à ouvrir », qui accompagne
// toujours celle de l'icône. Un seuil au-dessus cesserait de la voir.
const PLUS_PETIT_CHANGEMENT_MESURE = 219;

test('la comparaison visuelle se règle en pixels absolus, jamais en ratio', () => {
  assert.doesNotMatch(
    EFFECTIF,
    /maxDiffPixelRatio/,
    'visual.spec.ts est revenu à `maxDiffPixelRatio` : un ratio fait suivre la tolérance à la TAILLE de '
      + 'l’image et non à l’importance de l’écran — 2 % valaient 48 960 px sur le cockpit contre 7 560 sur '
      + '`portail-connexion` — et des pixels morts y gonflent le dénominateur. Utiliser `maxDiffPixels`.',
  );
});

test('le seuil en pixels est déclaré, et sous le plus petit changement mesuré', () => {
  const declares = [...EFFECTIF.matchAll(/maxDiffPixels\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(
    declares.length > 0,
    'visual.spec.ts ne déclare plus aucun `maxDiffPixels` : la comparaison au pixel n’a plus de seuil explicite.',
  );

  for (const valeur of declares) {
    assert.ok(
      valeur < PLUS_PETIT_CHANGEMENT_MESURE,
      `seuil de ${valeur} pixels : au niveau ou au-dessus de ${PLUS_PETIT_CHANGEMENT_MESURE}, la `
        + 'comparaison cesse de voir le plus petit changement d’état réellement observable — la '
        + 'substitution de libellé « renseignée » ↔ « à ouvrir », mesurée à 219 px le 2026-09-05. '
        + 'Le bruit, lui, vaut 33 px au pire (run 33923782703), cinq comparaisons sur huit étant '
        + 'identiques au bit près. Desserrer au-delà demande une NOUVELLE mesure, pas une estimation.',
    );
  }
});
