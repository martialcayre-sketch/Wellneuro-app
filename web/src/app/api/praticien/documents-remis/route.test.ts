import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    bookletEnvoi: { findMany: vi.fn() },
    syntheseComprehension: { findMany: vi.fn() },
    ficheAssietteRemise: { findMany: vi.fn() },
    lettreAdressageRemise: { findMany: vi.fn() },
    courrierComplementRemise: { findMany: vi.fn() },
    protocolDiffusionApproval: { findMany: vi.fn() },
    // `count` est moqué EXPRÈS : sans lui, l'assertion « rien n'est compté »
    // ne pourrait pas être écrite.
    portailLecturePatient: { findMany: vi.fn(), count: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, type DocumentsRemisResponse } from './route';

const requete = (query = 'idPatient=PAT_TEST') => new Request(`http://localhost/api/praticien/documents-remis?${query}`);

async function documents(res: Response) {
  const data = (await res.json()) as DocumentsRemisResponse;
  if (!data.ok) throw new Error(`réponse en échec : ${data.reason}`);
  return data.documents;
}

describe('GET /api/praticien/documents-remis (D-297 §5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    prisma.bookletEnvoi.findMany.mockResolvedValue([]);
    prisma.syntheseComprehension.findMany.mockResolvedValue([]);
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([]);
    prisma.lettreAdressageRemise.findMany.mockResolvedValue([]);
    prisma.courrierComplementRemise.findMany.mockResolvedValue([]);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    prisma.portailLecturePatient.findMany.mockResolvedValue([]);
  });

  it('exige une session, sans rien lire ni journaliser', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(requete())).status).toBe(401);
    expect(prisma.portailLecturePatient.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('refuse un identifiant mal formé', async () => {
    expect((await GET(requete('idPatient=a%20b'))).status).toBe(400);
    expect((await GET(requete(''))).status).toBe(400);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('refuse le dossier d’un autre praticien, sans rien lire', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await GET(requete())).status).toBe(403);
    expect(prisma.portailLecturePatient.findMany).not.toHaveBeenCalled();
  });

  it('rend 404 sur un dossier inconnu', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await GET(requete())).status).toBe(404);
  });

  it('journalise la consultation du dossier sous le gabarit de la route', async () => {
    await GET(requete());
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(prisma.journalAccesDossier.create.mock.calls[0][0])).toContain('/api/praticien/documents-remis');
  });

  it('chaque version remise porte sa lecture : datée, non datée, ou aucune', async () => {
    prisma.bookletEnvoi.findMany.mockResolvedValue([
      { id: 'env_lu_date', dateEnvoi: new Date('2026-10-01T08:00:00Z') },
      { id: 'env_lu_ancien', dateEnvoi: new Date('2026-09-01T08:00:00Z') },
      { id: 'env_non_lu', dateEnvoi: new Date('2026-10-10T08:00:00Z') },
    ]);
    prisma.portailLecturePatient.findMany.mockResolvedValue([
      { espece: 'bilan', idObjet: 'env_lu_date', luLe: new Date('2026-10-18T00:00:00Z') },
      { espece: 'bilan', idObjet: 'env_lu_ancien', luLe: null },
    ]);

    const docs = await documents(await GET(requete()));
    expect(docs.map(d => [d.idObjet, d.lu, d.luLe])).toEqual([
      ['env_non_lu', false, null],
      ['env_lu_date', true, '2026-10-18'],
      ['env_lu_ancien', true, null],
    ]);
  });

  it('une lecture ne vaut que pour SA version et SON espèce', async () => {
    prisma.bookletEnvoi.findMany.mockResolvedValue([{ id: 'x1', dateEnvoi: new Date('2026-10-01T08:00:00Z') }]);
    prisma.lettreAdressageRemise.findMany.mockResolvedValue([{ id: 'x1', remiseLe: new Date('2026-10-02T08:00:00Z') }]);
    prisma.portailLecturePatient.findMany.mockResolvedValue([
      { espece: 'lettre_adressage', idObjet: 'x1', luLe: new Date('2026-10-03T00:00:00Z') },
    ]);
    const docs = await documents(await GET(requete()));
    expect(docs.find(d => d.espece === 'bilan')?.lu).toBe(false);
    expect(docs.find(d => d.espece === 'lettre_adressage')).toMatchObject({ lu: true, luLe: '2026-10-03' });
  });

  it('les six espèces sont listées, la plus récente remise en haut', async () => {
    prisma.bookletEnvoi.findMany.mockResolvedValue([{ id: 'env', dateEnvoi: new Date('2026-10-01T08:00:00Z') }]);
    prisma.syntheseComprehension.findMany.mockResolvedValue([{ id: 'syn', publieeLe: new Date('2026-10-02T08:00:00Z') }]);
    prisma.ficheAssietteRemise.findMany.mockResolvedValue([
      { id: 'fic', remiseLe: new Date('2026-10-03T08:00:00Z'), version: { plateCode: 'code_inconnu' } },
    ]);
    prisma.lettreAdressageRemise.findMany.mockResolvedValue([{ id: 'let', remiseLe: new Date('2026-10-04T08:00:00Z') }]);
    prisma.courrierComplementRemise.findMany.mockResolvedValue([{ id: 'ccr', remiseLe: new Date('2026-10-04T12:00:00Z') }]);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([{ id: 'pro', approvedAt: new Date('2026-10-05T08:00:00Z') }]);

    const docs = await documents(await GET(requete()));
    expect(docs.map(d => d.espece)).toEqual([
      'protocole', 'courrier_complement', 'lettre_adressage', 'fiche_assiette', 'synthese', 'bilan',
    ]);
    expect(docs.find(d => d.espece === 'fiche_assiette')?.libelle).toBe('Fiche d’assiette — code_inconnu');
    expect(docs.find(d => d.espece === 'courrier_complement')?.libelle).toBe('Courrier avant un complément ciblé');
    expect(docs[0].remisLe).toBe('2026-10-05T08:00:00.000Z');
  });

  it('J3-12h lot 4 — le courrier complément porte SA lecture, que la lettre d’adressage n’acquitte pas', async () => {
    prisma.courrierComplementRemise.findMany.mockResolvedValue([{ id: 'x2', remiseLe: new Date('2026-10-25T08:00:00Z') }]);
    prisma.portailLecturePatient.findMany.mockResolvedValue([
      { espece: 'lettre_adressage', idObjet: 'x2', luLe: new Date('2026-10-25T00:00:00Z') },
    ]);
    expect((await documents(await GET(requete()))).find(d => d.espece === 'courrier_complement')?.lu).toBe(false);
    prisma.portailLecturePatient.findMany.mockResolvedValue([
      { espece: 'courrier_complement', idObjet: 'x2', luLe: new Date('2026-10-25T00:00:00Z') },
    ]);
    expect((await documents(await GET(requete()))).find(d => d.espece === 'courrier_complement'))
      .toMatchObject({ lu: true, luLe: '2026-10-25' });
  });

  it('ne lit que les versions REMISES : bilan envoyé (même rejeté depuis), synthèse publiée', async () => {
    await GET(requete());
    // Pas de filtre sur le statut de la synthèse : un bilan rejeté APRÈS son
    // envoi a été remis, et sa lecture éventuelle reste à dire.
    expect(prisma.bookletEnvoi.findMany.mock.calls[0][0].where).toEqual({
      idPatient: 'PAT_TEST',
      statut: 'Envoye',
      synthese: { is: { idPatient: 'PAT_TEST' } },
    });
    expect(prisma.syntheseComprehension.findMany.mock.calls[0][0].where).toEqual({
      idPatient: 'PAT_TEST',
      publieeLe: { not: null },
    });
  });

  it('lit la table des lectures sur trois colonnes, sans rien compter (D-297 §5)', async () => {
    await GET(requete());
    expect(prisma.portailLecturePatient.findMany).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_TEST' },
      select: { espece: true, idObjet: true, luLe: true },
    });
    expect(prisma.portailLecturePatient.count).not.toHaveBeenCalled();
  });

  it('la réponse ne porte que la liste, et chaque document ses six champs — aucun compte, aucun agrégat', async () => {
    prisma.bookletEnvoi.findMany.mockResolvedValue([{ id: 'env', dateEnvoi: new Date('2026-10-01T08:00:00Z') }]);
    const data = (await (await GET(requete())).json()) as Record<string, unknown>;
    expect(Object.keys(data).sort()).toEqual(['documents', 'ok']);
    const [premier] = data.documents as Record<string, unknown>[];
    expect(Object.keys(premier).sort()).toEqual(['espece', 'idObjet', 'libelle', 'lu', 'luLe', 'remisLe']);
  });

  it('une panne se rend 500, jamais comme une liste vide', async () => {
    prisma.portailLecturePatient.findMany.mockRejectedValue(new Error('panne'));
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(requete());
    expect(res.status).toBe(500);
    expect(erreur).toHaveBeenCalledWith('[praticien/documents-remis GET]', 'Error');
    erreur.mockRestore();
  });
});
