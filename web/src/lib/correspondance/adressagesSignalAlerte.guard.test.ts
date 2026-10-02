import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LES ADRESSAGES SUR SIGNAL D'ALERTE ([[D-257]], LOT-02).
//
// Une ligne `adressage` LÈVE une inhibition de sécurité : elle fait sortir un
// dossier du blocage que [[D-099]] pose. La base refuse déjà UPDATE et
// TRUNCATE, et toute couverture qui ne viendrait pas d'une lettre d'adressage
// de ce dossier (triggers de la migration `adressages_signal_alerte_v1`). Elle
// ADMET le DELETE, et c'est voulu : chaque ligne est une donnée patient, que
// l'effacement nommé du dossier doit pouvoir supprimer. Ce banc garde ce que
// la base ne peut pas dire — QUEL CODE écrit :
//   — un adressage ne se supprime QUE dans `patient/effacement.ts` (supprimer
//     une révocation rouvrirait une levée sans trace) ;
//   — aucun code ne le réécrit, ni par Prisma, ni en SQL brut ;
//   — AUCUN code ne le crée encore : la migration part SEULE ([[D-087]]), et
//     l'écrivain (LOT-03) n'arrive qu'après l'application constatée par
//     conteneur. Le LOT-03 remplacera cette assertion par son unique écrivain.

const RACINE = path.join(process.cwd(), 'src');
const EFFACEMENT = path.join('lib', 'patient', 'effacement.ts');

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

function occurrences(motif: RegExp): { fichier: string; n: number }[] {
  return fichiersSources(RACINE)
    .map(fichier => ({
      fichier: path.relative(RACINE, fichier),
      n: [...readFileSync(fichier, 'utf8').matchAll(new RegExp(motif.source, `${motif.flags}g`))].length,
    }))
    .filter(o => o.n > 0);
}

const CREER = /\.adressageSignalAlerte\s*\.\s*(?:create|createMany|createManyAndReturn)\s*\(/;
const SUPPRIMER = /\.adressageSignalAlerte\s*\.\s*(?:delete|deleteMany)\s*\(/;
const REECRIRE = /\.adressageSignalAlerte\s*\.\s*(?:update|updateMany|updateManyAndReturn|upsert)\s*\(/;
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?adressages_signal_alerte\b/i;
/**
 * L'ÉCRITURE IMBRIQUÉE : `correspondanceMedecin.create({ data: {
 * adressagesSignalAlerte: { create: … } } })` créerait une couverture sans
 * passer par les motifs ci-dessus. Les relations inverses sont nommées
 * `adressagesSignalAlerte` (patient, consultation, lettre) et `revocations`
 * (l'adressage révoqué).
 */
const IMBRIQUEE = /\b(?:adressagesSignalAlerte|revocations)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Adressages sur signal d’alerte — qui écrit (D-257, LOT-02)', () => {
  it('seul l’effacement nommé du dossier supprime un adressage — et il le fait (le banc n’est pas vide)', () => {
    expect(occurrences(SUPPRIMER)).toEqual([{ fichier: EFFACEMENT, n: 1 }]);
  });

  it('aucun code ne réécrit un adressage, par Prisma ou en SQL brut', () => {
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('aucun code ne crée encore d’adressage, ni directement ni par écriture imbriquée (migration seule)', () => {
    expect(occurrences(CREER)).toEqual([]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('les motifs reconnaissent bien les formes qu’ils doivent refuser', () => {
    expect(SUPPRIMER.test('tx.adressageSignalAlerte.deleteMany({ where: par })')).toBe(true);
    expect(CREER.test('tx.adressageSignalAlerte.create({ data })')).toBe(true);
    expect(CREER.test('client.adressageSignalAlerte.createMany({ data })')).toBe(true);
    expect(REECRIRE.test('prisma.adressageSignalAlerte.upsert({')).toBe(true);
    expect(SQL_BRUT.test('DELETE FROM public.adressages_signal_alerte WHERE')).toBe(true);
    expect(SQL_BRUT.test('update "adressages_signal_alerte" set')).toBe(true);
    expect(IMBRIQUEE.test('data: { adressagesSignalAlerte: { create: [] } }')).toBe(true);
    expect(IMBRIQUEE.test('include: { revocations: { orderBy: { ordre: "desc" } } }')).toBe(false);
  });
});
