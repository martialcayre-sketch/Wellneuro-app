import { beforeEach, describe, expect, it } from 'vitest';
import {
  DUREE_VALIDITE_MS,
  MESSAGE_LIEN_INDISPONIBLE,
  PLAFOND_DEMANDES_PAR_HEURE,
  creerJeton,
  debutFenetreDemandes,
  empreinteJeton,
  etatLien,
  expirationDepuis,
  originePraticien,
  plafondAtteint,
} from './lienMagique';

const MAINTENANT = new Date('2026-07-20T12:00:00.000Z');

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
});

describe('durée de validité', () => {
  it('vaut 24 h — l’arbitrage rendu, pas une constante décorative', () => {
    expect(DUREE_VALIDITE_MS).toBe(24 * 60 * 60 * 1000);
    expect(expirationDepuis(MAINTENANT).toISOString()).toBe('2026-07-21T12:00:00.000Z');
  });
});

describe('etatLien', () => {
  it('un lien neuf, dans sa fenêtre, est valide', () => {
    expect(etatLien({ expireLe: expirationDepuis(MAINTENANT), consommeLe: null }, MAINTENANT))
      .toBe('valide');
  });

  // Le cœur du gate : le second passage ne doit pas ouvrir l'espace.
  it('un lien déjà consommé n’est plus valide', () => {
    const etat = etatLien(
      { expireLe: expirationDepuis(MAINTENANT), consommeLe: new Date('2026-07-20T11:00:00.000Z') },
      MAINTENANT,
    );
    expect(etat).toBe('consomme');
  });

  it('un lien de plus de 24 h n’est plus valide, même jamais utilisé', () => {
    const cree = new Date('2026-07-19T11:59:00.000Z');
    expect(etatLien({ expireLe: expirationDepuis(cree), consommeLe: null }, MAINTENANT))
      .toBe('expire');
  });

  // Une seconde avant, il ouvre encore : la borne est vérifiée des deux côtés,
  // sinon un décalage d'un signe passerait inaperçu.
  it('la borne d’expiration est stricte, et testée de part et d’autre', () => {
    const expireLe = MAINTENANT;
    expect(etatLien({ expireLe, consommeLe: null }, MAINTENANT)).toBe('expire');
    const uneSecondeAvant = new Date(MAINTENANT.getTime() - 1000);
    expect(etatLien({ expireLe, consommeLe: null }, uneSecondeAvant)).toBe('valide');
  });

  it('consommé puis expiré reste « consommé » — l’information juste pour la trace', () => {
    const etat = etatLien(
      {
        expireLe: new Date('2026-07-19T12:00:00.000Z'),
        consommeLe: new Date('2026-07-19T11:00:00.000Z'),
      },
      MAINTENANT,
    );
    expect(etat).toBe('consomme');
  });
});

describe('jeton et empreinte', () => {
  it('le jeton porte au moins 32 octets d’aléa, et deux tirages diffèrent', () => {
    const a = creerJeton();
    const b = creerJeton();
    expect(a).not.toBe(b);
    // base64url de 32 octets : 43 caractères, sans remplissage.
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(a, 'base64url')).toHaveLength(32);
  });

  it('l’empreinte est stable pour un même jeton, et distincte d’un autre', () => {
    const jeton = creerJeton();
    expect(empreinteJeton(jeton)).toBe(empreinteJeton(jeton));
    expect(empreinteJeton(jeton)).not.toBe(empreinteJeton(creerJeton()));
  });

  // C'est l'invariant du stockage : ce qui part en base ne permet pas de
  // reconstituer le lien reçu par le patient.
  it('l’empreinte ne contient pas le jeton', () => {
    const jeton = creerJeton();
    expect(empreinteJeton(jeton)).not.toContain(jeton);
  });

  // Sans préfixe de domaine, une empreinte de session vaudrait ici — et
  // réciproquement. Le préfixe cloisonne les deux usages du même secret.
  it('l’empreinte est cloisonnée : elle diffère d’un HMAC nu du même jeton', () => {
    const jeton = 'jeton-de-test';
    const { createHmac } = require('crypto') as typeof import('crypto');
    const hmacNu = createHmac('sha256', process.env.NEXTAUTH_SECRET as string)
      .update(jeton)
      .digest('base64url');
    expect(empreinteJeton(jeton)).not.toBe(hmacNu);
  });

  it('sans NEXTAUTH_SECRET, on échoue au lieu de hacher avec du vide', () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => empreinteJeton('jeton')).toThrow(/NEXTAUTH_SECRET/);
  });
});

describe('cadence de redemande', () => {
  it('la fenêtre remonte d’une heure', () => {
    expect(debutFenetreDemandes(MAINTENANT).toISOString()).toBe('2026-07-20T11:00:00.000Z');
  });

  it('le plafond se ferme à la 4ᵉ demande de l’heure', () => {
    expect(plafondAtteint(PLAFOND_DEMANDES_PAR_HEURE - 1)).toBe(false);
    expect(plafondAtteint(PLAFOND_DEMANDES_PAR_HEURE)).toBe(true);
  });
});

describe('message unique', () => {
  // Le gate exige que rien ne distingue les trois refus. Un test le fige, pour
  // qu'un « message plus utile » ajouté plus tard casse ici plutôt qu'en
  // production.
  it('une seule phrase couvre consommé, expiré et inconnu', () => {
    expect(MESSAGE_LIEN_INDISPONIBLE).toMatch(/n’est plus valable/);
    expect(MESSAGE_LIEN_INDISPONIBLE).not.toMatch(/expir|consomm|utilisé|inconnu|introuvable/i);
  });
});

describe('origine', () => {
  it('un lien émis par le praticien porte son adresse, en minuscules', () => {
    expect(originePraticien('Martial@Wellneuro.fr')).toBe('praticien:martial@wellneuro.fr');
  });
});
