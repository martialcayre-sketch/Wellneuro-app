import { describe, expect, it } from 'vitest';
import {
  DUREE_EPISODE_JOURS,
  actionAlimentaire,
  buildEpisodeDepuisProtocole,
  episodeIdDepuisCycle,
  type ProtocoleSourceEpisode,
} from './episodeDepuisProtocole';

// `food`, et non `'alimentation'` : la fixture portait jusqu'ici un type qui
// n'existe à aucun contrat, et `type: string` l'acceptait ([[D-191]]).
const ACTION_ALIMENTAIRE = {
  type: 'food' as const,
  title: 'Ajouter une source de protéines au petit-déjeuner',
  minimalPlan: 'Le faire trois fois cette semaine.',
};

const PROTOCOLE: ProtocoleSourceEpisode = {
  purpose: 'Rendre l’action alimentaire praticable les jours chargés.',
  actions: [ACTION_ALIMENTAIRE],
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

  it('rend null sans action alimentaire — rien n’est inventé', () => {
    expect(buildEpisodeDepuisProtocole({
      idPatient: 'PAT_TEST',
      protocole: { ...PROTOCOLE, actions: [] },
    })).toBeNull();
  });

  // LE DÉFAUT QUE CE BANC FERME ([[D-191]]). Le carnet prenait `actions[0]`,
  // quelle que soit sa nature. Il ne se voyait pas tant que le constructeur
  // posait `food` en dur sur toute action neuve ; depuis que le type est un
  // geste praticien, la première action peut être une orientation médecin — et
  // le carnet ALIMENTAIRE l'aurait affichée comme l'essai à observer.
  it('s’ancre sur l’action alimentaire, jamais sur la première venue', () => {
    const episode = buildEpisodeDepuisProtocole({
      idPatient: 'PAT_TEST',
      protocole: {
        ...PROTOCOLE,
        actions: [
          { type: 'medical_referral', title: 'Consulter votre médecin', minimalPlan: 'Prendre rendez-vous.' },
          ACTION_ALIMENTAIRE,
        ],
      },
    })!;

    const content = episode.content;
    if (content.regime !== 'essai') throw new Error('régime inattendu');
    expect(content.action.labelPatient).toBe(ACTION_ALIMENTAIRE.title);
  });

  // Un protocole entier SANS action alimentaire n'ouvre aucun carnet : il ne
  // faut pas y loger l'orientation médecin faute de mieux.
  it('rend null sur un protocole sans aucune action alimentaire', () => {
    expect(buildEpisodeDepuisProtocole({
      idPatient: 'PAT_TEST',
      protocole: {
        ...PROTOCOLE,
        actions: [
          { type: 'medical_referral', title: 'Consulter votre médecin', minimalPlan: 'Prendre rendez-vous.' },
          { type: 'chronobiology', title: 'Avancer le coucher', minimalPlan: 'Vingt minutes plus tôt.' },
        ],
      },
    })).toBeNull();
  });

  it('élit la PREMIÈRE action alimentaire quand il y en a deux', () => {
    const deuxieme = { ...ACTION_ALIMENTAIRE, title: 'Boire un verre d’eau au réveil' };
    expect(actionAlimentaire([ACTION_ALIMENTAIRE, deuxieme])).toBe(ACTION_ALIMENTAIRE);
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
