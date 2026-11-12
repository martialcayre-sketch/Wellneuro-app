// BANC À DEUX SESSIONS — l'envoi d'un instrument du cabinet contre sa
// modification, sa publication et sa déclaration (NF-7, H59 ; [[D-303]],
// [[D-493]], arbitrages P2-1 et P2-3 du 2026-11-12, lot 3 = #2021).
//
// POURQUOI CE FICHIER EXISTE. Drapeau `WN_ENABLE_DECLARATION_SUICIDE_CAB`
// allumé, l'envoi lit les lignes `cabinet_instruments` du brouillon sous
// `FOR SHARE`, et la modification du contenu prend un `FOR UPDATE` puis
// recompte les envois sous ce verrou. Les tests des routes ne figent ces
// verrous que comme chaînes SQL, et la passe Codex de #2021 (P1-1) a montré
// qu'un verrou juste n'empêche pas une route de réécrire une valeur périmée.
// Ce banc joue donc les VRAIS écrivains — les handlers de production
// `api/praticien/file-envoi/envoyer` (POST) et `api/praticien/instruments`
// (PATCH), client Prisma de production — contre PostgreSQL. Seule la session
// praticien est substituée (`scripts/banc-stubs/`). Courses jouées, en READ
// COMMITTED, chacune FORCÉE par un verrou tenu par une session tierce :
//
//   1. MODIFICATION D'ABORD : l'envoi attend la ligne, puis la lit en
//      brouillon et l'écarte (400), rien n'est assigné, le brouillon reste ;
//   2. ENVOI D'ABORD : la modification attend, recompte l'envoi sous son
//      verrou et refuse (409) ; la copie de l'assignation est la déclaration
//      d'avant, le contenu est intact ;
//   3. TÉMOIN de 1 : la modification en vol est ANNULÉE — l'envoi passe avec
//      la déclaration d'avant ;
//   4. TÉMOIN de 2 : l'envoi en vol est ANNULÉ — la modification passe,
//      rien n'est assigné, le brouillon reste ;
//   5. PUBLICATION D'ABORD : entre la lecture de l'envoi et son verrou,
//      l'instrument est modifié, relu et republié « non » — la copie est
//      « non », jamais le « oui » lu avant ;
//   6. ENVOI D'ABORD, PUBLICATION EN ATTENTE : l'envoi tient la ligne (déjà
//      repassée en relecture, donc écartée) ; la publication attend la fin
//      de l'envoi, puis passe ; l'instrument écarté n'est pas assigné ;
//   7. DÉCLARATION D'ABORD : un publié non déclaré, déclaré entre la lecture
//      de l'envoi et son verrou, ne part pas (la lecture l'avait écarté) ;
//   8. ENVOI D'ABORD, DÉCLARATION : « Déclarer » ne vise jamais une ligne que
//      l'envoi verrouille (il n'agit que sur un publié NON déclaré, que
//      l'envoi écarte dès sa lecture) — refus immédiat sur la ligne tenue,
//      aucune attente sur une autre ;
//   9. INTERBLOCAGES : plusieurs instruments présentés en ORDRES OPPOSÉS
//      ([A, B] et [B, A]), deux patients puis un seul, contre deux
//      modifications, dans les deux ordres — tout se termine dans le délai,
//      sans 40P01 ni 500. L'ordre fixe (`ORDER BY`) est une propriété
//      éprouvée ici, pas une preuve générale d'absence d'interblocage ;
//  10. ÉDITION DU TITRE SUR UNE LECTURE PÉRIMÉE (P1-1 de la passe Codex) :
//      elle ne réinstalle pas la V1 lue avant une V2 publiée « non ».
// Chaque course constate d'abord que la session attendue est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien. Chaque appel est borné dans le temps.
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_NF7_ENVOI_BANC_BASE`) et
// LOCALE ; fixtures (identités de fixture, suffixe propre au run) effacées à
// la fin, même en échec. Lancé par
// `node prisma/runWithAlias.js scripts/banc-envoi-cabinet-deux-sessions.test.ts`
// (depuis web/), après les contrats SQL, en CI comme en T3.

import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { createJiti } from 'jiti';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const cible = new URL(URL_BASE);
if (cible.hostname !== '127.0.0.1' && cible.hostname !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${cible.hostname} », le banc n'écrit que sur une base locale.`);
}
if (process.env.WN_NF7_ENVOI_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_NF7_ENVOI_BANC_BASE ne l'annonce pas.`);
}

const PRATICIEN = 'praticien@wellneuro.fr';
// Posés AVANT l'import du client Prisma et des routes.
process.env.DB_POOL_MAX = '10'; // une connexion sérialiserait tout
process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true'; // les verrous n'existent que drapeau allumé
process.env.WN_BANC_PRATICIEN_EMAIL = PRATICIEN;
delete process.env.SMTP_URL; // aucun courriel : la correspondance s'écrit « Non_envoye »

const WEB = path.resolve(__dirname, '..');
const jiti = createJiti(__filename, {
  alias: {
    '@/lib/auth': path.join(WEB, 'scripts/banc-stubs/auth.ts'),
    'next-auth': path.join(WEB, 'scripts/banc-stubs/next-auth.ts'),
    '@': path.join(WEB, 'src'),
  },
});

type Handler = (request: Request) => Promise<Response>;
type Issue = { status: number; json: { success?: boolean; reason?: string; count?: number; error?: string } };

const RUN = randomBytes(4).toString('hex');
const PATIENT_1 = `PAT_BANC_NF7_${RUN}_1`;
const PATIENT_2 = `PAT_BANC_NF7_${RUN}_2`;
const PREFIXE_INSTRUMENT = `CAB_BANC_NF7_${RUN}_`;
const PREFIXE_BROUILLON = `BRO_BANC_NF7_${RUN}_`;
const DELAI_MS = 20_000;

const OPTIONS = [
  { v: 0, l: 'Jamais' },
  { v: 1, l: 'Parfois' },
  { v: 2, l: 'Souvent' },
];
const DEFINITION_V1 = {
  instructions: 'Répondez spontanément.',
  sections: [
    {
      id: 'S1',
      questions: [
        { id: 'Q1', texte: 'Je dors bien.', type: 'likert', options: OPTIONS },
        { id: 'Q2', texte: 'Je me réveille reposé(e).', type: 'likert', options: OPTIONS },
      ],
    },
  ],
};
const DEFINITION_V2 = { ...DEFINITION_V1, instructions: 'Version 2 — répondez spontanément.' };
const SCORING = {
  type: 'sum',
  interpretation: [
    { min: 0, max: 2, label: 'Faible', color: 'success' },
    { min: 3, max: 4, label: 'Modéré', color: 'warning' },
  ],
  maxTotal: 4,
};
const DECLARATION_OUI = { poseQuestionSuicide: true, questionSuicideId: 'Q1', questionSuicideOptionNon: 0 };

// ── Délais bornés ─────────────────────────────────────────────────────────────

const enVol = new Set<Promise<unknown>>();

function suivre<T>(p: Promise<T>): Promise<T> {
  enVol.add(p);
  p.finally(() => enVol.delete(p)).catch(() => {});
  return p;
}

async function borne<T>(p: Promise<T>, libelle: string): Promise<T> {
  let minuteur: NodeJS.Timeout | undefined;
  const delai = new Promise<never>((_, rejeter) => {
    minuteur = setTimeout(() => rejeter(new Error(`délai dépassé (${DELAI_MS} ms) : ${libelle}`)), DELAI_MS);
  });
  try {
    return await Promise.race([p, delai]);
  } finally {
    clearTimeout(minuteur);
  }
}

// ── Appels des vrais handlers ─────────────────────────────────────────────────

let POST_ENVOYER: Handler;
let PATCH_INSTRUMENTS: Handler;

async function appeler(handler: Handler, url: string, method: string, corps: unknown): Promise<Issue> {
  const res = await handler(
    new Request(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }),
  );
  return { status: res.status, json: (await res.json()) as Issue['json'] };
}

function envoyer(idBrouillon: string): Promise<Issue> {
  return suivre(
    appeler(POST_ENVOYER, 'http://localhost/api/praticien/file-envoi/envoyer', 'POST', { idBrouillon }),
  );
}

function patcher(corps: Record<string, unknown>): Promise<Issue> {
  return suivre(appeler(PATCH_INSTRUMENTS, 'http://localhost/api/praticien/instruments', 'PATCH', corps));
}

const modifier = (id: string) => patcher({ idInstrument: id, definition: DEFINITION_V2 });
const demanderRelecture = (id: string) => patcher({ idInstrument: id, action: 'demander_relecture' });
const publier = (id: string, declaration: Record<string, unknown>) =>
  patcher({ idInstrument: id, action: 'publier', ...declaration });
const declarer = (id: string, declaration: Record<string, unknown>) =>
  patcher({ idInstrument: id, action: 'declarer', ...declaration });

// ── Fixtures ──────────────────────────────────────────────────────────────────

async function poserPatients(c: pg.Client) {
  for (const [idPatient, prenom, nom] of [
    [PATIENT_1, 'Sophie', 'Nicola'],
    [PATIENT_2, 'Michel', 'Dogné'],
  ]) {
    await c.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [idPatient.toLowerCase(), idPatient, `${idPatient.toLowerCase()}@example.test`, prenom, nom, PRATICIEN],
    );
  }
}

type EtatInstrument = { statut: 'brouillon' | 'grille_a_relire' | 'valide'; declaration: 'oui' | 'non' | null };

/** Un instrument neuf par course : aucun envoi d'une course ne gèle la suivante. */
async function poserInstrument(c: pg.Client, suffixe: string, etat: EtatInstrument): Promise<string> {
  const id = `${PREFIXE_INSTRUMENT}${suffixe}`;
  const oui = etat.declaration === 'oui';
  await c.query(
    `INSERT INTO cabinet_instruments
       (id, id_instrument, praticien_email, titre, categorie, definition_json, scoring_json,
        statut_relecture, actif, updated_at, pose_question_suicide, question_suicide_id, question_suicide_option_non)
     VALUES ($1, $2, $3, $4, 'Cabinet', $5, $6, $7, true, CURRENT_TIMESTAMP, $8, $9, $10)`,
    [
      id.toLowerCase(),
      id,
      PRATICIEN,
      `Banc NF-7 ${RUN} ${suffixe}`,
      JSON.stringify(DEFINITION_V1),
      JSON.stringify(SCORING),
      etat.statut,
      etat.declaration === null ? null : oui,
      oui ? 'Q1' : null,
      oui ? 0 : null,
    ],
  );
  return id;
}

let rangBrouillon = 0;
async function poserBrouillon(c: pg.Client, idPatient: string, qids: string[]): Promise<string> {
  rangBrouillon += 1;
  const id = `${PREFIXE_BROUILLON}${rangBrouillon}`;
  await c.query(
    `INSERT INTO envoi_brouillons (id, id_brouillon, praticien_email, id_patient, qids, statut, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'brouillon', CURRENT_TIMESTAMP)`,
    [id.toLowerCase(), id, PRATICIEN, idPatient, qids],
  );
  return id;
}

async function effacerFixtures(c: pg.Client) {
  const patients = [PATIENT_1, PATIENT_2];
  await c.query('BEGIN');
  await c.query('DELETE FROM assignations WHERE id_patient = ANY($1::text[])', [patients]);
  await c.query('DELETE FROM correspondances_patient WHERE id_patient = ANY($1::text[])', [patients]);
  await c.query('DELETE FROM envoi_brouillons WHERE id_patient = ANY($1::text[])', [patients]);
  await c.query('DELETE FROM cabinet_instruments WHERE id_instrument LIKE $1', [`${PREFIXE_INSTRUMENT}%`]);
  await c.query('DELETE FROM patients WHERE id_patient = ANY($1::text[])', [patients]);
  await c.query('COMMIT');
}

// ── Lectures de l'état ────────────────────────────────────────────────────────

async function instrument(c: pg.Client, id: string) {
  const { rows } = await c.query(
    `SELECT statut_relecture, pose_question_suicide, definition_json->>'instructions' AS instructions
     FROM cabinet_instruments WHERE id_instrument = $1`,
    [id],
  );
  return rows[0] as { statut_relecture: string; pose_question_suicide: boolean | null; instructions: string };
}

async function copies(c: pg.Client, idPatient: string): Promise<Record<string, boolean | null>> {
  const { rows } = await c.query(
    'SELECT id_questionnaire, pose_question_suicide FROM assignations WHERE id_patient = $1',
    [idPatient],
  );
  return Object.fromEntries(rows.map(r => [r.id_questionnaire, r.pose_question_suicide]));
}

async function statutBrouillon(c: pg.Client, id: string): Promise<string> {
  const { rows } = await c.query('SELECT statut FROM envoi_brouillons WHERE id_brouillon = $1', [id]);
  return rows[0].statut;
}

async function viderAssignations(c: pg.Client) {
  await c.query('DELETE FROM assignations WHERE id_patient = ANY($1::text[])', [[PATIENT_1, PATIENT_2]]);
}

// ── Constat du blocage ────────────────────────────────────────────────────────

const MOTIF = {
  partage: 'FOR SHARE', // l'envoi, sur les lignes des instruments
  verrouModification: 'FROM cabinet_instruments WHERE id_instrument = $1 FOR UPDATE',
  ecritureInstrument: 'UPDATE "public"."cabinet_instruments"',
  insertionAssignation: 'INSERT INTO "public"."assignations"',
  reclamationBrouillon: 'UPDATE "public"."envoi_brouillons"',
  verrouPatient: 'FROM patients WHERE id_patient = $1 FOR UPDATE',
};

async function bloquees(observateur: pg.Client, motif: string): Promise<number> {
  const { rows } = await observateur.query(
    `SELECT count(*)::int AS n FROM pg_stat_activity
     WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE $1`,
    [`%${motif}%`],
  );
  return rows[0].n;
}

/** Attend que `n` sessions soient bloquées sur un verrou, sur une requête qui contient `motif`. */
async function attendreBlocage(observateur: pg.Client, motif: string, n = 1) {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    if ((await bloquees(observateur, motif)) >= n) return;
    await new Promise(r => setTimeout(r, 25));
  }
  assert.fail(`${n} session(s) devai(en)t attendre sur « ${motif} » : la course n'a pas eu lieu.`);
}

/** Annule la requête en attente sur `motif` : sa transaction échoue et se défait. */
async function annulerEnAttente(observateur: pg.Client, motif: string) {
  const { rows } = await observateur.query(
    `SELECT pg_cancel_backend(pid) AS ok FROM pg_stat_activity
     WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE $1`,
    [`%${motif}%`],
  );
  assert.equal(rows.length, 1, `une seule requête devait attendre sur « ${motif} »`);
  assert.equal(rows[0].ok, true);
}

/** Tient la table en SHARE : lectures et `FOR SHARE`/`FOR UPDATE` passent, écritures attendent. */
async function tenirTable(tiers: pg.Client, table: 'cabinet_instruments' | 'assignations') {
  await tiers.query('BEGIN');
  await tiers.query(`LOCK TABLE ${table} IN SHARE MODE`);
}

/** Tient la ligne du brouillon : l'envoi attend sa réclamation, APRÈS ses lectures hors transaction. */
async function tenirBrouillon(tiers: pg.Client, idBrouillon: string) {
  await tiers.query('BEGIN');
  await tiers.query('SELECT 1 FROM envoi_brouillons WHERE id_brouillon = $1 FOR UPDATE', [idBrouillon]);
}

async function main() {
  ({ POST: POST_ENVOYER } = await jiti.import<{ POST: Handler }>(
    path.join(WEB, 'src/app/api/praticien/file-envoi/envoyer/route.ts'),
  ));
  ({ PATCH: PATCH_INSTRUMENTS } = await jiti.import<{ PATCH: Handler }>(
    path.join(WEB, 'src/app/api/praticien/instruments/route.ts'),
  ));
  const { prisma } = await jiti.import<typeof import('../src/lib/prisma')>(path.join(WEB, 'src/lib/prisma.ts'));

  const tiers = new pg.Client({ connectionString: URL_BASE });
  const tiers2 = new pg.Client({ connectionString: URL_BASE });
  const observateur = new pg.Client({ connectionString: URL_BASE });
  await Promise.all([tiers.connect(), tiers2.connect(), observateur.connect()]);
  try {
    await poserPatients(observateur);

    // 1. MODIFICATION D'ABORD : elle tient la ligne (FOR UPDATE), son écriture
    //    est retenue par le tiers ; l'envoi attend la ligne, puis la lit en
    //    brouillon.
    {
      const a = await poserInstrument(observateur, '1A', { statut: 'valide', declaration: 'oui' });
      const brouillon = await poserBrouillon(observateur, PATIENT_1, [a]);
      await tenirTable(tiers, 'cabinet_instruments');
      const modification = modifier(a);
      let envoi: Promise<Issue> | null = null;
      try {
        await attendreBlocage(observateur, MOTIF.ecritureInstrument);
        envoi = envoyer(brouillon);
        await attendreBlocage(observateur, MOTIF.partage);
      } finally {
        await tiers.query('COMMIT');
      }
      assert.equal((await borne(modification, 'modification 1')).status, 200);
      const issue = await borne(envoi!, 'envoi 1');
      assert.deepEqual([issue.status, issue.json.reason], [400, 'invalid_payload']);
      assert.deepEqual(await copies(observateur, PATIENT_1), {}, 'rien ne doit être assigné');
      assert.equal(await statutBrouillon(observateur, brouillon), 'brouillon');
      assert.deepEqual(await instrument(observateur, a), {
        statut_relecture: 'brouillon',
        pose_question_suicide: null,
        instructions: DEFINITION_V2.instructions,
      });
      console.log('ok 1 — modification d’abord : l’envoi attend, lit le brouillon et l’écarte (400)');
    }

    // 2. ENVOI D'ABORD : il tient la ligne (FOR SHARE), son insertion est
    //    retenue par le tiers ; la modification attend, puis recompte.
    {
      const a = await poserInstrument(observateur, '2A', { statut: 'valide', declaration: 'oui' });
      const brouillon = await poserBrouillon(observateur, PATIENT_1, [a]);
      await tenirTable(tiers, 'assignations');
      const envoi = envoyer(brouillon);
      let modification: Promise<Issue> | null = null;
      try {
        await attendreBlocage(observateur, MOTIF.insertionAssignation);
        modification = modifier(a);
        await attendreBlocage(observateur, MOTIF.verrouModification);
      } finally {
        await tiers.query('COMMIT');
      }
      const issueEnvoi = await borne(envoi, 'envoi 2');
      assert.deepEqual([issueEnvoi.status, issueEnvoi.json.count], [200, 1]);
      const issueModif = await borne(modification!, 'modification 2');
      assert.deepEqual([issueModif.status, issueModif.json.reason], [409, 'envoi_en_cours']);
      assert.deepEqual(await copies(observateur, PATIENT_1), { [a]: true });
      assert.deepEqual(await instrument(observateur, a), {
        statut_relecture: 'valide',
        pose_question_suicide: true,
        instructions: DEFINITION_V1.instructions,
      });
      console.log('ok 2 — envoi d’abord : la modification attend, recompte l’envoi et refuse (409), contenu intact');
      await viderAssignations(observateur);
    }

    // 3. TÉMOIN de 1 : la modification en vol est annulée.
    {
      const a = await poserInstrument(observateur, '3A', { statut: 'valide', declaration: 'oui' });
      const brouillon = await poserBrouillon(observateur, PATIENT_1, [a]);
      await tenirTable(tiers, 'cabinet_instruments');
      const modification = modifier(a);
      try {
        await attendreBlocage(observateur, MOTIF.ecritureInstrument);
        const envoi = envoyer(brouillon);
        await attendreBlocage(observateur, MOTIF.partage);
        await annulerEnAttente(observateur, MOTIF.ecritureInstrument);
        assert.equal((await borne(modification, 'modification 3')).status, 500);
        const issue = await borne(envoi, 'envoi 3');
        assert.deepEqual([issue.status, issue.json.count], [200, 1]);
      } finally {
        await tiers.query('COMMIT');
      }
      assert.deepEqual(await copies(observateur, PATIENT_1), { [a]: true });
      assert.equal((await instrument(observateur, a)).instructions, DEFINITION_V1.instructions);
      console.log('ok 3 — témoin : modification annulée, l’envoi passe avec la déclaration d’avant');
      await viderAssignations(observateur);
    }

    // 4. TÉMOIN de 2 : l'envoi en vol est annulé.
    {
      const a = await poserInstrument(observateur, '4A', { statut: 'valide', declaration: 'oui' });
      const brouillon = await poserBrouillon(observateur, PATIENT_1, [a]);
      await tenirTable(tiers, 'assignations');
      const envoi = envoyer(brouillon);
      try {
        await attendreBlocage(observateur, MOTIF.insertionAssignation);
        const modification = modifier(a);
        await attendreBlocage(observateur, MOTIF.verrouModification);
        await annulerEnAttente(observateur, MOTIF.insertionAssignation);
        assert.equal((await borne(envoi, 'envoi 4')).status, 500);
        assert.equal((await borne(modification, 'modification 4')).status, 200);
      } finally {
        await tiers.query('COMMIT');
      }
      assert.deepEqual(await copies(observateur, PATIENT_1), {});
      assert.equal(await statutBrouillon(observateur, brouillon), 'brouillon');
      assert.equal((await instrument(observateur, a)).statut_relecture, 'brouillon');
      console.log('ok 4 — témoin : envoi annulé, la modification passe, rien n’est assigné');
    }

    // 5. PUBLICATION D'ABORD : entre la lecture de l'envoi (« oui ») et son
    //    verrou, modification, relecture et publication « non » commises.
    {
      const a = await poserInstrument(observateur, '5A', { statut: 'valide', declaration: 'oui' });
      const brouillon = await poserBrouillon(observateur, PATIENT_1, [a]);
      await tenirBrouillon(tiers, brouillon);
      const envoi = envoyer(brouillon);
      try {
        await attendreBlocage(observateur, MOTIF.reclamationBrouillon);
        assert.equal((await borne(modifier(a), 'modification 5')).status, 200);
        assert.equal((await borne(demanderRelecture(a), 'relecture 5')).status, 200);
        assert.equal((await borne(publier(a, { poseQuestionSuicide: false }), 'publication 5')).status, 200);
      } finally {
        await tiers.query('COMMIT');
      }
      const issue = await borne(envoi, 'envoi 5');
      assert.deepEqual([issue.status, issue.json.count], [200, 1]);
      assert.deepEqual(await copies(observateur, PATIENT_1), { [a]: false }, 'la copie est la déclaration commise');
      assert.equal((await instrument(observateur, a)).instructions, DEFINITION_V2.instructions);
      console.log('ok 5 — publication « non » commise avant le verrou : la copie est « non », pas le « oui » lu avant');
      await viderAssignations(observateur);
    }

    // 6. ENVOI D'ABORD, PUBLICATION EN ATTENTE.
    {
      const a = await poserInstrument(observateur, '6A', { statut: 'valide', declaration: 'oui' });
      const b = await poserInstrument(observateur, '6B', { statut: 'valide', declaration: 'oui' });
      const brouillon = await poserBrouillon(observateur, PATIENT_1, [a, b]);
      await tenirBrouillon(tiers, brouillon);
      await tenirTable(tiers2, 'assignations');
      const envoi = envoyer(brouillon); // lit A et B publiés
      let publication: Promise<Issue> | null = null;
      try {
        await attendreBlocage(observateur, MOTIF.reclamationBrouillon);
        assert.equal((await borne(modifier(a), 'modification 6')).status, 200);
        assert.equal((await borne(demanderRelecture(a), 'relecture 6')).status, 200);
        await tiers.query('COMMIT'); // l'envoi verrouille A (en relecture) et B, puis attend l'insertion
        await attendreBlocage(observateur, MOTIF.insertionAssignation);
        publication = publier(a, DECLARATION_OUI);
        await attendreBlocage(observateur, MOTIF.ecritureInstrument);
      } finally {
        await tiers.query('ROLLBACK').catch(() => {});
        await tiers2.query('COMMIT');
      }
      const issueEnvoi = await borne(envoi, 'envoi 6');
      assert.deepEqual([issueEnvoi.status, issueEnvoi.json.count], [200, 1]);
      assert.equal((await borne(publication!, 'publication 6')).status, 200);
      assert.deepEqual(await copies(observateur, PATIENT_1), { [b]: true }, 'A, en relecture sous le verrou, est écarté');
      assert.deepEqual(await instrument(observateur, a), {
        statut_relecture: 'valide',
        pose_question_suicide: true,
        instructions: DEFINITION_V2.instructions,
      });
      console.log('ok 6 — envoi d’abord : la publication attend la fin de l’envoi, puis passe ; A n’est pas assigné');
      await viderAssignations(observateur);
    }

    // 7. DÉCLARATION D'ABORD : X, publié non déclaré, est déclaré entre la
    //    lecture de l'envoi et son verrou.
    {
      const x = await poserInstrument(observateur, '7X', { statut: 'valide', declaration: null });
      const b = await poserInstrument(observateur, '7B', { statut: 'valide', declaration: 'oui' });
      const brouillon = await poserBrouillon(observateur, PATIENT_1, [x, b]);
      await tenirBrouillon(tiers, brouillon);
      const envoi = envoyer(brouillon);
      try {
        await attendreBlocage(observateur, MOTIF.reclamationBrouillon);
        assert.equal((await borne(declarer(x, DECLARATION_OUI), 'déclaration 7')).status, 200);
      } finally {
        await tiers.query('COMMIT');
      }
      const issue = await borne(envoi, 'envoi 7');
      assert.deepEqual([issue.status, issue.json.count], [200, 1]);
      assert.deepEqual(await copies(observateur, PATIENT_1), { [b]: true }, 'X, écarté à la lecture, ne part pas');
      assert.equal((await instrument(observateur, x)).pose_question_suicide, true);
      console.log('ok 7 — déclaration d’abord : X, écarté à la lecture, ne part pas ; aucune copie NULL');
      await viderAssignations(observateur);
    }

    // 8. ENVOI D'ABORD, DÉCLARATION : jamais sur une ligne tenue.
    {
      const x = await poserInstrument(observateur, '8X', { statut: 'valide', declaration: null });
      const b = await poserInstrument(observateur, '8B', { statut: 'valide', declaration: 'oui' });
      const brouillon = await poserBrouillon(observateur, PATIENT_1, [b]);
      await tenirTable(tiers, 'assignations');
      const envoi = envoyer(brouillon);
      try {
        await attendreBlocage(observateur, MOTIF.insertionAssignation); // B est tenu FOR SHARE
        const surB = await borne(declarer(b, DECLARATION_OUI), 'déclaration 8 (B)');
        assert.deepEqual([surB.status, surB.json.reason], [409, 'conflit_statut']);
        assert.equal((await borne(declarer(x, DECLARATION_OUI), 'déclaration 8 (X)')).status, 200);
        assert.equal(await bloquees(observateur, MOTIF.ecritureInstrument), 0, 'aucune déclaration ne doit attendre');
      } finally {
        await tiers.query('COMMIT');
      }
      const issue = await borne(envoi, 'envoi 8');
      assert.deepEqual([issue.status, issue.json.count], [200, 1]);
      assert.deepEqual(await copies(observateur, PATIENT_1), { [b]: true });
      console.log('ok 8 — envoi d’abord : « Déclarer » refuse la ligne tenue (409) et n’attend sur aucune autre');
      await viderAssignations(observateur);
    }

    // 9. INTERBLOCAGES : ordres opposés, deux patients puis un seul, contre
    //    deux modifications, dans les deux ordres.
    {
      // 9a. Envois d'abord : [A, B] et [B, A], deux patients ; les deux
      //     modifications attendent ; tout se termine.
      const a = await poserInstrument(observateur, '9A', { statut: 'valide', declaration: 'oui' });
      const b = await poserInstrument(observateur, '9B', { statut: 'valide', declaration: 'oui' });
      const b1 = await poserBrouillon(observateur, PATIENT_1, [a, b]);
      const b2 = await poserBrouillon(observateur, PATIENT_2, [b, a]);
      await tenirTable(tiers, 'assignations');
      const envois = [envoyer(b1), envoyer(b2)];
      let modifications: Promise<Issue>[] = [];
      try {
        await attendreBlocage(observateur, MOTIF.insertionAssignation, 2);
        modifications = [modifier(b), modifier(a)];
        await attendreBlocage(observateur, MOTIF.verrouModification, 2);
      } finally {
        await tiers.query('COMMIT');
      }
      const issuesEnvois = await borne(Promise.all(envois), 'envois 9a');
      assert.deepEqual(
        issuesEnvois.map(i => [i.status, i.json.count]),
        [
          [200, 2],
          [200, 2],
        ],
      );
      const issuesModifs = await borne(Promise.all(modifications), 'modifications 9a');
      assert.deepEqual(
        issuesModifs.map(i => i.status),
        [409, 409],
      );
      assert.deepEqual(await copies(observateur, PATIENT_1), { [a]: true, [b]: true });
      assert.deepEqual(await copies(observateur, PATIENT_2), { [a]: true, [b]: true });
      await viderAssignations(observateur);

      // 9b. Modifications d'abord : elles tiennent C et D ; les envois [C, D]
      //     et [D, C] attendent la première ligne de l'ordre fixe, puis
      //     écartent les deux.
      const c = await poserInstrument(observateur, '9C', { statut: 'valide', declaration: 'oui' });
      const d = await poserInstrument(observateur, '9D', { statut: 'valide', declaration: 'oui' });
      const b3 = await poserBrouillon(observateur, PATIENT_1, [c, d]);
      const b4 = await poserBrouillon(observateur, PATIENT_2, [d, c]);
      await tenirTable(tiers, 'cabinet_instruments');
      const modifs2 = [modifier(d), modifier(c)];
      let envois2: Promise<Issue>[] = [];
      try {
        await attendreBlocage(observateur, MOTIF.ecritureInstrument, 2);
        envois2 = [envoyer(b3), envoyer(b4)];
        await attendreBlocage(observateur, MOTIF.partage, 2);
      } finally {
        await tiers.query('COMMIT');
      }
      assert.deepEqual(
        (await borne(Promise.all(modifs2), 'modifications 9b')).map(i => i.status),
        [200, 200],
      );
      const issuesEnvois2 = await borne(Promise.all(envois2), 'envois 9b');
      assert.deepEqual(
        issuesEnvois2.map(i => [i.status, i.json.reason]),
        [
          [400, 'invalid_payload'],
          [400, 'invalid_payload'],
        ],
      );
      assert.deepEqual(await copies(observateur, PATIENT_1), {});
      assert.deepEqual(await copies(observateur, PATIENT_2), {});

      // 9c. Un seul patient, deux brouillons [E, F] et [F, E] : le verrou du
      //     patient les sérialise ; le second trouve tout déjà assigné (409).
      const e = await poserInstrument(observateur, '9E', { statut: 'valide', declaration: 'oui' });
      const f = await poserInstrument(observateur, '9F', { statut: 'valide', declaration: 'oui' });
      const b5 = await poserBrouillon(observateur, PATIENT_1, [e, f]);
      const b6 = await poserBrouillon(observateur, PATIENT_1, [f, e]);
      await tenirTable(tiers, 'assignations');
      const envois3 = [envoyer(b5), envoyer(b6)];
      try {
        await attendreBlocage(observateur, MOTIF.insertionAssignation);
        await attendreBlocage(observateur, MOTIF.verrouPatient);
      } finally {
        await tiers.query('COMMIT');
      }
      const issuesEnvois3 = await borne(Promise.all(envois3), 'envois 9c');
      assert.deepEqual(
        issuesEnvois3.map(i => i.status).sort(),
        [200, 409],
      );
      assert.deepEqual(await copies(observateur, PATIENT_1), { [e]: true, [f]: true });
      console.log('ok 9 — ordres opposés, deux patients puis un seul, dans les deux ordres : aucun interblocage');
      await viderAssignations(observateur);
    }

    // 10. ÉDITION DU TITRE SUR UNE LECTURE PÉRIMÉE (passe Codex de #2021,
    //     P1-1) : le titre est lu sur la V1 « oui » ; avant son écriture, la
    //     ligne passe en V2 publiée « non ». La modification, la relecture et
    //     la publication concurrentes sont rejouées en SQL par le tiers, dans
    //     l'ordre de leurs routes : l'écrivain éprouvé ici est l'édition du
    //     titre, qui échappe au verrou et ne doit réécrire que ses champs.
    {
      const a = await poserInstrument(observateur, '10A', { statut: 'valide', declaration: 'oui' });
      await tiers.query('BEGIN');
      await tiers.query('SELECT 1 FROM cabinet_instruments WHERE id_instrument = $1 FOR UPDATE', [a]);
      const edition = patcher({ idInstrument: a, titre: `Banc NF-7 ${RUN} 10A renommé` });
      try {
        await attendreBlocage(observateur, MOTIF.ecritureInstrument); // lu V1 « oui », écriture retenue
        await tiers.query(
          `UPDATE cabinet_instruments
              SET definition_json = $2, statut_relecture = 'brouillon', pose_question_suicide = NULL,
                  question_suicide_id = NULL, question_suicide_option_non = NULL, updated_at = now()
            WHERE id_instrument = $1`,
          [a, JSON.stringify(DEFINITION_V2)],
        );
        await tiers.query(
          `UPDATE cabinet_instruments SET statut_relecture = 'grille_a_relire', updated_at = now() WHERE id_instrument = $1`,
          [a],
        );
        await tiers.query(
          `UPDATE cabinet_instruments SET statut_relecture = 'valide', pose_question_suicide = false, updated_at = now()
            WHERE id_instrument = $1`,
          [a],
        );
        await tiers.query('COMMIT');
      } finally {
        await tiers.query('ROLLBACK').catch(() => {});
      }
      assert.equal((await borne(edition, 'édition du titre 10')).status, 200);
      assert.deepEqual(
        await instrument(observateur, a),
        { statut_relecture: 'valide', pose_question_suicide: false, instructions: DEFINITION_V2.instructions },
        'l’édition du titre ne doit pas réinstaller la V1 lue avant',
      );
      console.log('ok 10 — titre écrit sur une lecture périmée : la V2 publiée « non » reste, la V1 n’est pas réinstallée');
    }
  } finally {
    try {
      await tiers.query('ROLLBACK').catch(() => {});
      await tiers2.query('ROLLBACK').catch(() => {});
      // Une course en échec peut laisser des appels en vol : ils se terminent
      // (ou expirent) AVANT l'effacement des fixtures.
      await borne(Promise.allSettled([...enVol]), 'appels en vol au nettoyage').catch(() => {});
      await effacerFixtures(observateur);
    } finally {
      await Promise.all([tiers.end(), tiers2.end(), observateur.end()]);
      await prisma.$disconnect();
    }
  }
}

main().catch(err => {
  console.error('ÉCHEC du banc de l’envoi d’un instrument du cabinet :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
