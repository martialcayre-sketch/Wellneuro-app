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
const APPEL = /\.\s*messages\s*\.\s*(stream|create)\s*\(/g;

/**
 * Le texte, chaînes et commentaires remplacés par des espaces (sauts de ligne
 * gardés) : un `'('` ou un « signal: » écrit dans un prompt ne compte pas
 * (Codex). Un gabarit `${…}` est masqué avec sa chaîne.
 */
function sansChainesNiCommentaires(texte: string): string {
  let sortie = '';
  let i = 0;
  const blanc = (s: string) => s.replace(/[^\n]/g, ' ');
  while (i < texte.length) {
    const c = texte[i];
    const suivant = texte[i + 1];
    let fin = -1;
    if (c === '/' && suivant === '/') {
      fin = texte.indexOf('\n', i);
      if (fin === -1) fin = texte.length;
    } else if (c === '/' && suivant === '*') {
      fin = texte.indexOf('*/', i + 2);
      fin = fin === -1 ? texte.length : fin + 2;
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < texte.length && texte[j] !== c) j += texte[j] === '\\' ? 2 : 1;
      fin = Math.min(j + 1, texte.length);
    }
    if (fin === -1) {
      sortie += c;
      i += 1;
    } else {
      sortie += blanc(texte.slice(i, fin));
      i = fin;
    }
  }
  return sortie;
}

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
function fluxSansSignal(source: string, fichier: string): { flux: number; fautifs: string[] } {
  const texte = sansChainesNiCommentaires(source);
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

  it('témoins (Codex) : prompt qui écrit « signal: », parenthèse dans une chaîne, appel coupé sur deux lignes', () => {
    expect(fluxSansSignal("a.messages.stream({ messages: [{ content: 'signal:' }] })", 'x').fautifs).toEqual(['x:1']);
    expect(
      fluxSansSignal("a.messages.stream({ content: '(' }); a.messages.stream({ m }, { signal });", 'x').fautifs,
    ).toEqual(['x:1']);
    expect(fluxSansSignal('a.messages\n  .stream({ model })', 'x').fautifs).toEqual(['x:1']);
    expect(fluxSansSignal('// a.messages.stream({ model })\nconst s = "a.messages.stream(";', 'x').flux).toBe(0);
  });

  it('chaque flux de src/ porte son propre signal', () => {
    let flux = 0;
    const fautifs: string[] = [];
    const incertains: string[] = [];
    for (const fichier of sources(RACINE)) {
      const source = readFileSync(fichier, 'utf8');
      const r = fluxSansSignal(source, path.relative(RACINE, fichier));
      flux += r.flux;
      fautifs.push(...r.fautifs);
      // Le masquage ne lit pas les littéraux regex : une apostrophe dans `/'/`
      // ouvrirait une fausse chaîne et blanchirait un vrai appel. Tout écart
      // entre le texte brut et le texte masqué se signale ici.
      const bruts = source.match(APPEL)?.length ?? 0;
      const lus = sansChainesNiCommentaires(source).match(APPEL)?.length ?? 0;
      if (bruts !== lus) incertains.push(`${path.relative(RACINE, fichier)} (${bruts} appels, ${lus} lus)`);
    }
    expect(incertains, 'appel au SDK masqué par la lecture : à vérifier à la main').toEqual([]);
    // Le banc lit bien quelque chose : l'extraction des comptes rendus est en flux.
    expect(flux).toBeGreaterThan(0);
    expect(fautifs, 'appel en flux sans AbortSignal : `timeout` ne borne pas le corps').toEqual([]);
  });
});
