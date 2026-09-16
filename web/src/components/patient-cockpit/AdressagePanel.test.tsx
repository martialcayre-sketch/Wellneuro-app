// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdressagePanel, type AdressageEtabli } from './AdressagePanel';

afterEach(cleanup);

const LETTRE: AdressageEtabli = {
  texte: 'Docteur, …',
  html: '<!doctype html><html lang="fr"><body><p>Docteur, …</p></body></html>',
  ancrageSha256: 'a'.repeat(64),
  ancrageVersion: 'safety-signals-nnpp2-v1',
};

function rendre(props: Partial<Parameters<typeof AdressagePanel>[0]> = {}) {
  return render(
    <AdressagePanel
      lettre={null}
      erreur={null}
      state="idle"
      onEtablir={vi.fn()}
      {...props}
    />,
  );
}

describe('ce que le panneau doit dire à voix haute', () => {
  it('dit qu’aucun envoi n’est automatique — la remise est manuelle', () => {
    rendre();
    expect(screen.getByText(/Aucun envoi automatique/i)).toBeTruthy();
  });

  it('dit que consigner TRACE l’adressage sans lever l’abstention', () => {
    // Le praticien doit le savoir AVANT de cliquer : une lettre consignée ne
    // débloque pas la chaîne, et le croire changerait sa conduite.
    rendre();
    // Le `<strong>` coupe le nœud de texte : c'est le PARAGRAPHE qui porte la
    // phrase entière, et c'est lui qu'il faut lire — interroger le fragment
    // rendrait un banc vert sur une moitié d'affirmation.
    const phrase = screen.getByText(/ne lève pas l’abstention/i).closest('p')?.textContent ?? '';
    expect(phrase).toMatch(/trace/i);
    expect(phrase).toMatch(/ne lève pas l’abstention/i);
  });

  it('dit que les signaux sont DÉCLARÉS par le patient', () => {
    rendre();
    expect(screen.getByText(/déclarés par le patient/i)).toBeTruthy();
  });
});

describe('le geste', () => {
  it('demande un destinataire, et ne part pas sans lui', () => {
    const onEtablir = vi.fn();
    rendre({ onEtablir });
    const bouton = screen.getByRole('button', { name: /Établir et consigner/i }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Nom du médecin destinataire/i), {
      target: { value: 'Dr Nicola' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Établir et consigner/i }));
    expect(onEtablir).toHaveBeenCalledWith('Dr Nicola');
  });

  it('un même destinataire ne se consigne pas deux fois ; le corriger rouvre le geste', () => {
    const onEtablir = vi.fn();
    const { rerender } = rendre({ onEtablir });
    fireEvent.change(screen.getByLabelText(/Nom du médecin destinataire/i), {
      target: { value: 'Dr Nicola' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Établir et consigner/i }));
    expect(onEtablir).toHaveBeenCalledTimes(1);
    rerender(
      <AdressagePanel lettre={LETTRE} erreur={null} state="idle" onEtablir={onEtablir} />,
    );
    expect((screen.getByRole('button', { name: /Établir et consigner/i }) as HTMLButtonElement).disabled)
      .toBe(true);
    fireEvent.change(screen.getByLabelText(/Nom du médecin destinataire/i), {
      target: { value: 'Dr Martin' },
    });
    expect((screen.getByRole('button', { name: /Établir et consigner/i }) as HTMLButtonElement).disabled)
      .toBe(false);
  });

  it('un refus serveur est affiché tel quel, jamais reformulé', () => {
    // Les motifs du serveur — aucun signal d'adressage, cotation non signée,
    // dossier clos — sont écrits pour être lus par le praticien.
    rendre({ erreur: 'La cotation des signaux d’alerte n’est pas signée.' });
    expect(screen.getByRole('alert').textContent).toContain('n’est pas signée');
  });
});

describe('le papier', () => {
  it('imprime L’APERÇU servi, et garde la transcription à côté', () => {
    const { container } = rendre({ lettre: LETTRE });
    const apercu = within(container).getByTitle(/Aperçu imprimable de la lettre/i) as HTMLIFrameElement;
    // SERVI TEL QUEL : l'écran ne recompose pas la lettre — ce qui s'imprime est
    // exactement ce que la garde non prescriptive a jugé au serveur.
    expect(apercu.getAttribute('srcdoc')).toBe(LETTRE.html);
    expect((within(container).getByLabelText(/Texte de la lettre/i) as HTMLTextAreaElement).value)
      .toBe('Docteur, …');
    const statut = within(container).getByRole('status').textContent ?? '';
    expect(statut).toContain('safety-signals-nnpp2-v1');
  });

  it('le bouton imprime l’aperçu, pas la page du cockpit', () => {
    const { container } = rendre({ lettre: LETTRE });
    const apercu = within(container).getByTitle(/Aperçu imprimable de la lettre/i) as HTMLIFrameElement;
    const fenetre = apercu.contentWindow;
    if (fenetre === null) throw new Error('aperçu sans fenêtre');
    const imprimerApercu = vi.fn();
    const imprimerPage = vi.spyOn(window, 'print').mockImplementation(() => {});
    Object.defineProperty(fenetre, 'print', { value: imprimerApercu, configurable: true });

    fireEvent.click(within(container).getByRole('button', { name: /Imprimer la lettre/i }));

    expect(imprimerApercu).toHaveBeenCalledTimes(1);
    expect(imprimerPage).not.toHaveBeenCalled();
    imprimerPage.mockRestore();
  });

  it('sans rendu servi, n’offre PAS d’impression — et laisse la transcription', () => {
    const { container } = rendre({ lettre: { ...LETTRE, html: '' } });
    expect(within(container).queryByTitle(/Aperçu imprimable de la lettre/i)).toBeNull();
    expect(within(container).queryByRole('button', { name: /Imprimer la lettre/i })).toBeNull();
    expect(within(container).getByLabelText(/Texte de la lettre/i)).toBeTruthy();
  });
});
