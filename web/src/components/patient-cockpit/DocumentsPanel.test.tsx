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

  it('pré-sélectionne le patient transmis par l’URL — continuité depuis la fiche', async () => {
    const { container } = render(<DocumentsPanel initialPatientId="PAT_1" />);
    // Le dossier est sélectionné et ses synthèses chargées sans aucun geste.
    await waitFor(() => screen.getByRole('option', { name: /Validée/ }));
    expect((container.querySelector('select') as HTMLSelectElement).value).toBe('PAT_1');
  });

  it('ignore un idPatient d’URL inconnu de la liste du praticien', async () => {
    const { container } = render(<DocumentsPanel initialPatientId="PAT_AILLEURS" />);
    await waitFor(() => screen.getByRole('option', { name: /Sophie Nicola/ }));
    expect((container.querySelector('select') as HTMLSelectElement).value).toBe('');
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

  // D-307 §2 (F38) : « Imprimer » le document pour le médecin se confirme,
  // s'enregistre au serveur, puis imprime l'instantané qu'il renvoie.
  async function ouvrirApercuMedecin() {
    const { container } = render(<DocumentsPanel />);
    await waitFor(() => screen.getByRole('option', { name: /Sophie Nicola/ }));
    fireEvent.change(container.querySelectorAll('select')[0], { target: { value: 'PAT_1' } });
    await waitFor(() => screen.getByRole('option', { name: /Validée/ }));
    fireEvent.change(container.querySelectorAll('select')[1], { target: { value: 'SYN_1' } });
    await waitFor(() => screen.getByTitle('Aperçu Patient'));
    const groupe = screen.getByRole('group', { name: /Destinataire de l’aperçu imprimable/ });
    fireEvent.click(within(groupe).getByRole('button', { name: 'Médecin traitant' }));
    return screen.getByTitle('Aperçu Médecin traitant') as HTMLIFrameElement;
  }

  function appelsImpression() {
    return fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/praticien/documents/medecin/impression'));
  }

  function repondreImpression(reponse: { ok: boolean; json: unknown }) {
    const precedente = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/praticien/documents/medecin/impression')) {
        return Promise.resolve({ ok: reponse.ok, json: async () => reponse.json });
      }
      return precedente!(url, init);
    });
  }

  it('médecin : la confirmation n’annonce le portail que s’il est ouvert (arbitrage du 2026-10-19)', async () => {
    await ouvrirApercuMedecin();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer cet aperçu' }));
    expect(screen.getByRole('group', { name: 'Confirmer l’impression' }).textContent)
      .not.toContain('télécharger dans son espace');
    cleanup();

    const precedente = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/praticien/documents?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true, patientNom: 'Sophie Nicola', dateDocument: '18 juillet 2026', statut: 'Validee_Praticien',
            blocs: blocsFixture(), portailDocumentMedecinOuvert: true,
          }),
        });
      }
      return precedente!(url, init);
    });
    await ouvrirApercuMedecin();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer cet aperçu' }));
    expect(screen.getByRole('group', { name: 'Confirmer l’impression' }).textContent)
      .toContain('Le patient pourra le télécharger dans son espace pour le remettre lui-même.');
  });

  it('médecin : « Imprimer » demande une confirmation, et Annuler n’enregistre rien', async () => {
    await ouvrirApercuMedecin();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer cet aperçu' }));
    const confirmation = screen.getByRole('group', { name: 'Confirmer l’impression' });
    expect(confirmation.textContent).toContain('Fil de correspondance');
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('group', { name: 'Confirmer l’impression' })).toBeNull();
    expect(appelsImpression()).toHaveLength(0);
  });

  it('médecin : la confirmation enregistre, puis l’iframe porte l’instantané du serveur', async () => {
    repondreImpression({
      ok: true,
      json: { ok: true, impression: { id: 'imp_1', imprimeLe: '2026-10-18T15:00:00.000Z' }, html: '<p>Instantané serveur</p>' },
    });
    const iframe = await ouvrirApercuMedecin();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer cet aperçu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et imprimer' }));
    await waitFor(() => expect(screen.getByText(/Impression enregistrée/)).not.toBeNull());
    expect(appelsImpression()).toHaveLength(1);
    expect(JSON.parse(String(appelsImpression()[0][1]?.body))).toEqual({ idSynthese: 'SYN_1' });
    expect(iframe.getAttribute('srcdoc')).toBe('<p>Instantané serveur</p>');
  });

  it('médecin : l’instantané différent de l’aperçu est imprimé une fois chargé', async () => {
    repondreImpression({
      ok: true,
      json: { ok: true, impression: { id: 'imp_1', imprimeLe: '2026-10-18T15:00:00.000Z' }, html: '<p>Instantané serveur</p>' },
    });
    const iframe = await ouvrirApercuMedecin();
    const imprimer = vi.spyOn(iframe.contentWindow!, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer cet aperçu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et imprimer' }));
    await waitFor(() => expect(iframe.getAttribute('srcdoc')).toBe('<p>Instantané serveur</p>'));
    expect(imprimer).not.toHaveBeenCalled();
    fireEvent.load(iframe);
    expect(imprimer).toHaveBeenCalledTimes(1);
    fireEvent.load(iframe);
    expect(imprimer).toHaveBeenCalledTimes(1);
  });

  it('médecin : l’instantané identique à l’aperçu s’imprime aussitôt (aucun rechargement)', async () => {
    const iframe = await ouvrirApercuMedecin();
    repondreImpression({
      ok: true,
      json: { ok: true, impression: { id: 'imp_1', imprimeLe: '2026-10-18T15:00:00.000Z' }, html: iframe.getAttribute('srcdoc') },
    });
    const imprimer = vi.spyOn(iframe.contentWindow!, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer cet aperçu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et imprimer' }));
    await waitFor(() => expect(imprimer).toHaveBeenCalledTimes(1));
  });

  it('médecin : une réponse arrivée après un changement de sélection n’imprime rien', async () => {
    let repondre: (valeur: unknown) => void = () => {};
    const precedente = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/praticien/documents/medecin/impression')) {
        return new Promise((resolve) => { repondre = resolve; });
      }
      return precedente!(url, init);
    });
    const iframe = await ouvrirApercuMedecin();
    const imprimer = vi.spyOn(iframe.contentWindow!, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer cet aperçu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et imprimer' }));
    // La synthèse change pendant l'appel.
    fireEvent.change(document.querySelectorAll('select')[1], { target: { value: '' } });
    repondre({
      ok: true,
      json: async () => ({ ok: true, impression: { id: 'imp_1', imprimeLe: '2026-10-18T15:00:00.000Z' }, html: '<p>Ancien dossier</p>' }),
    });
    await waitFor(() => expect(screen.getByText(/la sélection a changé, rien n’a été imprimé/)).not.toBeNull());
    expect(imprimer).not.toHaveBeenCalled();
    expect(document.body.innerHTML).not.toContain('Ancien dossier');
  });

  it('médecin : un refus du serveur est affiché, l’aperçu reste celui relu', async () => {
    repondreImpression({ ok: false, json: { ok: false, reason: 'consentement_partage_retire', error: 'Le patient a retiré son consentement.' } });
    const iframe = await ouvrirApercuMedecin();
    const avant = iframe.getAttribute('srcdoc');
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer cet aperçu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer et imprimer' }));
    await waitFor(() => expect(screen.getByText('Le patient a retiré son consentement.')).not.toBeNull());
    expect(iframe.getAttribute('srcdoc')).toBe(avant);
  });

  it('patient : « Imprimer » ne passe ni par la confirmation ni par le serveur', async () => {
    const { container } = render(<DocumentsPanel />);
    await waitFor(() => screen.getByRole('option', { name: /Sophie Nicola/ }));
    fireEvent.change(container.querySelectorAll('select')[0], { target: { value: 'PAT_1' } });
    await waitFor(() => screen.getByRole('option', { name: /Validée/ }));
    fireEvent.change(container.querySelectorAll('select')[1], { target: { value: 'SYN_1' } });
    await waitFor(() => screen.getByTitle('Aperçu Patient'));
    fireEvent.click(screen.getByRole('button', { name: 'Imprimer cet aperçu' }));
    expect(screen.queryByRole('group', { name: 'Confirmer l’impression' })).toBeNull();
    expect(appelsImpression()).toHaveLength(0);
  });
});
