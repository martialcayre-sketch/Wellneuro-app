// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { EncartUrgenceSuicide } from './EncartUrgenceSuicide';
import { GenericQuestionnaire } from './GenericQuestionnaire';

// Le texte relu et validé par le responsable le 2026-10-09 ([[D-275]]).
const TEXTE_VALIDE = [
  'Besoin d’aide maintenant ?',
  'Si vous avez des idées suicidaires, appelez le 3114, numéro national de prévention du suicide.'
    + ' En cas de danger immédiat, appelez le 15 (SAMU, urgence médicale) ou le 112 (numéro d’urgence européen).'
    + ' Si vous ne pouvez pas parler ou entendre, même temporairement\u00a0: le 114, par SMS ou application.',
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

// SUR CHAQUE ÉCRAN, Y COMPRIS LE RÉSUMÉ, QUELLE QUE SOIT LA RÉPONSE ([[D-275]]).
// Revue Codex de la PR #1370 : le résumé avant transmission est une branche de
// rendu à part, et l'encart y manquait. Les réponses choisies sont les PLUS
// graves de chaque question (dernière option) : l'encart ne dépend d'aucune.
describe('GenericQuestionnaire — l’encart reste présent jusqu’au résumé, sur les quatre questionnaires', () => {
  for (const idQ of ['Q_NEU_01', 'Q_NEU_02', 'Q_NEU_03', 'Q_NEU_12'] as const) {
    it(`${idQ} : chaque écran de saisie et le résumé portent l’encart`, () => {
      localStorage.clear();
      vi.stubGlobal('scrollTo', vi.fn());
      const a = assignation(idQ);
      render(<GenericQuestionnaire assignation={a} questionnaire={QUESTIONNAIRE_CATALOGUE[idQ] as QuestionnaireDef} email={a.emailPatient} onDone={vi.fn()} />);
      let ecrans = 0;
      for (; ecrans < 80; ecrans += 1) {
        expect(screen.getAllByRole('note', { name: 'Besoin d’aide maintenant ?' }), `${idQ}, écran ${ecrans + 1}`).toHaveLength(1);
        if (screen.queryByRole('heading', { name: 'Vérifiez votre questionnaire' })) break;
        for (const groupe of screen.queryAllByRole('radiogroup').concat(screen.queryAllByRole('group'))) {
          const radios = groupe.querySelectorAll('input[type="radio"]');
          if (radios.length > 0) fireEvent.click(radios[radios.length - 1]);
        }
        for (const liste of document.querySelectorAll('select')) {
          const options = [...liste.querySelectorAll('option')].filter(o => o.value !== '');
          if (options.length > 0) fireEvent.change(liste, { target: { value: options[options.length - 1].value } });
        }
        for (const champ of document.querySelectorAll<HTMLInputElement>('input[type="number"]')) {
          fireEvent.change(champ, { target: { value: champ.min || '1' } });
        }
        const bouton = screen.queryByRole('button', { name: 'Voir le résumé' }) ?? screen.getByRole('button', { name: /Suivant/ });
        fireEvent.click(bouton);
      }
      expect(screen.getByRole('heading', { name: 'Vérifiez votre questionnaire' }), idQ).not.toBeNull();
      expect(ecrans, idQ).toBeGreaterThan(0);
    });
  }
});

