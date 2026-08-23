import { deepStrictEqual, match, ok, strictEqual } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import { analyser, cibleSansLigne, neutraliserBlocsDeCode, texteAncre } from './wn-ancres-doctrine.mjs';

// Ce que ce banc garde, et le sens dans lequel il est écrit.
//
// Le risque de ce contrôle n'est PAS de rater une ancre rompue — une ancre
// rompue de plus laisse la situation d'avant, qui est celle de 252 citations
// non gardées. Le risque est qu'il soit VERT SANS SUJET : la convention étant
// neuve, l'ensemble contrôlé a commencé à zéro, et un contrôle qui ne vérifie
// rien est le plus rassurant des mensonges. D'où la sentinelle sur le dépôt
// réel, plus bas, qui exige un plancher d'ancres.
//
// Second risque, plus vicieux : qu'on puisse ÉCHAPPER au contrôle en rendant
// une ancre invérifiable — un verbatim élidé, un texte de deux caractères. Ces
// cas sont des VIOLATIONS, jamais des silences.

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(RACINE, 'scripts', 'wn-ancres-doctrine.mjs');

/** `analyser` sur des fichiers en mémoire — aucun accès disque. */
function analyserSur(markdown, fichiers) {
  return analyser('/', 'doc.md', chemin => {
    if (chemin === 'doc.md') return markdown;
    if (chemin in fichiers) return fichiers[chemin];
    throw new Error('absent');
  });
}

describe('texteAncre — la décoration n’est pas la citation', () => {
  it('retire guillemets, code spans et emphase, dans les deux ordres', () => {
    strictEqual(texteAncre('« texte »'), 'texte');
    strictEqual(texteAncre('`symbole`'), 'symbole');
    strictEqual(texteAncre('**« texte »**'), 'texte');
    strictEqual(texteAncre('« **texte** »'), 'texte');
    strictEqual(texteAncre('_texte_'), 'texte');
  });

  // LE FAUX POSITIF MESURÉ LE 2026-08-23 : la citation de [[D-097]] portait du
  // gras, et l'instrument de mesure l'avait comptée morte pour cette seule
  // raison. Sans ce cas, la même erreur se rejoue au premier verbatim stylé.
  it('un verbatim en gras reste vérifiable', () => {
    const r = analyserSur(
      'voir [**« ne l’écris jamais »**](web/x.ts)',
      { 'web/x.ts': 'const c = "ne l’écris jamais";' },
    );
    deepStrictEqual(r.violations, []);
    strictEqual(r.conformes.length, 1);
  });

  it('ne mange pas un contenu qui ressemble à de la décoration', () => {
    // Un astérisque isolé à l'intérieur ne doit pas faire dépouiller le texte.
    strictEqual(texteAncre('a * b'), 'a * b');
  });
});

describe('cibleSansLigne — le numéro de ligne est décoratif', () => {
  it('l’ancre de ligne ne fait pas partie du chemin', () => {
    strictEqual(cibleSansLigne('web/x.ts#L12'), 'web/x.ts');
    strictEqual(cibleSansLigne('web/x.ts#L12-L18'), 'web/x.ts');
    strictEqual(cibleSansLigne('web/x.ts'), 'web/x.ts');
  });
});

describe('neutraliserBlocsDeCode — un document qui montre la règle n’est pas jugé par elle', () => {
  it('le contenu d’un bloc clôturé est neutralisé, les décalages préservés', () => {
    const source = 'avant\n```markdown\n[« exemple »](web/x.ts)\n```\naprès';
    const neutralise = neutraliserBlocsDeCode(source);
    ok(!neutralise.includes('exemple'));
    strictEqual(neutralise.split('\n').length, source.split('\n').length);
    strictEqual(neutralise.length, source.length);
  });

  it('une ancre hors bloc reste vue', () => {
    const r = analyserSur(
      'réel [« vrai »](web/x.ts)\n```\n[« exemple »](web/absent.ts)\n```',
      { 'web/x.ts': 'un vrai texte' },
    );
    strictEqual(r.conformes.length, 1);
    deepStrictEqual(r.violations, []);
  });
});

describe('analyser — ce qu’il refuse', () => {
  it('un texte qui a disparu du fichier cité est une violation', () => {
    const r = analyserSur('[« envolé »](web/x.ts)', { 'web/x.ts': 'plus rien ici' });
    strictEqual(r.violations.length, 1);
    match(r.violations[0].motif, /n’existe plus/);
  });

  // LA PORTE DE SERVICE, tenue fermée : rendre une ancre invérifiable ne doit
  // jamais valoir dispense. Sans ces deux cas, il suffirait d'ajouter « […] »
  // à une citation fausse pour la faire taire.
  it('un verbatim élidé est une violation, jamais un silence', () => {
    for (const elide of ['[…]', '[...]', '…', '...']) {
      const r = analyserSur(`[« début ${elide} fin »](web/x.ts)`, { 'web/x.ts': 'début et fin' });
      strictEqual(r.violations.length, 1, `élision non refusée : ${elide}`);
      match(r.violations[0].motif, /élidé/);
    }
  });

  it('un verbatim trop court est une violation', () => {
    const r = analyserSur('[« ok »](web/x.ts)', { 'web/x.ts': 'ok' });
    strictEqual(r.violations.length, 1);
    match(r.violations[0].motif, /trop court/);
  });

  it('un fichier cité introuvable est une violation', () => {
    const r = analyserSur('[« texte »](web/absent.ts)', {});
    strictEqual(r.violations.length, 1);
    match(r.violations[0].motif, /introuvable/);
  });

  it('la violation situe la ligne du document, pas celle du fichier cité', () => {
    const r = analyserSur('un\ndeux\n[« envolé »](web/x.ts)', { 'web/x.ts': 'rien' });
    strictEqual(r.violations[0].situe, 'doc.md:3');
  });
});

describe('analyser — ce qu’il laisse tranquille', () => {
  it('un lien dont le texte EST le chemin n’est pas une ancre', () => {
    // Le corpus en compte quarante-huit. Les contrôler reviendrait à chercher
    // le chemin À L'INTÉRIEUR du fichier — faux négatif garanti.
    const r = analyserSur('[web/x.ts](web/x.ts)', { 'web/x.ts': 'contenu' });
    deepStrictEqual(r.violations, []);
    strictEqual(r.conformes.length, 0);
  });

  it('une citation de l’ancienne forme est COMPTÉE, jamais jugée', () => {
    const r = analyserSur('voir `web/x.ts:288-294` et `y.ts:12`', {});
    deepStrictEqual(r.violations, []);
    strictEqual(r.heritees, 2);
  });

  // NON-RÉGRESSION DU SUR-APPARIEMENT, mesuré sur le corpus réel. En admettant
  // tout `]` dans le texte, la reconnaissance franchissait les renvois
  // `[[D-xxx]]` et avalait tout jusqu'au prochain `](chemin)` : une « ancre »
  // de 51 000 caractères, un rapport de 400 Ko, et le vrai lien noyé dedans.
  it('un renvoi [[D-xxx]] n’est pas avalé par l’ancre qui suit', () => {
    const r = analyserSur(
      'posé par [[D-043]] puis, plus loin, [« le vrai texte »](web/x.ts)',
      { 'web/x.ts': 'contient le vrai texte ici' },
    );
    deepStrictEqual(r.violations, []);
    strictEqual(r.conformes.length, 1);
    strictEqual(r.conformes[0].texte, 'le vrai texte');
  });

  it('une ancre ne franchit jamais une fin de ligne', () => {
    const r = analyserSur('[début\nfin](web/x.ts)', { 'web/x.ts': 'peu importe' });
    deepStrictEqual(r.violations, []);
    strictEqual(r.conformes.length, 0);
  });

  it('deux liens voisins ne se confondent pas', () => {
    const r = analyserSur('[« premier »](web/a.ts) puis [« second »](web/b.ts)', {
      'web/a.ts': 'le premier fichier', 'web/b.ts': 'le second fichier',
    });
    deepStrictEqual(r.violations.map(v => v.motif), []);
    deepStrictEqual(r.conformes.map(c => c.cible), ['web/a.ts', 'web/b.ts']);
  });
});

describe('wn-ancres-doctrine — sentinelle sur le dépôt RÉEL', () => {
  function lancer(args = []) {
    const res = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: RACINE, encoding: 'utf8' });
    return { code: res.status, out: res.stdout, err: res.stderr };
  }

  // ANTI-VACUITÉ. C'est le cas central de ce fichier : le jour où la dernière
  // ancre textuelle disparaît du corpus, le contrôle redevient vert en ne
  // vérifiant rien, et personne ne le voit. Ce plancher rougit à la place.
  it('le corpus porte des ancres, et elles tiennent toutes', () => {
    const { code, out } = lancer(['--json']);
    const rapport = JSON.parse(out);
    deepStrictEqual(rapport.violations, [], 'une ancre du corpus est rompue');
    ok(
      rapport.conformes >= 4,
      `le contrôle n’a plus de sujet : ${rapport.conformes} ancre(s) conforme(s). `
        + 'Un contrôle sans ancre est vert sans rien vérifier — poser une ancre, ou décider que la convention est abandonnée.',
    );
    // Le grandfathering est un CHIFFRE, pas une intention : s'il tombe à zéro,
    // c'est qu'une réécriture de masse a eu lieu, et elle se relit.
    ok(rapport.heritees > 100, 'les citations héritées ont disparu : réécriture de masse ?');
    strictEqual(code, 0);
  });

  // CONTRE-ÉPREUVE : le contrôle sait rougir sur le corpus réel. Sans elle, la
  // sentinelle ci-dessus prouverait seulement que rien ne casse — pas que le
  // contrôle regarde.
  it('une ancre altérée fait rougir le contrôle, avec son motif', async () => {
    // Le fichier cité est lu POUR DE VRAI : la contre-épreuve doit prouver que
    // le contrôle a cherché le texte et ne l'a pas trouvé — pas qu'il a buté
    // sur un chemin absent, ce qui serait un tout autre motif.
    const { readFileSync } = await import('node:fs');
    const r = analyser(RACINE, 'docs/DECISIONS.md', chemin => (
      chemin === 'docs/DECISIONS.md'
        ? 'ancre mutée : [« ce texte n’existe dans aucun fichier du dépôt »](web/prisma/seed.ts)'
        : readFileSync(join(RACINE, chemin), 'utf8')
    ));
    strictEqual(r.violations.length, 1);
    match(r.violations[0].motif, /n’existe plus/);
  });
});
