import { describe, expect, it } from 'vitest';
import {
  choisirJourZero,
  DATE_NON_COMMUNIQUEE,
  DATEUR_CALENDAIRE,
  dateurRelatif,
  lectureDatesRelatives,
} from './datesExport';

// 2026-03-15 à 10 h, heure de Paris.
const J0 = new Date('2026-03-15T09:00:00Z');

describe('choisirJourZero', () => {
  it('la première consultation, au jour de Paris', () => {
    expect(choisirJourZero([new Date('2026-05-02T08:00:00Z'), J0], [new Date('2026-01-01T08:00:00Z')]))
      .toEqual({ jour: '2026-03-15', repere: 'consultation' });
  });

  it('une consultation créée à 23 h 30 UTC tombe le lendemain à Paris', () => {
    expect(choisirJourZero([new Date('2026-03-14T23:30:00Z')], [])).toEqual({ jour: '2026-03-15', repere: 'consultation' });
  });

  it('sans consultation, le premier événement enregistré', () => {
    expect(choisirJourZero([], [new Date('2026-06-01T08:00:00Z'), new Date('2026-04-10T08:00:00Z')]))
      .toEqual({ jour: '2026-04-10', repere: 'premier-evenement' });
  });

  it('sans aucune date : null', () => {
    expect(choisirJourZero([], [])).toBeNull();
  });
});

describe('dateurRelatif', () => {
  const dateur = dateurRelatif({ jour: '2026-03-15', repere: 'consultation' });

  it('J0, J+n, J-n', () => {
    expect(dateur.jour(J0)).toBe('J0');
    expect(dateur.jour(new Date('2026-04-26T09:00:00Z'))).toBe('J+42');
    expect(dateur.jour(new Date('2026-03-12T09:00:00Z'))).toBe('J-3');
    expect(dateur.jourHeure(new Date('2026-04-26T17:45:00Z'))).toBe('J+42');
  });

  it('compte au jour de Paris, pas au jour UTC : 23 h 30 UTC est déjà le lendemain', () => {
    // 15/03 à 23 h 30 UTC = 16/03 à 00 h 30 à Paris ; le 14/03 à 23 h 30 UTC = le 15 à Paris.
    expect(dateur.jour(new Date('2026-03-15T23:30:00Z'))).toBe('J+1');
    expect(dateur.jour(new Date('2026-03-14T23:30:00Z'))).toBe('J0');
    // Heure d'été : le 29/04 à 22 h 30 UTC = le 30 à 00 h 30 à Paris.
    expect(dateur.jour(new Date('2026-04-29T22:30:00Z'))).toBe('J+46');
  });

  it("compte en jours civils de Paris, à travers le passage à l'heure d'été", () => {
    // 29 mars 2026 : passage à l'heure d'été. 23 h 30 le 30 mars, heure de Paris.
    expect(dateur.jour(new Date('2026-03-30T21:30:00Z'))).toBe('J+15');
  });

  it('une date civile', () => {
    expect(dateur.jourCivil('2026-03-20')).toBe('J+5');
    expect(dateur.jourCivil('2025-03-15')).toBe('J-365');
  });

  it('une période au mois ou à l’année près ne dit jamais un jour', () => {
    expect(dateur.periode('2025-12-01', 'mois', 'date inconnue')).toBe('M-3 (au mois près)');
    expect(dateur.periode('2026-03-01', 'mois', 'date inconnue')).toBe('M0 (au mois près)');
    expect(dateur.periode('2024-01-01', 'annee', 'date inconnue')).toBe("A-2 (à l'année près)");
    expect(dateur.periode('2026-03-10', 'jour', 'date inconnue')).toBe('J-5');
    expect(dateur.periode(null, 'inconnu', 'date inconnue')).toBe('date inconnue');
    expect(dateur.periode(null, null, 'date inconnue')).toBe('');
  });

  it('une échéance stockée : relative si lisible, omise sinon', () => {
    expect(dateur.chaineStockee('2026-04-14')).toBe('J+30');
    expect(dateur.chaineStockee('2026-04-14T00:00:00.000Z')).toBe('J+30');
    expect(dateur.chaineStockee('fin avril')).toBeNull();
    expect(dateur.chaineStockee('2026-04-14 fin')).toBeNull();
    expect(dateur.chaineStockee('2026-04-14Tnimportequoi')).toBeNull();
  });

  it('une échéance stockée comme instant se ramène au jour de Paris (contre-revue Codex, P2-1)', () => {
    // 29/03 à 22 h 30 UTC = 30/03 à 00 h 30 à Paris (heure d'été).
    const zero29 = dateurRelatif({ jour: '2026-03-29', repere: 'consultation' });
    expect(zero29.chaineStockee('2026-03-29T22:30:00Z')).toBe('J+1');
    expect(zero29.chaineStockee('2026-03-29T22:30:00Z')).toBe(zero29.jour(new Date('2026-03-29T22:30:00Z')));
  });

  it('un texte fixe perd ses dates AAAA-MM-JJ (contre-revue Codex, P2-2)', () => {
    expect(dateur.texteFixe("Il a été reconstruit depuis sa source le 2026-07-31 ; cette mention ne vise que les passations antérieures."))
      .toBe("Il a été reconstruit depuis sa source ; cette mention ne vise que les passations antérieures.");
    expect(dateur.texteFixe('Mesure du 2026-07-31.')).toBe('Mesure du date retirée.');
    expect(DATEUR_CALENDAIRE.texteFixe('reconstruit le 2026-07-31')).toBe('reconstruit le 2026-07-31');
  });

  it('les tournures', () => {
    expect(dateur.le(J0)).toBe('à J0');
    expect(dateur.du(new Date('2026-04-26T09:00:00Z'))).toBe('à J+42');
  });

  it('aucun texte rendu ne porte une année ni une date au calendrier', () => {
    const rendus = [
      dateur.jour(J0),
      dateur.jourCivil('2024-02-29'),
      dateur.periode('2019-01-01', 'annee', 'x'),
      dateur.periode('2019-07-01', 'mois', 'x'),
      dateur.chaineStockee('2026-04-14') ?? '',
    ];
    for (const texte of rendus) {
      expect(texte).not.toMatch(/\d{4}|\d{2}\/\d{2}/);
    }
  });

  it('sans J0, aucune date ne se calcule', () => {
    const sansZero = dateurRelatif(null);
    expect(sansZero.jour(J0)).toBe(DATE_NON_COMMUNIQUEE);
    expect(sansZero.periode('2024-01-01', 'annee', 'x')).toBe(DATE_NON_COMMUNIQUEE);
    expect(sansZero.chaineStockee('2026-04-14')).toBeNull();
  });
});

describe('DATEUR_CALENDAIRE', () => {
  it('écrit le calendrier, comme la version complète l’a toujours fait', () => {
    expect(DATEUR_CALENDAIRE.relatif).toBe(false);
    expect(DATEUR_CALENDAIRE.jour(J0)).toBe('15/03/2026');
    expect(DATEUR_CALENDAIRE.jourHeure(J0)).toBe('15/03/2026 à 10:00');
    expect(DATEUR_CALENDAIRE.jourCivil('2026-03-20')).toBe('20/03/2026');
    expect(DATEUR_CALENDAIRE.chaineStockee('2026-04-14')).toBe('14/04/2026');
    expect(DATEUR_CALENDAIRE.periode('2024-05-01', 'mois', 'x')).toBe('mai 2024');
    expect(DATEUR_CALENDAIRE.le(J0)).toBe('le 15/03/2026');
    expect(DATEUR_CALENDAIRE.du(J0)).toBe('du 15/03/2026');
  });
});

describe('lectureDatesRelatives', () => {
  it('dit le repère de J0', () => {
    expect(lectureDatesRelatives({ jour: '2026-03-15', repere: 'consultation' })).toContain('J0 est le jour de la première consultation');
    expect(lectureDatesRelatives({ jour: '2026-03-15', repere: 'premier-evenement' })).toContain("le dossier n'a aucune consultation");
  });
});
