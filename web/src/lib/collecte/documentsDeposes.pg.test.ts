// BANC SUR BASE RÉELLE — la collecte documentaire ([[D-330]] §4, J3-collecte).
// Ce que les bancs à base simulée ne tiennent pas : que les VRAIS chemins du
// code passent les triggers de la migration `documents_deposes_patient_v1`, et
// que les plafonds et le doublon tiennent sous concurrence.
//
//   1. Le dépôt passe (READ COMMITTED, instants posés par la base) ; le même
//      fichier est refusé « déjà déposé ».
//   2. DEUX DÉPÔTS CONCURRENTS AU SEUIL N'EN POSENT QU'UN. Une session tierce
//      tient le verrou du dossier (`hashtext('documents_deposes:' || id)`) ; le
//      banc CONSTATE que les deux dépôts l'attendent (`pg_stat_activity`) —
//      sans ce constat, une course « gagnée » aurait pu se jouer en série —,
//      puis relâche : un dépôt passe, l'autre est refusé au plafond. Même
//      épreuve pour deux dépôts du même fichier : un seul passe.
//   3. La consultation trace la PREMIÈRE ouverture, une seule fois ; une
//      seconde ouverture n'écrit rien et n'échoue pas — y compris quand les
//      deux partent ensemble, constatées en attente du verrou de la ligne.
//   4. Le classement s'ajoute, daté ; la catégorie courante suit.
//   5. Le retrait efface le contenu et garde la ligne ; un document retiré ne
//      s'ouvre plus, ne se classe plus, et peut être redéposé.
//
// SAUTÉ PAR DÉFAUT (T1, T2) : il écrit et commet. Il ne tourne que si
// `WN_COLLECTE_BANC_BASE` nomme la base de `DATABASE_URL`, sur un hôte LOCAL
// (patron de `fiches-usage/baseReelle.pg.test.ts`) — en CI, après le contrat
// SQL, avec `DB_POOL_MAX` ≥ 3. Ses lignes (dossier `PAT_BANC_COLLECTE_…`,
// propre au run, identités de fixture) restent dans la base éphémère.

import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL ?? '';
const BASE_ANNONCEE = process.env.WN_COLLECTE_BANC_BASE ?? '';

function baseAutorisee(): boolean {
  if (!URL_BASE || !BASE_ANNONCEE) return false;
  const url = new URL(URL_BASE);
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${url.hostname} », le banc n'écrit que sur une base locale.`);
  }
  if (url.pathname.slice(1) !== BASE_ANNONCEE) {
    throw new Error(`REFUS : DATABASE_URL vise « ${url.pathname.slice(1)} », WN_COLLECTE_BANC_BASE annonce « ${BASE_ANNONCEE} ».`);
  }
  return true;
}

const ACTIF = baseAutorisee();
const RUN = randomBytes(4).toString('hex').toUpperCase();
const PRATICIEN = 'praticien.banc@wellneuro.fr';

/** Un PDF synthétique distinct par appel : seule sa signature compte pour la base. */
let compteur = 0;
function pdf(): Buffer {
  compteur += 1;
  return Buffer.from(`%PDF-1.7\n% banc collecte ${RUN} ${compteur}\n%%EOF`);
}

describe.skipIf(!ACTIF)('collecte documentaire — base réelle (triggers, verrou, plafonds)', () => {
  // Importé seulement si le banc tourne : `@/lib/prisma` exige DATABASE_URL.
  let m: typeof import('./documentsDeposesServeur');
  let observateur: pg.Client;
  let numero = 0;

  /** Un dossier neuf, majeur, en suivi, propre au test. */
  async function dossier(): Promise<string> {
    numero += 1;
    const id = `PAT_BANC_COLLECTE_${RUN}_${numero}`;
    await observateur.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, date_naissance, updated_at)
       VALUES ($1, $2, $3, 'Jennifer', 'Martin', $4, '1979-07-28', CURRENT_TIMESTAMP)`,
      [`pat_banc_collecte_${RUN.toLowerCase()}_${numero}`, id, `jennifer.martin+banc-${RUN.toLowerCase()}-${numero}@example.test`, PRATICIEN],
    );
    return id;
  }

  const deposer = (idPatient: string, octets = pdf()) =>
    m.deposerDocument({ idPatient, octets, typeMime: 'application/pdf', categorie: 'courrier' });

  async function idsDocuments(idPatient: string): Promise<string[]> {
    const { rows } = await observateur.query(
      'SELECT id FROM documents_deposes_patient WHERE id_patient = $1 ORDER BY depose_le, id',
      [idPatient],
    );
    return rows.map(r => r.id as string);
  }

  beforeAll(async () => {
    m = await import('./documentsDeposesServeur');
    observateur = new pg.Client({ connectionString: URL_BASE });
    await observateur.connect();
  });

  afterAll(async () => {
    await observateur?.end();
    const { prisma } = await import('@/lib/prisma');
    await prisma.$disconnect();
  });

  /** Attend que `n` sessions attendent un verrou (consultatif, ou de ligne). */
  async function attendreBloquees(n: number, attente: 'advisory' | 'ligne' = 'advisory') {
    const limite = Date.now() + 10_000;
    const evenement = attente === 'advisory' ? "wait_event = 'advisory'" : "wait_event IN ('transactionid', 'tuple')";
    while (Date.now() < limite) {
      const { rows } = await observateur.query(
        `SELECT count(*)::int AS n FROM pg_stat_activity
         WHERE wait_event_type = 'Lock' AND ${evenement} AND datname = current_database()`,
      );
      if (rows[0].n >= n) return;
      await new Promise(r => setTimeout(r, 25));
    }
    throw new Error(`${n} sessions n’ont jamais attendu le verrou : la course s’est jouée en série.`);
  }

  /** Une session tierce tient le verrou du dossier pendant que `lancer` démarre. */
  async function sousVerrou<T>(idPatient: string, lancer: () => Promise<T>[]): Promise<T[]> {
    const tenant = new pg.Client({ connectionString: URL_BASE });
    await tenant.connect();
    try {
      await tenant.query('BEGIN');
      await tenant.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`documents_deposes:${idPatient}`]);
      const enVol = lancer();
      await attendreBloquees(enVol.length);
      await tenant.query('COMMIT');
      return await Promise.all(enVol);
    } finally {
      await tenant.end();
    }
  }

  it('1. le dépôt passe les triggers ; le même fichier est refusé « déjà déposé »', async () => {
    const id = await dossier();
    const octets = pdf();
    expect(await deposer(id, octets)).toEqual({ ok: true });
    expect(await deposer(id, octets)).toEqual({ ok: false, reason: 'document_deja_depose' });
    const { rows } = await observateur.query(
      `SELECT depose_le IS NOT NULL AS date, consulte_le, retire_le, categorie_proposee, octet_length(contenu) AS taille
       FROM documents_deposes_patient WHERE id_patient = $1`,
      [id],
    );
    expect(rows).toEqual([{ date: true, consulte_le: null, retire_le: null, categorie_proposee: 'courrier', taille: octets.length }]);
  });

  it('2a. deux dépôts concurrents au seuil des non consultés : un seul passe', async () => {
    const id = await dossier();
    expect(await deposer(id)).toEqual({ ok: true });
    expect(await deposer(id)).toEqual({ ok: true });
    const issues = await sousVerrou(id, () => [deposer(id), deposer(id)]);
    expect(issues.filter(i => i.ok)).toHaveLength(1);
    expect(issues.filter(i => !i.ok)).toEqual([{ ok: false, reason: 'plafond_non_consultes' }]);
    expect(await idsDocuments(id)).toHaveLength(3);
  });

  it('2b. deux dépôts concurrents du même fichier : un seul passe', async () => {
    const id = await dossier();
    const octets = pdf();
    const issues = await sousVerrou(id, () => [deposer(id, octets), deposer(id, octets)]);
    expect(issues.filter(i => i.ok)).toHaveLength(1);
    expect(issues.filter(i => !i.ok)).toEqual([{ ok: false, reason: 'document_deja_depose' }]);
  });

  it('3. la consultation trace la première ouverture, une seule fois', async () => {
    const id = await dossier();
    const octets = pdf();
    await deposer(id, octets);
    const [doc] = await idsDocuments(id);
    const premiere = await m.consulterDocument(id, doc, PRATICIEN);
    expect(premiere.ok && Buffer.from(premiere.contenu).equals(octets)).toBe(true);
    const { rows: [apres1] } = await observateur.query(
      'SELECT consulte_le, consulte_par FROM documents_deposes_patient WHERE id = $1',
      [doc],
    );
    expect(apres1.consulte_par).toBe(PRATICIEN);
    expect(apres1.consulte_le).not.toBeNull();
    expect((await m.consulterDocument(id, doc, PRATICIEN)).ok).toBe(true);
    const { rows: [apres2] } = await observateur.query('SELECT consulte_le FROM documents_deposes_patient WHERE id = $1', [doc]);
    expect(apres2.consulte_le).toEqual(apres1.consulte_le);
    // Consulté, il sort du plafond des non consultés.
    expect(await m.jugerPlafondsDepot(id)).toEqual({ ok: true });
  });

  it('3b. deux ouvertures simultanées d’un document jamais ouvert : deux réponses, une seule trace', async () => {
    const id = await dossier();
    await deposer(id);
    const [doc] = await idsDocuments(id);
    // Une session tierce tient la LIGNE pendant que les deux ouvertures partent :
    // les deux attendent, puis la seconde relit la ligne après le verrou et ne
    // correspond plus à « jamais ouvert » — elle n'écrit rien et n'échoue pas.
    const tenant = new pg.Client({ connectionString: URL_BASE });
    await tenant.connect();
    let issues: Awaited<ReturnType<typeof m.consulterDocument>>[];
    try {
      await tenant.query('BEGIN');
      await tenant.query('SELECT 1 FROM documents_deposes_patient WHERE id = $1 FOR UPDATE', [doc]);
      const enVol = [m.consulterDocument(id, doc, PRATICIEN), m.consulterDocument(id, doc, PRATICIEN)];
      await attendreBloquees(2, 'ligne');
      await tenant.query('COMMIT');
      issues = await Promise.all(enVol);
    } finally {
      await tenant.end();
    }
    expect(issues.map(i => i.ok)).toEqual([true, true]);
    const { rows } = await observateur.query(
      'SELECT consulte_le IS NOT NULL AS trace, consulte_par FROM documents_deposes_patient WHERE id = $1',
      [doc],
    );
    expect(rows).toEqual([{ trace: true, consulte_par: PRATICIEN }]);
  });

  it('4. le classement s’ajoute, daté, et la catégorie courante suit', async () => {
    const id = await dossier();
    await deposer(id);
    const [doc] = await idsDocuments(id);
    expect(await m.classerDocument({ idPatient: id, idDocument: doc, categorie: 'traitements_complements', praticienEmail: PRATICIEN }))
      .toEqual({ ok: true, modifie: true });
    expect(await m.classerDocument({ idPatient: id, idDocument: doc, categorie: 'traitements_complements', praticienEmail: PRATICIEN }))
      .toEqual({ ok: true, modifie: false });
    const [lu] = await m.listerDocumentsPraticien(id);
    expect(lu.categorieProposee).toBe('courrier');
    expect(lu.categorieCourante).toBe('traitements_complements');
    expect(lu.classements).toHaveLength(1);
  });

  it('5. le retrait efface le contenu et garde la ligne ; le document peut être redéposé', async () => {
    const id = await dossier();
    const octets = pdf();
    await deposer(id, octets);
    const [doc] = await idsDocuments(id);
    expect(await m.retirerDocument({ idPatient: id, idDocument: doc, motif: 'depot_par_erreur', praticienEmail: PRATICIEN }))
      .toEqual({ ok: true });
    const { rows: [ligne] } = await observateur.query(
      'SELECT contenu, retire_le, retire_par, motif_retrait, empreinte_sha256 FROM documents_deposes_patient WHERE id = $1',
      [doc],
    );
    expect(ligne.contenu).toBeNull();
    expect(ligne.retire_le).not.toBeNull();
    expect(ligne.retire_par).toBe(PRATICIEN);
    expect(ligne.motif_retrait).toBe('depot_par_erreur');
    expect(await m.retirerDocument({ idPatient: id, idDocument: doc, motif: 'demande_droit', praticienEmail: PRATICIEN }))
      .toEqual({ ok: false, reason: 'document_deja_retire' });
    expect(await m.consulterDocument(id, doc, PRATICIEN)).toEqual({ ok: false, reason: 'document_retire' });
    expect(await m.classerDocument({ idPatient: id, idDocument: doc, categorie: 'autre', praticienEmail: PRATICIEN }))
      .toEqual({ ok: false, reason: 'document_retire' });
    expect(await deposer(id, octets)).toEqual({ ok: true });
  });

  it('6. un autre praticien : la base refuse la consultation, rien n’est servi', async () => {
    const id = await dossier();
    await deposer(id);
    const [doc] = await idsDocuments(id);
    await expect(m.consulterDocument(id, doc, 'autre.praticien@wellneuro.fr')).rejects.toThrow();
    const { rows: [ligne] } = await observateur.query('SELECT consulte_le FROM documents_deposes_patient WHERE id = $1', [doc]);
    expect(ligne.consulte_le).toBeNull();
  });
});
