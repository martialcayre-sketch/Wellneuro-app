import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { statutJournalDepuisAuditBooklet } from './patient';

// D-398 §2 (audit 3, E1) — cinq lignes de bilan du journal, écrites « Erreur »
// pour des confirmations requises, passent en « Non envoyé ». Une ligne visée à
// tort effacerait un échec réel au panneau Correspondance ; un objet différent
// de celui du code ferait de ces cinq lignes un cas à part.
//
// Ce banc lit le SQL réellement livré, pas une copie. L'application en
// production se constate par conteneur après la release-db.
const MIGRATION = readFileSync(
  join(
    __dirname,
    '../../../prisma/migrations/20261031130000_correspondance_bilans_confirmation_non_envoye/migration.sql',
  ),
  'utf8',
);

// Le SQL sans ses commentaires : l'explication cite des statuts et des mots
// (« supprimée ») qui ne sont pas des instructions.
const INSTRUCTIONS = MIGRATION.split('\n')
  .filter(ligne => !ligne.trimStart().startsWith('--'))
  .join('\n');

// L'écrivain des lignes nouvelles : l'objet de la migration doit être le sien.
const ROUTE_BOOKLET = readFileSync(
  join(__dirname, '../../app/api/praticien/booklet/route.ts'),
  'utf8',
);

const SUFFIXE = ' — en attente de votre confirmation';

describe('reprise des bilans « Erreur » en confirmation requise (D-398)', () => {
  it('une seule instruction, un UPDATE du journal, rien de destructif', () => {
    // Un seul point-virgule hors commentaires : aucune autre instruction ne
    // passe à côté de l'UPDATE, et `booklet_envois` n'est que lu.
    expect(INSTRUCTIONS.match(/;/g)).toHaveLength(1);
    expect(INSTRUCTIONS.match(/\bUPDATE\b/g)).toHaveLength(1);
    expect(INSTRUCTIONS).toMatch(/UPDATE "correspondances_patient" AS c\s+SET "statut" = 'Non_envoye',/);
    expect(INSTRUCTIONS).toMatch(/FROM "booklet_envois" AS b\s+WHERE/);
    expect(INSTRUCTIONS).not.toMatch(/\b(DELETE|TRUNCATE|DROP|INSERT|ALTER|CREATE)\b/i);
  });

  it('n’assigne que le statut et l’objet', () => {
    // `erreur_courte`, `enregistre_le`, la clé de source et le dossier restent
    // tels quels : chaque colonne assignée commence une ligne du SET.
    const set = INSTRUCTIONS.slice(INSTRUCTIONS.indexOf('SET'), INSTRUCTIONS.indexOf('FROM'));
    const assignees = [...set.matchAll(/(?:SET|,)\s*"?(\w+)"?\s*=/g)].map(m => m[1]);
    expect(assignees).toEqual(['statut', 'objet']);
  });

  it('ciblée par clé : bilan « Erreur » dont la source est une confirmation requise du même dossier', () => {
    const where = INSTRUCTIONS.slice(INSTRUCTIONS.indexOf('WHERE'));
    for (const condition of [
      `c."type" = 'booklet'`,
      `c."statut" = 'Erreur'`,
      `c."source_type" = 'booklet_envoi'`,
      `c."source_id" = b."id"`,
      `c."id_patient" = b."id_patient"`,
      `b."statut" = 'Confirmation_Requise'`,
    ]) {
      expect(where, condition).toContain(condition);
    }
    // Toutes en conjonction : un OR rouvrirait la cible, un NOT l'inverserait,
    // un commentaire en bloc neutraliserait une condition sans la retirer.
    expect(where).not.toMatch(/\bOR\b/i);
    expect(INSTRUCTIONS).not.toMatch(/\/\*|\bNOT\b/i);
  });

  it('écrit le statut et l’objet que le code écrit depuis le 2026-09-08', () => {
    expect(statutJournalDepuisAuditBooklet('Confirmation_Requise')).toBe('Non_envoye');
    expect(ROUTE_BOOKLET).toContain(`? \`\${objet}${SUFFIXE}\``);
    // Même sens des deux côtés : `Renvoi` donne « Renvoi… », tout le reste « Envoi… ».
    expect(ROUTE_BOOKLET).toMatch(
      /operation === 'Renvoi'\s*\?\s*'Renvoi du bilan neuronutritionnel'\s*:\s*'Envoi du bilan neuronutritionnel'/,
    );
    for (const base of ['Envoi du bilan neuronutritionnel', 'Renvoi du bilan neuronutritionnel']) {
      expect(INSTRUCTIONS).toContain(`'${base}${SUFFIXE}'`);
    }
    expect(INSTRUCTIONS).toMatch(/CASE WHEN b\."operation" = 'Renvoi'\s+THEN 'Renvoi /);
  });
});
