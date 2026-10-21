import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEXTE_MINEUR_JEUNE, decouperNumeros } from './texteMineurs';

// ACT-5 (H78) — le texte 2B de G-11 est servi MOT POUR MOT, le texte 2A ne l'est
// pas, et l'écran qui le porte ne s'affiche qu'à un dossier mineur. Ces trois
// bancs tiennent aussi la part « garde d'âge » de J2-conf pour cette surface
// (arbitrage du 2026-10-21 : lot J2-conf fondu dans ACT-5).

const SOURCE = resolve(process.cwd(), '../docs/claude/propositions/2026-10-14-g11-textes-patient/README.md');
const SRC = resolve(process.cwd(), 'src');

/** Les apostrophes du document source sont droites ; celles du portail, typographiques. */
const apostrophesDroites = (s: string) => s.replace(/’/g, "'");

/** La section « 2B — Pour le jeune » du texte validé : titres en gras, puis un paragraphe chacun. */
function sectionsValidees2B(): { titre: string; texte: string }[] {
  const doc = readFileSync(SOURCE, 'utf8');
  const debut = doc.indexOf('### 2B — Pour le jeune');
  expect(debut).toBeGreaterThan(-1);
  const suite = doc.slice(debut).split('\n').slice(1);
  const fin = suite.findIndex(l => /^#{1,3} /.test(l));
  const lignes = (fin === -1 ? suite : suite.slice(0, fin)).map(l => l.trim()).filter(Boolean);
  const sections: { titre: string; texte: string }[] = [];
  for (const ligne of lignes) {
    const titre = /^\*\*(.+)\*\*$/.exec(ligne);
    if (titre) sections.push({ titre: titre[1], texte: '' });
    else {
      expect(sections.length, `paragraphe hors section : ${ligne}`).toBeGreaterThan(0);
      const s = sections[sections.length - 1];
      expect(s.texte, `deux paragraphes sous « ${s.titre} »`).toBe('');
      s.texte = ligne;
    }
  }
  return sections;
}

function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap(nom => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

describe('texte des mineurs servi au jeune (G-11, 2B)', () => {
  it('★ reprend le texte validé le 2026-10-14 mot pour mot, sections dans l’ordre', () => {
    const servi = TEXTE_MINEUR_JEUNE.map(s => ({
      titre: apostrophesDroites(s.titre),
      texte: apostrophesDroites(s.texte),
    }));
    expect(servi).toEqual(sectionsValidees2B());
  });

  it('chaque numéro appelable figure dans son texte', () => {
    for (const s of TEXTE_MINEUR_JEUNE) {
      for (const n of s.numerosAppelables ?? []) {
        expect(decouperNumeros(s.texte, [n]).filter(m => m.numero)).toHaveLength(1);
      }
    }
  });

  it('★ le texte 2A (au titulaire de l’autorité parentale) n’est servi nulle part avant J3-mineurs', () => {
    // Ses titres propres, absents de 2B : s'ils paraissent dans le code servi,
    // le portail décrit une validation en ligne qui n'existe pas encore.
    const titres2A = [
      'Pourquoi votre accord est demandé',
      'L’accord d’un seul titulaire suffit',
      'Ce que vous validez',
      'La place de votre enfant',
      'Pas de secret envers vous',
      'Retirer votre accord',
    ].map(apostrophesDroites);
    const trouves = fichiers(SRC).flatMap(f => {
      const contenu = apostrophesDroites(readFileSync(f, 'utf8'));
      return titres2A.filter(t => contenu.includes(t)).map(t => `${f} : ${t}`);
    });
    expect(trouves).toEqual([]);
  });

  it('★ l’écran du mineur n’est rendu que sous une condition « mineur »', () => {
    const usages = fichiers(SRC).filter(f => /<EcranCircuitMineur\b/.test(readFileSync(f, 'utf8')));
    expect(usages.map(f => f.slice(SRC.length + 1)).sort()).toEqual([
      'app/portail/[token]/page.tsx',
      'app/portail/[token]/questionnaires/page.tsx',
    ]);
    for (const f of usages) {
      const contenu = readFileSync(f, 'utf8');
      for (const m of contenu.matchAll(/<EcranCircuitMineur\b/g)) {
        // La condition se lit juste avant le rendu : `step.name === 'mineur'`
        // à l'accueil, `statut === 'mineur' &&` aux questionnaires.
        const avant = contenu.slice(Math.max(0, (m.index ?? 0) - 200), m.index);
        expect(avant, f).toMatch(/(step\.name|statut) === 'mineur'/);
      }
    }
    // L'étape « mineur » de l'accueil ne naît que d'un statut « mineur ».
    const accueil = readFileSync(join(SRC, 'app/portail/[token]/page.tsx'), 'utf8');
    expect(accueil.match(/return \{ name: 'mineur' \}/g)).toHaveLength(1);
    expect(accueil).toContain("if (statut === 'mineur') return { name: 'mineur' };");
    // Un dossier clos n'est jamais traité en mineur : les deux pages le servent
    // en « majeur » (aucune date demandée, aucun texte des mineurs). Les
    // rendus eux-mêmes sont joués par `[token]/page.test.tsx`.
    for (const f of usages) {
      expect(readFileSync(f, 'utf8'), f).toMatch(/dossierOuvert === false \? 'majeur'/);
    }
  });

  it('le module se lit sur un Safari antérieur à 16.4 : aucun lookbehind', () => {
    const source = readFileSync(join(SRC, 'lib/patient/texteMineurs.ts'), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/\(\?<[!=]/);
  });
});

describe('decouperNumeros', () => {
  it('rend le texte d’origine, numéros isolés', () => {
    const texte = TEXTE_MINEUR_JEUNE[3].texte;
    const morceaux = decouperNumeros(texte, ['15', '112', '119']);
    expect(morceaux.map(m => m.morceau).join('')).toBe(texte);
    expect(morceaux.filter(m => m.numero).map(m => m.morceau)).toEqual(['15', '112', '119']);
  });

  it('ne lit pas un numéro dans un nombre plus long', () => {
    expect(decouperNumeros('appelle le 150 ou le 15.', ['15'])).toEqual([
      { morceau: 'appelle le 150 ou le ', numero: false },
      { morceau: '15', numero: true },
      { morceau: '.', numero: false },
    ]);
  });

  it('sans numéro, un seul morceau', () => {
    expect(decouperNumeros('Ton avis compte')).toEqual([{ morceau: 'Ton avis compte', numero: false }]);
  });
});
