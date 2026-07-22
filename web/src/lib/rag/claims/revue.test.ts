import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: { $queryRaw: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  compterClaimsRevue,
  deciderClaim,
  estClaimStatut,
  listerClaimsRevue,
  transitionAutorisee,
} from './revue';

/** Reconstitue le texte SQL d'un appel $queryRaw (tagged template). */
function sqlDeAppel(appel: unknown[]): string {
  return (appel[0] as readonly string[]).join('?');
}

/** Les valeurs paramétrées d'un appel $queryRaw. */
function parametresDeAppel(appel: unknown[]): unknown[] {
  return appel.slice(1);
}

describe('transitionAutorisee — machine à états fermée de la revue', () => {
  it('permet exactement les trois gestes praticien', () => {
    expect(transitionAutorisee('EN_ATTENTE_VALIDATION', 'VALIDE')).toBe(true);
    expect(transitionAutorisee('EN_ATTENTE_VALIDATION', 'REJETE')).toBe(true);
    expect(transitionAutorisee('VALIDE', 'EN_ATTENTE_VALIDATION')).toBe(true);
    expect(transitionAutorisee('REJETE', 'EN_ATTENTE_VALIDATION')).toBe(true);
  });

  it('refuse tout le reste — dont VALIDE ↔ REJETE sans repasser par la file', () => {
    expect(transitionAutorisee('VALIDE', 'REJETE')).toBe(false);
    expect(transitionAutorisee('REJETE', 'VALIDE')).toBe(false);
    expect(transitionAutorisee('VALIDE', 'VALIDE')).toBe(false);
    expect(transitionAutorisee('REJETE', 'REJETE')).toBe(false);
    expect(transitionAutorisee('EN_ATTENTE_VALIDATION', 'EN_ATTENTE_VALIDATION')).toBe(false);
  });
});

describe('estClaimStatut', () => {
  it('reconnaît les trois statuts et rien d’autre', () => {
    expect(estClaimStatut('EN_ATTENTE_VALIDATION')).toBe(true);
    expect(estClaimStatut('VALIDE')).toBe(true);
    expect(estClaimStatut('REJETE')).toBe(true);
    expect(estClaimStatut('valide')).toBe(false);
    expect(estClaimStatut('SUPPRIME')).toBe(false);
    expect(estClaimStatut('')).toBe(false);
  });
});

const LIGNE_CLAIM = {
  id: 'WN-CL-0056-001@v1.0',
  claim_id: 'WN-CL-0056-001',
  version_claim: 'v1.0',
  source_id: 'WN-SRC-0056',
  texte_normalise: 'Le magnésium contribue au fonctionnement normal du système nerveux.',
  classe_autorite: 'EFSA',
  niveau_preuve: 'B',
  typologie_lecture: 'déclaré',
  prescriptif: false,
  modele_reviseur: 'claude-sonnet-5',
  statut: 'EN_ATTENTE_VALIDATION',
  validateur: null,
  valide_at: null,
  metadata: { section: 'Micronutrition', page: 12 },
  created_at: new Date('2026-07-22T10:00:00.000Z'),
};

describe('listerClaimsRevue', () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
  });

  it('assemble claims, verbatims cités et drapeaux de dérive', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([LIGNE_CLAIM])
      .mockResolvedValueOnce([
        {
          claim_pk: 'WN-CL-0056-001@v1.0',
          chunk_id: 'WN-CH-0056-003',
          version_chunk: 'v1.0',
          section: 'Micronutrition',
          extrait: 'Extrait du verbatim…',
          longueur: 1200,
          sha_derive: true,
          supersedee: false,
        },
      ]);

    const liste = await listerClaimsRevue({ statut: 'EN_ATTENTE_VALIDATION' });

    expect(liste.total).toBe(1);
    expect(liste.claims).toHaveLength(1);
    const claim = liste.claims[0];
    expect(claim.claimId).toBe('WN-CL-0056-001');
    expect(claim.createdAt).toBe('2026-07-22T10:00:00.000Z');
    expect(claim.metadata).toEqual({ section: 'Micronutrition', page: 12 });
    expect(claim.sources).toEqual([
      {
        chunkId: 'WN-CH-0056-003',
        versionChunk: 'v1.0',
        section: 'Micronutrition',
        extrait: 'Extrait du verbatim…',
        tronque: true,
        shaDerive: true,
        supersedee: false,
      },
    ]);
  });

  it('ne cherche pas de liens quand la page est vide', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]).mockResolvedValueOnce([]);

    const liste = await listerClaimsRevue({ statut: 'VALIDE' });

    expect(liste).toEqual({ total: 0, claims: [] });
    // 2 requêtes (compte + page), jamais la 3e sur les liens.
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('borne la pagination : limit à 100 maximum, offset jamais négatif', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]).mockResolvedValueOnce([]);

    await listerClaimsRevue({ statut: 'EN_ATTENTE_VALIDATION', limit: 5000, offset: -10 });

    const appelPage = prisma.$queryRaw.mock.calls[1];
    expect(sqlDeAppel(appelPage)).toContain('LIMIT');
    // Paramètres de la page : statut, source ×2, limit clampé, offset plancher.
    expect(parametresDeAppel(appelPage)).toEqual(['EN_ATTENTE_VALIDATION', null, null, 100, 0]);
  });
});

describe('compterClaimsRevue', () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
  });

  it('compte par statut sur le même périmètre que la liste (active = true)', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { en_attente: BigInt(120), valide: BigInt(15), rejete: BigInt(1) },
    ]);

    const compteurs = await compterClaimsRevue();

    expect(compteurs).toEqual({ EN_ATTENTE_VALIDATION: 120, VALIDE: 15, REJETE: 1 });
    expect(sqlDeAppel(prisma.$queryRaw.mock.calls[0])).toContain('WHERE active = true');
  });
});

describe('deciderClaim', () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
  });

  const PARAMS = {
    id: 'WN-CL-0056-001@v1.0',
    validateur: 'praticien@wellneuro.fr',
  };

  it('refuse une transition hors machine SANS toucher la base', async () => {
    const resultat = await deciderClaim({
      ...PARAMS,
      decision: 'REJETE',
      statutAttendu: 'VALIDE',
    });
    expect(resultat).toEqual({ ok: false, raison: 'transition_invalide' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  const INTEGRITE_SAINE = [{ liens: BigInt(2), derives: BigInt(0) }];

  it('signe une validation : garde d’intégrité, puis UPDATE gardé par le statut attendu', async () => {
    prisma.$queryRaw.mockResolvedValueOnce(INTEGRITE_SAINE).mockResolvedValueOnce([
      {
        id: PARAMS.id,
        statut: 'VALIDE',
        validateur: 'praticien@wellneuro.fr',
        valide_at: new Date('2026-07-22T18:00:00.000Z'),
      },
    ]);

    const resultat = await deciderClaim({
      ...PARAMS,
      decision: 'VALIDE',
      statutAttendu: 'EN_ATTENTE_VALIDATION',
    });

    expect(resultat).toEqual({
      ok: true,
      claim: {
        id: PARAMS.id,
        statut: 'VALIDE',
        validateur: 'praticien@wellneuro.fr',
        valideAt: '2026-07-22T18:00:00.000Z',
      },
    });

    // L'UPDATE qui pose la signature D-003 est inspecté, pas seulement mocké :
    // cible, garde de concurrence (id + statut attendu + active) et paramètres.
    const appelUpdate = prisma.$queryRaw.mock.calls[1];
    const sql = sqlDeAppel(appelUpdate);
    expect(sql).toContain('UPDATE public.rag_corpus_claims');
    expect(sql).toContain('WHERE id = ?');
    expect(sql).toContain('AND statut = ?');
    expect(sql).toContain('AND active = true');
    expect(sql).toContain('RETURNING id, statut, validateur, valide_at');
    // valide_at est posé par la base (now()), jamais transmis en paramètre.
    expect(sql).toContain("valide_at = CASE WHEN ? = 'VALIDE' THEN now() ELSE NULL END");
    // Ordre des 6 placeholders : statut posé, CASE validateur (décision puis
    // e-mail), CASE valide_at (décision), garde WHERE (id puis statut attendu).
    expect(parametresDeAppel(appelUpdate)).toEqual([
      'VALIDE',
      'VALIDE',
      'praticien@wellneuro.fr',
      'VALIDE',
      PARAMS.id,
      'EN_ATTENTE_VALIDATION',
    ]);
  });

  it('refuse de signer un claim sans verbatim cité (sources_absentes)', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ liens: BigInt(0), derives: BigInt(0) }]);
    expect(
      await deciderClaim({ ...PARAMS, decision: 'VALIDE', statutAttendu: 'EN_ATTENTE_VALIDATION' }),
    ).toEqual({ ok: false, raison: 'sources_absentes' });
    // La garde refuse AVANT l'UPDATE : une seule requête est partie.
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('refuse de signer sur un verbatim modifié sous le lien (source_derivee)', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ liens: BigInt(2), derives: BigInt(1) }]);
    expect(
      await deciderClaim({ ...PARAMS, decision: 'VALIDE', statutAttendu: 'EN_ATTENTE_VALIDATION' }),
    ).toEqual({ ok: false, raison: 'source_derivee' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('ne fait pas la garde d’intégrité pour un rejet ou une annulation', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { id: PARAMS.id, statut: 'REJETE', validateur: 'praticien@wellneuro.fr', valide_at: null },
    ]);
    await deciderClaim({ ...PARAMS, decision: 'REJETE', statutAttendu: 'EN_ATTENTE_VALIDATION' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(sqlDeAppel(prisma.$queryRaw.mock.calls[0])).toContain('UPDATE public.rag_corpus_claims');
  });

  it('distingue claim introuvable et état divergent quand rien n’est mis à jour', async () => {
    // UPDATE ne touche rien, le claim n'existe pas → introuvable.
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    expect(
      await deciderClaim({ ...PARAMS, decision: 'REJETE', statutAttendu: 'EN_ATTENTE_VALIDATION' }),
    ).toEqual({ ok: false, raison: 'claim_introuvable' });

    // UPDATE ne touche rien, le claim existe → son statut a bougé sous l'écran.
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: PARAMS.id }]);
    expect(
      await deciderClaim({ ...PARAMS, decision: 'REJETE', statutAttendu: 'EN_ATTENTE_VALIDATION' }),
    ).toEqual({ ok: false, raison: 'etat_divergent' });
  });

  it('annule une décision : retour en attente accepté par la machine', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { id: PARAMS.id, statut: 'EN_ATTENTE_VALIDATION', validateur: null, valide_at: null },
    ]);

    const resultat = await deciderClaim({
      ...PARAMS,
      decision: 'EN_ATTENTE_VALIDATION',
      statutAttendu: 'VALIDE',
    });

    expect(resultat).toEqual({
      ok: true,
      claim: { id: PARAMS.id, statut: 'EN_ATTENTE_VALIDATION', validateur: null, valideAt: null },
    });
  });
});
