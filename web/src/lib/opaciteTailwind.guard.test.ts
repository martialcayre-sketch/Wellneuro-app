import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// AUCUNE CLASSE D'OPACITÉ NEUVE SUR UN JETON QUI NE L'ACCEPTE PAS (lot
// `autonomie-pieges-restes`, partie 3).
//
// LE PIÈGE. Un jeton de `tailwind.config.ts` écrit `var(--x)`, sans la forme
// `rgb(var(--x-rgb) / <alpha-value>)`, ne prend pas de modificateur
// d'opacité : `text-muted-foreground/70` n'est tout simplement pas générée
// (constaté le 2026-11-07 avec le Tailwind 3.4 du dépôt). Le texte hérite
// alors de la couleur du parent. Rien ne rougit : ni `tsc`, ni le lint, ni le
// build ; la classe a l'air de marcher.
//
// LE CONTRÔLE. Les classes `<utilitaire>-<couleur>/<n>` de `src/` sont
// compilées en mémoire avec la configuration du dépôt, et chacune doit
// produire une règle. Les occurrences d'avant ce banc sont gelées, classe par
// classe et au compte près : les corriger change l'écran, ce qui n'est pas
// l'objet de ce lot. Le « correctif » naturel, ajouter le jumeau RGB au
// jeton, ferait tomber `muted-foreground/70` sous le contraste AA : pour
// atténuer, la classe pleine.
//
// LA FRONTIÈRE. Une classe construite (`bg-${x}/10`) ne se lit pas ; une
// couleur arbitraire (`bg-[#fff]/10`) non plus. Une opacité arbitraire
// (`/[.14]`) est lue. Les variantes (`hover:`) sont retirées : la génération
// ne dépend que de la couleur. Seuls sont lus les dossiers que Tailwind lit
// (`content` de `tailwind.config.ts`) : ailleurs, une classe n'est jamais
// générée, même valide.

const WEB = path.resolve(__dirname, '../..');
const DOSSIERS = ['pages', 'components', 'app'].map(d => path.join(WEB, 'src', d));
const exiger = createRequire(path.join(WEB, 'package.json'));

const UTILITAIRES =
  'text|bg|border|ring|ring-offset|from|to|via|fill|stroke|outline|divide|placeholder|decoration|shadow|accent|caret';
const CLASSE_OPACITE = new RegExp(
  `(?<![\\w-])(?:[a-z-]+:)*((?:${UTILITAIRES})-[a-z0-9-]+\\/(?:\\d+|\\[[^\\]\\s]+\\]))(?![\\w-])`,
  'g',
);

/** Classes non générées connues à la pose du banc, avec leur nombre d'occurrences. */
const GEL: Record<string, number> = {
  'border-border/50': 1,
  'border-border/60': 15,
  'border-border/70': 1,
  'text-muted-foreground/60': 2,
  'text-muted-foreground/70': 18,
  'text-primary-foreground/80': 1,
};

function sources(dossier: string, sortie: string[] = []): string[] {
  if (!existsSync(dossier)) return sortie;
  for (const nom of readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) sources(chemin, sortie);
    else if (/\.(tsx?|jsx?)$/.test(nom) && !/\.test\.[jt]sx?$/.test(nom)) sortie.push(chemin);
  }
  return sortie;
}

function occurrences(): Map<string, string[]> {
  const parClasse = new Map<string, string[]>();
  for (const fichier of DOSSIERS.flatMap(d => sources(d))) {
    for (const m of readFileSync(fichier, 'utf8').matchAll(CLASSE_OPACITE)) {
      const liste = parClasse.get(m[1]) ?? [];
      liste.push(path.relative(WEB, fichier));
      parClasse.set(m[1], liste);
    }
  }
  return parClasse;
}

/** Les classes, parmi `classes`, pour lesquelles Tailwind ne produit aucune règle. */
async function nonGenerees(classes: string[]): Promise<string[]> {
  const postcss = exiger('postcss');
  const tailwind = exiger('tailwindcss');
  const chargerConfig = exiger('tailwindcss/loadConfig');
  const config = chargerConfig(path.join(WEB, 'tailwind.config.ts'));
  const { css } = await postcss([
    tailwind({ ...config, content: [{ raw: classes.join(' ') }], safelist: [] }),
  ]).process('@tailwind utilities;', { from: undefined });
  // Sélecteur borné : `.bg-primary\/8` est un préfixe de `.bg-primary\/80`,
  // compilée dans le même CSS (P1 de wn-reviewer).
  return classes.filter(c => {
    const selecteur = `.${c.replace(/[^\w-]/g, s => `\\${s}`)}`;
    return !new RegExp(`${selecteur.replace(/[\\.[\]]/g, s => `\\${s}`)}(?=[\\s{,:])`).test(css);
  });
}

describe("classes d'opacité Tailwind", () => {
  it('le compilateur discrimine : un jeton <alpha-value> est généré, un var(--x) nu ne l’est pas', async () => {
    expect(await nonGenerees(['bg-primary/10', 'text-muted-foreground/70'])).toEqual([
      'text-muted-foreground/70',
    ]);
  });

  it('le compilateur discrimine : `/8` hors échelle, compilée à côté de `/80`, reste non générée', async () => {
    expect(await nonGenerees(['bg-primary/8', 'bg-primary/80'])).toEqual(['bg-primary/8']);
  });

  it('le compilateur discrimine : une opacité arbitraire suit la même règle que le jeton', async () => {
    expect(await nonGenerees(['bg-accent/[.14]', 'text-muted-foreground/[.7]'])).toEqual([
      'text-muted-foreground/[.7]',
    ]);
  });

  it('la lecture des sources trouve des classes à opacité', () => {
    expect(occurrences().size).toBeGreaterThan(20);
  });

  it('aucune classe à opacité non générée hors du gel, et le gel au compte près', async () => {
    const parClasse = occurrences();
    const absentes = await nonGenerees([...parClasse.keys()]);
    const constat = Object.fromEntries(absentes.sort().map(c => [c, parClasse.get(c)!.length]));
    const neuves = absentes
      .filter(c => !(c in GEL))
      .map(c => `${c} — ${[...new Set(parClasse.get(c))].join(', ')}`);
    expect(neuves, 'classe à opacité sur un jeton sans <alpha-value> : écrire la classe pleine').toEqual([]);
    // Strict : une occurrence corrigée fait baisser le gel dans la même PR.
    expect(constat).toEqual(GEL);
  });
});
