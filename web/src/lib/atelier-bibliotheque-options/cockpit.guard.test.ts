import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createSourceFile,
  forEachChild,
  isBinaryExpression,
  isAsExpression,
  isBindingElement,
  isElementAccessExpression,
  isExportDeclaration,
  isIdentifier,
  isImportClause,
  isImportDeclaration,
  isImportSpecifier,
  isNamedExports,
  isNamedImports,
  isNonNullExpression,
  isObjectBindingPattern,
  isParameter,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isSatisfiesExpression,
  isStringLiteralLike,
  isTemplateExpression,
  isTypeAssertionExpression,
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
  type Node,
} from 'typescript';
import { describe, expect, it } from 'vitest';
import { estFichierSource, lire as lireDuDepot, RACINE, retirerLignesDeCommentaire } from '../bio-parcours/balayageSources';
import { contexteResolution, importsResolus, type ContexteResolution } from '../bio-parcours/resolutionImports';

// GARDE : LE COCKPIT NE CHOISIT RIEN D'APRÈS LE DOSSIER ([[D-480]] §1, §5.4 ;
// cadrage BIO-PARCOURS v3 `:260` ; `wn-reviewer` sur la PR 6, P2-2).
//
// `aucuneLectureDeDossier.guard.test.ts` ferme `bibliotheque-options/` ; le
// cockpit, lui, atteint la base par `lecture.ts` et il est appelé par une route
// qui lit le dossier. Ce banc tient ce que la règle exige de lui :
//   1. ses imports de valeur sont EXACTEMENT le drapeau, la lecture des textes
//      de la bibliothèque et la structure de références — aucun service, aucun
//      client, aucune lecture du dossier ;
//   2. son code ne nomme aucun accès au dossier ni au monde extérieur ;
//   3. la route ne lui passe que la liste des codes d'hypothèse dont la tête
//      est confirmée — rien d'autre du dossier.
// Une retouche qui élargit l'un des trois rougit ici et se relit avant d'entrer.

const COCKPIT = 'web/src/lib/atelier-bibliotheque-options/cockpit.ts';
const ROUTE = 'web/src/app/api/praticien/biologie/constats/route.ts';
const IMPORTS_ADMIS = ['drapeau', 'lecture', 'structure'].map(m => `web/src/lib/atelier-bibliotheque-options/${m}.ts`);

// Le dossier et le monde extérieur, nommés : client de base, modèles du
// dossier, variables d'environnement, réseau, accès globaux.
const ACCES_INTERDIT =
  /\bprisma\b|\$queryRaw|\bpatient|\bidPatient\b|questionnaire|resultat|traitement|constat|\bprocess\b|\bfetch\b|globalThis|\bwindow\b|\bdocument\b|\brequire\s*\(|\bimport\s*\(/i;

const lire = (chemin: string) => readFileSync(join(RACINE, chemin), 'utf8');

function importsDeValeur(source?: string) {
  return importsResolus(COCKPIT, contexteResolution(), source).filter(i => !i.typeSeul);
}

describe('Bibliothèque des options au cockpit — aucune sélection d’après le dossier (D-480 §5.4)', () => {
  it('les imports de valeur de `cockpit.ts` sont exactement le drapeau, la lecture et la structure', () => {
    const imports = importsDeValeur();
    expect(imports.filter(i => i.indetermine)).toEqual([]);
    expect(imports.map(i => i.atteint).sort()).toEqual([...IMPORTS_ADMIS].sort());
  });

  it('le code de `cockpit.ts` ne nomme aucun accès au dossier ni au monde extérieur', () => {
    const code = retirerLignesDeCommentaire(lire(COCKPIT));
    expect(code.match(ACCES_INTERDIT)?.[0] ?? null).toBeNull();
  });

  it('la route ne passe au cockpit que les codes des hypothèses dont la tête est confirmée', () => {
    const code = retirerLignesDeCommentaire(lire(ROUTE));
    const appels = [...code.matchAll(/lireOptionsAuCockpit\s*\(([^)]*)\)/g)].map(m => m[1].trim());
    expect(appels).toEqual(['confirmees']);
    expect(code).toContain(
      "const confirmees = constats.hypotheses.filter(h => h.tete?.verdict === 'confirmee').map(h => h.hypotheseCode);",
    );
  });

  // CONTRE-ÉPREUVE : une retouche qui ferait lire le dossier rougit.
  it('la garde rougit sur une source fabriquée (elle n’est pas décorative)', () => {
    const avec = (ligne: string) => `${lire(COCKPIT)}\n${ligne}\n`;
    expect(importsDeValeur(avec("import { prisma } from '@/lib/prisma';")).map(i => i.atteint)).toContain('web/src/lib/prisma.ts');
    expect(importsDeValeur(avec('const m = await import(chemin);')).some(i => i.indetermine)).toBe(true);
    for (const ligne of [
      'const p = await prisma.patient.findUnique({});',
      'export function f(idPatient: string) {}',
      'const t = traitementsDuDossier;',
      'const e = process.env.X;',
    ]) {
      expect(ACCES_INTERDIT.test(retirerLignesDeCommentaire(ligne)), ligne).toBe(true);
    }
    expect(importsDeValeur("import type { X } from '@/lib/prisma';")).toEqual([]);
  });
});

// LA FERMETURE DU COCKPIT (P3-a de `wn-reviewer` sur #2106, lot
// `garde-cockpit-fermeture`). Les contrôles ci-dessus ne lisent que
// `cockpit.ts` et ses imports DIRECTS. Une lecture du dossier glissée un
// niveau plus bas — `prisma.patient.findUnique` dans `lecture.ts` — les
// laissait verts, et `ecritures.guard.test.ts` aussi (mutation jouée sur
// `main@3f7f5d0f` : 8 verts sur 8). Ce banc-là voit qui insère, réécrit ou lit
// les deux tables de la bibliothèque, et qui importe sa lecture ; il ne voit
// ni un autre modèle lu par `lecture.ts`, ni un import ajouté à `structure.ts`.
//
// Ce bloc suit donc la FERMETURE RÉSOLUE des imports de VALEUR du cockpit, sur
// le patron d'`outillageBancs.guard.test.ts` (parseur, résolution, liens
// suivis, client généré en lien ramené dans le dépôt), et exige :
//   1. qu'elle soit EXACTEMENT la liste admise, que le client de base n'y entre
//      que par `lecture.ts`, que les modules extérieurs soient exactement ceux
//      admis, et qu'aucun import n'y soit indéterminé ;
//   2. qu'aucun fichier de la fermeture n'accède à un modèle Prisma autre que
//      les deux tables de la bibliothèque, ni au SQL brut ;
//   3. qu'aucun n'y nomme un accès au monde extérieur, hors du drapeau, qui lit
//      sa variable d'environnement.
// Le client (`web/src/lib/prisma.ts`) et le client généré sont des BORNES :
// atteints, jamais suivis — ils nomment tous les modèles par construction ;
// c'est l'usage qu'en font les fichiers de la fermeture qui se juge (2.).
// LIMITES DÉCLARÉES : un `import type` ne charge rien et n'est pas suivi ; une
// clé composée d'une variable (`prisma[k]`) n'est pas lue — la fermeture est
// figée par liste exacte, et un fichier qui y entre se relit.

const CLIENT = 'web/src/lib/prisma.ts';
const CLIENT_GENERE = 'web/src/generated/prisma/';
const LECTURE = 'web/src/lib/atelier-bibliotheque-options/lecture.ts';

/** La fermeture admise : les sources qu'atteint le cockpit par ses imports de valeur, cockpit compris, bornes exclues. */
const FERMETURE_ADMISE = [
  'web/src/lib/atelier-bibliotheque-options/cockpit.ts',
  'web/src/lib/atelier-bibliotheque-options/drapeau.ts',
  'web/src/lib/atelier-bibliotheque-options/etat.ts',
  LECTURE,
  'web/src/lib/atelier-bibliotheque-options/structure.ts',
  'web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.ts',
  'web/src/lib/bibliotheque-options/vocabulaire.ts',
  'web/src/lib/clinical/corpusSyntheseV1.ts',
  'web/src/lib/fiches-usage/etat.ts',
  'web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts',
  'web/src/lib/fiches-usage/vocabulaire.ts',
  'web/src/lib/positions-expert/vocabulaire.ts',
];
/** Chaque entrée du client : importeur, borne, et les NOMS importés (P3-2 de `wn-reviewer`) — une lecture du dossier exportée par le client entrerait sous un nom neuf. */
const ENTREES_DU_CLIENT_ADMISES = [`${LECTURE} -> ${CLIENT} {prisma}`];
const MODULES_EXTERIEURS_ADMIS = ['crypto'];
const MODELES_ADMIS = ['bibliothequeOptionTexte', 'bibliothequeOptionTexteActe'];
/** Le drapeau lit sa variable par `env = process.env` en valeur par défaut, et rien d'autre de `process` (P3-3 de `wn-reviewer`). */
const ACCES_ADMIS = ['web/src/lib/atelier-bibliotheque-options/drapeau.ts:process.env-par-defaut'];
/** L'identifiant du client employé hors d'un accès direct à un modèle admis : alias, `Object.values`, `$transaction`, clé variable (P3-1). */
const CLIENT_HORS_MODELES = 'prisma-hors-modeles-admis';

/** Les accesseurs du client : chaque `model` de `schema.prisma`, initiale en minuscule. */
const ACCESSEURS = [...lireDuDepot('web/prisma/schema.prisma').matchAll(/^model\s+(\w+)\s*\{/gm)].map(
  m => m[1][0].toLowerCase() + m[1].slice(1),
);
const SQL_BRUT = new Set(['$queryRaw', '$queryRawUnsafe', '$queryRawTyped', '$executeRaw', '$executeRawUnsafe', '$runCommandRaw']);
/** Réseau, environnement, processus, navigateur, et les portes vers eux. */
const ACCES_EXTERIEURS = new Set([
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'navigator', 'window', 'document', 'localStorage',
  'sessionStorage', 'indexedDB', 'process', 'globalThis', 'global', 'eval', 'Function', 'require', 'module',
  'Deno', 'Bun', 'self', 'constructor', 'prototype', '__proto__', 'Reflect', 'Proxy',
]);

/**
 * LE CLIENT PRISMA EN LIEN HORS DU DÉPÔT (P1 de `wn-reviewer` sur #2111) : le
 * contrôle de fusion pose `web/src/generated/prisma` en lien vers la copie
 * source ; canonicalisé, le client atteint sort du dépôt (`../…`). Il est
 * ramené à son chemin du dépôt, pour rester une borne — sinon il passerait
 * pour un module extérieur et rougirait ce banc, « imputable ».
 */
function dansLeDepot(atteint: string | null): string | null {
  if (atteint === null || !atteint.startsWith('../')) return atteint;
  const i = atteint.indexOf(`/${CLIENT_GENERE}`);
  return i === -1 ? atteint : atteint.slice(i + 1);
}

const estBorne = (atteint: string) => atteint === CLIENT || atteint.startsWith(CLIENT_GENERE);

/** La fermeture des imports de valeur depuis `depart` ; `surcharges` remplace la source d'un fichier (contre-épreuves). */
function fermetureDuCockpit(
  contexte: ContexteResolution,
  surcharges: ReadonlyMap<string, string> = new Map(),
  depart: string = COCKPIT,
) {
  const vus = new Set([depart]);
  const file = [depart];
  const entreesDuClient = new Set<string>();
  const exterieurs = new Set<string>();
  const indetermines: string[] = [];
  while (file.length > 0) {
    const chemin = file.shift() as string;
    for (const i of importsResolus(chemin, contexte, surcharges.get(chemin))) {
      if (i.typeSeul) continue;
      if (i.indetermine) {
        indetermines.push(`${chemin}:${i.specificateur}`);
        continue;
      }
      const atteint = dansLeDepot(i.atteint);
      if (atteint !== null && estBorne(atteint)) {
        const liaisons = liaisonsImportees(surcharges.get(chemin) ?? readFileSync(join(contexte.racine, chemin), 'utf8'), chemin, i.specificateur);
        entreesDuClient.add(`${chemin} -> ${atteint} {${liaisons.join(', ')}}`);
      } else if (atteint !== null && atteint.startsWith('web/src/') && !/(^|\/)node_modules\//.test(atteint) && estFichierSource(atteint)) {
        if (!vus.has(atteint)) {
          vus.add(atteint);
          file.push(atteint);
        }
      } else {
        exterieurs.add(i.specificateur);
      }
    }
  }
  const source = (f: string) => surcharges.get(f) ?? readFileSync(join(contexte.racine, f), 'utf8');
  const acces = [...vus].sort().flatMap(f => accesNommes(source(f), f).map(nom => `${f}:${nom}`));
  return {
    fichiers: [...vus].sort(),
    entreesDuClient: [...entreesDuClient].sort(),
    exterieurs: [...exterieurs].sort(),
    indetermines,
    acces,
  };
}

const analyser = (source: string, chemin: string) =>
  createSourceFile(chemin, source, ScriptTarget.Latest, true, chemin.endsWith('.tsx') ? ScriptKind.TSX : ScriptKind.TS);

/**
 * Les noms qu'un fichier importe (ou réexporte) de `specificateur` :
 * `a`, `a as b`, `default`, `*`. Un chargement sans déclaration lue
 * (`require`, `import()`) rend `<sans liaison lue>` : fail-closed.
 */
function liaisonsImportees(source: string, chemin: string, specificateur: string): string[] {
  const noms: string[] = [];
  const nom = (p: { propertyName?: { text: string }; name: { text: string } }) =>
    p.propertyName ? `${p.propertyName.text} as ${p.name.text}` : p.name.text;
  for (const d of analyser(source, chemin).statements) {
    if (!(isImportDeclaration(d) || isExportDeclaration(d)) || !d.moduleSpecifier || !isStringLiteralLike(d.moduleSpecifier)) continue;
    if (d.moduleSpecifier.text !== specificateur) continue;
    if (isImportDeclaration(d)) {
      const c = d.importClause;
      if (!c || c.isTypeOnly) continue;
      if (c.name) noms.push('default');
      if (c.namedBindings && isNamedImports(c.namedBindings)) noms.push(...c.namedBindings.elements.filter(e => !e.isTypeOnly).map(nom));
      else if (c.namedBindings) noms.push('*');
    } else if (!d.isTypeOnly) {
      if (d.exportClause && isNamedExports(d.exportClause)) noms.push(...d.exportClause.elements.filter(e => !e.isTypeOnly).map(nom));
      else noms.push('*');
    }
  }
  return noms.length > 0 ? [...new Set(noms)].sort() : ['<sans liaison lue>'];
}

/** La valeur d'une clé constante (`"a"`, `` `a${"b"}` ``, `"a" + "b"`, `"a" as const`), ou `null`. */
function cleConstante(n: Node): string | null {
  if (isStringLiteralLike(n)) return n.text;
  if (isParenthesizedExpression(n) || isAsExpression(n) || isSatisfiesExpression(n) || isNonNullExpression(n) || isTypeAssertionExpression(n)) {
    return cleConstante(n.expression);
  }
  if (isTemplateExpression(n)) {
    let valeur = n.head.text;
    for (const segment of n.templateSpans) {
      const v = cleConstante(segment.expression);
      if (v === null) return null;
      valeur += v + segment.literal.text;
    }
    return valeur;
  }
  if (isBinaryExpression(n) && n.operatorToken.kind === SyntaxKind.PlusToken) {
    const g = cleConstante(n.left);
    const d = cleConstante(n.right);
    return g === null || d === null ? null : g + d;
  }
  return null;
}

/**
 * Ce qu'un source nomme du dossier ou du monde extérieur. Un accesseur de
 * modèle hors `admis`, ou un nom du SQL brut, en position d'ACCÈS : propriété
 * (`prisma.patient`), clé constante (`prisma["pat" + "ient"]`), déstructuration
 * (`const { patient } = prisma`). Un accès extérieur, où qu'il soit :
 * identifiant ou chaîne (fail-closed, patron d'`aucuneLectureDeDossier`).
 * CONTRÔLE POSITIF DU CLIENT (P3-1 de `wn-reviewer`) : l'identifiant `prisma`
 * n'apparaît qu'importé, ou comme objet d'un accès direct à un modèle admis —
 * un alias, une clé variable, `Object.values(prisma)` ou `$transaction`
 * rougissent sans qu'aucun nom de modèle soit lu.
 */
function accesNommes(source: string, chemin: string, admis: readonly string[] = MODELES_ADMIS): string[] {
  const interdits = new Set(ACCESSEURS.filter(a => !admis.includes(a)));
  const fichier = analyser(source, chemin);
  const trouves = new Set<string>();
  const acces = (nom: string | null) => {
    if (nom !== null && (interdits.has(nom) || SQL_BRUT.has(nom) || ACCES_EXTERIEURS.has(nom))) trouves.add(nom);
  };
  const visiter = (n: Node): void => {
    if (isPropertyAccessExpression(n)) acces(n.name.text);
    else if (isElementAccessExpression(n)) acces(cleConstante(n.argumentExpression));
    else if (isBindingElement(n) && isObjectBindingPattern(n.parent)) {
      const p = n.propertyName;
      acces(
        p === undefined
          ? isIdentifier(n.name) ? n.name.text : null
          : isIdentifier(p) || isStringLiteralLike(p) ? p.text : p.kind === SyntaxKind.ComputedPropertyName ? cleConstante(p.expression) : null,
      );
    }
    if (isIdentifier(n) && n.text === 'prisma') {
      const parent = n.parent;
      const importe = isImportSpecifier(parent) || isImportClause(parent);
      const accesAdmis = isPropertyAccessExpression(parent) && parent.expression === n && admis.includes(parent.name.text);
      if (!importe && !accesAdmis) trouves.add(CLIENT_HORS_MODELES);
    }
    if ((isIdentifier(n) || isStringLiteralLike(n)) && ACCES_EXTERIEURS.has(n.text)) {
      const enDefaut =
        isIdentifier(n) && n.text === 'process' && isPropertyAccessExpression(n.parent) && n.parent.expression === n
        && n.parent.name.text === 'env' && isParameter(n.parent.parent) && n.parent.parent.initializer === n.parent;
      trouves.add(enDefaut ? 'process.env-par-defaut' : n.text);
    }
    forEachChild(n, visiter);
  };
  visiter(fichier);
  return [...trouves].sort();
}

describe('Bibliothèque des options au cockpit — la fermeture résolue ne lit pas le dossier (P3-a de #2106)', () => {
  const contexte = contexteResolution();

  it('la fermeture est exactement celle admise ; le client n’y entre que par `lecture.ts`', () => {
    const { fichiers, entreesDuClient, exterieurs, indetermines } = fermetureDuCockpit(contexte);
    expect(indetermines).toEqual([]);
    expect(fichiers).toEqual([...FERMETURE_ADMISE].sort());
    expect(entreesDuClient).toEqual(ENTREES_DU_CLIENT_ADMISES);
    expect(exterieurs).toEqual(MODULES_EXTERIEURS_ADMIS);
  });

  it('aucun fichier de la fermeture n’accède à un autre modèle que la bibliothèque, au SQL brut ni au monde extérieur', () => {
    expect(fermetureDuCockpit(contexte).acces).toEqual(ACCES_ADMIS);
    // Anti-vacuité : le schéma est lu, et le détecteur voit l'accès légitime de
    // `lecture.ts` (les actes se lisent par la relation, sans accesseur propre).
    for (const m of [...MODELES_ADMIS, 'patient', 'resultatBiologique', 'questionnaireReponse']) expect(ACCESSEURS).toContain(m);
    expect(accesNommes(lireDuDepot(LECTURE), LECTURE, [])).toEqual(['bibliothequeOptionTexte', CLIENT_HORS_MODELES]);
  });

  // CONTRE-ÉPREUVE : une lecture du dossier glissée UN ET DEUX NIVEAUX plus bas
  // que les imports directs du cockpit rougit — accès, import du client, import
  // d'un module neuf, import indéterminé.
  it('une lecture du dossier glissée sous les imports directs rougit', () => {
    const ETAT = 'web/src/lib/atelier-bibliotheque-options/etat.ts';
    const STRUCTURE = 'web/src/lib/atelier-bibliotheque-options/structure.ts';
    const FICHES_ETAT = 'web/src/lib/fiches-usage/etat.ts';
    const avec = (chemin: string, ligne: string) => [chemin, `${lireDuDepot(chemin)}\n${ligne}\n`] as const;
    const essai = (...surcharges: (readonly [string, string])[]) => fermetureDuCockpit(contexte, new Map(surcharges));

    // Un niveau plus bas, sans import neuf : l'accès seul.
    expect(essai(avec(LECTURE, 'export const f = (id: string) => prisma.patient.findUnique({ where: { id } });')).acces).toContain(`${LECTURE}:patient`);
    expect(essai(avec(LECTURE, "export const f = () => prisma['questionnaire' + 'Reponse'].findMany();")).acces).toContain(`${LECTURE}:questionnaireReponse`);
    expect(essai(avec(LECTURE, 'const { resultatBiologique: r } = prisma;')).acces).toContain(`${LECTURE}:resultatBiologique`);
    expect(essai(avec(LECTURE, 'export const f = () => prisma.$queryRawUnsafe("SELECT 1");')).acces).toContain(`${LECTURE}:$queryRawUnsafe`);
    expect(essai(avec(STRUCTURE, "export const f = () => fetch('/api/praticien/patients');")).acces).toContain(`${STRUCTURE}:fetch`);
    // Les détours de `wn-reviewer` (P3-1, P3-3) : clé quasi constante, alias, objet entier, `process` hors du défaut.
    expect(essai(avec(LECTURE, "export const f = () => prisma['patient' as const].findMany();")).acces).toContain(`${LECTURE}:patient`);
    expect(essai(avec(LECTURE, "export const f = () => prisma[`${'pat'}ient`].findMany();")).acces).toContain(`${LECTURE}:patient`);
    expect(essai(avec(LECTURE, 'const db = prisma;\nexport const f = (k: string) => (db as never)[k];')).acces).toContain(`${LECTURE}:${CLIENT_HORS_MODELES}`);
    expect(essai(avec(LECTURE, 'export const tout = Object.values(prisma);')).acces).toContain(`${LECTURE}:${CLIENT_HORS_MODELES}`);
    const DRAPEAU = 'web/src/lib/atelier-bibliotheque-options/drapeau.ts';
    expect(essai(avec(DRAPEAU, 'export const fin = () => process.exit(1);')).acces).toContain(`${DRAPEAU}:process`);
    // Un nom neuf importé du client (une lecture du dossier exportée par `prisma.ts`), ou un alias.
    const importe = (ligne: string) =>
      essai([LECTURE, lireDuDepot(LECTURE).replace("import { prisma } from '@/lib/prisma';", ligne)]).entreesDuClient;
    expect(importe("import { prisma, lirePatient } from '@/lib/prisma';")).toEqual([`${LECTURE} -> ${CLIENT} {lirePatient, prisma}`]);
    expect(importe("import { prisma as db } from '@/lib/prisma';\nconst prisma = db;")).toEqual([`${LECTURE} -> ${CLIENT} {prisma as db}`]);
    expect(importe("import * as client from '@/lib/prisma';\nconst { prisma } = client;")).toEqual([`${LECTURE} -> ${CLIENT} {*}`]);

    // Deux niveaux plus bas : le client importé par un module neuf de la fermeture.
    const client = essai(avec(FICHES_ETAT, "import { prisma } from '@/lib/prisma';\nexport const f = () => prisma.traitementEnCours.findMany();"));
    expect(client.entreesDuClient).toContain(`${FICHES_ETAT} -> ${CLIENT} {prisma}`);
    expect(client.acces).toContain(`${FICHES_ETAT}:traitementEnCours`);

    // Un module neuf dans la fermeture, et un import indéterminé.
    expect(essai(avec(STRUCTURE, "import { resolveDatabaseUrl } from '@/lib/postgres';\nexport const u = resolveDatabaseUrl;")).fichiers).toContain('web/src/lib/postgres.ts');
    expect(essai(avec(ETAT, 'export const m = () => import(chemin);')).indetermines).toEqual([`${ETAT}:<import non constant>`]);

    // Témoins : un `import type` du client et une prose ne changent rien.
    const temoin = essai(avec(STRUCTURE, "import type { PrismaClient } from '@/lib/prisma';\n// prisma.patient, fetch\nexport const t = 'le dossier du patient';"));
    expect(temoin.entreesDuClient).toEqual(ENTREES_DU_CLIENT_ADMISES);
    expect(temoin.acces).toEqual(ACCES_ADMIS);
  });

  // CONTRE-ÉPREUVE DU CONTRÔLE DE FUSION (rappel du P1 de #2111) : le client
  // généré en vrai lien vers une copie hors de la racine reste une borne, sous
  // son chemin du dépôt — il ne passe pas pour un module extérieur.
  it('le client Prisma généré en lien hors du dépôt reste une borne', () => {
    const racine = mkdtempSync(join(tmpdir(), 'wn-garde-cockpit-racine-'));
    const ailleurs = mkdtempSync(join(tmpdir(), 'wn-garde-cockpit-ailleurs-'));
    try {
      const generee = join(ailleurs, CLIENT_GENERE);
      mkdirSync(generee, { recursive: true });
      writeFileSync(join(generee, 'client.ts'), 'export const PrismaClient = class {};\n');
      mkdirSync(join(racine, 'web/src/generated'), { recursive: true });
      mkdirSync(join(racine, 'web/src/lib/atelier-bibliotheque-options'), { recursive: true });
      symlinkSync(generee, join(racine, 'web/src/generated/prisma'), 'dir');
      writeFileSync(join(racine, COCKPIT), "import { L } from './lecture';\nexport default L;\n");
      writeFileSync(join(racine, LECTURE), "import { PrismaClient } from '../../generated/prisma/client';\nexport const L = PrismaClient;\n");
      const ctx = contexteResolution(racine);
      // Le constat : canonicalisé, le client sort de la racine.
      expect(importsResolus(LECTURE, ctx)[0].atteint).toMatch(/^\.\.\/.*\/web\/src\/generated\/prisma\/client\.ts$/);
      const f = fermetureDuCockpit(ctx);
      expect(f.entreesDuClient).toEqual([`${LECTURE} -> ${CLIENT_GENERE}client.ts {PrismaClient}`]);
      expect(f.exterieurs).toEqual([]);
      expect(f.fichiers).toEqual([COCKPIT, LECTURE]);
    } finally {
      rmSync(racine, { recursive: true, force: true });
      rmSync(ailleurs, { recursive: true, force: true });
    }
  });
});
