import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RaisonRefusActe, RaisonRefusArbitrage, RaisonRefusVersion } from '@/lib/positions-expert/ecriture';

const { getServerSession, verserVersion, poserActePosition, poserArbitrage, revoquerArbitrage, lireAtelierPositions } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  verserVersion: vi.fn(),
  poserActePosition: vi.fn(),
  poserArbitrage: vi.fn(),
  revoquerArbitrage: vi.fn(),
  lireAtelierPositions: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/positions-expert/ecriture', () => ({ verserVersion, poserActePosition, poserArbitrage, revoquerArbitrage }));
vi.mock('@/lib/positions-expert/lecture', () => ({ lireAtelierPositions }));

import { GET } from './route';
import { POST as postVersion } from './versions/route';
import { POST as postActe } from './actes/route';
import { POST as postArbitrage } from './arbitrages/route';
import { MESSAGES_REFUS } from '@/lib/positions-expert/http';

const requete = (body: unknown) =>
  new Request('http://localhost/api/praticien/positions-expert/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const VERSION = {
  positionId: 'WN-PE-0001',
  version: 'v1.0',
  dossier: 'fer',
  ficheId: 'FU_BANC_A',
  contenu: { enonce: 'e', perimetre: 'p', population: 'po', limites: 'l' },
  claimsAppui: ['WN-CL-0001-001@v1.0'],
  idVersionCouranteVue: null,
};
const ACTE = { idVersion: 'version000001', acte: 'signee', empreinteVue: 'a'.repeat(64), dernierActeVu: null, relectureIntegrale: true };
const POSE = { acte: 'pose', conflitId: 'CS-BANC-01', ficheId: 'FU_BANC_A', teteVue: null, motif: 'm', claimRetenu: 'WN-CL-0001-001@v1.0' };

describe('atelier des positions — drapeau, session, garde du responsable', () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('WN_POSITIONS_EXPERT', 'true');
    vi.stubEnv('WN_FICHES_USAGE_VALIDATEURS', 'responsable@exemple.fr');
    getServerSession.mockResolvedValue({ user: { email: 'Responsable@Exemple.fr' } });
  });

  it('drapeau éteint (absent, ou autre que « true ») : 404 partout, sans lire la session', async () => {
    for (const valeur of ['', '1', 'TRUE', 'oui']) {
      vi.stubEnv('WN_POSITIONS_EXPERT', valeur);
      expect((await GET()).status).toBe(404);
      expect((await postVersion(requete(VERSION))).status).toBe(404);
      expect((await postActe(requete(ACTE))).status).toBe(404);
      expect((await postArbitrage(requete(POSE))).status).toBe(404);
    }
    expect(getServerSession).not.toHaveBeenCalled();
    expect(verserVersion).not.toHaveBeenCalled();
  });

  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await postActe(requete(ACTE))).status).toBe(401);
  });

  it('un praticien qui n’est pas le responsable lit, mais n’écrit pas (403)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'autre@exemple.fr' } });
    lireAtelierPositions.mockResolvedValue({ positions: [], couples: [], conflits: [], structure: { signee: true, fiches: [] } });
    const lu = await GET();
    expect(lu.status).toBe(200);
    expect(await lu.json()).toMatchObject({ ok: true, peutDecider: false });
    for (const r of [postVersion(requete(VERSION)), postActe(requete(ACTE)), postArbitrage(requete(POSE))]) {
      expect((await r).status).toBe(403);
    }
    expect(verserVersion).not.toHaveBeenCalled();
    expect(poserActePosition).not.toHaveBeenCalled();
    expect(poserArbitrage).not.toHaveBeenCalled();
    // La garde passe AVANT la lecture du corps : un corps illisible rend 403, pas 400.
    const illisible = new Request('http://localhost/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    expect((await postActe(illisible)).status).toBe(403);
  });

  it('un texte en UTF-16 mal formé ou porteur d’un NUL est refusé en 400, jamais en 500', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'responsable@exemple.fr' } });
    for (const t of ['a\ud800', 'a\u0000b']) {
      expect((await postVersion(requete({ ...VERSION, contenu: { ...VERSION.contenu, enonce: t } }))).status).toBe(400);
    }
    expect(verserVersion).not.toHaveBeenCalled();
  });

  it('l’auteur est l’e-mail de la session, jamais une valeur du corps', async () => {
    verserVersion.mockResolvedValue({ issue: 'ecrite', version: { id: 'v1', positionId: 'WN-PE-0001', version: 'v1.0' } });
    await postVersion(requete({ ...VERSION, auteur: 'pirate@exemple.fr' }));
    expect(verserVersion.mock.calls[0][0].auteur).toBe('responsable@exemple.fr');
  });
});

describe('formats refusés à la route (400), avant toute écriture', () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('WN_POSITIONS_EXPERT', 'true');
    vi.stubEnv('WN_FICHES_USAGE_VALIDATEURS', 'responsable@exemple.fr');
    getServerSession.mockResolvedValue({ user: { email: 'responsable@exemple.fr' } });
  });

  it.each([
    ['position', { positionId: 'WN-PE-1' }],
    ['version', { version: '1.0' }],
    ['dossier hors liste fermée', { dossier: 'iode_selenium' }],
    ['fiche', { ficheId: 'fu_minuscule' }],
    ['contenu à trois rubriques', { contenu: { enonce: 'e', perimetre: 'p', population: 'po' } }],
    ['contenu à rubrique vide', { contenu: { ...VERSION.contenu, limites: '  ' } }],
    ['aucun appui', { claimsAppui: [] }],
    ['appui mal formé', { claimsAppui: ['WN-CL-0001-001'] }],
  ])('version : %s', async (_nom, champ) => {
    expect((await postVersion(requete({ ...VERSION, ...champ }))).status).toBe(400);
    expect(verserVersion).not.toHaveBeenCalled();
  });

  it('arbitrage : retenir deux choses, ou rien', async () => {
    expect((await postArbitrage(requete({ ...POSE, idPositionVersion: 'pv000001' }))).status).toBe(400);
    const { claimRetenu: _c, ...sansRetenu } = POSE;
    expect((await postArbitrage(requete(sansRetenu))).status).toBe(400);
    expect(poserArbitrage).not.toHaveBeenCalled();
  });

  it('arbitrage : motif blanc refusé (422), pose comme révocation', async () => {
    expect((await postArbitrage(requete({ ...POSE, motif: '   ' }))).status).toBe(422);
    expect((await postArbitrage(requete({ acte: 'revocation', conflitId: 'CS-BANC-01', ficheId: 'FU_BANC_A', teteVue: 'tete0001', motif: '' }))).status).toBe(422);
    expect(revoquerArbitrage).not.toHaveBeenCalled();
  });

  it('arbitrage : un conflit mal formé est un 400 ; bien formé mais inconnu, c’est le 404 du module', async () => {
    expect((await postArbitrage(requete({ ...POSE, conflitId: 'XX-1' }))).status).toBe(400);
    poserArbitrage.mockResolvedValue({ issue: 'refusee', raison: 'conflit_inconnu' });
    const r = await postArbitrage(requete({ ...POSE, conflitId: 'CS-INCONNU-01' }));
    expect(r.status).toBe(404);
    expect(await r.json()).toMatchObject({ ok: false, reason: 'conflit_inconnu' });
  });
});

describe('chaque refus d’un module d’écriture a son message et son statut', () => {
  // Record<…, true> : le typage exige toutes les raisons, une raison neuve
  // sans entrée ici ne compile pas.
  const VERSIONS: Record<RaisonRefusVersion, true> = {
    fiche_hors_structure: true,
    appui_non_frais: true,
    etat_divergent: true,
    version_ne_suit_pas: true,
    dossier_different: true,
    fiche_deja_fondee: true,
  };
  const ACTES: Record<RaisonRefusActe, true> = {
    relecture_requise: true,
    motif_requis: true,
    introuvable: true,
    version_depassee: true,
    contenu_illisible: true,
    empreinte_divergente: true,
    etat_divergent: true,
    deja_signee: true,
    jamais_signee: true,
    deja_retiree: true,
    etat_illisible: true,
    fiche_hors_structure: true,
    fiche_deja_fondee: true,
    appui_non_frais: true,
  };
  const ARBITRAGES: Record<RaisonRefusArbitrage, true> = {
    conflit_inconnu: true,
    registre_non_signe: true,
    structure_non_signee: true,
    fiche_hors_structure: true,
    fiche_hors_liste: true,
    claim_hors_conflit: true,
    claim_non_frais: true,
    position_introuvable: true,
    position_autre_fiche: true,
    position_a_relire: true,
    position_hors_vigueur: true,
    etat_divergent: true,
  };
  it.each([...Object.keys(VERSIONS), ...Object.keys(ACTES), ...Object.keys(ARBITRAGES)])('%s', raison => {
    expect(MESSAGES_REFUS[raison]).toBeDefined();
    expect(MESSAGES_REFUS[raison].status).toBeGreaterThanOrEqual(400);
  });
});
