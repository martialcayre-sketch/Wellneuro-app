// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ScoreGauge } from './ScoreGauge';

// Régression E10 : un score chiffré affiché au patient contredit A6-R1 (« la
// Spirale montrée comme construction, jamais un score »). `showValue` permet
// de garder le chiffre côté praticien (comportement historique, défaut) tout
// en le masquant côté patient sans dupliquer le composant.
describe('ScoreGauge', () => {
  afterEach(cleanup);

  it('affiche la valeur chiffrée par défaut (comportement praticien inchangé)', () => {
    render(<ScoreGauge value={72} label="Mon équilibre" />);
    expect(screen.getByText('72')).not.toBeNull();
    expect(screen.getByText('Mon équilibre')).not.toBeNull();
  });

  it('masque la valeur chiffrée quand showValue est à false, sans masquer le libellé', () => {
    render(<ScoreGauge value={72} label="Mon équilibre" showValue={false} />);
    expect(screen.queryByText('72')).toBeNull();
    expect(screen.getByText('Mon équilibre')).not.toBeNull();
  });
});
