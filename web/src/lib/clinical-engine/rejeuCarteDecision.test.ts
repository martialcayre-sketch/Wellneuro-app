import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, entreesRuntime, construireChaineC1Tolerante, lireSelectionPriorite, lireEffetsIndesirables } =
  vi.hoisted(() => ({
    prisma: { assessmentEpisode: { findUnique: vi.fn() } },
    entreesRuntime: vi.fn(),
    construireChaineC1Tolerante: vi.fn(),
    lireSelectionPriorite: vi.fn(),
    lireEffetsIndesirables: vi.fn(),
  }));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('./verifierChaineC1', () => ({ entreesRuntime }));
vi.mock('./selectionPrioritePrisma', () => ({ construireChaineC1Tolerante, lireSelectionPriorite }));
vi.mock('./effetsIndesirablesPrisma', () => ({ lireEffetsIndesirables }));

import { canonicalSha256 } from './canonical';
import { rejouerCarteDecision } from './rejeuCarteDecision';

const ID_PATIENT = 'PAT_TEST';
const ID_EPISODE = 'runtime-episode-PAT_TEST-T0';
const ID_CARTE = 'runtime-decision-PAT_TEST-T0';
const EMPREINTE_APPROUVEE = 'empreinte-approuvee';

// Épisode confirmé RÉEL au sens de son empreinte : le banc la calcule au lieu de
// la poser, sinon la garde d'intégrité ne garderait rien.
const EPISODE = {
  assessmentEpisodeId: ID_EPISODE,
  patientId: ID_PATIENT,
  status: 'confirmed' as const,
  confirmedAt: '2026-07-01T09:00:00.000Z',
  includedResponseIds: ['r1', 'r2'],
};

function entrees(responseIds: string[] = ['r1', 'r2', 'r3']) {
  return {
    responses: responseIds.map(responseId => ({ responseId })),
    patientContext: {},
    signauxAlerte: [],
    etatPopulation: {},
  };
}

function appel(overrides: Record<string, unknown> = {}) {
  return rejouerCarteDecision({
    idPatient: ID_PATIENT,
    decisionCardId: ID_CARTE,
    assessmentEpisodeId: ID_EPISODE,
    decisionCardInputHash: EMPREINTE_APPROUVEE,
    ...overrides,
  });
}

describe('rejouerCarteDecision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.assessmentEpisode.findUnique.mockResolvedValue({
      payload: EPISODE,
      payloadHash: canonicalSha256(EPISODE),
    });
    entreesRuntime.mockResolvedValue(entrees());
    lireSelectionPriorite.mockResolvedValue(null);
    lireEffetsIndesirables.mockResolvedValue([]);
    construireChaineC1Tolerante.mockReturnValue({
      chaine: { decisionCard: { decisionCardId: ID_CARTE, inputHash: EMPREINTE_APPROUVEE } },
      selectionEcartee: false,
    });
  });

  it('rend la carte rejouée quand son empreinte est encore celle qui a été approuvée', async () => {
    const rejeu = await appel();
    expect(rejeu.ok).toBe(true);
    if (!rejeu.ok) throw new Error('rejeu attendu');
    expect(rejeu.decisionCard.inputHash).toBe(EMPREINTE_APPROUVEE);
  });

  // L'HORODATAGE DE LA CONFIRMATION, JAMAIS L'HEURE COURANTE : il entre dans les
  // trois empreintes. Rejouer « maintenant » ferait diverger toute carte honnête
  // dès la première seconde.
  it('rejoue à l’horodatage de confirmation de l’épisode', async () => {
    await appel();
    expect(construireChaineC1Tolerante).toHaveBeenCalledWith(
      expect.objectContaining({ horodatage: EPISODE.confirmedAt, episode: EPISODE, patientId: ID_PATIENT }),
      null,
    );
  });

  // LA GARDE DE FRAÎCHEUR. C'est elle qui décide ce que le patient voit.
  it('refuse une carte dont l’empreinte a dérivé depuis l’approbation', async () => {
    construireChaineC1Tolerante.mockReturnValue({
      chaine: { decisionCard: { decisionCardId: ID_CARTE, inputHash: 'empreinte-qui-a-bouge' } },
      selectionEcartee: false,
    });
    expect(await appel()).toEqual({ ok: false, motif: 'carte_derivee' });
  });

  it('refuse un brouillon qui ne nomme aucun épisode', async () => {
    expect(await appel({ assessmentEpisodeId: null })).toEqual({ ok: false, motif: 'episode_absent' });
    expect(prisma.assessmentEpisode.findUnique).not.toHaveBeenCalled();
  });

  it('refuse un épisode introuvable', async () => {
    prisma.assessmentEpisode.findUnique.mockResolvedValue(null);
    expect(await appel()).toEqual({ ok: false, motif: 'episode_absent' });
  });

  // UN PAYLOAD QU'ON NE SAIT PAS RECOUPER NE SE REJOUE PAS.
  it('refuse un payload d’épisode incohérent avec son empreinte', async () => {
    prisma.assessmentEpisode.findUnique.mockResolvedValue({
      payload: EPISODE,
      payloadHash: 'empreinte-qui-ne-correspond-pas',
    });
    expect(await appel()).toEqual({ ok: false, motif: 'episode_illisible' });
    expect(construireChaineC1Tolerante).not.toHaveBeenCalled();
  });

  // UN ÉPISODE D'UN AUTRE DOSSIER NE SE REJOUE PAS ICI, même si son empreinte
  // est intacte : la route a prouvé la session d'UN patient.
  it('refuse un épisode qui ne porte pas ce patient', async () => {
    const autre = { ...EPISODE, patientId: 'PAT_AUTRE' };
    prisma.assessmentEpisode.findUnique.mockResolvedValue({
      payload: autre, payloadHash: canonicalSha256(autre),
    });
    expect(await appel()).toEqual({ ok: false, motif: 'episode_illisible' });
  });

  // UNE PASSATION DEVENUE ILLISIBLE ferait jeter le moteur plus bas : le refus
  // serait alors un accident au lieu d'un constat.
  it('refuse quand une passation de l’épisode n’est plus lisible', async () => {
    entreesRuntime.mockResolvedValue(entrees(['r1']));
    expect(await appel()).toEqual({ ok: false, motif: 'episode_illisible' });
    expect(construireChaineC1Tolerante).not.toHaveBeenCalled();
  });

  // FAIL-CLOSED : une exception du moteur est un refus, jamais un laissez-passer.
  it('refuse quand le moteur clinique jette', async () => {
    construireChaineC1Tolerante.mockImplementation(() => { throw new TypeError('règle non signée'); });
    expect(await appel()).toEqual({ ok: false, motif: 'chaine_irrejouable' });
  });

  // LA LECTURE DU DOSSIER EST CELLE DU COCKPIT ET DU VÉRIFICATEUR, par la même
  // fonction : une troisième lecture « équivalente » finirait par diverger, et
  // l'écran du patient s'éteindrait sur une carte honnête.
  it('lit le dossier par la lecture partagée, jamais par une requête à elle', async () => {
    await appel();
    expect(entreesRuntime).toHaveBeenCalledWith(ID_PATIENT);
    expect(lireSelectionPriorite).toHaveBeenCalledWith(ID_PATIENT, ID_CARTE);
    expect(lireEffetsIndesirables).toHaveBeenCalledWith(ID_PATIENT);
  });
});
