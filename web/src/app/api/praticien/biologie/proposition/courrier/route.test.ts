import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getServerSession,
  prisma,
  deriverPropositionPourPatient,
  genererCourrierBiologie,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    correspondanceMedecin: { create: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  deriverPropositionPourPatient: vi.fn(),
  genererCourrierBiologie: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/biology-library/propositionService', () => ({ deriverPropositionPourPatient }));
vi.mock('@/lib/biology-library/courrier', () => ({ genererCourrierBiologie }));

import { POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/biologie/proposition/courrier';
const PRATICIEN = 'praticien@wellneuro.fr';
const ANCRE = 'a'.repeat(64);

function postRequest(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Courrier rendu, avec la provenance stampée par le générateur. */
function courrierGenere(provenance: Record<string, unknown> | null = {
  source: 'biologie_proposition',
  ancrageHash: ANCRE,
  version: 'indications-biologie-v1',
}) {
  return {
    ok: true,
    courrier: {
      document: { blocs: provenance ? [{ provenance }] : [] },
      html: '<p>courrier</p>',
      texte: 'Docteur, …',
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_PROPOSITION = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({
    praticienEmail: PRATICIEN,
    actif: true,
    suiviClotureLe: null,
  });
  prisma.correspondanceMedecin.create.mockResolvedValue({});
  deriverPropositionPourPatient.mockResolvedValue({
    ok: true,
    proposition: { ok: true, lignes: [], declarationsIgnoreesHorsProposition: [] },
    limites: [],
  });
  genererCourrierBiologie.mockReturnValue(courrierGenere());
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_PROPOSITION;
});

// ── CÂBLAGE DU DRAPEAU ÉTAGE 2 (banc qui rougit au débranchement) ──────────
// La phrase « aucun résultat conservé » du courrier suit `isCbResultsEnabled`
// PARCE QUE la route le passe : supprimer la ligne `resultatsActifs:` doit
// faire rougir ici, pas seulement dans le test de la fonction pure.
describe('câblage resultatsActifs (D-122 §2)', () => {
  it('drapeau étage 2 levé : le générateur le reçoit', async () => {
    process.env.WN_CB_RESULTS_ENABLED = 'true';
    await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    delete process.env.WN_CB_RESULTS_ENABLED;
    expect(genererCourrierBiologie).toHaveBeenCalledWith(
      expect.objectContaining({ resultatsActifs: true }),
    );
  });

  it('drapeau éteint : le générateur reçoit false (fail-closed)', async () => {
    await POST(postRequest({ idPatient: 'PAT1', medecinLibelle: 'Dr Nicola' }));
    expect(genererCourrierBiologie).toHaveBeenCalledWith(
      expect.objectContaining({ resultatsActifs: false }),
    );
  });
});

// ── L'INVARIANT CENTRAL DU LOT ─────────────────────────────────────────────
// Deux colonnes d'ancrage ne valent que si elles portent l'ancre du document
// RENDU. Reconstruites, ou pire fournies par l'appelant, elles seraient deux
// champs de plus — pas une garde ([[D-073]]).
describe('ancrage — celui du document rendu, jamais autre chose', () => {
  it('consigne le SHA et la version lus dans la provenance du bloc', async () => {
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    expect(response.status).toBe(201);
    const data = prisma.correspondanceMedecin.create.mock.calls[0][0].data;
    expect(data.ancrageSha256).toBe(ANCRE);
    expect(data.ancrageVersion).toBe('indications-biologie-v1');
  });

  it('une ancre fournie par le CLIENT est ignorée', async () => {
    await POST(postRequest({
      idPatient: 'PAT_TEST',
      medecinLibelle: 'Dr Martin',
      ancrageSha256: 'b'.repeat(64),
      ancrageVersion: 'table-inventee',
    }));
    const data = prisma.correspondanceMedecin.create.mock.calls[0][0].data;
    expect(data.ancrageSha256).toBe(ANCRE);
    expect(data.ancrageVersion).toBe('indications-biologie-v1');
  });

  it('l’ancre suit le document : un autre SHA rendu, un autre SHA consigné', async () => {
    // Si la route reconstruisait l'ancre depuis une constante, ce banc
    // rougirait — c'est exactement ce qu'il garde.
    const autre = 'c'.repeat(64);
    genererCourrierBiologie.mockReturnValue(courrierGenere({
      source: 'biologie_proposition',
      ancrageHash: autre,
      version: 'indications-biologie-v2',
    }));
    await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    const data = prisma.correspondanceMedecin.create.mock.calls[0][0].data;
    expect(data.ancrageSha256).toBe(autre);
    expect(data.ancrageVersion).toBe('indications-biologie-v2');
  });

  it('document sans provenance : rien n’est consigné', async () => {
    genererCourrierBiologie.mockReturnValue(courrierGenere(null));
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    expect(response.status).toBe(500);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });
});

// ── Le texte ne vient JAMAIS du client ─────────────────────────────────────
describe('texte du courrier — généré côté serveur', () => {
  it('un texte fourni par le client est ignoré : c’est le texte rendu qui est consigné', async () => {
    // Accepter un texte du navigateur rendrait la garde non prescriptive
    // contournable par construction : on consignerait n'importe quoi comme
    // « la lettre ».
    await POST(postRequest({
      idPatient: 'PAT_TEST',
      medecinLibelle: 'Dr Martin',
      texte: 'Prescrire un dosage de ferritine en urgence.',
    }));
    const data = prisma.correspondanceMedecin.create.mock.calls[0][0].data;
    expect(data.texte).toBe('Docteur, …');
  });

  it('le sens est « sortant », posé par le serveur', async () => {
    await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin', sens: 'entrant' }));
    expect(prisma.correspondanceMedecin.create.mock.calls[0][0].data.sens).toBe('sortant');
  });

  it('l’auteur vient de la SESSION, jamais du corps', async () => {
    await POST(postRequest({
      idPatient: 'PAT_TEST',
      medecinLibelle: 'Dr Martin',
      praticienEmail: 'usurpateur@ailleurs.fr',
    }));
    expect(prisma.correspondanceMedecin.create.mock.calls[0][0].data.praticienEmail).toBe(PRATICIEN);
  });
});

describe('gardes — fail-closed et dans l’ordre', () => {
  it('drapeau éteint : 503, sans lire le dossier ni journaliser', async () => {
    delete process.env.WN_CB_PROPOSITION;
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    expect(response.status).toBe(503);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('un corps mal typé ne casse pas l’ordre fail-closed', async () => {
    delete process.env.WN_CB_PROPOSITION;
    const response = await POST(postRequest({ idPatient: 123 }));
    expect(response.status).toBe(503);
  });

  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    expect(response.status).toBe(401);
  });

  it('patient d’un autre praticien : 403, rien n’est dérivé', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    expect(response.status).toBe(403);
    expect(deriverPropositionPourPatient).not.toHaveBeenCalled();
  });

  it('cette route LIT le dossier : l’accès est journalisé une fois', async () => {
    await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    const data = prisma.journalAccesDossier.create.mock.calls[0][0].data;
    expect(data.route).toBe('/api/praticien/biologie/proposition/courrier');
    expect(data.methode).toBe('POST');
  });

  it('dossier clos : refusé dans la route, rien n’est consigné', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: PRATICIEN,
      actif: false,
      suiviClotureLe: new Date('2026-08-01T00:00:00.000Z'),
    });
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    expect(response.status).toBe(409);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });
});

describe('refus — motivés en français, jamais consignés à moitié', () => {
  it('un texte trop long est un refus SERVEUR : 409, pas 400', async () => {
    // Le texte est généré par le serveur — un 400 accuserait le client d'un
    // refus dont il n'est pas l'auteur (revue B3).
    genererCourrierBiologie.mockReturnValue({
      ok: true,
      courrier: {
        document: { blocs: [{ provenance: { source: 'biologie_proposition', ancrageHash: ANCRE, version: 'indications-biologie-v1' } }] },
        html: '<p>long</p>',
        texte: 'x'.repeat(8001),
      },
    });
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    const payload = await response.json();
    expect(response.status).toBe(409);
    expect(payload.reason).toBe('texte_trop_long');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('une consignation qui lève ne journalise JAMAIS le texte de la lettre', async () => {
    // Un PrismaClientValidationError rend ses arguments dans son message —
    // texte compris. Le log ne doit porter que le nom de l'erreur (revue B2).
    const erreurs: unknown[][] = [];
    const espion = vi.spyOn(console, 'error').mockImplementation((...args) => { erreurs.push(args); });
    const fuite = new Error('Invalid create() … texte: "Docteur, contenu clinique…"');
    fuite.name = 'PrismaClientValidationError';
    prisma.correspondanceMedecin.create.mockRejectedValue(fuite);
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    espion.mockRestore();
    expect(response.status).toBe(500);
    const tout = JSON.stringify(erreurs);
    expect(tout).toContain('PrismaClientValidationError');
    expect(tout).not.toContain('contenu clinique');
  });

  it('l’abstention du moteur remonte son motif en 409', async () => {
    deriverPropositionPourPatient.mockResolvedValue({
      ok: false,
      motif: 'La table des indications n’est pas signée.',
    });
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    const payload = await response.json();
    expect(response.status).toBe(409);
    expect(payload.error).toContain('n’est pas signée');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('aucune exploration proposée : pas de courrier vide', async () => {
    genererCourrierBiologie.mockReturnValue({ ok: false, raison: 'aucune_exploration_proposee' });
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    const payload = await response.json();
    expect(response.status).toBe(409);
    expect(payload.reason).toBe('aucune_exploration_proposee');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('terme prescriptif au rendu : refus, et RIEN n’est consigné', async () => {
    // Un courrier qui ne se rend pas ne se consigne pas.
    genererCourrierBiologie.mockReturnValue({ ok: false, raison: 'terme_prescriptif' });
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    expect(response.status).toBe(409);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('bloc non diffusé : le refus remonte un message diagnostique', async () => {
    genererCourrierBiologie.mockReturnValue({ ok: false, raison: 'bloc_non_diffuse' });
    const response = await POST(postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'Dr Martin' }));
    const payload = await response.json();
    expect(response.status).toBe(409);
    expect(payload.error).toContain('n’est pas diffusable');
    expect(payload.error).toContain('texte jugé');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('nom de médecin absent : refus lisible, rien n’est consigné', async () => {
    const response = await POST(postRequest({ idPatient: 'PAT_TEST' }));
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.reason).toBe('medecin_libelle_vide');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('une adresse e-mail à la place du nom est refusée', async () => {
    const response = await POST(
      postRequest({ idPatient: 'PAT_TEST', medecinLibelle: 'dr.martin@cabinet.fr' }),
    );
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.reason).toBe('medecin_libelle_email');
  });
});
