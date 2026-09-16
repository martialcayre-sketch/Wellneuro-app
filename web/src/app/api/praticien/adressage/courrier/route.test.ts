import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getServerSession,
  prisma,
  verifierAppartenancePatient,
  genererCourrierAdressage,
  tableSignauxSecuriteSignee,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findFirst: vi.fn() },
    correspondanceMedecin: { create: vi.fn() },
  },
  verifierAppartenancePatient: vi.fn(),
  genererCourrierAdressage: vi.fn(),
  tableSignauxSecuriteSignee: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  verifierAppartenancePatient,
  emailPraticien: (session: { user?: { email?: string } } | null) => session?.user?.email ?? null,
}));
vi.mock('@/lib/clinical/courrierAdressage', () => ({ genererCourrierAdressage }));
vi.mock('@/lib/clinical/safetySignalsV1', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/clinical/safetySignalsV1')>()),
  tableSignauxSecuriteSignee,
}));

import { GET, POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/adressage/courrier';
const PRATICIEN = 'praticien@wellneuro.fr';
const ANCRE = 'a'.repeat(64);

function postRequest(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function lettreGeneree(provenance: Record<string, unknown> | null = {
  source: 'signaux_securite_anamnese',
  ancrageHash: ANCRE,
  version: 'safety-signals-nnpp2-v1',
}) {
  return {
    ok: true,
    courrier: {
      document: { blocs: provenance ? [{ provenance }] : [] },
      html: '<p>lettre</p>',
      texte: 'Docteur, …',
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_ADRESSAGE_COURRIER = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  verifierAppartenancePatient.mockResolvedValue('accessible');
  tableSignauxSecuriteSignee.mockReturnValue(true);
  prisma.patient.findUnique.mockResolvedValue({
    actif: true,
    suiviClotureLe: null,
    prenom: 'Sophie',
    nom: 'Nicola',
  });
  prisma.consultation.findFirst.mockResolvedValue({
    anamnese: { signaux_alerte: ['Douleur thoracique / oppression'] },
  });
  prisma.correspondanceMedecin.create.mockResolvedValue({});
  genererCourrierAdressage.mockReturnValue(lettreGeneree());
});

afterEach(() => {
  delete process.env.WN_ADRESSAGE_COURRIER;
});

// ── LE DRAPEAU, ET CE QU'IL FERME ──────────────────────────────────────────
// Ce geste PRODUIT un document qui nomme des signaux déclarés et part vers un
// tiers. Le drapeau est le seul moyen de le suspendre sans redéploiement.
describe('drapeau — fail-closed, et avant toute lecture', () => {
  it('drapeau éteint : POST 503, sans lire le dossier ni journaliser', async () => {
    delete process.env.WN_ADRESSAGE_COURRIER;
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(res.status).toBe(503);
    // AUCUNE TRACE : un geste fermé ne doit rien laisser derrière lui — ni
    // lecture de dossier, ni ligne au journal d'accès.
    expect(verifierAppartenancePatient).not.toHaveBeenCalled();
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.consultation.findFirst).not.toHaveBeenCalled();
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('une valeur approchante n’ouvre rien', async () => {
    for (const valeur of ['1', 'TRUE', 'True', 'oui', '']) {
      process.env.WN_ADRESSAGE_COURRIER = valeur;
      expect((await GET()).status).toBe(503);
    }
  });

  it('GET : dit si le geste est ouvert, et ne nomme AUCUN dossier', async () => {
    const res = await GET();
    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toEqual({ ok: true, ouvert: true });
    // Le GET ne lit aucun dossier, donc il n'écrit aucune ligne de journal :
    // lui passer un `idPatient` en ajouterait une à chaque montage du cockpit.
    expect(verifierAppartenancePatient).not.toHaveBeenCalled();
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('GET sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
});

// ── LA TABLE SIGNÉE COMMANDE, ET SON VERROU EST INVERSE DES AUTRES ─────────
describe('cotation non signée — aucune lettre', () => {
  it('refuse en 409, et ne consigne rien', async () => {
    // Verrou fermé, `construireSafetyFindings` ne produit aucun constat : la
    // décision n'est pas suspendue. Une lettre qui annoncerait un adressage
    // n'aurait rien derrière elle.
    tableSignauxSecuriteSignee.mockReturnValue(false);
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    const payload = await res.json();
    expect(res.status).toBe(409);
    expect(payload.reason).toBe('table_non_signee');
    expect(genererCourrierAdressage).not.toHaveBeenCalled();
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });
});

// ── GARDES — fail-closed et dans l'ordre ───────────────────────────────────
describe('gardes', () => {
  it('sans session : 401, et rien n’est lu', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(res.status).toBe(401);
    expect(verifierAppartenancePatient).not.toHaveBeenCalled();
  });

  it('un corps JSON `null` est un 400, jamais un 500 pré-auth', async () => {
    const res = await POST(new Request(URL_BASE, { method: 'POST', body: 'null' }));
    expect(res.status).toBe(400);
  });

  it('un identifiant mal formé est refusé avant toute lecture', async () => {
    const res = await POST(postRequest({ idPatient: 'PAT 1/../x', medecinLibelle: 'Dr Nicola' }));
    expect(res.status).toBe(400);
    expect(verifierAppartenancePatient).not.toHaveBeenCalled();
  });

  it('patient d’un autre praticien : 403, rien n’est dérivé', async () => {
    verifierAppartenancePatient.mockResolvedValue('autre_praticien');
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(res.status).toBe(403);
    expect(genererCourrierAdressage).not.toHaveBeenCalled();
  });

  it('patient introuvable : 404', async () => {
    verifierAppartenancePatient.mockResolvedValue('introuvable');
    expect((await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }))).status)
      .toBe(404);
  });

  it('cette route LIT le dossier : l’accès est journalisé, sur SON gabarit', async () => {
    await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(verifierAppartenancePatient).toHaveBeenCalledWith('PAT1', PRATICIEN, {
      route: '/api/praticien/adressage/courrier',
      methode: 'POST',
    });
  });

  it('dossier clos : refusé dans la route, rien n’est consigné', async () => {
    // La correspondance est une pièce du dossier ([[D-219]] §2) : le refus vit dans la
    // route, pas seulement dans l'écran.
    prisma.patient.findUnique.mockResolvedValue({
      actif: false,
      suiviClotureLe: new Date('2026-09-01T00:00:00.000Z'),
      prenom: 'Sophie',
      nom: 'Nicola',
    });
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(res.status).toBe(409);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });
});

// ── LE TEXTE VIENT DU SERVEUR, L'ANCRE DU DOCUMENT RENDU ───────────────────
describe('texte et ancrage', () => {
  it('un texte fourni par le CLIENT est ignoré', async () => {
    await POST(postRequest({
      idPatient: 'PAT1',
      medecinLibelle: 'Dr Nicola',
      texte: 'Adressez ce patient en urgence.',
    }));
    const consigne = prisma.correspondanceMedecin.create.mock.calls[0][0].data;
    expect(consigne.texte).toBe('Docteur, …');
  });

  it('les signaux viennent de l’anamnèse PORTEUSE, lus par la fonction du runtime', async () => {
    await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(genererCourrierAdressage).toHaveBeenCalledWith(
      expect.objectContaining({ signaux: ['Douleur thoracique / oppression'] }),
    );
  });

  it('un dossier sans consultation porteuse ne fabrique aucun signal', async () => {
    prisma.consultation.findFirst.mockResolvedValue(null);
    await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(genererCourrierAdressage).toHaveBeenCalledWith(
      expect.objectContaining({ signaux: [] }),
    );
  });

  it('consigne le SHA et la version lus dans la provenance du bloc rendu', async () => {
    await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    const consigne = prisma.correspondanceMedecin.create.mock.calls[0][0].data;
    expect(consigne.ancrageSha256).toBe(ANCRE);
    expect(consigne.ancrageVersion).toBe('safety-signals-nnpp2-v1');
    expect(consigne.sens).toBe('sortant');
    expect(consigne.praticienEmail).toBe(PRATICIEN);
  });

  it('l’ancre suit le document : un autre SHA rendu, un autre SHA consigné', async () => {
    genererCourrierAdressage.mockReturnValue(lettreGeneree({
      source: 'signaux_securite_anamnese',
      ancrageHash: 'b'.repeat(64),
      version: 'safety-signals-nnpp2-v2',
    }));
    await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    const consigne = prisma.correspondanceMedecin.create.mock.calls[0][0].data;
    expect(consigne.ancrageSha256).toBe('b'.repeat(64));
    expect(consigne.ancrageVersion).toBe('safety-signals-nnpp2-v2');
  });

  it('document sans provenance : rien n’est consigné', async () => {
    genererCourrierAdressage.mockReturnValue(lettreGeneree(null));
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(res.status).toBe(500);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('sert les deux formes du rendu, et ne consigne que le texte', async () => {
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    const payload = await res.json();
    expect(res.status).toBe(201);
    expect(payload.html).toBe('<p>lettre</p>');
    expect(payload.texte).toBe('Docteur, …');
    const consigne = JSON.stringify(prisma.correspondanceMedecin.create.mock.calls[0][0]);
    expect(consigne).not.toContain('<p>lettre</p>');
    // Ni le nom du patient : le dossier le porte déjà.
    expect(consigne).not.toContain('Sophie');
  });

  it('le nom du dossier atteint l’en-tête du papier, jamais le corps de la requête', async () => {
    await POST(postRequest({
      idPatient: 'PAT1',
      medecinLibelle: 'Dr Nicola',
      patientNom: 'Injecté',
    }));
    expect(genererCourrierAdressage).toHaveBeenCalledWith(
      expect.objectContaining({ patientNom: 'Sophie Nicola' }),
    );
  });
});

// ── REFUS — motivés en français, jamais consignés à moitié ─────────────────
describe('refus', () => {
  it('aucun signal d’adressage : pas de lettre vide', async () => {
    genererCourrierAdressage.mockReturnValue({ ok: false, raison: 'aucun_signal_adressage' });
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    const payload = await res.json();
    expect(res.status).toBe(409);
    expect(payload.error).toMatch(/n’appelle un adressage/);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('terme prescriptif au rendu : refus, et RIEN n’est consigné', async () => {
    genererCourrierAdressage.mockReturnValue({ ok: false, raison: 'terme_prescriptif' });
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(res.status).toBe(409);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('nom de médecin absent : refus lisible, rien n’est consigné', async () => {
    const res = await POST(postRequest({ idPatient: 'PAT1' }));
    const payload = await res.json();
    expect(res.status).toBe(400);
    expect(payload.error).toMatch(/médecin/i);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('une adresse e-mail à la place du nom est refusée', async () => {
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'dr@cabinet.fr' }));
    expect(res.status).toBe(400);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('une consignation qui lève ne journalise JAMAIS le texte de la lettre', async () => {
    // Un `PrismaClientValidationError` rend ses arguments dans son message —
    // donc les signaux déclarés du patient. Seul le NOM de l'erreur est écrit.
    const erreur = new Error('Argument texte: Docteur, … signal déclaré');
    erreur.name = 'PrismaClientValidationError';
    prisma.correspondanceMedecin.create.mockRejectedValue(erreur);
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(res.status).toBe(500);
    const journalise = espion.mock.calls.flat().join(' ');
    expect(journalise).toContain('PrismaClientValidationError');
    expect(journalise).not.toContain('Docteur, …');
    espion.mockRestore();
  });
});
