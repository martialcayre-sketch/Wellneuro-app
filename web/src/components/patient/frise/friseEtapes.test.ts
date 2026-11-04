import { describe, expect, it } from 'vitest';
import { buildJourneySteps, type JourneyStep } from '@/components/patient/PatientJourneyProgress';
import { cibleEtape, type CibleEtape, type SignauxFrise } from './friseEtapes';
import { friseNavigableOuverte } from './friseDrapeau';

// Le tableau étape → cible de [[D-423]] §8, case par case.

const BASE: SignauxFrise = { token: 'PAT_TEST', etape: null, bilanConsultable: false, listeQuestionnairesRendue: true };
const ATTENTE =
  'Votre praticien prépare votre restitution à partir des éléments transmis. Vous la retrouverez ici dès qu’elle sera prête.';

function cibles(courante: JourneyStep['id'], signaux: Partial<SignauxFrise> = {}): CibleEtape[] {
  return buildJourneySteps(courante).map(step => cibleEtape(step, { ...BASE, ...signaux }));
}

const AUCUNE = { type: 'aucune' };

describe('frise navigable — tableau étape → cible ([[D-423]] §8)', () => {
  it('étapes 1 à 3 passées : non cliquables, quel que soit l’état', () => {
    for (const courante of [4, 5, 6] as const) {
      expect(cibles(courante).slice(0, 3)).toEqual([AUCUNE, AUCUNE, AUCUNE]);
    }
  });

  it('étape 4 courante : la liste des questionnaires, ou « Mon parcours » si elle n’est pas rendue', () => {
    expect(cibles(4)[3]).toEqual({ type: 'lien', href: '#mes-questionnaires' });
    expect(cibles(4, { listeQuestionnairesRendue: false })[3]).toEqual({ type: 'lien', href: '#mon-parcours' });
  });

  it('étape 4 passée : même cible', () => {
    expect(cibles(5, { etape: 'elements_transmis' })[3]).toEqual({ type: 'lien', href: '#mes-questionnaires' });
    expect(cibles(6, { etape: 'restitution_disponible', listeQuestionnairesRendue: false })[3]).toEqual({
      type: 'lien',
      href: '#mon-parcours',
    });
  });

  it('étapes 5 et 6 à venir : fermées', () => {
    expect(cibles(4, { bilanConsultable: true }).slice(4)).toEqual([AUCUNE, AUCUNE]);
  });

  it('étape 5 courante, `analyse_en_cours` : le texte d’attente accepté mot pour mot', () => {
    expect(cibles(5, { etape: 'analyse_en_cours' })[4]).toEqual({ type: 'texte', texte: ATTENTE });
  });

  it('étape 5 courante, `elements_transmis` : la phrase déjà servie, aucun texte neuf', () => {
    expect(cibles(5, { etape: 'elements_transmis' })[4]).toEqual({
      type: 'texte',
      texte: 'Vos éléments ont été transmis.',
    });
  });

  it('étape 5 courante sans état dérivé : non cliquable, jamais un texte deviné', () => {
    expect(cibles(5, { etape: null })[4]).toEqual(AUCUNE);
  });

  it('étape 5 passée : non cliquable (Q32)', () => {
    expect(cibles(6, { etape: 'restitution_disponible', bilanConsultable: true })[4]).toEqual(AUCUNE);
  });

  it('étape 6 courante : le bilan quand il est consultable, sinon non cliquable, jamais de texte (Q31)', () => {
    for (const etape of ['restitution_disponible', 'prochaine_etape_prete'] as const) {
      expect(cibles(6, { etape, bilanConsultable: true })[5]).toEqual({ type: 'lien', href: '/portail/PAT_TEST/bilan' });
      expect(cibles(6, { etape, bilanConsultable: false })[5]).toEqual(AUCUNE);
    }
  });

  it('aucune cible ne vise `/conditions` ni `/informations`, aucune n’est une route neuve', () => {
    const hrefs = ([4, 5, 6] as const).flatMap(courante =>
      cibles(courante, { etape: courante === 4 ? null : 'analyse_en_cours', bilanConsultable: true })
        .filter((c): c is { type: 'lien'; href: string } => c.type === 'lien')
        .map(c => c.href),
    );
    expect(new Set(hrefs)).toEqual(new Set(['#mes-questionnaires', '/portail/PAT_TEST/bilan']));
  });
});

describe('drapeau `WN_PORTAIL_FRISE_NAVIGABLE`', () => {
  it('fermé par défaut, ouvert par la seule chaîne « true »', () => {
    expect(friseNavigableOuverte(undefined)).toBe(false);
    expect(friseNavigableOuverte('')).toBe(false);
    expect(friseNavigableOuverte('1')).toBe(false);
    expect(friseNavigableOuverte('TRUE')).toBe(false);
    expect(friseNavigableOuverte('true')).toBe(true);
  });
});
