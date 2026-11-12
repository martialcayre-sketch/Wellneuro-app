// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { TEXTES_BROUILLON_ENTREE } from '@/app/portail/[token]/textesEntree';

// Composant partagé : questionnaires et plaintes gardent leurs textes « sur cet
// appareil » ; seule l'entrée reçoit T-37 à T-39 « dans cet onglet » ([[D-488]],
// amendement DOC-5).

const SAUVEGARDE = new Date(2026, 10, 12, 9, 5);

afterEach(cleanup);

describe('SaveStatusIndicator — textes par défaut inchangés (questionnaires, plaintes)', () => {
  it('brouillon, connexion interrompue, transmission non terminée : « sur cet appareil »', () => {
    const { rerender } = render(<SaveStatusIndicator savedAt={SAUVEGARDE} />);
    expect(screen.getByText(
      'Brouillon enregistré sur cet appareil — dernière sauvegarde à 09:05. Il ne sera transmis à votre praticien qu’après validation.',
    )).not.toBeNull();
    rerender(<SaveStatusIndicator savedAt={SAUVEGARDE} error="network" />);
    expect(screen.getByText('Connexion interrompue — vos réponses restent conservées sur cet appareil.')).not.toBeNull();
    rerender(<SaveStatusIndicator savedAt={SAUVEGARDE} error="submission-incomplete" />);
    expect(screen.getByText('Transmission non terminée — vos réponses restent conservées sur cet appareil.')).not.toBeNull();
  });

  it('sans sauvegarde ni erreur, rien ne paraît', () => {
    const { container } = render(<SaveStatusIndicator savedAt={null} />);
    expect(container.textContent).toBe('');
  });
});

describe('SaveStatusIndicator — textes de l’entrée (T-37 à T-39, mot pour mot)', () => {
  it('T-37, T-38, T-39 : « dans cet onglet »', () => {
    const { rerender } = render(<SaveStatusIndicator savedAt={SAUVEGARDE} textes={TEXTES_BROUILLON_ENTREE} />);
    expect(screen.getByText(
      'Brouillon gardé dans cet onglet — dernière sauvegarde à 09:05. Il ne sera transmis à votre praticien qu’après validation.',
    )).not.toBeNull();
    rerender(<SaveStatusIndicator savedAt={SAUVEGARDE} error="network" textes={TEXTES_BROUILLON_ENTREE} />);
    expect(screen.getByText('Connexion interrompue — vos réponses restent conservées dans cet onglet.')).not.toBeNull();
    rerender(<SaveStatusIndicator savedAt={SAUVEGARDE} error="submission-incomplete" textes={TEXTES_BROUILLON_ENTREE} />);
    expect(screen.getByText('Transmission non terminée — vos réponses restent conservées dans cet onglet.')).not.toBeNull();
  });
});
