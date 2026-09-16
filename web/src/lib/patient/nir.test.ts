import { describe, expect, it } from 'vitest';
import { messageNirInvalide, normaliserNir, verifierNir } from './nir';

// LES NUMÉROS DE CE BANC SONT FABRIQUÉS, et leurs clés recalculées à la main.
// Ils ne désignent personne : ce sont des suites de chiffres choisies pour
// éprouver l'algorithme — métropole, Corse-du-Sud, Haute-Corse, et le cas où
// le modulo tombe juste.

describe('verifierNir — la forme', () => {
  it('accepte les quinze caractères attendus', () => {
    expect(verifierNir('184017511600144')).toEqual({ valide: true, nir: '184017511600144' });
  });

  it('refuse ce qui n’a pas la bonne longueur, et le dit', () => {
    for (const trop of ['', '1840175116001', '18401751160014', '1840175116001445']) {
      expect(verifierNir(trop), trop).toEqual({ valide: false, motif: 'forme' });
    }
  });

  it('refuse une lettre ailleurs qu’au rang du département', () => {
    // `2A` et `2B` sont les SEULES lettres admises, et SEULEMENT aux 6ᵉ et 7ᵉ
    // caractères — sexe(1), année(2), mois(2), DÉPARTEMENT(2), commune(3),
    // ordre(3). Ce rang-là m'a déjà pris deux fois : une lettre posée au rang
    // du mois passe l'œil et pas la forme, et c'est exactement ce qu'on veut.
    for (const faux of ['1840A7511600144', '177052C12345637', 'A84017511600144']) {
      expect(verifierNir(faux), faux).toEqual({ valide: false, motif: 'forme' });
    }
  });
});

describe('verifierNir — la clé de contrôle', () => {
  it('accepte les deux départements corses, substitués', () => {
    // C'EST LA SEULE IRRÉGULARITÉ DE L'ALGORITHME : `2A` → 19, `2B` → 18. Sans
    // la substitution, `Number('1772A99001002')` rend `NaN` et le modulo aussi
    // — le banc aurait vu un refus, jamais un calcul faux.
    expect(verifierNir('177052A12345637').valide).toBe(true);
    expect(verifierNir('288032B33045623').valide).toBe(true);
  });

  it('refuse une clé fausse, et distingue ce motif de la forme', () => {
    // LE POINT DE CE BANC. Un numéro BIEN FORMÉ et faux se recopie sans que
    // rien ne bronche, et finit sur un courrier. La forme seule — celle que
    // garde la base — ne l'aurait jamais attrapé.
    const verdict = verifierNir('184017511600145');
    expect(verdict).toEqual({ valide: false, motif: 'cle' });
    expect(messageNirInvalide('cle')).toContain('clé de contrôle');
    expect(messageNirInvalide('forme')).not.toContain('clé de contrôle');
  });

  it('attrape une transposition de deux chiffres voisins', () => {
    // La raison d'être de la clé : la faute la plus fréquente à la recopie.
    const juste = '295129912345664';
    const transpose = '295129921345664'; // « 12 » et « 21 » échangés
    expect(verifierNir(juste).valide).toBe(true);
    expect(verifierNir(transpose)).toEqual({ valide: false, motif: 'cle' });
  });

  it('gère la clé 97 — le cas où le modulo tombe à zéro', () => {
    // `97 − (n mod 97)` vaut 97 quand `n` est multiple de 97 ; la clé est alors
    // « 97 » et non « 00 ». Un code qui aurait pris `n mod 97` pour la clé
    // rendrait `0` et refuserait un numéro valide.
    const corps = '1840175116001';
    const n = Number(corps);
    const multiple = String(n - (n % 97)).padStart(13, '0');
    expect(Number(multiple) % 97).toBe(0);
    expect(verifierNir(`${multiple}97`).valide).toBe(true);
    expect(verifierNir(`${multiple}00`)).toEqual({ valide: false, motif: 'cle' });
  });
});

describe('normaliserNir', () => {
  it('accepte le numéro tel qu’il est IMPRIMÉ, par groupes', () => {
    // Les cartes Vitale l'écrivent espacé. Refuser cette écriture obligerait le
    // praticien à retaper ce qu'il a sous les yeux — donc à ajouter des fautes.
    expect(verifierNir('1 84 01 75 116 001 44').valide).toBe(true);
    expect(normaliserNir('1-84.01 75 116 001 44')).toBe('184017511600144');
  });

  it('remonte les lettres corses en majuscules', () => {
    expect(verifierNir('177052a12345637').valide).toBe(true);
  });
});
