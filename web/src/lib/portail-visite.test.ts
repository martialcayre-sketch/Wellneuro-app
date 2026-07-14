// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { detecterChangementsEtMettreAJour } from './portail-visite';

describe('detecterChangementsEtMettreAJour', () => {
  const token = 'tok-123';

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("ne détecte aucun changement à la toute première visite (pas d'instantané précédent)", () => {
    const changements = detecterChangementsEtMettreAJour(token, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    expect(changements).toEqual([]);
  });

  it('signale un nouveau questionnaire apparu depuis la dernière visite', () => {
    detecterChangementsEtMettreAJour(token, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    const changements = detecterChangementsEtMettreAJour(token, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
      { idAssignation: 'a2', titre: 'Énergie', statutReponses: 'a_completer' },
    ]);

    expect(changements).toEqual([
      { idAssignation: 'a2', texte: 'Un nouveau questionnaire est disponible : « Énergie ».' },
    ]);
  });

  it('signale une demande de correction depuis la dernière visite', () => {
    detecterChangementsEtMettreAJour(token, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'verrouille' },
    ]);

    const changements = detecterChangementsEtMettreAJour(token, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'modification_demandee' },
    ]);

    expect(changements).toEqual([
      { idAssignation: 'a1', texte: 'Une correction a été demandée sur « Sommeil ».' },
    ]);
  });

  it('signale un déverrouillage depuis la dernière visite', () => {
    detecterChangementsEtMettreAJour(token, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'modification_demandee' },
    ]);

    const changements = detecterChangementsEtMettreAJour(token, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'deverrouille' },
    ]);

    expect(changements).toEqual([
      { idAssignation: 'a1', texte: '« Sommeil » a été déverrouillé par votre praticien.' },
    ]);
  });

  it("ne signale rien si le statut n'a pas changé", () => {
    detecterChangementsEtMettreAJour(token, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    const changements = detecterChangementsEtMettreAJour(token, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    expect(changements).toEqual([]);
  });

  it('isole les instantanés par token', () => {
    detecterChangementsEtMettreAJour('tok-a', [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    const changements = detecterChangementsEtMettreAJour('tok-b', [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    expect(changements).toEqual([]);
  });
});
