// BANC DE LA PURGE À L'ÉCHÉANCE CONTRE POSTGRESQL ([[D-283]] §2, §10 c, F44).
//
// POURQUOI CE FICHIER EXISTE. Les bancs unitaires de `purge.ts` et `ecart.ts`
// simulent Prisma : ils prouvent l'ordre des appels, pas que la base les
// accepte. Ce banc joue le VRAI code (`purgerAEcheance`, `ecarterCompteRendu`)
// contre les vraies contraintes — FK RESTRICT des lignes, des extractions,
// des travaux de la file et des actes de lecture, triggers du staging — sur
// les arbitrages F44 du 2026-10-17 :
//
//   1. un dépôt de 30 jours SANS ligne validée : document purgé, lignes,
//      extractions et travaux terminés effacés ; la trace du dépôt (date,
//      empreinte) reste (cas 1) ;
//   2. un dépôt MIXTE : la ligne validée, son extraction et son acte de
//      lecture restent ; la ligne écartée et l'extraction échouée partent
//      (cas 2) ;
//   3. un document DÉJÀ PURGÉ à la dernière décision ([[D-258]] §1) : sa ligne
//      écartée part à l'échéance ;
//   4. un travail de la file EN ATTENTE : rien n'est effacé, ni le document ni
//      les lignes (cas 4) ;
//   5. un dépôt RÉCENT : intouché ;
//   6. L'ÉCART d'un document transmis par le patient : ses lignes, ses
//      extractions et ses travaux terminés partent avec lui (cas 3) ;
//   7. un SECOND PASSAGE ne change plus rien.
//
// Les dépôts anciens sont posés en désarmant, le temps d'une transaction, le
// trigger qui date le dépôt par la base — patron du contrat
// `bio_ingest_purge_v1_negatif.sql`.
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_BIO_PURGE_BANC_BASE`) et LOCALE,
// fixtures effacées à la fin. Lancé par
// `node prisma/runWithAlias.js scripts/banc-purge-echeance.test.ts` (alias
// `@/`), après les contrats SQL, en CI comme en T3.

import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const cible = new URL(URL_BASE);
if (cible.hostname !== '127.0.0.1' && cible.hostname !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${cible.hostname} », le banc n'écrit que sur une base locale.`);
}
if (process.env.WN_BIO_PURGE_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_BIO_PURGE_BANC_BASE ne l'annonce pas.`);
}

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_PURGE_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE = `BIO_BANC_PURGE_${RUN.toUpperCase()}`;
const id = (nom: string) => `${nom}_banc_purge_${RUN}`;

type Client = pg.Client;

/** Un compte rendu ; `ancien` le date de 30 jours et une heure, trigger désarmé. */
async function compteRendu(c: Client, nom: string, opts: { ancien: boolean; origine: 'praticien' | 'patient' }) {
  await c.query('BEGIN');
  if (opts.ancien) await c.query('ALTER TABLE comptes_rendus_biologiques DISABLE TRIGGER comptes_rendus_biologiques_avant_insertion');
  await c.query(
    `INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par, origine, depose_le)
     VALUES ($1, $2, convert_to($3, 'UTF8'), 'application/pdf', encode(sha256(convert_to($3, 'UTF8')), 'hex'), $4, $5,
             (clock_timestamp() AT TIME ZONE 'UTC') - CASE WHEN $6 THEN interval '30 days 1 hour' ELSE interval '0' END)`,
    [id(nom), PATIENT, `banc ${RUN} ${nom}`, opts.origine === 'praticien' ? PRATICIEN : null, opts.origine, opts.ancien],
  );
  if (opts.ancien) await c.query('ALTER TABLE comptes_rendus_biologiques ENABLE TRIGGER comptes_rendus_biologiques_avant_insertion');
  await c.query('COMMIT');
}

/** Une extraction et ses lignes proposées ; `echec` n'en porte aucune. */
async function extraction(c: Client, nom: string, cr: string, lignes: string[], issue: 'extrait' | 'echec' = 'extrait') {
  await c.query(
    `INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
     VALUES ($1, $2, $3, 'modele-banc', 'bio-extraction-v3', $4)`,
    [id(nom), PATIENT, id(cr), PRATICIEN],
  );
  for (const [rang, ligne] of lignes.entries()) {
    await c.query(
      `INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ($1, $2, $3, $4, 1, 'Libellé', '1', 'inconnu')`,
      [id(ligne), PATIENT, id(nom), rang + 1],
    );
  }
  await c.query(
    issue === 'extrait'
      ? `UPDATE imports_biologiques SET statut = 'extrait', termine_le = CURRENT_TIMESTAMP WHERE id = $1`
      : `UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'delai_depasse', termine_le = CURRENT_TIMESTAMP WHERE id = $1`,
    [id(nom)],
  );
}

async function ecarterLigne(c: Client, ligne: string) {
  await c.query(
    `UPDATE lignes_biologiques_candidates SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = $1
     WHERE id = $2`,
    [PRATICIEN, id(ligne)],
  );
}

/** Un résultat saisi APRÈS la fin de l'extraction (la décision le vérifie), puis la ligne validée. */
async function validerLigne(c: Client, ligne: string, rang: number) {
  await new Promise(r => setTimeout(r, 20));
  await c.query(
    `INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, saisi_le)
     VALUES ($1, $2, $3, 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00' + make_interval(days => $4), 'saisie_praticien', $5,
             clock_timestamp() AT TIME ZONE 'UTC')`,
    [id(`res_${ligne}`), PATIENT, ANALYTE, rang, PRATICIEN],
  );
  await c.query(
    `UPDATE lignes_biologiques_candidates SET statut = 'validee', id_resultat = $1, traite_par = $2 WHERE id = $3`,
    [id(`res_${ligne}`), PRATICIEN, id(ligne)],
  );
}

async function travailTermine(c: Client, nom: string, cr: string, imp: string) {
  await c.query(
    `INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, demande_par, statut, tentatives, id_import_courant, termine_le)
     VALUES ($1, $2, $3, $4, 'termine', 1, $5, clock_timestamp() AT TIME ZONE 'UTC')`,
    [id(nom), PATIENT, id(cr), PRATICIEN, id(imp)],
  );
}

async function poserFixtures(c: Client) {
  await c.query('BEGIN');
  await c.query(
    `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
     VALUES ($1, $2, $3, 'Jennifer', 'Martin', $4, CURRENT_TIMESTAMP)`,
    [id('pat'), PATIENT, `jennifer.martin+banc-${RUN}@example.test`, PRATICIEN],
  );
  await c.query(
    `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
     VALUES ($1, $2, 'Analyte de banc', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP)`,
    [id('bio'), ANALYTE],
  );
  await c.query('COMMIT');

  await compteRendu(c, 'cr_vide', { ancien: true, origine: 'praticien' });
  await compteRendu(c, 'cr_mixte', { ancien: true, origine: 'praticien' });
  await compteRendu(c, 'cr_decide', { ancien: true, origine: 'praticien' });
  await compteRendu(c, 'cr_attente', { ancien: true, origine: 'praticien' });
  await compteRendu(c, 'cr_recent', { ancien: false, origine: 'praticien' });
  await compteRendu(c, 'cr_patient', { ancien: false, origine: 'patient' });

  // 1. Sans ligne validée : une extraction échouée, puis une lue (une
  //    proposée, une écartée) et son travail terminé.
  await extraction(c, 'imp_vide_echec', 'cr_vide', [], 'echec');
  await extraction(c, 'imp_vide', 'cr_vide', ['lig_vide_p', 'lig_vide_e']);
  await ecarterLigne(c, 'lig_vide_e');
  await travailTermine(c, 'trv_vide', 'cr_vide', 'imp_vide');

  // 2. Mixte : une extraction échouée, puis une lue — une validée, une
  //    écartée —, et la lecture consignée de celle-ci.
  await extraction(c, 'imp_mixte_echec', 'cr_mixte', [], 'echec');
  await extraction(c, 'imp_mixte', 'cr_mixte', ['lig_mixte_v', 'lig_mixte_e']);
  await ecarterLigne(c, 'lig_mixte_e');
  await validerLigne(c, 'lig_mixte_v', 1);
  await c.query(
    `INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
     VALUES ($1, $2, $3, 'lecture', $4)`,
    [id('lec_mixte'), PATIENT, id('imp_mixte'), PRATICIEN],
  );

  // 3. Décidé, document purgé à la dernière décision.
  await extraction(c, 'imp_decide', 'cr_decide', ['lig_decide_v', 'lig_decide_e']);
  await ecarterLigne(c, 'lig_decide_e');
  await validerLigne(c, 'lig_decide_v', 2);
  await c.query(
    `UPDATE comptes_rendus_biologiques SET contenu = NULL, motif_purge = 'lignes_decidees' WHERE id = $1`,
    [id('cr_decide')],
  );

  // 4. Un travail de la file en attente.
  await extraction(c, 'imp_attente', 'cr_attente', ['lig_attente_p']);
  await c.query(
    `INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, demande_par)
     VALUES ($1, $2, $3, $4)`,
    [id('trv_attente'), PATIENT, id('cr_attente'), PRATICIEN],
  );

  // 5. Récent.
  await extraction(c, 'imp_recent', 'cr_recent', ['lig_recent_p']);

  // 6. Transmis par le patient, lu, une ligne écartée, une proposée.
  await extraction(c, 'imp_patient', 'cr_patient', ['lig_patient_p', 'lig_patient_e']);
  await ecarterLigne(c, 'lig_patient_e');
  await travailTermine(c, 'trv_patient', 'cr_patient', 'imp_patient');
}

async function effacerFixtures(c: Client) {
  // L'ordre de l'effacement nommé du dossier (`patient/effacement.ts`).
  const par = [PATIENT];
  await c.query('BEGIN');
  await c.query('DELETE FROM lectures_imports_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM travaux_extraction_biologique WHERE id_patient = $1', par);
  await c.query('DELETE FROM lignes_biologiques_candidates WHERE id_patient = $1', par);
  await c.query('DELETE FROM imports_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM masquages_comptes_rendus WHERE id_patient = $1', par);
  await c.query('DELETE FROM comptes_rendus_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM resultats_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM patients WHERE id_patient = $1', par);
  await c.query('DELETE FROM biology_analytes WHERE code = $1', [ANALYTE]);
  await c.query('COMMIT');
}

/** Ce qui reste d'un compte rendu, lu par la session d'observation. */
async function etat(c: Client, cr: string) {
  const { rows: [doc] } = await c.query(
    `SELECT contenu IS NULL AS purge, motif_purge, empreinte_sha256 IS NOT NULL AS empreinte, depose_le IS NOT NULL AS date
     FROM comptes_rendus_biologiques WHERE id = $1`,
    [id(cr)],
  );
  const liste = async (sql: string) => (await c.query(sql, [id(cr)])).rows.map(r => r.id as string).sort();
  return {
    ...doc,
    imports: await liste('SELECT id FROM imports_biologiques WHERE id_compte_rendu = $1'),
    lignes: await liste(
      'SELECT l.id FROM lignes_biologiques_candidates l JOIN imports_biologiques i ON i.id = l.id_import WHERE i.id_compte_rendu = $1',
    ),
    travaux: await liste('SELECT id FROM travaux_extraction_biologique WHERE id_compte_rendu = $1'),
    lectures: await liste(
      'SELECT a.id FROM lectures_imports_biologiques a JOIN imports_biologiques i ON i.id = a.id_import WHERE i.id_compte_rendu = $1',
    ),
  };
}

async function main() {
  const observateur = new pg.Client({ connectionString: URL_BASE });
  await observateur.connect();
  const { prisma } = await import('@/lib/prisma');
  const { purgerAEcheance } = await import('@/lib/biology-library/import/purge');
  const { ecarterCompteRendu } = await import('@/lib/biology-library/import/ecart');
  try {
    await poserFixtures(observateur);
    const avant = {
      attente: await etat(observateur, 'cr_attente'),
      recent: await etat(observateur, 'cr_recent'),
    };

    const bilan = await purgerAEcheance();
    assert.equal(bilan.echecs, 0, `aucun refus de la base : ${JSON.stringify(bilan)}`);

    const vide = await etat(observateur, 'cr_vide');
    assert.deepEqual(vide, {
      purge: true, motif_purge: 'echeance', empreinte: true, date: true, imports: [], lignes: [], travaux: [], lectures: [],
    });
    console.log('ok 1 — sans ligne validée : document, lignes, extractions et travail terminé effacés ; la trace du dépôt reste');

    const mixte = await etat(observateur, 'cr_mixte');
    assert.deepEqual(mixte, {
      purge: true,
      motif_purge: 'echeance',
      empreinte: true,
      date: true,
      imports: [id('imp_mixte')],
      lignes: [id('lig_mixte_v')],
      travaux: [],
      lectures: [id('lec_mixte')],
    });
    const resultat = await observateur.query('SELECT 1 FROM resultats_biologiques WHERE id = $1', [id('res_lig_mixte_v')]);
    assert.equal(resultat.rowCount, 1, 'le résultat validé reste au dossier');
    console.log('ok 2 — mixte : la ligne validée, son extraction et sa lecture restent ; l’écartée et l’extraction échouée partent');

    const decide = await etat(observateur, 'cr_decide');
    assert.equal(decide.motif_purge, 'lignes_decidees', 'la purge à la dernière décision garde son motif');
    assert.deepEqual(decide.lignes, [id('lig_decide_v')]);
    assert.deepEqual(decide.imports, [id('imp_decide')]);
    console.log('ok 3 — document déjà purgé à la dernière décision : sa ligne écartée part à l’échéance');

    assert.deepEqual(await etat(observateur, 'cr_attente'), avant.attente);
    assert.equal(avant.attente.purge, false);
    console.log('ok 4 — un travail de la file en attente : rien n’est effacé, ni le document ni les lignes');

    assert.deepEqual(await etat(observateur, 'cr_recent'), avant.recent);
    console.log('ok 5 — un dépôt récent est intouché');

    const issue = await ecarterCompteRendu({
      idPatient: PATIENT,
      idCompteRendu: id('cr_patient'),
      motif: 'document_non_conforme',
      ecartePar: PRATICIEN,
    });
    assert.deepEqual(issue, { ok: true });
    assert.deepEqual(await etat(observateur, 'cr_patient'), {
      purge: true, motif_purge: 'ecarte', empreinte: true, date: true, imports: [], lignes: [], travaux: [], lectures: [],
    });
    console.log('ok 6 — l’écart : lignes, extraction et travail terminé partent avec le document ; sa trace reste');

    const instantane = {
      vide: await etat(observateur, 'cr_vide'),
      mixte: await etat(observateur, 'cr_mixte'),
      decide: await etat(observateur, 'cr_decide'),
    };
    const second = await purgerAEcheance();
    assert.equal(second.echecs, 0, `aucun refus au second passage : ${JSON.stringify(second)}`);
    assert.deepEqual(
      {
        vide: await etat(observateur, 'cr_vide'),
        mixte: await etat(observateur, 'cr_mixte'),
        decide: await etat(observateur, 'cr_decide'),
      },
      instantane,
    );
    console.log('ok 7 — un second passage ne change plus rien');
  } finally {
    try {
      await observateur.query('ROLLBACK').catch(() => {});
      await effacerFixtures(observateur);
    } finally {
      await observateur.end();
      await prisma.$disconnect();
    }
  }
}

main().catch(err => {
  console.error('ÉCHEC du banc de la purge :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
