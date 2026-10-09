// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { EncartUrgenceSuicide } from './EncartUrgenceSuicide';
import { GenericQuestionnaire } from './GenericQuestionnaire';

// Le texte relu et validé par le responsable le 2026-10-09 ([[D-275]]).
const TEXTE_VALIDE = [
  'Besoin d’aide maintenant ?',
  'Si vous avez des idées suicidaires, appelez le 3114, numéro national de prévention du suicide.'
    + ' En cas de danger immédiat, appelez le 15 (SAMU, urgence médicale) ou le 112 (numéro d’urgence européen).'
    + ' Par SMS ou application : le 114.',
  'Vos réponses sont transmises à votre praticien, mais il ne les lit pas en temps réel : n’attendez pas sa réponse.',
];

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('EncartUrgenceSuicide ([[D-275]])', () => {
  it('affiche mot à mot le texte validé, avec les numéros appelables', () => {
    render(<EncartUrgenceSuicide />);
    const encart = screen.getByRole('note', { name: 'Besoin d’aide maintenant ?' });
    const paragraphes = [...encart.querySelectorAll('p')].map(p => p.textContent?.replace(/\s+/g, ' ').trim());
    expect(paragraphes).toEqual(TEXTE_VALIDE.map(t => t.replace(/\s+/g, ' ')));
    for (const numero of ['3114', '15', '112']) {
      expect(screen.getByRole('link', { name: numero }).getAttribute('href')).toBe(`tel:${numero}`);
    }
  });
});

function assignation(idQuestionnaire: string) {
  return {
    idAssignation: `ASS_TEST_${idQuestionnaire}`, idPatient: 'PAT_TEST', emailPatient: 'sophie.nicola@example.test',
    idQuestionnaire, titre: 'Test', dateLimite: null, notes: null, statut: 'envoye',
    consentement: 'donne', statutReponses: 'en_cours',
  };
}

describe('GenericQuestionnaire — encart d’urgence', () => {
  it('l’affiche sur la BDI, dès le premier écran', () => {
    vi.stubGlobal('scrollTo', vi.fn());
    const a = assignation('Q_NEU_01');
    render(<GenericQuestionnaire assignation={a} questionnaire={QUESTIONNAIRE_CATALOGUE.Q_NEU_01 as QuestionnaireDef} email={a.emailPatient} onDone={vi.fn()} />);
    expect(screen.getByRole('note', { name: 'Besoin d’aide maintenant ?' })).not.toBeNull();
  });

  it('ne l’affiche pas sur un questionnaire sans question sur le suicide', () => {
    vi.stubGlobal('scrollTo', vi.fn());
    const a = assignation('Q_STR_04');
    render(<GenericQuestionnaire assignation={a} questionnaire={QUESTIONNAIRE_CATALOGUE.Q_STR_04 as QuestionnaireDef} email={a.emailPatient} onDone={vi.fn()} />);
    expect(screen.queryByRole('note', { name: 'Besoin d’aide maintenant ?' })).toBeNull();
  });
});
