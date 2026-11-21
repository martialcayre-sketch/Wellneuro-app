import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PREALABLES_WORKTREE, prealablesManquants } from './worktreePret';

// Banc du préalable de `vitest.config.ts` (lot `autonomie-pieges-restes`,
// partie 4) : un `web/` de worktree neuf est refusé, remède nommé.

const dossiers: string[] = [];
function webFactice(fichiers: string[]): string {
  const web = mkdtempSync(path.join(tmpdir(), 'wn-worktree-pret-'));
  dossiers.push(web);
  for (const f of fichiers) {
    mkdirSync(path.dirname(path.join(web, f)), { recursive: true });
    writeFileSync(path.join(web, f), '');
  }
  return web;
}
afterEach(() => {
  for (const d of dossiers.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('préalables d’un worktree pour Vitest', () => {
  it('un web/ de worktree neuf manque des deux, remède nommé', () => {
    expect(prealablesManquants(webFactice([]))).toEqual([
      'node_modules/vitest/package.json (npm ci)',
      'src/generated/prisma/index.js (npx prisma generate)',
    ]);
  });

  it('npm ci sans prisma generate : le client manque encore', () => {
    expect(prealablesManquants(webFactice(['node_modules/vitest/package.json']))).toEqual([
      'src/generated/prisma/index.js (npx prisma generate)',
    ]);
  });

  it('les deux préalables présents : rien ne manque', () => {
    expect(prealablesManquants(webFactice(PREALABLES_WORKTREE.map(([f]) => f)))).toEqual([]);
  });

  it('ce web/ est prêt, sinon ce banc ne tournerait pas', () => {
    expect(prealablesManquants(path.resolve(__dirname, '../..'))).toEqual([]);
  });
});
