// BANC SUR BASE RÉELLE — la réservation avant l'envoi ([[D-398]] §1 Q3 et §3,
// [[D-399]]). Les bancs de route simulent Prisma : ils voient l'ordre des
// appels, jamais deux requêtes qui se croisent. Celui-ci les fait se croiser,
// sur une vraie base, par le code des routes :
//
//   1. GARDE D'UNE HEURE : deux e-mails d'accès simultanés vers un dossier
//      donnent un envoi et un « Non envoyé » motivé ; une heure plus tard, la
//      garde laisse passer. Un échec ne compte pas.
//   2. RAPPEL DE QUESTIONNAIRE : deux cartes du même dossier rappelées en même
//      temps donnent UN e-mail, qui couvre les deux ; une ligne « Erreur » ne
//      déclenche pas de 429.
//   3. PREMIER ENVOI D'UN BILAN : deux clics simultanés, un seul envoi.
//   4. CE QUI COMPTE COMME ENVOI : « Erreur », messagerie absente et refus de
//      garde ne comptent pas ; un envoi parti ou en partance, si.
//
// LE CROISEMENT EST FORCÉ, pas espéré (patron de
// `physio-traitements/physioTraitements.pg.test.ts`) : l'observateur tient le
// verrou du dossier, attend que les DEUX requêtes l'attendent (`pg_locks`),
// puis le rend. Sans le verrou dans le code, elles ne l'attendent jamais : le
// banc rougit à coup sûr, sur l'attente.
//
// SAUTÉ PAR DÉFAUT (T1, T2) : il écrit et commet. Il ne tourne que si
// `WN_RESERVATION_ENVOI_BANC_BASE` nomme la base de `DATABASE_URL`, sur un
// hôte LOCAL — en CI, dans le job des bancs sur base réelle. Ses lignes
// (dossiers `PAT_BANC_RES_…`, propres au run, identité de fixture) restent
// dans la base éphémère.

import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL ?? '';
const BASE_ANNONCEE = process.env.WN_RESERVATION_ENVOI_BANC_BASE ?? '';

function baseAutorisee(): boolean {
  if (!URL_BASE || !BASE_ANNONCEE) return false;
  const url = new URL(URL_BASE);
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${url.hostname} », le banc n'écrit que sur une base locale.`);
  }
  if (url.pathname.slice(1) !== BASE_ANNONCEE) {
    throw new Error(`REFUS : DATABASE_URL vise « ${url.pathname.slice(1)} », WN_RESERVATION_ENVOI_BANC_BASE annonce « ${BASE_ANNONCEE} ».`);
  }
  return true;
}

const ACTIF = baseAutorisee();
const RUN = randomBytes(4).toString('hex').toUpperCase();
const PRATICIEN = 'praticien.banc@wellneuro.fr';

// Seul le monde extérieur est simulé : la session, et le relais SMTP, dont on
// compte les envois. La base, les routes et les verrous sont réels.
const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock('next-auth', () => ({ getServerSession: async () => ({ user: { email: 'praticien.banc@wellneuro.fr' } }) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/email/transportSmtp', () => ({ creerTransportSmtp: () => ({ sendMail }) }));
// `@/lib/anthropic` instancie un client à l'import : stub obligatoire.
vi.mock('@/lib/anthropic', () => ({
  maskEmail: (e: string) => `masqué(${e.length})`,
  sanitizeAuditError: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

const SYNTHESE_JSON = {
  resume_praticien: 'Résumé interne',
  axes_prioritaires: [{ axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['réveils'], points_a_confirmer: [] }],
  points_de_vigilance: ['fatigue'],
  questions_entretien: ['Depuis quand ?'],
  narratif_patient: 'Sommeil fragmenté.',
  limites: 'À valider.',
};

describe.skipIf(!ACTIF)('réservation avant l’envoi — base réelle ([[D-398]] §1 Q3, §3 ; [[D-399]])', { timeout: 30_000 }, () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let sendPortailLinkEmail: typeof import('@/lib/consultation/email').sendPortailLinkEmail;
  let reserverSousGarde: typeof import('./reservation').reserverSousGarde;
  let FILTRE_ENVOIS_PARTIS: typeof import('./reservation').FILTRE_ENVOIS_PARTIS;
  let MOTIFS_GARDE_ENVOI: typeof import('./reservation').MOTIFS_GARDE_ENVOI;
  let MARQUE_ENVOI_EN_COURS: typeof import('./reservation').MARQUE_ENVOI_EN_COURS;
  let relance: typeof import('@/app/api/praticien/assignations/relance/route').POST;
  let booklet: typeof import('@/app/api/praticien/booklet/route').POST;
  let observateur: pg.Client;
  let numero = 0;

  async function dossier(): Promise<string> {
    numero += 1;
    const idPatient = `PAT_BANC_RES_${RUN}_${numero}`;
    const suffixe = `${RUN.toLowerCase()}_${numero}`;
    await observateur.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, date_naissance, updated_at)
       VALUES ($1, $2, $3, 'Michel', 'Dogné', $4, '1980-03-04', CURRENT_TIMESTAMP)`,
      [`pat_banc_res_${suffixe}`, idPatient, `michel.dogne+banc-res-${suffixe}@example.test`, PRATICIEN],
    );
    return idPatient;
  }

  async function assignationEnRetard(idPatient: string, rang: number): Promise<string> {
    const idAssignation = `ASG_BANC_RES_${RUN}_${numero}_${rang}`;
    await observateur.query(
      `INSERT INTO assignations (id, id_assignation, id_patient, email_patient, id_questionnaire, titre, date_limite, updated_at)
       VALUES ($1, $2, $3, 'banc@example.test', $4, 'Questionnaire banc', '2026-01-01', CURRENT_TIMESTAMP)`,
      [idAssignation.toLowerCase(), idAssignation, idPatient, `Q_BANC_${rang}`],
    );
    return idAssignation;
  }

  async function lignesJournal(idPatient: string, type: string) {
    const { rows } = await observateur.query(
      `SELECT statut, erreur_courte, reference_id, source_type, source_id FROM correspondances_patient
        WHERE id_patient = $1 AND type = $2 ORDER BY enregistre_le, id`,
      [idPatient, type],
    );
    return rows as { statut: string; erreur_courte: string | null; reference_id: string | null; source_type: string | null; source_id: string | null }[];
  }

  /**
   * Joue les requêtes pendant que l'observateur tient le verrou de `cle` — la
   * clé même du code, `envoi_patient:<sorte>:<dossier ou bilan>` — et ne le
   * rend qu'une fois toutes en attente : elles se croisent toujours.
   */
  async function croisees<T>(cle: string, requetes: (() => Promise<T>)[]): Promise<PromiseSettledResult<T>[]> {
    await observateur.query('SELECT pg_advisory_lock(hashtext($1))', [cle]);
    const issues = Promise.allSettled(requetes.map(r => r()));
    try {
      const limite = Date.now() + 10_000;
      for (;;) {
        const { rows } = await observateur.query(
          `SELECT count(*)::int AS n FROM pg_locks
            WHERE locktype = 'advisory' AND NOT granted AND objsubid = 1
              AND objid::bigint = (hashtext($1)::bigint & 4294967295) AND pid <> pg_backend_pid()`,
          [cle],
        );
        if (rows[0].n >= requetes.length) break;
        if (Date.now() > limite) throw new Error(`les ${requetes.length} requêtes n'attendent pas le verrou « ${cle} »`);
        await new Promise(r => setTimeout(r, 20));
      }
    } finally {
      await observateur.query('SELECT pg_advisory_unlock(hashtext($1))', [cle]);
    }
    return issues;
  }

  function valeurs<T>(issues: PromiseSettledResult<T>[]): T[] {
    return issues.map(r => {
      if (r.status === 'rejected') throw r.reason;
      return r.value;
    });
  }

  function requete(url: string, corps: unknown): Request {
    return new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  }

  beforeAll(async () => {
    observateur = new pg.Client({ connectionString: URL_BASE });
    await observateur.connect();
    // PLUSIEURS CONNEXIONS, posées AVANT le client : à une seule (le défaut de
    // `resolvePoolMax`), la seconde requête attendrait la connexion, pas le
    // verrou — le croisement serait celui du pool, pas celui du code. Deux
    // conteneurs, ou `DB_POOL_MAX` relevé, sont le cas que la garde ferme.
    vi.stubEnv('DB_POOL_MAX', '4');
    ({ prisma } = await import('@/lib/prisma'));
    ({ sendPortailLinkEmail } = await import('@/lib/consultation/email'));
    ({ reserverSousGarde, FILTRE_ENVOIS_PARTIS, MOTIFS_GARDE_ENVOI, MARQUE_ENVOI_EN_COURS } = await import('./reservation'));
    ({ POST: relance } = await import('@/app/api/praticien/assignations/relance/route'));
    ({ POST: booklet } = await import('@/app/api/praticien/booklet/route'));
  });

  afterAll(async () => {
    await observateur?.end();
    await prisma?.$disconnect();
  });

  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    vi.stubEnv('SMTP_URL', 'smtp://banc@localhost:1025');
    vi.stubEnv('WN_RELANCE_QUESTIONNAIRE', 'true');
  });

  it('garde : deux accès simultanés donnent un envoi et un refus motivé ; une heure plus tard, la garde laisse passer', async () => {
    const idPatient = await dossier();

    const issues = valeurs(await croisees(`envoi_patient:acces_portail:${idPatient}`, [
      () => sendPortailLinkEmail('banc@example.test', 'Michel', idPatient),
      () => sendPortailLinkEmail('banc@example.test', 'Michel', idPatient),
    ]));
    expect(issues.sort()).toEqual(['Envoye', 'Refuse_garde']);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const lignes = await lignesJournal(idPatient, 'acces_portail');
    expect(lignes.map(l => [l.statut, l.erreur_courte]).sort()).toEqual([
      ['Envoye', null],
      ['Non_envoye', MOTIFS_GARDE_ENVOI.acces_portail],
    ]);

    // UNE HEURE PLUS TARD — l'instant est injecté, la ligne garde son horodatage.
    const plusTard = await reserverSousGarde(
      { idPatient, type: 'acces_portail', objet: 'Accès à l’espace patient' },
      new Date(Date.now() + 61 * 60_000),
    );
    expect(plusTard.refusee).toBe(false);
  });

  it('garde : un envoi en échec ne compte pas — le praticien peut réessayer tout de suite', async () => {
    const idPatient = await dossier();
    sendMail.mockRejectedValueOnce(new Error('550 relais refusé'));

    await expect(sendPortailLinkEmail('banc@example.test', 'Michel', idPatient)).rejects.toThrow('550');
    await expect(sendPortailLinkEmail('banc@example.test', 'Michel', idPatient)).resolves.toBe('Envoye');
    expect((await lignesJournal(idPatient, 'acces_portail')).map(l => l.statut)).toEqual(['Erreur', 'Envoye']);
  });

  it('rappel : deux cartes du même dossier rappelées en même temps donnent UN e-mail, qui couvre les deux', async () => {
    const idPatient = await dossier();
    const a = await assignationEnRetard(idPatient, 1);
    const b = await assignationEnRetard(idPatient, 2);
    const url = 'http://localhost/api/praticien/assignations/relance';

    const reponses = valeurs(await croisees(`envoi_patient:relance_questionnaire:${idPatient}`, [
      () => relance(requete(url, { idAssignation: a })),
      () => relance(requete(url, { idAssignation: b })),
    ]));
    expect(reponses.map(r => r.status).sort()).toEqual([200, 429]);
    const servie = await reponses.find(r => r.status === 200)!.json();
    expect(servie).toMatchObject({ ok: true, statut: 'Envoye', questionnaires: 2 });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].subject).toBe('Des questionnaires vous attendent toujours — Wellneuro');

    const lignes = await lignesJournal(idPatient, 'relance_questionnaire');
    expect(lignes).toHaveLength(1);
    expect(lignes[0].statut).toBe('Envoye');
    expect(lignes[0].erreur_courte).toBeNull();
    expect(lignes[0].reference_id!.split(',').sort()).toEqual([a, b].sort());
  });

  it('rappel : deux clics simultanés sur la même carte, un seul e-mail', async () => {
    const idPatient = await dossier();
    const a = await assignationEnRetard(idPatient, 1);
    const url = 'http://localhost/api/praticien/assignations/relance';

    const reponses = valeurs(await croisees(`envoi_patient:relance_questionnaire:${idPatient}`, [
      () => relance(requete(url, { idAssignation: a })),
      () => relance(requete(url, { idAssignation: a })),
    ]));
    expect(reponses.map(r => r.status).sort()).toEqual([200, 429]);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('rappel : une ligne « Erreur » ou « Non envoyé » ne déclenche pas de 429', async () => {
    const idPatient = await dossier();
    const a = await assignationEnRetard(idPatient, 1);
    const url = 'http://localhost/api/praticien/assignations/relance';

    sendMail.mockRejectedValueOnce(new Error('550 relais refusé'));
    expect(await (await relance(requete(url, { idAssignation: a }))).json()).toMatchObject({ statut: 'Erreur' });
    vi.stubEnv('SMTP_URL', '');
    expect(await (await relance(requete(url, { idAssignation: a }))).json()).toMatchObject({ statut: 'Non_envoye' });
    vi.stubEnv('SMTP_URL', 'smtp://banc@localhost:1025');

    const res = await relance(requete(url, { idAssignation: a }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ statut: 'Envoye' });
    // Le rappel parti, lui, compte : le suivant est refusé.
    expect((await relance(requete(url, { idAssignation: a }))).status).toBe(429);
    expect((await lignesJournal(idPatient, 'relance_questionnaire')).map(l => l.statut))
      .toEqual(['Erreur', 'Non_envoye', 'Envoye']);
  });

  it('bilan : deux premiers envois simultanés, un seul part ; une ligne de journal par envoi', async () => {
    const idPatient = await dossier();
    const idSynthese = `SYN_BANC_RES_${RUN}_${numero}`;
    await prisma.syntheseIA.create({
      data: {
        idSynthese,
        idPatient,
        emailPatient: 'banc@example.test',
        modele: 'banc',
        donneesEntree: {},
        syntheseJson: SYNTHESE_JSON,
        statut: 'Validee_Praticien',
        dateValidation: new Date(),
      },
    });
    const url = 'http://localhost/api/praticien/booklet';
    const corps = { idSynthese, relectureConfirmee: true };

    const reponses = valeurs(await croisees(`envoi_patient:booklet:${idSynthese}`, [
      () => booklet(requete(url, corps)),
      () => booklet(requete(url, corps)),
    ]));
    const charges = await Promise.all(reponses.map(r => r.json()));
    expect(charges.filter(c => c.success === true)).toHaveLength(1);
    expect(charges.filter(c => c.needsConfirmation === true)).toHaveLength(1);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const lignes = await lignesJournal(idPatient, 'booklet');
    const envoye = lignes.filter(l => l.statut === 'Envoye');
    expect(envoye).toHaveLength(1);
    // UN ENVOI, UNE LIGNE, UNE CLÉ DE SOURCE : la réservée a été soldée.
    expect(envoye[0].source_type).toBe('booklet_envoi');
    expect(envoye[0].erreur_courte).toBeNull();
    expect(lignes.filter(l => l.erreur_courte === MARQUE_ENVOI_EN_COURS)).toHaveLength(0);
  });

  it('ce qui compte comme envoi : parti ou en partance ; ni échec, ni messagerie absente, ni refus de garde', async () => {
    const idPatient = await dossier();
    const ligne = (statut: string, erreurCourte: string | null) => ({
      idPatient, canal: 'email', sens: 'sortant', type: 'objectif_propose', objet: 'banc', statut, erreurCourte,
    });
    await prisma.correspondancePatient.createMany({
      data: [
        ligne('Erreur', '550 relais refusé'),
        ligne('Non_envoye', null),
        ligne('Non_envoye', MOTIFS_GARDE_ENVOI.objectif_propose),
        ligne('Envoye', null),
        ligne('Non_envoye', MARQUE_ENVOI_EN_COURS),
      ],
    });
    const comptes = await prisma.correspondancePatient.findMany({
      where: { idPatient, ...FILTRE_ENVOIS_PARTIS },
      select: { statut: true, erreurCourte: true },
    });
    expect(comptes.map(c => [c.statut, c.erreurCourte]).sort()).toEqual([
      ['Envoye', null],
      ['Non_envoye', MARQUE_ENVOI_EN_COURS],
    ]);
  });
});
