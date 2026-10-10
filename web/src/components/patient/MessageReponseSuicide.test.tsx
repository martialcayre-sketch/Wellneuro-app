// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { GenericQuestionnaire } from './GenericQuestionnaire';
import { MessageReponseSuicide } from './MessageReponseSuicide';

// Le texte SIGNÉ par le responsable le 2026-10-10 ([[D-277]] §1), tel que le
// patient le lit, paragraphe par paragraphe.
const TEXTE_SIGNE = [
  'Vous venez d’indiquer des idées de mort ou de suicide.',
  'Vous pouvez en parler dès maintenant, gratuitement, 24 h sur 24 : appelez le 3114.',
  'Si vous pensez passer à l’acte ou si vous êtes en danger, appelez le 15 ou le 112.',
  'Votre praticien sera prévenu de cette réponse quand vous transmettrez vos réponses, mais il ne pourra pas vous répondre immédiatement.',
];

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('MessageReponseSuicide ([[D-277]] §1)', () => {
  it('affiche mot à mot le texte signé, annoncé aux lecteurs d’écran, numéros appelables', () => {
    render(<MessageReponseSuicide />);
    const message = screen.getByRole('alert');
    const paragraphes = [...message.querySelectorAll('p')].map(p => p.textContent?.replace(/\s+/g, ' ').trim());
    expect(paragraphes).toEqual(TEXTE_SIGNE);
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

/**
 * Parcourt le questionnaire jusqu'au résumé en choisissant partout la première
 * option (« non ») ou la dernière (la plus grave). Rend le nombre d'écrans de
 * saisie qui ont montré le message, et s'il est sur le résumé.
 */
function parcourir(idQ: string, choix: 'premiere' | 'derniere'): { ecransAvecMessage: number; surResume: boolean } {
  localStorage.clear();
  vi.stubGlobal('scrollTo', vi.fn());
  const a = assignation(idQ);
  render(<GenericQuestionnaire assignation={a} questionnaire={(QUESTIONNAIRE_CATALOGUE as Record<string, unknown>)[idQ] as QuestionnaireDef} email={a.emailPatient} onDone={vi.fn()} />);
  const present = () => screen.queryAllByText(TEXTE_SIGNE[0]).length;
  let ecransAvecMessage = 0;
  for (let ecran = 0; ecran < 80; ecran += 1) {
    if (screen.queryByRole('heading', { name: 'Vérifiez votre questionnaire' })) {
      return { ecransAvecMessage, surResume: present() === 1 };
    }
    for (const groupe of screen.queryAllByRole('radiogroup').concat(screen.queryAllByRole('group'))) {
      const radios = groupe.querySelectorAll('input[type="radio"]');
      if (radios.length > 0) fireEvent.click(radios[choix === 'premiere' ? 0 : radios.length - 1]);
    }
    for (const liste of document.querySelectorAll('select')) {
      const options = [...liste.querySelectorAll('option')].filter(o => o.value !== '');
      if (options.length > 0) fireEvent.change(liste, { target: { value: options[choix === 'premiere' ? 0 : options.length - 1].value } });
    }
    for (const champ of document.querySelectorAll<HTMLInputElement>('input[type="number"]')) {
      fireEvent.change(champ, { target: { value: champ.min || '1' } });
    }
    // Un seul message par écran, jamais deux : il suit la question, pas l'encart.
    expect(present(), `${idQ}, écran ${ecran + 1}`).toBeLessThanOrEqual(1);
    if (present() === 1) ecransAvecMessage += 1;
    fireEvent.click(screen.queryByRole('button', { name: 'Voir le résumé' }) ?? screen.getByRole('button', { name: /Suivant/ }));
  }
  throw new Error(`${idQ} : résumé jamais atteint`);
}

describe('GenericQuestionnaire — le message suit la réponse, sur les quatre questionnaires', () => {
  for (const idQ of ['Q_NEU_01', 'Q_NEU_02', 'Q_NEU_03', 'Q_NEU_12'] as const) {
    it(`${idQ} : réponse la plus grave ⇒ message sous la question, puis sur le résumé`, () => {
      const { ecransAvecMessage, surResume } = parcourir(idQ, 'derniere');
      expect(ecransAvecMessage, idQ).toBe(1);
      expect(surResume, idQ).toBe(true);
    });

    it(`${idQ} : « non » partout ⇒ aucun message, ni à la saisie ni au résumé ; l’encart, lui, reste`, () => {
      const { ecransAvecMessage, surResume } = parcourir(idQ, 'premiere');
      expect(ecransAvecMessage, idQ).toBe(0);
      expect(surResume, idQ).toBe(false);
      expect(screen.getByRole('note', { name: 'Besoin d’aide maintenant ?' })).not.toBeNull();
    });
  }
});
