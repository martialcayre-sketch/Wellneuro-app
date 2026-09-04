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
    documentPatientBiologie: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
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

import { GET, POST } from './route';

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

function getRequest(idPatient = 'PAT1'): Request {
  return new Request(`${URL_BASE}?idPatient=${encodeURIComponent(idPatient)}`);
}

// Jetons de confirmation SÉPARÉS PAR DOMAINE : les deux gardes visent le même
// texte, et une empreinte nue les rendrait interchangeables. Les recalculer
// ici plutôt que les copier prouve la séparation au lieu de la postuler.
function jetonRegistre(texte: string): string {
  return createHash('sha256').update(`REGISTRE:${texte}`, 'utf8').digest('hex');
}
function jetonDoublon(texte: string): string {
  return createHash('sha256').update(`DOUBLON:${texte}`, 'utf8').digest('hex');
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
  // Dossier vierge par défaut : aucun document déjà consigné.
  prisma.documentPatientBiologie.findFirst.mockResolvedValue(null);
  prisma.documentPatientBiologie.findMany.mockResolvedValue([]);
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
  const SHA_ANXIOGENE = jetonRegistre(TEXTE_ANXIOGENE);

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

// Le GET relit ce qui a été consigné — LOT-01 de « Biologie exploitée ».
// Sans lui, une pièce remise au patient n'existait qu'en base : l'écran
// repartait vierge à chaque rechargement.
describe('GET — relire ce qui a été remis', () => {
  it('rend les pièces consignées, la plus récente d’abord', async () => {
    prisma.documentPatientBiologie.findMany.mockResolvedValue([
      {
        id: 'doc2',
        texte: 'Second document.',
        ancrageSha256: ANCRE,
        ancrageVersion: 'indications-biologie-v1',
        generePar: PRATICIEN,
        genereLe: new Date('2026-09-04T10:00:00Z'),
      },
    ]);
    const response = await GET(getRequest());
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok: boolean;
      documents: { id: string; texte: string; genereLe: string }[];
    };
    expect(payload.ok).toBe(true);
    expect(payload.documents[0]).toMatchObject({ id: 'doc2', texte: 'Second document.' });
    expect(payload.documents[0].genereLe).toBe('2026-09-04T10:00:00.000Z');
    expect(prisma.documentPatientBiologie.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ genereLe: 'desc' }, { id: 'desc' }] }),
    );
  });

  it('la lecture est SCOPÉE au dossier — sans quoi elle rendrait tous les dossiers', async () => {
    await GET(getRequest('PAT1'));
    // Un refactor qui perdrait ce `where` servirait le texte intégral de
    // toutes les pièces de tous les dossiers à n'importe quelle session.
    expect(prisma.documentPatientBiologie.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT1' } }),
    );
  });

  it('contrat des champs servis : ni plus, ni moins', async () => {
    prisma.documentPatientBiologie.findMany.mockResolvedValue([
      {
        id: 'doc1',
        texte: 'Texte.',
        ancrageSha256: ANCRE,
        ancrageVersion: 'indications-biologie-v1',
        genereLe: new Date('2026-09-04T10:00:00Z'),
      },
    ]);
    const response = await GET(getRequest());
    const payload = (await response.json()) as { documents: Record<string, unknown>[] };
    // Une colonne ajoutée en base ne doit pas traverser la frontière sans
    // décision — l'e-mail du praticien n'a aucun consommateur à l'écran.
    expect(Object.keys(payload.documents[0]).sort()).toEqual([
      'ancrageSha256',
      'ancrageVersion',
      'genereLe',
      'id',
      'texte',
    ]);
  });

  it('la liste est bornée, et le plafond est celui que l’écran annonce', async () => {
    await GET(getRequest());
    expect(prisma.documentPatientBiologie.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });

  it('une lecture qui lève ne journalise JAMAIS le texte des pièces', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    prisma.documentPatientBiologie.findMany.mockRejectedValue(
      Object.assign(new Error('Invalid value: Texte remis au patient…'), {
        name: 'PrismaClientValidationError',
      }),
    );
    const response = await GET(getRequest());
    expect(response.status).toBe(500);
    expect(spy.mock.calls.flat().join(' ')).not.toContain('Texte remis au patient');
    spy.mockRestore();
  });

  it('identifiant au format invalide : 400, sans lecture ni journal', async () => {
    const response = await GET(getRequest('../autre'));
    expect(response.status).toBe(400);
    expect(prisma.documentPatientBiologie.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('le texte et l’ancre viennent de la LIGNE : rien n’est re-dérivé (D-079)', async () => {
    prisma.documentPatientBiologie.findMany.mockResolvedValue([
      {
        id: 'doc1',
        texte: 'Texte tel que remis au patient.',
        ancrageSha256: 'b'.repeat(64),
        ancrageVersion: 'indications-biologie-v0',
        generePar: PRATICIEN,
        genereLe: new Date('2026-09-01T09:00:00Z'),
      },
    ]);
    const response = await GET(getRequest());
    const payload = (await response.json()) as {
      documents: { ancrageSha256: string; ancrageVersion: string }[];
    };
    // L'ancre servie est celle de la ligne — PÉRIMÉE ici — jamais celle de la
    // table courante : une pièce se relit telle qu'elle est partie.
    expect(payload.documents[0].ancrageSha256).toBe('b'.repeat(64));
    expect(payload.documents[0].ancrageVersion).toBe('indications-biologie-v0');
    expect(deriverPropositionPourPatient).not.toHaveBeenCalled();
    expect(genererDocumentPatientBiologie).not.toHaveBeenCalled();
  });

  it('lecture de dossier nommé : l’accès est journalisé une fois', async () => {
    await GET(getRequest());
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
  });

  it('drapeau éteint : 503, sans lire le dossier ni journaliser', async () => {
    delete process.env.WN_CB_PROPOSITION;
    const response = await GET(getRequest());
    expect(response.status).toBe(503);
    expect(prisma.documentPatientBiologie.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('sans session : 401, sans lecture ni journalisation', async () => {
    getServerSession.mockResolvedValue(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    expect(prisma.documentPatientBiologie.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('patient d’un autre praticien : 403, rien n’est rendu', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const response = await GET(getRequest());
    expect(response.status).toBe(403);
    expect(prisma.documentPatientBiologie.findMany).not.toHaveBeenCalled();
  });

  it('identifiant absent : 400, jamais un 500', async () => {
    const response = await GET(new Request(URL_BASE));
    expect(response.status).toBe(400);
  });
});

// Garde anti-double-consignation. Le défaut était nommé depuis le 2026-08-20
// (clôture « Biologie consolidée ») : le verrou vivait à l'écran seulement.
describe('doublon — re-consigner reste permis, jamais à l’aveugle', () => {
  const TEXTE = 'Ce document présente les explorations proposées.';
  const SHA = jetonDoublon(TEXTE);
  const TEXTE_ANXIOGENE = 'Une consultation urgente est nécessaire.';

  it('texte identique au dernier consigné : 409 confirmable, rien n’est écrit', async () => {
    prisma.documentPatientBiologie.findFirst.mockResolvedValue({ texte: TEXTE });
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(409);
    const payload = (await response.json()) as { reason: string; texteSha256?: string };
    expect(payload.reason).toBe('DOUBLON_DOCUMENT');
    // L'empreinte revient pour que la confirmation vise CE texte-ci.
    expect(payload.texteSha256).toBe(SHA);
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });

  it('la confirmation à la bonne empreinte consigne la seconde copie', async () => {
    prisma.documentPatientBiologie.findFirst.mockResolvedValue({ texte: TEXTE });
    const response = await POST(postRequest({ idPatient: 'PAT1', confirmerDoublonSha256: SHA }));
    expect(response.status).toBe(201);
    expect(prisma.documentPatientBiologie.create).toHaveBeenCalledTimes(1);
  });

  it('une empreinte RASSIE ne confirme rien : re-refus avec la nouvelle', async () => {
    prisma.documentPatientBiologie.findFirst.mockResolvedValue({ texte: TEXTE });
    const response = await POST(
      postRequest({ idPatient: 'PAT1', confirmerDoublonSha256: 'c'.repeat(64) }),
    );
    expect(response.status).toBe(409);
    const payload = (await response.json()) as { reason: string; texteSha256?: string };
    expect(payload.reason).toBe('DOUBLON_DOCUMENT');
    expect(payload.texteSha256).toBe(SHA);
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });

  it('un texte DIFFÉRENT du dernier n’est pas un doublon : le dossier a bougé', async () => {
    prisma.documentPatientBiologie.findFirst.mockResolvedValue({ texte: 'Un texte antérieur.' });
    const response = await POST(postRequest({ idPatient: 'PAT1' }));
    expect(response.status).toBe(201);
    expect(prisma.documentPatientBiologie.create).toHaveBeenCalledTimes(1);
  });

  it('la garde est scopée au dossier : le doublon se cherche chez CE patient', async () => {
    prisma.documentPatientBiologie.findFirst.mockResolvedValue({ texte: TEXTE });
    await POST(postRequest({ idPatient: 'PAT1' }));
    // Sans `where`, la garde comparerait au dernier document d'un AUTRE
    // dossier et refuserait un geste parfaitement légitime.
    expect(prisma.documentPatientBiologie.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT1' } }),
    );
  });

  it('« le dernier » est départagé : l’horodatage seul ne suffit pas', async () => {
    prisma.documentPatientBiologie.findFirst.mockResolvedValue({ texte: TEXTE });
    await POST(postRequest({ idPatient: 'PAT1' }));
    // `genere_le` n'est pas unique, et deux lignes du même instant sont le cas
    // même que cette garde vise : sans départage, « le dernier » est indéterminé.
    expect(prisma.documentPatientBiologie.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ genereLe: 'desc' }, { id: 'desc' }] }),
    );
  });

  it('confirmer le doublon ne lève PAS la garde du registre — jetons séparés', async () => {
    // Un texte à la fois anxiogène et déjà consigné. Les deux jetons sont
    // séparés PAR DOMAINE : ce ne sont pas deux champs qui portent la même
    // valeur, ce sont deux valeurs différentes du même texte.
    expect(jetonDoublon(TEXTE_ANXIOGENE)).not.toBe(jetonRegistre(TEXTE_ANXIOGENE));
    genererDocumentPatientBiologie.mockReturnValue(documentGenere(TEXTE_ANXIOGENE));
    prisma.documentPatientBiologie.findFirst.mockResolvedValue({ texte: TEXTE_ANXIOGENE });
    const response = await POST(
      postRequest({ idPatient: 'PAT1', confirmerDoublonSha256: jetonDoublon(TEXTE_ANXIOGENE) }),
    );
    expect(response.status).toBe(409);
    const payload = (await response.json()) as { reason: string };
    expect(payload.reason).toBe('REGISTRE_ANXIOGENE');
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });

  it('le jeton du registre ne vaut pas confirmation du doublon, et réciproquement', async () => {
    genererDocumentPatientBiologie.mockReturnValue(documentGenere(TEXTE_ANXIOGENE));
    prisma.documentPatientBiologie.findFirst.mockResolvedValue({ texte: TEXTE_ANXIOGENE });
    // Le registre est confirmé, mais son jeton est recopié dans le champ du
    // doublon : la seconde garde ne doit pas s'ouvrir pour autant.
    const response = await POST(
      postRequest({
        idPatient: 'PAT1',
        confirmerTexteSha256: jetonRegistre(TEXTE_ANXIOGENE),
        confirmerDoublonSha256: jetonRegistre(TEXTE_ANXIOGENE),
      }),
    );
    expect(response.status).toBe(409);
    const payload = (await response.json()) as { reason: string };
    expect(payload.reason).toBe('DOUBLON_DOCUMENT');
    expect(prisma.documentPatientBiologie.create).not.toHaveBeenCalled();
  });

  it('les deux confirmations, chacune à son jeton, consignent', async () => {
    genererDocumentPatientBiologie.mockReturnValue(documentGenere(TEXTE_ANXIOGENE));
    prisma.documentPatientBiologie.findFirst.mockResolvedValue({ texte: TEXTE_ANXIOGENE });
    const response = await POST(
      postRequest({
        idPatient: 'PAT1',
        confirmerTexteSha256: jetonRegistre(TEXTE_ANXIOGENE),
        confirmerDoublonSha256: jetonDoublon(TEXTE_ANXIOGENE),
      }),
    );
    expect(response.status).toBe(201);
    expect(prisma.documentPatientBiologie.create).toHaveBeenCalledTimes(1);
  });
});
