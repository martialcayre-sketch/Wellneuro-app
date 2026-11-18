import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// [[D-539]] §7a à §7c ter — le dossier RGPD déclare le second appel AVANT son
// ouverture. Chaque texte validé mot pour mot le 2026-11-18 est relu dans la
// décision et cherché dans le dossier, aux blancs près (le dossier coupe ses
// lignes, la décision non).

const RACINE = join(__dirname, '../../../../..');
const D539 = readFileSync(join(RACINE, 'docs/decisions/D-539.md'), 'utf8');
const DOSSIER = readFileSync(join(RACINE, 'docs/DOSSIER_RGPD.md'), 'utf8');

const aplatir = (t: string) => t.replace(/\s+/g, ' ').trim();

/** Les citations « > » qui suivent une rubrique de la décision, jusqu'à la suivante. */
function citations(rubrique: string): string[] {
  const debut = D539.indexOf(rubrique);
  expect(debut, `${rubrique} introuvable`).toBeGreaterThanOrEqual(0);
  const suite = D539.slice(debut + rubrique.length);
  const fin = suite.search(/\n(?:\*7|\*\*§)/);
  return suite
    .slice(0, fin === -1 ? undefined : fin)
    .split(/\n\s*\n/)
    .map(bloc => bloc.trim())
    .filter(bloc => bloc.startsWith('>'))
    .map(bloc => bloc.split('\n').map(l => l.replace(/^>\s?/, '')).join('\n'));
}

describe('dossier RGPD — les textes de D-539 §7, mot pour mot', () => {
  it('7a : la déclaration du contexte de prélèvement nomme l’appel distinct', () => {
    const [texte] = citations('*7a. Dossier RGPD, rubrique 2');
    expect(aplatir(DOSSIER)).toContain(aplatir(texte.replace(/…$/, '')));
  });

  it('7a bis : la ligne du contexte de prélèvement, rubrique 5', () => {
    const [texte] = citations('*7a bis. Dossier RGPD, rubrique 5');
    expect(aplatir(DOSSIER)).toContain(aplatir(texte));
    expect(DOSSIER).not.toContain("rien n'en part à l'IA ni dans l'export du dossier");
  });

  it('7b : le paragraphe 2 quater, entier, après 2 ter et avant la rubrique 3', () => {
    const [texte] = citations('*7b. Dossier RGPD, paragraphe neuf de la rubrique 2');
    expect(texte.startsWith('### 2 quater.')).toBe(true);
    expect(aplatir(DOSSIER)).toContain(aplatir(texte));
    const quater = DOSSIER.indexOf('### 2 quater.');
    expect(quater).toBeGreaterThan(DOSSIER.indexOf('### 2 ter.'));
    expect(quater).toBeLessThan(DOSSIER.indexOf('\n## 3. Base légale'));
  });

  it('7c et 7c bis : la ligne Anthropic de la rubrique 6 et le cinquième flux de la rubrique 7', () => {
    const [ligne6] = citations('*7c. Dossier RGPD, rubrique 6');
    const [flux] = citations('*7c bis. Dossier RGPD, rubrique 7');
    expect(aplatir(DOSSIER)).toContain(aplatir(ligne6));
    expect(aplatir(DOSSIER)).toContain(aplatir(flux));
    expect(DOSSIER.indexOf('Anthropic — cinquième flux')).toBeGreaterThan(DOSSIER.indexOf('Anthropic — quatrième flux'));
  });

  it('7c ter : l’AIPD compte la rubrique 2 quater', () => {
    expect(DOSSIER).toContain("modèles d'IA des rubriques 2 bis, 2 ter et 2 quater compris");
    expect(DOSSIER).not.toContain("modèles d'IA des rubriques 2 bis et 2 ter compris");
  });
});
