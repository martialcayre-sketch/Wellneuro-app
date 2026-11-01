import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LE BANC QUI AURAIT ATTRAPÉ `A03`.
//
// Deux adaptateurs SÉLECTIONNAIENT `statutValidite` en base puis le PERDAIENT en
// reconstruisant l'objet passé au moteur de trajectoire. Le moteur, lui, porte
// bien le filtre — il n'était jamais atteint. Et comme le champ était optionnel
// dans `ReponseBrute`, le compilateur approuvait l'oubli : « absent » valait
// « VALID ».
//
// Aucun banc ne couvrait ces deux fichiers. Celui-ci les prend par leur seule
// sortie observable — le momentum — avec une passation RETIRÉE par le
// praticien. Si le champ se reperd un jour, ces cas rougissent.

const episodes = vi.fn();
const approbations = vi.fn(() => [] as unknown[]);
const reponses = vi.fn();
const patients = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    assessmentEpisode: { findMany: () => episodes() },
    // Aucune diffusion par défaut : le jour 0 de chaque cycle reste absent ([[D-255]]).
    protocolDiffusionApproval: { findMany: async () => approbations() },
    questionnaireReponse: { findMany: () => reponses() },
    patient: { findMany: () => patients() },
  },
}));
vi.mock('@/lib/praticien/appartenance', () => ({ filtrePatientsDuPraticien: () => ({}) }));

import { momentumJalonsParPatient } from '@/lib/fil/momentumJ21';
import { chargerTrajectoiresCabinet } from '@/lib/praticien/chargementCabinet';

const ID = 'pat_1';
const RAW = { P1: '2', P2: '2', P3: '3', P4: '3', P5: '3', P6: '2', P7: '3', P8: '3', P9: '2', P10: '3' };

/** Un T0 confirmé au 1ᵉʳ janvier — l'ancre du cycle. */
const EPISODES = [
  { id: 'ep_T0', idPatient: ID, milestone: 'T0', confirmedAt: new Date('2026-01-01T00:00:00.000Z'), cycleId: 'ep_T0', versionScore: 'v1' },
];

/** Une diffusion recevable du cycle `ep_T0` — elle en fixe le jour 0 ([[D-255]]). */
function diffusion(approvedAt: Date) {
  return {
    id: 'appr_1', idPatient: ID, approvedAt, createdAt: approvedAt, approvedBy: 'practitioner',
    confirmation: 'content_approved_for_diffusion', decisionCardInputHash: 'carte', protocolDraftInputHash: 'version',
    protocolDraftId: 'pd_1',
    draft: {
      idPatient: ID, inputHash: 'version', decisionCardInputHash: 'carte', status: 'practitioner_reviewed',
      reviewedAt: new Date(approvedAt.getTime() - 60_000), selectedPriorityId: 'prio_1',
      episode: { id: 'ep_T0', milestone: 'T0', cycleId: 'ep_T0' },
    },
  };
}

/** Deux passations : l'ancre, puis la lecture J21 dont le statut décide de tout. */
function passations(statutJ21: string | null) {
  return [
    { idPatient: ID, idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-01-01T00:00:00.000Z'), scoresJson: { rawAnswers: RAW }, statutValidite: null },
    { idPatient: ID, idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-01-22T00:00:00.000Z'), scoresJson: { rawAnswers: RAW }, statutValidite: statutJ21 },
  ];
}

const LECTEURS = [
  {
    nom: 'momentumJ21 (carte de Fil)',
    lire: async () => (await momentumJalonsParPatient([ID])).get(ID)?.momentum ?? null,
    motif: async () => (await momentumJalonsParPatient([ID])).get(ID)?.motif ?? null,
  },
  {
    nom: 'chargementCabinet (Trajectoires, cabinet-momentum)',
    lire: async () => {
      patients.mockReturnValue([{ idPatient: ID, prenom: 'Sophie', nom: 'Nicola', email: 's@n.invalid' }]);
      const lignes = await chargerTrajectoiresCabinet('praticien@wellneuro.fr');
      return lignes[0]?.trajectoire.cycles[0]?.momentum ?? null;
    },
    motif: async () => {
      patients.mockReturnValue([{ idPatient: ID, prenom: 'Sophie', nom: 'Nicola', email: 's@n.invalid' }]);
      const lignes = await chargerTrajectoiresCabinet('praticien@wellneuro.fr');
      return lignes[0]?.trajectoire.cycles[0]?.motifMomentum ?? null;
    },
  },
];

describe.each(LECTEURS)('$nom — le statut de validité atteint le moteur', ({ lire }) => {
  const initial = process.env.WN_ENABLE_VALIDITE_PASSATIONS;

  beforeEach(() => {
    process.env.WN_ENABLE_VALIDITE_PASSATIONS = '1';
    episodes.mockReturnValue(EPISODES);
    // [[D-397]] §2 : sans jour 0, aucun momentum — la diffusion du jour de
    // l'ancre ouvre le calendrier, pour que le statut seul décide.
    approbations.mockReturnValue([diffusion(new Date('2026-01-01T00:00:00.000Z'))]);
  });

  afterEach(() => {
    approbations.mockReturnValue([]);
    vi.clearAllMocks();
    if (initial === undefined) delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    else process.env.WN_ENABLE_VALIDITE_PASSATIONS = initial;
  });

  it('une passation VALIDE produit bien un momentum — sinon le cas suivant ne prouverait rien', async () => {
    reponses.mockReturnValue(passations(null));
    expect(await lire()).not.toBeNull();
  });

  it('LA MÊME, RETIRÉE du raisonnement, n’en produit aucun', async () => {
    reponses.mockReturnValue(passations('INVALID'));
    expect(
      await lire(),
      'une passation retirée par le praticien pèse encore sur ce que la surface affiche',
    ).toBeNull();
  });
});

// [[D-397]] (amende ce banc de [[D-255]]) : LE JOUR 0 ATTEINT LE MOTEUR, et le
// momentum en dépend. Sans diffusion, le repli sur l'ancre donnait un momentum
// au J21 compté depuis elle : il est retiré, avec son motif. Une diffusion
// récente ouvre le calendrier ; la passation du 22 janvier, postérieure à
// l'ancre et hors de toute fenêtre de jalon comptée depuis ce jour 0, est une
// remesure libre (§3) : elle forme la paire.
describe.each(LECTEURS)('$nom — le jour 0 du suivi atteint le moteur (D-255, D-397)', ({ lire, motif }) => {
  beforeEach(() => {
    episodes.mockReturnValue(EPISODES);
    reponses.mockReturnValue(passations(null));
  });

  afterEach(() => {
    approbations.mockReturnValue([]);
    vi.clearAllMocks();
  });

  it('sans diffusion, aucun momentum, même là où le repli en produisait un — et le motif le dit', async () => {
    expect(await lire()).toBeNull();
    expect(await motif()).toBe('sans_jour_zero');
  });

  it('une diffusion récente : la remesure antérieure au jour 0, postérieure à l’ancre, forme la paire', async () => {
    approbations.mockReturnValue([diffusion(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000))]);
    expect(await lire()).not.toBeNull();
    expect(await motif()).toBeNull();
  });
});
