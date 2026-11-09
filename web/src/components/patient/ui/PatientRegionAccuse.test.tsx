// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { PatientRegionAccuse } from './PatientRegionAccuse';

afterEach(cleanup);

describe('PatientRegionAccuse', () => {
  it('la région existe, vide, avant le message : le lecteur d’écran la connaît déjà', () => {
    render(<PatientRegionAccuse visible={false}>C’est transmis.</PatientRegionAccuse>);
    expect(screen.getByRole('status').textContent).toBe('');
    expect(document.activeElement).toBe(document.body);
  });

  it('le message paraît dans la même région, et le focus s’y pose', () => {
    const { rerender } = render(<PatientRegionAccuse visible={false}>C’est transmis.</PatientRegionAccuse>);
    const region = screen.getByRole('status');
    rerender(<PatientRegionAccuse visible>C’est transmis.</PatientRegionAccuse>);
    expect(screen.getByRole('status')).toBe(region);
    expect(region.textContent).toBe('C’est transmis.');
    expect(document.activeElement).toBe(region);
  });

  // Un écran qui s'ouvre sur un accusé déjà acquis ne répond à aucun geste : lui
  // donner le focus au chargement ferait sauter la lecture du haut de la page.
  it('déjà visible au montage : le message est là, le focus ne bouge pas', () => {
    render(<PatientRegionAccuse visible>C’est transmis.</PatientRegionAccuse>);
    expect(screen.getByRole('status').textContent).toBe('C’est transmis.');
    expect(document.activeElement).toBe(document.body);
  });

  it('un second accusé reprend le focus', () => {
    const { rerender } = render(<PatientRegionAccuse visible>C’est transmis.</PatientRegionAccuse>);
    const region = screen.getByRole('status');
    rerender(<PatientRegionAccuse visible={false}>C’est transmis.</PatientRegionAccuse>);
    expect(region.textContent).toBe('');
    rerender(<PatientRegionAccuse visible>C’est transmis.</PatientRegionAccuse>);
    expect(document.activeElement).toBe(region);
  });
});
