import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { STATUTS_ASSIGNATION_TERMINAL } from './dedup';

// L'index unique partiel de `20260805140000_assignations_unicite_ouverte` porte
// le MÊME prédicat que la garde applicative. Tant que cet accord n'était qu'une
// phrase de commentaire, rien n'empêchait l'un des deux de bouger seul : une
// base qui refuse ce que le code accepte — ou l'inverse — ment au praticien
// dans un sens que personne ne verrait avant l'incident.
//
// Ce banc lit le SQL réellement livré, pas une copie.
const MIGRATION = readFileSync(
  join(
    __dirname,
    '../../../prisma/migrations/20260805140000_assignations_unicite_ouverte/migration.sql',
  ),
  'utf8',
);

describe('index unique partiel ↔ garde applicative', () => {
  it('l’index existe dans la migration, unique et partiel', () => {
    expect(MIGRATION).toContain('CREATE UNIQUE INDEX "assignations_unicite_ouverte_idx"');
    expect(MIGRATION).toContain('ON "assignations" ("id_patient", "id_questionnaire")');
    // Sans le WHERE, l'index interdirait toute repassation d'un instrument
    // complété — un geste clinique du produit.
    expect(MIGRATION).toMatch(/CREATE UNIQUE INDEX[\s\S]*?WHERE "statut" NOT IN \(/);
  });

  it('le prédicat SQL énumère exactement les statuts terminaux du code', () => {
    const clause = MIGRATION.match(
      /CREATE UNIQUE INDEX[\s\S]*?WHERE "statut" NOT IN \(([^)]*)\)/,
    )?.[1];
    expect(clause, 'clause WHERE de l’index introuvable').toBeTruthy();

    const statutsSql = [...(clause as string).matchAll(/'([^']+)'/g)].map(m => m[1]);
    // Comparaison ensembliste : l'ordre d'un NOT IN n'a pas de sens, mais son
    // contenu en a un — un statut de trop rouvre le doublon, un de moins ferme
    // la repassation.
    expect([...statutsSql].sort()).toEqual([...STATUTS_ASSIGNATION_TERMINAL].sort());
  });

  it('le backfill rattache les données avant d’annuler, jamais l’inverse', () => {
    // L'ordre est la propriété clinique de cette migration : annuler d'abord
    // rendrait illisibles les saisies portées par la ligne annulée (un agenda
    // reste « En attente » pendant tout son recueil). Le banc vérifie l'ordre
    // réel des instructions, pas leur simple présence.
    const posRattachement = MIGRATION.indexOf('UPDATE "agenda_sommeil_nuits"');
    const posAnnulation = MIGRATION.search(/UPDATE "assignations" a\s+SET "statut" = 'Annulée'/);
    expect(posRattachement).toBeGreaterThan(-1);
    expect(posAnnulation).toBeGreaterThan(-1);
    expect(posRattachement).toBeLessThan(posAnnulation);
  });

  it('les trois porteurs de données du dossier patient sont rattachés', () => {
    // Oublier une table, c'est perdre ses lignes en silence : elles restent en
    // base, plus aucune surface ne les lit.
    for (const table of [
      'questionnaire_reponses',
      'agenda_sommeil_nuits',
      'agenda_alimentaire_jours',
    ]) {
      expect(MIGRATION, `${table} n’est pas rattaché avant annulation`).toContain(
        `UPDATE "${table}"`,
      );
    }
  });
});
