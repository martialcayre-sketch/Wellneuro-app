import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Banc de la route du cockpit ([[D-335]], BP-13). La base refuse ce que la
// route refuse (contrat `donnees_physiologiques_traitements_v1_negatif.sql`,
// banc à deux sessions) ; ce banc-ci éprouve que la route le DIT, nommé,
// n'écrit rien quand elle refuse, garde l'ordre drapeau → session →
// appartenance, et montre la discordance avec l'anamnèse sans la résoudre.
// Traitements synthétiques.

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findFirst: vi.fn() },
    donneePhysiologique: { findMany: vi.fn(), create: vi.fn() },
    traitementEnCours: { findMany: vi.fn(), create: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/dateParis', () => ({ dateJourParis: () => '2026-10-21' }));

import { GET, POST } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';
const DOSSIER = {
  praticienEmail: PRATICIEN,
  actif: true,
  suiviClotureLe: null as Date | null,
  dateNaissance: '1985-03-12' as string | null,
};

const requete = (body: unknown) =>
  new Request('http://localhost/api/praticien/physio-traitements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const lecture = () => GET(new Request('http://localhost/api/praticien/physio-traitements?idPatient=PAT1'));

const lignePhysio = (surcharge: Record<string, unknown>) => ({
  id: 'p1',
  ordre: BigInt(1),
  idPatient: 'PAT1',
  acte: 'pose',
  critere: 'grossesse',
  reponse: 'oui',
  mesure: null,
  mesureLe: null,
  source: 'praticien',
  idLigneRemplacee: null,
  praticienEmail: PRATICIEN,
  acteLe: new Date('2026-10-20T09:00:00.000Z'),
  ...surcharge,
});

const ligneTraitement = (surcharge: Record<string, unknown>) => ({
  id: 't1',
  ordre: BigInt(1),
  idPatient: 'PAT1',
  acte: 'pose',
  nature: 'medicament',
  nom: 'Traitement A',
  dose: null,
  moment: null,
  motif: null,
  debut: new Date('2024-05-01T00:00:00.000Z'),
  debutPrecision: 'mois',
  fin: null,
  finPrecision: null,
  prescritParTiers: 'inconnu',
  source: 'patient',
  idLigneRemplacee: null,
  praticienEmail: null,
  acteLe: new Date('2026-10-19T09:00:00.000Z'),
  ...surcharge,
});

const avant = process.env.WN_PHYSIO_TRAITEMENTS;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_PHYSIO_TRAITEMENTS = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({ ...DOSSIER });
  prisma.consultation.findFirst.mockResolvedValue(null);
  prisma.donneePhysiologique.findMany.mockResolvedValue([]);
  prisma.traitementEnCours.findMany.mockResolvedValue([]);
  prisma.donneePhysiologique.create.mockResolvedValue({ id: 'nouvelle' });
  prisma.traitementEnCours.create.mockResolvedValue({ id: 'nouveau' });
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
});

afterEach(() => {
  if (avant === undefined) delete process.env.WN_PHYSIO_TRAITEMENTS;
  else process.env.WN_PHYSIO_TRAITEMENTS = avant;
});

describe('drapeau et gardes', () => {
  it('drapeau éteint : 503 avant la session, rien n’est lu', async () => {
    delete process.env.WN_PHYSIO_TRAITEMENTS;
    expect((await lecture()).status).toBe(503);
    expect((await POST(requete({ idPatient: 'PAT1', objet: 'physio' }))).status).toBe(503);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('sans session : 401 ; autre praticien : 403, rien d’écrit', async () => {
    getServerSession.mockResolvedValueOnce(null);
    expect((await lecture()).status).toBe(401);
    prisma.patient.findUnique.mockResolvedValue({ ...DOSSIER, praticienEmail: 'autre@wellneuro.fr' });
    expect((await POST(requete({ idPatient: 'PAT1', objet: 'physio', acte: 'pose', critere: 'grossesse', reponse: 'oui' }))).status).toBe(403);
    expect(prisma.donneePhysiologique.create).not.toHaveBeenCalled();
  });

  it('le GET journalise l’accès au dossier', async () => {
    expect((await lecture()).status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
  });

  it('un dossier mineur est refusé à l’écriture (D-335 §6)', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...DOSSIER, dateNaissance: '2015-01-01' });
    const reponse = await POST(requete({ idPatient: 'PAT1', objet: 'physio', acte: 'pose', critere: 'grossesse', reponse: 'non' }));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('dossier_mineur');
    expect(prisma.donneePhysiologique.create).not.toHaveBeenCalled();
  });

  it('un dossier clos ne reçoit plus de ligne', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...DOSSIER, suiviClotureLe: new Date('2026-10-01') });
    expect((await POST(requete({ idPatient: 'PAT1', objet: 'physio', acte: 'pose', critere: 'grossesse', reponse: 'non' }))).status).toBe(409);
    expect(prisma.donneePhysiologique.create).not.toHaveBeenCalled();
  });

  it('une clôture posée entre la lecture de la route et la transaction : refusée sous le verrou', async () => {
    prisma.patient.findUnique
      .mockResolvedValueOnce({ ...DOSSIER }) // appartenance
      .mockResolvedValueOnce({ ...DOSSIER }) // la route, avant la transaction
      .mockResolvedValue({ ...DOSSIER, suiviClotureLe: new Date('2026-10-21') }); // sous le verrou
    for (const corps of [
      { idPatient: 'PAT1', objet: 'physio', acte: 'pose', critere: 'grossesse', reponse: 'non' },
      { idPatient: 'PAT1', objet: 'traitement', acte: 'pose', nature: 'medicament', nom: 'Traitement A', debut: '2024-05', prescritParTiers: 'non' },
    ]) {
      const reponse = await POST(requete(corps));
      expect(reponse.status).toBe(409);
      const lu = await reponse.json();
      expect(lu.reason).toBe('dossier_cloture');
      expect(lu.error).toMatch(/clôturé/);
    }
    expect(prisma.donneePhysiologique.create).not.toHaveBeenCalled();
    expect(prisma.traitementEnCours.create).not.toHaveBeenCalled();
  });
});

describe('GET — lignes, anamnèse, discordance', () => {
  it('« non renseigné » sans ligne ; la discordance « oui » contre « non » se montre', async () => {
    prisma.consultation.findFirst.mockResolvedValue({
      anamnese: { etat_grossesse: 'Non', taille: '170' },
      dateValidation: new Date('2026-09-01T10:00:00.000Z'),
    });
    prisma.donneePhysiologique.findMany.mockResolvedValue([lignePhysio({})]);
    const corps = await (await lecture()).json();
    expect(corps.anamneseDu).toBe('2026-09-01T10:00:00.000Z');
    const parCritere = Object.fromEntries(corps.criteres.map((c: { critere: string }) => [c.critere, c]));
    expect(parCritere.grossesse.tete.reponse).toBe('oui');
    expect(parCritere.grossesse.anamnese).toEqual({ valeur: 'Non' });
    expect(parCritere.grossesse.discordant).toBe(true);
    expect(parCritere.taille.tete).toBeNull();
    expect(parCritere.taille.anamnese).toEqual({ valeur: '170' });
    expect(parCritere.taille.discordant).toBe(false);
    expect(parCritere.sexe_declare.anamnese).toBeNull();
  });

  it('un traitement se lit en fil : tête et historique', async () => {
    prisma.traitementEnCours.findMany.mockResolvedValue([
      ligneTraitement({}),
      ligneTraitement({ id: 't2', ordre: BigInt(2), idLigneRemplacee: 't1', source: 'praticien', praticienEmail: PRATICIEN }),
    ]);
    const corps = await (await lecture()).json();
    expect(corps.traitements).toHaveLength(1);
    expect(corps.traitements[0].tete.id).toBe('t2');
    expect(corps.traitements[0].historique.map((l: { id: string }) => l.id)).toEqual(['t1', 't2']);
  });
});

describe('POST — la base fait foi, la route le dit avant', () => {
  it('pose une ligne du praticien, sous les verrous du trigger', async () => {
    const reponse = await POST(requete({ idPatient: 'PAT1', objet: 'physio', acte: 'pose', critere: 'grossesse', reponse: 'inconnu' }));
    expect(reponse.status).toBe(201);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    expect(prisma.donneePhysiologique.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ critere: 'grossesse', reponse: 'inconnu', source: 'praticien', praticienEmail: PRATICIEN, idLigneRemplacee: null }),
    }));
  });

  it('une pose qui ne désigne pas la tête lue est refusée : tete_changee', async () => {
    prisma.donneePhysiologique.findMany.mockResolvedValue([lignePhysio({})]);
    const reponse = await POST(requete({ idPatient: 'PAT1', objet: 'physio', acte: 'pose', critere: 'grossesse', reponse: 'non' }));
    expect((await reponse.json()).reason).toBe('tete_changee');
    expect(prisma.donneePhysiologique.create).not.toHaveBeenCalled();
  });

  it('le statut menstruel exige un sexe déclaré féminin ou autre en vigueur', async () => {
    prisma.donneePhysiologique.findMany.mockImplementation(async (arg: { where: { critere: string } }) =>
      (arg.where.critere === 'sexe_declare' ? [lignePhysio({ id: 's1', critere: 'sexe_declare', reponse: 'masculin' })] : []));
    const reponse = await POST(requete({ idPatient: 'PAT1', objet: 'physio', acte: 'pose', critere: 'statut_menstruel', reponse: 'menopause' }));
    expect((await reponse.json()).reason).toBe('statut_sans_sexe');
    expect(prisma.donneePhysiologique.create).not.toHaveBeenCalled();
    // Verrous dans l'ordre fixe : le dossier, le sexe déclaré, puis le statut.
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
  });

  it('arrêter un traitement : remplacement de la tête portant une fin', async () => {
    prisma.traitementEnCours.findMany.mockResolvedValue([ligneTraitement({})]);
    const reponse = await POST(requete({
      idPatient: 'PAT1', objet: 'traitement', acte: 'pose', remplace: 't1',
      nature: 'medicament', nom: 'Traitement A', debut: '2024-05', fin: '2026-10', prescritParTiers: 'non',
    }));
    expect(reponse.status).toBe(201);
    expect(prisma.traitementEnCours.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ idLigneRemplacee: 't1', finPrecision: 'mois', debutPrecision: 'mois', source: 'praticien' }),
    }));
  });

  it('remplacer une ligne déjà remplacée : tete_changee ; inconnue : ligne_inconnue', async () => {
    prisma.traitementEnCours.findMany.mockResolvedValue([
      ligneTraitement({}),
      ligneTraitement({ id: 't2', ordre: BigInt(2), idLigneRemplacee: 't1' }),
    ]);
    const corps = { idPatient: 'PAT1', objet: 'traitement', acte: 'retrait', remplace: 't1' };
    expect((await (await POST(requete(corps))).json()).reason).toBe('tete_changee');
    prisma.traitementEnCours.findMany.mockResolvedValue([]);
    expect((await (await POST(requete(corps))).json()).reason).toBe('ligne_inconnue');
    expect(prisma.traitementEnCours.create).not.toHaveBeenCalled();
  });

  it('un refus de la base se reconnaît à son code, jamais à son message', async () => {
    prisma.donneePhysiologique.create.mockRejectedValue(
      Object.assign(new Error('pose refusée : PAT1'), { code: 'P2039', meta: { driverAdapterError: { cause: { code: 'P0001' } } } }),
    );
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reponse = await POST(requete({ idPatient: 'PAT1', objet: 'physio', acte: 'pose', critere: 'allaitement', reponse: 'non' }));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('refus_base');
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('PAT1');
    erreur.mockRestore();
  });

  it('un objet inconnu est refusé', async () => {
    expect((await (await POST(requete({ idPatient: 'PAT1', objet: 'imc' }))).json()).reason).toBe('objet_invalide');
  });
});
