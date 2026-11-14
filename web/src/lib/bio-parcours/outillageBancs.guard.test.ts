import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { estFichierSource, estUnTest, fichiersSource, IMPORT_NON_CONSTANT, RACINE } from './balayageSources';
import { atteintLePaquet, atteintSous, contexteResolution, importsResolus } from './resolutionImports';

// L'OUTILLAGE DES BANCS DE GARDE N'EST PAS DE LA PRODUCTION (question de
// `wn-reviewer` sur #2092, lot `garde-outillage-bancs`). `balayageSources.ts`
// et `resolutionImports.ts` vivent sous `web/src` pour que les bancs les
// importent par l'alias `@/`, mais ils lisent le disque, lancent `git` et
// chargent `typescript` : seuls les fichiers de test les atteignent. Un module
// de production qui les importerait les embarquerait — dans le bundle client
// s'il est client.
//
// Ce banc suit la FERMETURE RÉSOLUE, sur le patron de
// `bibliotheque-options/importeurs.guard.test.ts` ([[D-480]] §8) : il part de
// tout le code de production de `web/` (entrées, worker et cron de
// `web/scripts/` compris), lit chaque import par le parseur, le résout comme
// TypeScript (alias, liens symboliques suivis), et suit chaque fichier atteint
// dans le dépôt — un fichier de test ou ignoré qu'importe la production est
// balayé à son tour. Un import NOMME l'outillage (motif), l'ATTEINT
// (résolution) ou est INDÉTERMINÉ (non constant, nom nu inconnu) : il fait de
// son fichier un importeur. Tout import compte, `import type` compris : aucune
// production n'a besoin des types de l'outillage.
//
// Aucun importeur n'est admis.
const OUTILLAGE: readonly string[] = [
  'web/src/lib/bio-parcours/balayageSources.ts',
  'web/src/lib/bio-parcours/resolutionImports.ts',
];

// Le nom du module, avec ou sans extension ni requête (`?raw`), casse ignorée
// (macOS résout `./BalayageSources`).
const nommeLOutillage = (specificateur: string) =>
  /(^|\/)(balayageSources|resolutionImports)(\.[cm]?[jt]sx?)?(\?.*)?$/i.test(specificateur);

/**
 * LE CLIENT PRISMA EN LIEN HORS DU DÉPÔT (`wn-reviewer` sur ce lot) : le
 * contrôle de fusion pose `web/src/generated/prisma` en lien symbolique vers la
 * copie source. Canonicalisé, le fichier atteint sort alors du dépôt (`../…`) :
 * il est ramené à son chemin DANS le dépôt, pour rester balayé — et exempté de
 * la règle des noms nus, comme le client généré l'est (`importsResolus`).
 */
const CLIENT_GENERE = 'web/src/generated/prisma/';
function dansLeDepot(atteint: string | null): string | null {
  if (atteint === null || !atteint.startsWith('../')) return atteint;
  const i = atteint.indexOf(`/${CLIENT_GENERE}`);
  return i === -1 ? atteint : atteint.slice(i + 1);
}

/** Les sources de `web/` hors de `web/src` : entrées, `web/scripts/` (worker, cron), configurations. */
const fichiersHorsSrc = () =>
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'web', ':!web/src'], {
    cwd: RACINE,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(estFichierSource);

/**
 * La fermeture depuis `depart` : rend les fichiers qui importent l'outillage,
 * dans l'ordre de découverte, et les fichiers atteints hors du départ. Suit
 * tout fichier source atteint DANS le dépôt, hors de `node_modules`.
 */
function importeursDeLOutillage(depart: readonly string[], racine: string = RACINE) {
  const contexte = contexteResolution(racine);
  const vus = new Set(depart);
  const file = [...depart];
  const importeurs: string[] = [];
  const atteints: string[] = [];
  while (file.length > 0) {
    const chemin = file.shift() as string;
    let importeur = false;
    for (const i of importsResolus(chemin, contexte)) {
      const { specificateur, indetermine } = i;
      const atteint = dansLeDepot(i.atteint);
      if (indetermine || nommeLOutillage(specificateur) || atteintSous(atteint, OUTILLAGE)) {
        importeur = true;
        continue;
      }
      if (
        atteint !== null &&
        !atteint.startsWith('../') &&
        !/(^|\/)node_modules\//.test(atteint) &&
        estFichierSource(atteint) &&
        !vus.has(atteint)
      ) {
        vus.add(atteint);
        atteints.push(atteint);
        file.push(atteint);
      }
    }
    if (importeur) importeurs.push(chemin);
  }
  return { importeurs, atteints };
}

describe('outillage des bancs de garde — importé par aucun module de production', () => {
  const sources = [...fichiersSource(), ...fichiersHorsSrc()];

  it('le balayage voit l’outillage et les entrées hors de web/src (anti-vacuité)', () => {
    for (const f of OUTILLAGE) expect(sources).toContain(f);
    expect(sources).toContain('web/instrumentation-client.ts');
    expect(sources).toContain('web/scripts/bioExtractionWorker.ts');
  });

  it('aucun code de production n’importe balayageSources ni resolutionImports', () => {
    const { importeurs, atteints } = importeursDeLOutillage(
      sources.filter(chemin => !estUnTest(chemin) && !OUTILLAGE.includes(chemin)),
    );
    expect(
      importeurs,
      'un module de production importe l’outillage des bancs (lecture du disque, git, typescript) : '
        + 'le déplacer dans un fichier de test, ou en extraire la partie pure hors de bio-parcours/',
    ).toEqual([]);
    // Anti-vacuité du suivi : le client Prisma généré, ignoré, est atteint et balayé.
    expect(atteints.some(f => f.startsWith('web/src/generated/prisma/'))).toBe(true);
    // Le parseur et le résolveur lisent tout `web/` : délai élargi.
  }, 120_000);

  // ANTI-VACUITÉ DU MOTIF ET DE LA RÉSOLUTION : les bancs, eux, l'importent —
  // par `./`, `../` et `@/`. Un détecteur aveugle les manquerait.
  it('les bancs qui importent l’outillage sont vus (anti-vacuité)', () => {
    const contexte = contexteResolution();
    const bancs = [
      'web/src/lib/bio-parcours/resolutionImports.guard.test.ts',
      'web/src/lib/bibliotheque-options/importeurs.guard.test.ts',
      'web/src/lib/decisions-parcours/lecteursDecisionsParcours.guard.test.ts',
    ];
    for (const banc of bancs) {
      const imports = importsResolus(banc, contexte);
      expect(imports.some(i => atteintSous(i.atteint, OUTILLAGE)), banc).toBe(true);
      expect(imports.some(i => nommeLOutillage(i.specificateur)), banc).toBe(true);
    }
    // `resolutionImports.ts` importe `balayageSources.ts` : vu aussi.
    expect(importeursDeLOutillage(['web/src/lib/bio-parcours/resolutionImports.ts']).importeurs).toEqual([
      'web/src/lib/bio-parcours/resolutionImports.ts',
    ]);
  });

  // CONTRE-ÉPREUVE, sur une racine d'essai : un relais de production, un relais
  // de test qu'importe la production, un lien symbolique et un import non
  // constant sont chacun vus et nommés.
  it('chaque chemin vers l’outillage est vu : relais, test importé, lien, import indéterminé', () => {
    const racine = mkdtempSync(join(tmpdir(), 'wn-garde-outillage-'));
    try {
      const ecrire = (relatif: string, texte: string) => {
        mkdirSync(join(racine, relatif, '..'), { recursive: true });
        writeFileSync(join(racine, relatif), texte);
      };
      ecrire(OUTILLAGE[0], 'export const RACINE = "x";\n');
      ecrire('web/src/lib/relais.ts', "export { RACINE } from './bio-parcours/balayageSources';\n");
      ecrire('web/src/app/a/page.tsx', "import { RACINE } from '../../lib/relais';\nexport default RACINE;\n");
      expect(importeursDeLOutillage(['web/src/app/a/page.tsx'], racine)).toEqual({
        importeurs: ['web/src/lib/relais.ts'],
        atteints: ['web/src/lib/relais.ts'],
      });

      ecrire('web/src/lib/aide.test.ts', "export { RACINE } from './bio-parcours/balayageSources';\n");
      ecrire('web/src/app/b/page.tsx', "import { RACINE } from '../../lib/aide.test';\nexport default RACINE;\n");
      expect(importeursDeLOutillage(['web/src/app/b/page.tsx'], racine).importeurs).toEqual(['web/src/lib/aide.test.ts']);

      // Un lien de fichier `raccourci.ts -> balayageSources.ts` : le spécificateur
      // ne nomme pas l'outillage, le chemin réel (canonicalisé) est le sien.
      symlinkSync(join(racine, OUTILLAGE[0]), join(racine, 'web/src/lib/raccourci.ts'), 'file');
      ecrire('web/src/app/d/page.tsx', "import { RACINE } from '../../lib/raccourci';\nexport default RACINE;\n");
      expect(importeursDeLOutillage(['web/src/app/d/page.tsx'], racine).importeurs).toEqual(['web/src/app/d/page.tsx']);

      ecrire('web/src/app/e/page.tsx', "const nom = 'balayage' + 'Sources';\nexport default import(`../../lib/bio-parcours/${nom}`);\n");
      expect(importeursDeLOutillage(['web/src/app/e/page.tsx'], racine).importeurs).toEqual(['web/src/app/e/page.tsx']);

      // Témoin : un module sans import de l'outillage n'est pas nommé.
      ecrire('web/src/app/f/page.tsx', "import { X } from '../../lib/autre';\nexport default X;\n");
      ecrire('web/src/lib/autre.ts', 'export const X = 1;\n');
      expect(importeursDeLOutillage(['web/src/app/f/page.tsx'], racine).importeurs).toEqual([]);
    } finally {
      rmSync(racine, { recursive: true, force: true });
    }
    expect(nommeLOutillage(IMPORT_NON_CONSTANT)).toBe(false);
    expect(nommeLOutillage('./balayageSources?raw')).toBe(true);
    expect(nommeLOutillage('@/lib/bio-parcours/ResolutionImports.ts')).toBe(true);
    expect(nommeLOutillage('@/lib/bio-parcours/balayageSourcesBis')).toBe(false);
  });

  // CONTRE-ÉPREUVE DU CONTRÔLE DE FUSION : `web/src/generated/prisma` en vrai
  // lien vers une copie hors de la racine. Le client reste atteint, balayé sous
  // son chemin du dépôt, et ses noms nus ne le font pas importeur.
  it('le client Prisma généré en lien hors du dépôt reste atteint et balayé', () => {
    const racine = mkdtempSync(join(tmpdir(), 'wn-garde-client-racine-'));
    const ailleurs = mkdtempSync(join(tmpdir(), 'wn-garde-client-ailleurs-'));
    try {
      const client = join(ailleurs, CLIENT_GENERE);
      mkdirSync(client, { recursive: true });
      writeFileSync(join(client, 'client.ts'), "import * as runtime from 'paquet-du-runtime';\nexport * from './modeles';\nexport const r = runtime;\n");
      writeFileSync(join(client, 'modeles.ts'), "export { RACINE } from '../../lib/bio-parcours/balayageSources';\n");
      mkdirSync(join(racine, 'web/src/generated'), { recursive: true });
      mkdirSync(join(racine, 'web/src/app'), { recursive: true });
      symlinkSync(client, join(racine, 'web/src/generated/prisma'), 'dir');
      writeFileSync(join(racine, 'web/src/app/page.tsx'), "import { r } from '../generated/prisma/client';\nexport default r;\n");
      // Le constat : canonicalisé, le client sort de la racine.
      const [i] = importsResolus('web/src/app/page.tsx', contexteResolution(racine));
      expect(i.atteint).toMatch(/^\.\.\/.*\/web\/src\/generated\/prisma\/client\.ts$/);
      expect(dansLeDepot(i.atteint)).toBe(`${CLIENT_GENERE}client.ts`);
      // Le client et son voisin sont balayés ; le voisin qui importe l'outillage est nommé, le nom nu du client ne l'est pas.
      expect(importeursDeLOutillage(['web/src/app/page.tsx'], racine)).toEqual({
        importeurs: [`${CLIENT_GENERE}modeles.ts`],
        atteints: [`${CLIENT_GENERE}client.ts`, `${CLIENT_GENERE}modeles.ts`],
      });
    } finally {
      rmSync(racine, { recursive: true, force: true });
      rmSync(ailleurs, { recursive: true, force: true });
    }
  });
});

// CONTRE-ÉPREUVE REPORTÉE PAR #2092 : `atteintLePaquet` sur un vrai lien
// symbolique `web/node_modules -> …/node_modules`, comme le pose le contrôle
// de fusion. Le fichier atteint, canonicalisé, sort du dépôt (`../…`) : une
// cible `web/node_modules/<nom>/` ne le verrait plus, `atteintLePaquet` si.
describe('outillage des bancs — atteintLePaquet hors du dépôt (contre-épreuve de #2092)', () => {
  it('un paquet atteint par un node_modules en lien symbolique est reconnu', () => {
    const racine = mkdtempSync(join(tmpdir(), 'wn-garde-paquet-racine-'));
    const ailleurs = mkdtempSync(join(tmpdir(), 'wn-garde-paquet-ailleurs-'));
    try {
      const paquet = join(ailleurs, 'node_modules/@anthropic-ai/sdk');
      mkdirSync(paquet, { recursive: true });
      writeFileSync(join(paquet, 'package.json'), JSON.stringify({ name: '@anthropic-ai/sdk', version: '0.0.0', types: 'index.d.ts' }));
      writeFileSync(join(paquet, 'index.d.ts'), 'export declare const X: number;\n');
      mkdirSync(join(racine, 'web/src/app'), { recursive: true });
      symlinkSync(join(ailleurs, 'node_modules'), join(racine, 'web/node_modules'), 'dir');
      writeFileSync(join(racine, 'web/src/app/page.tsx'), "import { X } from '@anthropic-ai/sdk';\nexport default X;\n");

      const [i] = importsResolus('web/src/app/page.tsx', contexteResolution(racine));
      expect(i.indetermine).toBe(false);
      // Le constat : le chemin canonicalisé sort de la racine.
      expect(i.atteint).toMatch(/^\.\.\/.*\/node_modules\/@anthropic-ai\/sdk\/index\.d\.ts$/);
      expect(realpathSync(join(realpathSync(racine), i.atteint as string))).toBe(realpathSync(join(paquet, 'index.d.ts')));
      expect(atteintSous(i.atteint, ['web/node_modules/@anthropic-ai/'])).toBe(false);
      // Ce que les bancs utilisent : reconnu, et sur la portée exacte seulement.
      expect(atteintLePaquet(i, '@anthropic-ai')).toBe(true);
      expect(atteintLePaquet(i, '@anthropic-ai/sdk')).toBe(true);
      expect(atteintLePaquet(i, '@anthropic')).toBe(false);
      expect(atteintLePaquet(i, 'sdk')).toBe(false);
    } finally {
      rmSync(racine, { recursive: true, force: true });
      rmSync(ailleurs, { recursive: true, force: true });
    }
  });
});
