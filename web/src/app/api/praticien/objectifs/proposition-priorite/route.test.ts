import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, messagesCreate } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  messagesCreate: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    objectifNegocie: { findFirst: vi.fn() },
    syntheseIA: { findFirst: vi.fn() },
    entreeCeQuiCompte: { findFirst: vi.fn() },
    // `update`, `delete` et `deleteMany` sont moqués EXPRÈS bien que la route ne
    // les appelle jamais : sans eux, l'assertion « append-only » lèverait au
    // lieu de compter zéro. Même motif que les bancs de `objectifs/route.ts`.
    propositionPrioriteIA: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    journalAccesDossier: { create: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: messagesCreate } },
  CLAUDE_MODEL: 'claude-modele-de-banc',
}));
vi.mock('@/lib/patient/featureFlag', () => ({ isDossierDeuxVoixEnabled: () => true }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: () => 'praticien@wellneuro.fr',
  verifierAppartenancePatient: vi.fn(async () => 'ok'),
}));

import { GET, POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/objectifs/proposition-priorite';

const SYNTHESE = {
  idSynthese: 'SYN_1',
  syntheseJson: {
    resume_praticien: 'Sommeil fragmenté en seconde partie de nuit, réveils à trois heures.',
    narratif_patient: 'Vos réponses évoquent un sommeil qui se rompt vers le milieu de la nuit.',
    // LE PIÈGE EST DANS LA FIXTURE, et c'est délibéré : le blob PORTE
    // `axes_prioritaires`. Si l'adaptateur rendait le blob, ce tableau ordonné
    // voyagerait avec les deux textes autorisés.
    axes_prioritaires: ['sommeil', 'stress', 'digestion'],
  },
};
const DEPOT = { id: 'DEP_1', texte: 'Je voudrais dormir sans me réveiller à trois heures.', saisiLe: null };

function reponseModele(texte: string) {
  return { content: [{ type: 'text', text: texte }] };
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({ actif: true, suiviClotureLe: null });
  prisma.syntheseIA.findFirst.mockResolvedValue(SYNTHESE);
  prisma.entreeCeQuiCompte.findFirst.mockResolvedValue(DEPOT);
  prisma.propositionPrioriteIA.findFirst.mockResolvedValue(null);
});

const get = (q = 'idPatient=PAT_TEST') => GET(new Request(`${URL_BASE}?${q}`));
const post = (body: unknown = { idPatient: 'PAT_TEST' }) =>
  POST(new Request(URL_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));

describe('GET — lit sans jamais appeler le modèle', () => {
  it('n’APPELLE PAS l’IA, même quand tout est là : ouvrir un cockpit ne fait pas parler la machine', async () => {
    await get();
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it('dit « aucune » quand les deux sources sont là mais que rien n’a été proposé', async () => {
    const corps = await (await get()).json();
    expect(corps.etat).toBe('aucune');
  });

  it('sert la MATIÈRE CITABLE même sans proposition — les deux citations arrivent seules', async () => {
    // `D-167` §1 et §2 : l'énoncé et la reformulation se pré-remplissent par
    // CITATION, sans qu'aucun appel n'ait lieu. Elles ne dépendent pas du bouton.
    const corps = await (await get()).json();
    expect(corps.matiere.enonce).toEqual({
      texte: 'Je voudrais dormir sans me réveiller à trois heures.',
      idDepot: 'DEP_1',
    });
    expect(corps.matiere.reformulation).toEqual({
      texte: 'Vos réponses évoquent un sommeil qui se rompt vers le milieu de la nuit.',
      idSynthese: 'SYN_1',
    });
    // ET RIEN DU BLOB : le tableau ordonné ne voyage pas avec les citations.
    expect(JSON.stringify(corps)).not.toContain('axes_prioritaires');
    expect(JSON.stringify(corps)).not.toContain('digestion');
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it('NOMME ce qui manque, sans jamais deviner une cause', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue(null);
    prisma.entreeCeQuiCompte.findFirst.mockResolvedValue(null);
    const corps = await (await get()).json();
    expect(corps.etat).toBe('sources_manquantes');
    expect(corps.manque.sort()).toEqual(['depot_patient', 'synthese_validee']);
  });

  it('distingue « pas de dépôt » de « pas de synthèse » — deux phrases différentes', async () => {
    prisma.entreeCeQuiCompte.findFirst.mockResolvedValue(null);
    const corps = await (await get()).json();
    expect(corps.manque).toEqual(['depot_patient']);
  });

  it('resserre la proposition FIGÉE : le dernier rang du couple de sources courant', async () => {
    prisma.propositionPrioriteIA.findFirst.mockResolvedValue({
      texte: 'Retrouver un sommeil continu', rang: 3, creeLe: new Date('2026-09-11T00:00:00Z'),
    });
    const corps = await (await get()).json();
    expect(corps.etat).toBe('proposee');
    expect(corps.proposition.texte).toBe('Retrouver un sommeil continu');
    expect(prisma.propositionPrioriteIA.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ idSynthese: 'SYN_1', idDepot: 'DEP_1' }),
        orderBy: { rang: 'desc' },
      }),
    );
  });

  it('ne lit QUE les synthèses validées', async () => {
    await get();
    expect(prisma.syntheseIA.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_TEST', statut: 'Validee_Praticien' } }),
    );
  });
});

describe('GET — la fraîcheur des citations (D-167 §13)', () => {
  const get13 = (amende: string) =>
    GET(new Request(`${URL_BASE}?idPatient=PAT_TEST&amende=${amende}`));

  it('ne sert AUCUNE fraîcheur quand aucune version n’est amendée', async () => {
    const corps = await (await get()).json();
    expect(corps.matiere.fraicheur).toBeUndefined();
    expect(prisma.objectifNegocie.findFirst).not.toHaveBeenCalled();
  });

  it('dit « identique » quand la version cite les sources courantes', async () => {
    prisma.objectifNegocie.findFirst.mockResolvedValue({
      enonceSourceId: 'DEP_1', reformulationSourceId: 'SYN_1',
    });
    const corps = await (await get13('OBJ_1')).json();
    expect(corps.matiere.fraicheur).toEqual({ enonce: 'identique', reformulation: 'identique' });
  });

  it('dit « plus_recente » quand la source a changé depuis', async () => {
    prisma.objectifNegocie.findFirst.mockResolvedValue({
      enonceSourceId: 'DEP_ANCIEN', reformulationSourceId: 'SYN_1',
    });
    const corps = await (await get13('OBJ_1')).json();
    expect(corps.matiere.fraicheur.enonce).toBe('plus_recente');
    expect(corps.matiere.fraicheur.reformulation).toBe('identique');
  });

  it('UNE PROVENANCE NULLE DIT « inconnue », JAMAIS « identique » (DC-24)', async () => {
    // Les objectifs écrits avant que la provenance ne soit constatée portent
    // des colonnes NULL. Les dire « à jour » affirmerait un fait qu'on n'a pas ;
    // les dire « périmés » proposerait de remplacer sans savoir par quoi.
    prisma.objectifNegocie.findFirst.mockResolvedValue({
      enonceSourceId: null, reformulationSourceId: null,
    });
    const corps = await (await get13('OBJ_ANCIEN')).json();
    expect(corps.matiere.fraicheur).toEqual({ enonce: 'inconnue', reformulation: 'inconnue' });
  });

  it('une version INTROUVABLE ne sert aucune fraîcheur — on ne sait pas', async () => {
    prisma.objectifNegocie.findFirst.mockResolvedValue(null);
    const corps = await (await get13('OBJ_FANTOME')).json();
    expect(corps.matiere.fraicheur).toBeUndefined();
  });

  it('la version amendée est cherchée DANS LE DOSSIER du patient', async () => {
    prisma.objectifNegocie.findFirst.mockResolvedValue({ enonceSourceId: 'DEP_1', reformulationSourceId: 'SYN_1' });
    await get13('OBJ_1');
    expect(prisma.objectifNegocie.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'OBJ_1', idPatient: 'PAT_TEST' } }),
    );
  });
});

describe('POST — produit un tirage', () => {
  it('envoie au modèle le résumé ET le dépôt verbatim, et RIEN du blob', async () => {
    messagesCreate.mockResolvedValue(reponseModele('Retrouver un sommeil continu'));
    await post();
    const envoye = JSON.stringify(messagesCreate.mock.calls[0][0]);
    expect(envoye).toContain('Sommeil fragmenté en seconde partie de nuit');
    expect(envoye).toContain('Je voudrais dormir sans me réveiller à trois heures.');
    // LE TABLEAU ORDONNÉ NE PART PAS. C'est le banc qui vaut tout le module.
    expect(envoye).not.toContain('axes_prioritaires');
    expect(envoye).not.toContain('digestion');
  });

  it('REFUSE les deux pièces incomplètes — 409, et la demande est bien formée', async () => {
    prisma.entreeCeQuiCompte.findFirst.mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(409);
    expect((await res.json()).manque).toEqual(['depot_patient']);
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it('REFUSE un libellé trop long au lieu de le couper', async () => {
    messagesCreate.mockResolvedValue(reponseModele('x'.repeat(201)));
    const res = await post();
    expect(res.status).toBe(502);
    const corps = await res.json();
    expect(corps.reason).toBe('proposition_trop_longue');
    expect(corps.error).toContain('refusée plutôt que coupée');
    expect(prisma.propositionPrioriteIA.create).not.toHaveBeenCalled();
  });

  it('accepte EXACTEMENT 200 caractères — la borne est un maximum inclusif', async () => {
    messagesCreate.mockResolvedValue(reponseModele('y'.repeat(200)));
    prisma.propositionPrioriteIA.create.mockResolvedValue({
      texte: 'y'.repeat(200), rang: 1, creeLe: new Date('2026-09-11T00:00:00Z'),
    });
    expect((await post()).status).toBe(201);
  });

  it('dit qu’un appel n’a pas abouti SANS jamais remonter le détail du fournisseur', async () => {
    messagesCreate.mockRejectedValue(new Error('402 quota dépassé pour la clé sk-ant-XXXX'));
    const corps = await (await post()).json();
    expect(corps.reason).toBe('proposition_indisponible');
    expect(JSON.stringify(corps)).not.toContain('sk-ant');
    expect(JSON.stringify(corps)).not.toContain('quota');
  });

  it('« une autre » écrit le rang SUIVANT et n’écrase rien', async () => {
    prisma.propositionPrioriteIA.findFirst.mockResolvedValue({ rang: 2 });
    messagesCreate.mockResolvedValue(reponseModele('Une autre formulation'));
    prisma.propositionPrioriteIA.create.mockResolvedValue({
      texte: 'Une autre formulation', rang: 3, creeLe: new Date('2026-09-11T00:00:00Z'),
    });
    await post();
    expect(prisma.propositionPrioriteIA.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rang: 3 }) }),
    );
    expect(prisma.propositionPrioriteIA.update).not.toHaveBeenCalled();
    expect(prisma.propositionPrioriteIA.updateMany).not.toHaveBeenCalled();
    expect(prisma.propositionPrioriteIA.delete).not.toHaveBeenCalled();
    expect(prisma.propositionPrioriteIA.deleteMany).not.toHaveBeenCalled();
  });

  it('écrit le modèle et la version de consigne — la promesse faite au patient', async () => {
    messagesCreate.mockResolvedValue(reponseModele('Retrouver un sommeil continu'));
    prisma.propositionPrioriteIA.create.mockResolvedValue({
      texte: 'Retrouver un sommeil continu', rang: 1, creeLe: new Date('2026-09-11T00:00:00Z'),
    });
    await post();
    const data = prisma.propositionPrioriteIA.create.mock.calls[0][0].data;
    expect(data.modele).toBe('claude-modele-de-banc');
    expect(data.versionConsigne).toBe('priorite-v1');
  });

  it('refuse une réponse vide plutôt que d’enregistrer une ligne muette', async () => {
    messagesCreate.mockResolvedValue(reponseModele('   '));
    const corps = await (await post()).json();
    expect(corps.reason).toBe('proposition_vide');
    expect(prisma.propositionPrioriteIA.create).not.toHaveBeenCalled();
  });
});
