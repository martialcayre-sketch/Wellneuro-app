// BANC SUR BASE RÉELLE — la désignation copiée sur l'assignation, de l'envoi à
// la lecture de `SAF-QUEST-02` ([[D-515]] §4, lot de code de §6.2, PR 2 ;
// routé de la revue `wn-reviewer` de #2103). Les bancs de route simulent
// `$queryRaw` : ils ne voient ni la forme que la base rend pour `jsonb`, ni le
// CHECK de cohérence. Celui-ci les fait voir, par le code de production :
//
//   1. la lecture de l'envoi (les colonnes de `file-envoi/envoyer/route.ts`,
//      SANS son `FOR SHARE` ni son filtre de praticien : recopiée, elle ne
//      suivrait pas un changement de la route) rend `definition_json` en
//      OBJET, que `copieDesignationSuicide` sait lire ;
//   2. la copie construite s'écrit, et le CHECK
//      `assignations_designation_suicide_coherente` l'accepte ; une
//      désignation absente (trois colonnes NULL) aussi ; une demi-copie est
//      REFUSÉE par la base ;
//   3. relue par `joindreDesignationsCabinet` puis `reponsesSecuriteDeclarees`,
//      la copie donne la lecture attendue — réponse positive citée depuis la
//      copie, désignation inconnue sous NULL (§7).
//
// SAUTÉ PAR DÉFAUT (T1, T2) : il écrit et commet. Il ne tourne que si
// `WN_DESIGNATION_CABINET_BANC_BASE` nomme la base de `DATABASE_URL`, sur un
// hôte LOCAL (patron de `correspondance/reservation.pg.test.ts`) — en CI, dans
// le job des bancs sur base réelle. Ses lignes (dossier `PAT_BANC_DSC_…`,
// instrument `CAB_BANC_DSC_…`, propres au run, identité de fixture) restent
// dans la base éphémère.

import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL ?? '';
const BASE_ANNONCEE = process.env.WN_DESIGNATION_CABINET_BANC_BASE ?? '';

function baseAutorisee(): boolean {
  if (!URL_BASE || !BASE_ANNONCEE) return false;
  const url = new URL(URL_BASE);
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${url.hostname} », le banc n'écrit que sur une base locale.`);
  }
  if (url.pathname.slice(1) !== BASE_ANNONCEE) {
    throw new Error(`REFUS : DATABASE_URL vise « ${url.pathname.slice(1)} », WN_DESIGNATION_CABINET_BANC_BASE annonce « ${BASE_ANNONCEE} ».`);
  }
  return true;
}

const ACTIF = baseAutorisee();
const RUN = randomBytes(4).toString('hex').toUpperCase();
const PRATICIEN = 'praticien.banc@wellneuro.fr';
const ID_PATIENT = `PAT_BANC_DSC_${RUN}`;
const EMAIL_PATIENT = `michel.dogne+banc-dsc-${RUN.toLowerCase()}@example.test`;
const ID_INSTRUMENT = `CAB_BANC_DSC_${RUN}`;
const DEFINITION = {
  sections: [{
    id: 'S1',
    questions: [
      { id: 'Q1', texte: 'Votre humeur ce mois-ci ?', type: 'likert', options: [{ v: 0, l: 'Bonne' }, { v: 2, l: 'Basse' }] },
      { id: 'Q2', texte: 'Avez-vous eu des idées de mort ?', type: 'likert', options: [{ v: 0, l: 'Jamais' }, { v: 2, l: 'Souvent' }] },
    ],
  }],
};

describe.skipIf(!ACTIF)('D-515 §4 — la désignation copiée, sur base réelle', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let copieDesignationSuicide: typeof import('@/lib/securite/declarationSuicideCabinet').copieDesignationSuicide;
  let joindreDesignationsCabinet: typeof import('./designationsCabinetPrisma').joindreDesignationsCabinet;
  let reponsesSecuriteDeclarees: typeof import('./safetyFindings').reponsesSecuriteDeclarees;
  let observateur: pg.Client;

  beforeAll(async () => {
    vi.stubEnv('WN_ENABLE_DECLARATION_SUICIDE_CAB', 'true');
    observateur = new pg.Client({ connectionString: URL_BASE });
    await observateur.connect();
    ({ prisma } = await import('@/lib/prisma'));
    ({ copieDesignationSuicide } = await import('@/lib/securite/declarationSuicideCabinet'));
    ({ joindreDesignationsCabinet } = await import('./designationsCabinetPrisma'));
    ({ reponsesSecuriteDeclarees } = await import('./safetyFindings'));
    await observateur.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, date_naissance, updated_at)
       VALUES ($1, $2, $3, 'Michel', 'Dogné', $4, '1980-03-04', CURRENT_TIMESTAMP)`,
      [`pat_banc_dsc_${RUN.toLowerCase()}`, ID_PATIENT, EMAIL_PATIENT, PRATICIEN],
    );
    await observateur.query(
      `INSERT INTO cabinet_instruments (id, id_instrument, praticien_email, titre, definition_json, scoring_json,
         statut_relecture, actif, updated_at, pose_question_suicide, question_suicide_id, question_suicide_option_non)
       VALUES ($1, $2, $3, 'Humeur du cabinet', $4::jsonb, '{"type":"sum","interpretation":[]}'::jsonb,
         'valide', true, CURRENT_TIMESTAMP, true, 'Q2', 0)`,
      [`cab_banc_dsc_${RUN.toLowerCase()}`, ID_INSTRUMENT, PRATICIEN, JSON.stringify(DEFINITION)],
    );
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await observateur?.end();
    await prisma?.$disconnect();
  });

  // Une assignation par instrument et par dossier (contrainte d'unicité) :
  // chaque cas prend son propre identifiant — `id_questionnaire` n'a pas de
  // clé étrangère, et l'instrument réel ne sert qu'à lire la désignation.
  async function assignation(idAssignation: string, idQuestionnaire: string, colonnes: Record<string, unknown>) {
    return prisma.assignation.create({
      data: {
        idAssignation,
        idPatient: ID_PATIENT,
        emailPatient: EMAIL_PATIENT,
        idQuestionnaire,
        titre: 'Humeur du cabinet',
        poseQuestionSuicide: true,
        ...colonnes,
      },
    });
  }

  async function passation(idReponse: string, idAssignation: string, idQuestionnaire: string, rawAnswers: Record<string, number>) {
    await prisma.questionnaireReponse.create({
      data: {
        idReponse,
        idPatient: ID_PATIENT,
        emailPatient: EMAIL_PATIENT,
        idAssignation,
        idQuestionnaire,
        titre: 'Humeur du cabinet',
        scoresJson: { total: 4, rawAnswers },
      },
    });
  }

  it('de l’envoi à SAF-QUEST-02 : objet lu, copie écrite et acceptée, relue telle quelle', async () => {
    // 1. Les colonnes que lit l'envoi (sans le verrou, hors transaction).
    const [ligne] = await prisma.$queryRaw<{
      titre: string;
      definition_json: unknown;
      question_suicide_id: string | null;
      question_suicide_option_non: number | null;
    }[]>`SELECT titre, definition_json, question_suicide_id, question_suicide_option_non
           FROM cabinet_instruments WHERE id_instrument = ${ID_INSTRUMENT}`;
    expect(typeof ligne.definition_json).toBe('object');
    const designation = copieDesignationSuicide({
      titre: ligne.titre,
      definitionJson: ligne.definition_json,
      questionSuicideId: ligne.question_suicide_id,
      questionSuicideOptionNon: ligne.question_suicide_option_non,
    });
    expect(designation).not.toBeNull();

    // 2. Écrite comme l'envoi l'écrit : la copie entière, puis une désignation absente.
    const avec = `ASS_BANC_DSC_${RUN}_1`;
    const sans = `ASS_BANC_DSC_${RUN}_2`;
    await assignation(avec, ID_INSTRUMENT, { ...designation });
    await assignation(sans, `${ID_INSTRUMENT}_B`, {});

    // Une demi-copie est refusée par la base, pas seulement par le code.
    await expect(observateur.query(
      `INSERT INTO assignations (id, id_assignation, id_patient, email_patient, id_questionnaire, titre, updated_at,
         pose_question_suicide, question_suicide_id, question_suicide_option_non)
       VALUES ($1, $2, $3, $4, $5, 'Humeur du cabinet', CURRENT_TIMESTAMP, true, 'Q2', 0)`,
      [`ass_banc_dsc_${RUN.toLowerCase()}_3`, `ASS_BANC_DSC_${RUN}_3`, ID_PATIENT, EMAIL_PATIENT, `${ID_INSTRUMENT}_C`],
    )).rejects.toThrow(/assignations_designation_suicide_coherente/);

    // 3. Relue par la jointure et le producteur.
    await passation(`REP_BANC_DSC_${RUN}_1`, avec, ID_INSTRUMENT, { Q1: 2, Q2: 2 });
    await passation(`REP_BANC_DSC_${RUN}_2`, sans, `${ID_INSTRUMENT}_B`, { Q1: 2, Q2: 2 });
    const rows = await prisma.questionnaireReponse.findMany({
      where: { idPatient: ID_PATIENT },
      select: { idReponse: true, idQuestionnaire: true, dateReponse: true, scoresJson: true, statutValidite: true, idAssignation: true },
      orderBy: { idReponse: 'asc' },
    });
    const reponses = reponsesSecuriteDeclarees(await joindreDesignationsCabinet(rows));
    expect(reponses.map(reponse => [reponse.idReponse, reponse.lecture, reponse.cabinet, reponse.instrument])).toEqual([
      [`REP_BANC_DSC_${RUN}_1`, { kind: 'option', v: 2, libelle: 'Souvent', non: false },
        { enonce: 'Avez-vous eu des idées de mort ?' }, 'Humeur du cabinet'],
      [`REP_BANC_DSC_${RUN}_2`, { kind: 'designation_inconnue' }, { enonce: null }, 'Humeur du cabinet'],
    ]);
  });
});
