import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// GARDE : QUI ÉCRIT LES ADRESSAGES SUR SIGNAL D'ALERTE ([[D-257]], LOT-02,
// écrivains posés au LOT-03).
//
// Une ligne `adressage` LÈVE une inhibition de sécurité : elle fait sortir un
// dossier du blocage que [[D-099]] pose. La base refuse déjà UPDATE et
// TRUNCATE, et toute couverture qui ne viendrait pas d'une lettre d'adressage
// de ce dossier (triggers de la migration `adressages_signal_alerte_v1`). Elle
// ADMET le DELETE, et c'est voulu : chaque ligne est une donnée patient, que
// l'effacement nommé du dossier doit pouvoir supprimer. Ce banc garde ce que
// la base ne peut pas dire — QUEL CODE écrit :
//   — un adressage ne se supprime QUE dans `patient/effacement.ts` (supprimer
//     une révocation rouvrirait une levée sans trace) — et dans le nettoyage
//     des E2E, qui vide les dossiers de fixture avant leurs consultations ;
//   — aucun code ne le réécrit, ni par Prisma, ni en SQL brut ;
//   — DEUX écrivains, et deux seulement : la route de la lettre d'adressage
//     (l'acte `adressage`, dans la transaction de sa lettre) et la route de
//     révocation (l'acte `revocation`). Un troisième lèverait ou rebloquerait
//     un dossier par un chemin que personne n'a relu.
//
// LA PORTÉE COUVRE `src/`, `scripts/`, `prisma/`, `e2e/` ET les scripts de la
// racine du dépôt, en TypeScript, JavaScript, SQL et shell (constats de revue
// des LOT-02 et LOT-03) : un script, un seed ou un `psql -c` qui écrirait une
// couverture contournerait le banc aussi sûrement qu'une route. Restent dehors
// les migrations (le DDL) et `prisma/checks/` (les contrats, joués dans une
// transaction annulée).

const RACINE = process.cwd();
const RACINES = ['src', 'scripts', 'prisma', 'e2e', path.join('..', 'scripts')]
  .map(dossier => path.join(RACINE, dossier));
const EFFACEMENT = path.join('src', 'lib', 'patient', 'effacement.ts');
const NETTOYAGE_E2E = path.join('e2e', 'helpers', 'db.ts');
const ROUTE_LETTRE = path.join('src', 'app', 'api', 'praticien', 'adressage', 'courrier', 'route.ts');
const ROUTE_REVOCATION = path.join('src', 'app', 'api', 'praticien', 'adressage', 'revocation', 'route.ts');
const LECTEUR_CHAINE = path.join('src', 'lib', 'clinical-engine', 'adressagesSignalAlertePrisma.ts');
// [[D-262]], LOT-02 : la remise de la lettre au patient relit la couverture
// active la plus récente, dans la transaction de diffusion — la règle même que
// le trigger de `lettres_adressage_remises` opposera à l'insertion.
const LECTEUR_REMISE = path.join('src', 'lib', 'correspondance', 'lettreAdressageRemise.ts');
// [[D-262]], LOT-03a : le service patient relit, À LA LECTURE, si la lettre
// remise porte encore une couverture non révoquée — sinon elle est « retirée ».
const LECTEUR_SERVICE_PATIENT = path.join('src', 'lib', 'correspondance', 'lettreServicePatient.ts');

function fichiersSources(depart: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) {
      if (['node_modules', '.next', 'generated', 'migrations', 'checks'].includes(entree)) continue;
      trouves.push(...fichiersSources(complet));
    } else if (/\.(?:[cm]?[jt]sx?|sql|sh)$/.test(entree) && !/\.test\.[cm]?[jt]sx?$/.test(entree)) {
      trouves.push(complet);
    }
  }
  return trouves;
}

function occurrences(motif: RegExp): { fichier: string; n: number }[] {
  return RACINES.flatMap(fichiersSources)
    .map(fichier => ({
      fichier: path.relative(RACINE, fichier),
      n: [...readFileSync(fichier, 'utf8').matchAll(new RegExp(motif.source, `${motif.flags}g`))].length,
    }))
    .filter(o => o.n > 0);
}

const CREER = /\.adressageSignalAlerte\s*\.\s*(?:create|createMany|createManyAndReturn)\s*\(/;
const SUPPRIMER = /\.adressageSignalAlerte\s*\.\s*(?:delete|deleteMany)\s*\(/;
const REECRIRE = /\.adressageSignalAlerte\s*\.\s*(?:update|updateMany|updateManyAndReturn|upsert)\s*\(/;
/**
 * LA LECTURE ([[D-257]], LOT-04) : une couverture lue LÈVE une inhibition. Un
 * second lecteur, qui jugerait autrement la porteuse, la lettre ou la
 * révocation, ferait diverger le cockpit, le vérificateur et le rejeu — donc
 * 409 sur une carte honnête, ou une levée que la chaîne n'aurait pas accordée.
 */
const LIRE = /\.adressageSignalAlerte\s*\.\s*(?:findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|count|aggregate|groupBy)\s*\(/;
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?adressages_signal_alerte\b/i;
/**
 * L'ÉCRITURE IMBRIQUÉE : `correspondanceMedecin.create({ data: {
 * adressagesSignalAlerte: { create: … } } })` créerait une couverture sans
 * passer par les motifs ci-dessus. Les relations inverses sont nommées
 * `adressagesSignalAlerte` (patient, consultation, lettre) et `revocations`
 * (l'adressage révoqué).
 */
const IMBRIQUEE = /\b(?:adressagesSignalAlerte|revocations)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert|update|updateMany|delete|deleteMany|set)\b/;

describe('Adressages sur signal d’alerte — qui écrit, qui lit (D-257, LOT-02 à LOT-04)', () => {
  it('seuls l’effacement nommé et le nettoyage des E2E suppriment un adressage — et ils le font', () => {
    expect(occurrences(SUPPRIMER)).toEqual([
      { fichier: EFFACEMENT, n: 1 },
      { fichier: NETTOYAGE_E2E, n: 2 },
    ]);
  });

  it('aucun code ne réécrit un adressage, par Prisma ou en SQL brut', () => {
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('deux écrivains, et deux seulement — la lettre et la révocation —, sans écriture imbriquée', () => {
    expect(occurrences(CREER)).toEqual([
      { fichier: ROUTE_LETTRE, n: 1 },
      { fichier: ROUTE_REVOCATION, n: 1 },
    ]);
    expect(occurrences(IMBRIQUEE)).toEqual([]);
  });

  it('quatre lecteurs, et quatre seulement — la chaîne C1 (et sa lecture groupée pour le Fil, D-275 §3), la route de révocation (LOT-04), la remise au patient et son service (D-262)', () => {
    expect(occurrences(LIRE)).toEqual([
      { fichier: ROUTE_REVOCATION, n: 1 },
      // Deux lectures dans le module de la chaîne : la lecture par dossier et
      // la lecture groupée du Fil, qui partagent leur filtre par ligne.
      { fichier: LECTEUR_CHAINE, n: 2 },
      { fichier: LECTEUR_REMISE, n: 1 },
      { fichier: LECTEUR_SERVICE_PATIENT, n: 1 },
    ]);
    expect(LIRE.test('prisma.adressageSignalAlerte.findMany({')).toBe(true);
  });

  it('la lettre n’écrit que l’acte `adressage`, la révocation que l’acte `revocation`', () => {
    const lettre = readFileSync(path.join(RACINE, ROUTE_LETTRE), 'utf8');
    const revocation = readFileSync(path.join(RACINE, ROUTE_REVOCATION), 'utf8');
    expect(lettre).toContain("acte: 'adressage'");
    expect(lettre).not.toContain("acte: 'revocation'");
    expect(revocation).toContain("acte: 'revocation'");
    // La révocation ne LIT l'acte `adressage` que dans sa recherche de cible ;
    // ce qu'elle écrit est éprouvé par son propre banc de route.
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
