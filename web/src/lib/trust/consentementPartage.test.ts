import { describe, expect, it } from 'vitest';
import { statutPartageMedecinTraitant } from './consentementPartage';

describe('statutPartageMedecinTraitant', () => {
  it('null si le patient ne s’est jamais exprimé', () => {
    expect(statutPartageMedecinTraitant([])).toBeNull();
  });

  it('le dernier événement fait foi (accordé puis retiré → retiré)', () => {
    const statut = statutPartageMedecinTraitant([
      { finalite: 'partage_medecin_traitant', statut: 'accorde', enregistreLe: '2026-07-01T10:00:00Z' },
      { finalite: 'partage_medecin_traitant', statut: 'retire', enregistreLe: '2026-07-10T10:00:00Z' },
    ]);
    expect(statut).toBe('retire');
  });

  it('l’ordre d’arrivée des événements ne change rien', () => {
    const statut = statutPartageMedecinTraitant([
      { finalite: 'partage_medecin_traitant', statut: 'retire', enregistreLe: '2026-07-10T10:00:00Z' },
      { finalite: 'partage_medecin_traitant', statut: 'accorde', enregistreLe: '2026-07-01T10:00:00Z' },
    ]);
    expect(statut).toBe('retire');
  });

  it('accepte des dates Date comme des chaînes ISO', () => {
    const statut = statutPartageMedecinTraitant([
      { finalite: 'partage_medecin_traitant', statut: 'accorde', enregistreLe: new Date('2026-07-01T10:00:00Z') },
    ]);
    expect(statut).toBe('accorde');
  });

  it('ignore les finalités étrangères', () => {
    const statut = statutPartageMedecinTraitant([
      { finalite: 'communications_non_essentielles', statut: 'accorde', enregistreLe: '2026-07-01T10:00:00Z' },
    ]);
    expect(statut).toBeNull();
  });
});
