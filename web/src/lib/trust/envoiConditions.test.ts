import { describe, expect, it } from 'vitest';
import { getDocumentCourant } from './contenus/registre';
import { eligibleAnnonceConditions, referenceConditionsCourantes } from './envoiConditions';

// [[D-292]] §3 — qui reçoit l'e-mail des conditions : un dossier en cours,
// ouvert, majeur, suivi, sans accusé de la version en vigueur, pas déjà servi.

const MAINTENANT = Date.UTC(2026, 9, 16);
const VERSION = getDocumentCourant('conditions_utilisation').version;

const OUVERT = {
  actif: true,
  accessTokenRevoked: false,
  suiviClotureLe: null,
  dateNaissance: '1980-04-12',
};
const SUIVI = [{ documentKey: 'cadre_accompagnement', documentVersion: 'v1', type: 'pris_connaissance' }];

describe('eligibleAnnonceConditions', () => {
  it('un patient suivi, majeur, ouvert, sans accusé des conditions : éligible', () => {
    expect(eligibleAnnonceConditions(OUVERT, SUIVI, false, MAINTENANT)).toBe(true);
  });

  it.each([
    ['inactif', { ...OUVERT, actif: false }],
    ['suivi clos', { ...OUVERT, suiviClotureLe: new Date(MAINTENANT) }],
    ['portail révoqué', { ...OUVERT, accessTokenRevoked: true }],
    ['mineur', { ...OUVERT, dateNaissance: '2012-01-01' }],
    ['sans date de naissance', { ...OUVERT, dateNaissance: null }],
  ])('%s : exclu', (_cas, dossier) => {
    expect(eligibleAnnonceConditions(dossier, SUIVI, false, MAINTENANT)).toBe(false);
  });

  it('un nouveau patient (aucun texte accusé) voit les conditions à l’accueil : pas d’e-mail', () => {
    expect(eligibleAnnonceConditions(OUVERT, [], false, MAINTENANT)).toBe(false);
    // Une simple trace de présentation ne fait pas un patient suivi.
    const presente = [{ documentKey: 'cadre_accompagnement', documentVersion: 'v1', type: 'presente' }];
    expect(eligibleAnnonceConditions(OUVERT, presente, false, MAINTENANT)).toBe(false);
  });

  it('l’accusé de la version en vigueur retire le dossier ; celui d’une autre version, non', () => {
    const accuse = (documentVersion: string) => [
      ...SUIVI,
      { documentKey: 'conditions_utilisation', documentVersion, type: 'pris_connaissance' },
    ];
    expect(eligibleAnnonceConditions(OUVERT, accuse(VERSION), false, MAINTENANT)).toBe(false);
    expect(eligibleAnnonceConditions(OUVERT, accuse('v0'), false, MAINTENANT)).toBe(true);
  });

  it('un e-mail déjà parti pour cette version retire le dossier', () => {
    expect(eligibleAnnonceConditions(OUVERT, SUIVI, true, MAINTENANT)).toBe(false);
  });
});

describe('referenceConditionsCourantes', () => {
  it('nomme la clé et la version en vigueur', () => {
    expect(referenceConditionsCourantes()).toBe(`conditions_utilisation@${VERSION}`);
  });
});
