// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DossierConfirmDialog } from './DossierConfirmDialog';

// La confirmation d'effacement est le dernier obstacle avant une destruction
// sans retour. Ce qu'on vérifie ici n'est pas cosmétique : qu'elle NOMME le
// dossier concerné, qu'elle dise ce qui part ET ce qui reste, et qu'elle exige
// un geste qu'un clic distrait ne produit pas.
//
// Seuls les patients fictifs du dépôt apparaissent dans ces tests.

afterEach(cleanup);

const PATIENT = 'Michel Dogné';

function rendreEffacement(onConfirm = vi.fn()) {
  render(
    <DossierConfirmDialog
      mode="effacement"
      nomPatient={PATIENT}
      open
      onOpenChange={() => {}}
      onConfirm={onConfirm}
    />,
  );
  return {
    onConfirm,
    champ: screen.getByLabelText(/saisissez/i) as HTMLInputElement,
    bouton: screen.getByRole('button', { name: /effacer définitivement/i }) as HTMLButtonElement,
  };
}

describe('DossierConfirmDialog — effacement', () => {
  it('nomme le dossier concerné dans son titre', () => {
    rendreEffacement();
    expect(screen.getByRole('heading', { name: new RegExp(PATIENT) })).toBeTruthy();
  });

  it('annonce l’irréversibilité', () => {
    rendreEffacement();
    expect(screen.getByText(/irréversible/i)).toBeTruthy();
  });

  it('liste ce qui est détruit ET ce qui subsiste', () => {
    rendreEffacement();
    expect(screen.getByRole('heading', { name: /ce qui est détruit/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /ce qui subsiste/i })).toBeTruthy();
    // Le résidu de D6, énoncé tel qu'il est réellement écrit en base.
    expect(screen.getByText(/année de naissance et les trois premières lettres du nom/i)).toBeTruthy();
  });

  it('dit explicitement que l’e-mail ne subsiste pas, même haché', () => {
    rendreEffacement();
    expect(screen.getByText(/ni e-mail — pas même sous forme d’empreinte/i)).toBeTruthy();
  });

  it('garde le bouton inerte tant que la saisie ne vaut pas EFFACER', () => {
    const { champ, bouton } = rendreEffacement();
    expect(bouton.disabled).toBe(true);

    fireEvent.change(champ, { target: { value: 'EFFA' } });
    expect(bouton.disabled).toBe(true);

    // Sensible à la casse : le serveur compare à la chaîne exacte.
    fireEvent.change(champ, { target: { value: 'effacer' } });
    expect(bouton.disabled).toBe(true);

    fireEvent.change(champ, { target: { value: 'EFFACER' } });
    expect(bouton.disabled).toBe(false);
  });

  it('ne confirme rien tant que le bouton est inerte', () => {
    const { bouton, onConfirm } = rendreEffacement();
    fireEvent.click(bouton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirme une fois le mot saisi', () => {
    const { champ, bouton, onConfirm } = rendreEffacement();
    fireEvent.change(champ, { target: { value: 'EFFACER' } });
    fireEvent.click(bouton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('repart d’un champ vide à la réouverture', () => {
    const { rerender } = render(
      <DossierConfirmDialog
        mode="effacement"
        nomPatient={PATIENT}
        open
        onOpenChange={() => {}}
        onConfirm={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/saisissez/i), { target: { value: 'EFFACER' } });

    const props = { mode: 'effacement' as const, nomPatient: PATIENT, onOpenChange: () => {}, onConfirm: vi.fn() };
    rerender(<DossierConfirmDialog {...props} open={false} />);
    rerender(<DossierConfirmDialog {...props} open />);

    expect((screen.getByLabelText(/saisissez/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByRole('button', { name: /effacer définitivement/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('DossierConfirmDialog — clôture', () => {
  function rendreCloture(onConfirm = vi.fn()) {
    render(
      <DossierConfirmDialog
        mode="cloture"
        nomPatient={PATIENT}
        open
        onOpenChange={() => {}}
        onConfirm={onConfirm}
      />,
    );
    return onConfirm;
  }

  it('nomme le dossier et n’exige aucune saisie — l’action est réversible', () => {
    const onConfirm = rendreCloture();
    expect(screen.getByRole('heading', { name: new RegExp(PATIENT) })).toBeTruthy();
    expect(screen.queryByLabelText(/saisissez/i)).toBeNull();

    const bouton = screen.getByRole('button', { name: /clôturer le suivi/i }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(false);
    fireEvent.click(bouton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('énonce ce qui s’arrête et ce qui reste', () => {
    rendreCloture();
    expect(screen.getByText(/plus aucun questionnaire/i)).toBeTruthy();
    expect(screen.getByText(/accès en lecture à ses archives/i)).toBeTruthy();
  });

  // Le menu laisse « Renvoyer le lien » actionnable sur un dossier clos, et
  // c'est voulu (2026-07-21) : sans lien, la lecture des archives promise juste
  // au-dessus serait inatteignable. Le praticien doit donc le lire ICI, avant
  // de clôturer — sinon l'écran promet le silence et l'application envoie.
  it('annonce que le lien d’accès reste envoyable après la clôture', () => {
    rendreCloture();
    expect(screen.getByText(/document de suivi/i)).toBeTruthy();
    expect(screen.getByText(/renvoyer son lien d’accès/i)).toBeTruthy();
  });

  // Dossier désactivé : la lecture est déjà coupée par le portail. Promettre un
  // renvoi de lien y serait un mensonge — la variante doit rester muette.
  it('ne promet ni lecture ni lien sur un dossier désactivé', () => {
    render(
      <DossierConfirmDialog
        mode="cloture"
        nomPatient={PATIENT}
        accesActif={false}
        open
        onOpenChange={() => {}}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByText(/renvoyer son lien d’accès/i)).toBeNull();
    expect(screen.getByText(/n’a plus accès à son espace/i)).toBeTruthy();
  });

  it('ne présente aucune liste de destruction', () => {
    rendreCloture();
    expect(screen.queryByRole('heading', { name: /ce qui est détruit/i })).toBeNull();
  });
});
