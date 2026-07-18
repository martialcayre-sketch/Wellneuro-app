import { describe, expect, it } from 'vitest';
import {
  activerEpisode,
  BUDGET_DEFAUT_TRACES_PAR_SEMAINE,
  changeRegime,
  cloreEpisode,
  createAttentionBudget,
  createEpisode,
  readFoodObservationEpisode,
  reprendreEpisode,
  suspendreEpisode,
} from './episode';
import { getCurrentRecommendedPlateRef } from '@/lib/food-compass/plates';
import type { CalibrageRegimeContent, EssaiRegimeContent, SilenceRegimeContent } from './types';

const essaiContent: EssaiRegimeContent = {
  regime: 'essai',
  hypothese: 'Le petit-déjeuner protéiné est plus faisable les jours télétravaillés.',
  action: {
    actionId: 'action-1',
    labelPatient: 'Ajouter des flocons d’avoine au petit-déjeuner',
    idealPlan: 'Flocons d’avoine chaque matin de semaine',
    simplePlan: 'Flocons d’avoine les jours sans déplacement',
    secoursPlan: 'Une poignée de noix si le petit-déjeuner saute',
  },
};

const silenceContent: SilenceRegimeContent = {
  regime: 'silence',
  observationPrescrite: false,
};

function episodeEssai() {
  return createEpisode({
    episodeId: 'ep-1',
    patientId: 'patient-sophie-nicola',
    startDate: '2026-07-20',
    endDate: '2026-08-10',
    content: essaiContent,
  });
}

describe('createEpisode', () => {
  it('crée un épisode préparé avec le budget par défaut (3/semaine, jamais quotidien)', () => {
    const episode = episodeEssai();
    expect(episode.statut).toBe('prepare');
    expect(episode.budget.tracesParSemaine).toBe(BUDGET_DEFAUT_TRACES_PAR_SEMAINE);
    expect(episode.budget.tracesParSemaine).toBeLessThan(7);
    expect(episode.schemaVersion).toBe('ja-domaine-v1');
  });

  it('supporte les trois régimes, dont le silence sans observation prescrite', () => {
    const episode = createEpisode({
      episodeId: 'ep-2',
      patientId: 'patient-jennifer-martin',
      startDate: '2026-07-20',
      endDate: '2026-07-27',
      content: silenceContent,
    });
    expect(episode.content.regime).toBe('silence');
    if (episode.content.regime === 'silence') {
      expect(episode.content.observationPrescrite).toBe(false);
    }
  });

  it('refuse une période incohérente', () => {
    expect(() =>
      createEpisode({
        episodeId: 'ep-3',
        patientId: 'patient-michel-dogne',
        startDate: '2026-08-10',
        endDate: '2026-07-20',
        content: essaiContent,
      })
    ).toThrow(/postérieure/);
  });

  it('exige hypothèse et plans en régime essai', () => {
    expect(() =>
      createEpisode({
        episodeId: 'ep-4',
        patientId: 'patient-sophie-nicola',
        startDate: '2026-07-20',
        endDate: '2026-08-10',
        content: { ...essaiContent, hypothese: '  ' },
      })
    ).toThrow(/requis/);
  });

  it('relit JA V1 sans assiette et JA V2 avec une référence C5B courante', () => {
    const legacy = episodeEssai();
    expect(readFoodObservationEpisode(legacy).content).toEqual(legacy.content);

    const withPlate = createEpisode({
      episodeId: 'ep-v2', patientId: 'patient-sophie-nicola',
      startDate: '2026-07-20', endDate: '2026-08-10',
      content: {
        ...essaiContent,
        action: {
          ...essaiContent.action,
          recommendedPlateRef: getCurrentRecommendedPlateRef('ASSIETTE_SOIR_LEGER'),
        },
      },
    });
    const read = readFoodObservationEpisode(withPlate);
    expect(read.content.regime).toBe('essai');
    if (read.content.regime === 'essai') {
      expect(read.content.action.recommendedPlateRef?.plateCode).toBe('ASSIETTE_SOIR_LEGER');
    }
  });

  it('refuse une référence d’assiette inconnue ou caduque', () => {
    const current = getCurrentRecommendedPlateRef('ASSIETTE_SOIR_LEGER');
    expect(() => createEpisode({
      episodeId: 'ep-v2-bad', patientId: 'patient-sophie-nicola',
      startDate: '2026-07-20', endDate: '2026-08-10',
      content: {
        ...essaiContent,
        action: {
          ...essaiContent.action,
          recommendedPlateRef: { ...current, catalogVersion: 'catalog-v0' },
        },
      },
    })).toThrow(/caduque/);
  });
});

describe('budget d’attention (amendement terrain n° 3)', () => {
  it('accepte les bornes réelles du panel : 2 et 7 traces/semaine', () => {
    expect(createAttentionBudget(2).tracesParSemaine).toBe(2);
    expect(createAttentionBudget(7).tracesParSemaine).toBe(7);
  });

  it('refuse hors bornes (1, 8) et les valeurs non entières', () => {
    expect(() => createAttentionBudget(1)).toThrow(/entre 2 et 7/);
    expect(() => createAttentionBudget(8)).toThrow(/entre 2 et 7/);
    expect(() => createAttentionBudget(3.5)).toThrow(/entre 2 et 7/);
  });
});

describe('transitions de régime (A7-11 amendé)', () => {
  it('autorise calibrage → essai', () => {
    const calibrage = createEpisode({
      episodeId: 'ep-5',
      patientId: 'patient-michel-dogne',
      startDate: '2026-07-20',
      endDate: '2026-07-24',
      content: {
        regime: 'calibrage',
        questionsBilan: {
          structureDesPrises: true,
          regulariteHoraires: true,
          presenceMarqueursPertinents: true,
        },
        marqueursPertinents: ['flocons d’avoine', 'noix'],
      },
    });
    const essai = changeRegime(calibrage, essaiContent);
    expect(essai.content.regime).toBe('essai');
  });

  it('autorise essai ⇄ silence (droit au silence puis reprise)', () => {
    const enSilence = changeRegime(episodeEssai(), silenceContent);
    expect(enSilence.content.regime).toBe('silence');
    const repris = changeRegime(enSilence, essaiContent);
    expect(repris.content.regime).toBe('essai');
  });

  it('interdit essai → calibrage et silence → calibrage', () => {
    const calibrageContent: CalibrageRegimeContent = {
      regime: 'calibrage',
      questionsBilan: {
        structureDesPrises: true,
        regulariteHoraires: true,
        presenceMarqueursPertinents: true,
      },
      marqueursPertinents: [],
    };
    expect(() => changeRegime(episodeEssai(), calibrageContent)).toThrow(/interdite/);
    const enSilence = changeRegime(episodeEssai(), silenceContent);
    expect(() => changeRegime(enSilence, calibrageContent)).toThrow(/interdite/);
  });

  it('interdit tout changement de régime sur un épisode clos', () => {
    const clos = cloreEpisode(episodeEssai());
    expect(() => changeRegime(clos, silenceContent)).toThrow(/clos/);
  });
});

describe('statut : suspension sans justification (JA-00 A4)', () => {
  it('suspend et reprend en un geste, sans motif', () => {
    const actif = activerEpisode(episodeEssai());
    const suspendu = suspendreEpisode(actif);
    expect(suspendu.statut).toBe('suspendu');
    expect(reprendreEpisode(suspendu).statut).toBe('actif');
  });

  it('clôt depuis tout état non clos, et rien après', () => {
    const clos = cloreEpisode(activerEpisode(episodeEssai()));
    expect(clos.statut).toBe('clos');
    expect(() => activerEpisode(clos)).toThrow(/interdite/);
    expect(() => suspendreEpisode(clos)).toThrow(/interdite/);
  });
});
