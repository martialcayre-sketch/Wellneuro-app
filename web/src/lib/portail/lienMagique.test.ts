import { beforeEach, describe, expect, it } from 'vitest';
import {
  DUREE_VALIDITE_MS,
  MESSAGE_LIEN_INDISPONIBLE,
  PALIER_REPONSE_MS,
  PLAFOND_DEMANDES_PAR_HEURE,
  PLAFOND_TENTATIVES_PAR_IP,
  PLANCHER_REPONSE_MS,
  RETENTION_TENTATIVES_MS,
  creerJeton,
  debutFenetreDemandes,
  debutRetentionTentatives,
  delaiAvantReponse,
  empreinteJeton,
  empreinteOrigine,
  etatLien,
  expirationDepuis,
  origineReseau,
  originePraticien,
  plafondAtteint,
  plafondIpAtteint,
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

describe('cadence par origine réseau', () => {
  it('le 21ᵉ essai de l’heure est refusé, le 20ᵉ passe', () => {
    expect(PLAFOND_TENTATIVES_PAR_IP).toBe(20);
    expect(plafondIpAtteint(PLAFOND_TENTATIVES_PAR_IP)).toBe(false);
    expect(plafondIpAtteint(PLAFOND_TENTATIVES_PAR_IP + 1)).toBe(true);
  });

  // Le plafond par patient ne borne pas l'énumération : mille adresses
  // inconnues n'atteignent le plafond d'aucun patient. Les deux plafonds ne
  // comptent donc pas la même chose, et ne peuvent pas se remplacer.
  it('il est plus haut que celui d’un patient — une sortie réseau est partagée', () => {
    expect(PLAFOND_TENTATIVES_PAR_IP).toBeGreaterThan(PLAFOND_DEMANDES_PAR_HEURE);
  });

  it('le premier élément de x-forwarded-for est le client, pas les relais', () => {
    const entetes = new Headers({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' });
    expect(origineReseau(entetes)).toBe('203.0.113.7');
  });

  it('à défaut, x-real-ip ; sans en-tête, un seau unique — jamais une absence de plafond', () => {
    expect(origineReseau(new Headers({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9');
    expect(origineReseau(new Headers())).toBe('origine-inconnue');
    expect(origineReseau(new Headers({ 'x-forwarded-for': '  ' }))).toBe('origine-inconnue');
  });

  it('l’adresse n’est pas stockée : ce qu’on en garde ne permet pas de la retrouver', () => {
    const empreinte = empreinteOrigine('203.0.113.7');
    expect(empreinte).not.toContain('203.0.113.7');
    expect(empreinte).toBe(empreinteOrigine('203.0.113.7'));
    expect(empreinte).not.toBe(empreinteOrigine('203.0.113.8'));
  });

  // Domaines distincts : une empreinte calculée pour un jeton ne doit pas valoir
  // pour une origine réseau, même clé et même algorithme.
  it('l’empreinte d’origine ne vaut pas dans le domaine des jetons', () => {
    expect(empreinteOrigine('valeur-commune')).not.toBe(empreinteJeton('valeur-commune'));
  });

  it('les tentatives se purgent au-delà de 24 h, bien après la fenêtre de comptage', () => {
    expect(RETENTION_TENTATIVES_MS).toBe(24 * 60 * 60 * 1000);
    expect(debutRetentionTentatives(MAINTENANT).toISOString()).toBe('2026-07-19T12:00:00.000Z');
    expect(debutRetentionTentatives(MAINTENANT).getTime()).toBeLessThan(
      debutFenetreDemandes(MAINTENANT).getTime(),
    );
  });
});

describe('plancher de réponse', () => {
  it('un traitement instantané attend quand même le plancher', () => {
    expect(delaiAvantReponse(0)).toBe(PLANCHER_REPONSE_MS);
    expect(delaiAvantReponse(200)).toBe(PLANCHER_REPONSE_MS - 200);
  });

  // C'est l'écart que la route doit effacer : une adresse inconnue ne coûte
  // presque rien, une adresse connue coûte une écriture et une poignée SMTP.
  it('inconnue et connue sortent à la même seconde', () => {
    const inconnue = 12 + delaiAvantReponse(12);
    const connue = 900 + delaiAvantReponse(900);
    expect(inconnue).toBe(connue);
    expect(inconnue).toBe(PLANCHER_REPONSE_MS);
  });

  it('au-delà du plancher, le temps observable ne prend que des valeurs de palier', () => {
    for (const ecoule of [1501, 1700, 1999, 2000, 2001, 4321]) {
      const total = ecoule + delaiAvantReponse(ecoule);
      expect(total % PALIER_REPONSE_MS).toBe(0);
      expect(total).toBeGreaterThanOrEqual(ecoule);
      expect(total - ecoule).toBeLessThan(PALIER_REPONSE_MS);
    }
  });

  it('n’attend jamais un temps négatif', () => {
    for (const ecoule of [0, 1500, 2000, 10_000]) {
      expect(delaiAvantReponse(ecoule)).toBeGreaterThanOrEqual(0);
    }
  });
});
