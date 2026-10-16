import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LES FICHES D'USAGE ([[D-314]], patron [[D-251]] lot 7).
//
// La base refuse UPDATE, DELETE et TRUNCATE sur les quatre tables (triggers de
// la migration `20261016090000_fiches_usage_v1`). Ce banc garde ce qu'elle ne
// peut pas dire — QUEL CODE insère :
//   — une version ou un libellé ne naît QUE dans `ingestion.ts`, sous le
//     secret interne : l'IA dépose un brouillon, elle ne décide de rien ;
//   — un acte ne naît QUE dans `decision.ts`, sous une session praticien
//     ([[DC-16]] : la voie qui produit n'est pas celle qui valide) ;
//   — aucun code ne réécrit ni ne supprime, par Prisma ou en SQL brut, et
//     aucune écriture imbriquée ne contourne ces motifs.

const RACINE = path.join(process.cwd(), 'src');
const INGESTION = path.join('lib', 'fiches-usage', 'ingestion.ts');
const DECISION = path.join('lib', 'fiches-usage', 'decision.ts');

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

const SOURCES = fichiersSources(RACINE).map(fichier => ({
  fichier: path.relative(RACINE, fichier),
  texte: readFileSync(fichier, 'utf8'),
}));

function occurrences(motif: RegExp): { fichier: string; n: number }[] {
  return SOURCES
    .map(({ fichier, texte }) => ({ fichier, n: [...texte.matchAll(new RegExp(motif.source, `${motif.flags}g`))].length }))
    .filter(o => o.n > 0);
}

const modele = (nom: string, methodes: string) => new RegExp(`\\.${nom}\\s*\\.\\s*(?:${methodes})\\s*\\(`);
const CREER = 'create|createMany|createManyAndReturn';
const REECRIRE = 'update|updateMany|updateManyAndReturn|upsert|delete|deleteMany';
const MODELES = ['ficheUsageVersion', 'ficheUsageActe', 'ficheUsageLibelle', 'ficheUsageLibelleActe'];
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?fiches_usage_(?:versions|actes|libelles|libelles_actes)\b/i;
// Relation inverse du schéma : `actes` (version, libellé) — un `actes: {
// create }` dans une écriture de version créerait un acte hors de `decision.ts`.
const IMBRIQUEE = /\bactes\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Fiches d’usage — qui écrit (D-314, DC-16)', () => {
  it('versions et libellés ne naissent que dans `ingestion.ts` — et y naissent (le banc n’est pas vide)', () => {
    expect(occurrences(modele('ficheUsageVersion', CREER))).toEqual([{ fichier: INGESTION, n: 1 }]);
    expect(occurrences(modele('ficheUsageLibelle', CREER))).toEqual([{ fichier: INGESTION, n: 1 }]);
  });

  it('les actes ne naissent que dans `decision.ts`', () => {
    expect(occurrences(modele('ficheUsageActe', CREER))).toEqual([{ fichier: DECISION, n: 1 }]);
    expect(occurrences(modele('ficheUsageLibelleActe', CREER))).toEqual([{ fichier: DECISION, n: 1 }]);
  });

  it('aucun code ne réécrit ni ne supprime, par Prisma ou en SQL brut', () => {
    for (const nom of MODELES) expect(occurrences(modele(nom, REECRIRE))).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('aucune écriture imbriquée d’actes dans le module', () => {
    expect(occurrences(IMBRIQUEE).filter(o => o.fichier.includes('fiches-usage'))).toEqual([]);
  });

  it('le détecteur mord', () => {
    expect('tx.ficheUsageActe.create({').toMatch(modele('ficheUsageActe', CREER));
    expect('prisma.ficheUsageVersion .update (').toMatch(modele('ficheUsageVersion', REECRIRE));
    expect('DELETE FROM "fiches_usage_libelles_actes"').toMatch(SQL_BRUT);
    expect('data: { actes: { create: [] } }').toMatch(IMBRIQUEE);
  });
});
