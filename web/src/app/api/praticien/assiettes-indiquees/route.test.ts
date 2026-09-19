import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, mockCorpus } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    // LE JOURNAL D'ACCÈS AU DOSSIER — c'est lui que le premier groupe de cas
    // surveille. `verifierAppartenancePatient` y écrit, et une route qui
    // consignerait un accès sous un verrou fermé aurait tracé une lecture qui
    // n'a pas eu lieu.
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
  },
  mockCorpus: { claimsValidesAuCorpus: vi.fn() },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/rag/claims/validite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rag/claims/validite')>()),
  claimsValidesAuCorpus: mockCorpus.claimsValidesAuCorpus,
}));

import { cleClaim } from '@/lib/rag/claims/validite';
import { INDICATIONS_ASSIETTES_V1, claimsDeLaLigne } from '@/lib/clinical/indicationsAssiettesV1';
import { GET } from './route';

function requete(query = '?idPatient=PAT_SEED_03') {
  return new Request(`http://test.local/api/praticien/assiettes-indiquees${query}`);
}

function toutesLesCles(): Set<string> {
  return new Set(
    INDICATIONS_ASSIETTES_V1.flatMap(ligne => claimsDeLaLigne(ligne).map(c => cleClaim(c))),
  );
}

describe('GET /api/praticien/assiettes-indiquees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
    prisma.journalAccesDossier.create.mockResolvedValue({});
    prisma.journalAccesDossier.deleteMany.mockResolvedValue({ count: 0 });
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.consultation.findFirst.mockResolvedValue(null);
    mockCorpus.claimsValidesAuCorpus.mockResolvedValue(toutesLesCles());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sans session : 401, et rien n’est lu', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(requete());
    expect(res.status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('idPatient invalide : 400', async () => {
    const res = await GET(requete('?idPatient=PAT%20SEED'));
    expect(res.status).toBe(400);
  });

  it('idPatient absent : 400', async () => {
    const res = await GET(requete(''));
    expect(res.status).toBe(400);
  });

  it('drapeau absent : inactif, ET AUCUN ACCÈS JOURNALISÉ', async () => {
    const payload = await (await GET(requete())).json();
    expect(payload).toMatchObject({ ok: true, actif: false });
    // LE FAIT QUI COMMANDE L'ORDRE DU CORPS DE LA ROUTE. Le verrou est
    // consulté AVANT `verifierAppartenancePatient`, précisément parce que
    // celui-ci écrit au journal d'accès. Inverser les deux tracerait une
    // lecture de dossier qui n'a jamais eu lieu.
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
    expect(mockCorpus.claimsValidesAuCorpus).not.toHaveBeenCalled();
  });

  it('le message du verrou fermé ne nomme AUCUN des deux termes', async () => {
    const payload = await (await GET(requete())).json();
    // Nommer le drapeau ou la signature donnerait au praticien une raison que
    // l'autre terme dément — la faute que [[D-076]] a corrigée sur
    // l'orientation, le jour où la table était signée et le message disait le
    // contraire.
    expect(payload.message).not.toMatch(/WN_ASSIETTES_INDIQUEES/);
    expect(payload.message).not.toMatch(/signée|signature/i);
  });

  it('drapeau posé : la table SIGNÉE ouvre, et le dossier est lu', async () => {
    vi.stubEnv('WN_ASSIETTES_INDIQUEES', 'true');
    const payload = await (await GET(requete())).json();
    expect(payload).toMatchObject({ ok: true, actif: true });
    expect(payload.shaPerimetre).toMatch(/^[0-9a-f]{64}$/);
    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalled();
  });

  it('patient d’un autre praticien : 403, et rien n’est évalué', async () => {
    vi.stubEnv('WN_ASSIETTES_INDIQUEES', 'true');
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(requete());
    expect(res.status).toBe(403);
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('patient introuvable : 404', async () => {
    vi.stubEnv('WN_ASSIETTES_INDIQUEES', 'true');
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await GET(requete());
    expect(res.status).toBe(404);
  });

  it('les deux listes sont VIDES, jamais absentes', async () => {
    vi.stubEnv('WN_ASSIETTES_INDIQUEES', 'true');
    mockCorpus.claimsValidesAuCorpus.mockResolvedValue(new Set<string>());
    const payload = await (await GET(requete())).json();
    // Un tableau absent se lirait « on ne sait pas », là où la réponse dit
    // « rien ». L'écran doit pouvoir afficher son repli sans distinguer les
    // deux (`DC-24`).
    expect(Array.isArray(payload.indiquees)).toBe(true);
    expect(Array.isArray(payload.nonEvaluees)).toBe(true);
    expect(payload.corpusLu).toBe(true);
  });

  it('le compte des lignes RETIRÉES traverse la route — l’énumération est explicite', async () => {
    // LA ROUTE ÉNUMÈRE SES CHAMPS un à un, et c'est voulu : rien du service ne
    // part au navigateur sans avoir été nommé ici. Le prix est qu'un terme neuf
    // peut rester à quai sans que rien ne rougisse — la carte lirait alors
    // `undefined` et se tairait sur ce qu'elle n'a pas regardé. Ce cas tient la
    // jointure.
    vi.stubEnv('WN_ASSIETTES_INDIQUEES', 'true');
    const toutes = toutesLesCles();
    toutes.delete(cleClaim({ claimId: 'WN-CL-0290-005', versionClaim: 'v1.0' }));
    mockCorpus.claimsValidesAuCorpus.mockResolvedValue(toutes);
    const payload = await (await GET(requete())).json();
    expect(payload.retireesFauteDeClaim).toBe(1);
  });

  it('une lecture de dossier qui jette : 500, et aucun détail technique ne sort', async () => {
    vi.stubEnv('WN_ASSIETTES_INDIQUEES', 'true');
    prisma.questionnaireReponse.findMany.mockRejectedValue(new Error('colonne inconnue xyz'));
    const res = await GET(requete());
    expect(res.status).toBe(500);
    const payload = await res.json();
    expect(payload.error).not.toMatch(/xyz/);
  });

  it('aucun POST n’est exporté — cette route ne fait écrire personne', async () => {
    // `module` est un identifiant réservé côté Next (`no-assign-module-variable`) :
    // le nommer autrement n'est pas un détail de style, T1 refuse le premier.
    const exporte = await import('./route');
    expect(Object.keys(exporte)).toEqual(['GET']);
  });
});
