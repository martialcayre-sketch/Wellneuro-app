// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { FINALITES } from './MesChoix';

// LA SEULE SURFACE OÙ LE PATIENT LIT CE QUE SON CHOIX ENGAGE.
//
// Ce banc verrouille la formulation SERVIE, et l'absence de celle qui a été
// corrigée ([[D-220]] §3). Il existe pour une raison précise, dite par la revue
// du 2026-09-17 : la formulation des finalités n'est couverte par AUCUNE
// version — l'événement de choix n'enregistre que celle du document
// `droits_patient`. Deux consentements donnés sur deux formulations
// différentes sont donc indiscernables au registre, et aucune ne se prouve.
//
// Tant que ce trou n'est pas fermé (entrée en file d'attente), ce banc est la
// seule chose qui empêche la formulation de dériver en silence.

const PARTAGE = FINALITES.find(f => f.finalite === 'partage_medecin_traitant');

describe('« Mes choix » — la formulation sur laquelle le patient consent', () => {
  it('la finalité du partage médecin existe, et elle est nommée', () => {
    expect(PARTAGE).toBeTruthy();
    expect(PARTAGE!.libelle).toBe('Partage avec le médecin traitant');
  });

  it('ne promet PLUS une fonctionnalité à venir — elle est en service depuis le 2026-07-22', () => {
    // Le texte annonçait « le partage effectif de documents arrivera dans une
    // prochaine version ». Un consentement recueilli sur une description fausse
    // est un consentement mal éclairé.
    const detail = PARTAGE!.finaliteDetail;
    expect(detail).not.toMatch(/prochaine version/i);
    expect(detail).not.toMatch(/arrivera/i);
  });

  it('dit que l’APPLICATION n’envoie rien, et par quel chemin la transmission se fait', () => {
    // Ce qui est vrai, et qui remplace une garde que personne n'a décidé de
    // poser : le document part par les canaux du praticien ([[D-219]] §3).
    const detail = PARTAGE!.finaliteDetail;
    expect(detail).toMatch(/moyens habituels de votre praticien/i);
    expect(detail).toMatch(/n’envoie rien/i);
  });

  it('les quatre champs de la carte sont servis, aucun vide', () => {
    for (const finalite of FINALITES) {
      expect(finalite.finaliteDetail.trim().length).toBeGreaterThan(0);
      expect(finalite.donnees.trim().length).toBeGreaterThan(0);
      expect(finalite.destinataire.trim().length).toBeGreaterThan(0);
      expect(finalite.effetRefus.trim().length).toBeGreaterThan(0);
    }
  });
});
