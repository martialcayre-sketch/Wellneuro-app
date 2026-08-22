import { describe, expect, it } from 'vitest';

import {
  LONGUEUR_MAX_ENONCE,
  LONGUEUR_MAX_MOTIF,
  LONGUEUR_MAX_PRIORITE,
  LONGUEUR_MAX_REFORMULATION,
  SENS_RATIFICATION,
  TOLERANCE_FUSEAU_MS,
  chaineDObjectif,
  etatRatification,
  objectifsCourants,
  preparerObjectif,
  preparerRatification,
  type EntreeObjectif,
} from './objectifNegocie';

const BASE: EntreeObjectif = {
  idPatient: 'PAT_TEST',
  praticienEmail: 'praticien@wellneuro.fr',
  enoncePatient: 'Je voudrais dormir sans me réveiller à trois heures.',
  reformulationPraticien: null,
  priorite: null,
  nonTraiteMotif: null,
  nonTraiteDepuisLe: null,
  negocieLe: null,
};

const entree = (partiel: Partial<EntreeObjectif> = {}): EntreeObjectif => ({ ...BASE, ...partiel });

function refus(partiel: Partial<EntreeObjectif>): string {
  const resultat = preparerObjectif(entree(partiel));
  expect(resultat.ok).toBe(false);
  return resultat.ok ? '' : resultat.raison;
}

describe('preparerObjectif — ce qui part en base', () => {
  it('n’émet JAMAIS de date d’écriture : `creeLe` est posé par la base', () => {
    const resultat = preparerObjectif(entree({ negocieLe: '2026-08-20' }));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    // L'invariant du lot : une ligne d'objectif est inantidatable parce que
    // l'application ne transmet rien qui ressemble à une date d'écriture.
    expect(resultat.donnees).not.toHaveProperty('creeLe');
    expect(resultat.donnees).not.toHaveProperty('cree_le');
    expect(resultat.donnees.negocieLe?.toISOString()).toBe('2026-08-20T00:00:00.000Z');
  });

  it('rend `null` — jamais une chaîne vide — pour les champs facultatifs absents', () => {
    const resultat = preparerObjectif(entree({ reformulationPraticien: '   ', priorite: '' }));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.donnees.reformulationPraticien).toBeNull();
    expect(resultat.donnees.priorite).toBeNull();
    expect(resultat.donnees.nonTraiteMotif).toBeNull();
    expect(resultat.donnees.nonTraiteDepuisLe).toBeNull();
    expect(resultat.donnees.supersedesObjectifId).toBeNull();
  });

  it('conserve la priorité telle qu’elle est écrite — libellé libre, jamais normalisé', () => {
    const resultat = preparerObjectif(entree({ priorite: '  À traiter en premier  ' }));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.donnees.priorite).toBe('À traiter en premier');
  });
});

describe('preparerObjectif — bornes, par refus et jamais par troncature', () => {
  it('refuse un énoncé absent', () => {
    expect(refus({ enoncePatient: '   ' })).toBe('enonce_absent');
    expect(refus({ enoncePatient: null })).toBe('enonce_absent');
  });

  it('refuse chaque champ au-delà de sa borne, sans rien couper', () => {
    expect(refus({ enoncePatient: 'a'.repeat(LONGUEUR_MAX_ENONCE + 1) })).toBe('enonce_trop_long');
    expect(refus({ reformulationPraticien: 'a'.repeat(LONGUEUR_MAX_REFORMULATION + 1) })).toBe(
      'reformulation_trop_longue',
    );
    expect(refus({ priorite: 'a'.repeat(LONGUEUR_MAX_PRIORITE + 1) })).toBe('priorite_trop_longue');
    expect(
      refus({ nonTraiteMotif: 'a'.repeat(LONGUEUR_MAX_MOTIF + 1), nonTraiteDepuisLe: '2026-08-01' }),
    ).toBe('motif_trop_long');
  });

  it('accepte exactement la borne', () => {
    const resultat = preparerObjectif(entree({ enoncePatient: 'a'.repeat(LONGUEUR_MAX_ENONCE) }));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    // Rien n'a été coupé : le texte rendu fait la longueur du texte reçu.
    expect(resultat.donnees.enoncePatient).toHaveLength(LONGUEUR_MAX_ENONCE);
  });
});

describe('preparerObjectif — les deux dates d’événement', () => {
  it('refuse une date illisible', () => {
    expect(refus({ negocieLe: 'hier' })).toBe('date_invalide');
    expect(refus({ nonTraiteMotif: 'Autre priorité.', nonTraiteDepuisLe: 'jamais' })).toBe('date_invalide');
  });

  it('refuse une date future au-delà de la tolérance de fuseau', () => {
    const loin = new Date(Date.now() + TOLERANCE_FUSEAU_MS + 60 * 60 * 1000).toISOString();
    expect(refus({ negocieLe: loin })).toBe('date_future');
    expect(refus({ nonTraiteMotif: 'Autre priorité.', nonTraiteDepuisLe: loin })).toBe('date_future');
  });

  it('accepte la date du jour lue minuit UTC, même la nuit à Paris (la tolérance sert à ça)', () => {
    // Une heure dans le futur : ce que produit un `<input type="date">` du jour
    // relu à 00 h 30 heure de Paris. Sans marge, cette saisie serait refusée
    // avec un message faux, chaque nuit.
    const dansUneHeure = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(preparerObjectif(entree({ negocieLe: dansUneHeure })).ok).toBe(true);
  });

  it('n’oppose AUCUNE borne passée : un accord ancien reste enregistrable', () => {
    const resultat = preparerObjectif(entree({ negocieLe: '2019-03-04' }));
    expect(resultat.ok).toBe(true);
  });
});

describe('preparerObjectif — « non traité pour l’instant » : motif et date vont ensemble', () => {
  it('refuse un motif sans date', () => {
    expect(refus({ nonTraiteMotif: 'La priorité du moment est ailleurs.' })).toBe('non_traite_incomplet');
  });

  it('refuse une date sans motif', () => {
    expect(refus({ nonTraiteDepuisLe: '2026-08-01' })).toBe('non_traite_incomplet');
  });

  it('accepte le couple complet', () => {
    const resultat = preparerObjectif(
      entree({ nonTraiteMotif: 'La priorité du moment est ailleurs.', nonTraiteDepuisLe: '2026-08-01' }),
    );
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.donnees.nonTraiteMotif).toBe('La priorité du moment est ailleurs.');
    expect(resultat.donnees.nonTraiteDepuisLe?.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('accepte l’absence des deux : ne rien renoncer est un état normal', () => {
    expect(preparerObjectif(entree()).ok).toBe(true);
  });
});

describe('preparerObjectif — révision', () => {
  it('recopie l’énoncé depuis la cible vérifiée, JAMAIS depuis le corps', () => {
    const resultat = preparerObjectif(
      entree({
        enoncePatient: 'Énoncé réécrit par l’appelant.',
        reformulationPraticien: 'Sommeil fragmenté en seconde partie de nuit.',
        supersedesObjectifId: 'OBJ_1',
      }),
      { enoncePatient: 'Je voudrais dormir sans me réveiller à trois heures.' },
    );
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.donnees.enoncePatient).toBe('Je voudrais dormir sans me réveiller à trois heures.');
    expect(resultat.donnees.supersedesObjectifId).toBe('OBJ_1');
  });

  it('n’exige pas d’énoncé au corps quand la cible en fournit un', () => {
    const resultat = preparerObjectif(
      entree({ enoncePatient: null, priorite: 'Second plan', supersedesObjectifId: 'OBJ_1' }),
      { enoncePatient: 'Je voudrais dormir sans me réveiller à trois heures.' },
    );
    expect(resultat.ok).toBe(true);
  });
});

// ── Lecture de la trajectoire ────────────────────────────────────────────────

const ligne = (id: string, supersedes: string | null, iso: string) => ({
  id,
  supersedesObjectifId: supersedes,
  creeLe: new Date(iso),
});

describe('objectifsCourants', () => {
  it('rend les têtes de chaîne, de la plus récente à la plus ancienne', () => {
    const lignes = [
      ligne('o3', 'o1', '2026-08-20T10:00:00.000Z'),
      ligne('o2', null, '2026-08-21T10:00:00.000Z'),
      ligne('o1', null, '2026-08-19T10:00:00.000Z'),
    ];
    expect(objectifsCourants(lignes).map((l) => l.id)).toEqual(['o2', 'o3']);
  });

  it('rend TOUTES les têtes quand deux révisions concurrentes ont scindé la chaîne', () => {
    // La protection lecture-puis-409 de la route n'est pas étanche à la course.
    // Départager en silence ferait disparaître une reformulation de praticien
    // sans qu'aucune erreur ne le dise (`DC-30`).
    const lignes = [
      ligne('o2', 'o1', '2026-08-20T10:00:00.000Z'),
      ligne('o3', 'o1', '2026-08-20T10:00:01.000Z'),
      ligne('o1', null, '2026-08-19T10:00:00.000Z'),
    ];
    expect(objectifsCourants(lignes).map((l) => l.id)).toEqual(['o3', 'o2']);
  });

  it('départage deux lignes de même instant sans jamais rendre un ordre instable', () => {
    const memeInstant = '2026-08-20T10:00:00.000Z';
    const lignes = [ligne('oB', null, memeInstant), ligne('oA', null, memeInstant)];
    expect(objectifsCourants(lignes).map((l) => l.id)).toEqual(['oB', 'oA']);
    expect(objectifsCourants([...lignes].reverse()).map((l) => l.id)).toEqual(['oB', 'oA']);
  });

  it('ne rend rien sur un dossier vierge — une absence n’est pas une ligne', () => {
    expect(objectifsCourants([])).toEqual([]);
  });
});

describe('chaineDObjectif', () => {
  it('remonte la trajectoire complète, révisions comprises', () => {
    const lignes = [
      ligne('o3', 'o2', '2026-08-21T10:00:00.000Z'),
      ligne('o2', 'o1', '2026-08-20T10:00:00.000Z'),
      ligne('o1', null, '2026-08-19T10:00:00.000Z'),
    ];
    expect(chaineDObjectif(lignes, 'o3').map((l) => l.id)).toEqual(['o3', 'o2', 'o1']);
  });

  it('s’arrête sur un cycle — la référence est souple, rien en base ne l’empêche', () => {
    const lignes = [
      ligne('o1', 'o2', '2026-08-19T10:00:00.000Z'),
      ligne('o2', 'o1', '2026-08-20T10:00:00.000Z'),
    ];
    expect(chaineDObjectif(lignes, 'o1').map((l) => l.id)).toEqual(['o1', 'o2']);
  });

  it('s’arrête sur une référence pendante sans rien inventer', () => {
    const lignes = [ligne('o2', 'o_disparu', '2026-08-20T10:00:00.000Z')];
    expect(chaineDObjectif(lignes, 'o2').map((l) => l.id)).toEqual(['o2']);
  });
});

describe('etatRatification', () => {
  const ratification = (id: string, idObjectif: string, sens: string, iso: string) => ({
    id,
    idObjectif,
    sens,
    creeLe: new Date(iso),
  });

  it('sans aucune ligne : « en attente » — le geste patient n’existe pas encore (DC-24)', () => {
    expect(etatRatification('o1', [])).toBe('en_attente');
  });

  it('retient le DERNIER geste, jamais une moyenne ni un décompte (DC-30)', () => {
    const lignes = [
      ratification('r1', 'o1', 'ratifie', '2026-08-19T10:00:00.000Z'),
      ratification('r2', 'o1', 'ratifie', '2026-08-20T10:00:00.000Z'),
      ratification('r3', 'o1', 'conteste', '2026-08-21T10:00:00.000Z'),
    ];
    // Deux « ratifie » contre un « conteste » : la majorité dirait l'inverse.
    expect(etatRatification('o1', lignes)).toBe('conteste');
  });

  it('n’attribue jamais à un objectif le geste porté sur un autre', () => {
    const lignes = [ratification('r1', 'o2', 'ratifie', '2026-08-20T10:00:00.000Z')];
    expect(etatRatification('o1', lignes)).toBe('en_attente');
  });

  it('reste déterministe sur deux gestes du même instant', () => {
    const memeInstant = '2026-08-20T10:00:00.000Z';
    const lignes = [
      ratification('rA', 'o1', 'ratifie', memeInstant),
      ratification('rB', 'o1', 'conteste', memeInstant),
    ];
    expect(etatRatification('o1', lignes)).toBe('conteste');
    expect(etatRatification('o1', [...lignes].reverse())).toBe('conteste');
  });
});

describe('preparerRatification — le geste du patient (LOT-06)', () => {
  const base = { idPatient: 'PAT_SEED_01', idObjectif: 'obj-1', sens: 'ratifie' };

  it('prépare les deux sens de la taxonomie, et eux seuls', () => {
    for (const sens of SENS_RATIFICATION) {
      const prep = preparerRatification({ ...base, sens });
      expect(prep.ok).toBe(true);
      if (prep.ok) expect(prep.donnees.sens).toBe(sens);
    }
    expect(SENS_RATIFICATION).toEqual(['ratifie', 'conteste']);
  });

  it('refuse un sens hors taxonomie AVANT la base — le CHECK est un filet, pas une validation', () => {
    for (const sens of ['peut_etre', 'RATIFIE', '', 'ratifie ok', 'null']) {
      const prep = preparerRatification({ ...base, sens });
      expect(prep.ok).toBe(false);
      if (!prep.ok) expect(prep.raison).toBe('sens_invalide');
    }
  });

  it('refuse une référence d’objectif absente ou vide', () => {
    for (const idObjectif of [null, undefined, '', '   ']) {
      const prep = preparerRatification({ ...base, idObjectif });
      expect(prep.ok).toBe(false);
      if (!prep.ok) expect(prep.raison).toBe('objectif_absent');
    }
  });

  it('ne prépare AUCUNE date — ni celle du geste, ni celle de l’écriture', () => {
    // `creeLe` est posée par la base (`@default(now())`), et `gesteLe` RESTE
    // NULLE : c'est une colonne de DÉCLARATION, or le patient ne déclare
    // aucune date — il clique. La remplir depuis l'horloge du serveur en
    // ferait une déclaration qu'il n'a pas faite, et elle ne pourrait de toute
    // façon jamais différer de `creeLe`.
    const prep = preparerRatification(base);
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    expect(Object.keys(prep.donnees).sort()).toEqual(['idObjectif', 'idPatient', 'sens']);
  });

  it('ignore toute date proposée par l’appelant — antidater reste impossible', () => {
    const prep = preparerRatification({
      ...base,
      ...({ gesteLe: '2020-01-01T00:00:00.000Z', creeLe: '2020-01-01T00:00:00.000Z' } as object),
    });
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    expect(prep.donnees).not.toHaveProperty('gesteLe');
    expect(prep.donnees).not.toHaveProperty('creeLe');
  });

  it('prend `idPatient` de l’appelant et non du corps — la route passe la session', () => {
    const prep = preparerRatification({ ...base, idPatient: 'PAT_SEED_02' });
    expect(prep.ok).toBe(true);
    if (prep.ok) expect(prep.donnees.idPatient).toBe('PAT_SEED_02');
  });

  it('un changement d’avis est une LIGNE DE PLUS, jamais une correction', () => {
    const premier = preparerRatification({ ...base, sens: 'ratifie' });
    const second = preparerRatification({ ...base, sens: 'conteste' });
    expect(premier.ok && second.ok).toBe(true);
    if (!premier.ok || !second.ok) return;

    // Rien dans ce que le module prépare ne désigne la ligne précédente : pas
    // de `supersedes`, pas d'identifiant à mettre à jour. La chaîne d'un
    // objectif se révise, la ratification s'ajoute.
    expect(Object.keys(second.donnees)).not.toContain('supersedesRatificationId');
    expect(Object.keys(second.donnees)).not.toContain('id');

    // Et c'est le DERNIER geste qui fait foi, pas le premier ni la majorité.
    expect(
      etatRatification('obj-1', [
        { id: 'r1', idObjectif: 'obj-1', sens: premier.donnees.sens, creeLe: new Date(1) },
        { id: 'r2', idObjectif: 'obj-1', sens: second.donnees.sens, creeLe: new Date(2) },
      ]),
    ).toBe('conteste');
  });
});
