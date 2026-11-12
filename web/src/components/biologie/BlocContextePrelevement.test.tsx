// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTEXTE_INCONNU } from '@/lib/biology-library/contextePrelevement';
import {
  BlocContextePrelevement,
  BROUILLON_INCONNU,
  contexteDuBrouillon,
  type BrouillonContexte,
} from './BlocContextePrelevement';

// BP-05 ([[D-497]] §2-§4) : le bloc du contexte, prérempli à « inconnu ».
// Fixtures neutres : elles prouvent le mécanisme (`D-125`).

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function servir(reponse: { status: number; body: unknown }) {
  const fetchMock = vi.fn(async () => ({
    ok: reponse.status < 300,
    status: reponse.status,
    json: async () => reponse.body,
  }) as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function Hote({ surChangement }: { surChangement?: (b: BrouillonContexte) => void }) {
  const [valeur, setValeur] = useState<BrouillonContexte>({ ...BROUILLON_INCONNU });
  return (
    <BlocContextePrelevement
      idPatient="PAT_SEED_01"
      valeur={valeur}
      onChange={b => {
        setValeur(b);
        surChangement?.(b);
      }}
      disabled={false}
    />
  );
}

describe('contexteDuBrouillon', () => {
  it('le brouillon de départ rend « inconnu » partout', () => {
    expect(contexteDuBrouillon(BROUILLON_INCONNU)).toEqual(CONTEXTE_INCONNU);
  });

  it('un champ renseigné sans nombre lisible retient l’envoi — jamais « inconnu » à la place du praticien', () => {
    expect(contexteDuBrouillon({ ...BROUILLON_INCONNU, jourCycleEtat: 'renseigne', jourCycle: '' })).toBeNull();
    expect(contexteDuBrouillon({ ...BROUILLON_INCONNU, jourCycleEtat: 'renseigne', jourCycle: '0' })).toBeNull();
    expect(contexteDuBrouillon({ ...BROUILLON_INCONNU, jourCycleEtat: 'renseigne', jourCycle: '2,5' })).toBeNull();
    expect(
      contexteDuBrouillon({ ...BROUILLON_INCONNU, delaiDernierePriseEtat: 'renseigne', delaiDernierePrise: '-3' }),
    ).toBeNull();
  });

  it('des entiers renseignés passent, unité comprise ; un délai nul est un fait', () => {
    expect(
      contexteDuBrouillon({
        ...BROUILLON_INCONNU,
        aJeun: 'oui',
        jourCycleEtat: 'renseigne',
        jourCycle: ' 14 ',
        delaiDernierePriseEtat: 'renseigne',
        delaiDernierePrise: '0',
        delaiDernierePriseUnite: 'jour',
      }),
    ).toEqual({
      ...CONTEXTE_INCONNU,
      aJeun: 'oui',
      jourCycleEtat: 'renseigne',
      jourCycle: 14,
      delaiDernierePriseEtat: 'renseigne',
      delaiDernierePrise: 0,
      delaiDernierePriseUnite: 'jour',
    });
  });
});

describe('BlocContextePrelevement', () => {
  it('chaque déclaration part cochée « Inconnu », et se coche au toucher', () => {
    servir({ status: 503, body: { ok: false } });
    const changements: BrouillonContexte[] = [];
    render(<Hote surChangement={b => changements.push(b)} />);
    const aJeun = within(screen.getByRole('group', { name: 'À jeun' }));
    expect((aJeun.getByLabelText('Inconnu') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(aJeun.getByLabelText('Oui'));
    expect((aJeun.getByLabelText('Oui') as HTMLInputElement).checked).toBe(true);
    expect(changements.at(-1)?.aJeun).toBe('oui');
  });

  it('le jour du cycle ne demande sa valeur qu’une fois « Renseigné »', () => {
    servir({ status: 503, body: { ok: false } });
    render(<Hote />);
    expect(screen.queryByLabelText(/Jour du cycle \(à partir de 1\)/)).toBeNull();
    fireEvent.click(within(screen.getByRole('group', { name: 'Jour du cycle' })).getByLabelText('Renseigné'));
    const champ = screen.getByLabelText(/Jour du cycle \(à partir de 1\)/);
    fireEvent.change(champ, { target: { value: '0' } });
    expect(screen.getByText('Un nombre entier, à partir de 1.')).toBeTruthy();
  });

  it('drapeau BP-13 éteint (503) : l’encart se tait, le bloc reste', async () => {
    const fetchMock = servir({ status: 503, body: { ok: false, reason: 'desactive', error: '…' } });
    render(<Hote />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByTestId('declarations-dossier-bp13')).toBeNull();
    expect(screen.getByTestId('bloc-contexte-prelevement')).toBeTruthy();
  });

  it('une réponse sans la forme attendue tait l’encart, sans rien casser', async () => {
    const fetchMock = servir({ status: 200, body: { ok: true } });
    render(<Hote />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByTestId('declarations-dossier-bp13')).toBeNull();
  });

  it('un élément malformé dans les tableaux est écarté, sans casser le bloc', async () => {
    servir({
      status: 200,
      body: {
        ok: true,
        criteres: [null, { critere: 'grossesse', tete: 'abîmée' }],
        traitements: [null, { tete: 42 }],
        anamneseDu: null,
        mineur: false,
        aujourdhui: '2026-11-12',
      },
    });
    render(<Hote />);
    const encart = within(await screen.findByTestId('declarations-dossier-bp13'));
    expect(encart.getByText('aucun noté')).toBeTruthy();
    expect(encart.getAllByText('non renseigné')).toHaveLength(3);
    expect(screen.getByTestId('bloc-contexte-prelevement')).toBeTruthy();
  });

  it('un fetch qui rejette tait l’encart, le bloc reste', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('réseau'); }));
    render(<Hote />);
    await waitFor(() => expect(screen.getByTestId('bloc-contexte-prelevement')).toBeTruthy());
    expect(screen.queryByTestId('declarations-dossier-bp13')).toBeNull();
  });

  it('les déclarations BP-13 s’affichent À CÔTÉ, datées, sans rien préremplir', async () => {
    const ligne = (critere: string, reponse: string) => ({
      critere,
      tete: {
        id: `l_${critere}`,
        ordre: '1',
        acte: 'pose',
        idLigneRemplacee: null,
        source: 'patient',
        acteLe: '2026-10-28T09:00:00.000Z',
        critere,
        reponse,
        mesure: null,
        mesureLe: null,
        praticienEmail: null,
      },
      historique: [],
      anamnese: null,
      discordant: false,
    });
    servir({
      status: 200,
      body: {
        ok: true,
        criteres: [ligne('sexe_declare', 'feminin'), ligne('grossesse', 'oui')],
        traitements: [
          {
            tete: {
              id: 't1',
              ordre: '2',
              acte: 'pose',
              idLigneRemplacee: null,
              source: 'praticien',
              acteLe: '2026-11-01T09:00:00.000Z',
              nature: 'complement',
              nom: 'Magnésium',
              dose: '300 mg',
              moment: null,
              motif: null,
              debut: null,
              debutPrecision: null,
              fin: null,
              finPrecision: null,
              prescritParTiers: null,
              praticienEmail: 'praticien@wellneuro.fr',
            },
            historique: [],
          },
        ],
        anamneseDu: null,
        mineur: false,
        aujourdhui: '2026-11-12',
      },
    });
    render(<Hote />);
    const encart = within(await screen.findByTestId('declarations-dossier-bp13'));
    expect(encart.getByText(/pas l’état au prélèvement/)).toBeTruthy();
    expect(encart.getByText(/^féminin — déclaré par le patient le 28\/10\/2026$/)).toBeTruthy();
    expect(encart.getByText(/Magnésium \(300 mg\)/)).toBeTruthy();
    // Statut menstruel absent du dossier : dit, jamais inventé.
    expect(encart.getAllByText('non renseigné').length).toBeGreaterThan(0);
    // La grossesse DÉCLARÉE ne coche pas la grossesse AU PRÉLÈVEMENT.
    const grossesse = within(screen.getByRole('group', { name: 'Grossesse au prélèvement' }));
    expect((grossesse.getByLabelText('Inconnu') as HTMLInputElement).checked).toBe(true);
  });
});
