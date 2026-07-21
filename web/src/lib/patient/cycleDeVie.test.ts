import { describe, expect, it } from 'vitest';
import {
  MESSAGE_DOSSIER_CLOS,
  accepteNouvelEnvoi,
  anneeDeNaissance,
  initialesNom,
  phaseDossier,
  residuEffacement,
} from './cycleDeVie';

const CLOTURE = new Date('2026-07-21T10:00:00.000Z');

describe('phases du dossier', () => {
  it('un dossier ouvert est « en suivi »', () => {
    expect(phaseDossier({ actif: true, suiviClotureLe: null })).toBe('en_suivi');
  });

  it('un dossier clôturé est « clos », et le reste même désactivé', () => {
    expect(phaseDossier({ actif: true, suiviClotureLe: CLOTURE })).toBe('suivi_cloture');
    // La clôture prime : c'est elle qui décrit ce que vit le patient — il
    // conserve sa lecture. La désactivation est une autre affaire.
    expect(phaseDossier({ actif: false, suiviClotureLe: CLOTURE })).toBe('suivi_cloture');
  });

  it('la désactivation seule reste distincte de la clôture', () => {
    expect(phaseDossier({ actif: false, suiviClotureLe: null })).toBe('desactive');
  });
});

describe('ce qu’un dossier clos n’accepte plus', () => {
  // D4/D5 : le refus est porté par les routes. Ce prédicat en est le point
  // unique de décision ; s'il se trompe, toutes les routes se trompent.
  it('seul un dossier en suivi accepte un envoi', () => {
    expect(accepteNouvelEnvoi({ actif: true, suiviClotureLe: null })).toBe(true);
    expect(accepteNouvelEnvoi({ actif: true, suiviClotureLe: CLOTURE })).toBe(false);
    expect(accepteNouvelEnvoi({ actif: false, suiviClotureLe: null })).toBe(false);
  });

  it('le message de refus dit ce qui s’arrête et comment revenir', () => {
    expect(MESSAGE_DOSSIER_CLOS).toMatch(/clôturé/i);
    expect(MESSAGE_DOSSIER_CLOS).toMatch(/Rouvrez/i);
  });

  // Décision du 2026-07-21. Le message a d'abord dit « aucun document envoyé »,
  // au singulier absolu, alors que le lien d'accès au portail reste envoyable —
  // sans quoi la lecture des archives, que la clôture PROMET, deviendrait
  // inatteignable pour un patient ayant perdu son e-mail. Le refus doit donc se
  // borner aux documents DE SUIVI.
  it('le message borne son refus aux documents de suivi', () => {
    expect(MESSAGE_DOSSIER_CLOS).toMatch(/document de suivi/i);
    expect(MESSAGE_DOSSIER_CLOS).not.toMatch(/aucun envoi(?! de document de suivi)/i);
    expect(MESSAGE_DOSSIER_CLOS).not.toMatch(/aucun document envoyé/i);
  });

  // Et il ne promet RIEN sur l'accès : partagé par quatre routes, il s'affiche
  // aussi sur un dossier clos PUIS désactivé, où le portail refuse déjà tout.
  // Une promesse de lecture y serait fausse. Voir le commentaire de la
  // constante — la nuance est portée par le dialogue, qui connaît `actif`.
  it('le message ne promet aucun accès, faute de connaître l’état du dossier', () => {
    expect(MESSAGE_DOSSIER_CLOS).not.toMatch(/archives/i);
    expect(MESSAGE_DOSSIER_CLOS).not.toMatch(/accès/i);
  });
});

describe('année de naissance', () => {
  it('se lit quel que soit le format de la chaîne', () => {
    expect(anneeDeNaissance('1975-03-12')).toBe(1975);
    expect(anneeDeNaissance('12/03/1975')).toBe(1975);
    expect(anneeDeNaissance('12 mars 1975')).toBe(1975);
  });

  // Mieux vaut aucune année qu'une année devinée : le résidu doit être exact
  // ou vide, jamais approximatif.
  it('rend null plutôt qu’une valeur devinée', () => {
    expect(anneeDeNaissance(null)).toBeNull();
    expect(anneeDeNaissance('')).toBeNull();
    expect(anneeDeNaissance('date inconnue')).toBeNull();
    expect(anneeDeNaissance('75')).toBeNull();
  });
});

describe('initiales du nom', () => {
  it('trois lettres, en capitales', () => {
    expect(initialesNom('Dogné')).toBe('DOG');
    expect(initialesNom('  martin  ')).toBe('MAR');
  });

  it('un nom plus court n’est pas complété', () => {
    expect(initialesNom('Li')).toBe('LI');
  });
});

describe('résidu d’effacement', () => {
  const PATIENT = { nom: 'Dogné', prenom: 'Michel', dateNaissance: '1975-03-12' };

  it('ne retient que l’année et trois lettres', () => {
    expect(residuEffacement(PATIENT)).toEqual({ anneeNaissance: 1975, initialesNom: 'DOG' });
  });

  // L'invariant du lot. Si ce test tombe, le mot « effacement » devient faux —
  // et l'application le promet au patient.
  it('ne contient ni prénom, ni nom complet, ni adresse', () => {
    const serialise = JSON.stringify(residuEffacement(PATIENT));
    expect(serialise).not.toContain('Michel');
    expect(serialise).not.toContain('Dogné');
    expect(serialise).not.toContain('@');
    expect(Object.keys(residuEffacement(PATIENT)).sort()).toEqual(['anneeNaissance', 'initialesNom']);
  });

  it('une date illisible n’empêche pas l’effacement', () => {
    expect(residuEffacement({ nom: 'Martin', dateNaissance: null })).toEqual({
      anneeNaissance: null,
      initialesNom: 'MAR',
    });
  });
});
