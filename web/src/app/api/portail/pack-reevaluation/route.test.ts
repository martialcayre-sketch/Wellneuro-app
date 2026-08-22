import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    questionnaireReponse: { findFirst: vi.fn() },
    consultation: { findFirst: vi.fn() },
    pack: { findMany: vi.fn() },
    packProposition: { findFirst: vi.fn(), create: vi.fn() },
    assignation: { create: vi.fn(), createMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET, POST } from './route';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

const compte = {
  idPatient: PATIENT.idPatient,
  actif: true,
  email: PATIENT.email,
  accessTokenRevoked: false,
  sessionsInvalidesAvant: null,
};

const PACK = {
  idPack: 'PACK_BASE',
  nom: 'Base de consultation',
  description: null,
  qids: ['Q1', 'Q2', 'Q3'],
  parDefaut: true,
};

function cookie(): string {
  return `wn_portail=${encodeURIComponent(signPatientSession(PATIENT))}`;
}

function get(avecCookie = true): Request {
  return new Request('http://localhost/api/portail/pack-reevaluation', {
    headers: avecCookie ? { cookie: cookie() } : {},
  });
}

function post(body: unknown, avecCookie = true): Request {
  return new Request('http://localhost/api/portail/pack-reevaluation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(avecCookie ? { cookie: cookie() } : {}) },
    body: JSON.stringify(body),
  });
}

/** Dernière réponse transmise il y a N mois. */
function transmisIlYa(mois: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - mois);
  return { dateReponse: d };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  prisma.patient.findUnique.mockResolvedValue(compte);
  prisma.questionnaireReponse.findFirst.mockResolvedValue(transmisIlYa(9));
  prisma.consultation.findFirst.mockResolvedValue({ idPackAssigne: PACK.idPack });
  prisma.pack.findMany.mockResolvedValue([PACK]);
  prisma.packProposition.findFirst.mockResolvedValue(null);
  prisma.packProposition.create.mockResolvedValue({});
});

describe('GET /api/portail/pack-reevaluation', () => {
  it('sans session portail, 404 et aucune lecture métier', async () => {
    const res = await GET(get(false));
    expect(res.status).toBe(404);
    expect(prisma.pack.findMany).not.toHaveBeenCalled();
  });

  it('propose le pack au patient qui revient après une longue absence', async () => {
    const res = await GET(get());
    const corps = await res.json();
    expect(corps.proposition).toMatchObject({ idPack: PACK.idPack });
    expect(corps.proposition.corps).toMatch(/Rien ne vous est assigné/i);
  });

  it('ne propose rien à un patient actif — il n’a rien interrompu', async () => {
    prisma.questionnaireReponse.findFirst.mockResolvedValue(transmisIlYa(1));
    expect((await (await GET(get())).json()).proposition).toBeNull();
  });

  it('ne propose rien à un patient qui n’a jamais répondu', async () => {
    prisma.questionnaireReponse.findFirst.mockResolvedValue(null);
    expect((await (await GET(get())).json()).proposition).toBeNull();
  });

  // LE point de la réserve : une proposition qui revient est une relance.
  it('ne repose pas la question après un refus', async () => {
    prisma.packProposition.findFirst.mockResolvedValue({ idPack: PACK.idPack, statut: 'declinee' });
    expect((await (await GET(get())).json()).proposition).toBeNull();
  });

  it('ne repose pas la question après une acceptation non plus', async () => {
    prisma.packProposition.findFirst.mockResolvedValue({ idPack: PACK.idPack, statut: 'acceptee' });
    expect((await (await GET(get())).json()).proposition).toBeNull();
  });

  // Un GET qui écrirait se déclencherait au moindre préchargement du navigateur.
  it('n’écrit jamais rien', async () => {
    await GET(get());
    expect(prisma.packProposition.create).not.toHaveBeenCalled();
  });

  // LOT-03 — LE PACK DÉJÀ REMPLI A ÉTÉ DÉSACTIVÉ ENTRE-TEMPS.
  //
  // Aucun des cas ci-dessus ne portait sur cet état ; le retrait des packs le
  // crée à la chaîne. La consultation validée continue de pointer son
  // `idPackAssigne` — rien ne le réécrit —, mais le pack n'existe plus pour
  // qui filtre sur `actif: true`. La route doit alors retomber sur le pack
  // `parDefaut`, jamais proposer un pack retiré du catalogue.
  //
  // Le double de `findMany` ci-dessous REJOUE le filtre `actif` au lieu de
  // rendre la fixture quoi qu'on demande : c'est ce qui rend le cas
  // falsifiable. Retirer `actif: true` du `where` de la route ferait remonter
  // le pack désactivé, `choisirPackPropose` le préférerait au pack par défaut
  // (il est le « déjà rempli »), et l'attente ci-dessous rougirait.
  describe('quand le pack de la dernière consultation validée est désactivé', () => {
    const PACK_RETIRE = {
      idPack: 'PACK_TEST_RETIRE',
      nom: 'Ensemble retiré du catalogue',
      description: null,
      qids: ['Q1', 'Q2'],
      parDefaut: false,
      actif: false,
    };
    const CATALOGUE = [{ ...PACK, actif: true }, PACK_RETIRE];

    type OuClause = { idPack?: string; parDefaut?: boolean };
    type ArgsFindMany = { where: { actif?: boolean; OR?: OuClause[] } };

    beforeEach(() => {
      // La consultation validée pointe toujours le pack désactivé.
      prisma.consultation.findFirst.mockResolvedValue({ idPackAssigne: PACK_RETIRE.idPack });
      prisma.pack.findMany.mockImplementation(async (args: ArgsFindMany) => {
        const ou = args.where.OR ?? [];
        return CATALOGUE.filter(p =>
          (args.where.actif === undefined || p.actif === args.where.actif)
          && (ou.length === 0
            || ou.some(c => (c.idPack !== undefined && c.idPack === p.idPack)
              || (c.parDefaut !== undefined && c.parDefaut === p.parDefaut))),
        );
      });
    });

    it('propose le pack par défaut, jamais le pack désactivé', async () => {
      const corps = await (await GET(get())).json();
      expect(corps.proposition).not.toBeNull();
      expect(corps.proposition.idPack).toBe(PACK.idPack);
      expect(corps.proposition.corps).toContain(PACK.nom);
      expect(corps.proposition.corps).not.toContain(PACK_RETIRE.nom);
    });

    // Sans pack `parDefaut` actif pour le recueillir, il n'y a plus de
    // proposition du tout — surtout pas celle du pack retiré.
    it('ne propose rien si le pack par défaut manque aussi', async () => {
      prisma.pack.findMany.mockResolvedValue([]);
      expect((await (await GET(get())).json()).proposition).toBeNull();
    });
  });
});

describe('POST /api/portail/pack-reevaluation', () => {
  it('sans session portail, 404 et aucune écriture', async () => {
    expect((await POST(post({ idPack: PACK.idPack, reponse: 'declinee' }, false))).status).toBe(404);
    expect(prisma.packProposition.create).not.toHaveBeenCalled();
  });

  it('enregistre un refus, et l’accusé promet que la question ne reviendra pas', async () => {
    const res = await POST(post({ idPack: PACK.idPack, reponse: 'declinee' }));
    expect(res.status).toBe(200);
    expect((await res.json()).accuse).toMatch(/ne vous sera pas reposée/i);

    expect(prisma.packProposition.create).toHaveBeenCalledTimes(1);
    expect(prisma.packProposition.create.mock.calls[0][0].data).toMatchObject({
      idPatient: PATIENT.idPatient,
      idPack: PACK.idPack,
      statut: 'declinee',
      acteurRole: 'patient',
    });
  });

  // Invariant non négociable de la campagne : proposé, jamais assigné.
  it('n’assigne rien, même quand le patient accepte', async () => {
    await POST(post({ idPack: PACK.idPack, reponse: 'acceptee' }));
    expect(prisma.assignation.create).not.toHaveBeenCalled();
    expect(prisma.assignation.createMany).not.toHaveBeenCalled();
  });

  it('chaîne la réponse sur la précédente plutôt que de la réécrire', async () => {
    prisma.packProposition.findFirst.mockResolvedValue({ id: 'PROP_1' });
    await POST(post({ idPack: PACK.idPack, reponse: 'acceptee' }));
    expect(prisma.packProposition.create.mock.calls[0][0].data.supersedesPropositionId).toBe('PROP_1');
  });

  it('refuse un statut inventé', async () => {
    expect((await POST(post({ idPack: PACK.idPack, reponse: 'peut_etre' }))).status).toBe(400);
    expect(prisma.packProposition.create).not.toHaveBeenCalled();
  });

  it('refuse une requête sans pack', async () => {
    expect((await POST(post({ reponse: 'declinee' }))).status).toBe(400);
    expect(prisma.packProposition.create).not.toHaveBeenCalled();
  });
});
