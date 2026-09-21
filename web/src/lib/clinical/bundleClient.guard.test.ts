import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// AUCUN COMPOSANT CLIENT N'ATTEINT `lib/clinical` PAR UN IMPORT DE VALEUR —
// directement OU PAR UN VOISIN.
//
// LE DÉFAUT QUE CE BANC FERME, trouvé en revue adversariale le 2026-08-12.
// `OrientationPanel.tsx` porte `'use client'` ; il a un moment importé
// `LIBELLE_EXTINCTION` — une VALEUR — depuis `stopRulesV1.ts`. Ce module importe
// `sha256` de `corpusSyntheseV1`, donc `crypto`, et appelle `sha256(...)` en
// portée module, ce qui RETIENT l'instantané du référentiel clinique.
//
// ET LA PREMIÈRE RÉDACTION NE VOYAIT QUE LE PREMIER PAS — corrigé le 2026-09-21,
// sur mesure de l'artefact. Elle ne lisait que les spécifieurs
// `@/lib/clinical/…` écrits DANS un fichier client. Or la chaîne réelle passait
// par un module voisin : `PropositionBilanPanel` ('use client') importait quatre
// chaînes de caractères — `STATUTS_PROPOSES` — depuis `biology-library/courrier`,
// qui les prend de `biology-library/statuts`, qui importe `evaluerDeclencheur` et
// `sha256`. SIX chaînes atteignaient ainsi `orientationEngine` et
// `grillesSignees` depuis trois composants clients, sans qu'un seul spécifieur
// `@/lib/clinical/` figure dans un fichier client. Le banc était vert.
//
// CE QUE ÇA COÛTAIT, MESURÉ SUR L'ARTEFACT ET NON DÉDUIT : le chunk
// `app/dashboard/patients/[idPatient]/page-*.js`, 403 Ko, portait les VINGT
// règles d'orientation sur vingt, CINQUANTE-DEUX identifiants de claims, les
// bornes de comparaison (`4, 7, 10, 14, 17`), les couleurs de zone, le
// `sha256` de portée module et crypto-browserify. En revanche le TEXTE du
// corpus n'y était pas, contrairement à ce que ce chapeau affirmait : la
// rectification est écrite ici plutôt que corrigée en silence.
//
// CE QUI NE L'AURAIT PAS VU. Ni `tsc`, ni le lint, ni le build : Next résout
// `crypto` vers son polyfill compilé sans broncher. Le seul signe aurait été la
// taille d'un chunk que personne ne regarde.
//
// LA FRONTIÈRE EXACTE : `import type` est libre — il disparaît à la compilation.
// C'est l'import de VALEUR qui est interdit, à une exception nommée près : les
// modules FEUILLES, qui n'importent rien et ne portent que des libellés ou des
// constantes. La condition est VÉRIFIÉE ici, jamais déclarée.

// Résolu depuis CE fichier, et non depuis `process.cwd()` : le répertoire
// courant d'un run dépend de l'endroit d'où la suite est lancée, et un banc qui
// balaie un dossier vide est vert pour la pire des raisons.
const WEB = path.resolve(__dirname, '../../..');
const RACINE = path.join(WEB, 'src');
const CLINIQUE = path.join(WEB, 'src', 'lib', 'clinical');

/**
 * Les spécifieurs des imports de VALEUR d'un fichier.
 *
 * `[^;]*?` BORNE LA RECHERCHE À UN SEUL ÉNONCÉ. Avec `[\s\S]*?`, un import
 * ordinaire pouvait ouvrir la correspondance et courir jusqu'au `from` d'un
 * import de TYPE situé plus bas — le banc accusait alors une ligne qui
 * disparaît à la compilation.
 *
 * `export … from` EST UNE ARÊTE DE VALEUR, et l'oublier rouvrirait le trou par
 * la ré-export : un module feuille ré-exporté par un module lourd ne protège
 * personne si l'on ne suit que les `import`.
 *
 * L'import LATÉRAL (`import './module'`) est aussi une arête de valeur. Et pour
 * la règle des FEUILLES, un import de PAQUET compte également : un fichier qui
 * importe `crypto` n'est pas une feuille, même si aucun chemin du dépôt n'est à
 * résoudre.
 */
function specifieursDeValeur(fichier: string): string[] {
  const source = readFileSync(fichier, 'utf8');
  const specifieurs: string[] = [];
  for (const trouve of source.matchAll(/^\s*import\s+(?!type\b)[^;]*?\bfrom\s+(['"])([^'"]+)\1/gm)) {
    specifieurs.push(trouve[2]);
  }
  for (const trouve of source.matchAll(/^\s*import\s+(?!type\b)(['"])([^'"]+)\1/gm)) {
    specifieurs.push(trouve[2]);
  }
  for (const trouve of source.matchAll(/^\s*export\s+(?!type\b)[^;]*?\bfrom\s+(['"])([^'"]+)\1/gm)) {
    specifieurs.push(trouve[2]);
  }
  return specifieurs;
}

/** Les imports de VALEUR d'un fichier, résolus en chemins du dépôt. */
function importsDeValeur(fichier: string): string[] {
  const specifieurs = specifieursDeValeur(fichier);
  return specifieurs
    .map(specifieur => resoudre(specifieur, fichier))
    .filter((cible): cible is string => cible !== null);
}

/** Un spécifieur du dépôt → un fichier ; un paquet npm → `null`. */
function resoudre(specifieur: string, depuis: string): string | null {
  let base: string;
  if (specifieur.startsWith('@/')) base = path.join(RACINE, specifieur.slice(2));
  else if (specifieur.startsWith('.')) base = path.resolve(path.dirname(depuis), specifieur);
  else return null;
  for (const suffixe of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidat = base + suffixe;
    try {
      if (statSync(candidat).isFile()) return candidat;
    } catch {
      // suffixe suivant
    }
  }
  return null;
}

/**
 * Modules de `lib/clinical` qu'un composant client a le droit d'atteindre en
 * valeur : ceux qui n'importent RIEN eux-mêmes. La condition est vérifiée ici,
 * pas déclarée — un import ajouté demain à l'un d'eux le sort de la liste.
 */
function feuillesAutorisees(): Set<string> {
  const feuilles = new Set<string>();
  for (const fichier of readdirSync(CLINIQUE)) {
    if (!fichier.endsWith('.ts') || fichier.endsWith('.test.ts')) continue;
    if (specifieursDeValeur(path.join(CLINIQUE, fichier)).length === 0) {
      feuilles.add(path.join(CLINIQUE, fichier));
    }
  }
  return feuilles;
}

function fichiersSources(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const complet = path.join(dossier, entree);
    if (statSync(complet).isDirectory()) {
      if (entree === 'node_modules') continue;
      trouves.push(...fichiersSources(complet));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entree) && !/\.test\.(ts|tsx)$/.test(entree)) trouves.push(complet);
  }
  return trouves;
}

/**
 * Le PREMIER chemin d'imports de valeur menant de `depart` à un module de
 * `lib/clinical` qui n'est pas une feuille — ou `null`.
 *
 * Parcours en LARGEUR, pour que le chemin rapporté soit le plus court : c'est
 * celui qu'une session lira, et un chemin de douze sauts ne se corrige pas.
 */
function cheminVersLaCliniqueLourde(depart: string, feuilles: Set<string>): string[] | null {
  const vus = new Set<string>([depart]);
  const file: Array<[string, string[]]> = [[depart, [depart]]];
  while (file.length > 0) {
    const [courant, chemin] = file.shift() as [string, string[]];
    for (const suivant of importsDeValeur(courant)) {
      if (vus.has(suivant)) continue;
      vus.add(suivant);
      const prolonge = [...chemin, suivant];
      if (suivant.startsWith(CLINIQUE + path.sep)) {
        if (feuilles.has(suivant)) continue;
        return prolonge;
      }
      file.push([suivant, prolonge]);
    }
  }
  return null;
}

describe('bundle client — la couche clinique ne part pas au navigateur', () => {
  const clients = fichiersSources(RACINE).filter(fichier => {
    const source = readFileSync(fichier, 'utf8');
    return /^\s*['"]use client['"]/m.test(source);
  });

  it('des composants clients existent bien — anti-vacuité', () => {
    expect(clients.length).toBeGreaterThan(10);
  });

  it('aucun composant client n’atteint une VALEUR de lib/clinical, même par un voisin', () => {
    const feuilles = feuillesAutorisees();
    // Anti-vacuité de la liste elle-même : si plus aucun module ne se qualifiait,
    // l'exception ne dispenserait plus personne — mais elle ne protégerait plus
    // rien non plus, et le banc mérite de le dire.
    expect(feuilles.size).toBeGreaterThan(0);

    const fautifs: string[] = [];
    for (const client of clients) {
      const chemin = cheminVersLaCliniqueLourde(client, feuilles);
      // LE CHEMIN ENTIER EST RAPPORTÉ, pas seulement ses deux bouts : le défaut
      // du 2026-09-21 tenait à UN import au MILIEU de la chaîne, et un message
      // qui n'aurait nommé que le composant et le module clinique aurait envoyé
      // la session corriger le mauvais fichier.
      if (chemin) fautifs.push(chemin.map(p => path.relative(WEB, p)).join('\n    → '));
    }
    expect(
      fautifs,
      'un composant client atteint une valeur de lib/clinical : la table de règles, ses seuils et crypto partiraient dans le bundle navigateur',
    ).toEqual([]);
  });

  it('le parcours VOIT une chaîne indirecte — anti-vacuité du parcours lui-même', () => {
    // SANS CE CAS, LE BANC POURRAIT ÊTRE VERT PARCE QU'IL NE CHERCHE PAS.
    // C'est le défaut que [[banc-invariant-peut-naitre-vert]] décrit : un
    // extracteur qui ne trouve rien et un dépôt sain rendent le même verdict.
    // On fabrique donc une chaîne de trois sauts depuis un fichier RÉEL et non
    // client — `biology-library/courrier` — et on exige que le parcours la
    // suive jusqu'à un module clinique non feuille.
    const feuilles = feuillesAutorisees();
    const courrier = path.join(RACINE, 'lib', 'biology-library', 'courrier.ts');
    const chemin = cheminVersLaCliniqueLourde(courrier, feuilles);
    expect(chemin, 'le parcours doit suivre courrier → statuts → clinique').not.toBeNull();
    expect((chemin as string[]).length).toBeGreaterThan(2);
  });

  it('le goulot est COUPÉ — le panneau de proposition puise à la feuille', () => {
    // Le cas qui garde le correctif du 2026-09-21 lui-même. Remettre l'import
    // sur `courrier` rouvre les six chaînes d'un coup.
    const panneau = path.join(RACINE, 'components', 'patient-cockpit', 'PropositionBilanPanel.tsx');
    const source = readFileSync(panneau, 'utf8');
    expect(source).toMatch(/import \{ STATUTS_PROPOSES \} from '@\/lib\/biology-library\/vocabulaireStatuts'/);
    // Et la feuille en est bien une — sinon le remède ne remédie à rien.
    const vocabulaire = path.join(RACINE, 'lib', 'biology-library', 'vocabulaireStatuts.ts');
    expect(importsDeValeur(vocabulaire)).toEqual([]);
  });

  it("un import de paquet sort un module clinique de l'exception feuille", () => {
    const feuilles = feuillesAutorisees();
    const corpus = path.join(CLINIQUE, 'corpusSyntheseV1.ts');
    expect(importsDeValeur(corpus)).toEqual([]);
    expect(specifieursDeValeur(corpus)).toContain('crypto');
    expect(feuilles.has(corpus)).toBe(false);
  });
});
