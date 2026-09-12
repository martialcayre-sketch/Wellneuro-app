// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MonParcoursAccueil } from './MonParcoursAccueil';
import type { FilDuJour, Tache } from '@/lib/portail/filDuJour';

/*
 * Garde-fous SP-SPI / LOT-01, repris pour le FIL DU JOUR (2026-09-12).
 *
 * Ce que ces tests protègent n'est pas la mise en page mais des décisions
 * actées : zéro score chiffré, AUCUN COMPTE DE TÂCHES, une correction demandée
 * qui n'est jamais un bouton, une reprise qui accueille au lieu de reprocher —
 * et, depuis le fil, une hiérarchie qui tient : UN seul bouton plein, les
 * suivantes en liens.
 */
afterEach(cleanup);

const tache = (over: Partial<Tache> = {}): Tache => ({
  cle: 'ASS1',
  espece: 'questionnaire',
  cta: 'Commencer « Sommeil »',
  appui: null,
  href: '/portail/TOK/questionnaires/ASS1',
  ...over,
});

const filVide = (repos: FilDuJour['repos']): FilDuJour => ({ taches: [], repos });

describe('MonParcoursAccueil — le fil du jour', () => {
  const maintenant = new Date('2026-07-21T12:00:00.000Z');
  const base = { token: 'TOK', prenom: 'Michel', derniereReponseLe: null, maintenant };

  it('met la première tâche en bouton, et la nomme', () => {
    render(<MonParcoursAccueil {...base} fil={{ taches: [tache()], repos: { kind: 'stable' } }} />);
    const lien = screen.getByRole('link', { name: 'Commencer « Sommeil »' });
    expect(lien.getAttribute('href')).toBe('/portail/TOK/questionnaires/ASS1');
    expect(screen.getByText('Ce que j’ai à faire aujourd’hui')).toBeTruthy();
  });

  it('porte TOUTES les tâches, la première en avant et les suivantes sous « Ensuite »', () => {
    // CE QUI CHANGE. L'écran ne montrait qu'une étape ; il montre la liste.
    // La hiérarchie reste — un seul bouton plein — mais rien n'est caché : une
    // tâche repliée sous un `<details>` ne serait pas une tâche.
    render(
      <MonParcoursAccueil
        {...base}
        fil={{
          taches: [
            tache({ cle: 'A', cta: 'Noter ma nuit', espece: 'agenda_sommeil', appui: '5 nuits notées sur 21.' }),
            tache({ cle: 'B', cta: 'Noter ma journée', espece: 'agenda_alimentaire' }),
            tache({ cle: 'C', cta: 'Dire ce qui compte pour moi', espece: 'ce_qui_compte' }),
          ],
          repos: { kind: 'stable' },
        }}
      />,
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByText('Ensuite')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Dire ce qui compte pour moi' })).toBeTruthy();
    // Les suivantes sont une liste ORDONNÉE : l'ordre porte du sens (ce qui
    // périme d'abord), et il doit être annoncé comme tel.
    expect(screen.getByRole('list').tagName).toBe('OL');
  });

  it('ne dit « Ensuite » que s’il y a une suite', () => {
    render(<MonParcoursAccueil {...base} fil={{ taches: [tache()], repos: { kind: 'stable' } }} />);
    expect(screen.queryByText('Ensuite')).toBeNull();
  });

  it('ne compte JAMAIS les tâches', () => {
    // « 4 choses à faire » serait un chiffre fabriqué par cet écran (DC-19), et
    // surtout une dette annoncée à quelqu'un qu'on veut mettre en mouvement.
    const { container } = render(
      <MonParcoursAccueil
        {...base}
        fil={{
          taches: [tache({ cle: 'A' }), tache({ cle: 'B' }), tache({ cle: 'C' }), tache({ cle: 'D' })],
          repos: { kind: 'stable' },
        }}
      />,
    );
    expect(container.textContent).not.toMatch(/\b4\b/);
    expect(container.textContent).not.toMatch(/tâches?|à faire\s*:/i);
  });

  it('n’avertit du verrouillage que sur un QUESTIONNAIRE', () => {
    // Noter une nuit ne transmet ni ne verrouille rien : l'écrire là ferait
    // différer une saisie quotidienne par prudence.
    const { unmount } = render(
      <MonParcoursAccueil {...base} fil={{ taches: [tache()], repos: { kind: 'stable' } }} />,
    );
    expect(screen.getByText(/verrouillé et votre praticien en est informé/i)).toBeTruthy();
    unmount();

    render(
      <MonParcoursAccueil
        {...base}
        fil={{
          taches: [tache({ espece: 'agenda_sommeil', cta: 'Noter ma nuit', appui: '5 nuits notées sur 21.' })],
          repos: { kind: 'stable' },
        }}
      />,
    );
    expect(screen.queryByText(/verrouillé et votre praticien/i)).toBeNull();
  });

  it('avertit du verrouillage même quand la tâche porte une phrase d’appui', () => {
    // L'ancien test portait sur l'ABSENCE d'appui — un proxy, qui se serait
    // trompé le jour où un questionnaire en aurait porté un.
    render(
      <MonParcoursAccueil
        {...base}
        fil={{ taches: [tache({ appui: 'À rendre avant votre consultation.' })], repos: { kind: 'stable' } }}
      />,
    );
    expect(screen.getByText(/verrouillé et votre praticien/i)).toBeTruthy();
  });
});

describe('MonParcoursAccueil — le repos', () => {
  const maintenant = new Date('2026-07-21T12:00:00.000Z');
  const base = { token: 'TOK', prenom: 'Michel', derniereReponseLe: null, maintenant };

  it('dit « rien à faire aujourd’hui » SANS faire disparaître ce qui court', () => {
    render(
      <MonParcoursAccueil
        {...base}
        fil={filVide({ kind: 'rien_aujourdhui', appuis: ['Nuit notée ce matin. 5 nuits notées sur 21.'] })}
      />,
    );
    expect(screen.getByText('Rien à faire aujourd’hui.')).toBeTruthy();
    expect(screen.getByText('Nuit notée ce matin. 5 nuits notées sur 21.')).toBeTruthy();
    // Aucun bouton : il n'y a rien à faire, et on ne l'invente pas.
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('énonce une correction demandée sans en faire un appel à l’action', () => {
    render(
      <MonParcoursAccueil
        {...base}
        fil={filVide({ kind: 'attente', texte: 'Votre demande de correction est en attente.' })}
      />,
    );
    expect(screen.getByText('Votre demande de correction est en attente.')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('distingue « tout transmis » de « rien assigné »', () => {
    const { unmount } = render(<MonParcoursAccueil {...base} fil={filVide({ kind: 'stable' })} />);
    expect(screen.getByText(/transmis tout ce qui vous était demandé/i)).toBeTruthy();
    unmount();

    render(<MonParcoursAccueil {...base} fil={filVide({ kind: 'vide' })} />);
    expect(screen.getByText(/Aucun questionnaire pour le moment/i)).toBeTruthy();
  });

  it('ne se lit PAS quand une tâche existe', () => {
    render(
      <MonParcoursAccueil {...base} fil={{ taches: [tache()], repos: { kind: 'vide' } }} />,
    );
    expect(screen.queryByText(/Aucun questionnaire pour le moment/i)).toBeNull();
  });
});

describe('MonParcoursAccueil — accueil et interdits', () => {
  const maintenant = new Date('2026-07-21T12:00:00.000Z');
  const base = { token: 'TOK', prenom: 'Michel', derniereReponseLe: null, maintenant };

  it('accueille une reprise longue sans reprocher ni décompter les jours', () => {
    render(
      <MonParcoursAccueil
        {...base}
        derniereReponseLe="2025-07-21T12:00:00.000Z"
        fil={filVide({ kind: 'stable' })}
      />,
    );
    expect(screen.getByText(/environ 12 mois/i)).toBeTruthy();
    expect(screen.getByText(/à votre rythme/i)).toBeTruthy();
    expect(screen.getByText('Pour reprendre')).toBeTruthy();
    expect(screen.queryByText(/manqué|retard|devez/i)).toBeNull();
  });

  it('n’annonce pas de reprise à un patient actif', () => {
    render(
      <MonParcoursAccueil
        {...base}
        derniereReponseLe="2026-07-01T12:00:00.000Z"
        fil={filVide({ kind: 'stable' })}
      />,
    );
    expect(screen.queryByText('Pour reprendre')).toBeNull();
    expect(screen.getByText('Ce que j’ai à faire aujourd’hui')).toBeTruthy();
  });

  it('n’affiche aucun chiffre de score ni pourcentage', () => {
    const { container } = render(
      <MonParcoursAccueil
        {...base}
        derniereReponseLe="2025-07-21T12:00:00.000Z"
        fil={{ taches: [tache()], repos: { kind: 'stable' } }}
      />,
    );
    // Le seul nombre tolérable sur cet écran est la durée d'absence en mois.
    expect(container.textContent).not.toMatch(/%/);
    expect(container.textContent).not.toMatch(/score/i);
  });
});
