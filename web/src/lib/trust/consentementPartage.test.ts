import { describe, expect, it } from 'vitest';
import {
  RAISON_PARTAGE_JAMAIS_EXPRIME,
  RAISON_PARTAGE_REFUSE,
  RAISON_PARTAGE_RETIRE,
  refusPartage,
  statutPartageMedecinTraitant,
  verdictPartageMedecin,
} from './consentementPartage';

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

describe('la garde de partage — D-219 §3 amendé (2026-09-17)', () => {
  const evenement = (statut: string) => [
    { finalite: 'partage_medecin_traitant', statut, enregistreLe: '2026-08-01T10:00:00.000Z' },
  ];

  it('★ QUATRE états, QUATRE verdicts — et le silence ferme', () => {
    // UN SEUL CAS NE PROUVERAIT RIEN. Le renversement porte sur quatre états,
    // et c'est le quatrième — l'absence de choix — qui est la moitié de
    // l'arbitrage : « sans un choix explicite de votre part » se lit à la
    // lettre, donc le silence n'est pas un accord.
    expect(verdictPartageMedecin(evenement('accorde'))).toEqual({ bloquant: false, motif: 'accorde' });
    expect(verdictPartageMedecin(evenement('refuse'))).toEqual({ bloquant: true, motif: 'refuse' });
    expect(verdictPartageMedecin(evenement('retire'))).toEqual({ bloquant: true, motif: 'retire' });
    expect(verdictPartageMedecin([])).toEqual({ bloquant: true, motif: 'jamais_exprime' });
  });

  it('★ le message de refus porte le CHEMIN, jamais le seul refus', () => {
    // La contrepartie de l'arbitrage : un blocage sans issue est un mur. Les
    // deux messages disent où le patient exprime son choix.
    const silence = refusPartage({ bloquant: true, motif: 'jamais_exprime' });
    expect(silence.raison).toBe(RAISON_PARTAGE_JAMAIS_EXPRIME);
    expect(silence.message).toContain('Mes choix et autorisations');

    const refus = refusPartage({ bloquant: true, motif: 'refuse' });
    expect(refus.raison).toBe(RAISON_PARTAGE_REFUSE);
    expect(refus.message).toContain('Mes choix et autorisations');
  });

  it('★ le RETRAIT a son propre motif — le confondre avec un refus décrit un dossier qui n’existe pas', () => {
    // CONSTAT DE LA REVUE COPILOT, RETENU. `verdictPartageMedecin` gardait les
    // deux motifs distincts et ce traducteur les aplatissait aussitôt : un
    // praticien dont le patient avait ACCORDÉ puis RETIRÉ lisait « le patient a
    // refusé », avec peut-être une lettre consignée d'il y a trois mois sous les
    // yeux.
    const retrait = refusPartage({ bloquant: true, motif: 'retire' });
    expect(retrait.raison).toBe(RAISON_PARTAGE_RETIRE);
    expect(retrait.raison).not.toBe(RAISON_PARTAGE_REFUSE);
    expect(retrait.message).toContain('a retiré son consentement');
    expect(retrait.message).not.toContain('a refusé');
    expect(retrait.message).toContain('Mes choix et autorisations');
  });

  it('le dernier événement fait foi — un retrait après un accord ferme', () => {
    expect(
      verdictPartageMedecin([
        { finalite: 'partage_medecin_traitant', statut: 'accorde', enregistreLe: '2026-08-01T10:00:00.000Z' },
        { finalite: 'partage_medecin_traitant', statut: 'retire', enregistreLe: '2026-09-01T10:00:00.000Z' },
      ]).bloquant,
    ).toBe(true);
  });
});
