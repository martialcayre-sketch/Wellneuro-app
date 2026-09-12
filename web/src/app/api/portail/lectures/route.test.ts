import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Bancs en style « SIGNATURE RÉELLE » : on ne mocke QUE Prisma, et on forge un
// vrai cookie avec `signPatientSession`. Neutraliser l'authentification par un
// mock de `patient-session` reviendrait à ne pas la prouver.
//
// CE QUE CE FICHIER DÉFEND AVANT TOUT LE RESTE : le POST ne croit pas le
// navigateur (`D-164`). Un identifiant d'un autre dossier, d'une version
// dépassée ou d'une surface fermée n'écrit RIEN — sans quoi un patient pourrait
// faire disparaître de son fil un document qu'il n'a jamais ouvert.
const { prisma } = vi.hoisted(() => {
  const ECRITURES = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];
  const table = (...lectures: string[]) =>
    Object.fromEntries([...lectures, ...ECRITURES].map(nom => [nom, vi.fn()]));
  return {
    prisma: {
      patient: table('findUnique'),
      bookletEnvoi: table('findFirst', 'findMany'),
      syntheseComprehension: table('findMany'),
      portailLecturePatient: table('findMany'),
    } as Record<string, Record<string, ReturnType<typeof vi.fn>>>,
  };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET, POST } from './route';

const PATIENT = { idPatient: 'PAT_TEST', email: 'sophie.nicola@example.test' };
const ENVOI = { id: 'env_1', dateEnvoi: new Date('2026-09-01T10:00:00.000Z') };
const SYNTHESE = {
  id: 'syn_1',
  publieeLe: new Date('2026-09-02T10:00:00.000Z'),
  creeLe: new Date('2026-09-02T09:00:00.000Z'),
  supersedesSyntheseId: null,
};

function cookieProprio(): string {
  return signPatientSession({ idPatient: PATIENT.idPatient, email: PATIENT.email });
}

function mockCompteActif(surcharges: Record<string, unknown> = {}): void {
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: PATIENT.idPatient,
    actif: true,
    accessTokenRevoked: false,
    email: PATIENT.email,
    sessionsInvalidesAvant: null,
    createdAt: new Date('2026-06-01T08:00:00.000Z'),
    ...surcharges,
  });
}

function requete(cookie?: string, corps?: unknown): Request {
  return new Request('http://localhost/api/portail/lectures', {
    method: corps === undefined ? 'GET' : 'POST',
    headers: {
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
      ...(corps === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(corps === undefined ? {} : { body: typeof corps === 'string' ? corps : JSON.stringify(corps) }),
  });
}

const corpsDe = async (r: Response) => (await r.json()) as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  process.env.WN_COMPREHENSION = 'true';
  mockCompteActif();
  prisma.bookletEnvoi.findFirst.mockResolvedValue(ENVOI);
  prisma.syntheseComprehension.findMany.mockResolvedValue([SYNTHESE]);
  prisma.portailLecturePatient.findMany.mockResolvedValue([]);
  prisma.portailLecturePatient.create.mockResolvedValue({});
});

afterEach(() => {
  delete process.env.WN_COMPREHENSION;
});

describe('la porte', () => {
  it.each([
    ['GET', () => GET(requete())],
    ['POST', () => POST(requete(undefined, { espece: 'bilan', idObjet: 'env_1' }))],
  ])('%s sans cookie : 401, et rien n’est lu', async (_verbe, appeler) => {
    expect((await appeler()).status).toBe(401);
    expect(prisma.bookletEnvoi.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    ['compte désactivé', { actif: false }],
    ['jeton révoqué', { accessTokenRevoked: true }],
  ])('%s : 403 et non 401 — sinon le client boucle sur le gate', async (_cas, surcharge) => {
    mockCompteActif(surcharge);
    expect((await GET(requete(cookieProprio()))).status).toBe(403);
  });
});

describe('GET — ce qui est attendu', () => {
  it('sert le bilan et la synthèse courants, du plus ancien au plus récent', async () => {
    const corps = await corpsDe(await GET(requete(cookieProprio())));
    expect(corps.ok).toBe(true);
    expect(corps.lectures).toEqual([
      { espece: 'bilan', idObjet: 'env_1', remiseLe: '2026-09-01T10:00:00.000Z' },
      { espece: 'synthese', idObjet: 'syn_1', remiseLe: '2026-09-02T10:00:00.000Z' },
    ]);
  });

  it('ne transporte AUCUN contenu — ni texte de bilan, ni texte de synthèse', async () => {
    // Un fil du jour n'a pas besoin de lire ce qu'il annonce. Le `select` de la
    // route est la garde ; ce banc vérifie qu'elle n'a pas été élargie.
    await GET(requete(cookieProprio()));
    const selectEnvoi = prisma.bookletEnvoi.findFirst.mock.calls[0][0].select;
    expect(Object.keys(selectEnvoi).sort()).toEqual(['dateEnvoi', 'id']);
    const selectSynthese = prisma.syntheseComprehension.findMany.mock.calls[0][0].select;
    expect(Object.keys(selectSynthese)).not.toContain('texte');
  });

  it('une lecture déjà consignée n’est plus attendue', async () => {
    prisma.portailLecturePatient.findMany.mockResolvedValue([
      { espece: 'bilan', idObjet: 'env_1' },
    ]);
    const corps = await corpsDe(await GET(requete(cookieProprio())));
    expect(corps.lectures).toEqual([
      { espece: 'synthese', idObjet: 'syn_1', remiseLe: '2026-09-02T10:00:00.000Z' },
    ]);
  });

  it('une synthèse PUBLIÉE PUIS RÉVISÉE : seule la tête publiée est attendue', async () => {
    // Annoncer la version dépassée mènerait à un écran qui montre l'autre.
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      SYNTHESE,
      { ...SYNTHESE, id: 'syn_2', publieeLe: new Date('2026-09-06T10:00:00.000Z'), creeLe: new Date('2026-09-06T09:00:00.000Z'), supersedesSyntheseId: 'syn_1' },
    ]);
    const corps = await corpsDe(await GET(requete(cookieProprio())));
    expect((corps.lectures as { idObjet: string }[]).map(l => l.idObjet)).toEqual(['env_1', 'syn_2']);
  });

  it('une synthèse NON publiée n’est pas une lecture', async () => {
    prisma.syntheseComprehension.findMany.mockResolvedValue([{ ...SYNTHESE, publieeLe: null }]);
    const corps = await corpsDe(await GET(requete(cookieProprio())));
    expect((corps.lectures as { espece: string }[]).map(l => l.espece)).toEqual(['bilan']);
  });

  it('aucun document remis : aucune lecture, et ce n’est pas une erreur', async () => {
    prisma.bookletEnvoi.findFirst.mockResolvedValue(null);
    prisma.syntheseComprehension.findMany.mockResolvedValue([]);
    const corps = await corpsDe(await GET(requete(cookieProprio())));
    expect(corps).toEqual({ ok: true, lectures: [] });
  });
});

describe('LE DRAPEAU D’UNE SURFACE NE SE LÈVE PAS ICI', () => {
  it('`WN_COMPREHENSION` éteint : aucune synthèse, et la table n’est même pas lue', async () => {
    // C'est l'invariant. Le fil ne peut pas devenir la porte dérobée par
    // laquelle un texte du praticien atteint un patient dont l'écran est clos.
    delete process.env.WN_COMPREHENSION;
    const corps = await corpsDe(await GET(requete(cookieProprio())));
    expect((corps.lectures as { espece: string }[]).map(l => l.espece)).toEqual(['bilan']);
    expect(prisma.syntheseComprehension.findMany).not.toHaveBeenCalled();
  });

  it('`WN_COMPREHENSION` éteint : consigner une synthèse est REFUSÉ, et n’écrit rien', async () => {
    delete process.env.WN_COMPREHENSION;
    const reponse = await POST(requete(cookieProprio(), { espece: 'synthese', idObjet: 'syn_1' }));
    expect(reponse.status).toBe(404);
    expect(prisma.portailLecturePatient.create).not.toHaveBeenCalled();
  });

  it('le bilan, lui, n’a jamais eu de drapeau et reste servi', async () => {
    delete process.env.WN_COMPREHENSION;
    const reponse = await POST(requete(cookieProprio(), { espece: 'bilan', idObjet: 'env_1' }));
    expect(reponse.status).toBe(200);
  });
});

describe('POST — le serveur vérifie, il ne croit pas le navigateur', () => {
  it('consigne le document SERVI, et le triplet est complet', async () => {
    const reponse = await POST(requete(cookieProprio(), { espece: 'bilan', idObjet: 'env_1' }));
    expect(reponse.status).toBe(200);
    expect(prisma.portailLecturePatient.create).toHaveBeenCalledWith({
      data: { idPatient: PATIENT.idPatient, espece: 'bilan', idObjet: 'env_1' },
    });
  });

  it('un identifiant INCONNU est refusé en 404, et n’écrit rien', async () => {
    const reponse = await POST(requete(cookieProprio(), { espece: 'bilan', idObjet: 'env_dautrui' }));
    expect(reponse.status).toBe(404);
    expect(prisma.portailLecturePatient.create).not.toHaveBeenCalled();
  });

  it('une VERSION DÉPASSÉE est refusée — acquitter l’ancienne effacerait la neuve', async () => {
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      SYNTHESE,
      { ...SYNTHESE, id: 'syn_2', publieeLe: new Date('2026-09-06T10:00:00.000Z'), creeLe: new Date('2026-09-06T09:00:00.000Z'), supersedesSyntheseId: 'syn_1' },
    ]);
    const reponse = await POST(requete(cookieProprio(), { espece: 'synthese', idObjet: 'syn_1' }));
    expect(reponse.status).toBe(404);
    expect(prisma.portailLecturePatient.create).not.toHaveBeenCalled();
  });

  it('l’espèce NE SERT PAS de laissez-passer : un identifiant de bilan posté en « synthese » est refusé', async () => {
    const reponse = await POST(requete(cookieProprio(), { espece: 'synthese', idObjet: 'env_1' }));
    expect(reponse.status).toBe(404);
    expect(prisma.portailLecturePatient.create).not.toHaveBeenCalled();
  });

  it.each([
    ['espèce hors liste', { espece: 'connexion', idObjet: 'x' }],
    ['espèce absente', { idObjet: 'env_1' }],
    ['identifiant absent', { espece: 'bilan' }],
    ['identifiant vide', { espece: 'bilan', idObjet: '   ' }],
    ['identifiant non textuel', { espece: 'bilan', idObjet: 42 }],
  ])('%s : 400, et rien n’est écrit', async (_cas, corps) => {
    const reponse = await POST(requete(cookieProprio(), corps));
    expect(reponse.status).toBe(400);
    expect(prisma.portailLecturePatient.create).not.toHaveBeenCalled();
  });

  it('un corps illisible est refusé en 400 avant toute lecture de dossier', async () => {
    const reponse = await POST(requete(cookieProprio(), 'pas du json'));
    expect(reponse.status).toBe(400);
    expect(prisma.bookletEnvoi.findFirst).not.toHaveBeenCalled();
  });

  it('REJOUER une lecture ne change rien : le doublon se lit « déjà consigné »', async () => {
    // Une lecture est un INSTANT, pas un état qu'on bascule. La clé primaire
    // porte le triplet ; `P2002` est le résultat, pas une panne.
    prisma.portailLecturePatient.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    const reponse = await POST(requete(cookieProprio(), { espece: 'bilan', idObjet: 'env_1' }));
    expect(reponse.status).toBe(200);
    expect(await corpsDe(reponse)).toEqual({ ok: true, consignee: true });
  });

  it('une VRAIE panne d’écriture reste une panne — 500, jamais un faux succès', async () => {
    prisma.portailLecturePatient.create.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'P1001' }));
    expect((await POST(requete(cookieProprio(), { espece: 'bilan', idObjet: 'env_1' }))).status).toBe(500);
  });
});

describe('le GET n’écrit RIEN', () => {
  it('aucun verbe d’écriture n’est appelé sur aucune table', async () => {
    await GET(requete(cookieProprio()));
    const verbes = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];
    const appeles: string[] = [];
    for (const [nomTable, table] of Object.entries(prisma)) {
      for (const verbe of verbes) {
        if (table[verbe]?.mock.calls.length) appeles.push(`${nomTable}.${verbe}`);
      }
    }
    expect(appeles).toEqual([]);
  });
});
