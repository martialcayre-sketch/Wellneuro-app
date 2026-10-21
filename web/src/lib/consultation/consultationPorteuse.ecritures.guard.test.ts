import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI VALIDE UNE CONSULTATION — dette nommée par le LOT-11 « Doctrine
// exécutable » ([[D-107]], dette C-6), banc arbitré le 2026-10-21 (t23).
//
// `whereConsultationPorteuse` lit `statut: 'validee'` ET une anamnèse non
// nulle (`consultationPorteuse.ts`). La seconde condition n'est pas redondante
// parce que rien au SCHÉMA n'impose qu'une consultation validée porte une
// anamnèse : seul le fait qu'un unique chemin écrive les deux ensemble le
// garantit — `api/portail/valider`, qui pose `anamnese`, `statut` et
// `dateValidation` dans le même `update`. Ce banc garde CE FAIT :
//   — aucune autre écriture Prisma de `consultation` ne pose `'validee'` ni
//     `dateValidation`, et chaque `statut` qu'elle pose est un littéral lisible ;
//   — aucune écriture imbriquée (`consultations: { … }`) ni SQL brut ne
//     contourne ces motifs ;
//   — l'écriture de `valider` pose les trois champs dans le même appel.
//
// Arbitrage : un banc de code, PAS une contrainte en base (pas de migration).
// LA LIMITE, NOMMÉE : il ne voit que `web/src`. Une écriture SQL manuelle en
// production, un script hors `src` ou le seed (`web/prisma/seed.ts`) lui
// échappent ; c'est la condition d'anamnèse de la lecture qui tient alors.

const RACINE = path.join(process.cwd(), 'src');
const VALIDER = path.join('app', 'api', 'portail', 'valider', 'route.ts');

function fichiersSources(depart: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) {
      if (entree === 'node_modules' || entree === '.next' || entree === 'generated') continue;
      trouves.push(...fichiersSources(complet));
    } else if (/\.tsx?$/.test(entree) && !/\.test\.tsx?$/.test(entree)) {
      trouves.push(complet);
    }
  }
  return trouves;
}

const ECRITURE = /\.consultation\s*\.\s*(?:create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert)\s*\(/g;
// Singulier ET pluriel (revue CodeRabbit de #1618 : `AdressageSignalAlerte`
// porte une relation `consultation`) ; seules les OPÉRATIONS d'écriture sont
// visées, une lecture `where: { consultation: { … } }` reste libre.
const IMBRIQUEE = /\bconsultations?\s*:\s*\{\s*(?:create|createMany|connectOrCreate|update|updateMany|upsert)\b/;
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE)\s+(?:public\.)?"?consultations\b/i;

/** Le texte entre la parenthèse ouvrante (exclue) et sa fermante, chaînes et commentaires sautés. */
function argumentDe(texte: string, ouvrante: number): string {
  let profondeur = 0;
  for (let i = ouvrante; i < texte.length; i++) {
    const c = texte[i];
    if (c === '/' && texte[i + 1] === '/') { i = texte.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && texte[i + 1] === '*') { i = texte.indexOf('*/', i + 2) + 1; if (i <= 0) break; continue; }
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < texte.length && texte[i] !== c; i++) if (texte[i] === '\\') i++;
      continue;
    }
    if (c === '(') profondeur++;
    if (c === ')' && --profondeur === 0) return texte.slice(ouvrante + 1, i);
  }
  throw new Error(`parenthèse non fermée à l'index ${ouvrante}`);
}

type Ecriture = { fichier: string; argument: string };

function ecrituresDe(fichier: string, texte: string): Ecriture[] {
  return [...texte.matchAll(ECRITURE)].map(m => ({
    fichier,
    argument: argumentDe(texte, (m.index ?? 0) + m[0].length - 1),
  }));
}

/** Les motifs qu'une écriture hors `valider` ne doit pas porter. Vide = conforme. */
function ecartsHorsValider(argument: string): string[] {
  const ecarts: string[] = [];
  if (/validee/.test(argument)) ecarts.push("pose 'validee'");
  if (/\bdateValidation\b/.test(argument)) ecarts.push('pose dateValidation');
  // Un statut qu'on ne lit pas ne se juge pas : variable, raccourci, expression.
  for (const m of argument.matchAll(/\bstatut\b\s*([:,}])/g)) {
    const suite = argument.slice((m.index ?? 0) + m[0].length).trimStart();
    if (m[1] !== ':' || !/^['"][a-z_]+['"]/.test(suite)) ecarts.push('statut non littéral');
  }
  // Un `data` étalé peut porter n'importe quoi.
  if (/\.\.\./.test(argument)) ecarts.push('objet étalé');
  // Un argument ou un `data` en variable aussi (revue CodeRabbit de #1618) :
  // on ne juge que ce qu'on lit.
  if (!/^\s*\{/.test(argument)) ecarts.push('argument non littéral');
  for (const m of argument.matchAll(/\b(data|create|update)\b\s*([:,}])/g)) {
    const suite = argument.slice((m.index ?? 0) + m[0].length).trimStart();
    if (m[2] !== ':' || !/^[{[]/.test(suite)) ecarts.push(`${m[1]} non littéral`);
  }
  return ecarts;
}

const SOURCES = fichiersSources(RACINE).map(fichier => ({
  fichier: path.relative(RACINE, fichier),
  texte: readFileSync(fichier, 'utf8'),
}));
const ECRITURES = SOURCES.flatMap(({ fichier, texte }) => ecrituresDe(fichier, texte));

describe('garde : seule `api/portail/valider` valide une consultation', () => {
  it('le balayage trouve des écritures (un banc qui ne voit rien ne garde rien)', () => {
    expect(ECRITURES.length).toBeGreaterThanOrEqual(4);
    expect(ECRITURES.some(e => e.fichier === VALIDER)).toBe(true);
  });

  it("aucune autre écriture de `consultation` ne pose 'validee', dateValidation ou un statut illisible", () => {
    const fautives = ECRITURES
      .filter(e => e.fichier !== VALIDER)
      .map(e => ({ fichier: e.fichier, ecarts: ecartsHorsValider(e.argument) }))
      .filter(e => e.ecarts.length > 0);
    expect(fautives).toEqual([]);
  });

  it('`valider` pose anamnese, statut validee et dateValidation dans le même appel', () => {
    const validantes = ECRITURES.filter(e => e.fichier === VALIDER && /validee/.test(e.argument));
    expect(validantes).toHaveLength(1);
    const [{ argument }] = validantes;
    expect(argument).toMatch(/\banamnese\b/);
    expect(argument).toMatch(/\bstatut\s*:\s*'validee'/);
    expect(argument).toMatch(/\bdateValidation\s*:/);
  });

  it('aucune écriture imbriquée ni SQL brut ne vise les consultations', () => {
    const fautifs = SOURCES
      .filter(({ texte }) => IMBRIQUEE.test(texte) || SQL_BRUT.test(texte))
      .map(({ fichier }) => fichier);
    expect(fautifs).toEqual([]);
  });
});

describe('le détecteur rougit sur ce qu’il doit refuser', () => {
  const juger = (source: string) => ecrituresDe('x.ts', source).flatMap(e => ecartsHorsValider(e.argument));

  it("statut 'validee' littéral", () => {
    expect(juger("await tx.consultation.update({ where: { id }, data: { statut: 'validee' } });"))
      .toContain("pose 'validee'");
  });

  it('dateValidation seule', () => {
    expect(juger('prisma.consultation.updateMany({ where: {}, data: { dateValidation: new Date() } })'))
      .toContain('pose dateValidation');
  });

  it('statut en variable ou en raccourci', () => {
    expect(juger('prisma.consultation.update({ data: { statut: STATUT } })')).toContain('statut non littéral');
    expect(juger('prisma.consultation.create({ data: { statut, motif } })')).toContain('statut non littéral');
  });

  it('argument ou data en variable', () => {
    expect(juger('prisma.consultation.update({ where, data })')).toContain('data non littéral');
    expect(juger('prisma.consultation.update({ where, data: donnees })')).toContain('data non littéral');
    expect(juger('prisma.consultation.update({ where, data: construireDonnees() })')).toContain('data non littéral');
    expect(juger('prisma.consultation.update(args)')).toContain('argument non littéral');
  });

  it('data étalé', () => {
    expect(juger('prisma.consultation.upsert({ create: { ...donnees }, update: {} })')).toContain('objet étalé');
  });

  it("un statut littéral autre que 'validee' passe, chaînes et commentaires sautés", () => {
    expect(juger("prisma.consultation.update({ data: { statut: 'en_cours', note: ')' } /* ) */ })")).toEqual([]);
  });

  it('écriture imbriquée et SQL brut', () => {
    expect(IMBRIQUEE.test('prisma.patient.update({ data: { consultations: { updateMany: {} } } })')).toBe(true);
    expect(IMBRIQUEE.test("prisma.adressageSignalAlerte.update({ data: { consultation: { update: { statut: 'validee' } } } })")).toBe(true);
    expect(IMBRIQUEE.test('prisma.adressageSignalAlerte.findMany({ where: { consultation: { idPatient } } })')).toBe(false);
    expect(SQL_BRUT.test('UPDATE "consultations" SET statut = $1')).toBe(true);
  });
});
