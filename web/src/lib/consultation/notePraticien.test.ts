import { describe, expect, it } from 'vitest';
import { notePraticienAffichable } from './notePraticien';

describe('notePraticienAffichable (D/52)', () => {
  it.each([null, undefined, '', '   '])('rien à afficher pour %j', (notes) => {
    expect(notePraticienAffichable(notes)).toBeNull();
  });

  it('retire l’ancien défaut de la sélection', () => {
    expect(notePraticienAffichable('Envoi groupé — bibliothèque')).toBeNull();
  });

  it.each(['Pack test', 'Pack Pack de base', '  Pack sommeil  '])('retire l’ancien défaut du pack : %s', (notes) => {
    expect(notePraticienAffichable(notes)).toBeNull();
  });

  it('rend une vraie note telle qu’écrite', () => {
    expect(notePraticienAffichable('Packé dans le sac : rien à apporter.')).toBe('Packé dans le sac : rien à apporter.');
    expect(notePraticienAffichable('À remplir à jeun.')).toBe('À remplir à jeun.');
  });
});
