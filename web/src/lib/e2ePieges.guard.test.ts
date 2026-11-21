import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// TROIS PIÈGES DES SPECS E2E, LUS DANS LE TEXTE (lot `autonomie-pieges-restes`,
// partie 7). Chacun a fait rougir un CI sans rapport avec le lot qui le
// portait, et chacun se lit à la source, avant tout run :
//
// 1. « HIER » = MAINTENANT MOINS 24 H. Le dernier dimanche d'octobre dure 25 h
//    à Paris : entre 23 h et minuit, `Date.now() - 86_400_000` tombe encore le
//    jour même (T3 du 2026-10-25 à 23 h 32, six échecs agenda). Une date se
//    décale sur le calendrier : `decalerDate(dateJourParis(), n)`.
// 2. `textContent()` DU `<body>`. Il lit aussi les `<script>` du flux RSC, et
//    le `buildId` aléatoire contenait « taux » au CI de #821 : un test de
//    lexique interdit a rougi sur une PR de docs. `innerText()` lit l'écran.
// 3. FLÈCHES ET DÉFILEMENT SOUS WEBKIT. Les flèches ne font rien défiler sous
//    le WebKit de Playwright, pas même la page (#1895, avec témoin) ; Safari
//    réel défile. Une assertion de défilement aux flèches jouée sur iPhone 13
//    rougit sans rien prouver : elle se borne à Chromium.
//
// LE QUATRIÈME PIÈGE N'EST PAS ICI. « Minuit UTC » (#1595) tenait à un état
// partagé entre deux tests d'un spec sériel, que le texte ne laisse pas lire
// en général ; il est corrigé dans le test même
// (`biologie-document-patient.spec.ts`, troisième test).
//
// TROUS ASSUMÉS. La règle 1 lit la constante d'un jour en millisecondes,
// sous ses formes courantes, et pas un calcul éclaté (`const j = 24 * h`). La
// règle 2 ne voit que le `<body>` et le `<html>` nommés, pas un ancêtre
// atteint autrement. La règle 3 lit le fichier entier : une garde WebKit posée
// dans un autre `describe` du même fichier la satisfait.

const WEB = path.resolve(__dirname, '../..');
const E2E = path.join(WEB, 'e2e');

/**
 * Les instants légitimes : un horodatage décalé de n jours n'est pas une
 * date-calendrier. Chaque entrée nomme son fichier, son nombre d'occurrences
 * et pourquoi. Un compte qui bouge rougit, dans les deux sens.
 */
const INSTANTS_ADMIS: Record<string, { occurrences: number; motif: string }> = {
  'helpers/db.ts': {
    occurrences: 1,
    motif: '`provisionAncreJalon` : `dateT0` est l’instant de l’ancre T0, stocké comme tel, jamais formaté en jour',
  },
};

/**
 * Le texte, commentaires remplacés par des espaces (sauts de ligne gardés),
 * chaînes INTACTES : `'body'` et `'ArrowRight'` sont des chaînes, et ce sont
 * elles que les règles lisent. Les chaînes sont seulement sautées, pour qu'un
 * `'http://'` n'ouvre pas un commentaire.
 */
export function sansCommentaires(texte: string): string {
  let sortie = '';
  let i = 0;
  const blanc = (s: string) => s.replace(/[^\n]/g, ' ');
  while (i < texte.length) {
    const c = texte[i];
    const suivant = texte[i + 1];
    if (c === '/' && suivant === '/') {
      let fin = texte.indexOf('\n', i);
      if (fin === -1) fin = texte.length;
      sortie += blanc(texte.slice(i, fin));
      i = fin;
    } else if (c === '/' && suivant === '*') {
      let fin = texte.indexOf('*/', i + 2);
      fin = fin === -1 ? texte.length : fin + 2;
      sortie += blanc(texte.slice(i, fin));
      i = fin;
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < texte.length && texte[j] !== c) j += texte[j] === '\\' ? 2 : 1;
      const fin = Math.min(j + 1, texte.length);
      sortie += texte.slice(i, fin);
      i = fin;
    } else {
      sortie += c;
      i += 1;
    }
  }
  return sortie;
}

const UN_JOUR_EN_MS = new RegExp(
  [
    String.raw`\b86_?400_?000\b`,
    String.raw`\b864e5\b`,
    String.raw`\b24\s*\*\s*60\s*\*\s*60\s*\*\s*1_?000\b`,
    String.raw`\b1_?000\s*\*\s*60\s*\*\s*60\s*\*\s*24\b`,
    String.raw`\b60\s*\*\s*60\s*\*\s*24\s*\*\s*1_?000\b`,
    String.raw`\b24\s*\*\s*3_?600_?000\b`,
    String.raw`\b3_?600_?000\s*\*\s*24\b`,
  ].join('|'),
  'g',
);

/** Règle 1 — les numéros de ligne où un jour s'écrit en millisecondes. */
export function joursEnMillisecondes(source: string): number[] {
  const lignes: number[] = [];
  sansCommentaires(source).split('\n').forEach((ligne, i) => {
    const n = ligne.match(UN_JOUR_EN_MS)?.length ?? 0;
    lignes.push(...Array<number>(n).fill(i + 1));
  });
  return lignes;
}

const TEXTE_DU_BODY = [
  /\.locator\(\s*(['"`])(?:body|html)\1\s*\)\s*\.\s*(?:textContent|allTextContents)\s*\(/,
  /\.textContent\(\s*(['"`])(?:body|html)\1/,
];

/** Règle 2 — les numéros de ligne où le texte du `<body>` est lu par `textContent`. */
export function texteDuBody(source: string): number[] {
  const lignes: number[] = [];
  sansCommentaires(source).split('\n').forEach((ligne, i) => {
    if (TEXTE_DU_BODY.some(re => re.test(ligne))) lignes.push(i + 1);
  });
  return lignes;
}

const FLECHE = /\.press\(\s*(['"`])Arrow(?:Left|Right|Up|Down)\1/;
const DEFILEMENT = /\bscroll(?:Left|Top|X|Y|Width|Height)\b|\bpageXOffset\b|\bpageYOffset\b/;
const GARDE_WEBKIT = /test\.(?:skip|fixme)\([^;]*(['"`])webkit\1/;

/**
 * Règle 3 — le fichier presse une flèche ET lit un défilement, sans écarter
 * WebKit (`test.skip(browserName === 'webkit', …)`).
 */
export function flechesSansGardeWebKit(source: string): boolean {
  const texte = sansCommentaires(source);
  return FLECHE.test(texte) && DEFILEMENT.test(texte) && !GARDE_WEBKIT.test(texte);
}

function specs(dossier: string, sortie: string[] = []): string[] {
  for (const nom of readdirSync(dossier)) {
    if (nom === 'node_modules') continue;
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) specs(chemin, sortie);
    else if (/\.tsx?$/.test(nom)) sortie.push(chemin);
  }
  return sortie;
}

const relatif = (chemin: string) => path.relative(E2E, chemin).split(path.sep).join('/');

describe('pièges E2E lus dans le texte', () => {
  describe('témoins', () => {
    it('règle 1 : un jour en millisecondes est relevé, le décalage calendrier ne l’est pas', () => {
      expect(joursEnMillisecondes('const hier = f(new Date(Date.now() - 86_400_000));')).toEqual([1]);
      expect(joursEnMillisecondes('x\nconst d = Date.now() + n * 24 * 60 * 60 * 1000;')).toEqual([2]);
      expect(joursEnMillisecondes('const d = Date.now() - 864e5;')).toEqual([1]);
      expect(joursEnMillisecondes('const hier = decalerDate(dateJourParis(), -1);')).toEqual([]);
      // Un commentaire qui cite la forme fautive ne compte pas.
      expect(joursEnMillisecondes('// `Date.now() - 86_400_000` était faux\nconst a = 1;')).toEqual([]);
    });

    it('règle 2 : le textContent du body est relevé, innerText et un élément nommé ne le sont pas', () => {
      expect(texteDuBody("const r = await page.locator('body').textContent();")).toEqual([1]);
      expect(texteDuBody('const r = await page.textContent("body");')).toEqual([1]);
      expect(texteDuBody("const r = await page.locator('html').allTextContents();")).toEqual([1]);
      expect(texteDuBody("const r = await page.locator('body').innerText();")).toEqual([]);
      expect(texteDuBody('const r = await lien.textContent();')).toEqual([]);
    });

    it('règle 3 : flèche et défilement sans garde WebKit sont relevés, avec garde ils ne le sont pas', () => {
      const sonde = [
        "await frise.press('ArrowRight');",
        'expect(await frise.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);',
      ].join('\n');
      expect(flechesSansGardeWebKit(sonde)).toBe(true);
      expect(
        flechesSansGardeWebKit(
          "test.skip(browserName === 'webkit', 'les flèches ne défilent rien sous WebKit');\n" + sonde,
        ),
      ).toBe(false);
      // Une flèche sans lecture de défilement (navigation dans une liste) est libre.
      expect(flechesSansGardeWebKit("await liste.press('ArrowDown');")).toBe(false);
    });

    it('les chaînes ne sont pas prises pour des commentaires', () => {
      expect(sansCommentaires("const u = 'http://x'; // note")).toBe("const u = 'http://x';        ");
    });
  });

  const fichiers = specs(E2E);

  it('le balayage lit bien les specs', () => {
    expect(fichiers.length).toBeGreaterThan(30);
  });

  it('règle 1 : aucune date-calendrier décalée de 24 h, hors instants admis', () => {
    const fautifs: string[] = [];
    const comptes: Record<string, number> = {};
    for (const f of fichiers) {
      const lignes = joursEnMillisecondes(readFileSync(f, 'utf8'));
      if (lignes.length === 0) continue;
      const nom = relatif(f);
      if (INSTANTS_ADMIS[nom]) comptes[nom] = lignes.length;
      else fautifs.push(...lignes.map(l => `${nom}:${l}`));
    }
    expect(
      fautifs,
      'un jour en millisecondes : décaler la date par `decalerDate(dateJourParis(), n)`, ou, pour un instant, l’admettre ici avec son motif',
    ).toEqual([]);
    expect(comptes).toEqual(
      Object.fromEntries(Object.entries(INSTANTS_ADMIS).map(([nom, { occurrences }]) => [nom, occurrences])),
    );
  });

  it('règle 2 : aucun textContent du body', () => {
    const fautifs = fichiers.flatMap(f => texteDuBody(readFileSync(f, 'utf8')).map(l => `${relatif(f)}:${l}`));
    expect(fautifs, 'lire l’écran par `innerText()` : `textContent()` lit aussi les scripts RSC et leur buildId').toEqual([]);
  });

  it('règle 3 : aucune assertion de défilement aux flèches jouée sous WebKit', () => {
    const fautifs = fichiers.filter(f => flechesSansGardeWebKit(readFileSync(f, 'utf8'))).map(relatif);
    expect(
      fautifs,
      'prouver le défilement clavier sous Chromium seulement (`test.skip(browserName === \'webkit\', …)`) ; sous WebKit, s’arrêter à « Tab atteint la région »',
    ).toEqual([]);
  });
});
