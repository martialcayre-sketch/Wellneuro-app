// Réplique EXACTE de la normalisation serveur (web/src/lib/rag/validation.ts).
// Toute divergence d'un octet fait échouer l'ingestion avec HASH_MISMATCH :
// le hash client doit reproduire la règle serveur au caractère près.
// Parité prouvée par tools/corpus/lib/wellneuro-text.parity.test.mjs contre
// la vraie implémentation TypeScript.

import { createHash } from 'node:crypto';

// Règle WellNeuro : strip BOM initial ; CRLF/CR → LF ; strip espaces/tabs en fin
// de ligne ; réduire les \n finaux à exactement un.
export function normalizeWellneuroText(input) {
  const withoutBom = input.startsWith('﻿') ? input.slice(1) : input;
  const lf = withoutBom.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const noTrailingWhitespace = lf
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');
  return `${noTrailingWhitespace.replace(/\n*$/g, '')}\n`;
}

// Hash d'intégrité : SHA-256 hex minuscule du texte ENTIER normalisé (front
// matter inclus). C'est la valeur à envoyer dans contentSha256.
export function sha256WellneuroText(input) {
  return createHash('sha256').update(normalizeWellneuroText(input), 'utf8').digest('hex');
}

// Corps soumis à l'embedding : texte normalisé sans le front matter YAML.
// (Calculé côté serveur ; répliqué ici pour les contrôles locaux seulement.)
export function embeddingTextForChunk(input) {
  const normalized = normalizeWellneuroText(input);
  if (!normalized.startsWith('---\n')) return normalized;
  const end = normalized.indexOf('\n---\n', 4);
  return end < 0 ? normalized : normalized.slice(end + 5);
}
