// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { OptionsAuCockpit, RubriqueAuCockpit } from '@/lib/atelier-bibliotheque-options/cockpit';
import {
  AVERTISSEMENT_COCKPIT,
  CONSTAT_A_RELIRE,
  LIBELLE_RUBRIQUE_NON_VALIDEE,
  MESSAGE_STRUCTURE,
  OptionsAuCockpitBloc,
  TOUJOURS_AFFICHE,
} from './OptionsAuCockpit';

// Le bloc du cockpit ([[D-480]] §8, BP-17 PR 6). Identifiants et textes
// synthétiques : aucune option ni aucun texte réel au dépôt.

afterEach(cleanup);

const LE = '2026-11-13T10:00:00.000Z';
const r = (rubrique: string, autre: Partial<RubriqueAuCockpit> = {}): RubriqueAuCockpit => ({
  rubrique,
  renvois: [],
  etat: 'vide',
  texte: null,
  valideLe: null,
  ...autre,
});

const signee = (options: Extract<OptionsAuCockpit, { lecture: 'ok' }>['hypotheses'][number]['options']): OptionsAuCockpit => ({
  lecture: 'ok',
  etatStructure: 'signee',
  hypotheses: [{ hypotheseCode: 'HYP_BANC', options }],
});

const bloc = () => screen.getByRole('region', { name: 'Bibliothèque des options' });

describe('bibliothèque des options au cockpit', () => {
  it('liste chaque option et ses rubriques ; un texte validé s’affiche avec sa date et ses sources', () => {
    render(
      <OptionsAuCockpitBloc
        hypotheseCode="HYP_BANC"
        options={signee([
          {
            id: 'OPT_BANC_A',
            populations: ['POP_BANC'],
            rubriques: [r('dose', { etat: 'validee', texte: 'Texte validé synthétique.', valideLe: LE, renvois: ['information_manquante', 'WN-PE-0001@v1.0'] })],
          },
          { id: 'OPT_BANC_B', populations: ['POP_BANC', 'POP_BANC_2'], rubriques: [r('dose')] },
        ])}
      />,
    );
    const items = bloc().querySelectorAll('li');
    expect([...items].map(li => li.querySelector('h6')?.textContent)).toEqual(['OPT_BANC_A', 'OPT_BANC_B']);
    expect(bloc().textContent).toContain('Texte validé synthétique.');
    expect(bloc().textContent).toContain('Validé le 13/11/2026');
    expect(bloc().textContent).toContain('Sources : Information manquante (déclarée) · WN-PE-0001@v1.0');
    expect(bloc().textContent).toContain('Populations : POP_BANC, POP_BANC_2');
    expect(bloc().textContent).toContain(AVERTISSEMENT_COCKPIT);
    expect(bloc().textContent).toContain(TOUJOURS_AFFICHE);
  });

  it.each([
    ['a_valider', 'Texte non encore validé'],
    ['vide', 'Aucun texte saisi'],
    ['retiree', 'Texte retiré'],
    ['a_relire', 'Texte à relire'],
    ['illisible', 'Statut illisible'],
  ] as const)('rubrique « %s » : son état seul, jamais de contenu', (etat, attendu) => {
    render(<OptionsAuCockpitBloc hypotheseCode="HYP_BANC" options={signee([{ id: 'OPT_BANC_A', populations: ['POP_BANC'], rubriques: [r('dose', { etat })] }])} />);
    expect(bloc().textContent).toContain(attendu);
  });

  it('un état « validé » sans texte ne s’affiche pas comme validé (DC-24)', () => {
    render(<OptionsAuCockpitBloc hypotheseCode="HYP_BANC" options={signee([{ id: 'OPT_BANC_A', populations: ['POP_BANC'], rubriques: [r('dose', { etat: 'validee' })] }])} />);
    expect(bloc().textContent).toContain('Statut illisible');
    expect(bloc().textContent).not.toContain('Validé le');
  });

  it('aucune option pour l’hypothèse : le dit, et « ne rien changer, ou surveiller » reste', () => {
    render(<OptionsAuCockpitBloc hypotheseCode="HYP_BANC" options={signee([])} />);
    expect(bloc().textContent).toContain('La bibliothèque ne déclare aucune option pour cette hypothèse.');
    expect(bloc().textContent).toContain(TOUJOURS_AFFICHE);
  });

  it.each(['non_signee', 'signature_rompue', 'a_relire'] as const)('structure %s : le message, aucune option', etat => {
    render(<OptionsAuCockpitBloc hypotheseCode="HYP_BANC" options={{ lecture: 'ok', etatStructure: etat, hypotheses: [] }} />);
    expect(bloc().textContent).toContain(MESSAGE_STRUCTURE[etat]);
    expect(bloc().querySelectorAll('li')).toHaveLength(0);
    expect(bloc().textContent).toContain(TOUJOURS_AFFICHE);
  });

  it('échec de lecture : le dit, jamais « aucune option »', () => {
    render(<OptionsAuCockpitBloc hypotheseCode="HYP_BANC" options={{ lecture: 'echec' }} />);
    expect(bloc().textContent).toContain('n’a pas pu être lue');
    expect(bloc().textContent).not.toMatch(/aucune option/);
    expect(bloc().textContent).toContain(TOUJOURS_AFFICHE);
  });

  it('aucun libellé du bloc ne dit qu’une interaction a été cherchée (banc élargi, P3-2 de `wn-reviewer`)', () => {
    const textes = [
      AVERTISSEMENT_COCKPIT,
      TOUJOURS_AFFICHE,
      CONSTAT_A_RELIRE,
      ...Object.values(MESSAGE_STRUCTURE),
      ...Object.values(LIBELLE_RUBRIQUE_NON_VALIDEE),
    ].join(' ');
    expect(textes).not.toMatch(/aucune interaction|aucune contre-indication|compatible|recommand|sans risque/i);
  });

  it('une rubrique sans renvoi dit « Aucune source déclarée », jamais « aucune » seul (P3-2)', () => {
    render(<OptionsAuCockpitBloc hypotheseCode="HYP_BANC" options={signee([{ id: 'OPT_BANC_A', populations: ['POP_BANC'], rubriques: [r('interactions')] }])} />);
    expect(bloc().textContent).toContain('Aucune source déclarée.');
    expect(bloc().textContent).not.toMatch(/Sources : aucune/);
  });

  it('constat confirmé à relire : la mention vient en tête du bloc, avant toute option (P2-1)', () => {
    render(
      <OptionsAuCockpitBloc
        hypotheseCode="HYP_BANC"
        constatARelire
        options={signee([{ id: 'OPT_BANC_A', populations: ['POP_BANC'], rubriques: [r('dose')] }])}
      />,
    );
    const texte = bloc().textContent ?? '';
    expect(texte).toContain(CONSTAT_A_RELIRE);
    expect(texte.indexOf(CONSTAT_A_RELIRE)).toBeLessThan(texte.indexOf('OPT_BANC_A'));
    cleanup();
    render(<OptionsAuCockpitBloc hypotheseCode="HYP_BANC" options={signee([])} />);
    expect(bloc().textContent).not.toContain(CONSTAT_A_RELIRE);
  });
});
