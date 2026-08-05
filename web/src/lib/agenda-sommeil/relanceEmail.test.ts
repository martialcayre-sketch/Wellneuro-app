import { describe, expect, it } from 'vitest';
import {
  OBJET_TRACE_RELANCE,
  SUJET_RELANCE,
  construireCorpsRelance,
} from './relanceEmail';
import { isRelanceAgendaEnabled } from './featureFlag';

const LIEN = 'https://app.wellneuro.fr/portail/connexion';

describe('gabarit de relance — aucune donnée de santé', () => {
  const corps = construireCorpsRelance('Michel', LIEN);
  const tout = `${SUJET_RELANCE}\n${corps}`;

  // Le corps est unique pour les trois états relançables : il ne doit rien
  // révéler de l'instrument ni de l'avancement du recueil.
  it.each([
    'sommeil',
    'nuit',
    'agenda',
    'insomnie',
    'coucher',
    'éveil',
    'réveil',
    'Q_SOM',
    '21',
  ])('ne contient jamais « %s »', (interdit) => {
    expect(tout.toLowerCase()).not.toContain(interdit.toLowerCase());
  });

  it('ne contient aucun chiffre : ni compte de nuits, ni décompte de jours', () => {
    expect(corps.replace(LIEN, '')).not.toMatch(/\d/);
  });

  it('ne culpabilise pas et ne promet aucun rattrapage', () => {
    for (const interdit of ['oubli', 'manqué', 'retard', 'depuis', 'rattraper vos', 'perdu']) {
      expect(corps.toLowerCase()).not.toContain(interdit);
    }
    // La seule occurrence de « rattraper » est la phrase qui dit qu'il n'y a
    // rien à rattraper — vrai, puisque la saisie est bornée à J et J-1.
    expect(corps).toContain("Il n'y a rien à rattraper");
  });

  it('attribue le geste à un humain, pas au système', () => {
    expect(corps).toContain('Votre praticien vous signale');
  });

  it('respecte les conventions du dépôt : sujet, salutation, signature, lien', () => {
    expect(SUJET_RELANCE).toMatch(/ — Wellneuro$/);
    expect(corps.startsWith('Bonjour Michel,')).toBe(true);
    expect(corps.trimEnd().endsWith("L'équipe Wellneuro")).toBe(true);
    expect(corps).toContain(LIEN);
  });

  it('tolère un prénom vide sans produire « Bonjour , »', () => {
    expect(construireCorpsRelance('  ', LIEN).startsWith('Bonjour,')).toBe(true);
  });

  it('l’objet du registre reste praticien : il nomme l’instrument, l’e-mail non', () => {
    expect(OBJET_TRACE_RELANCE).toBe('Relance — agenda du sommeil');
    expect(tout).not.toContain(OBJET_TRACE_RELANCE);
  });
});

describe('drapeau WN_AGENDA_RELANCE — fail-closed', () => {
  it('n’ouvre que sur la chaîne exacte « true »', () => {
    expect(isRelanceAgendaEnabled('true')).toBe(true);
    for (const valeur of [undefined, '', '1', 'TRUE', 'True', 'yes', 'false']) {
      expect(isRelanceAgendaEnabled(valeur)).toBe(false);
    }
  });
});
