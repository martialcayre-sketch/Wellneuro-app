// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { detecterChangementsEtMettreAJour } from './portail-visite';

describe('detecterChangementsEtMettreAJour', () => {
  const idPatient = 'PAT_TEST';

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("ne détecte aucun changement à la toute première visite (pas d'instantané précédent)", () => {
    const changements = detecterChangementsEtMettreAJour(idPatient, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    expect(changements).toEqual([]);
  });

  it('signale un nouveau questionnaire apparu depuis la dernière visite', () => {
    detecterChangementsEtMettreAJour(idPatient, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    const changements = detecterChangementsEtMettreAJour(idPatient, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
      { idAssignation: 'a2', titre: 'Énergie', statutReponses: 'a_completer' },
    ]);

    expect(changements).toEqual([
      { idAssignation: 'a2', texte: 'Un nouveau questionnaire est disponible : « Énergie ».' },
    ]);
  });

  it('signale une demande de correction depuis la dernière visite', () => {
    detecterChangementsEtMettreAJour(idPatient, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'verrouille' },
    ]);

    const changements = detecterChangementsEtMettreAJour(idPatient, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'modification_demandee' },
    ]);

    expect(changements).toEqual([
      { idAssignation: 'a1', texte: 'Une correction a été demandée sur « Sommeil ».' },
    ]);
  });

  it('signale un déverrouillage depuis la dernière visite', () => {
    detecterChangementsEtMettreAJour(idPatient, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'modification_demandee' },
    ]);

    const changements = detecterChangementsEtMettreAJour(idPatient, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'deverrouille' },
    ]);

    expect(changements).toEqual([
      { idAssignation: 'a1', texte: '« Sommeil » a été déverrouillé par votre praticien.' },
    ]);
  });

  it("ne signale rien si le statut n'a pas changé", () => {
    detecterChangementsEtMettreAJour(idPatient, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    const changements = detecterChangementsEtMettreAJour(idPatient, [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    expect(changements).toEqual([]);
  });

  it('isole les instantanés par patient', () => {
    detecterChangementsEtMettreAJour('PAT_A', [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    const changements = detecterChangementsEtMettreAJour('PAT_B', [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    expect(changements).toEqual([]);
  });

  // Préalable G4 : l'instantané suit la personne, pas le lien. Indexé sur le
  // jeton d'URL, il laissait un secret d'accès dans `localStorage` et
  // repartait de zéro à chaque nouveau lien — au moment précis où « depuis la
  // dernière visite » a le plus de valeur.
  it('nomme l’instantané d’après le patient, jamais d’après un jeton de lien', () => {
    detecterChangementsEtMettreAJour('PAT_TEST', [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    expect(Object.keys(window.localStorage)).toEqual([
      'wellneuro:portail:derniere-visite:PAT_TEST',
    ]);
  });

  it('sans identité, ne compare ni n’écrit', () => {
    const changements = detecterChangementsEtMettreAJour('', [
      { idAssignation: 'a1', titre: 'Sommeil', statutReponses: 'a_completer' },
    ]);

    expect(changements).toEqual([]);
    expect(Object.keys(window.localStorage)).toEqual([]);
  });
});
