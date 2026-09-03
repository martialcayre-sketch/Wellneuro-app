import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getServerSession,
  prisma,
  deriverPropositionPourPatient,
  genererDocumentPatientBiologie,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    documentPatientBiologie: { create: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  deriverPropositionPourPatient: vi.fn(),
  genererDocumentPatientBiologie: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/biology-library/propositionService', () => ({ deriverPropositionPourPatient }));
vi.mock('@/lib/biology-library/documentPatient', () => ({ genererDocumentPatientBiologie }));

import { POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/biologie/proposition/document-patient';
const PRATICIEN = 'praticien@wellneuro.fr';
const ANCRE = 'a'.repeat(64);

function postRequest(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Document rendu, avec la provenance stampée par le générateur. */
function documentGenere(
  texte = 'Ce document présente les explorations proposées.',
  provenance: Record<string, unknown> | null = {
    source: 'biologie_proposition',
    ancrageHash: ANCRE,
    version: 'indications-biologie-v1',
  },
) {
  return {
    ok: true,
    documentPatient: {
      document: { blocs: provenance ? [{ provenance }] : [] },
      html: '<p>document</p>',
      texte,
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
  prisma.documentPatientBiologie.create.mockResolvedValue({});
  deriverPropositionPourPatient.mockResolvedValue({
    ok: true,
    proposition: { ok: true, lignes: [], declarationsIgnoreesHorsProposition: [] },
    limites: [],
  });
  genererDocumentPatientBiologie.mockReturnValue(documentGenere());
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_PROPOSITION;
});

// Banc de câblage jumeau du courrier : la phrase « aucun résultat conservé »
// suit `isCbResultsEnabled` parce que la ROUTE le passe.
describe('câblage resultatsActifs (D-122 §2)', () => {
  it('drapeau étage 2 levé : le générateur le reçoit', async () => {
    process.env.WN_CB_RESULTS_ENABLED = 'true';
    await POST(postRequest({ idPatient: 'PAT1' }));
    delete process.env.WN_CB_RESULTS_ENABLED;
    expect(genererDocumentPatientBiologie).toHaveBeenCalledWith(
      expect.objectContaining({ resultatsActifs: true }),
    );
  });

  it('drapeau éteint : le générateur reçoit false (fail-closed)', async () => {
    await POST(postRequest({ idPatient: 'PAT1' }));
    expect(genererDocumentPatientBiologie).toHaveBeenCalledWith(
      expect.objectContaining({ resultatsActifs: false }),
    );
  });
});

describe('ancrage — celui du document rendu, jamais autre chose (D-073, D-122)', () => {
  it('consigne le SHA et la version lus dans la provenance du bloc', async () => {
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(201);
    expect(prisma.documentPatientBiologie.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ancrageSha256: ANCRE,
        ancrageVersion: 'indications-biologie-v1',
      }),
    });
  });

  it('une ancre fournie par le CLIENT est ignorée', async () => {
    await POST(postRequest({
      idPatient: 'PAT1',
      ancrageSha256: 'f'.repeat(64),
      ancrageVersion: 'version-forgee',
    }));
    const data = prisma.documentPatientBiologie.create.mock.calls[0][0].data;
    expect(data.ancrageSha256).toBe(ANCRE);
    expect(data.ancrageVersion).toBe('indications-biologie-v1');
  });

  it('document sans provenance : rien n’est consigné', async () => {
    genererDocumentPatientBiologie.mockReturnValue(documentGenere(undefined, null));
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(500);
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });
});

describe('texte du document — généré côté serveur', () => {
  it('un texte fourni par le client est ignoré : c’est le texte rendu qui est consigné', async () => {
    await POST(postRequest({ idPatient: 'PAT1', texte: 'texte forgé par le client' }));
    const data = prisma.documentPatientBiologie.create.mock.calls[0][0].data;
    expect(data.texte).toBe('Ce document présente les explorations proposées.');
  });

  it('l’auteur vient de la SESSION, jamais du corps', async () => {
    await POST(postRequest({ idPatient: 'PAT1', generePar: 'intrus@exemple.fr' }));
    const data = prisma.documentPatientBiologie.create.mock.calls[0][0].data;
    expect(data.generePar).toBe(PRATICIEN);
  });
});

describe('garde du registre anxiogène — refus CONFIRMABLE lié au texte (D-090)', () => {
  const TEXTE_ANXIOGENE = 'Une consultation urgente est nécessaire.';
  const SHA_ANXIOGENE = createHash('sha256').update(TEXTE_ANXIOGENE, 'utf8').digest('hex');

  // BANC DE DÉBRANCHEMENT (carte des chemins sortants, documents/vocabulaire.ts) :
  // si la garde disparaît de la route, le premier test rend 201 au lieu de 409
  // et ce banc ROUGIT. La garde n'est PAS mockée — c'est la vraie qui juge.
  it('un texte au registre anxiogène est refusé en 409 avec l’empreinte du texte jugé', async () => {
    genererDocumentPatientBiologie.mockReturnValue(documentGenere(TEXTE_ANXIOGENE));
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.reason).toBe('REGISTRE_ANXIOGENE');
    // Le terme signalé est CELUI DU TEXTE, pour être actionnable — et
    // l'empreinte rendue est celle du texte refusé, à renvoyer pour confirmer.
    expect(payload.error).toContain('urgente');
    expect(payload.texteSha256).toBe(SHA_ANXIOGENE);
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });

  it('la confirmation portant l’empreinte du texte jugé consigne — le praticien a tranché CE texte', async () => {
    genererDocumentPatientBiologie.mockReturnValue(documentGenere(TEXTE_ANXIOGENE));
    const response = await POST(
      postRequest({ idPatient: 'PAT1', confirmerTexteSha256: SHA_ANXIOGENE }),
    );
    expect(response.status).toBe(201);
    expect(prisma.documentPatientBiologie.create).toHaveBeenCalledTimes(1);
  });

  it('un texte re-dérivé DIFFÉRENT re-refuse malgré la confirmation : elle visait l’ancien', async () => {
    // Entre le 409 et le clic, le dossier a bougé : le texte régénéré porte un
    // autre terme. La confirmation de l'ancien texte ne couvre pas celui-ci.
    genererDocumentPatientBiologie.mockReturnValue(
      documentGenere('Un signal alarmant est à discuter.'),
    );
    const response = await POST(
      postRequest({ idPatient: 'PAT1', confirmerTexteSha256: SHA_ANXIOGENE }),
    );
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.reason).toBe('REGISTRE_ANXIOGENE');
    expect(payload.error).toContain('alarmant');
    expect(payload.texteSha256).not.toBe(SHA_ANXIOGENE);
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });

  it('une confirmation non-chaîne ne confirme rien (fail-closed)', async () => {
    genererDocumentPatientBiologie.mockReturnValue(documentGenere(TEXTE_ANXIOGENE));
    const response = await POST(postRequest({ idPatient: 'PAT1', confirmerTexteSha256: true }));
    expect(response.status).toBe(409);
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });

  it('un texte sain ne demande aucune confirmation', async () => {
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(201);
  });
});

describe('bornes du texte généré', () => {
  it('un texte au-delà de 8 000 caractères est un refus SERVEUR : 409, à signaler', async () => {
    genererDocumentPatientBiologie.mockReturnValue(documentGenere('x'.repeat(8001)));
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.reason).toBe('texte_trop_long');
    expect(payload.error).toContain('à signaler');
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });
});

describe('gardes — fail-closed et dans l’ordre', () => {
  it('drapeau éteint : 503, sans lire le dossier ni journaliser', async () => {
    delete process.env.WN_CB_PROPOSITION;
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(503);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(401);
  });

  it('un corps mal typé ne casse pas l’ordre fail-closed', async () => {
    const response = await POST(postRequest({ idPatient: 42 }));
    expect(response.status).toBe(400);
  });

  it('un corps JSON `null` est un 400, jamais un 500 pré-auth', async () => {
    // `null` est du JSON valide : sans garde, `body.idPatient` lèverait avant
    // toute session — un 500 fabricable par n'importe quel client anonyme.
    const response = await POST(postRequest(null));
    expect(response.status).toBe(400);
  });

  it('patient d’un autre praticien : 403, rien n’est dérivé', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: 'autre@wellneuro.fr',
      actif: true,
      suiviClotureLe: null,
    });
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(403);
    expect(deriverPropositionPourPatient).not.toHaveBeenCalled();
  });

  it('dossier clos : refusé dans la route, rien n’est consigné', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      praticienEmail: PRATICIEN,
      actif: false,
      suiviClotureLe: '2026-08-01T00:00:00.000Z',
    });
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(409);
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });
});

describe('refus — motivés en français, jamais consignés à moitié', () => {
  it('l’abstention du moteur remonte son motif en 409', async () => {
    deriverPropositionPourPatient.mockResolvedValue({
      ok: false,
      motif: 'Le questionnaire T0 n’est pas complété.',
    });
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.error).toBe('Le questionnaire T0 n’est pas complété.');
  });

  it('aucune exploration proposée : pas de document vide', async () => {
    genererDocumentPatientBiologie.mockReturnValue({
      ok: false,
      raison: 'aucune_exploration_proposee',
    });
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(409);
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });

  it('bloc non diffusé : le refus remonte un message diagnostique', async () => {
    genererDocumentPatientBiologie.mockReturnValue({ ok: false, raison: 'bloc_non_diffuse' });
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(409);
    const payload = await response.json();
    expect(payload.error).toContain('Rien n’est consigné');
  });

  it('une consignation qui lève ne journalise JAMAIS le texte du document', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    prisma.documentPatientBiologie.create.mockRejectedValue(
      Object.assign(new Error('Invalid value: Ce document présente…'), {
        name: 'PrismaClientValidationError',
      }),
    );
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(500);
    const journalise = spy.mock.calls.flat().join(' ');
    expect(journalise).not.toContain('Ce document présente');
    spy.mockRestore();
  });
});

describe('journalisation de la lecture (G-TRUST-04)', () => {
  it('cette route LIT le dossier : l’accès est journalisé une fois', async () => {
    await POST(postRequest({ idPatient: 'PAT1' }));
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
  });
});
