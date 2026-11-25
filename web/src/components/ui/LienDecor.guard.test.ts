import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const WEB = path.resolve(__dirname, '../../..');

// Garde du §1 quater : « Un lot ne pose un décor que par elle. » Aucun
// fichier de `web/src` hors de la primitive ne cite un fond, un ornement ou
// un motif du kit. La marque (`brand/`) n'est pas un décor.
const CITATION_DECOR = /wellneuro-lien\/(?:backgrounds|ornaments|patterns)\//;
const PRIMITIVE = new Set([
  'src/components/ui/LienDecor.tsx',
  'src/components/ui/LienDecor.test.tsx',
  'src/components/ui/LienDecor.guard.test.ts',
]);

function citationsHorsPrimitive(sources: Record<string, string>): string[] {
  return Object.entries(sources)
    .filter(([fichier, texte]) => !PRIMITIVE.has(fichier) && CITATION_DECOR.test(texte))
    .map(([fichier]) => fichier);
}

function lireSources(dossier: string, acc: Record<string, string> = {}): Record<string, string> {
  for (const entree of readdirSync(dossier)) {
    const chemin = path.join(dossier, entree);
    if (statSync(chemin).isDirectory()) lireSources(chemin, acc);
    else if (/\.(?:tsx?|css|mdx?)$/.test(entree)) acc[path.relative(WEB, chemin)] = readFileSync(chemin, 'utf8');
  }
  return acc;
}

describe('LienDecor — seule porte du décor', () => {
  it('rougit sur une citation du kit hors de la primitive (sources fabriquées)', () => {
    expect(
      citationsHorsPrimitive({
        'src/app/x/page.tsx': "style={{ backgroundImage: \"url('/wellneuro-lien/backgrounds/login-calm.svg')\" }}",
        'src/components/y.css': '.y { background: url(/wellneuro-lien/patterns/fine-dots.svg); }',
        'src/components/z.tsx': "<img src='/wellneuro-lien/ornaments/alliance-arcs.svg' alt='' />",
        'src/app/layout.tsx': "{ url: '/wellneuro-lien/brand/favicon.svg' }",
        'src/components/ui/LienDecor.tsx': "'/wellneuro-lien/ornaments/alliance-arcs.svg'",
      }),
    ).toEqual(['src/app/x/page.tsx', 'src/components/y.css', 'src/components/z.tsx']);
  });

  it('aucun fichier de web/src ne cite un décor du kit hors de la primitive', () => {
    expect(citationsHorsPrimitive(lireSources(path.join(WEB, 'src')))).toEqual([]);
  });
});
