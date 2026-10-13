// BANC DE LA FILE DES LECTURES CONTRE POSTGRESQL ([[D-282]], G3, lot 3).
//
// POURQUOI CE FICHIER EXISTE. Le contrat SQL du lot 2
// (`g3_travaux_extraction_biologique_v1_negatif.sql`) prouve la FORME de la
// table, une session à la fois. Ce banc joue le VRAI code de la file
// (`fileExtraction.ts`, client Prisma et adaptateur `pg` de production) et les
// courses que la décision a renvoyées à un banc à deux sessions :
//
//   1. DEUX DEMANDES simultanées → un travail, un `lecture_demandee` ;
//   2. DEUX RÉCLAMATIONS simultanées → une lecture, un rien ; la réservation
//      de 6 min est datée par la BASE ;
//   3. LA REPRISE : réservation expirée → l'import fantôme est clos
//      `delai_depasse` (sans juger sa péremption à l'horloge du client), un
//      import neuf est ouvert au nom du praticien d'origine, seconde
//      tentative ;
//   4. L'ÉPUISEMENT : seconde réservation expirée → `echec`,
//      `tentatives_epuisees`, l'import clos ;
//   5. UN TOUR COMPLET (`traiterProchainTravail`, lecture SIMULÉE — le
//      fournisseur n'est jamais appelé) → travail `termine`, daté par la base ;
//   5 bis. UNE LECTURE QUI A RÉPONDU sans que son travail soit terminé
//      (processus tué entre les deux) → la reprise le termine, sans relire ;
//   6. LA PURGE À 30 JOURS : le travail terminé ancien part, le récent reste ;
//   7. L'EFFACEMENT RÉEL DU DOSSIER contre une réclamation qui tient son
//      travail et crée l'import — sans interblocage : la réclamation verrouille
//      le dossier en partage AVANT le travail, l'ordre même de l'effacement.
//
// LA COURSE EST FORCÉE, PAS ESPÉRÉE. Une session tient le verrou consultatif
// du compte rendu ; le banc constate les attentes (`pg_stat_activity`, depuis
// une session d'OBSERVATION distincte) avant de relâcher.
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_BIO_FILE_BANC_BASE`) et LOCALE,
// fixtures effacées à la fin. Lancé par
// `node prisma/runWithAlias.js scripts/banc-file-extraction-deux-sessions.test.ts`
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
if (process.env.WN_BIO_FILE_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_BIO_FILE_BANC_BASE ne l'annonce pas.`);
}
// Un pool d'UNE connexion (le défaut) sérialiserait les deux réclamations : il
// n'y aurait pas de course. Posé AVANT l'import du client Prisma.
process.env.DB_POOL_MAX = '4';
// Le client du fournisseur est construit au chargement de la lecture ; le banc
// ne l'appelle JAMAIS (lecture simulée). Une valeur factice, pas une clé.
process.env.ANTHROPIC_API_KEY ??= 'banc-sans-appel';

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_FILE_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const COMPTE_RENDU = `cr_banc_file_${RUN}`;
const CLE_VERROU = `bio_ingest_compte_rendu:${COMPTE_RENDU}`;

async function poserFixtures(c: pg.Client) {
  await c.query('BEGIN');
  await c.query(
    `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
     VALUES ($1, $2, $3, 'Michel', 'Dogné', $4, CURRENT_TIMESTAMP)`,
    [`pat_banc_file_${RUN}`, PATIENT, `michel.dogne+banc-${RUN}@example.test`, PRATICIEN],
  );
  await c.query(
    `INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
     VALUES ($1, $2, convert_to($3, 'UTF8'), 'application/pdf', encode(sha256(convert_to($3, 'UTF8')), 'hex'), $4)`,
    [COMPTE_RENDU, PATIENT, `banc ${RUN}`, PRATICIEN],
  );
  await c.query('COMMIT');
}

async function effacerFixtures(c: pg.Client) {
  // L'ordre de l'effacement nommé du dossier ; le cas 7 l'a peut-être déjà fait.
  const par = [PATIENT];
  await c.query('BEGIN');
  await c.query('DELETE FROM travaux_extraction_biologique WHERE id_patient = $1', par);
  await c.query('DELETE FROM lignes_biologiques_candidates WHERE id_patient = $1', par);
  await c.query('DELETE FROM imports_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM comptes_rendus_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM patients WHERE id_patient = $1', par);
  await c.query('COMMIT');
}

/**
 * Attend `n` requêtes bloquées sur un verrou et dont le texte contient
 * `motif`. `c` est une session d'OBSERVATION, hors transaction.
 */
async function attendreBloquees(c: pg.Client, motif: string, n: number) {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    const { rows } = await c.query(
      `SELECT count(*)::int AS n FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock' AND pid <> pg_backend_pid()
         AND query ILIKE $1`,
      [`%${motif}%`],
    );
    if (rows[0].n >= n) return;
    await new Promise(r => setTimeout(r, 25));
  }
  assert.fail(`${n} requête(s) « ${motif} » devaient attendre un verrou : la course n'a pas eu lieu.`);
}

/** Tient le verrou du compte rendu, lance, constate les attentes, relâche, attend. */
async function course<T>(verrou: pg.Client, observateur: pg.Client, n: number, lancer: () => Promise<T>[]) {
  await verrou.query('SELECT pg_advisory_lock(hashtext($1))', [CLE_VERROU]);
  const enVol = lancer();
  try {
    await attendreBloquees(observateur, 'pg_advisory_xact_lock', n);
  } finally {
    await verrou.query('SELECT pg_advisory_unlock(hashtext($1))', [CLE_VERROU]);
    await Promise.allSettled(enVol);
  }
  return Promise.all(enVol);
}

async function travail(c: pg.Client, id: string) {
  const { rows } = await c.query(
    `SELECT statut, tentatives, motif_echec, id_import_courant, termine_le IS NOT NULL AS date_fin,
            extract(epoch FROM reserve_jusqua - (clock_timestamp() AT TIME ZONE 'UTC'))::float AS reste_s
     FROM travaux_extraction_biologique WHERE id = $1`,
    [id],
  );
  return rows[0];
}

async function importLu(c: pg.Client, id: string) {
  const { rows } = await c.query('SELECT statut, motif_echec, lance_par FROM imports_biologiques WHERE id = $1', [id]);
  return rows[0];
}

async function expirer(c: pg.Client, id: string) {
  await c.query(
    `UPDATE travaux_extraction_biologique
     SET reserve_jusqua = (clock_timestamp() AT TIME ZONE 'UTC') - interval '1 second' WHERE id = $1`,
    [id],
  );
}

async function main() {
  const file = await import('@/lib/biology-library/import/fileExtraction');
  const { effacerDossier } = await import('@/lib/patient/effacement');
  const { prisma } = await import('@/lib/prisma');
  const verrou = new pg.Client({ connectionString: URL_BASE });
  const observateur = new pg.Client({ connectionString: URL_BASE });
  await verrou.connect();
  await observateur.connect();
  const demande = { idPatient: PATIENT, idCompteRendu: COMPTE_RENDU, demandePar: PRATICIEN };
  // Le résidu que l'effacement réel écrit (`dossiers_effaces`) : retiré au nettoyage.
  let debutEffacement: Date | null = null;
  let initialesEffacees: string | null = null;
  try {
    await poserFixtures(verrou);

    // 1. Deux demandes.
    const demandes = await course(verrou, observateur, 2, () => [
      file.demanderExtraction(demande),
      file.demanderExtraction(demande),
    ]);
    const acceptee = demandes.find(d => d.ok);
    assert.equal(demandes.filter(d => d.ok).length, 1, `une seule demande devait passer : ${JSON.stringify(demandes)}`);
    assert.deepEqual(demandes.filter(d => !d.ok).map(d => !d.ok && d.reason), ['lecture_demandee']);
    assert.ok(acceptee && acceptee.ok);
    const ID = acceptee.idTravail;
    const enAttente = await travail(verrou, ID);
    assert.equal(enAttente.statut, 'en_attente');
    assert.equal(enAttente.id_import_courant, null, 'aucun import à la demande');
    console.log('ok 1 — deux demandes simultanées : un travail en attente, sans import ; un « lecture_demandee »');

    // 2. Deux réclamations.
    const reclamations = await course(verrou, observateur, 2, () => [file.reclamerTravail(), file.reclamerTravail()]);
    const lecture = reclamations.find(r => r?.type === 'lecture');
    assert.equal(reclamations.filter(r => r !== null).length, 1, `une seule réclamation devait aboutir : ${JSON.stringify(reclamations)}`);
    assert.ok(lecture && lecture.type === 'lecture' && lecture.idTravail === ID && lecture.tentative === 1);
    const reclame = await travail(verrou, ID);
    assert.equal(reclame.statut, 'en_cours');
    assert.equal(reclame.tentatives, 1);
    assert.equal(reclame.id_import_courant, lecture.idImport);
    assert.ok(reclame.reste_s > 350 && reclame.reste_s <= 360, `réservation de 6 min datée par la base : ${reclame.reste_s} s`);
    assert.equal((await importLu(verrou, lecture.idImport)).statut, 'en_cours');
    console.log('ok 2 — deux réclamations simultanées : une lecture, un rien ; import ouvert à la réclamation, réservation de 6 min');

    // 3. La reprise : le processus est « mort », la réservation expire. L'import
    //    n'a que quelques secondes : la reprise le clôt quand même, sans juger
    //    sa péremption à l'horloge du client (revue du lot 3, P2-3).
    await expirer(verrou, ID);
    const reprise = await file.reclamerTravail();
    assert.ok(reprise && reprise.type === 'lecture' && reprise.tentative === 2, JSON.stringify(reprise));
    assert.notEqual(reprise.idImport, lecture.idImport);
    assert.deepEqual(await importLu(verrou, lecture.idImport), { statut: 'echec', motif_echec: 'delai_depasse', lance_par: PRATICIEN });
    assert.equal((await importLu(verrou, reprise.idImport)).lance_par, PRATICIEN, 'la relance garde le praticien d’origine');
    assert.equal((await travail(verrou, ID)).tentatives, 2);
    console.log('ok 3 — reprise : le fantôme clos `delai_depasse`, un import neuf au nom du praticien d’origine, tentative 2');

    // 4. L'épuisement.
    await expirer(verrou, ID);
    const epuise = await file.reclamerTravail();
    assert.deepEqual(epuise, { type: 'epuise', idTravail: ID });
    const fin = await travail(verrou, ID);
    assert.deepEqual(
      { statut: fin.statut, motif: fin.motif_echec, tentatives: fin.tentatives, dateFin: fin.date_fin },
      { statut: 'echec', motif: 'tentatives_epuisees', tentatives: 2, dateFin: true },
    );
    assert.equal((await importLu(verrou, reprise.idImport)).statut, 'echec');
    assert.equal(await file.reclamerTravail(), null, 'un travail épuisé n’est plus réclamable');
    console.log('ok 4 — épuisement : `echec`, `tentatives_epuisees`, import clos ; la file est vide');

    // 5. Un tour complet, lecture SIMULÉE (le fournisseur répond un échec).
    const neuve = await file.demanderExtraction(demande);
    assert.ok(neuve.ok, JSON.stringify(neuve));
    const tour = await file.traiterProchainTravail(async ({ idImport }) => {
      await verrou.query(
        `UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'erreur_fournisseur' WHERE id = $1`,
        [idImport],
      );
      return { ok: true, idImport, statut: 'echec', motif: 'erreur_fournisseur' };
    });
    assert.deepEqual(tour, { issue: 'lu', tentative: 1, statut: 'echec', termine: true });
    const termine = await travail(verrou, neuve.idTravail);
    assert.equal(termine.statut, 'termine');
    assert.equal(termine.date_fin, true);
    console.log('ok 5 — un tour complet : réclamé, lu, `termine` daté par la base');

    // 5 bis. La lecture a répondu (échec consigné du fournisseur), le
    //    processus meurt avant de terminer le travail.
    const repondue = await file.demanderExtraction(demande);
    assert.ok(repondue.ok, JSON.stringify(repondue));
    const prise = await file.reclamerTravail();
    assert.ok(prise && prise.type === 'lecture', JSON.stringify(prise));
    await verrou.query(
      `UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'erreur_fournisseur' WHERE id = $1`,
      [prise.idImport],
    );
    await expirer(verrou, repondue.idTravail);
    const avant = (await verrou.query('SELECT count(*)::int AS n FROM imports_biologiques WHERE id_patient = $1', [PATIENT])).rows[0].n;
    assert.deepEqual(await file.reclamerTravail(), { type: 'deja_lu', idTravail: repondue.idTravail });
    assert.equal((await travail(verrou, repondue.idTravail)).statut, 'termine');
    const apres = (await verrou.query('SELECT count(*)::int AS n FROM imports_biologiques WHERE id_patient = $1', [PATIENT])).rows[0].n;
    assert.equal(apres, avant, 'aucune relecture : aucun import neuf');
    console.log('ok 5 bis — une lecture qui a répondu, travail non terminé : la reprise le termine, sans relire');

    // 6. La purge à 30 jours.
    const ANCIEN = `trv_banc_file_ancien_${RUN}`;
    await verrou.query(
      `INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, demande_par, statut, motif_echec, termine_le)
       VALUES ($1, $2, $3, $4, 'echec', 'document_purge', (clock_timestamp() AT TIME ZONE 'UTC') - interval '31 days')`,
      [ANCIEN, PATIENT, COMPTE_RENDU, PRATICIEN],
    );
    assert.ok((await file.purgerTravauxTermines()) >= 1);
    assert.equal(await travail(verrou, ANCIEN), undefined, 'le travail terminé depuis 31 jours est purgé');
    assert.equal((await travail(verrou, neuve.idTravail)).statut, 'termine', 'le travail récent reste');
    assert.equal((await travail(verrou, ID)).statut, 'echec', 'le travail récent reste');
    console.log('ok 6 — purge : le travail terminé depuis 31 jours part, les récents restent');

    // 7. L'effacement réel du dossier contre une réclamation en vol. La
    //    fenêtre dangereuse est celle où la réclamation TIENT le travail et
    //    crée l'import : la session `verrou` y bloque l'insertion en tenant la
    //    ligne du compte rendu (`FOR UPDATE`, que la clé étrangère de l'import
    //    attend). L'effacement part alors : il verrouille le dossier, puis
    //    supprime les travaux. Bon ordre (dossier en partage AVANT le travail) :
    //    l'effacement attend la réclamation, les deux aboutissent. Mauvais
    //    ordre : l'effacement attendrait le travail, la réclamation le dossier
    //    — interblocage (`40P01`). Témoin joué à la main le 2026-10-13 : la
    //    ligne `FOR KEY SHARE` retirée, ce cas rougit.
    const derniere = await file.demanderExtraction(demande);
    assert.ok(derniere.ok, JSON.stringify(derniere));
    debutEffacement = (await verrou.query(`SELECT clock_timestamp() AT TIME ZONE 'UTC' AS t`)).rows[0].t;
    await verrou.query('BEGIN');
    await verrou.query('SELECT id FROM comptes_rendus_biologiques WHERE id = $1 FOR UPDATE', [COMPTE_RENDU]);
    const enVol: Promise<unknown>[] = [];
    try {
      enVol.push(file.reclamerTravail());
      await attendreBloquees(observateur, 'imports_biologiques', 1);
      enVol.push(effacerDossier(PATIENT));
      await attendreBloquees(observateur, '', 2);
    } finally {
      await verrou.query('COMMIT');
    }
    const issues = await Promise.allSettled(enVol);
    assert.deepEqual(
      issues.map(i => i.status),
      ['fulfilled', 'fulfilled'],
      `réclamation et effacement doivent aboutir tous deux : ${JSON.stringify(issues.map(i => (i.status === 'rejected' ? String(i.reason) : 'ok')))}`,
    );
    const [reclamee] = issues as PromiseFulfilledResult<Awaited<ReturnType<typeof file.reclamerTravail>>>[];
    initialesEffacees = (issues[1] as PromiseFulfilledResult<{ residu: { initialesNom: string } }>).value.residu.initialesNom;
    assert.equal(reclamee.value?.type, 'lecture', 'la réclamation, arrivée la première, a ouvert sa lecture');
    const { rows } = await verrou.query('SELECT count(*)::int AS n FROM patients WHERE id_patient = $1', [PATIENT]);
    assert.equal(rows[0].n, 0, 'le dossier est effacé, travaux et imports avec lui');
    console.log('ok 7 — effacement réel contre réclamation en vol : les deux aboutissent, sans interblocage');
  } finally {
    try {
      await verrou.query('SELECT pg_advisory_unlock_all()').catch(() => {});
      await verrou.query('ROLLBACK').catch(() => {});
      await effacerFixtures(verrou);
      if (debutEffacement && initialesEffacees) {
        await verrou.query('DELETE FROM dossiers_effaces WHERE initiales_nom = $1 AND efface_le >= $2', [
          initialesEffacees,
          debutEffacement,
        ]);
      }
    } finally {
      await verrou.end();
      await observateur.end();
      await prisma.$disconnect();
    }
  }
}

main().catch(err => {
  console.error('ÉCHEC du banc de la file :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
