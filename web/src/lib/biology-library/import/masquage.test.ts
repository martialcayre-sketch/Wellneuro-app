import { describe, expect, it } from 'vitest';
import {
  COTE_RENDU_PX,
  declarationValide,
  echelleRendu,
  PAGES_MAX,
  pointDansPage,
  TAILLE_MAX_PAGE_OCTETS,
  TOTAL_MAX_OCTETS,
  zoneEntre,
} from './masquage';

const PAGE = { largeur: 1000, hauteur: 1400 };

describe('masquage — bornes (D-284 §5)', () => {
  it('sont celles de la migration `bio_ingest_masquage_identite_v1`', () => {
    expect(PAGES_MAX).toBe(20);
    expect(TAILLE_MAX_PAGE_OCTETS).toBe(3_932_160);
    expect(TOTAL_MAX_OCTETS).toBe(20_971_520);
    // 20 Mio en base64 restent sous les 32 Mo d'une requête du fournisseur.
    expect((TOTAL_MAX_OCTETS * 4) / 3).toBeLessThan(32_000_000);
  });
});

describe('zoneEntre', () => {
  it('se trace dans n’importe quel sens', () => {
    expect(zoneEntre({ x: 300, y: 200 }, { x: 100, y: 50 }, PAGE)).toEqual({ x: 100, y: 50, largeur: 200, hauteur: 150 });
  });

  it('est bornée à la page', () => {
    expect(zoneEntre({ x: -50, y: -10 }, { x: 1200, y: 30 }, PAGE)).toEqual({ x: 0, y: 0, largeur: 1000, hauteur: 30 });
  });

  it('un clic n’est pas une zone', () => {
    expect(zoneEntre({ x: 10, y: 10 }, { x: 12, y: 40 }, PAGE)).toBeNull();
    expect(zoneEntre({ x: 10, y: 10 }, { x: 10, y: 10 }, PAGE)).toBeNull();
  });
});

describe('pointDansPage', () => {
  it('ramène l’écran aux pixels de la page affichée réduite', () => {
    const cadre = { left: 20, top: 100, width: 500, height: 700 };
    expect(pointDansPage({ x: 270, y: 450 }, cadre, PAGE)).toEqual({ x: 500, y: 700 });
  });
});

describe('echelleRendu', () => {
  it('une page de PDF s’agrandit jusqu’au grand côté du fournisseur', () => {
    // A4 en points : 595 × 842.
    expect(Math.round(842 * echelleRendu(595, 842, true))).toBe(COTE_RENDU_PX);
  });

  it('une photo se réduit, jamais ne s’agrandit', () => {
    expect(Math.round(4032 * echelleRendu(3024, 4032, false))).toBe(COTE_RENDU_PX);
    expect(echelleRendu(800, 600, false)).toBe(1);
  });
});

describe('declarationValide — des zones OU « aucune identité », jamais les deux', () => {
  it.each([
    [3, false, true],
    [0, true, true],
    [0, false, false],
    [2, true, false],
    [-1, false, false],
    [1001, false, false],
    [1.5, false, false],
  ])('%s zone(s), case %s ⇒ %s', (zones, aucune, attendu) => {
    expect(declarationValide(zones, aucune)).toBe(attendu);
  });
});
