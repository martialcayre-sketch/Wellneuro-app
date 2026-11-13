import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, verserTexte, poserActeTexte, lireAtelierOptions } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  verserTexte: vi.fn(),
  poserActeTexte: vi.fn(),
  lireAtelierOptions: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/atelier-bibliotheque-options/ecriture', () => ({ verserTexte, poserActeTexte }));
vi.mock('@/lib/atelier-bibliotheque-options/lecture', () => ({ lireAtelierOptions }));

import { GET } from './route';
import { POST as postVersion } from './versions/route';
import { POST as postActe } from './actes/route';
import { MESSAGES_REFUS } from '@/lib/atelier-bibliotheque-options/http';

const requete = (body: unknown) =>
  new Request('http://localhost/api/praticien/atelier-options/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const VERSION = { optionId: 'OPT_BANC_A', rubrique: 'dose', texte: 'Texte synthétique.', derniereVersionVue: null };
const ACTE = { idTexte: 'texte0000001', acte: 'validee', empreinteVue: 'a'.repeat(64), dernierActeVu: null, relectureIntegrale: true };

describe('atelier de la bibliothèque des options — drapeau, session, garde du responsable', () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('WN_BIBLIOTHEQUE_OPTIONS_ATELIER', 'true');
    vi.stubEnv('WN_FICHES_USAGE_VALIDATEURS', 'responsable@exemple.fr');
    getServerSession.mockResolvedValue({ user: { email: 'Responsable@Exemple.fr' } });
    lireAtelierOptions.mockResolvedValue({ options: [] });
    verserTexte.mockResolvedValue({ issue: 'versee', version: { id: 'texte0000002', optionId: 'OPT_BANC_A', rubrique: 'dose', numero: 1 } });
    poserActeTexte.mockResolvedValue({ issue: 'posee', acte: { ordre: '1' }, etat: { etat: 'validee' } });
  });

  it('drapeau éteint (ou `1`) : 404 partout, avant même la session', async () => {
    for (const valeur of ['', '1', 'TRUE']) {
      vi.stubEnv('WN_BIBLIOTHEQUE_OPTIONS_ATELIER', valeur);
      expect((await GET()).status).toBe(404);
      expect((await postVersion(requete(VERSION))).status).toBe(404);
      expect((await postActe(requete(ACTE))).status).toBe(404);
    }
    expect(getServerSession).not.toHaveBeenCalled();
    expect(lireAtelierOptions).not.toHaveBeenCalled();
  });

  it('sans session : 401 ; un praticien lit, sans geste ; le responsable lit avec', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    getServerSession.mockResolvedValue({ user: { email: 'autre@exemple.fr' } });
    expect(await (await GET()).json()).toMatchObject({ ok: true, peutDecider: false });
    getServerSession.mockResolvedValue({ user: { email: 'Responsable@Exemple.fr' } });
    expect(await (await GET()).json()).toMatchObject({ ok: true, peutDecider: true });
  });

  it('un praticien qui n’est pas le responsable : 403, ni saisie ni acte', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'autre@exemple.fr' } });
    expect((await postVersion(requete(VERSION))).status).toBe(403);
    expect((await postActe(requete(ACTE))).status).toBe(403);
    expect(verserTexte).not.toHaveBeenCalled();
    expect(poserActeTexte).not.toHaveBeenCalled();
    // La garde passe AVANT la lecture du corps : un corps illisible reçoit 403, pas 400.
    const illisible = new Request('http://localhost/api/praticien/atelier-options/x', { method: 'POST', body: '{pas du json' });
    expect((await postVersion(illisible)).status).toBe(403);
  });

  it('saisie : identifiant, rubrique, texte et dernière version vue contrôlés ; l’auteur est la session', async () => {
    for (const mauvais of [
      { ...VERSION, optionId: 'opt_a' },
      { ...VERSION, optionId: ['OPT_BANC_A'] },
      { ...VERSION, rubrique: 'population' },
      { ...VERSION, texte: ' \t\n' },
      { ...VERSION, texte: 'x'.repeat(20_001) },
      { ...VERSION, derniereVersionVue: 'x;y' },
    ]) {
      expect((await postVersion(requete(mauvais))).status).toBe(400);
    }
    expect(verserTexte).not.toHaveBeenCalled();
    const res = await postVersion(requete({ ...VERSION, auteur: 'pirate@exemple.fr' }));
    expect(res.status).toBe(200);
    expect(verserTexte).toHaveBeenCalledWith({ ...VERSION, auteur: expect.stringMatching(/^responsable@exemple\.fr$/i) });
  });

  it('acte : identifiant, genre, empreinte et jeton contrôlés ; le motif rogné ; le validateur est la session', async () => {
    for (const mauvais of [
      { ...ACTE, idTexte: 'x' },
      { ...ACTE, acte: 'signee' },
      { ...ACTE, empreinteVue: 'A'.repeat(64) },
      { ...ACTE, dernierActeVu: 'abc' },
    ]) {
      expect((await postActe(requete(mauvais))).status).toBe(400);
    }
    expect(poserActeTexte).not.toHaveBeenCalled();
    await postActe(requete({ ...ACTE, acte: 'retiree', motif: '  motif  ', validateur: 'pirate@exemple.fr' }));
    expect(poserActeTexte).toHaveBeenCalledWith(expect.objectContaining({ acte: 'retiree', motif: 'motif', relectureIntegrale: true }));
    expect(poserActeTexte.mock.calls[0][0].validateur).toMatch(/^responsable@exemple\.fr$/i);
  });

  it('chaque raison de refus du module d’écriture a son message en français et son statut', async () => {
    // Les listes du module RÉEL : une raison ajoutée au type sans message rougit ici.
    const reel = await vi.importActual<typeof import('@/lib/atelier-bibliotheque-options/ecriture')>('@/lib/atelier-bibliotheque-options/ecriture');
    const raisons = [...reel.RAISONS_REFUS_VERSION, ...reel.RAISONS_REFUS_ACTE];
    expect(raisons.length).toBeGreaterThanOrEqual(15);
    for (const r of raisons) expect(MESSAGES_REFUS[r], r).toBeDefined();
    poserActeTexte.mockResolvedValue({ issue: 'refusee', raison: 'structure_non_signee' });
    const res = await postActe(requete(ACTE));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'structure_non_signee' });
  });

  it('une exception : 500 générique, sans texte au journal', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    verserTexte.mockRejectedValue(Object.assign(new Error('Texte synthétique secret'), { code: 'P2002' }));
    const res = await postVersion(requete(VERSION));
    expect(res.status).toBe(500);
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('secret');
    erreur.mockRestore();
  });
});
