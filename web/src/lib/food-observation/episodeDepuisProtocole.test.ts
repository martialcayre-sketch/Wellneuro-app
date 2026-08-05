import { describe, expect, it } from 'vitest';
import {
  DUREE_EPISODE_JOURS,
  buildEpisodeDepuisProtocole,
  episodeIdDepuisCycle,
  type ProtocoleSourceEpisode,
} from './episodeDepuisProtocole';

const PROTOCOLE: ProtocoleSourceEpisode = {
  purpose: 'Rendre l’action alimentaire praticable les jours chargés.',
  actionPrincipale: {
    type: 'alimentation',
    title: 'Ajouter une source de protéines au petit-déjeuner',
    minimalPlan: 'Le faire trois fois cette semaine.',
  },
  cycleRef: 'abcdef0123456789',
  debutCycle: '2026-07-20T08:00:00.000Z',
};

describe('buildEpisodeDepuisProtocole', () => {
  it('dérive hypothèse, action et fenêtre du protocole diffusé', () => {
    const episode = buildEpisodeDepuisProtocole({ idPatient: 'PAT_TEST', protocole: PROTOCOLE });

    expect(episode).not.toBeNull();
    expect(episode!.patientId).toBe('PAT_TEST');
    expect(episode!.startDate).toBe('2026-07-20');
    // Fenêtre de 21 jours, alignée sur les jalons J7 | J14 | J21 — et non les
    // 7 jours en dur du gabarit retiré.
    expect(episode!.endDate).toBe('2026-08-09');
    expect(DUREE_EPISODE_JOURS).toBe(21);

    const content = episode!.content;
    expect(content.regime).toBe('essai');
    if (content.regime !== 'essai') throw new Error('régime inattendu');
    expect(content.hypothese).toBe(PROTOCOLE.purpose);
    expect(content.action.labelPatient).toBe('Ajouter une source de protéines au petit-déjeuner');
    expect(content.action.simplePlan).toBe('Le faire trois fois cette semaine.');
    // Aucune version « idéale » n'est reconstituée : la vue patient ne la porte
    // pas, et l'inventer est exactement ce que faisait le gabarit.
    expect(content.action.idealPlan).toBeUndefined();
  });

  it('rend null sans action principale — rien n’est inventé', () => {
    expect(buildEpisodeDepuisProtocole({
      idPatient: 'PAT_TEST',
      protocole: { ...PROTOCOLE, actionPrincipale: null },
    })).toBeNull();
  });

  it('rend null sans patient et sans référence de cycle', () => {
    expect(buildEpisodeDepuisProtocole({ idPatient: '', protocole: PROTOCOLE })).toBeNull();
    expect(buildEpisodeDepuisProtocole({
      idPatient: 'PAT_TEST',
      protocole: { ...PROTOCOLE, cycleRef: '' },
    })).toBeNull();
  });

  // `ja_${idPatient}` rendait deux essais successifs indiscernables : un seul
  // épisode possible par patient, pour toujours.
  it('donne un identifiant distinct à deux cycles successifs', () => {
    const premier = buildEpisodeDepuisProtocole({ idPatient: 'PAT_TEST', protocole: PROTOCOLE })!;
    const second = buildEpisodeDepuisProtocole({
      idPatient: 'PAT_TEST',
      protocole: { ...PROTOCOLE, cycleRef: '9876543210fedcba', debutCycle: '2026-09-01T08:00:00.000Z' },
    })!;

    expect(premier.episodeId).toBe('ja_PAT_TEST_abcdef0123456789');
    expect(second.episodeId).not.toBe(premier.episodeId);
    expect(episodeIdDepuisCycle('PAT_TEST', PROTOCOLE.cycleRef)).toBe(premier.episodeId);
  });

  it('refuse une date de cycle illisible plutôt que de la deviner', () => {
    expect(() => buildEpisodeDepuisProtocole({
      idPatient: 'PAT_TEST',
      protocole: { ...PROTOCOLE, debutCycle: 'pas-une-date' },
    })).toThrow(TypeError);
  });
});
