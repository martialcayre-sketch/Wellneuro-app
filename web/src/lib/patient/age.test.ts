import { describe, expect, it } from 'vitest';
import { ageAnnees } from './age';
import { anneeDeNaissance } from './cycleDeVie';

const REF = Date.UTC(2026, 8, 19); // 2026-09-19, instant de référence fixe.

describe('ageAnnees — années révolues, ou rien', () => {
  it('compte en années RÉVOLUES, pas en différence de millésimes', () => {
    // Anniversaire déjà passé dans l'année de référence.
    expect(ageAnnees('1966-01-01', REF)).toBe(60);
    // Anniversaire PAS encore passé : un an de moins, et c'est tout l'objet.
    expect(ageAnnees('1966-12-31', REF)).toBe(59);
    // Le jour même de l'anniversaire compte.
    expect(ageAnnees('1966-09-19', REF)).toBe(60);
    // La veille de l'anniversaire ne compte pas encore.
    expect(ageAnnees('1966-09-20', REF)).toBe(59);
  });

  // LA FRONTIÈRE EST L'ENDROIT QUI DÉCIDE. Les claims d'assiette bornent à 50,
  // 60 et 70 ans ; un âge faux d'un an au jour de l'anniversaire allumerait ou
  // éteindrait la ligne pour de mauvaises raisons.
  it('tient les bornes que les claims citent — 50, 60, 70', () => {
    expect(ageAnnees('1976-09-19', REF)).toBe(50);
    expect(ageAnnees('1976-09-20', REF)).toBe(49);
    expect(ageAnnees('1956-09-19', REF)).toBe(70);
    expect(ageAnnees('1956-09-20', REF)).toBe(69);
  });

  it('REFUSE tout ce qui n’est pas une date calendaire complète', () => {
    for (const valeur of [null, undefined, '', '   ', '1966', '1966-01', '01/01/1966',
      'né en 1966', '1966-1-1', '1966-01-01T00:00:00Z']) {
      expect(ageAnnees(valeur, REF), `« ${String(valeur)} » ne devrait rien rendre`).toBeNull();
    }
  });

  // LE PIÈGE QUE LE FORMAT SEUL NE VOIT PAS. `2026-02-31` passe l'expression
  // régulière ; `Date.UTC` la replie sur le 3 mars sans se plaindre, et l'âge
  // rendu serait celui d'un jour que le patient n'a pas vécu.
  it('REFUSE une date bien formée mais INEXISTANTE', () => {
    expect(ageAnnees('1966-02-31', REF)).toBeNull();
    expect(ageAnnees('1966-13-01', REF)).toBeNull();
    expect(ageAnnees('1966-00-10', REF)).toBeNull();
    expect(ageAnnees('1966-04-31', REF)).toBeNull();
    // Contre-épreuve : le 29 février d'une année bissextile EXISTE et passe.
    expect(ageAnnees('1964-02-29', REF)).toBe(62);
    expect(ageAnnees('1966-02-29', REF)).toBeNull();
  });

  it('REFUSE une naissance postérieure à la référence, plutôt qu’un âge négatif', () => {
    // Une saisie à l'envers ou un import fautif. Rendre `-3` laisserait un
    // comparateur s'allumer dessus ; `null` ferme.
    expect(ageAnnees('2030-01-01', REF)).toBeNull();
  });

  it('REFUSE un âge hors de toute plausibilité — borne TECHNIQUE, pas clinique', () => {
    expect(ageAnnees('1890-01-01', REF)).toBeNull();
    // Contre-épreuve : juste sous la borne, la date passe.
    expect(ageAnnees('1900-01-01', REF)).toBe(126);
  });

  it('ne lit aucune horloge : une référence invalide rend `null`', () => {
    expect(ageAnnees('1966-01-01', Number.NaN)).toBeNull();
    expect(ageAnnees('1966-01-01', Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('ageAnnees face à `anneeDeNaissance` — deux lecteurs, deux questions', () => {
  // CE BANC EXISTE POUR QUE LE DOUBLON NE PASSE PAS POUR UN OUBLI. Les deux
  // fonctions lisent la même colonne ; l'une TOLÈRE (résidu d'effacement),
  // l'autre REFUSE (borne clinique). Les cas ci-dessous sont ceux où elles
  // divergent, et la divergence est le but.
  it('le parseur permissif accepte ce que la borne clinique refuse', () => {
    for (const valeur of ['né en 1966', '1966', '01/01/1966']) {
      expect(anneeDeNaissance(valeur), `${valeur} : l’année reste lisible`).toBe(1966);
      expect(ageAnnees(valeur, REF), `${valeur} : l’âge ne l’est pas`).toBeNull();
    }
  });

  it('sur une date complète, les deux s’accordent sur l’année', () => {
    expect(anneeDeNaissance('1966-01-01')).toBe(1966);
    expect(ageAnnees('1966-01-01', REF)).toBe(60);
  });
});
