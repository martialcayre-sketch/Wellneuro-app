import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// GARDE : CE QUE LA ROUTE DES ACTES EXIGE, UN ÉCRAN DOIT POUVOIR LE FOURNIR
// ([[D-251]] §5, lot 6 ; patron de `booklet/confirmations.guard.test.ts`).
//
// Valider une fiche exige la déclaration de relecture intégrale, strictement
// `true` (D-195 §1), l'empreinte du contenu vu et le jeton du dernier acte vu.
// Les bancs de la route prouvent qu'elle refuse sans eux ; ils ne peuvent pas
// voir qu'aucun écran ne les envoie — le booklet a vécu vingt-trois jours ainsi.
//
// Et la déclaration est un GESTE : elle vient d'une case cochée, jamais d'une
// constante. Un `relectureIntegrale: true` écrit en dur ferait passer la route
// sans que personne ait rien déclaré.

const RACINE = path.join(process.cwd(), 'src');
const ROUTE = path.join(RACINE, 'app', 'api', 'praticien', 'fiches-assiette', 'actes', 'route.ts');
const DECISION = path.join(RACINE, 'lib', 'fiches-assiette', 'decision.ts');
// Quel que soit le délimiteur : un appelant en guillemets doubles ou en gabarit
// échappait au premier filet (constat de revue).
const URL_ACTES = /['"`]\/api\/praticien\/fiches-assiette\/actes['"`]/;
const POUR_VALIDER = ['idVersion', 'acte', 'contenuSha256Vu', 'dernierActeVu', 'relectureIntegrale'];

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

// D1 — les clés que la route lit dans le corps : son type `PostBody`.
function clesDeLaRoute(): string[] {
  const corps = /type PostBody = \{([^}]*)\}/.exec(readFileSync(ROUTE, 'utf-8'))?.[1] ?? '';
  return [...corps.matchAll(/(\w+)\?:/g)].map(m => m[1]);
}

// D2 — les appelants, et les clés de chaque `JSON.stringify({ … })` qu'ils
// postent. Les clés seulement : une clé suit une virgule (ajoutée en tête) et
// précède `:` ou `,` — la valeur `detail.dernierActe` n'en est pas une.
function appelants(): { fichier: string; source: string; corps: string[][] }[] {
  const trouves: { fichier: string; source: string; corps: string[][] }[] = [];
  for (const fichier of fichiersSources(RACINE)) {
    if (fichier === ROUTE) continue;
    const source = readFileSync(fichier, 'utf-8');
    if (!URL_ACTES.test(source)) continue;
    const corps = [...source.matchAll(/JSON\.stringify\(\{([^}]*)\}\)/g)]
      .map(m => [...`,${m[1]},`.matchAll(/,\s*(\w+)\s*(?=[:,])/g)].map(c => c[1]))
      .filter(cles => cles.includes('idVersion'));
    trouves.push({ fichier: path.relative(RACINE, fichier), source, corps });
  }
  return trouves;
}

describe('garde — l’acte du responsable est posable depuis un écran, et la déclaration y est un geste', () => {
  it('la route lit bien les clés attendues, et la décision exige `true` strict (les détecteurs mordent)', () => {
    expect(clesDeLaRoute()).toEqual([...POUR_VALIDER, 'motif']);
    expect(readFileSync(DECISION, 'utf-8')).toContain('relectureIntegrale !== true');
  });

  // Une URL bâtie autrement (constante importée, concaténation) passerait sous
  // le détecteur d'appelants : toute mention de la route hors d'un appelant lu
  // par la garde rougit.
  it('aucune mention de la route n’échappe au détecteur d’appelants', () => {
    const lus = new Set(appelants().map(a => a.fichier));
    const echappes = fichiersSources(RACINE)
      .filter(f => f !== ROUTE && readFileSync(f, 'utf-8').includes('fiches-assiette/actes'))
      .map(f => path.relative(RACINE, f))
      .filter(f => !lus.has(f));
    expect(echappes).toEqual([]);
  });

  it('au moins un écran poste vers la route, avec un corps lisible par la garde', () => {
    const trouves = appelants();
    expect(trouves.length).toBeGreaterThan(0);
    for (const a of trouves) expect(a.corps.length, `${a.fichier} : aucun JSON.stringify({ idVersion, … }) à plat`).toBeGreaterThan(0);
  });

  it('chaque clé de la route est envoyée par au moins un écran', () => {
    const envoyees = new Set(appelants().flatMap(a => a.corps.flat()));
    const orphelines = clesDeLaRoute().filter(c => !envoyees.has(c));
    expect(orphelines, `Clé(s) qu'aucun écran n'envoie : ${orphelines.join(', ')}.`).toEqual([]);
  });

  it('un même corps porte tout ce que la validation exige', () => {
    const complets = appelants().flatMap(a => a.corps).filter(cles => POUR_VALIDER.every(c => cles.includes(c)));
    expect(complets.length).toBeGreaterThan(0);
  });

  // Chaque valeur donnée à `relectureIntegrale` doit dériver de l'état d'une
  // case (`checked={x}`) et ne porter aucun `true` : un ternaire
  // `? true : undefined` passait un premier filet qui ne cherchait que
  // `relectureIntegrale: true` (mutation jouée).
  it('la déclaration vient d’une case cochée, jamais d’une constante', () => {
    for (const a of appelants()) {
      const cases = [...a.source.matchAll(/type="checkbox"[\s\S]*?checked=\{(\w+)\}/g)].map(m => m[1]);
      expect(cases.length, `${a.fichier} : aucune case de déclaration`).toBeGreaterThan(0);
      // Une case cochée d'office est une constante déguisée.
      for (const c of cases) {
        expect(a.source, `${a.fichier} : ${c} commence cochée`).not.toMatch(
          new RegExp(`\\[\\s*${c}\\s*,\\s*\\w+\\s*\\]\\s*=\\s*useState(?:<[^>]*>)?\\(\\s*true\\s*\\)`),
        );
      }
      const valeurs = [...a.source.matchAll(/\brelectureIntegrale\s*(?::|=(?!=))\s*([^,;\n}]+)/g)].map(m => m[1].trim());
      expect(valeurs.length, `${a.fichier} : valeur de relectureIntegrale introuvable`).toBeGreaterThan(0);
      for (const valeur of valeurs) {
        expect(valeur, `${a.fichier} : relectureIntegrale écrite en dur`).not.toMatch(/\btrue\b|!0\b/);
        expect(
          cases.some(c => new RegExp(`\\b${c}\\b`).test(valeur)),
          `${a.fichier} : relectureIntegrale = ${valeur} ne dérive d'aucune case (${cases.join(', ')})`,
        ).toBe(true);
      }
    }
  });

  // Un 409 dit que l'affichage n'est plus l'état de la base : l'écran recharge,
  // et la déclaration retombe avec lui.
  it('l’écran recharge la relecture sur un état ou un texte qui a bougé', () => {
    for (const a of appelants()) {
      expect(a.source).toContain("'etat_divergent'");
      expect(a.source).toContain("'empreinte_divergente'");
    }
  });
});
