import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// [[D-064]] — LE DOCUMENT QU'ON LIT AVANT DE POSER UN DRAPEAU A MENTI TROIS
// JOURS, ET RIEN NE L'A DIT.
//
// Le 2026-08-15, `D-061` a signé quatre tables cliniques. `docs/FEATURE_FLAGS.md`
// a continué d'annoncer « `validationExterne: false` → fermé quoi qu'on pose »
// sur deux d'entre elles jusqu'au 2026-08-16. Or c'est LE document qu'on
// consulte avant de flipper un drapeau en production : il présentait comme
// inerte un interrupteur en réalité armé, dont la pose fait sortir des constats
// cliniques sur l'écran praticien.
//
// Aucun banc ne reliait la prose à l'état réel. Celui-ci le fait, et c'est le
// seul garde qui aurait empêché la CLASSE de se répéter : ni la revue, ni le
// type-check, ni les contrats SQL ne comparent un tableau de documentation aux
// métadonnées qu'il décrit.
//
// CE QUE CE BANC NE FAIT PAS. Il ne juge aucune signature — poser ou retirer un
// `validationExterne` est un acte praticien ([[DC-17]], [[DC-18]]), jamais le
// verdict d'un test. Il exige seulement que le dépôt le DISE au même endroit
// que là où on vient le lire. Signer reste libre ; signer en silence, non.
//
// LECTURE DU TEXTE, PAS IMPORT DU MODULE — même raison que le banc voisin
// `clinical/claimsEpinglesFraicheur.guard.test.ts` : `orientationService.ts`
// instancie un client Prisma au chargement et jette sans `DATABASE_URL`. Un
// banc de cohérence documentaire ne doit dépendre ni d'une base ni des effets
// de bord d'un module tiers.

const RACINE = path.resolve(__dirname, '../../..');
const DOC = 'docs/FEATURE_FLAGS.md';
const MARQUEUR = 'ETAT_VERROUS_SIGNATURE';

// Les répertoires où vivent les tables porteuses d'une signature. `biology-library`
// n'est pas sous `clinical/` et c'est précisément la table dont la signature est
// la plus fragile ([[D-063]]) : la balayer aussi n'est pas un détail.
const RACINES_BALAYEES = ['clinical', 'biology-library'];

interface Signature {
  fichier: string;
  validationExterne: boolean;
  dateValidation: string;
}

function lireDoc(): string {
  return readFileSync(path.join(RACINE, DOC), 'utf8');
}

// L'état tel que le DOCUMENT le déclare, entre ses marqueurs.
function etatDocumente(): Signature[] {
  const source = lireDoc();
  const debut = source.indexOf(`<!-- >>> ${MARQUEUR} -->`);
  const fin = source.indexOf(`<!-- <<< ${MARQUEUR} -->`);
  if (debut === -1 || fin === -1 || fin <= debut) {
    throw new Error(`${DOC} : marqueurs ${MARQUEUR} absents ou inversés`);
  }
  const bloc = source.slice(debut, fin);
  return [
    ...bloc.matchAll(
      /^\|\s*`([^`]+\.ts)`\s*\|\s*`(true|false)`\s*\|\s*`([^`]+)`\s*\|$/gm,
    ),
  ]
    .map(m => ({ fichier: m[1], validationExterne: m[2] === 'true', dateValidation: m[3] }))
    .sort((a, b) => a.fichier.localeCompare(b.fichier));
}

// L'état tel que le CODE le porte. Une déclaration de type
// (`validationExterne: boolean;`) n'est pas une valeur : seul un littéral
// compte.
function etatReel(): Signature[] {
  const trouvees: Signature[] = [];
  for (const racine of RACINES_BALAYEES) {
    const repertoire = path.join(RACINE, 'web/src/lib', racine);
    const fichiers = readdirSync(repertoire).filter(
      f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.d.ts'),
    );
    for (const fichier of fichiers) {
      const source = readFileSync(path.join(repertoire, fichier), 'utf8');
      const validation = source.match(/^\s+validationExterne:\s*(true|false),/m);
      if (!validation) continue;
      const date = source.match(/^\s+dateValidation:\s*(?:'([^']*)'|null),/m);
      trouvees.push({
        fichier: `${racine}/${fichier}`,
        validationExterne: validation[1] === 'true',
        // `null` sans guillemets dans le code s'écrit `null` dans le tableau.
        dateValidation: date ? (date[1] ?? 'null') : 'null',
      });
    }
  }
  return trouvees.sort((a, b) => a.fichier.localeCompare(b.fichier));
}

describe('verrous de signature — la documentation dit l’état réel', () => {
  it('le tableau documenté couvre exactement les tables signées du code', () => {
    const reel = etatReel();

    // Anti-vacuité : un balayage qui ne trouve plus rien rendrait ce banc vert
    // en ne comparant que des ensembles vides — exactement le silence qu'il
    // existe pour rompre.
    expect(reel.length).toBeGreaterThan(1);

    expect(etatDocumente().map(s => s.fichier)).toEqual(reel.map(s => s.fichier));
  });

  it('chaque `validationExterne` documenté est celui du code', () => {
    const documente = new Map(etatDocumente().map(s => [s.fichier, s.validationExterne]));
    for (const table of etatReel()) {
      expect(
        documente.get(table.fichier),
        `${DOC} annonce un \`validationExterne\` faux pour ${table.fichier}`,
      ).toBe(table.validationExterne);
    }
  });

  // LA DATE COMPTE AUTANT QUE LE BOOLÉEN, et c'est le cas biologie qui le
  // prouve : `validationExterne: true` avec `dateValidation: null` est une
  // signature INCOMPLÈTE, donc un verrou FERMÉ ([[D-063]]). Un tableau qui ne
  // relèverait que le booléen dirait « signée » d'une table qui ne l'est pas.
  it('chaque `dateValidation` documentée est celle du code', () => {
    const documente = new Map(etatDocumente().map(s => [s.fichier, s.dateValidation]));
    for (const table of etatReel()) {
      expect(
        documente.get(table.fichier),
        `${DOC} annonce une \`dateValidation\` fausse pour ${table.fichier}`,
      ).toBe(table.dateValidation);
    }
  });

  // Le garde de la reconnaissance elle-même : le tableau ne vaut que tant que
  // la prose autour n'affirme pas le contraire. « fermé quoi qu'on pose » était
  // la formule exacte qui a menti — elle ne peut plus cohabiter avec une table
  // signée sans qu'on l'ait relue.
  it('aucune formule « fermé quoi qu’on pose » ne survit à une table signée', () => {
    const lignes = lireDoc()
      .split('\n')
      .filter(l => /fermé quoi qu’on pose|fermé quoi qu'on pose/.test(l));
    const signes = new Set(etatReel().filter(s => s.validationExterne).map(s => s.fichier));
    for (const ligne of lignes) {
      for (const fichier of signes) {
        const nom = path.basename(fichier, '.ts');
        expect(
          ligne.includes(nom),
          `${DOC} dit « fermé quoi qu'on pose » sur ${fichier}, qui est signée`,
        ).toBe(false);
      }
    }
  });
});
