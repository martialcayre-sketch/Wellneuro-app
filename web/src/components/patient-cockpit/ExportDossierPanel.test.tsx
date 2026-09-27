// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ExportDossierPanel } from './ExportDossierPanel';

// Identifiant de fixture — aucune donnée réelle.
const ID_PATIENT = 'PAT001';

const fetchMock = vi.fn();
const createObjectURL = vi.fn((_blob: Blob) => 'blob:export-dossier');
const revokeObjectURL = vi.fn((_url: string) => undefined);
let nomsTelecharges: string[] = [];

type ReponseSimulee = {
  ok: boolean;
  status: number;
  headers: Headers;
  blob: () => Promise<Blob>;
};

function reponsePdf(disposition: string | null): ReponseSimulee {
  const headers = new Headers({ 'Content-Type': 'application/pdf' });
  if (disposition) headers.set('Content-Disposition', disposition);
  return {
    ok: true,
    status: 200,
    headers,
    blob: async () => new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
  };
}

function reponseEchec(status: number): ReponseSimulee {
  return {
    ok: false,
    status,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    blob: async () => new Blob(['{}'], { type: 'application/json' }),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  nomsTelecharges = [];
  vi.stubGlobal('fetch', fetchMock);
  // jsdom n'implémente ni l'un ni l'autre.
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeObjectURL });
  // Le clic réel déclencherait une navigation que jsdom ne sait pas faire.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    nomsTelecharges.push(this.download);
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

function ouvrir() {
  const { container } = render(<ExportDossierPanel idPatient={ID_PATIENT} />);
  fireEvent.click(within(container).getByRole('button', { name: 'Exporter en PDF' }));
  return screen.getByRole('dialog');
}

function urlAppelee(): string {
  return String(fetchMock.mock.calls[0]?.[0]);
}

describe('ExportDossierPanel — ouverture', () => {
  it('le déclencheur est présent et le panneau fermé tant qu’on ne clique pas', () => {
    const { container } = render(<ExportDossierPanel idPatient={ID_PATIENT} />);
    expect(within(container).getByRole('button', { name: 'Exporter en PDF' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ouvre le panneau avec son titre, sa description et le choix de version', () => {
    const dialogue = ouvrir();
    expect(within(dialogue).getByText('Exporter le dossier en PDF')).toBeTruthy();
    expect(within(dialogue).getByText(/dernière synthèse validée/)).toBeTruthy();
    expect(within(dialogue).getByRole('group', { name: 'Version' })).toBeTruthy();
    expect(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' })).toBeTruthy();
  });

  it('la version pseudonymisée est cochée par défaut', () => {
    const dialogue = ouvrir();
    const iaExterne = within(dialogue).getByRole('radio', { name: 'Pour une IA externe (pseudonymisée)' }) as HTMLInputElement;
    const complete = within(dialogue).getByRole('radio', { name: 'Complète' }) as HTMLInputElement;
    expect(iaExterne.checked).toBe(true);
    expect(complete.checked).toBe(false);
  });

  it('chaque option porte son aide en description accessible', () => {
    const dialogue = ouvrir();
    const iaExterne = within(dialogue).getByRole('radio', { name: 'Pour une IA externe (pseudonymisée)' });
    const idAide = iaExterne.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(idAide)?.textContent).toMatch(/relisez le PDF avant de l’envoyer/);
    const complete = within(dialogue).getByRole('radio', { name: 'Complète' });
    expect(document.getElementById(complete.getAttribute('aria-describedby') ?? '')?.textContent).toMatch(
      /ne pas transmettre à un service d’IA externe/,
    );
  });
});

describe('ExportDossierPanel — téléchargement', () => {
  it('demande la version pseudonymisée par défaut', async () => {
    fetchMock.mockResolvedValue(reponsePdf('attachment; filename="dossier-PAT001-ia-externe.pdf"'));
    const dialogue = ouvrir();
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(urlAppelee()).toBe('/api/praticien/export-dossier?idPatient=PAT001&version=ia-externe');
  });

  it('bascule sur la version complète', async () => {
    fetchMock.mockResolvedValue(reponsePdf('attachment; filename="dossier-PAT001-complete.pdf"'));
    const dialogue = ouvrir();
    fireEvent.click(within(dialogue).getByRole('radio', { name: 'Complète' }));
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(urlAppelee()).toBe('/api/praticien/export-dossier?idPatient=PAT001&version=complete');
  });

  it('encode l’identifiant du dossier dans la requête', async () => {
    fetchMock.mockResolvedValue(reponsePdf(null));
    render(<ExportDossierPanel idPatient="PAT 001&x" />);
    fireEvent.click(screen.getByRole('button', { name: 'Exporter en PDF' }));
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le PDF' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(urlAppelee()).toBe('/api/praticien/export-dossier?idPatient=PAT%20001%26x&version=ia-externe');
  });

  it('succès : enregistre le blob sous le nom donné par Content-Disposition, puis libère l’URL', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockResolvedValue(reponsePdf('attachment; filename="dossier-PAT001-ia-externe.pdf"'));
    const dialogue = ouvrir();
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
    expect(nomsTelecharges).toEqual(['dossier-PAT001-ia-externe.pdf']);
    // Le lien temporaire ne reste pas dans la page.
    expect(document.querySelector('a[download]')).toBeNull();

    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:export-dossier');
    await waitFor(() =>
      expect(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }).hasAttribute('disabled')).toBe(false),
    );
    expect(within(dialogue).queryByRole('alert')).toBeNull();
  });

  it('sans Content-Disposition, le nom de repli porte l’identifiant du dossier', async () => {
    fetchMock.mockResolvedValue(reponsePdf(null));
    const dialogue = ouvrir();
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }));
    await waitFor(() => expect(nomsTelecharges).toEqual(['dossier-PAT001.pdf']));
  });

  it('le bouton est désactivé et annonce la préparation pendant l’attente', async () => {
    let resoudre: (reponse: ReponseSimulee) => void = () => undefined;
    fetchMock.mockReturnValue(
      new Promise<ReponseSimulee>(r => {
        resoudre = r;
      }),
    );
    const dialogue = ouvrir();
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }));

    const bouton = await within(dialogue).findByRole('button', { name: 'Préparation du PDF…' });
    expect(bouton.hasAttribute('disabled')).toBe(true);
    expect(bouton.getAttribute('aria-busy')).toBe('true');
    // Le choix est figé : le fichier reçu doit être celui de la version affichée.
    // `:disabled` et non `.disabled` : c'est le fieldset qui porte l'attribut.
    expect(within(dialogue).getByRole('radio', { name: 'Complète' }).matches(':disabled')).toBe(true);

    // Un second clic ne relance rien.
    fireEvent.click(bouton);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resoudre(reponsePdf(null));
    });
    await waitFor(() => expect(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' })).toBeTruthy());
  });
});

describe('ExportDossierPanel — échecs', () => {
  it.each([
    [401, 'Votre session a expiré : reconnectez-vous puis recommencez.'],
    [403, 'Ce dossier n’est pas accessible depuis votre compte.'],
    [404, 'Ce dossier n’est pas accessible depuis votre compte.'],
    [500, 'Le PDF n’a pas pu être préparé. Réessayez dans un instant.'],
  ])('HTTP %i : message dédié, aucun fichier enregistré', async (statut, message) => {
    fetchMock.mockResolvedValue(reponseEchec(statut));
    const dialogue = ouvrir();
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }));
    const alerte = await within(dialogue).findByRole('alert');
    expect(alerte.textContent).toBe(message);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(nomsTelecharges).toEqual([]);
    expect(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }).hasAttribute('disabled')).toBe(false);
  });

  it('erreur réseau : message générique, rien de journalisé', async () => {
    const journaux = [
      vi.spyOn(console, 'error'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'info'),
    ];
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const dialogue = ouvrir();
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }));
    const alerte = await within(dialogue).findByRole('alert');
    expect(alerte.textContent).toBe('Le PDF n’a pas pu être préparé. Réessayez dans un instant.');
    for (const journal of journaux) expect(journal).not.toHaveBeenCalled();
  });

  it('une réponse qui n’est pas un PDF n’est pas enregistrée sous un nom en .pdf', async () => {
    fetchMock.mockResolvedValue({ ...reponsePdf(null), headers: new Headers({ 'Content-Type': 'text/html' }) });
    const dialogue = ouvrir();
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }));
    const alerte = await within(dialogue).findByRole('alert');
    expect(alerte.textContent).toBe('Le PDF n’a pas pu être préparé. Réessayez dans un instant.');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('la réouverture repart de la version pseudonymisée, sans l’erreur précédente', async () => {
    fetchMock.mockResolvedValue(reponseEchec(500));
    const { container } = render(<ExportDossierPanel idPatient={ID_PATIENT} />);
    const declencheur = within(container).getByRole('button', { name: 'Exporter en PDF' });
    fireEvent.click(declencheur);
    let dialogue = screen.getByRole('dialog');
    fireEvent.click(within(dialogue).getByRole('radio', { name: 'Complète' }));
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Télécharger le PDF' }));
    await within(dialogue).findByRole('alert');

    fireEvent.click(within(dialogue).getByRole('button', { name: 'Fermer Exporter le dossier en PDF' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(declencheur);
    dialogue = screen.getByRole('dialog');
    expect(
      (within(dialogue).getByRole('radio', { name: 'Pour une IA externe (pseudonymisée)' }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(within(dialogue).queryByRole('alert')).toBeNull();
  });
});
