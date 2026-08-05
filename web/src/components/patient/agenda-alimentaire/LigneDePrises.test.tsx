// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LigneDePrises, offsetDepuisRatio, offsetVersHeure } from './LigneDePrises';
import { NB_PRISES_MAX, type PriseJour } from '@/lib/agenda-alimentaire/types';

// Ce que ces tests protègent : la ligne de temps reste utilisable SANS clavier
// de saisie et SANS géométrie. jsdom ne rend aucune largeur — le glissement au
// doigt n'y est pas observable, et c'est justement pourquoi chaque acte a un
// chemin non gestuel (bouton d'ajout, bouton de retrait, flèches). Si ces
// chemins disparaissaient, l'écran deviendrait inaccessible au lecteur d'écran
// sans qu'aucun test ne rougisse.

function rendre(prises: PriseJour[] = [], desactive = false) {
  const onChange = vi.fn();
  const vue = render(<LigneDePrises prises={prises} onChange={onChange} desactive={desactive} />);
  return { onChange, vue };
}

const ajouter = () => screen.getByRole('button', { name: /ajouter une prise/i });

afterEach(cleanup);

describe('conversion d’échelle (journée ancrée 04:00 → 03:59)', () => {
  it('l’origine de la ligne est 04:00, sa fin 03:45', () => {
    expect(offsetVersHeure(0)).toBe('04:00');
    expect(offsetVersHeure(1425)).toBe('03:45');
  });

  it('une heure d’après minuit reste dans la journée, en fin de ligne', () => {
    expect(offsetVersHeure(1200)).toBe('00:00');
  });

  it('un ratio se ramène au quart d’heure le plus proche, borné à la ligne', () => {
    expect(offsetDepuisRatio(0)).toBe(0);
    expect(offsetDepuisRatio(0.5)).toBe(720);
    expect(offsetDepuisRatio(1)).toBe(1425);
    expect(offsetDepuisRatio(-1)).toBe(0);
  });
});

describe('poser, basculer, retirer', () => {
  it('le chemin non gestuel pose une prise, de nature « repas » par défaut', () => {
    const { onChange } = rendre([]);
    fireEvent.click(ajouter());
    expect(onChange).toHaveBeenCalledWith([{ heure: '08:00', nature: 'repas' }]);
  });

  it('toucher une prise bascule sa nature repas ↔ hors-repas', () => {
    const { onChange } = rendre([{ heure: '08:00', nature: 'repas' }]);
    fireEvent.click(screen.getByTestId('prise-08:00'));
    expect(onChange).toHaveBeenCalledWith([{ heure: '08:00', nature: 'hors_repas' }]);
  });

  it('la bascule fait bien l’aller-retour', () => {
    const { onChange } = rendre([{ heure: '08:00', nature: 'hors_repas' }]);
    fireEvent.click(screen.getByTestId('prise-08:00'));
    expect(onChange).toHaveBeenCalledWith([{ heure: '08:00', nature: 'repas' }]);
  });

  it('une cible de suppression explicite retire la prise sélectionnée', () => {
    const { onChange } = rendre([
      { heure: '08:00', nature: 'repas' },
      { heure: '12:30', nature: 'repas' },
    ]);
    // Sélectionner une prise fait apparaître une cible de suppression ATTEIGNABLE
    // sans appui long : le geste tactile est le chemin rapide, jamais le seul.
    fireEvent.focusIn(screen.getByTestId('prise-12:30'));
    fireEvent.click(screen.getByRole('button', { name: /retirer la prise de 12:30/i }));
    expect(onChange).toHaveBeenLastCalledWith([{ heure: '08:00', nature: 'repas' }]);
  });

  it('la touche Suppr retire la prise qui a le focus (chemin clavier)', () => {
    const { onChange } = rendre([{ heure: '08:00', nature: 'repas' }]);
    fireEvent.keyDown(screen.getByTestId('prise-08:00'), { key: 'Delete' });
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('les flèches déplacent une prise d’un quart d’heure, sans clavier de saisie', () => {
    const { onChange } = rendre([{ heure: '08:00', nature: 'hors_repas' }]);
    fireEvent.keyDown(screen.getByTestId('prise-08:00'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith([{ heure: '08:15', nature: 'hors_repas' }]);
  });

  it('une prise ne se déplace pas sur un emplacement déjà occupé', () => {
    const { onChange } = rendre([
      { heure: '08:00', nature: 'repas' },
      { heure: '08:15', nature: 'repas' },
    ]);
    fireEvent.keyDown(screen.getByTestId('prise-08:00'), { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('les prises restent triées sur l’échelle ancrée : 00:30 suit 22:00', () => {
    const { onChange } = rendre([{ heure: '22:00', nature: 'repas' }]);
    fireEvent.click(ajouter());
    expect(onChange).toHaveBeenCalledWith([
      { heure: '22:00', nature: 'repas' },
      { heure: '22:15', nature: 'repas' },
    ]);
  });
});

describe('plafond de dix prises', () => {
  const dix: PriseJour[] = Array.from({ length: NB_PRISES_MAX }, (_, i) => ({
    heure: offsetVersHeure(i * 60),
    nature: 'repas' as const,
  }));

  it('au-delà de dix, la pose est refusée avec un message en français', () => {
    const { onChange } = rendre(dix);
    fireEvent.click(ajouter());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/maximum de prises/i);
  });

  it('à dix prises, la bascule de nature reste possible', () => {
    const { onChange } = rendre(dix);
    fireEvent.click(screen.getByTestId('prise-04:00'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('accessibilité et neutralisation', () => {
  it('aucun champ de texte, aucune saisie d’heure au clavier', () => {
    rendre([{ heure: '08:00', nature: 'repas' }]);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.querySelector('input[type="time"]')).toBeNull();
  });

  it('chaque prise porte un nom accessible qui dit l’heure et la nature', () => {
    rendre([{ heure: '12:30', nature: 'hors_repas' }]);
    const bouton = screen.getByTestId('prise-12:30');
    expect(bouton.getAttribute('aria-label')).toMatch(/12 heures 30/);
    expect(bouton.getAttribute('aria-label')).toMatch(/hors repas/i);
  });

  it('désactivée, la ligne n’accepte plus ni pose ni bascule', () => {
    const { onChange } = rendre([{ heure: '08:00', nature: 'repas' }], true);
    expect((ajouter() as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('prise-08:00') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('prise-08:00'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
