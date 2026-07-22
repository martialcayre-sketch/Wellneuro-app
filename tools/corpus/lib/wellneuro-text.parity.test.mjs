// Prouve que la réplique JS (wellneuro-text.mjs) produit un hash identique à la
// vraie normalisation serveur (web/src/lib/rag/validation.ts), sur une batterie
// de cas limites. Node 22 lit le .ts directement (strip-types).
//
//   node --test tools/corpus/lib/wellneuro-text.parity.test.mjs
//
// (Exécuté depuis la racine du dépôt.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeWellneuroText, sha256WellneuroText } from './wellneuro-text.mjs';

const serveurUrl = pathToFileURL(path.resolve('web/src/lib/rag/validation.ts')).href;
const serveur = await import(serveurUrl);

const CAS = [
  'Texte simple.',
  '﻿Avec BOM en tête.',
  'Fin\r\nWindows\r\nCRLF',
  'Vieux\rMac\rCR',
  'Espaces en fin   \nde ligne\t\t\net tabs',
  'Plusieurs\n\n\nlignes vides finales\n\n\n',
  '---\ntitre: x\nnotebook: 09\n---\nCorps du chunk avec 100 mg et 2,5 g.\n',
  'Dosages µg et μg et 1 000 mg.',
  'Ligne unique sans newline finale',
  '',
  '\n\n\n',
  'Accents éàçüö et symboles % ± → mêlés.',
];

test('parité normalizeWellneuroText réplique ↔ serveur', () => {
  for (const c of CAS) {
    assert.equal(
      normalizeWellneuroText(c),
      serveur.normalizeWellneuroText(c),
      `normalize diverge sur : ${JSON.stringify(c)}`,
    );
  }
});

test('parité sha256WellneuroText réplique ↔ serveur', () => {
  for (const c of CAS) {
    assert.equal(
      sha256WellneuroText(c),
      serveur.sha256WellneuroText(c),
      `hash diverge sur : ${JSON.stringify(c)}`,
    );
  }
});

test('parité embeddingTextForChunk (front matter) réplique ↔ serveur', async () => {
  const { embeddingTextForChunk } = await import('./wellneuro-text.mjs');
  for (const c of CAS) {
    assert.equal(
      embeddingTextForChunk(c),
      serveur.embeddingTextForChunk(c),
      `embedding-text diverge sur : ${JSON.stringify(c)}`,
    );
  }
});
