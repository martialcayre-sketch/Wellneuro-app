import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => {
  const spies = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  // La transaction remet LES MÊMES espions en jeu : les tests prouvent ainsi
  // que l'UPDATE du claim et l'INSERT du journal passent tous deux par le
  // client transactionnel (dette « une même transaction » de la migration).
  spies.$transaction.mockImplementation(async (cb: (tx: typeof spies) => Promise<unknown>) =>
    cb(spies),
  );
  return { prisma: spies };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  basculerLot,
  compterClaimsRevue,
  deciderClaim,
  deciderLot,
  ECHANTILLON_MIN,
  elementJournalClaim,
  estClaimStatut,
  listerClaimsRevue,
  sanitiserQuestionnaire,
  sanitiserVerdicts,
  tailleEchantillon,
  tirerEchantillon,
  tirerIndicesEchantillon,
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
    prisma.$executeRaw.mockReset();
    prisma.$transaction.mockClear();
  });

  const PARAMS = {
    id: 'WN-CL-0056-001@v1.0',
    validateur: 'praticien@wellneuro.fr',
  };

  const LIGNE_RETOURNEE = {
    id: PARAMS.id,
    claim_id: 'WN-CL-0056-001',
    version_claim: 'v1.0',
    source_id: 'WN-SRC-0056',
    statut: 'VALIDE',
    validateur: 'praticien@wellneuro.fr',
    valide_at: new Date('2026-07-22T18:00:00.000Z'),
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

  it('refuse un rejet sans motif SANS toucher la base (dette v1)', async () => {
    const resultat = await deciderClaim({
      ...PARAMS,
      decision: 'REJETE',
      statutAttendu: 'EN_ATTENTE_VALIDATION',
      motif: '   ',
    });
    expect(resultat).toEqual({ ok: false, raison: 'motif_requis' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  const INTEGRITE_SAINE = [{ liens: BigInt(2), derives: BigInt(0) }];

  it('signe une validation : garde d’intégrité, UPDATE gardé, journal DANS la transaction', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce(INTEGRITE_SAINE)
      .mockResolvedValueOnce([LIGNE_RETOURNEE]);
    prisma.$executeRaw.mockResolvedValueOnce(1);

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

    // L'UPDATE qui pose la signature D-003 est inspecté, pas seulement mocké.
    const appelUpdate = prisma.$queryRaw.mock.calls[1];
    const sql = sqlDeAppel(appelUpdate);
    expect(sql).toContain('UPDATE public.rag_corpus_claims');
    expect(sql).toContain('WHERE id = ?');
    expect(sql).toContain('AND statut = ?');
    expect(sql).toContain('AND active = true');
    expect(sql).toContain('RETURNING id, claim_id, version_claim, source_id, statut, validateur, valide_at');
    expect(sql).toContain("valide_at = CASE WHEN ? = 'VALIDE' THEN now() ELSE NULL END");
    expect(parametresDeAppel(appelUpdate)).toEqual([
      'VALIDE',
      'VALIDE',
      'praticien@wellneuro.fr',
      'VALIDE',
      PARAMS.id,
      'EN_ATTENTE_VALIDATION',
    ]);

    // La ligne de journal part DANS la même transaction que l'UPDATE : une
    // transaction ouverte, l'UPDATE puis l'INSERT s'y succèdent dans l'ordre.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    const appelJournal = prisma.$executeRaw.mock.calls[0];
    const sqlJournal = sqlDeAppel(appelJournal);
    expect(sqlJournal).toContain('INSERT INTO public.rag_corpus_claim_decisions');
    expect(sqlJournal).toContain("'decision_individuelle'");
    const ordreUpdate = prisma.$queryRaw.mock.invocationCallOrder[1];
    const ordreJournal = prisma.$executeRaw.mock.invocationCallOrder[0];
    expect(ordreJournal).toBeGreaterThan(ordreUpdate);
    // Contenu journalisé : décision, motif (null), validateur, source, élément.
    const params = parametresDeAppel(appelJournal);
    expect(params[0]).toBe('VALIDE');
    expect(params[1]).toBeNull();
    expect(params[2]).toBe('praticien@wellneuro.fr');
    expect(params[3]).toBe('WN-SRC-0056');
    expect(JSON.parse(params[4] as string)).toEqual([
      {
        id: PARAMS.id,
        claimId: 'WN-CL-0056-001',
        versionClaim: 'v1.0',
        statutAvant: 'EN_ATTENTE_VALIDATION',
        statutApres: 'VALIDE',
      },
    ]);
  });

  it('refuse de signer un claim sans verbatim cité (sources_absentes)', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ liens: BigInt(0), derives: BigInt(0) }]);
    expect(
      await deciderClaim({ ...PARAMS, decision: 'VALIDE', statutAttendu: 'EN_ATTENTE_VALIDATION' }),
    ).toEqual({ ok: false, raison: 'sources_absentes' });
    // La garde refuse AVANT l'UPDATE : une seule requête, aucun journal.
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('refuse de signer sur un verbatim modifié sous le lien (source_derivee)', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ liens: BigInt(2), derives: BigInt(1) }]);
    expect(
      await deciderClaim({ ...PARAMS, decision: 'VALIDE', statutAttendu: 'EN_ATTENTE_VALIDATION' }),
    ).toEqual({ ok: false, raison: 'source_derivee' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('rejette avec motif : pas de garde d’intégrité, journal avec le motif', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { ...LIGNE_RETOURNEE, statut: 'REJETE', valide_at: null },
    ]);
    prisma.$executeRaw.mockResolvedValueOnce(1);

    await deciderClaim({
      ...PARAMS,
      decision: 'REJETE',
      statutAttendu: 'EN_ATTENTE_VALIDATION',
      motif: 'Sur-généralisation du propos source.',
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(sqlDeAppel(prisma.$queryRaw.mock.calls[0])).toContain('UPDATE public.rag_corpus_claims');
    const params = parametresDeAppel(prisma.$executeRaw.mock.calls[0]);
    expect(params[0]).toBe('REJETE');
    expect(params[1]).toBe('Sur-généralisation du propos source.');
  });

  it('distingue claim introuvable et état divergent — et ne journalise RIEN', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    expect(
      await deciderClaim({
        ...PARAMS,
        decision: 'REJETE',
        statutAttendu: 'EN_ATTENTE_VALIDATION',
        motif: 'x',
      }),
    ).toEqual({ ok: false, raison: 'claim_introuvable' });

    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: PARAMS.id }]);
    expect(
      await deciderClaim({
        ...PARAMS,
        decision: 'REJETE',
        statutAttendu: 'EN_ATTENTE_VALIDATION',
        motif: 'x',
      }),
    ).toEqual({ ok: false, raison: 'etat_divergent' });

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('annule une décision : retour en attente accepté et journalisé sans motif exigé', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { ...LIGNE_RETOURNEE, statut: 'EN_ATTENTE_VALIDATION', validateur: null, valide_at: null },
    ]);
    prisma.$executeRaw.mockResolvedValueOnce(1);

    const resultat = await deciderClaim({
      ...PARAMS,
      decision: 'EN_ATTENTE_VALIDATION',
      statutAttendu: 'VALIDE',
    });

    expect(resultat).toEqual({
      ok: true,
      claim: { id: PARAMS.id, statut: 'EN_ATTENTE_VALIDATION', validateur: null, valideAt: null },
    });
    expect(parametresDeAppel(prisma.$executeRaw.mock.calls[0])[0]).toBe('EN_ATTENTE_VALIDATION');
  });
});

describe('elementJournalClaim — contrat de forme du journal (audit GIN)', () => {
  it('produit EXACTEMENT les clés attendues par l’audit @>', () => {
    const element = elementJournalClaim(
      { id: 'WN-CL-0056-001@v1.0', claimId: 'WN-CL-0056-001', versionClaim: 'v1.0' },
      'EN_ATTENTE_VALIDATION',
      'VALIDE',
    );
    // L'ordre importe peu, les clés OUI : une dérive de casing (claim_id…)
    // rendrait le journal invisible aux requêtes claims @> [{"claimId": …}].
    expect(Object.keys(element).sort()).toEqual([
      'claimId',
      'id',
      'statutApres',
      'statutAvant',
      'versionClaim',
    ]);
  });
});

describe('échantillonnage — tirage déterministe et taille', () => {
  it('même seed → même échantillon ; indices triés, uniques, bornés', () => {
    const a = tirerIndicesEchantillon(20, 6, 123456);
    const b = tirerIndicesEchantillon(20, 6, 123456);
    expect(a).toEqual(b);
    expect(a).toHaveLength(6);
    expect([...new Set(a)]).toHaveLength(6);
    expect([...a].sort((x, y) => x - y)).toEqual(a);
    for (const i of a) expect(i).toBeGreaterThanOrEqual(0);
    for (const i of a) expect(i).toBeLessThan(20);
  });

  it('seeds différents → tirages différents (sur un espace suffisant)', () => {
    expect(tirerIndicesEchantillon(50, 10, 1)).not.toEqual(tirerIndicesEchantillon(50, 10, 2));
  });

  it('taille : max(taux × n, minimum 5), bornée au lot', () => {
    expect(tailleEchantillon(20, 0.3)).toBe(6);
    expect(tailleEchantillon(20, 0.2)).toBe(5);
    expect(tailleEchantillon(10, 0.2)).toBe(ECHANTILLON_MIN);
    expect(tailleEchantillon(3, 0.3)).toBe(3);
  });
});

describe('tirerEchantillon', () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
    prisma.$executeRaw.mockReset();
  });

  const ELIGIBLES = Array.from({ length: 10 }, (_, i) => ({
    id: `WN-CL-0056-${String(i + 1).padStart(3, '0')}@v1.0`,
  }));

  it('refuse de re-tirer tant qu’un tirage de la source est sans issue (anti tirage-shopping)', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: BigInt(40) }]);
    expect(await tirerEchantillon({ sourceId: 'WN-SRC-0056', validateur: 'p@wellneuro.fr' })).toEqual(
      { ok: false, raison: 'tirage_ouvert', tirageId: 40 },
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('refuse une source sans claim de voie rapide', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    expect(await tirerEchantillon({ sourceId: 'WN-SRC-0056', validateur: 'p@wellneuro.fr' })).toEqual(
      { ok: false, raison: 'aucun_claim_voie_rapide' },
    );
  });

  it('tire au taux de rodage (30 %), en ALLOWLIST, et journalise tirés ET éligibles', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(ELIGIBLES)
      .mockResolvedValueOnce([{ signees: BigInt(0), bascules: BigInt(0) }])
      .mockResolvedValueOnce([{ id: BigInt(41) }]);

    const resultat = await tirerEchantillon({ sourceId: 'WN-SRC-0056', validateur: 'p@wellneuro.fr' });

    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.tirageId).toBe(41);
    expect(resultat.taux).toBe(0.3);
    expect(resultat.lot).toBe(10);
    // 10 éligibles à 30 % → 3, relevé au plancher de 5.
    expect(resultat.tires).toHaveLength(5);
    for (const id of resultat.tires) {
      expect(ELIGIBLES.map((e) => e.id)).toContain(id);
    }

    // Le périmètre du tirage est une ALLOWLIST : déclaré/observé seuls —
    // 'vécu' comme 'interprété' relèvent de la voie lente.
    const sqlEligibles = sqlDeAppel(prisma.$queryRaw.mock.calls[1]);
    expect(sqlEligibles).toContain("statut = 'EN_ATTENTE_VALIDATION'");
    expect(sqlEligibles).toContain('prescriptif = false');
    expect(sqlEligibles).toContain("typologie_lecture IN ('déclaré', 'observé')");

    const sqlTirage = sqlDeAppel(prisma.$queryRaw.mock.calls[3]);
    expect(sqlTirage).toContain('INSERT INTO public.rag_corpus_claim_decisions');
    expect(sqlTirage).toContain("'tirage_echantillon'");
    const echantillon = JSON.parse(parametresDeAppel(prisma.$queryRaw.mock.calls[3])[2] as string);
    expect(echantillon.tires).toEqual(resultat.tires);
    expect(echantillon.seed).toBe(resultat.seed);
    // La liste COMPLÈTE des éligibles fige le lot : la signature exigera
    // l'égalité exacte (un lot élargi entre-temps rend le tirage caduc).
    expect(echantillon.eligibles).toEqual(ELIGIBLES.map((e) => e.id));
  });

  it('relâche à 20 % après le rodage sans défaut, reste à 30 % au moindre défaut', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(ELIGIBLES)
      .mockResolvedValueOnce([{ signees: BigInt(10), bascules: BigInt(0) }])
      .mockResolvedValueOnce([{ id: BigInt(42) }]);
    const relache = await tirerEchantillon({ sourceId: 'WN-SRC-0056', validateur: 'p@wellneuro.fr' });
    expect(relache.ok && relache.taux).toBe(0.2);

    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(ELIGIBLES)
      .mockResolvedValueOnce([{ signees: BigInt(15), bascules: BigInt(1) }])
      .mockResolvedValueOnce([{ id: BigInt(43) }]);
    const prudent = await tirerEchantillon({ sourceId: 'WN-SRC-0056', validateur: 'p@wellneuro.fr' });
    expect(prudent.ok && prudent.taux).toBe(0.3);
  });
});

describe('sanitation des payloads de lot (journal append-only : rien d’informe n’y entre)', () => {
  it('refuse verdicts malformés : élément null, verdict inconnu, id vide, hors borne', () => {
    expect(sanitiserVerdicts([])).toBeNull();
    expect(sanitiserVerdicts([null])).toBeNull();
    expect(sanitiserVerdicts([{ id: 'x', verdict: 'peut-être' }])).toBeNull();
    expect(sanitiserVerdicts([{ id: '  ', verdict: 'conforme' }])).toBeNull();
    expect(sanitiserVerdicts('pas une liste')).toBeNull();
  });

  it('ne conserve QUE les clés connues des verdicts (rien d’autre n’entre au journal)', () => {
    const nets = sanitiserVerdicts([
      { id: 'a', verdict: 'conforme', note: 'ok', exfiltration: 'jamais' },
    ]);
    expect(nets).toEqual([{ id: 'a', verdict: 'conforme', note: 'ok' }]);
  });

  it('refuse une note fournie mais malformée — jamais de suppression silencieuse', () => {
    expect(sanitiserVerdicts([{ id: 'a', verdict: 'conforme', note: '   ' }])).toBeNull();
    expect(sanitiserVerdicts([{ id: 'a', verdict: 'conforme', note: 'x'.repeat(4001) }])).toBeNull();
  });

  it('refuse un questionnaire sans question, à réponse vide ou sans claim cité', () => {
    expect(sanitiserQuestionnaire({ questions: [] })).toBeNull();
    expect(
      sanitiserQuestionnaire({
        questions: [{ question: 'q', reponse: '   ', claimsCites: ['c'], verdict: 'conforme' }],
      }),
    ).toBeNull();
    expect(
      sanitiserQuestionnaire({
        questions: [{ question: 'q', reponse: 'r', claimsCites: [], verdict: 'conforme' }],
      }),
    ).toBeNull();
  });
});

describe('deciderLot', () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
    prisma.$executeRaw.mockReset();
    prisma.$transaction.mockClear();
  });

  const IDS = ['WN-CL-0056-001@v1.0', 'WN-CL-0056-002@v1.0', 'WN-CL-0056-003@v1.0'];
  const LOT = IDS.map((id) => ({
    id,
    claim_id: id.split('@')[0],
    version_claim: 'v1.0',
  }));
  const TIRES = [IDS[0], IDS[2]];
  const VERDICTS_OK = TIRES.map((id) => ({ id, verdict: 'conforme' as const }));
  const QUESTIONNAIRE_OK = {
    questions: [
      {
        question: 'Que dit la source sur le magnésium ?',
        reponse: 'Réponse RAG.',
        claimsCites: ['WN-CL-0056-001'],
        verdict: 'conforme' as const,
      },
    ],
  };
  const PARAMS = {
    sourceId: 'WN-SRC-0056',
    tirageId: 41,
    verdicts: VERDICTS_OK,
    questionnaire: QUESTIONNAIRE_OK,
    validateur: 'p@wellneuro.fr',
  };

  function mockTirageOuvert(eligibles: string[] = IDS) {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: BigInt(41), echantillon: { tires: TIRES, eligibles } }])
      .mockResolvedValueOnce([{ n: BigInt(0) }]);
  }

  function mockIntegriteSaine() {
    prisma.$queryRaw.mockResolvedValueOnce(
      IDS.map((id) => ({ claim_pk: id, liens: BigInt(1), derives: BigInt(0) })),
    );
  }

  function mockCouvertureComplete() {
    prisma.$queryRaw.mockResolvedValueOnce([{ manquants: BigInt(0) }]);
  }

  it('signe le lot entier : UPDATE allowlist de tous les éligibles + journal, MÊME transaction', async () => {
    mockTirageOuvert();
    prisma.$queryRaw.mockResolvedValueOnce(LOT);
    mockIntegriteSaine();
    mockCouvertureComplete();
    prisma.$queryRaw.mockResolvedValueOnce(IDS.map((id) => ({ id })));
    prisma.$executeRaw.mockResolvedValueOnce(1);

    const resultat = await deciderLot(PARAMS);

    expect(resultat).toEqual({ ok: true, valides: 3 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    const sqlUpdate = sqlDeAppel(prisma.$queryRaw.mock.calls[5]);
    expect(sqlUpdate).toContain('UPDATE public.rag_corpus_claims');
    expect(sqlUpdate).toContain("statut = 'VALIDE'");
    expect(sqlUpdate).toContain("AND statut = 'EN_ATTENTE_VALIDATION'");
    expect(sqlUpdate).toContain('AND prescriptif = false');
    expect(sqlUpdate).toContain("AND typologie_lecture IN ('déclaré', 'observé')");

    const sqlJournal = sqlDeAppel(prisma.$executeRaw.mock.calls[0]);
    expect(sqlJournal).toContain("'decision_lot'");
    const params = parametresDeAppel(prisma.$executeRaw.mock.calls[0]);
    // validateur, source, tirage_id, claims, echantillon, questionnaire.
    expect(params[0]).toBe('p@wellneuro.fr');
    expect(params[1]).toBe('WN-SRC-0056');
    expect(params[2]).toBe(41);
    const elements = JSON.parse(params[3] as string);
    expect(elements).toHaveLength(3);
    expect(elements[0]).toEqual({
      id: IDS[0],
      claimId: 'WN-CL-0056-001',
      versionClaim: 'v1.0',
      statutAvant: 'EN_ATTENTE_VALIDATION',
      statutApres: 'VALIDE',
    });
    const echantillon = JSON.parse(params[4] as string);
    expect(echantillon.verdicts).toEqual(VERDICTS_OK);
    expect(echantillon.eligibles).toEqual(IDS);
  });

  it('refuse un payload malformé AVANT toute lecture en base', async () => {
    expect(await deciderLot({ ...PARAMS, verdicts: [null] })).toEqual({
      ok: false,
      raison: 'payload_invalide',
    });
    expect(await deciderLot({ ...PARAMS, questionnaire: { questions: [] } })).toEqual({
      ok: false,
      raison: 'payload_invalide',
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('refuse un tirage inexistant, puis un tirage déjà conclu', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await deciderLot(PARAMS)).toEqual({ ok: false, raison: 'tirage_introuvable' });

    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: BigInt(41), echantillon: { tires: TIRES, eligibles: IDS } }])
      .mockResolvedValueOnce([{ n: BigInt(1) }]);
    expect(await deciderLot(PARAMS)).toEqual({ ok: false, raison: 'tirage_deja_conclu' });
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('refuse un échantillon incomplet, non conforme, ou avec verdicts hors tirage', async () => {
    mockTirageOuvert();
    expect(await deciderLot({ ...PARAMS, verdicts: [VERDICTS_OK[0]] })).toEqual({
      ok: false,
      raison: 'echantillon_non_conforme',
    });

    mockTirageOuvert();
    expect(
      await deciderLot({
        ...PARAMS,
        verdicts: [VERDICTS_OK[0], { id: TIRES[1], verdict: 'non_conforme' }],
      }),
    ).toEqual({ ok: false, raison: 'echantillon_non_conforme' });

    mockTirageOuvert();
    expect(
      await deciderLot({
        ...PARAMS,
        verdicts: [...VERDICTS_OK, { id: 'WN-CL-0056-099@v1.0', verdict: 'conforme' }],
      }),
    ).toEqual({ ok: false, raison: 'echantillon_non_conforme' });
  });

  it('refuse un questionnaire portant un verdict non conforme', async () => {
    mockTirageOuvert();
    expect(
      await deciderLot({
        ...PARAMS,
        questionnaire: {
          questions: [{ ...QUESTIONNAIRE_OK.questions[0], verdict: 'non_conforme' as const }],
        },
      }),
    ).toEqual({ ok: false, raison: 'questionnaire_non_conforme' });
  });

  it('refuse un lot RÉTRÉCI comme un lot ÉLARGI depuis le tirage (etat_divergent)', async () => {
    // Rétréci : un claim tiré a été décidé individuellement entre-temps.
    mockTirageOuvert();
    prisma.$queryRaw.mockResolvedValueOnce([LOT[0], LOT[1]]);
    expect(await deciderLot(PARAMS)).toEqual({ ok: false, raison: 'etat_divergent' });

    // Élargi : une ingestion a ajouté un claim jamais échantillonnable — le
    // signer par ce tirage serait un contournement statistique silencieux.
    mockTirageOuvert();
    prisma.$queryRaw.mockResolvedValueOnce([
      ...LOT,
      { id: 'WN-CL-0056-004@v1.0', claim_id: 'WN-CL-0056-004', version_claim: 'v1.0' },
    ]);
    expect(await deciderLot(PARAMS)).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse un lot dont UN claim est orphelin ou dérivé — mêmes gardes que l’individuel', async () => {
    mockTirageOuvert();
    prisma.$queryRaw.mockResolvedValueOnce(LOT);
    prisma.$queryRaw.mockResolvedValueOnce([
      { claim_pk: IDS[0], liens: BigInt(1), derives: BigInt(0) },
      { claim_pk: IDS[1], liens: BigInt(0), derives: BigInt(0) },
      { claim_pk: IDS[2], liens: BigInt(1), derives: BigInt(0) },
    ]);
    expect(await deciderLot(PARAMS)).toEqual({ ok: false, raison: 'sources_absentes' });

    mockTirageOuvert();
    prisma.$queryRaw.mockResolvedValueOnce(LOT);
    prisma.$queryRaw.mockResolvedValueOnce([
      { claim_pk: IDS[0], liens: BigInt(1), derives: BigInt(1) },
      { claim_pk: IDS[1], liens: BigInt(1), derives: BigInt(0) },
      { claim_pk: IDS[2], liens: BigInt(1), derives: BigInt(0) },
    ]);
    expect(await deciderLot(PARAMS)).toEqual({ ok: false, raison: 'source_derivee' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse une signature dont le questionnaire ne couvre pas chaque chunk actif de la source', async () => {
    mockTirageOuvert();
    prisma.$queryRaw.mockResolvedValueOnce(LOT);
    mockIntegriteSaine();
    prisma.$queryRaw.mockResolvedValueOnce([{ manquants: BigInt(2) }]);

    expect(await deciderLot(PARAMS)).toEqual({ ok: false, raison: 'questionnaire_couverture' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    // La requête de couverture confronte chunks actifs de la source et chunks
    // atteints via les claims cités par les questions.
    const sqlCouverture = sqlDeAppel(prisma.$queryRaw.mock.calls[4]);
    expect(sqlCouverture).toContain('rag_corpus_chunks');
    expect(sqlCouverture).toContain('rag_corpus_claim_sources');
  });

  it('annule TOUT si l’UPDATE ne touche pas tout le lot — jamais de lot à moitié signé', async () => {
    mockTirageOuvert();
    prisma.$queryRaw.mockResolvedValueOnce(LOT);
    mockIntegriteSaine();
    mockCouvertureComplete();
    // L'UPDATE ne rend que 2 lignes sur 3 : la transaction est annulée.
    prisma.$queryRaw.mockResolvedValueOnce([{ id: IDS[0] }, { id: IDS[1] }]);

    expect(await deciderLot(PARAMS)).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Le journal n'a pas été écrit : la transaction a levé avant.
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('rend tirage_deja_conclu si l’index unique d’issue refuse l’INSERT (course perdue)', async () => {
    mockTirageOuvert();
    prisma.$queryRaw.mockResolvedValueOnce(LOT);
    mockIntegriteSaine();
    mockCouvertureComplete();
    prisma.$queryRaw.mockResolvedValueOnce(IDS.map((id) => ({ id })));
    prisma.$executeRaw.mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint "rag_claim_decisions_issue_unique" (23505)'),
    );

    expect(await deciderLot(PARAMS)).toEqual({ ok: false, raison: 'tirage_deja_conclu' });
  });
});

describe('basculerLot', () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
    prisma.$executeRaw.mockReset();
  });

  const PARAMS = {
    sourceId: 'WN-SRC-0056',
    tirageId: 41,
    motif: 'Dosage inexact sur un claim échantillonné.',
    validateur: 'p@wellneuro.fr',
  };

  it('exige un motif', async () => {
    expect(await basculerLot({ ...PARAMS, motif: '  ' })).toEqual({
      ok: false,
      raison: 'motif_requis',
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('refuse des pièces jointes malformées', async () => {
    expect(await basculerLot({ ...PARAMS, verdicts: [{ id: 'x', verdict: 'bof' }] })).toEqual({
      ok: false,
      raison: 'payload_invalide',
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('journalise la bascule avec son motif, sans toucher aucun claim', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: BigInt(41), echantillon: { tires: ['a'], eligibles: ['a', 'b'] } }])
      .mockResolvedValueOnce([{ n: BigInt(0) }]);
    prisma.$executeRaw.mockResolvedValueOnce(1);

    expect(await basculerLot(PARAMS)).toEqual({ ok: true });

    const sql = sqlDeAppel(prisma.$executeRaw.mock.calls[0]);
    expect(sql).toContain("'bascule_individuelle'");
    expect(sql).not.toContain('UPDATE public.rag_corpus_claims');
    const params = parametresDeAppel(prisma.$executeRaw.mock.calls[0]);
    expect(params[0]).toBe(PARAMS.motif);
    expect(params[3]).toBe(41);
  });

  it('refuse de conclure deux fois le même tirage — y compris via l’index unique (course)', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: BigInt(41), echantillon: { tires: ['a'], eligibles: ['a'] } }])
      .mockResolvedValueOnce([{ n: BigInt(1) }]);
    expect(await basculerLot(PARAMS)).toEqual({ ok: false, raison: 'tirage_deja_conclu' });
    expect(prisma.$executeRaw).not.toHaveBeenCalled();

    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: BigInt(41), echantillon: { tires: ['a'], eligibles: ['a'] } }])
      .mockResolvedValueOnce([{ n: BigInt(0) }]);
    prisma.$executeRaw.mockRejectedValueOnce(new Error('unique constraint (23505)'));
    expect(await basculerLot(PARAMS)).toEqual({ ok: false, raison: 'tirage_deja_conclu' });
  });
});
