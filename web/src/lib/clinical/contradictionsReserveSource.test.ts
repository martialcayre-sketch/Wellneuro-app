import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONFLITS_SOURCES_V1 } from './conflitsSourcesV1';
import type { ContradictionAffichee } from './contradictionsService';

// [[D-491]] — LA RÉSERVE SUR LA SOURCE d'une discordance ou d'un conflit de
// sources. Le constat reste servi, et le frein de l'extinction ne bouge pas :
// seul l'affichage porte la réserve. Un corpus illisible ne tait rien.

const { prismaMock, admissibilite } = vi.hoisted(() => ({
  prismaMock: {
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
  },
  admissibilite: { illisible: false, nonAdmissibles: new Set<string>(), appels: 0 },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/generated/prisma', () => ({ Prisma: { DbNull: Symbol('DbNull') } }));
vi.mock('./admissibiliteClaims', async (importOriginal) => {
  const reel = await importOriginal<typeof import('./admissibiliteClaims')>();
  return {
    ...reel,
    claimsAdmissiblesAuCorpus: async (references: { claimId: string; versionClaim: string }[]) => {
      admissibilite.appels += 1;
      if (admissibilite.illisible) return null;
      return new Set(
        references
          .map(r => `${r.claimId}::${r.versionClaim}`)
          .filter(cle => !admissibilite.nonAdmissibles.has(cle)),
      );
    },
  };
});

import { avecReservesDeSource, contradictionsPourPatient } from './contradictionsService';

function affichee(forme: ContradictionAffichee['forme'], claims: { claimId: string; versionClaim: string }[]): ContradictionAffichee {
  return {
    id: `${forme}-1`,
    forme,
    description: 'Constat de banc.',
    actionSuggeree: 'Clarifier en entretien.',
    hypotheses: [],
    limitations: [],
    passations: [],
    ecartJours: null,
    claims,
    importance: 'useful_not_urgent',
    resolution: { statut: 'ouverte' },
    regleId: `${forme}-1`,
  } as ContradictionAffichee;
}

const C1 = { claimId: 'WN-CL-1111-001', versionClaim: 'v1.0' };
const C2 = { claimId: 'WN-CL-2222-002', versionClaim: 'v1.0' };

beforeEach(() => {
  admissibilite.illisible = false;
  admissibilite.nonAdmissibles.clear();
  admissibilite.appels = 0;
});

describe('D-491 — réserve sur la source, à l’affichage', () => {
  it('tous les claims admissibles : aucune réserve, constats inchangés', async () => {
    const entree = [affichee('DISCORDANCE', [C1]), affichee('CONFLIT_SOURCES', [C1, C2])];
    const sortie = await avecReservesDeSource(entree);
    expect(sortie).toEqual(entree);
    expect(admissibilite.appels).toBe(1);
  });

  it('discordance au claim non admissible : le constat reste, avec la réserve et son couple', async () => {
    admissibilite.nonAdmissibles.add('WN-CL-1111-001::v1.0');
    const [constat] = await avecReservesDeSource([affichee('DISCORDANCE', [C1])]);
    expect(constat.description).toBe('Constat de banc.');
    expect(constat.resolution).toEqual({ statut: 'ouverte' });
    expect(constat.reserveSource).toEqual({ motif: 'claims_non_admissibles', claims: [C1] });
  });

  it('conflit dont un des deux claims n’est pas admissible : le conflit reste, seul ce claim est désigné', async () => {
    admissibilite.nonAdmissibles.add('WN-CL-2222-002::v1.0');
    const [constat] = await avecReservesDeSource([affichee('CONFLIT_SOURCES', [C1, C2])]);
    expect(constat.forme).toBe('CONFLIT_SOURCES');
    expect(constat.reserveSource).toEqual({ motif: 'claims_non_admissibles', claims: [C2] });
  });

  it('corpus illisible : chaque discordance et chaque conflit restent servis, avec « validité non vérifiée »', async () => {
    admissibilite.illisible = true;
    const sortie = await avecReservesDeSource([affichee('DISCORDANCE', [C1]), affichee('CONFLIT_SOURCES', [C1, C2])]);
    expect(sortie).toHaveLength(2);
    for (const constat of sortie) expect(constat.reserveSource).toEqual({ motif: 'validite_non_verifiee' });
  });

  it('une convergence n’est pas concernée (claims de la table d’orientation, t71) : ni lecture, ni réserve', async () => {
    admissibilite.nonAdmissibles.add('WN-CL-1111-001::v1.0');
    const entree = [affichee('CONVERGENCE', [C1])];
    const sortie = await avecReservesDeSource(entree);
    expect(sortie).toEqual(entree);
    expect(admissibilite.appels).toBe(0);
  });

  it('aucun constat : le corpus n’est pas lu', async () => {
    expect(await avecReservesDeSource([])).toEqual([]);
    expect(admissibilite.appels).toBe(0);
  });
});

describe('D-491 — de bout en bout sur le registre signé du dépôt', () => {
  const conflitPublie = CONFLITS_SOURCES_V1.find(conflit => conflit.statut === 'publiee');

  beforeEach(() => {
    vi.stubEnv('WN_ENABLE_CONTRADICTIONS_NNPP2', '1');
    prismaMock.questionnaireReponse.findMany.mockResolvedValue([]);
    prismaMock.consultation.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('le claim NON CITÉ par le dossier n’est plus admissible : le conflit est servi, avec la réserve sur ce seul claim', async () => {
    if (!conflitPublie) throw new Error('le registre du dépôt doit porter un conflit publié');
    const [cite, autre] = conflitPublie.claims;
    admissibilite.nonAdmissibles.add(`${autre.claimId}::${autre.versionClaim}`);
    const affichees = await contradictionsPourPatient('PAT-1', [cite]);
    const constat = affichees.find(c => c.id === conflitPublie.id);
    expect(constat?.forme).toBe('CONFLIT_SOURCES');
    expect(constat?.resolution.statut).toBe('escaladee_praticien');
    expect(constat?.reserveSource).toEqual({
      motif: 'claims_non_admissibles',
      claims: [{ claimId: autre.claimId, versionClaim: autre.versionClaim }],
    });
  });

  it('tous admissibles : le conflit est servi sans réserve', async () => {
    if (!conflitPublie) throw new Error('le registre du dépôt doit porter un conflit publié');
    const affichees = await contradictionsPourPatient('PAT-1', [conflitPublie.claims[0]]);
    const constat = affichees.find(c => c.id === conflitPublie.id);
    expect(constat).toBeDefined();
    expect(constat?.reserveSource).toBeUndefined();
  });
});
