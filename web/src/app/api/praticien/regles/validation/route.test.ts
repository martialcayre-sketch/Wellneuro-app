import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    clinicalRule: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

const { claimAdmissibleAuCatalogue } = vi.hoisted(() => ({ claimAdmissibleAuCatalogue: vi.fn() }));
vi.mock('@/lib/supplement-library/catalogueDecisionPrisma', () => ({ claimAdmissibleAuCatalogue }));

import { POST } from './route';

// Message de D-479 §4, au caractère près.
const MESSAGE_CLAIM_NON_VALIDE =
  'Ce claim ne satisfait pas les critères de validité du corpus : vérifiez son '
  + 'identifiant et sa version au poste de revue des claims. Une règle ne peut '
  + 'reposer que sur un claim signé et non supplanté.';
const COUPLE_EN_BASE = { claimId: 'WN-CL-2026-001', versionClaim: 'v1.0' };

const URL_BASE = 'http://localhost/api/praticien/regles/validation';

const BROUILLON = {
  id: 'regle_2',
  actif: true,
  validePar: null,
  valideLe: null,
  intentTagId: 'tag_sommeil',
  ingredientId: 'ing_mag',
  typeRegle: 'recommande',
  versionRegle: 2,
  claimId: 'WN-CL-2026-001',
  versionClaim: 'v1.0',
};

const SIGNEE = {
  id: 'regle_2',
  typeRegle: 'recommande',
  poids: 1,
  justification: 'Justification sourcée.',
  doseCibleBasse: 100,
  doseCibleHaute: 300,
  gradePreuveScientifique: 'modere',
  versionRegle: 2,
  actif: true,
  creeLe: new Date('2026-07-20T10:00:00.000Z'),
  validePar: 'praticien@wellneuro.fr',
  valideLe: new Date('2026-07-24T18:00:00.000Z'),
  intentTagId: 'tag_sommeil',
  ingredientId: 'ing_mag',
  intentTag: { id: 'tag_sommeil', code: 'sommeil_fragmente', labelFr: 'Sommeil fragmenté', categorie: 'sommeil' },
  ingredient: { id: 'ing_mag', code: 'magnesium', nomFr: 'Magnésium' },
  formePreferee: null,
  sourceReference: { id: 'src_1', citation: 'Revue Micronutrition, 2024', lienUrl: null },
};

const CORPS = { regleId: 'regle_2', statutAttendu: 'brouillon' };

function requete(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/praticien/regles/validation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'Praticien@wellneuro.fr' } });
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
    // Deux lectures dans le handler : l'état (sélection étroite) puis la ligne
    // signée (sélection avec jointures) — départagées par la sélection, pas
    // par l'ordre, pour rester déterministes de test en test.
    prisma.clinicalRule.findUnique.mockImplementation(
      async (args: { select?: { intentTag?: unknown } }) =>
        args?.select?.intentTag ? SIGNEE : BROUILLON,
    );
    prisma.clinicalRule.findFirst.mockResolvedValue(null);
    prisma.clinicalRule.updateMany.mockResolvedValue({ count: 1 });
    prisma.clinicalRule.findMany.mockResolvedValue([]);
    claimAdmissibleAuCatalogue.mockResolvedValue(true);
  });

  it('exige une session AVEC e-mail — jamais de signature anonyme', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(requete(CORPS))).status).toBe(401);

    getServerSession.mockResolvedValue({ user: {} });
    expect((await POST(requete(CORPS))).status).toBe(401);
    expect(prisma.clinicalRule.updateMany).not.toHaveBeenCalled();
  });

  it('répond 404 fail-closed quand WN_C4_ENABLED est éteint', async () => {
    delete process.env.WN_C4_ENABLED;
    expect((await POST(requete(CORPS))).status).toBe(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('signe avec l’e-mail praticien normalisé ET désactive l’ancienne version — même transaction', async () => {
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.ok).toBe(true);
    expect(json.regle.statut).toBe('validee');
    expect(json.regle.validePar).toBe('praticien@wellneuro.fr');
    expect(json.versionsDesactivees).toBe(1);

    // Tout se joue dans UNE transaction : signature puis désactivation.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.clinicalRule.updateMany).toHaveBeenCalledTimes(2);

    // 1) Signature CONDITIONNELLE : n'aboutit que si la ligne est encore un
    //    brouillon actif (anti-écrasement atomique), e-mail normalisé.
    const signature = prisma.clinicalRule.updateMany.mock.calls[0][0];
    expect(signature.where).toEqual({
      id: 'regle_2',
      actif: true,
      validePar: null,
      valideLe: null,
    });
    expect(signature.data.validePar).toBe('praticien@wellneuro.fr');
    expect(signature.data.valideLe).toBeInstanceOf(Date);

    // 2) Les versions VALIDÉES encore actives de la lignée passent
    //    actif=false — leur signature n'est pas effacée.
    const desactivation = prisma.clinicalRule.updateMany.mock.calls[1][0];
    expect(desactivation.where).toEqual({
      intentTagId: 'tag_sommeil',
      ingredientId: 'ing_mag',
      typeRegle: 'recommande',
      id: { not: 'regle_2' },
      actif: true,
      validePar: { not: null },
    });
    expect(desactivation.data).toEqual({ actif: false });
  });

  it('refuse un statut attendu autre que brouillon : seule transition entrante', async () => {
    const reponse = await POST(requete({ regleId: 'regle_2', statutAttendu: 'validee' }));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('transition_invalide');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('répond 409 etat_divergent si la règle n’est plus un brouillon', async () => {
    prisma.clinicalRule.findUnique.mockReset().mockResolvedValue({
      ...BROUILLON,
      validePar: 'praticien@wellneuro.fr',
      valideLe: new Date('2026-07-23T00:00:00.000Z'),
    });
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('etat_divergent');
    expect(prisma.clinicalRule.updateMany).not.toHaveBeenCalled();
  });

  it('répond 409 etat_divergent si la signature conditionnelle ne touche aucune ligne (course)', async () => {
    prisma.clinicalRule.updateMany.mockReset().mockResolvedValue({ count: 0 });
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('etat_divergent');
    // La désactivation n'est jamais tentée si la signature n'a pas pris.
    expect(prisma.clinicalRule.updateMany).toHaveBeenCalledTimes(1);
  });

  it('répond 409 version_depassee si une version validée au moins aussi récente est active', async () => {
    prisma.clinicalRule.findFirst.mockResolvedValue({ id: 'regle_3' });
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('version_depassee');
    expect(prisma.clinicalRule.updateMany).not.toHaveBeenCalled();
  });

  it('répond 404 sur une règle introuvable', async () => {
    prisma.clinicalRule.findUnique.mockReset().mockResolvedValue(null);
    expect((await POST(requete(CORPS))).status).toBe(404);
    expect(claimAdmissibleAuCatalogue).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ─── t76 : le claim fondateur se relit avant de signer ([[D-479]] §2) ────

  it('vérifie le couple ENREGISTRÉ sur la règle, avant la transaction, puis signe', async () => {
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(200);
    expect(claimAdmissibleAuCatalogue).toHaveBeenCalledTimes(1);
    expect(claimAdmissibleAuCatalogue).toHaveBeenCalledWith(COUPLE_EN_BASE);
    expect(claimAdmissibleAuCatalogue.mock.invocationCallOrder[0])
      .toBeLessThan(prisma.$transaction.mock.invocationCallOrder[0]);
  });

  it('refuse 422 claim_non_valide un brouillon dont le claim n’est plus admissible, sans transaction', async () => {
    claimAdmissibleAuCatalogue.mockResolvedValue(false);
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(422);
    expect(await reponse.json()).toEqual({
      ok: false,
      reason: 'claim_non_valide',
      error: MESSAGE_CLAIM_NON_VALIDE,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.clinicalRule.updateMany).not.toHaveBeenCalled();
  });

  it('n’accepte aucun claim venu du corps : seul le couple en base est jugé', async () => {
    await POST(requete({ ...CORPS, claimId: 'WN-CL-2026-999', versionClaim: 'v9.0' }));
    expect(claimAdmissibleAuCatalogue).toHaveBeenCalledWith(COUPLE_EN_BASE);
  });

  it('refuse 422 une règle sans claim, sans interroger le corpus', async () => {
    prisma.clinicalRule.findUnique.mockReset().mockResolvedValue({
      ...BROUILLON,
      claimId: null,
      versionClaim: null,
    });
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(422);
    expect((await reponse.json()).reason).toBe('claim_non_valide');
    expect(claimAdmissibleAuCatalogue).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('le rejeu sur une règle déjà signée reste 409 etat_divergent, même si son claim n’est plus admissible', async () => {
    prisma.clinicalRule.findUnique.mockReset().mockResolvedValue({
      ...BROUILLON,
      validePar: 'praticien@wellneuro.fr',
      valideLe: new Date('2026-07-23T00:00:00.000Z'),
    });
    claimAdmissibleAuCatalogue.mockResolvedValue(false);
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('etat_divergent');
    // Le claim d'une règle qui n'est pas un brouillon n'est pas jugé ici.
    expect(claimAdmissibleAuCatalogue).not.toHaveBeenCalled();
    expect(prisma.clinicalRule.updateMany).not.toHaveBeenCalled();
  });

  it('une règle disparue entre la lecture préalable et la transaction rend 404, sans écriture', async () => {
    prisma.clinicalRule.findUnique.mockReset()
      .mockResolvedValueOnce(BROUILLON)
      .mockResolvedValueOnce(null);
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(404);
    expect((await reponse.json()).reason).toBe('regle_introuvable');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.clinicalRule.updateMany).not.toHaveBeenCalled();
  });

  it('une panne de lecture du corpus rend 500, sans transaction ni écriture', async () => {
    claimAdmissibleAuCatalogue.mockRejectedValue(new Error('corpus injoignable'));
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(500);
    expect((await reponse.json()).reason).toBe('exception');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.clinicalRule.updateMany).not.toHaveBeenCalled();
  });
});
