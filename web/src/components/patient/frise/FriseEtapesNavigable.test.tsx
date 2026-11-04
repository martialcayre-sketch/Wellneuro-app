// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { buildJourneySteps, type JourneyStep } from '@/components/patient/PatientJourneyProgress';
import { FriseEtapesNavigable } from './FriseEtapesNavigable';
import type { SignauxFrise } from './friseEtapes';

afterEach(cleanup);

const LIBELLES = ['Consentement', 'Informations', 'Situation', 'Questionnaires', 'Analyse du praticien', 'Restitution'];
const ATTENTE =
  'Votre praticien prépare votre restitution à partir des éléments transmis. Vous la retrouverez ici dès qu’elle sera prête.';

function rendre(courante: JourneyStep['id'], signaux: Partial<SignauxFrise> = {}) {
  render(
    <FriseEtapesNavigable
      steps={buildJourneySteps(courante)}
      signaux={{ token: 'PAT_TEST', etape: null, bilanConsultable: false, listeQuestionnairesRendue: true, ...signaux }}
    />,
  );
  return screen.getByRole('navigation', { name: 'Étapes de votre parcours' });
}

const libelle = (el: Element) => (el.textContent ?? '').replace(/ \((étape actuelle|terminée)\)$/, '');

describe('FriseEtapesNavigable ([[D-423]] §8)', () => {
  it('une nav nommée, les six étapes dans l’ordre, libellés inchangés, sans rang', () => {
    const nav = rendre(4);
    const items = within(nav).getAllByRole('listitem');
    expect(items.map(libelle)).toEqual(LIBELLES);
    expect(nav.textContent).not.toMatch(/\d/);
    // Le nom monte de la liste sur la nav : un seul porteur.
    expect(within(nav).getByRole('list').getAttribute('aria-label')).toBeNull();
  });

  it('un seul `aria-current="step"`, sur l’étape courante', () => {
    for (const [courante, etape] of [
      [4, null],
      [5, 'analyse_en_cours'],
      [6, 'restitution_disponible'],
    ] as const) {
      const nav = rendre(courante, { etape, bilanConsultable: courante === 6 });
      const courantes = nav.querySelectorAll('[aria-current]');
      expect(courantes).toHaveLength(1);
      expect(courantes[0].getAttribute('aria-current')).toBe('step');
      expect(libelle(courantes[0])).toBe(LIBELLES[courante - 1]);
      cleanup();
    }
  });

  it('étape 4 courante : un seul lien, vers la liste des questionnaires', () => {
    const nav = rendre(4, { bilanConsultable: true });
    const liens = within(nav).getAllByRole('link');
    expect(liens).toHaveLength(1);
    expect(liens[0].getAttribute('href')).toBe('#mes-questionnaires');
    expect(liens[0].getAttribute('aria-current')).toBe('step');
    expect(within(nav).queryByRole('button')).toBeNull();
  });

  it('étape 5 courante : un bouton qui ouvre et referme le texte d’attente', () => {
    const nav = rendre(5, { etape: 'analyse_en_cours' });
    const bouton = within(nav).getByRole('button');
    expect(libelle(bouton)).toBe('Analyse du praticien');
    expect(bouton.getAttribute('aria-current')).toBe('step');
    expect(bouton.getAttribute('aria-expanded')).toBe('false');
    const texte = screen.getByText(ATTENTE);
    expect(texte.hidden).toBe(true);
    expect(bouton.getAttribute('aria-controls')).toBe(texte.id);

    fireEvent.click(bouton);
    expect(bouton.getAttribute('aria-expanded')).toBe('true');
    expect(texte.hidden).toBe(false);
    fireEvent.click(bouton);
    expect(texte.hidden).toBe(true);
  });

  it('étape 5 courante en `elements_transmis` : la phrase déjà servie', () => {
    const nav = rendre(5, { etape: 'elements_transmis' });
    fireEvent.click(within(nav).getByRole('button'));
    expect(screen.getByText('Vos éléments ont été transmis.').hidden).toBe(false);
    expect(screen.queryByText(ATTENTE)).toBeNull();
  });

  it('étape 6 courante : « Restitution » mène au bilan consultable, aucun texte', () => {
    const nav = rendre(6, { etape: 'restitution_disponible', bilanConsultable: true });
    const bilan = within(nav).getByRole('link', { name: /Restitution/ });
    expect(bilan.getAttribute('href')).toBe('/portail/PAT_TEST/bilan');
    expect(within(nav).queryByRole('button')).toBeNull();
    expect(nav.querySelector('p')).toBeNull();
  });

  it('étape 6 courante sans bilan consultable : non cliquable, annoncée', () => {
    const nav = rendre(6, { etape: 'restitution_disponible', bilanConsultable: false });
    expect(within(nav).queryByRole('link', { name: /Restitution/ })).toBeNull();
    expect(within(nav).getByText('Restitution').closest('[aria-current]')?.getAttribute('aria-current')).toBe('step');
  });

  it('étapes à venir annoncées et fermées', () => {
    const nav = rendre(4, { etape: 'analyse_en_cours', bilanConsultable: true });
    for (const nom of ['Analyse du praticien', 'Restitution']) {
      const etape = within(nav).getByText(nom).closest('li')!;
      expect(within(etape).queryByRole('link')).toBeNull();
      expect(within(etape).queryByRole('button')).toBeNull();
    }
  });

  it('chaque étape porte la cible de 44 px en `rem` (`min-h-11`)', () => {
    const nav = rendre(5, { etape: 'analyse_en_cours' });
    for (const item of within(nav).getAllByRole('listitem')) {
      expect(item.firstElementChild?.className).toMatch(/\bmin-h-11\b/);
    }
  });

  it('le `sr-only` reste dans le défilement de la frise (`relative`)', () => {
    const nav = rendre(4);
    expect(within(nav).getByRole('list').className).toMatch(/\brelative\b/);
  });

  it('à 390 px, l’étape courante est amenée dans le champ de la frise', () => {
    // jsdom ne calcule pas de mise en page : six étapes de 80 px, frise de 358.
    const proto = HTMLElement.prototype;
    const espions = [
      vi.spyOn(proto, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
        return this.closest('li') && this.parentElement?.tagName === 'LI' ? 80 : 0;
      }),
      vi.spyOn(proto, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
        const li = this.closest('li');
        return li ? [...li.parentElement!.children].indexOf(li) * 96 : 0;
      }),
      vi.spyOn(proto, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
        return this.tagName === 'OL' ? 358 : 0;
      }),
    ];
    try {
      const nav = rendre(5, { etape: 'analyse_en_cours' });
      // Étape 5 : gauche 384, droite 464 ; la frise défile de 464 − 358.
      expect(within(nav).getByRole('list').scrollLeft).toBe(106);
      cleanup();
      const nav4 = rendre(4);
      // Étape 4 : gauche 288, droite 368 ; la frise défile de 368 − 358.
      expect(within(nav4).getByRole('list').scrollLeft).toBe(10);
    } finally {
      for (const espion of espions) espion.mockRestore();
    }
  });
});
