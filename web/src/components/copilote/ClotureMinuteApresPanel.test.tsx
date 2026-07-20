// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { ClotureMinuteApresPanel } from './ClotureMinuteApresPanel';
import { construireCloture } from '@/lib/copilote/minuteApres';

const fetchMock = vi.fn();

function repondre(cloture: unknown) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, cloture }) });
}

const complete = construireCloture({
  versionActive: {
    inputHash: 'hash-v2',
    selectedPriorityId: 'PRIO_SOMMEIL',
    status: 'practitioner_reviewed',
    reviewedAt: new Date('2026-07-01T10:00:00.000Z'),
    createdAt: new Date('2026-07-01T09:00:00.000Z'),
  },
  approbationActive: { protocolDraftInputHash: 'hash-v2', approvedAt: new Date('2026-07-01T11:00:00.000Z') },
  syntheses: [{ statut: 'Validee_Praticien', dateValidation: new Date('2026-07-01T12:00:00.000Z') }],
});

const bloquee = construireCloture({
  versionActive: {
    inputHash: 'hash-v2',
    selectedPriorityId: 'PRIO_SOMMEIL',
    status: 'draft',
    reviewedAt: null,
    createdAt: new Date('2026-07-01T09:00:00.000Z'),
  },
  approbationActive: null,
  syntheses: [],
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ClotureMinuteApresPanel', () => {
  it('affiche les trois étapes avec leur « pourquoi maintenant »', async () => {
    repondre(complete);
    render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByText('Protocole relu')).toBeTruthy());
    expect(screen.getByText('Validé pour diffusion')).toBeTruthy();
    expect(screen.getByText('Document validé praticien')).toBeTruthy();
    expect(screen.getAllByText(/version active du protocole porte une relecture/i)).toHaveLength(1);
  });

  it('chaîne complète : le constat est affiché, mais l’envoi reste ailleurs', async () => {
    repondre(complete);
    render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByText(/Les trois étapes sont franchies/i)).toBeTruthy());
    expect(screen.getByText(/il ne part pas d’ici/i)).toBeTruthy();
  });

  it('aucun bouton de cet écran ne peut déclencher un envoi', async () => {
    repondre(complete);
    const { container } = render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByText('Protocole relu')).toBeTruthy());
    // L'état « prêt » ne fait pas apparaître d'action : la surface reste en
    // lecture seule quel que soit l'avancement de la chaîne.
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.querySelectorAll('form')).toHaveLength(0);
  });

  it('chaîne incomplète : les blocages sont listés et rien n’est annoncé prêt', async () => {
    repondre(bloquee);
    render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByText(/Rien ne peut être diffusé en l’état/i)).toBeTruthy());
    expect(screen.queryByText(/Les trois étapes sont franchies/i)).toBeNull();
  });

  it('un échec de lecture n’est jamais présenté comme « tout est prêt »', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ ok: false, error: 'Erreur technique.' }) });
    render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/Rien ne peut être diffusé tant que cet état n’a pas été relu/i)).toBeTruthy();
    expect(screen.queryByText(/Les trois étapes sont franchies/i)).toBeNull();
  });
});
