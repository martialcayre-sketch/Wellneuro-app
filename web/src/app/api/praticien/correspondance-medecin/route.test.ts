import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    trustChoiceEvent: { findMany: vi.fn() },
    syntheseIA: { findUnique: vi.fn() },
    correspondanceMedecin: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    correspondancePatient: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';
// LE GÉNÉRATEUR RÉEL, jamais une copie de sa provenance : c'est lui qui écrit
// l'ancre consignée. Le banc de concordance ci-dessous épingle ainsi la
// constante de version de la route sur la source qui la produit — recopier la
// chaîne ici neutraliserait le seul garde-fou anti-dérive du lot.
import { genererCourrierBiologie } from '@/lib/biology-library/courrier';
import {
  INDICATIONS_BIOLOGIE_METADATA,
  INDICATIONS_BIOLOGIE_SHA256,
} from '@/lib/biology-library/indicationsBiologieV1';

const URL_BASE = 'http://localhost/api/praticien/correspondance-medecin';

function getRequest(query = 'idPatient=PAT_TEST'): Request {
  return new Request(`${URL_BASE}?${query}`);
}

function postRequest(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const corps = (partiel: Record<string, unknown> = {}) => ({
  idPatient: 'PAT_TEST',
  sens: 'sortant',
  medecinLibelle: 'Dr Martin, médecin traitant',
  texte: 'Document de suivi remis au patient pour son médecin.',
  ...partiel,
});

const PATIENT_EN_SUIVI = {
  praticienEmail: 'praticien@wellneuro.fr',
  actif: true,
  suiviClotureLe: null,
};

/** Provenance telle que le générateur la stampe — source de vérité du banc. */
function provenanceReelle(): { ancrageHash: string; version: string } {
  const genere = genererCourrierBiologie({
    patientId: 'PAT_TEST',
    lignes: [
      {
        panelCode: 'PANEL_TEST',
        libelle: 'Bilan martial',
        niveau: '1',
        objectif: null,
        statut: 'recommande',
        declencheurRempli: null,
        condition: null,
        motifs: [],
        justificationClaims: [],
        analytes: [],
        ratios: [],
      },
    ],
    tableSha256: INDICATIONS_BIOLOGIE_SHA256,
    dateCourrier: '2026-08-20T09:00:00.000Z',
  });
  if (!genere.ok) throw new Error(`générateur en refus : ${genere.raison}`);
  const provenance = genere.courrier.document.blocs[0]?.provenance;
  if (!provenance) throw new Error('courrier sans provenance');
  return { ancrageHash: provenance.ancrageHash, version: provenance.version };
}

function ligneFil(ancrage: { ancrageSha256: string | null; ancrageVersion: string | null }) {
  return {
    id: 'CORR_ANCRE',
    sens: 'sortant',
    medecinLibelle: 'Dr Martin',
    texte: 'Docteur, …',
    idSynthese: null,
    echangeLe: null,
    consigneLe: new Date('2026-08-20T09:00:00.000Z'),
    ...ancrage,
  };
}

async function ancrageServi(
  ancrage: { ancrageSha256: string | null; ancrageVersion: string | null },
): Promise<string> {
  prisma.correspondanceMedecin.findMany.mockResolvedValue([ligneFil(ancrage)]);
  const json = await (await GET(getRequest())).json();
  return json.correspondances[0].ancrage;
}

describe('/api/praticien/correspondance-medecin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue(PATIENT_EN_SUIVI);
    prisma.trustChoiceEvent.findMany.mockResolvedValue([]);
    prisma.correspondanceMedecin.findMany.mockResolvedValue([]);
    prisma.correspondancePatient.findMany.mockResolvedValue([]);
    prisma.syntheseIA.findUnique.mockResolvedValue(null);
    prisma.correspondanceMedecin.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'CORR_1',
        sens: data.sens,
        medecinLibelle: data.medecinLibelle,
        texte: data.texte,
        idSynthese: data.idSynthese ?? null,
        echangeLe: data.echangeLe ?? null,
        // La base pose le présent : le mock reflète ce contrat, pas l'appelant.
        consigneLe: new Date('2026-07-22T17:00:00.000Z'),
      }),
    );
  });

  it('exige une session', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(401);
    expect((await POST(postRequest(corps()))).status).toBe(401);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('refuse un patient d’un autre praticien sans révéler autre chose', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...PATIENT_EN_SUIVI,
      praticienEmail: 'autre@wellneuro.fr',
    });
    expect((await GET(getRequest())).status).toBe(403);
    expect((await POST(postRequest(corps()))).status).toBe(403);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
    // Un refus ne se journalise pas : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('le GET accessible journalise la lecture du fil, le POST jamais (G-TRUST-04)', async () => {
    expect((await GET(getRequest())).status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_TEST',
        praticienEmail: 'praticien@wellneuro.fr',
        route: '/api/praticien/correspondance-medecin',
        methode: 'GET',
      },
    });
    // Une consignation laisse déjà sa propre trace datée et attribuée (GD-1).
    prisma.journalAccesDossier.create.mockClear();
    expect((await POST(postRequest(corps()))).status).toBe(201);
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('répond 404 sur un patient inconnu', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await POST(postRequest(corps()))).status).toBe(404);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('valide l’identifiant patient', async () => {
    expect((await GET(getRequest('idPatient='))).status).toBe(400);
    expect((await GET(getRequest('idPatient=PAT%20TEST'))).status).toBe(400);
  });

  it('refuse un corps illisible et un sens invalide', async () => {
    const illisible = new Request(URL_BASE, { method: 'POST', body: '{pas du json' });
    expect((await POST(illisible)).status).toBe(400);
    const reponse = await POST(postRequest(corps({ sens: 'lateral' })));
    expect(reponse.status).toBe(400);
    const json = await reponse.json();
    expect(json.reason).toBe('sens_invalide');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  // FM-2 : la correspondance est une pièce du dossier — un dossier clos n'en
  // reçoit plus, quel que soit le sens. Le chemin propre pour une réponse
  // arrivée après clôture : rouvrir, transcrire, reclôturer.
  it('refuse la consignation sur dossier clos, pour les deux sens', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...PATIENT_EN_SUIVI,
      suiviClotureLe: new Date('2026-07-01T00:00:00.000Z'),
    });
    for (const sens of ['sortant', 'entrant']) {
      const reponse = await POST(postRequest(corps({ sens })));
      expect(reponse.status).toBe(409);
      const json = await reponse.json();
      expect(json.reason).toBe('dossier_cloture');
    }
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('la lecture n’est jamais refusée sur dossier clos, et l’écran est prévenu', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...PATIENT_EN_SUIVI,
      suiviClotureLe: new Date('2026-07-01T00:00:00.000Z'),
    });
    const reponse = await GET(getRequest());
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.accepteConsignation).toBe(false);
  });

  it('refuse une adresse e-mail dans le libellé médecin (minimisation)', async () => {
    const reponse = await POST(postRequest(corps({ medecinLibelle: 'dr@cabinet.fr' })));
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).reason).toBe('medecin_libelle_email');
  });

  it('refuse une synthèse inconnue ou appartenant à un autre patient, même 404', async () => {
    prisma.syntheseIA.findUnique.mockResolvedValue(null);
    const inconnue = await POST(postRequest(corps({ idSynthese: 'SYN_X' })));
    expect(inconnue.status).toBe(404);
    expect((await inconnue.json()).reason).toBe('synthese_not_found');

    prisma.syntheseIA.findUnique.mockResolvedValue({ idPatient: 'PAT_AUTRE' });
    const autrui = await POST(postRequest(corps({ idSynthese: 'SYN_Y' })));
    expect(autrui.status).toBe(404);
    expect((await autrui.json()).reason).toBe('synthese_not_found');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  // Le cœur du lot : consigner au présent, sans jamais transmettre la date de
  // consignation.
  it('consigne un envoi puis une réponse, sans jamais transmettre consigneLe', async () => {
    for (const sens of ['sortant', 'entrant']) {
      const reponse = await POST(
        postRequest(corps({ sens, echangeLe: '2026-07-20' })),
      );
      expect(reponse.status).toBe(201);
      const json = await reponse.json();
      expect(json.ok).toBe(true);
      expect(json.correspondance.sens).toBe(sens);
    }
    for (const appel of prisma.correspondanceMedecin.create.mock.calls) {
      const data = appel[0].data as Record<string, unknown>;
      expect(Object.keys(data)).not.toContain('consigneLe');
      expect(Object.keys(data)).not.toContain('consigne_le');
      expect(data.praticienEmail).toBe('praticien@wellneuro.fr');
    }
  });

  it('expose le fil avec l’état du consentement de partage', async () => {
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      {
        id: 'CORR_1',
        sens: 'entrant',
        medecinLibelle: 'Dr Martin',
        texte: 'Réponse du médecin.',
        idSynthese: 'SYN_DISPARUE',
        echangeLe: null,
        consigneLe: new Date('2026-07-22T17:00:00.000Z'),
      },
    ]);
    prisma.trustChoiceEvent.findMany.mockResolvedValue([
      {
        finalite: 'partage_medecin_traitant',
        statut: 'accorde',
        enregistreLe: new Date('2026-07-10T00:00:00.000Z'),
      },
    ]);
    const reponse = await GET(getRequest());
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.partageMedecinTraitant).toBe('accorde');
    // Référence souple : un id de synthèse disparu est exposé tel quel, la
    // lecture ne casse pas (AC-5 de la revue de la PR 1).
    expect(json.correspondances[0].idSynthese).toBe('SYN_DISPARUE');
  });

  it('expose la chronologie patient sans corps de message ni adresse', async () => {
    prisma.correspondancePatient.findMany.mockResolvedValue([
      {
        id: 'CP_1',
        type: 'booklet',
        objet: 'Envoi du bilan neuronutritionnel',
        statut: 'Envoye',
        canal: 'email',
        referenceType: 'synthese',
        referenceId: 'SYN_1',
        enregistreLe: new Date('2026-07-26T12:00:00.000Z'),
      },
    ]);
    const json = await (await GET(getRequest())).json();
    expect(json.correspondancesPatient).toEqual([
      expect.objectContaining({
        objet: 'Envoi du bilan neuronutritionnel',
        statut: 'Envoye',
        enregistreLe: '2026-07-26T12:00:00.000Z',
      }),
    ]);
    expect(JSON.stringify(json.correspondancesPatient)).not.toContain('@');
    expect(JSON.stringify(json.correspondancesPatient)).not.toContain('texte');
  });

  it('une lettre dont l’ancre concorde avec la table vivante est dite concordante', async () => {
    const { ancrageHash, version } = provenanceReelle();
    expect(await ancrageServi({ ancrageSha256: ancrageHash, ancrageVersion: version })).toBe(
      'concordante',
    );
  });

  it('une version différente périme la lettre, MÊME à SHA identique', async () => {
    // CE BANC TUE LA MUTATION « comparer le seul ancrageSha256 » : sous cette
    // mutation la lettre passerait pour concordante, et une table re-signée
    // sous une version neuve deviendrait invisible.
    const { ancrageHash } = provenanceReelle();
    expect(
      await ancrageServi({ ancrageSha256: ancrageHash, ancrageVersion: 'indications-biologie-v2' }),
    ).toBe('perimee');
  });

  it('un SHA différent périme la lettre, à version identique', async () => {
    const { version } = provenanceReelle();
    expect(await ancrageServi({ ancrageSha256: 'f'.repeat(64), ancrageVersion: version })).toBe(
      'perimee',
    );
  });

  it('une lettre sans ancre n’est PAS périmée — elle ne dit rien (DC-24)', async () => {
    expect(await ancrageServi({ ancrageSha256: null, ancrageVersion: null })).toBe('sans_ancrage');
    // Ancre à moitié, DANS LES DEUX SENS : le CHECK SQL l'interdit en base ; si
    // elle arrivait, elle resterait une donnée absente, jamais un défaut
    // affiché. Le second sens n'est pas décoratif — sans lui, retirer le terme
    // `!sha` de la garde passe inaperçu et une ancre {null, version} sortirait
    // `perimee` (constat M1 de la revue du 2026-08-20).
    const { ancrageHash, version } = provenanceReelle();
    expect(await ancrageServi({ ancrageSha256: ancrageHash, ancrageVersion: null })).toBe(
      'sans_ancrage',
    );
    expect(await ancrageServi({ ancrageSha256: null, ancrageVersion: version })).toBe(
      'sans_ancrage',
    );
  });

  it('ni le SHA ni la version ne traversent HTTP — seul le verdict', async () => {
    const { ancrageHash, version } = provenanceReelle();
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      ligneFil({ ancrageSha256: ancrageHash, ancrageVersion: version }),
    ]);
    const charge = JSON.stringify((await (await GET(getRequest())).json()).correspondances);
    expect(charge).not.toContain(ancrageHash);
    expect(charge).not.toContain(version);
    expect(charge).toContain('concordante');
  });

  it('une correspondance consignée à la main n’a pas d’ancre, et le dit', async () => {
    prisma.correspondanceMedecin.create.mockResolvedValue(
      ligneFil({ ancrageSha256: null, ancrageVersion: null }),
    );
    const json = await (await POST(postRequest(corps()))).json();
    expect(json.correspondance.ancrage).toBe('sans_ancrage');
  });

  it('les trois porteurs de la version ne divergent pas — métadonnée, estampille, comparaison', async () => {
    // TROIS littéraux `indications-biologie-v1` coexistent : la métadonnée de
    // la table (qui fait foi), celui qu'estampille `genererCourrierBiologie`
    // (en dur, NON dérivé de la métadonnée), et celui que la route compare.
    // Aucun n'est recopié ici : la métadonnée est lue, l'estampille est
    // générée, et la comparaison est éprouvée à travers la route.
    //
    // La question que ce banc rendait visible est TRANCHÉE : [[D-079]]
    // (2026-08-20) pose que LE SHA FAIT FOI — une re-signature sans changement
    // de contenu ne périme aucune lettre. Ce banc ne garde donc plus une
    // question ouverte, il garde la cohérence des trois porteurs : un bump de
    // `INDICATIONS_BIOLOGIE_METADATA.version` le fait rougir, et c'est un
    // humain qui décidera s'il faut suivre l'estampille ou la laisser.
    const { version } = provenanceReelle();
    expect(version).toBe(INDICATIONS_BIOLOGIE_METADATA.version);
    expect(
      await ancrageServi({ ancrageSha256: INDICATIONS_BIOLOGIE_SHA256, ancrageVersion: version }),
    ).toBe('concordante');
  });

  it('sans choix exprimé, le consentement est null (jamais deviné)', async () => {
    const json = await (await GET(getRequest())).json();
    expect(json.partageMedecinTraitant).toBeNull();
  });
});
