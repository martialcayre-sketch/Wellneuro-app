// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { GenericQuestionnaire } from './GenericQuestionnaire';
import { writeQuestionnaireDraft } from '@/lib/questionnaire-draft';
import { DELAI_VERIFICATION_DEFILEMENT_MS, MessageReponseSuicide } from './MessageReponseSuicide';

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

describe('MessageReponseSuicide — venue dans la fenêtre ([[D-506]])', () => {
  const scrollIntoView = vi.fn();
  let position = { top: 900, bottom: 1300 };

  beforeEach(() => {
    scrollIntoView.mockReset();
    position = { top: 900, bottom: 1300 };
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ ...position, left: 0, right: 300, width: 300, height: position.bottom - position.top, x: 0, y: position.top, toJSON: () => ({}) }),
    );
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    delete document.documentElement.dataset.readingMotion;
  });

  it('hors de la fenêtre : le plus petit défilement, animé, sans déplacer le focus', () => {
    const avant = document.createElement('button');
    document.body.append(avant);
    avant.focus();
    const venu = vi.fn();
    render(<MessageReponseSuicide defiler onVenu={venu} />);
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
    expect(venu).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(avant);
    avant.remove();
  });

  it('sans `defiler` (retour sur la page, reprise d’un brouillon) : aucun mouvement', () => {
    render(<MessageReponseSuicide />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('déjà entièrement visible : aucun déplacement', () => {
    position = { top: 100, bottom: 400 };
    render(<MessageReponseSuicide defiler />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('mouvement réduit, du système ou du patient : aucun défilement animé', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    render(<MessageReponseSuicide defiler />);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', behavior: 'auto' });
    cleanup();

    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    document.documentElement.dataset.readingMotion = 'reduced';
    render(<MessageReponseSuicide defiler />);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', behavior: 'auto' });
  });

  it('dans le questionnaire : au choix, après retrait puis nouveau choix, et au résumé ; jamais au retour sur la page', () => {
    localStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const a = assignation('Q_NEU_01');
    render(<GenericQuestionnaire assignation={a} questionnaire={(QUESTIONNAIRE_CATALOGUE as Record<string, unknown>).Q_NEU_01 as QuestionnaireDef} email={a.emailPatient} onDone={vi.fn()} />);
    const choisir = (id: string, valeur: number) =>
      fireEvent.click(document.querySelector(`input[type="radio"][name="${id}"][value="${valeur}"]`)!);

    choisir('B7', 1);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    // Une autre réponse positive, une autre question : rien.
    choisir('B7', 2);
    choisir('B1', 0);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    // Retrait puis nouveau choix : une nouvelle apparition.
    choisir('B7', 0);
    choisir('B7', 1);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);

    for (let i = 1; i <= 13; i += 1) if (i !== 7) choisir(`B${i}`, 0);
    fireEvent.click(screen.getByRole('button', { name: 'Voir le résumé' }));
    const titre = screen.getByRole('heading', { name: 'Vérifiez votre questionnaire' });
    expect(titre).toBe(document.activeElement);
    // Le titre prend le focus sans défiler : il ne chasse pas le message.
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(scrollIntoView).toHaveBeenCalledTimes(3);

    // Retour sur la page qui porte la réponse : la présence continue ne
    // relance pas le mouvement.
    fireEvent.click(screen.getByRole('button', { name: /^Vérifier cette partie/ }));
    expect(screen.getAllByText(TEXTE_SIGNE[0])).toHaveLength(1);
    expect(scrollIntoView).toHaveBeenCalledTimes(3);
    // Au résumé, de nouveau.
    fireEvent.click(screen.getByRole('button', { name: 'Voir le résumé' }));
    expect(scrollIntoView).toHaveBeenCalledTimes(4);
  });

  it('reprise d’un brouillon qui porte la réponse positive : le message est là, sans mouvement', () => {
    localStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());
    const a = assignation('Q_NEU_01');
    writeQuestionnaireDraft(a.idAssignation, { version: 1, answers: { B7: '1' }, currentPage: 0 });
    render(<GenericQuestionnaire assignation={a} questionnaire={(QUESTIONNAIRE_CATALOGUE as Record<string, unknown>).Q_NEU_01 as QuestionnaireDef} email={a.emailPatient} onDone={vi.fn()} />);
    expect(screen.getAllByText(TEXTE_SIGNE[0])).toHaveLength(1);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  describe('demande ignorée par le moteur (WebKit Linux, 2026-11-13)', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('page immobile et message toujours hors de la fenêtre : la demande est renouvelée, une fois', () => {
      render(<MessageReponseSuicide defiler />);
      expect(scrollIntoView).toHaveBeenCalledOnce();
      vi.advanceTimersByTime(DELAI_VERIFICATION_DEFILEMENT_MS);
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', behavior: 'smooth' });
      vi.advanceTimersByTime(DELAI_VERIFICATION_DEFILEMENT_MS * 5);
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
    });

    it('la page a bougé (le défilement, ou le patient) : rien n’est relancé', () => {
      render(<MessageReponseSuicide defiler />);
      vi.stubGlobal('scrollY', 120);
      vi.advanceTimersByTime(DELAI_VERIFICATION_DEFILEMENT_MS);
      expect(scrollIntoView).toHaveBeenCalledOnce();
    });

    it('un défilement revenu au même pixel compte comme un mouvement : rien n’est relancé', () => {
      render(<MessageReponseSuicide defiler />);
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(DELAI_VERIFICATION_DEFILEMENT_MS);
      expect(scrollIntoView).toHaveBeenCalledOnce();
    });

    it('en mouvement réduit, la demande renouvelée reste sans animation', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
      render(<MessageReponseSuicide defiler />);
      vi.advanceTimersByTime(DELAI_VERIFICATION_DEFILEMENT_MS);
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', behavior: 'auto' });
    });

    it('le message est désormais entièrement visible : rien n’est relancé', () => {
      render(<MessageReponseSuicide defiler />);
      position = { top: 100, bottom: 400 };
      vi.advanceTimersByTime(DELAI_VERIFICATION_DEFILEMENT_MS);
      expect(scrollIntoView).toHaveBeenCalledOnce();
    });

    it('message retiré avant la vérification : rien n’est relancé', () => {
      const { unmount } = render(<MessageReponseSuicide defiler />);
      unmount();
      vi.advanceTimersByTime(DELAI_VERIFICATION_DEFILEMENT_MS);
      expect(scrollIntoView).toHaveBeenCalledOnce();
    });
  });

  it('un nouveau rendu ne relance rien', () => {
    const { rerender } = render(<MessageReponseSuicide defiler />);
    rerender(<MessageReponseSuicide className="mt-3" defiler />);
    expect(scrollIntoView).toHaveBeenCalledOnce();
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
