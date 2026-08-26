import { describe, expect, it } from 'vitest';

import {
  LONGUEUR_MAX_ENONCE,
  LONGUEUR_MAX_MOTIF,
  LONGUEUR_MAX_PRIORITE,
  LONGUEUR_MAX_REFORMULATION,
  SENS_RATIFICATION,
  TOLERANCE_FUSEAU_MS,
  chaineDObjectif,
  LONGUEUR_MAX_AMENDEMENT,
  etatRatification,
  preparerAmendement,
  objectifsCourants,
  preparerObjectif,
  preparerRatification,
  ANCRE_JALON,
  EVA_MAX,
  EVA_MIN,
  JALONS_OBJECTIF,
  LONGUEUR_MAX_REPONSE_JALON,
  preparerReponseJalon,
  type EntreeObjectif,
  type EntreeReponseJalon,
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
      { enoncePatient: 'Je voudrais dormir sans me réveiller à trois heures.', origine: 'revision' },
    );
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.donnees.enoncePatient).toBe('Je voudrais dormir sans me réveiller à trois heures.');
    expect(resultat.donnees.supersedesObjectifId).toBe('OBJ_1');
  });

  it('LA RÉVISION NE REJUGE PAS LA LONGUEUR — le texte est déjà dans la table', () => {
    // C'est la raison d'être du discriminant `origine`. Rejuger ferait qu'une
    // ligne acceptée hier rendrait INREFORMULABLE l'objectif qu'elle porte, le
    // jour où une borne changerait.
    const tropLong = 'x'.repeat(LONGUEUR_MAX_ENONCE + 1);
    const resultat = preparerObjectif(entree({ supersedesObjectifId: 'OBJ_1' }), {
      enoncePatient: tropLong,
      origine: 'revision',
    });
    expect(resultat.ok).toBe(true);
  });

  it('LA REPRISE, ELLE, LA VÉRIFIE — le texte entre pour la première fois', () => {
    // Alliance 6.0-B : l'énoncé vient d'un fragment d'anamnèse, et rien en
    // amont ne l'a borné (`depuisAnamnese` ne pose aucune longueur maximale).
    // Par REFUS, jamais par troncature.
    const tropLong = 'x'.repeat(LONGUEUR_MAX_ENONCE + 1);
    expect(
      preparerObjectif(entree({ sourcePropositionId: 'PROP_1' }), {
        enoncePatient: tropLong,
        origine: 'reprise',
      }),
    ).toEqual({ ok: false, raison: 'enonce_trop_long' });

    // La borne elle-même passe : elle borne, elle n'exclut pas.
    expect(
      preparerObjectif(entree({ sourcePropositionId: 'PROP_1' }), {
        enoncePatient: 'x'.repeat(LONGUEUR_MAX_ENONCE),
        origine: 'reprise',
      }).ok,
    ).toBe(true);
  });

  it('L’AMENDEMENT CITÉ SE BORNE COMME UNE SAISIE, lui aussi', () => {
    // Le texte du patient entre dans `objectifs_negocies` pour la première
    // fois. Sa borne amont (`LONGUEUR_MAX_AMENDEMENT`) coïncide aujourd'hui
    // avec celle de l'énoncé — rien ne garantit qu'elle coïncidera demain, et
    // la condition est écrite « tout sauf révision » pour cette raison.
    const tropLong = 'x'.repeat(LONGUEUR_MAX_ENONCE + 1);
    expect(
      preparerObjectif(entree({ supersedesObjectifId: 'OBJ_1' }), {
        enoncePatient: tropLong,
        origine: 'amendement',
      }),
    ).toEqual({ ok: false, raison: 'enonce_trop_long' });
  });

  it('n’exige pas d’énoncé au corps quand la cible en fournit un', () => {
    const resultat = preparerObjectif(
      entree({ enoncePatient: null, priorite: 'Second plan', supersedesObjectifId: 'OBJ_1' }),
      { enoncePatient: 'Je voudrais dormir sans me réveiller à trois heures.', origine: 'revision' },
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

  const amendement = (id: string, idObjectif: string, iso: string) => ({
    id,
    idObjectif,
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

  // ── « Le dire autrement » entre dans la dérivation (6.0-B, LOT-04) ────────

  it('un amendement rend « dit autrement », qui N’EST PAS « contesté »', () => {
    expect(
      etatRatification('o1', [], [amendement('a1', 'o1', '2026-08-20T10:00:00.000Z')]),
    ).toBe('dit_autrement');
  });

  it('LES DEUX TABLES SE LISENT ENSEMBLE — dernier geste, toutes tables confondues', () => {
    const ratifications = [ratification('r1', 'o1', 'ratifie', '2026-08-20T10:00:00.000Z')];
    const amendements = [amendement('a1', 'o1', '2026-08-21T10:00:00.000Z')];

    // Le patient a ratifié, puis écrit sa version : c'est sa version qui vaut.
    expect(etatRatification('o1', ratifications, amendements)).toBe('dit_autrement');

    // Et l'inverse : il a écrit sa version, puis ratifié la reformulation.
    expect(
      etatRatification(
        'o1',
        [ratification('r2', 'o1', 'ratifie', '2026-08-22T10:00:00.000Z')],
        amendements,
      ),
    ).toBe('ratifie');
  });

  it('lire une seule table donnerait la RÉPONSE INVERSE — le banc le montre', () => {
    // Sans les amendements, la dérivation rendrait « ratifié » à un patient qui
    // vient d'écrire autre chose. C'est la mutation que ce cas tue.
    const ratifications = [ratification('r1', 'o1', 'ratifie', '2026-08-20T10:00:00.000Z')];
    const amendements = [amendement('a1', 'o1', '2026-08-21T10:00:00.000Z')];
    expect(etatRatification('o1', ratifications)).toBe('ratifie');
    expect(etatRatification('o1', ratifications, amendements)).toBe('dit_autrement');
  });

  it('n’attribue jamais à un objectif l’amendement porté sur un autre', () => {
    expect(
      etatRatification('o1', [], [amendement('a1', 'o2', '2026-08-20T10:00:00.000Z')]),
    ).toBe('en_attente');
  });

  it('un `sens` hors taxonomie NE FAIT PAS REMONTER le geste précédent', () => {
    // Le CHECK en base rend le cas impossible aujourd'hui. Mais si la taxonomie
    // s'élargissait sans que ce module bouge, ÉCARTER la ligne inconnue avant
    // le tri ferait afficher « Ratifié par le patient » à un praticien dont le
    // patient vient de se rétracter. Le dernier geste est choisi d'abord ; ne
    // pas le comprendre se dit `en_attente`, qui n'affirme rien (`DC-24`).
    const lignes = [
      ratification('r1', 'o1', 'ratifie', '2026-08-20T10:00:00.000Z'),
      ratification('r2', 'o1', 'peut_etre', '2026-08-21T10:00:00.000Z'),
    ];
    expect(etatRatification('o1', lignes)).toBe('en_attente');
  });

  it('et il ne masque pas non plus un amendement PLUS RÉCENT que lui', () => {
    // Le cas mixte des deux tables : c'est là que le tri doit rester unique.
    const lignes = [
      ratification('r1', 'o1', 'ratifie', '2026-08-20T10:00:00.000Z'),
      ratification('r2', 'o1', 'peut_etre', '2026-08-21T10:00:00.000Z'),
    ];
    expect(
      etatRatification('o1', lignes, [amendement('a1', 'o1', '2026-08-22T10:00:00.000Z')]),
    ).toBe('dit_autrement');

    // Et inversement : l'inconnu le plus récent ne se replie pas sur
    // l'amendement qui le précède.
    expect(
      etatRatification('o1', lignes, [amendement('a1', 'o1', '2026-08-20T12:00:00.000Z')]),
    ).toBe('en_attente');
  });
});

describe('preparerAmendement — « le dire autrement » (6.0-B, LOT-04)', () => {
  const base = { idPatient: 'PAT_SEED_01', idObjectif: 'obj-1', texte: 'Je veux tenir debout à 17 h.' };

  it('prépare le texte du patient, débarrassé de ses espaces de bord', () => {
    const prep = preparerAmendement({ ...base, texte: '  Je veux tenir debout à 17 h.  ' });
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    expect(prep.donnees.texte).toBe('Je veux tenir debout à 17 h.');
    expect(prep.donnees.idObjectif).toBe('obj-1');
  });

  it('refuse un texte vide : un amendement sans mots est une contestation, pas un amendement', () => {
    for (const texte of [null, undefined, '', '   ', '\n\n']) {
      const prep = preparerAmendement({ ...base, texte });
      expect(prep.ok).toBe(false);
      if (!prep.ok) expect(prep.raison).toBe('texte_absent');
    }
  });

  it('refuse au-delà de la borne, PAR REFUS et jamais par troncature', () => {
    const prep = preparerAmendement({ ...base, texte: 'x'.repeat(LONGUEUR_MAX_AMENDEMENT + 1) });
    expect(prep).toEqual({ ok: false, raison: 'texte_trop_long' });

    // La borne elle-même passe : elle borne, elle n'exclut pas.
    const juste = preparerAmendement({ ...base, texte: 'x'.repeat(LONGUEUR_MAX_AMENDEMENT) });
    expect(juste.ok).toBe(true);
    // Rien n'a été coupé.
    if (juste.ok) expect(juste.donnees.texte.length).toBe(LONGUEUR_MAX_AMENDEMENT);
  });

  it('refuse une référence d’objectif absente ou vide', () => {
    for (const idObjectif of [null, undefined, '', '   ']) {
      const prep = preparerAmendement({ ...base, idObjectif });
      expect(prep.ok).toBe(false);
      if (!prep.ok) expect(prep.raison).toBe('objectif_absent');
    }
  });

  it('ne prépare AUCUNE date — ni celle du geste, ni celle de l’écriture', () => {
    const prep = preparerAmendement(base);
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    expect(Object.keys(prep.donnees).sort()).toEqual(['idObjectif', 'idPatient', 'texte']);
  });

  it('ignore toute date proposée par l’appelant — antidater reste impossible', () => {
    const prep = preparerAmendement({
      ...base,
      ...({ exprimeLe: '2020-01-01T00:00:00.000Z', creeLe: '2020-01-01T00:00:00.000Z' } as object),
    });
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;
    expect(prep.donnees).not.toHaveProperty('exprimeLe');
    expect(prep.donnees).not.toHaveProperty('creeLe');
  });

  it('se raviser est une LIGNE DE PLUS : rien ne désigne la précédente', () => {
    const second = preparerAmendement({ ...base, texte: 'En fait, dormir avant minuit.' });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(Object.keys(second.donnees)).not.toContain('supersedesAmendementId');
    expect(Object.keys(second.donnees)).not.toContain('id');
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

describe('preparerReponseJalon — où j’en suis, à un jalon (LOT-05)', () => {
  const base: EntreeReponseJalon = {
    idPatient: 'PAT_SEED_01',
    idObjectif: 'obj-1',
    jalon: 'J21',
    texte: 'Je dors mieux depuis deux semaines, mais les réveils reviennent le week-end.',
    eva: 6,
  };

  it('accepte une réponse complète, sans jamais poser de date', () => {
    const prep = preparerReponseJalon(base);
    expect(prep.ok).toBe(true);
    if (!prep.ok) return;

    expect(prep.donnees.jalon).toBe('J21');
    expect(prep.donnees.eva).toBe(6);
    // `creeLe` est posée par la base, `reponduLe` reste nulle : le module ne
    // fabrique aucune date, et une déclaration que le patient n'a pas faite
    // n'apparaît pas dans son dossier.
    expect(Object.keys(prep.donnees)).not.toContain('creeLe');
    expect(Object.keys(prep.donnees)).not.toContain('reponduLe');
  });

  it('L’EVA ABSENTE VAUT `null`, JAMAIS ZÉRO (DC-24)', () => {
    for (const absente of [null, undefined]) {
      const prep = preparerReponseJalon({ ...base, eva: absente });
      expect(prep.ok).toBe(true);
      if (prep.ok) expect(prep.donnees.eva).toBeNull();
    }
  });

  it('accepte les deux bornes, refuse ce qui les dépasse', () => {
    for (const borne of [EVA_MIN, EVA_MAX]) {
      const prep = preparerReponseJalon({ ...base, eva: borne });
      expect(prep.ok).toBe(true);
      if (prep.ok) expect(prep.donnees.eva).toBe(borne);
    }
    expect(preparerReponseJalon({ ...base, eva: EVA_MIN - 1 })).toEqual({
      ok: false,
      raison: 'eva_invalide',
    });
    expect(preparerReponseJalon({ ...base, eva: EVA_MAX + 1 })).toEqual({
      ok: false,
      raison: 'eva_invalide',
    });
  });

  it('REFUSE UNE EVA DÉCIMALE — la base ne le pourrait pas', () => {
    // La colonne est un INTEGER : `5.5` serait ARRONDI à 6 par le cast AVANT
    // que le CHECK ne s'exécute. Le CHECK verrait 6 et l'accepterait. Le
    // dossier porterait alors une valeur que le patient n'a pas donnée — c'est
    // pourquoi ce refus vit ICI et pas seulement en base.
    expect(preparerReponseJalon({ ...base, eva: 5.5 })).toEqual({
      ok: false,
      raison: 'eva_invalide',
    });
  });

  it('refuse une EVA qui n’est pas un nombre, sans coercition', () => {
    // `''` et `[]` valent 0 après coercition : les accepter déposerait un zéro
    // que personne n'a saisi.
    for (const pasUnNombre of ['5', '', [], {}, true, NaN]) {
      expect(preparerReponseJalon({ ...base, eva: pasUnNombre })).toEqual({
        ok: false,
        raison: 'eva_invalide',
      });
    }
  });

  it('REFUSE `T0` — c’est l’ancre, pas une étape', () => {
    // `resoudreJalonDu` rend `T0` pour tout patient sans cycle confirmé.
    // Laissé passer, il lèverait un 23514 en base et le patient verrait un 500.
    expect(preparerReponseJalon({ ...base, jalon: ANCRE_JALON })).toEqual({
      ok: false,
      raison: 'jalon_invalide',
    });
  });

  it('refuse un jalon hors taxonomie, et distingue l’absent de l’invalide', () => {
    expect(preparerReponseJalon({ ...base, jalon: 'J7' })).toEqual({
      ok: false,
      raison: 'jalon_invalide',
    });
    for (const absent of [null, undefined, '', '   ']) {
      expect(preparerReponseJalon({ ...base, jalon: absent })).toEqual({
        ok: false,
        raison: 'jalon_absent',
      });
    }
  });

  it('accepte les trois jalons de la taxonomie, et eux seuls', () => {
    for (const jalon of JALONS_OBJECTIF) {
      const prep = preparerReponseJalon({ ...base, jalon });
      expect(prep.ok).toBe(true);
    }
  });

  it('LE TEXTE EST OBLIGATOIRE — l’EVA ne le remplace pas', () => {
    // Une ligne au texte vide portant une EVA serait un chiffre nu déposé dans
    // un dossier : exactement ce que ce lot refuse de produire.
    expect(preparerReponseJalon({ ...base, texte: '   ', eva: 8 })).toEqual({
      ok: false,
      raison: 'texte_absent',
    });
  });

  it('REFUSE un texte trop long, ne le tronque jamais', () => {
    const prep = preparerReponseJalon({
      ...base,
      texte: 'a'.repeat(LONGUEUR_MAX_REPONSE_JALON + 1),
    });
    expect(prep).toEqual({ ok: false, raison: 'texte_trop_long' });
  });

  it('refuse une réponse qui ne vise aucun objectif', () => {
    expect(preparerReponseJalon({ ...base, idObjectif: '  ' })).toEqual({
      ok: false,
      raison: 'objectif_absent',
    });
  });

  it('répondre deux fois au même jalon prépare DEUX lignes, rien n’est écrasé', () => {
    const premiere = preparerReponseJalon({ ...base, texte: 'Ça avance doucement.', eva: 4 });
    const seconde = preparerReponseJalon({ ...base, texte: 'En fait, j’ai rechuté.', eva: 2 });
    expect(premiere.ok && seconde.ok).toBe(true);
    if (!premiere.ok || !seconde.ok) return;

    // Rien dans ce que le module prépare ne désigne la ligne précédente.
    expect(Object.keys(seconde.donnees)).not.toContain('id');
    expect(Object.keys(seconde.donnees)).not.toContain('supersedesReponseId');
  });
});
