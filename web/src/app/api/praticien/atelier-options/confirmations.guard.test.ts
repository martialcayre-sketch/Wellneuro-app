import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// GARDE : CE QUE LES ROUTES DE L'ATELIER EXIGENT, UN ÉCRAN DOIT POUVOIR LE
// FOURNIR ([[D-480]] §3 ; patron de `fiches-usage/confirmations.guard.test.ts`).
//
// Valider exige la déclaration de relecture intégrale, strictement `true`
// (D-195 §1), l'empreinte du texte vu et le jeton du dernier acte vu ; saisir
// exige la dernière version vue. Les bancs des routes prouvent qu'elles
// refusent sans eux ; ils ne voient pas qu'aucun écran ne les envoie. Et la
// déclaration est un GESTE : jamais un `relectureIntegrale: true` écrit en dur.

const RACINE = path.join(process.cwd(), 'src');
const ICI = path.join(RACINE, 'app', 'api', 'praticien', 'atelier-options');

const VOIES = [
  {
    nom: 'acte',
    url: /['"`]\/api\/praticien\/atelier-options\/actes['"`]/,
    route: path.join(ICI, 'actes', 'route.ts'),
    cles: ['idTexte', 'acte', 'empreinteVue', 'dernierActeVu', 'relectureIntegrale'],
  },
  {
    nom: 'version',
    url: /['"`]\/api\/praticien\/atelier-options\/versions['"`]/,
    route: path.join(ICI, 'versions', 'route.ts'),
    cles: ['optionId', 'rubrique', 'texte', 'derniereVersionVue'],
  },
];

function fichiersSources(depart: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) {
      if (entree === 'node_modules' || entree === '.next') continue;
      trouves.push(...fichiersSources(complet));
    } else if (/\.tsx?$/.test(entree) && !/\.test\.tsx?$/.test(entree)) {
      trouves.push(complet);
    }
  }
  return trouves;
}

const SOURCES = fichiersSources(RACINE).map(f => ({ fichier: f, source: readFileSync(f, 'utf-8') }));

/** Les clés de chaque `JSON.stringify({ … })` d'une source — les clés seulement. */
function corps(source: string): string[][] {
  return [...source.matchAll(/JSON\.stringify\(\{([^}]*)\}\)/g)].map(m =>
    [...`,${m[1]},`.matchAll(/,\s*(\w+)\s*(?=[:,])/g)].map(c => c[1]),
  );
}

describe.each(VOIES)('Atelier des options, $nom — ce que la route lit, l’écran l’envoie (D-480, D-195)', voie => {
  const appelants = SOURCES.filter(s => s.fichier !== voie.route && voie.url.test(s.source));

  it('la route lit chacune des clés exigées', () => {
    const lues = readFileSync(voie.route, 'utf-8');
    for (const cle of voie.cles) expect(lues, cle).toMatch(new RegExp(`\\b${cle}\\b`));
  });

  it('un écran au moins l’appelle (le banc n’est pas vide)', () => {
    expect(appelants.length).toBeGreaterThanOrEqual(1);
  });

  it('chaque appelant poste toutes les clés exigées, et la déclaration n’est jamais une constante', () => {
    for (const { fichier, source } of appelants) {
      const envois = corps(source).filter(c => c.includes(voie.cles[0]));
      expect(envois.length, path.relative(RACINE, fichier)).toBeGreaterThanOrEqual(1);
      for (const cles of envois) expect(cles).toEqual(expect.arrayContaining(voie.cles));
      expect(source, path.relative(RACINE, fichier)).not.toMatch(/relectureIntegrale\s*:\s*true\b/);
    }
  });
});
