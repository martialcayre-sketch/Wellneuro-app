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

// Synthèse validée mais protocole non relu : il y a un document à composer,
// même si la chaîne n'est pas franchie — le lien suit la synthèse seule.
const syntheseSeule = construireCloture({
  versionActive: {
    inputHash: 'hash-v2',
    selectedPriorityId: 'PRIO_SOMMEIL',
    status: 'draft',
    reviewedAt: null,
    createdAt: new Date('2026-07-01T09:00:00.000Z'),
  },
  approbationActive: null,
  syntheses: [{ statut: 'Validee_Praticien', dateValidation: new Date('2026-07-01T12:00:00.000Z') }],
});

// Aucun protocole enregistré, mais une synthèse validée : la chaîne n'a pas
// d'objet, le document, si.
const sansProtocole = construireCloture({
  versionActive: null,
  approbationActive: null,
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
    expect(screen.getByText(/depuis la page Synthèse ou la page Documents/i)).toBeTruthy();
  });

  it('synthèse validée : le lien « Composer le document » ouvre la page Documents du dossier', async () => {
    repondre(complete);
    render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByText('Protocole relu')).toBeTruthy());
    const lien = screen.getByRole('link', { name: /Composer le document/i });
    expect(lien.getAttribute('href')).toBe('/dashboard/documents?idPatient=PAT_SEED_03');
    // Le poste de pilotage reste accessible à côté, sur le même dossier.
    expect(screen.getByRole('link', { name: /Ouvrir le poste de pilotage/i }).getAttribute('href')).toBe(
      '/dashboard/patients/PAT_SEED_03',
    );
  });

  it('le lien « Composer » suit la synthèse validée, pas l’état des autres étapes', async () => {
    repondre(syntheseSeule);
    render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByText(/Rien ne peut être diffusé en l’état/i)).toBeTruthy());
    expect(screen.getByRole('link', { name: /Composer le document/i })).toBeTruthy();
    expect(screen.queryByText(/Les trois étapes sont franchies/i)).toBeNull();
  });

  it('sans protocole mais avec une synthèse validée : le lien « Composer le document » est là', async () => {
    repondre(sansProtocole);
    render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByText(/Aucune décision enregistrée/i)).toBeTruthy());
    expect(screen.getByRole('link', { name: /Composer le document/i }).getAttribute('href')).toBe(
      '/dashboard/documents?idPatient=PAT_SEED_03',
    );
    expect(screen.getByText(/Rien ne peut être diffusé en l’état/i)).toBeTruthy();
    expect(screen.queryByText(/Les trois étapes sont franchies/i)).toBeNull();
  });

  it('sans synthèse validée : aucun lien « Composer le document »', async () => {
    repondre(bloquee);
    render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByText(/Rien ne peut être diffusé en l’état/i)).toBeTruthy());
    expect(screen.queryByRole('link', { name: /Composer le document/i })).toBeNull();
    expect(screen.getByRole('link', { name: /Ouvrir le poste de pilotage/i })).toBeTruthy();
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

describe('ClotureMinuteApresPanel — libellé de la priorité retenue (H43)', () => {
  const avecLibelle = (libellePriorite: string | null) =>
    construireCloture({
      versionActive: {
        inputHash: 'hash-v2',
        selectedPriorityId: 'priority:PRIO-DIG-01',
        libellePriorite,
        status: 'draft',
        reviewedAt: null,
        createdAt: new Date('2026-07-01T09:00:00.000Z'),
      },
      approbationActive: null,
      syntheses: [],
    });

  it('affiche le libellé, jamais l’identifiant brut', async () => {
    repondre(avecLibelle('Axe digestif'));
    const { container } = render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByText('Axe digestif')).toBeTruthy());
    expect(container.textContent).not.toContain('priority:');
  });

  it('libellé introuvable : l’identifiant reste, plutôt qu’un vide', async () => {
    repondre(avecLibelle(null));
    render(<ClotureMinuteApresPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByText('priority:PRIO-DIG-01')).toBeTruthy());
  });
});
