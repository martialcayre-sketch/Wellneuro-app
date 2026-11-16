import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// TOUT APPEL EN FLUX AU SDK ANTHROPIC PORTE SON PROPRE `signal` (lot
// `autonomie-pieges-restes`, partie 3).
//
// LE PIÈGE. Dans `@anthropic-ai/sdk`, l'option `timeout` arme un minuteur que
// le `finally` du `fetch` retire dès l'arrivée des en-têtes : un flux dont le
// corps n'arrive jamais n'est borné par rien (constaté le 2026-10-04). L'import
// d'un compte rendu croyait tenir « 180 s, sous la péremption de 5 min » et
// pouvait rester `en_cours` sans fin ; BIO-INGEST LOT-08 l'a borné par un
// `AbortSignal` propre (`biology-library/import/extraction.ts`).
//
// LE CONTRÔLE. Chaque `messages.stream(` de `src/`, et chaque appel qui
// demande `stream: true`, porte `signal` dans ses arguments. Le banc lit le
// texte, parenthèses équilibrées ; il ne prouve pas que le signal s'arrête,
// seulement qu'il est passé — la preuve de la borne reste au test du module.
//
// LA FRONTIÈRE. `tools/corpus/` (outils hors ligne, lancés à la main) n'est
// pas lu : un flux qui pend y bloque une commande, pas un dossier.

const RACINE = path.resolve(__dirname, '..');
const APPEL = /\.messages\.(stream|create)\s*\(/g;

function sources(dossier: string, sortie: string[] = []): string[] {
  for (const nom of readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) sources(chemin, sortie);
    else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) sortie.push(chemin);
  }
  return sortie;
}

/** Le texte des arguments d'un appel dont `(` est à `ouvrante`, parenthèses équilibrées. */
function argumentsDeLAppel(texte: string, ouvrante: number): string {
  let profondeur = 0;
  for (let i = ouvrante; i < texte.length; i += 1) {
    if (texte[i] === '(') profondeur += 1;
    else if (texte[i] === ')' && --profondeur === 0) return texte.slice(ouvrante + 1, i);
  }
  return texte.slice(ouvrante + 1);
}

/** Les appels en flux d'un texte, et ceux qui n'ont pas de `signal` (`fichier:ligne`). */
function fluxSansSignal(texte: string, fichier: string): { flux: number; fautifs: string[] } {
  let flux = 0;
  const fautifs: string[] = [];
  for (const m of texte.matchAll(APPEL)) {
    const args = argumentsDeLAppel(texte, m.index! + m[0].length - 1);
    if (m[1] === 'create' && !/\bstream\s*:\s*true\b/.test(args)) continue;
    flux += 1;
    if (!/\bsignal\s*[:,}]/.test(args)) {
      fautifs.push(`${fichier}:${texte.slice(0, m.index).split('\n').length}`);
    }
  }
  return { flux, fautifs };
}

describe('appels en flux au SDK Anthropic', () => {
  it('témoins : un flux sans signal est relevé, un flux signé ou un appel simple ne l’est pas', () => {
    expect(fluxSansSignal('a.messages.stream({ model }).finalMessage()', 'x').fautifs).toEqual(['x:1']);
    expect(fluxSansSignal('a.messages.create({ model,\n stream: true }, { timeout: 1 })', 'x').fautifs).toEqual([
      'x:1',
    ]);
    expect(fluxSansSignal('a.messages.stream({ m }, { timeout: 1, signal: b.signal })', 'x')).toEqual({
      flux: 1,
      fautifs: [],
    });
    expect(fluxSansSignal('a.messages.stream({ m }, { signal })', 'x').fautifs).toEqual([]);
    expect(fluxSansSignal('a.messages.create({ model }, { timeout: 1 })', 'x')).toEqual({ flux: 0, fautifs: [] });
  });

  it('chaque flux de src/ porte son propre signal', () => {
    let flux = 0;
    const fautifs: string[] = [];
    for (const fichier of sources(RACINE)) {
      const r = fluxSansSignal(readFileSync(fichier, 'utf8'), path.relative(RACINE, fichier));
      flux += r.flux;
      fautifs.push(...r.fautifs);
    }
    // Le banc lit bien quelque chose : l'extraction des comptes rendus est en flux.
    expect(flux).toBeGreaterThan(0);
    expect(fautifs, 'appel en flux sans AbortSignal : `timeout` ne borne pas le corps').toEqual([]);
  });
});
