// BANC DU CLIENT PRISMA CONTRE LA GARDE ANTI-DOUBLON — [[D-294]], BP-09,
// migration `annulations_resultats_biologiques_v1`.
//
// POURQUOI CE FICHIER EXISTE. La garde anti-doublon de `resultats_biologiques`
// n'est plus un index unique mais un trigger, qui lève lui-même un 23505.
// Les trois écrivains (saisie, bilan, import) ne rendent le 409
// `doublon_mesure` que sur un `P2002` : c'est l'adaptateur `@prisma/adapter-pg`
// qui traduit le 23505, en lisant les champs dans le détail `Key (…)`. Le banc
// SQL (`banc-annulations-resultats-deux-sessions.test.mjs`) parle `pg` en
// direct et ne voit pas cette traduction ; la passe Codex du lot l'a relevé.
// Ici, le VRAI client de l'application (`@/lib/prisma`, adaptateur compris)
// joue trois gestes :
//
//   1. un doublon de mesure courante rend un `P2002` sur `ResultatBiologique`,
//      champs `id_patient, analyte_code, preleve_le` ;
//   2. la mesure annulée, la même saisie passe — la place est libérée ;
//   3. une saisie dans une transaction REPEATABLE READ échoue, et pas en
//      `P2002` : ce niveau est refusé par la base (passe Codex, P0-1).
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_BIO_ANNULATION_BANC_BASE`) et
// LOCALE, fixtures effacées à la fin. Lancé par
// `node prisma/runWithAlias.js scripts/banc-unicite-mesure-prisma.test.ts`
// (alias `@/`), après les contrats SQL, en CI comme en T3.

import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const cible = new URL(URL_BASE);
if (cible.hostname !== '127.0.0.1' && cible.hostname !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${cible.hostname} », le banc n'écrit que sur une base locale.`);
}
if (process.env.WN_BIO_ANNULATION_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_BIO_ANNULATION_BANC_BASE ne l'annonce pas.`);
}

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_UNI_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE = `BIO_BANC_UNI_${RUN.toUpperCase()}`;

const mesure = (valeur: number, jour: number) => ({
  idPatient: PATIENT,
  analyteCode: ANALYTE,
  valeur,
  unite: 'mg/L',
  preleveLe: new Date(`2026-09-${String(jour).padStart(2, '0')}T08:00:00Z`),
  source: 'saisie_praticien',
  saisiPar: PRATICIEN,
});

type ErreurPrisma = {
  code?: string;
  message: string;
  meta?: {
    modelName?: string;
    driverAdapterError?: { cause?: { kind?: string; constraint?: { fields?: string[] } } };
  };
};

async function main() {
  const { prisma } = await import('@/lib/prisma');
  const c = new pg.Client({ connectionString: URL_BASE });
  await c.connect();
  try {
    await c.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
       VALUES ($1, $2, $3, 'Michel', 'Dogné', $4, CURRENT_TIMESTAMP)`,
      [`pat_banc_uni_${RUN}`, PATIENT, `michel.dogne+banc-${RUN}@example.test`, PRATICIEN],
    );
    await c.query(
      `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
       VALUES ($1, $2, 'Analyte de banc', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP)`,
      [`bio_banc_uni_${RUN}`, ANALYTE],
    );

    // 1. Le doublon d'une mesure courante : P2002, comme avec l'index.
    const premiere = await prisma.resultatBiologique.create({ data: mesure(1, 1), select: { id: true } });
    const doublon = (await prisma.resultatBiologique
      .create({ data: mesure(2, 1) })
      .then(() => null, (err: unknown) => err)) as ErreurPrisma | null;
    assert.ok(doublon, '1 : le doublon d’une mesure courante est passé.');
    assert.equal(doublon.code, 'P2002', `1 : le doublon n’est pas un P2002 (${doublon.code}) — le 409 deviendrait 500.`);
    assert.equal(doublon.meta?.modelName, 'ResultatBiologique');
    assert.deepEqual(doublon.meta?.driverAdapterError?.cause?.constraint?.fields, ['id_patient', 'analyte_code', 'preleve_le']);
    console.log('ok 1 - le doublon d’une mesure courante rend un P2002');

    // 2. La mesure annulée, la place est libérée.
    await c.query(
      `INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
       VALUES ($1, $2, $3, 'annulation', 'mauvais_analyte', $4)`,
      [`ann_banc_uni_${RUN}`, PATIENT, premiere.id, PRATICIEN],
    );
    await prisma.resultatBiologique.create({ data: mesure(3, 1) });
    console.log('ok 2 - la mesure annulée, la même saisie passe');

    // 3. REPEATABLE READ : refusé par la base, et pas en P2002.
    const refus = (await prisma
      .$transaction(tx => tx.resultatBiologique.create({ data: mesure(4, 2) }), { isolationLevel: 'RepeatableRead' })
      .then(() => null, (err: unknown) => err)) as ErreurPrisma | null;
    assert.ok(refus, '3 : une saisie en REPEATABLE READ est passée.');
    assert.notEqual(refus.code, 'P2002');
    assert.match(refus.message, /écriture refusée en REPEATABLE READ/);
    console.log('ok 3 - une saisie en REPEATABLE READ est refusée par la base');
  } finally {
    // L'ordre de l'effacement nommé du dossier, en une transaction.
    try {
      await c.query('BEGIN');
      await c.query('DELETE FROM annulations_resultats_biologiques WHERE id_patient = $1', [PATIENT]);
      await c.query('DELETE FROM resultats_biologiques WHERE id_patient = $1', [PATIENT]);
      await c.query('DELETE FROM patients WHERE id_patient = $1', [PATIENT]);
      await c.query('DELETE FROM biology_analytes WHERE code = $1', [ANALYTE]);
      await c.query('COMMIT');
    } finally {
      await c.end();
      await prisma.$disconnect();
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
