import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Banc de la route du portail ([[D-335]] §2-§6, BP-13) : l'ordre drapeau →
// session → dossier ouvert → garde d'âge → cadence → corps ; le dossier vient
// de la SESSION ; le patient ne pose que deux critères et ne retire que ses
// lignes ; aucune donnée du dossier dans l'interrupteur ni dans les journaux.

const { prisma, auth } = vi.hoisted(() => ({
  prisma: {
    donneePhysiologique: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    traitementEnCours: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/trust/portailAuth', () => ({ authentifierPatientPortail: auth }));
vi.mock('@/lib/dateParis', () => ({ dateJourParis: () => '2026-10-21' }));

import { GET, POST } from './route';

const PATIENT = {
  idPatient: 'PAT_SOPHIE',
  actif: true,
  suiviClotureLe: null as Date | null,
  dateNaissance: '1990-04-02' as string | null,
};

const requete = (body: unknown) =>
  new Request('http://localhost/api/portail/physio-traitements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const avant = process.env.WN_PHYSIO_TRAITEMENTS;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_PHYSIO_TRAITEMENTS = 'true';
  auth.mockResolvedValue({ patient: { ...PATIENT } });
  prisma.donneePhysiologique.findMany.mockResolvedValue([]);
  prisma.traitementEnCours.findMany.mockResolvedValue([]);
  prisma.donneePhysiologique.count.mockResolvedValue(0);
  prisma.traitementEnCours.count.mockResolvedValue(0);
  prisma.donneePhysiologique.create.mockResolvedValue({ id: 'nouvelle' });
  prisma.traitementEnCours.create.mockResolvedValue({ id: 'nouveau' });
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
});

afterEach(() => {
  if (avant === undefined) delete process.env.WN_PHYSIO_TRAITEMENTS;
  else process.env.WN_PHYSIO_TRAITEMENTS = avant;
});

const SEXE = { objet: 'physio', acte: 'pose', critere: 'sexe_declare', reponse: 'inconnu' };

describe('drapeau, session, interrupteur', () => {
  it('drapeau éteint : 503 avant la session', async () => {
    delete process.env.WN_PHYSIO_TRAITEMENTS;
    expect((await GET(new Request('http://localhost/api/portail/physio-traitements?interrupteur=1'))).status).toBe(503);
    expect((await POST(requete(SEXE))).status).toBe(503);
    expect(auth).not.toHaveBeenCalled();
  });

  it('l’interrupteur ne rend que « ouvert », sans lire le dossier', async () => {
    const corps = await (await GET(new Request('http://localhost/api/portail/physio-traitements?interrupteur=1'))).json();
    expect(corps).toEqual({ ok: true, ouvert: true });
    expect(prisma.donneePhysiologique.findMany).not.toHaveBeenCalled();
  });

  it('le GET rend ses lignes sans l’e-mail du praticien', async () => {
    prisma.traitementEnCours.findMany.mockResolvedValue([{
      id: 't1', ordre: BigInt(1), idPatient: PATIENT.idPatient, acte: 'pose', nature: 'complement', nom: 'Complément B',
      dose: null, moment: null, motif: null, debut: null, debutPrecision: 'inconnu', fin: null, finPrecision: null,
      prescritParTiers: 'non', source: 'praticien', idLigneRemplacee: null, praticienEmail: 'praticien@wellneuro.fr',
      acteLe: new Date('2026-10-20T09:00:00.000Z'),
    }]);
    const reponse = await GET(new Request('http://localhost/api/portail/physio-traitements'));
    const texte = await reponse.text();
    expect(reponse.status).toBe(200);
    expect(texte).not.toContain('praticien@wellneuro.fr');
    const corps = JSON.parse(texte);
    expect(corps.saisieOuverte).toBe(true);
    expect(corps.donnees.criteres.map((c: { critere: string }) => c.critere)).toEqual(['sexe_declare', 'statut_menstruel']);
    expect(corps.donnees.traitements[0].source).toBe('praticien');
  });
});

describe('POST — gardes et main du patient', () => {
  it('pose sans e-mail, dossier pris à la session', async () => {
    const reponse = await POST(requete({ ...SEXE, idPatient: 'AUTRE_DOSSIER' }));
    expect(reponse.status).toBe(201);
    expect(prisma.donneePhysiologique.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ idPatient: PATIENT.idPatient, source: 'patient', praticienEmail: null, reponse: 'inconnu' }),
    }));
  });

  it('garde d’âge : date manquante ou mineur, rien n’est écrit', async () => {
    for (const dateNaissance of [null, '2014-01-01']) {
      auth.mockResolvedValue({ patient: { ...PATIENT, dateNaissance } });
      expect((await POST(requete(SEXE))).status).toBe(409);
    }
    expect(prisma.donneePhysiologique.create).not.toHaveBeenCalled();
  });

  it('dossier clos : 409', async () => {
    auth.mockResolvedValue({ patient: { ...PATIENT, suiviClotureLe: new Date('2026-10-01') } });
    expect((await POST(requete(SEXE))).status).toBe(409);
  });

  it('cadence atteinte : 429 avant le corps', async () => {
    prisma.donneePhysiologique.count.mockResolvedValue(10_000);
    expect((await POST(requete(SEXE))).status).toBe(429);
    expect(prisma.donneePhysiologique.create).not.toHaveBeenCalled();
  });

  it('le patient ne pose ni grossesse, ni allaitement, ni mesure', async () => {
    const reponse = await POST(requete({ objet: 'physio', acte: 'pose', critere: 'grossesse', reponse: 'oui' }));
    expect((await reponse.json()).reason).toBe('critere_non_ouvert');
  });

  it('le patient ne retire pas une ligne confirmée par le praticien', async () => {
    prisma.traitementEnCours.findMany.mockResolvedValue([
      { id: 't1', ordre: BigInt(1), acte: 'pose', idLigneRemplacee: null, source: 'praticien' },
    ]);
    const reponse = await POST(requete({ objet: 'traitement', acte: 'retrait', remplace: 't1' }));
    expect((await reponse.json()).reason).toBe('retrait_reserve');
    expect(prisma.traitementEnCours.create).not.toHaveBeenCalled();
  });

  it('mais il remplace toute tête : un arrêt sur une ligne du praticien passe', async () => {
    prisma.traitementEnCours.findMany.mockResolvedValue([
      { id: 't1', ordre: BigInt(1), acte: 'pose', idLigneRemplacee: null, source: 'praticien' },
    ]);
    const reponse = await POST(requete({
      objet: 'traitement', acte: 'pose', remplace: 't1', nature: 'complement', nom: 'Complément B',
      debut: 'inconnu', fin: 'inconnu', prescritParTiers: 'non',
    }));
    expect(reponse.status).toBe(201);
  });

  it('une erreur ne journalise jamais le texte déclaré', async () => {
    prisma.traitementEnCours.create.mockRejectedValue(new Error('Invalid data: Complément secret'));
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reponse = await POST(requete({
      objet: 'traitement', acte: 'pose', nature: 'complement', nom: 'Complément secret', debut: '2025', prescritParTiers: 'non',
    }));
    expect(reponse.status).toBe(500);
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('secret');
    erreur.mockRestore();
  });
});
