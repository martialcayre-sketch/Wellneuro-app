import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BANDES_DE_BRUIT } from '@/lib/equilibre/momentumParBesoin';
import { PUCES_ENCART_D560, SURFACES_D560, TITRE_ENCART_D560 } from './encartD560';

// LE BANC DE L'ENCART DE [[D-560]] §4 (OF-2).
//
// Trois gardes :
// 1. le texte servi est celui de la décision, mot pour mot ;
// 2. « aucune ne l'est » reste vrai : la table des bandes de bruit est vide
//    et non publiée (arbitrage du 2026-11-25, question `20261125-1435-a-3`) ;
// 3. chaque surface livrée du §1 porte l'encart, et aucun mot qui qualifie.

const RACINE_WEB = path.resolve(__dirname, '../../..');
const D560 = path.resolve(RACINE_WEB, '../docs/decisions/D-560.md');

/** Typographie neutralisée : apostrophes et blancs. Les mots, eux, comptent. */
function normaliser(texte: string): string {
  return texte.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

function encartDeLaDecision(): { titre: string; puces: string[] } {
  const texte = readFileSync(D560, 'utf8');
  const debut = texte.indexOf('**§4 — Encart des refus.**');
  const fin = texte.indexOf('**§5', debut);
  expect(debut, 'D-560 §4 introuvable').toBeGreaterThan(-1);
  expect(fin, 'D-560 §5 introuvable').toBeGreaterThan(debut);
  const bloc = texte.slice(debut, fin);
  const titre = /\*\*(Ce que cette vue ne calcule pas)\*\*/.exec(bloc)?.[1] ?? '';
  const puces = bloc
    .slice(bloc.indexOf(titre) + titre.length + 2)
    .split(/\n– /)
    .map((morceau) => normaliser(morceau.replace(/^– /, '')))
    .filter((morceau) => morceau.length > 0);
  return { titre, puces };
}

describe('Encart des refus de D-560 §4', () => {
  it('le titre et les puces servis sont ceux de la décision, mot pour mot', () => {
    const decision = encartDeLaDecision();
    expect(decision.puces.length, 'anti-vacuité : la décision porte cinq puces').toBe(5);
    expect(TITRE_ENCART_D560).toBe(decision.titre);
    expect(PUCES_ENCART_D560.map(normaliser)).toEqual(decision.puces);
  });

  it('« aucune ne l’est » : BANDES_DE_BRUIT reste vide et non publiée', () => {
    // Ce banc rougit le jour où une bande paraît. Ce n'est pas un défaut à
    // contourner : l'encart affirmerait alors une chose fausse. Amender D-560
    // (texte validé mot pour mot) AVANT de publier la bande, puis ce banc.
    expect(PUCES_ENCART_D560[0]).toContain('aucune ne l’est');
    expect(BANDES_DE_BRUIT.publiee).toBe(false);
    expect(BANDES_DE_BRUIT.datePublication).toBeNull();
    expect(BANDES_DE_BRUIT.bandes).toHaveLength(0);
  });

  it('le composant de l’encart rend le titre et les puces de la décision', () => {
    const source = readFileSync(path.resolve(RACINE_WEB, 'src/components/patient-cockpit/EncartRefusD560.tsx'), 'utf8');
    expect(source).toContain('TITRE_ENCART_D560');
    expect(source).toContain('PUCES_ENCART_D560.map');
  });
});

describe('Surfaces de D-560 §1', () => {
  const livrees = SURFACES_D560.filter((s): s is typeof s & { fichier: string } => s.fichier !== null);

  it('anti-vacuité : au moins une surface est livrée (OF-2)', () => {
    expect(livrees.map((s) => s.lot)).toContain('OF-2');
  });

  for (const surface of livrees) {
    describe(`${surface.lot} — ${surface.nom}`, () => {
      const chemin = path.resolve(RACINE_WEB, surface.fichier);

      it('le fichier existe', () => {
        expect(existsSync(chemin), chemin).toBe(true);
      });

      it('porte l’encart des refus', () => {
        const source = readFileSync(chemin, 'utf8');
        expect(source).toMatch(/import \{ EncartRefusD560 \} from '@\/components\/patient-cockpit\/EncartRefusD560'/);
        expect(source).toContain('<EncartRefusD560 />');
      });

      it('n’écrit aucun mot qui qualifie un écart, ni flèche, ni pourcentage', () => {
        // Les commentaires sont retirés : la règle porte sur ce que l'écran
        // peut afficher, pas sur l'explication du code.
        const code = readFileSync(chemin, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|[^:])\/\/.*$/gm, '$1');
        expect(code).not.toMatch(/am[ée]lior|stable|progr[eè]s|r[ée]gress|aggrav|en hausse|en baisse|grâce à|pendant que/i);
        expect(code).not.toMatch(/[↑↓→←⬆⬇]|&rarr;|&uarr;|&darr;/);
        expect(code).not.toMatch(/\d\s*%|%\s*d['’]adh/);
      });
    });
  }
});
