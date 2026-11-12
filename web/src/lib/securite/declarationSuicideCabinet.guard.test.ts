import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { transmissionAppelleAlerteSecurite } from './alerteSecuritePraticien';
import {
  declarationSuicideCabinetActive,
  ERREURS_DECLARATION_SUICIDE,
  lireDeclarationSuicide,
  questionsDesignables,
} from './declarationSuicideCabinet';

// BANC DE [[D-303]] §4 — « AUCUN INSTRUMENT `valide` N'EST SANS DÉCLARATION »,
// une fois `WN_ENABLE_DECLARATION_SUICIDE_CAB` allumé (NF-7, H59, lot 2).
//
// La base ne le tient pas encore : son CHECK « valide ⇒ déclaré » viendra en
// troisième migration, après l'allumage (réponse 20261111-0029-a). D'ici là, la
// garde est dans le code, et elle n'a qu'un point de passage : l'action
// `publier` de `api/praticien/instruments`, qui exige la déclaration drapeau
// allumé (banc de comportement : `instruments/route.test.ts`, bloc NF-7).
//
// CE BANC TIENT QUE CE POINT DE PASSAGE RESTE LE SEUL. Un second écrivain de
// `statutRelecture: 'valide'` (un import qui publierait d'office, un seed, un
// geste « republier ») ouvrirait un `valide` sans déclaration que le banc de
// comportement ne verrait pas. Lecture du texte, comme les bancs voisins.

const RACINE_SRC = path.resolve(__dirname, '../..');
// `\s` couvre le saut de ligne : `statutRelecture:` et `'valide'` sur deux
// lignes restent un passage (revue CodeRabbit de #2010).
const PASSAGE_VALIDE = /statutRelecture\s*:\s*['"]valide['"]/;
const PASSAGES_VALIDE = new RegExp(PASSAGE_VALIDE.source, 'g');

function sources(repertoire: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(repertoire, { withFileTypes: true })) {
    const chemin = path.join(repertoire, entree.name);
    if (entree.isDirectory()) {
      if (entree.name === 'generated') continue;
      trouves.push(...sources(chemin));
      continue;
    }
    if (!/\.tsx?$/.test(entree.name) || /\.test\.tsx?$/.test(entree.name) || entree.name.endsWith('.d.ts')) continue;
    trouves.push(chemin);
  }
  return trouves;
}

/** Le code d'un fichier sans ses lignes de commentaire, lignes rejointes. */
function sansCommentaires(texte: string): string {
  return texte
    .split('\n')
    .filter(ligne => {
      const code = ligne.trim();
      return !(code.startsWith('//') || code.startsWith('*') || code.startsWith('/*'));
    })
    .join('\n');
}

/** Combien de fois ce code nomme `statutRelecture: 'valide'`, sur une ou plusieurs lignes. */
function passagesDans(texte: string): number {
  return [...sansCommentaires(texte).matchAll(PASSAGES_VALIDE)].length;
}

/** Un chemin par passage trouvé sous `web/src`, hors bancs. */
function occurrences(): string[] {
  const vues: string[] = [];
  for (const fichier of sources(RACINE_SRC)) {
    const n = passagesDans(readFileSync(fichier, 'utf8'));
    for (let i = 0; i < n; i += 1) vues.push(path.relative(RACINE_SRC, fichier));
  }
  return vues;
}

describe('NF-7 — un seul passage vers `valide`, et il exige la déclaration ([[D-303]] §4)', () => {
  it('deux occurrences, et deux seulement : l’écriture de `publier` et le filtre des assignables', () => {
    expect(occurrences().sort()).toEqual(['app/api/praticien/instruments/route.ts', 'lib/instruments.ts']);
  });

  it('le lecteur voit une écriture répartie sur deux lignes, et ignore les commentaires', () => {
    expect(passagesDans("data: {\n  statutRelecture:\n    'valide',\n}")).toBe(1);
    expect(passagesDans("// statutRelecture: 'valide'\n * statutRelecture: 'valide'")).toBe(0);
    expect(passagesDans("a = { statutRelecture: 'valide' }; b = { statutRelecture: \"valide\" }")).toBe(2);
  });

  it('l’écriture de `publier` porte la déclaration lue, et le filtre ne fait que lire', () => {
    const route = readFileSync(path.join(RACINE_SRC, 'app/api/praticien/instruments/route.ts'), 'utf8');
    expect(route).toMatch(/const data = \{\s*statutRelecture:\s*'valide',\s*\.\.\.declaration\s*\}/);
    // Drapeau allumé, l'écriture est gardée sur le statut et la date relus.
    expect(route).toMatch(/updateMany\(\{\s*where:\s*\{\s*idInstrument,\s*statutRelecture:\s*'grille_a_relire',\s*updatedAt:\s*instrument\.updatedAt\s*\}/);
    expect(route).toMatch(/lireDeclarationSuicide\(body,\s*instrument\.definitionJson\)/);
    // Le filtre `where` de `idsAssignablesPour` : une lecture, pas une écriture.
    const instruments = readFileSync(path.join(RACINE_SRC, 'lib/instruments.ts'), 'utf8');
    const debut = instruments.indexOf('export async function idsAssignablesPour');
    const corps = instruments.slice(debut, instruments.indexOf('\nexport ', debut + 1));
    expect(debut).toBeGreaterThan(-1);
    expect(corps).toMatch(PASSAGE_VALIDE);
    expect(corps).toMatch(/\.findMany\(/);
    expect(corps).not.toMatch(/\.(update|updateMany|create|upsert)\(/);
  });
});

describe('NF-7 — le drapeau', () => {
  afterEach(() => {
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
  });

  it('éteint par défaut ; seule la valeur exacte `true` l’allume', () => {
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
    expect(declarationSuicideCabinetActive()).toBe(false);
    for (const valeur of ['1', 'TRUE', 'oui', ' true', '']) {
      process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = valeur;
      expect(declarationSuicideCabinetActive(), JSON.stringify(valeur)).toBe(false);
    }
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    expect(declarationSuicideCabinetActive()).toBe(true);
  });
});

describe('NF-7 — la désignation, vérifiée contre la définition', () => {
  const DEFINITION = {
    sections: [
      {
        id: 'S1',
        questions: [
          { id: 'Q1', texte: 'Humeur', type: 'likert', options: [{ v: 0, l: 'Jamais' }, { v: 3, l: 'Souvent' }] },
          { id: 'N1', texte: 'Douleur', type: 'number', min: 0, max: 10 },
        ],
      },
    ],
  };

  it('seules les questions à réponses au choix sont désignables', () => {
    expect(questionsDesignables(DEFINITION).map(q => q.id)).toEqual(['Q1']);
    expect(questionsDesignables(null)).toEqual([]);
    expect(questionsDesignables({ sections: 'x' })).toEqual([]);
  });

  it('NULL ou absent n’est jamais lu comme « non » ([[D-303]] §2, 0028-a)', () => {
    for (const brut of [{}, { poseQuestionSuicide: null }, { poseQuestionSuicide: 0 }, { poseQuestionSuicide: 'false' }]) {
      expect(lireDeclarationSuicide(brut, DEFINITION)).toEqual({ ok: false, erreur: ERREURS_DECLARATION_SUICIDE.reponse });
    }
  });

  it('« non » efface la désignation', () => {
    expect(lireDeclarationSuicide({ poseQuestionSuicide: false, questionSuicideId: 'Q1', questionSuicideOptionNon: 0 }, DEFINITION))
      .toEqual({ ok: true, declaration: { poseQuestionSuicide: false, questionSuicideId: null, questionSuicideOptionNon: null } });
  });

  it('« oui » : question existante à réponses au choix, valeur « non » parmi ses options', () => {
    expect(lireDeclarationSuicide({ poseQuestionSuicide: true, questionSuicideId: 'Q1', questionSuicideOptionNon: 3 }, DEFINITION))
      .toEqual({ ok: true, declaration: { poseQuestionSuicide: true, questionSuicideId: 'Q1', questionSuicideOptionNon: 3 } });
    const refus = (brut: Record<string, unknown>) => lireDeclarationSuicide({ poseQuestionSuicide: true, ...brut }, DEFINITION);
    expect(refus({})).toEqual({ ok: false, erreur: ERREURS_DECLARATION_SUICIDE.question });
    expect(refus({ questionSuicideId: '' })).toEqual({ ok: false, erreur: ERREURS_DECLARATION_SUICIDE.question });
    expect(refus({ questionSuicideId: 'Q9', questionSuicideOptionNon: 0 })).toEqual({ ok: false, erreur: ERREURS_DECLARATION_SUICIDE.questionInconnue });
    expect(refus({ questionSuicideId: 'N1', questionSuicideOptionNon: 0 })).toEqual({ ok: false, erreur: ERREURS_DECLARATION_SUICIDE.questionInconnue });
    expect(refus({ questionSuicideId: 'Q1', questionSuicideOptionNon: 1 })).toEqual({ ok: false, erreur: ERREURS_DECLARATION_SUICIDE.optionNon });
    expect(refus({ questionSuicideId: 'Q1', questionSuicideOptionNon: 0.5 })).toEqual({ ok: false, erreur: ERREURS_DECLARATION_SUICIDE.optionNon });
  });

  it('une valeur « non » hors de l’entier de la colonne (int4) est refusée, pas écrite en 500', () => {
    const geante = {
      sections: [{ id: 'S', questions: [{ id: 'Q1', texte: 'x', type: 'likert', options: [{ v: 3000000000, l: 'Non' }, { v: 1, l: 'Oui' }] }] }],
    };
    expect(lireDeclarationSuicide({ poseQuestionSuicide: true, questionSuicideId: 'Q1', questionSuicideOptionNon: 3000000000 }, geante))
      .toEqual({ ok: false, erreur: ERREURS_DECLARATION_SUICIDE.optionNon });
    expect(lireDeclarationSuicide({ poseQuestionSuicide: true, questionSuicideId: 'Q1', questionSuicideOptionNon: 1 }, geante).ok).toBe(true);
    // L'écran ne la propose pas non plus (revue CodeRabbit de #2010).
    expect(questionsDesignables(geante)[0].options.map(o => o.v)).toEqual([1]);
  });
});

// [[D-493]] §2 et §4 : rien de [[D-277]] sur un instrument du cabinet. Aucun
// constat `SAF-QUEST-01` ne naît d'une réponse à un `CAB_`, même la plus
// grave à la question désignée — donc aucun courriel au praticien. Le jour
// où le lot à part (question 20261111-2148-a) l'ouvrira, ce banc rougira et
// devra changer avec sa décision clinique.
describe('NF-7 — ni constat ni courriel sur un CAB_ ([[D-493]])', () => {
  it('une transmission CAB_ n’appelle jamais l’alerte de sécurité', () => {
    expect(transmissionAppelleAlerteSecurite('CAB_TEST', { Q1: 3, Q2: 3, B7: 3 })).toBe(false);
  });
});
