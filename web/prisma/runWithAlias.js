#!/usr/bin/env node
// Loader partagé pour les scripts Prisma ponctuels de ce dossier (backfill,
// contrôle de cohérence...) : jiti ne lit pas tsconfig.json par défaut, donc
// on lui fournit explicitement l'alias @ → src (même alias que
// web/tsconfig.json) pour que ces scripts puissent réutiliser du code de
// web/src (ex. web/src/lib/consultation/packRegistry.ts) sans dupliquer sa
// logique.
const path = require('path');

// Chargé avant tout `require`/`import` du script cible : `@/lib/prisma`
// instancie son client Prisma dès son import (au niveau module), donc
// DATABASE_URL doit déjà être en place avant que jiti ne commence à évaluer
// quoi que ce soit.
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const target = process.argv[2];
if (!target) {
  console.error('Usage: node runWithAlias.js <fichier.ts> [...args]');
  process.exit(1);
}

const jiti = require('jiti')(__filename, {
  alias: { '@': path.join(__dirname, '..', 'src') },
});

jiti(path.resolve(target));
