// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { DetailVersionUsage, RubriqueDetaillee } from '@/lib/fiches-usage/lecture';
import { RelectureFicheUsage } from './RelectureFicheUsage';

// Textes synthétiques : aucun texte de fiche réel n'entre au dépôt (D-251 §4).
const LE = '2026-10-16T02:00:00.000Z';
const SHA_Q = 'a'.repeat(64);
const SHA_L = 'b'.repeat(64);

function rubrique(nom: string, empreinte: string, over: Partial<RubriqueDetaillee> = {}): RubriqueDetaillee {
  return { rubrique: nom, texte: `Texte synthétique de ${nom}.`, empreinte, etat: { etat: 'a_valider' }, dernierActe: null, actes: [], ...over };
}

function detail(over: Partial<DetailVersionUsage> = {}): DetailVersionUsage {
  return {
    id: 'versionbanc0001',
    ficheId: 'FU_BANC_A',
    numero: 2,
    creeLe: LE,
    modeleRedaction: 'modele-a',
    modeleContreLecture: 'modele-b',
    versionConsigne: 'consigne-v1',
    structureDuJour: true,
    structureSignee: true,
    etat: { etat: 'a_valider', validees: 0, attendues: 2 },
    depassee: false,
    rubriques: [rubrique('question', SHA_Q), rubrique('limites', SHA_L, { dernierActe: '4' })],
    ...over,
  };
}

function reponse(corps: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => corps } as Response;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RelectureFicheUsage — un acte par rubrique (D-314 §3)', () => {
  it('rend chaque rubrique avec son texte, son état et la provenance de la version', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: true, version: detail(), peutDecider: true })));
    render(<RelectureFicheUsage idVersion="versionbanc0001" onFermer={() => undefined} />);
    expect(await screen.findByTestId('rubrique-question')).toBeTruthy();
    expect(screen.getByText('Texte synthétique de limites.')).toBeTruthy();
    expect(screen.getByText('À valider · 0/2 rubriques')).toBeTruthy();
    expect(screen.getByText('modele-b')).toBeTruthy();
  });

  it('valider exige la case cochée, et le corps porte l’empreinte, le jeton et la déclaration de CETTE rubrique', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse({ ok: true, version: detail(), peutDecider: true }))
      .mockResolvedValueOnce(reponse({ ok: true, acte: {}, etat: { etat: 'validee' } }))
      .mockResolvedValueOnce(reponse({ ok: true, version: detail(), peutDecider: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<RelectureFicheUsage idVersion="versionbanc0001" onFermer={() => undefined} />);
    const bloc = within(await screen.findByTestId('rubrique-limites'));
    const valider = bloc.getByRole('button', { name: 'Valider' }) as HTMLButtonElement;
    expect(valider.disabled).toBe(true);
    fireEvent.click(bloc.getByRole('checkbox'));
    fireEvent.click(bloc.getByRole('button', { name: 'Valider' }));
    fireEvent.click(bloc.getByRole('button', { name: 'Confirmer la validation' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/praticien/fiches-usage/actes');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      idVersion: 'versionbanc0001',
      rubrique: 'limites',
      acte: 'validee',
      empreinteVue: SHA_L,
      dernierActeVu: '4',
      relectureIntegrale: true,
    });
    expect(await screen.findByText(/Limites : rubrique validée/)).toBeTruthy();
  });

  it('structure non signée : la relecture est possible, aucun bouton Valider', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: true, version: detail({ structureSignee: false }), peutDecider: true })));
    render(<RelectureFicheUsage idVersion="versionbanc0001" onFermer={() => undefined} />);
    const bloc = within(await screen.findByTestId('rubrique-question'));
    expect(bloc.queryByRole('button', { name: 'Valider' })).toBeNull();
    expect(bloc.getByText(/n’est pas signée/)).toBeTruthy();
    // Le retrait reste ouvert : il ne dépend pas de la structure.
    expect(bloc.getByRole('button', { name: 'Retirer' })).toBeTruthy();
  });

  it('une version à relire ne se valide pas, et le dit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: true, version: detail({ etat: { etat: 'a_relire' }, structureDuJour: false }), peutDecider: true })));
    render(<RelectureFicheUsage idVersion="versionbanc0001" onFermer={() => undefined} />);
    const bloc = within(await screen.findByTestId('rubrique-question'));
    expect(bloc.queryByRole('button', { name: 'Valider' })).toBeNull();
    expect(bloc.getByText(/une nouvelle version doit être déposée/)).toBeTruthy();
  });

  it('un retrait exige un motif ; un refus « état divergent » recharge la relecture', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse({ ok: true, version: detail(), peutDecider: true }))
      .mockResolvedValueOnce(reponse({ ok: false, reason: 'etat_divergent', error: 'L’état a changé.' }, 409))
      .mockResolvedValueOnce(reponse({ ok: true, version: detail(), peutDecider: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<RelectureFicheUsage idVersion="versionbanc0001" onFermer={() => undefined} />);
    const bloc = within(await screen.findByTestId('rubrique-question'));
    fireEvent.click(bloc.getByRole('button', { name: 'Retirer' }));
    const confirmer = bloc.getByRole('button', { name: 'Confirmer le retrait' }) as HTMLButtonElement;
    expect(confirmer.disabled).toBe(true);
    fireEvent.change(bloc.getByLabelText('Motif du retrait'), { target: { value: '  Motif synthétique.  ' } });
    fireEvent.click(confirmer);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toMatchObject({
      acte: 'retiree',
      motif: 'Motif synthétique.',
    });
    expect((await screen.findByRole('alert')).textContent).toContain('L’état a changé.');
  });

  it('un état illisible ne propose aucun geste', async () => {
    const illisible = rubrique('question', SHA_Q, { etat: { etat: 'illisible', raison: 'acte_inconnu' } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reponse({ ok: true, version: detail({ etat: { etat: 'illisible', rubriques: ['question'] }, rubriques: [illisible] }), peutDecider: true })),
    );
    render(<RelectureFicheUsage idVersion="versionbanc0001" onFermer={() => undefined} />);
    const bloc = within(await screen.findByTestId('rubrique-question'));
    expect(bloc.queryByRole('button')).toBeNull();
    expect(bloc.getByText(/aucun acte ne peut être posé/)).toBeTruthy();
  });

  it('une session qui n’est pas celle du responsable lit, sans aucun geste', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: true, version: detail(), peutDecider: false })));
    render(<RelectureFicheUsage idVersion="versionbanc0001" onFermer={() => undefined} />);
    const bloc = within(await screen.findByTestId('rubrique-question'));
    expect(bloc.queryByRole('button')).toBeNull();
    expect(bloc.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText(/réservés au responsable/)).toBeTruthy();
  });

  it('une version dépassée ne propose pas Valider, et le retrait reste ouvert', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: true, version: detail({ depassee: true }), peutDecider: true })));
    render(<RelectureFicheUsage idVersion="versionbanc0001" onFermer={() => undefined} />);
    const bloc = within(await screen.findByTestId('rubrique-question'));
    expect(bloc.queryByRole('button', { name: 'Valider' })).toBeNull();
    expect(bloc.getByText(/Une version plus récente de cette fiche est déjà validée/)).toBeTruthy();
    expect(bloc.getByRole('button', { name: 'Retirer' })).toBeTruthy();
  });

  it('une rubrique validée dans une version à relire n’affiche pas un « Validé » nu', async () => {
    const validee = rubrique('question', SHA_Q, {
      etat: { etat: 'validee', ordre: '3', le: LE, validateur: 'responsable@wellneuro.fr' },
      dernierActe: '3',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        reponse({ ok: true, version: detail({ etat: { etat: 'a_relire' }, structureDuJour: false, rubriques: [validee] }), peutDecider: true }),
      ),
    );
    render(<RelectureFicheUsage idVersion="versionbanc0001" onFermer={() => undefined} />);
    const bloc = within(await screen.findByTestId('rubrique-question'));
    expect(bloc.getByText('Validé · version à relire')).toBeTruthy();
    expect(bloc.queryByText('Validé')).toBeNull();
  });

  it('une version validée sous une structure qui n’est plus signée ne fait plus foi, et le badge le dit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reponse({ ok: true, version: detail({ etat: { etat: 'validee' }, structureSignee: false }), peutDecider: true })),
    );
    render(<RelectureFicheUsage idVersion="versionbanc0001" onFermer={() => undefined} />);
    expect(await screen.findByText('Validée · structure non signée')).toBeTruthy();
    expect(screen.getByText(/elle ne fait pas foi/)).toBeTruthy();
  });
});
