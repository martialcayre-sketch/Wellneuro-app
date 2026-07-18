// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DocumentsPanel } from './DocumentsPanel';
import { blocsDepuisSynthese } from '@/lib/documents';
import type { SyntheseSchema } from '@/lib/anthropic';

function blocsFixture() {
  const s: SyntheseSchema = {
    resume_praticien: 'Résumé STRICTEMENT interne',
    axes_prioritaires: [{ axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['réveils'], points_a_confirmer: [] }],
    points_de_vigilance: ['fatigue'],
    questions_entretien: ['Depuis quand ?'],
    narratif_patient: 'Sommeil fragmenté à accompagner.',
    limites: 'À valider.',
  };
  return blocsDepuisSynthese({ syntheseJson: s, statut: 'Validee_Praticien', versionPrompt: 'synthese-v3', dateValidation: '2026-07-18T00:00:00.000Z' });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  // 1) patients-pg
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/api/praticien/patients-pg')) {
      return Promise.resolve({ ok: true, json: async () => ({ patients: [{ idPatient: 'PAT_1', prenom: 'Sophie', nom: 'Nicola', email: 's@x.fr' }] }) });
    }
    if (url.includes('/api/praticien/synthese')) {
      return Promise.resolve({ ok: true, json: async () => ({ syntheses: [{ idSynthese: 'SYN_1', statut: 'Validee_Praticien', dateValidation: '2026-07-18T00:00:00.000Z' }] }) });
    }
    if (url.includes('/api/praticien/documents')) {
      return Promise.resolve({ ok: true, json: async () => ({ ok: true, patientNom: 'Sophie Nicola', dateDocument: '18 juillet 2026', statut: 'Validee_Praticien', blocs: blocsFixture() }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DocumentsPanel', () => {
  it('charge les patients au montage', async () => {
    render(<DocumentsPanel />);
    await waitFor(() => expect(screen.getByRole('option', { name: /Sophie Nicola/ })).not.toBeNull());
  });

  it('compose et affiche l’aperçu sans fuite de donnée interne côté patient', async () => {
    const { container } = render(<DocumentsPanel />);
    await waitFor(() => screen.getByRole('option', { name: /Sophie Nicola/ }));

    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'PAT_1' } });
    await waitFor(() => screen.getByRole('option', { name: /Validée/ }));
    fireEvent.change(container.querySelectorAll('select')[1], { target: { value: 'SYN_1' } });

    // L'aperçu imprimable (iframe patient) ne contient pas le champ interne praticien.
    await waitFor(() => expect(screen.getByTitle('Aperçu Patient')).not.toBeNull());
    const iframe = screen.getByTitle('Aperçu Patient') as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('Validé par votre praticien');
    expect(iframe.getAttribute('srcdoc')).not.toContain('STRICTEMENT interne');
  });

  it('bascule l’aperçu vers le médecin (explorations à discuter)', async () => {
    const { container } = render(<DocumentsPanel />);
    await waitFor(() => screen.getByRole('option', { name: /Sophie Nicola/ }));
    fireEvent.change(container.querySelectorAll('select')[0], { target: { value: 'PAT_1' } });
    await waitFor(() => screen.getByRole('option', { name: /Validée/ }));
    fireEvent.change(container.querySelectorAll('select')[1], { target: { value: 'SYN_1' } });
    await waitFor(() => screen.getByTitle('Aperçu Patient'));

    const groupe = screen.getByRole('group', { name: /Destinataire de l’aperçu imprimable/ });
    fireEvent.click(within(groupe).getByRole('button', { name: 'Médecin traitant' }));
    const iframe = screen.getByTitle('Aperçu Médecin traitant') as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('explorations à discuter');
    expect(iframe.getAttribute('srcdoc')).not.toContain('STRICTEMENT interne');
  });
});
