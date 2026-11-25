// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { EvolutionPanel } from './EvolutionPanel';
import { ChiffresMasquesProvider } from './ChiffresMasques';
import { PUCES_ENCART_D560, TITRE_ENCART_D560 } from '@/lib/doctrine/encartD560';
import type { PlanchePassations } from '@/lib/praticien/plancheEvolution';

// OF-2 (D-560) : l'onglet « Évolution » montre, il ne compare pas.

const planche: PlanchePassations = {
  colonnes: [
    { idEpisode: 'e0', milestone: 'T0', confirmeLe: '2026-01-01T10:00:00.000Z' },
    { idEpisode: 'e1', milestone: 'J21', confirmeLe: '2026-02-01T10:00:00.000Z' },
  ],
  lignes: [
    {
      idQuestionnaire: 'Q_A',
      titre: 'Instrument A',
      cases: [
        [
          {
            idReponse: 'r1',
            dateReponse: '2025-12-30T10:00:00.000Z',
            score: 12,
            interpretation: 'Libellé lu',
            nonInterpretable: null,
            ambigue: false,
            statutExclu: null,
          },
        ],
        [
          {
            idReponse: 'r2',
            dateReponse: '2026-01-30T10:00:00.000Z',
            score: 9,
            interpretation: null,
            nonInterpretable: null,
            ambigue: false,
            statutExclu: 'INVALID',
          },
        ],
      ],
    },
    {
      idQuestionnaire: 'Q_B',
      titre: 'Instrument B',
      cases: [
        [
          {
            idReponse: 'r3',
            dateReponse: '2025-12-30T10:00:00.000Z',
            score: 4,
            interpretation: null,
            nonInterpretable: null,
            ambigue: false,
            statutExclu: null,
          },
        ],
        [],
      ],
    },
  ],
  introuvablesParColonne: [0, 2],
};

const biologie = {
  ok: true,
  resultats: [{ analyteCode: 'VITD', analyteLibelle: 'Vitamine D' }],
  series: [
    {
      analyteCode: 'VITD',
      motifs: ['unites_differentes', 'laboratoires_differents'],
      points: [
        { idResultat: 'v1', valeur: '30', unite: 'µg/L', preleveLe: '2026-01-01T08:00:00.000Z' },
        { idResultat: 'v2', valeur: '75', unite: 'nmol/L', preleveLe: '2026-02-01T08:00:00.000Z' },
      ],
    },
  ],
};

function repondre(evolution: { status: number; corps: unknown }, bio: { status: number; corps: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const cible = String(url).startsWith('/api/praticien/evolution') ? evolution : bio;
      return { ok: cible.status < 400, status: cible.status, json: async () => cible.corps };
    }),
  );
}

beforeEach(() => repondre({ status: 200, corps: { ok: true, planche } }, { status: 200, corps: biologie }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EvolutionPanel', () => {
  it('porte l’encart des refus de D-560 §4, mot pour mot', async () => {
    render(<EvolutionPanel idPatient="PAT_1" />);
    const encart = screen.getByRole('complementary', { name: TITRE_ENCART_D560 });
    for (const puce of PUCES_ENCART_D560) expect(within(encart).getByText(`– ${puce}`)).toBeTruthy();
  });

  it('range les passations par jalon ; une case vide dit « jalon non mesuré »', async () => {
    render(<EvolutionPanel idPatient="PAT_1" />);
    const tableau = await screen.findByRole('table');
    expect(within(tableau).getByRole('columnheader', { name: /T0/ })).toBeTruthy();
    expect(within(tableau).getByRole('columnheader', { name: /J21/ })).toBeTruthy();
    const ligne = within(tableau).getByRole('row', { name: /Instrument A/ });
    expect(within(ligne).getByText('12')).toBeTruthy();
    expect(within(ligne).getByText('(Libellé lu)')).toBeTruthy();
    // Le statut est NOMMÉ, jamais son effet supposé.
    expect(within(ligne).getByText('Passation invalidée')).toBeTruthy();
    expect(screen.queryByText(/raisonnement clinique/)).toBeNull();
    expect(within(within(tableau).getByRole('row', { name: /Instrument B/ })).getByText('jalon non mesuré')).toBeTruthy();
    expect(screen.getByText(/J21 : 2 passations retenues introuvables dans le dossier\./)).toBeTruthy();
  });

  it('biologie : une ligne par unité, sans conversion, avec la mention', async () => {
    render(<EvolutionPanel idPatient="PAT_1" />);
    await screen.findByText('Instrument A');
    const lignes = await screen.findAllByText(/^Vitamine D/);
    expect(lignes).toHaveLength(2);
    expect(screen.getAllByText('Unités différentes : valeurs non converties.')).toHaveLength(2);
    // Les motifs de la série, avec les mots de l'onglet Biologie.
    expect(screen.getAllByText('Non comparables en l’état : laboratoires différents.')).toHaveLength(2);
    expect(screen.getByText('30')).toBeTruthy();
    expect(screen.getByText('75')).toBeTruthy();
  });

  it('unités mêlées pour seul motif : jamais « aucun motif connu » sous la mention des unités', async () => {
    repondre(
      { status: 200, corps: { ok: true, planche } },
      {
        status: 200,
        corps: {
          ...biologie,
          series: [
            {
              analyteCode: 'VITD',
              motifs: ['unites_differentes'],
              points: [
                { idResultat: 'v1', valeur: '30', unite: 'µg/L', preleveLe: '2026-01-01T08:00:00.000Z' },
                { idResultat: 'v3', valeur: '32', unite: 'µg/L', preleveLe: '2026-01-15T08:00:00.000Z' },
                { idResultat: 'v2', valeur: '75', unite: 'nmol/L', preleveLe: '2026-02-01T08:00:00.000Z' },
              ],
            },
          ],
        },
      },
    );
    render(<EvolutionPanel idPatient="PAT_1" />);
    expect(await screen.findAllByText('Unités différentes : valeurs non converties.')).toHaveLength(2);
    expect(screen.queryByText(/Aucun motif connu de non-comparabilité/)).toBeNull();
  });

  it('aucune flèche, aucun pourcentage ni mot qui qualifie dans le rendu', async () => {
    const { container } = render(<EvolutionPanel idPatient="PAT_1" />);
    await screen.findByRole('table');
    await screen.findAllByText(/^Vitamine D/);
    const texte = container.textContent ?? '';
    // L'encart CITE « amélioration » et « stable » pour les refuser : il est
    // retiré de la lecture.
    const horsEncart = texte.replace(container.querySelector('[data-encart-d560]')?.textContent ?? '', '');
    expect(horsEncart).not.toMatch(/[↑↓→←]|%|amélior|stable|hausse|baisse/i);
  });

  it('en mode consultation, aucune valeur ni libellé n’est montré', async () => {
    render(
      <ChiffresMasquesProvider masques>
        <EvolutionPanel idPatient="PAT_1" />
      </ChiffresMasquesProvider>,
    );
    await screen.findByRole('table');
    await screen.findAllByText(/^Vitamine D/);
    expect(screen.queryByText('12')).toBeNull();
    expect(screen.queryByText('(Libellé lu)')).toBeNull();
    expect(screen.queryByText('30')).toBeNull();
  });

  it('changement de dossier : la réponse du dossier précédent, arrivée en retard, est ignorée', async () => {
    let libererA: (() => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.includes('PAT_A') && u.startsWith('/api/praticien/evolution')) {
          await new Promise<void>((resoudre) => {
            libererA = resoudre;
          });
          return { ok: true, status: 200, json: async () => ({ ok: true, planche }) };
        }
        if (u.startsWith('/api/praticien/evolution')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, planche: { colonnes: [], lignes: [], introuvablesParColonne: [] } }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ ok: true, resultats: [], series: [] }) };
      }),
    );
    const { rerender } = render(<EvolutionPanel idPatient="PAT_A" />);
    rerender(<EvolutionPanel idPatient="PAT_B" />);
    expect(await screen.findByText('Aucun épisode confirmé pour l’instant.')).toBeTruthy();
    libererA?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('Instrument A')).toBeNull();
    expect(screen.getByText('Aucun épisode confirmé pour l’instant.')).toBeTruthy();
  });

  it('une lecture en échec se dit, jamais « aucune passation »', async () => {
    repondre({ status: 500, corps: { ok: false } }, { status: 503, corps: { ok: false, reason: 'cb_resultats_desactives' } });
    render(<EvolutionPanel idPatient="PAT_1" />);
    expect(await screen.findByText('Les passations n’ont pas pu être lues.')).toBeTruthy();
    expect(
      await screen.findByText('Les résultats biologiques ne sont pas activés sur cet environnement.'),
    ).toBeTruthy();
    expect(screen.queryByText('Aucun épisode confirmé pour l’instant.')).toBeNull();
  });
});
