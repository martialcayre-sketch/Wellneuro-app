import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// « Imprimer » le document pour le médecin (D-307 §2, F38). La composition et
// la garde de partage sont RÉELLES ; Prisma, la session et l'enregistrement
// sont simulés — l'enregistrement a ses propres tests, sous verrou.

const { findFirst, findUniquePatient, choix, createJournal, enregistrerImpression } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUniquePatient: vi.fn(),
  choix: vi.fn(),
  createJournal: vi.fn(),
  enregistrerImpression: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn(async () => ({ user: { email: 'p@wellneuro.fr' } })) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    syntheseIA: { findFirst },
    patient: { findUnique: findUniquePatient },
    trustChoiceEvent: { findMany: choix },
    journalAccesDossier: { create: createJournal, deleteMany: vi.fn(async () => ({ count: 0 })) },
  },
}));
vi.mock('@/lib/documents/documentMedecinImprime', () => ({ enregistrerImpression }));

import { getServerSession } from 'next-auth';
import { POST } from './route';

function requete(corps: unknown) {
  return new Request('http://x/api/praticien/documents/medecin/impression', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof corps === 'string' ? corps : JSON.stringify(corps),
  });
}

function synthese(statut = 'Validee_Praticien') {
  return {
    idSynthese: 'SYN_1',
    idPatient: 'PAT_1',
    statut,
    modele: 'claude',
    versionPrompt: 'synthese-v3',
    dateValidation: new Date('2026-07-18T00:00:00.000Z'),
    dateGeneration: new Date('2026-07-17T00:00:00.000Z'),
    syntheseJson: {
      resume_praticien: 'Résumé interne',
      axes_prioritaires: [{ axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['réveils'], points_a_confirmer: [] }],
      points_de_vigilance: ['fatigue'],
      questions_entretien: ['Depuis quand ?'],
      narratif_patient: 'Sommeil fragmenté.',
      limites: 'À valider.',
    },
  };
}

const ACCORDE = [{ finalite: 'partage_medecin_traitant', statut: 'accorde', enregistreLe: new Date('2026-07-01T08:00:00Z') }];

beforeEach(() => {
  vi.clearAllMocks();
  findFirst.mockResolvedValue(synthese());
  findUniquePatient.mockResolvedValue({ prenom: 'Sophie', nom: 'Nicola', actif: true, suiviClotureLe: null });
  choix.mockResolvedValue(ACCORDE);
  createJournal.mockResolvedValue({});
  enregistrerImpression.mockResolvedValue({
    ok: true,
    impression: { id: 'imp_1', imprimeLe: new Date('2026-10-18T15:00:00.000Z') },
  });
});
afterEach(() => vi.clearAllMocks());

describe('POST /api/praticien/documents/medecin/impression (D-307 §2)', () => {
  it('401 sans session, rien n’est lu', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
    expect((await POST(requete({ idSynthese: 'SYN_1' }))).status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('400 sans idSynthese ou sur un corps illisible', async () => {
    expect((await POST(requete({}))).status).toBe(400);
    expect((await POST(requete('{'))).status).toBe(400);
    expect(enregistrerImpression).not.toHaveBeenCalled();
  });

  it('404 pour la synthèse d’un autre praticien, sans journal ni écriture', async () => {
    findFirst.mockResolvedValue(null);
    expect((await POST(requete({ idSynthese: 'SYN_1' }))).status).toBe(404);
    expect(createJournal).not.toHaveBeenCalled();
    expect(enregistrerImpression).not.toHaveBeenCalled();
  });

  it('422 sur une synthèse non validée — l’accès est journalisé, rien n’est écrit', async () => {
    findFirst.mockResolvedValue(synthese('Brouillon_IA'));
    const res = await POST(requete({ idSynthese: 'SYN_1' }));
    expect(res.status).toBe(422);
    expect(createJournal).toHaveBeenCalledTimes(1);
    expect(enregistrerImpression).not.toHaveBeenCalled();
  });

  it('409 sur un dossier clos, sans trace', async () => {
    findUniquePatient.mockResolvedValue({ prenom: 'Sophie', nom: 'Nicola', actif: false, suiviClotureLe: new Date('2026-09-01T00:00:00Z') });
    const res = await POST(requete({ idSynthese: 'SYN_1' }));
    expect(res.status).toBe(409);
    expect(enregistrerImpression).not.toHaveBeenCalled();
  });

  it.each([
    ['refusé', [{ finalite: 'partage_medecin_traitant', statut: 'refuse', enregistreLe: new Date('2026-07-01T08:00:00Z') }], 'consentement_partage_refuse'],
    ['retiré', [{ finalite: 'partage_medecin_traitant', statut: 'retire', enregistreLe: new Date('2026-07-01T08:00:00Z') }], 'consentement_partage_retire'],
    ['jamais exprimé', [], 'consentement_partage_jamais_exprime'],
  ])('409 si le partage est %s, sans trace', async (_motif, evenements, raison) => {
    choix.mockResolvedValue(evenements);
    const res = await POST(requete({ idSynthese: 'SYN_1' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe(raison);
    expect(enregistrerImpression).not.toHaveBeenCalled();
  });

  it('enregistre le HTML COMPOSÉ PAR LE SERVEUR, et le renvoie pour l’impression', async () => {
    const res = await POST(requete({ idSynthese: 'SYN_1', html: '<p>forgé par le navigateur</p>' }));
    expect(res.status).toBe(201);
    const corps = await res.json();
    expect(corps.ok).toBe(true);
    expect(corps.impression).toEqual({ id: 'imp_1', imprimeLe: '2026-10-18T15:00:00.000Z' });
    const entree = enregistrerImpression.mock.calls[0][0];
    expect(entree).toMatchObject({ idPatient: 'PAT_1', idSynthese: 'SYN_1', praticienEmail: 'p@wellneuro.fr' });
    expect(entree.html).not.toContain('forgé par le navigateur');
    expect(entree.html).toContain('Sophie Nicola');
    expect(corps.html).toBe(entree.html);
  });

  it('409 si la relecture sous verrou refuse — la réponse porte le refus relu', async () => {
    enregistrerImpression.mockResolvedValue({ ok: false, raison: 'consentement_partage_retire', message: 'retiré' });
    const res = await POST(requete({ idSynthese: 'SYN_1' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, reason: 'consentement_partage_retire', error: 'retiré' });
  });

  it('500 sans recopier l’erreur de la base', async () => {
    enregistrerImpression.mockRejectedValue(new Error('INSERT … <html> du document'));
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(requete({ idSynthese: 'SYN_1' }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('du document');
    erreur.mockRestore();
  });
});
