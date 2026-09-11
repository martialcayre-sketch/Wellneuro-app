import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    syntheseIA: { findFirst: vi.fn() },
    entreeCeQuiCompte: { findFirst: vi.fn() },
    propositionPrioriteIA: { findFirst: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { constaterProvenance } from './provenanceVerifiee';

const DEPOT_TEXTE = 'Je voudrais dormir sans me réveiller à trois heures.';
const NARRATIF = 'Vos réponses évoquent un sommeil qui se rompt vers le milieu de la nuit.';

beforeEach(() => {
  vi.clearAllMocks();
  prisma.syntheseIA.findFirst.mockResolvedValue({
    idSynthese: 'SYN_1',
    syntheseJson: {
      resume_praticien: 'Sommeil fragmenté.',
      narratif_patient: NARRATIF,
      axes_prioritaires: ['sommeil', 'stress'],
    },
  });
  prisma.entreeCeQuiCompte.findFirst.mockResolvedValue({ id: 'DEP_1', texte: DEPOT_TEXTE, saisiLe: null });
  prisma.propositionPrioriteIA.findFirst.mockResolvedValue(null);
});

const textes = (p: Partial<Record<string, string | null>> = {}) => ({
  enoncePatient: null, reformulationPraticien: null, priorite: null, ...p,
});

describe('la provenance se CONSTATE, jamais ne se déclare', () => {
  it('pose la citation de l’énoncé quand le texte correspond EXACTEMENT', async () => {
    const c = await constaterProvenance('PAT_1', textes({ enoncePatient: DEPOT_TEXTE }));
    expect(c.enonceSource).toBe('ce_qui_compte');
    expect(c.enonceSourceId).toBe('DEP_1');
  });

  it('NE POSE RIEN sur un énoncé retouché — la marque tombe d’elle-même', async () => {
    const c = await constaterProvenance('PAT_1', textes({ enoncePatient: `${DEPOT_TEXTE} Et fatigué.` }));
    expect(c.enonceSource).toBeUndefined();
    expect(c.enonceSourceId).toBeUndefined();
  });

  it('un espace de bord ne distingue rien — il vient du champ, pas de la main', async () => {
    const c = await constaterProvenance('PAT_1', textes({ enoncePatient: `  ${DEPOT_TEXTE}  ` }));
    expect(c.enonceSource).toBe('ce_qui_compte');
  });

  it('la CASSE et les espaces INTERNES, eux, distinguent : ce sont ses mots à lui', async () => {
    const c = await constaterProvenance('PAT_1', textes({ enoncePatient: DEPOT_TEXTE.toUpperCase() }));
    expect(c.enonceSource).toBeUndefined();
    const d = await constaterProvenance('PAT_1', textes({ enoncePatient: DEPOT_TEXTE.replace(' ', '  ') }));
    expect(d.enonceSource).toBeUndefined();
  });

  it('pose la reformulation citée du narratif, en nommant la bonne table', async () => {
    const c = await constaterProvenance('PAT_1', textes({ reformulationPraticien: NARRATIF }));
    expect(c.reformulationSource).toBe('synthese_ia');
    expect(c.reformulationSourceId).toBe('SYN_1');
  });

  it('pose la priorité AVEC son rang quand elle est le tirage tel quel', async () => {
    prisma.propositionPrioriteIA.findFirst.mockResolvedValue({ rang: 2 });
    const c = await constaterProvenance('PAT_1', textes({ priorite: 'Retrouver un sommeil continu' }));
    expect(c.prioriteSource).toBe('proposition_ia');
    expect(c.prioriteSourceSyntheseId).toBe('SYN_1');
    expect(c.prioriteSourceDepotId).toBe('DEP_1');
    expect(c.prioritePrompt).toBe('priorite-v1');
    expect(c.prioriteSourceRang).toBe(2);
  });

  it('CHERCHE LE TIRAGE PAR SON TEXTE, pas le dernier en date', async () => {
    // Un praticien qui accepte le tirage 2 après en avoir vu un 3ᵉ garde le
    // rang 2. Chercher « le dernier » lui attribuerait le 3ᵉ, qu'il a écarté.
    await constaterProvenance('PAT_1', textes({ priorite: 'Un texte précis' }));
    const args = prisma.propositionPrioriteIA.findFirst.mock.calls[0][0];
    expect(args.where.texte).toBe('Un texte précis');
  });

  it('LE RANG TOMBE AVEC LA MARQUE : priorité réécrite, aucune provenance', async () => {
    prisma.propositionPrioriteIA.findFirst.mockResolvedValue(null);
    const c = await constaterProvenance('PAT_1', textes({ priorite: 'Ma propre formulation' }));
    expect(c.prioriteSource).toBeUndefined();
    expect(c.prioriteSourceRang).toBeUndefined();
  });

  it('SANS DÉPÔT, aucune priorité proposée n’est revendiquée (D-167 §3 amendé)', async () => {
    prisma.entreeCeQuiCompte.findFirst.mockResolvedValue(null);
    prisma.propositionPrioriteIA.findFirst.mockResolvedValue({ rang: 1 });
    const c = await constaterProvenance('PAT_1', textes({ priorite: 'Retrouver un sommeil continu' }));
    expect(c.prioriteSource).toBeUndefined();
    expect(prisma.propositionPrioriteIA.findFirst).not.toHaveBeenCalled();
  });

  it('une synthèse NON validée ne se cite pas', async () => {
    await constaterProvenance('PAT_1', textes({ reformulationPraticien: NARRATIF }));
    expect(prisma.syntheseIA.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_1', statut: 'Validee_Praticien' } }),
    );
  });

  it('une lecture en ÉCHEC ne perd pas l’objectif : provenance vide, jamais d’exception', async () => {
    prisma.syntheseIA.findFirst.mockRejectedValue(new Error('base injoignable'));
    await expect(
      constaterProvenance('PAT_1', textes({ enoncePatient: DEPOT_TEXTE })),
    ).resolves.toEqual({});
  });

  it('les trois provenances sont INDÉPENDANTES — citer l’une n’engage pas les autres', async () => {
    const c = await constaterProvenance('PAT_1', textes({ enoncePatient: DEPOT_TEXTE, priorite: 'inconnue' }));
    expect(c.enonceSource).toBe('ce_qui_compte');
    expect(c.reformulationSource).toBeUndefined();
    expect(c.prioriteSource).toBeUndefined();
  });

  it('AUCUNE DÉCLARATION N’EST ACCEPTÉE : la signature ne prend que des textes', async () => {
    // La garde est dans le type — `constaterProvenance` ne reçoit aucun
    // identifiant de source. Ce banc fige l'intention pour qu'un paramètre
    // ajouté « par commodité » se voie en revue.
    expect(constaterProvenance.length).toBe(2);
  });
});
