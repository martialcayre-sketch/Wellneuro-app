import { describe, expect, it } from 'vitest';
import {
  LONGUEUR_MAX_CE_QUI_COMPTE,
  TOLERANCE_FUSEAU_MS,
  fenetreDeDepot,
  preparerEntree,
} from './ceQuiCompte';

const TEXTE = 'Ce qui compte pour moi aujourd’hui, c’est de retrouver mes matins.';

describe('preparerEntree — « ce qui compte pour moi aujourd’hui » (LOT-03)', () => {
  it('prépare un dépôt valide sans jamais porter creeLe ni idPatient', () => {
    const preparation = preparerEntree({ texte: TEXTE, saisiLe: '2026-08-20' });
    expect(preparation.ok).toBe(true);
    if (!preparation.ok) return;
    expect(preparation.donnees.texte).toBe(TEXTE);
    expect(preparation.donnees.saisiLe?.toISOString()).toBe('2026-08-20T00:00:00.000Z');
    // Les deux dates ne se confondent pas : la date d'enregistrement est posée
    // par la base, et l'identifiant patient par la route depuis la session.
    expect(Object.keys(preparation.donnees).sort()).toEqual(['saisiLe', 'texte']);
  });

  it('trim AVANT la vacuité — un texte tout en espaces est refusé, comme le CHECK btrim', () => {
    expect(preparerEntree({ texte: '   \n\t  ' })).toEqual({ ok: false, raison: 'texte_absent' });
    const preparation = preparerEntree({ texte: `  ${TEXTE}  ` });
    expect(preparation.ok).toBe(true);
    if (preparation.ok) expect(preparation.donnees.texte).toBe(TEXTE);
  });

  it('refuse un texte absent ou d’un autre type — jamais une exception', () => {
    expect(preparerEntree({ texte: '' }).ok).toBe(false);
    expect(preparerEntree({ texte: undefined })).toEqual({ ok: false, raison: 'texte_absent' });
    expect(preparerEntree({ texte: 123 })).toEqual({ ok: false, raison: 'texte_absent' });
    expect(preparerEntree({ texte: { texte: TEXTE } })).toEqual({ ok: false, raison: 'texte_absent' });
  });

  it('REFUSE au-delà de la borne — jamais de troncature (contre-patron `tronque`)', () => {
    const limite = 'a'.repeat(LONGUEUR_MAX_CE_QUI_COMPTE);
    const preparationLimite = preparerEntree({ texte: limite });
    expect(preparationLimite.ok).toBe(true);
    if (preparationLimite.ok) expect(preparationLimite.donnees.texte).toHaveLength(LONGUEUR_MAX_CE_QUI_COMPTE);

    const trop = 'a'.repeat(LONGUEUR_MAX_CE_QUI_COMPTE + 1);
    const preparationTrop = preparerEntree({ texte: trop });
    expect(preparationTrop).toEqual({ ok: false, raison: 'texte_trop_long' });
    // Le point du banc : le module ne rend AUCUNE donnée coupée. Une parole
    // tronquée serait une donnée que personne n'a écrite.
    expect('donnees' in preparationTrop).toBe(false);
  });

  it('saisiLe absente ⇒ null accepté — un silence n’est pas un refus', () => {
    for (const valeur of [undefined, null, '', '   ']) {
      const preparation = preparerEntree({ texte: TEXTE, saisiLe: valeur });
      expect(preparation.ok, `saisiLe=${JSON.stringify(valeur)} doit rester accepté`).toBe(true);
      if (preparation.ok) expect(preparation.donnees.saisiLe).toBeNull();
    }
  });

  it('refuse une date illisible ou d’un autre type — jamais un repli silencieux sur null', () => {
    expect(preparerEntree({ texte: TEXTE, saisiLe: 'hier' })).toEqual({ ok: false, raison: 'date_invalide' });
    expect(preparerEntree({ texte: TEXTE, saisiLe: 20260820 })).toEqual({ ok: false, raison: 'date_invalide' });
    expect(preparerEntree({ texte: TEXTE, saisiLe: { jour: 1 } })).toEqual({ ok: false, raison: 'date_invalide' });
  });

  it('refuse une date future au-delà de la tolérance de fuseau, l’accepte en deçà', () => {
    const dansDeuxJours = new Date(Date.now() + 2 * TOLERANCE_FUSEAU_MS).toISOString();
    expect(preparerEntree({ texte: TEXTE, saisiLe: dansDeuxJours })).toEqual({ ok: false, raison: 'date_future' });

    // Ce que la tolérance protège : la date DU JOUR lue à minuit UTC depuis un
    // fuseau en avance. Sans marge, elle serait refusée chaque nuit.
    const dansUneHeure = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(preparerEntree({ texte: TEXTE, saisiLe: dansUneHeure }).ok).toBe(true);
  });

  it('aucune borne passée — on dépose aujourd’hui ce qui comptait il y a des mois', () => {
    const preparation = preparerEntree({ texte: TEXTE, saisiLe: '2024-01-15' });
    expect(preparation.ok).toBe(true);
    if (preparation.ok) expect(preparation.donnees.saisiLe?.getUTCFullYear()).toBe(2024);
  });
});

// ── `D-166` — un dépôt par cycle ─────────────────────────────────────────────
//
// Le prédicat est PUR : il ne lit ni base ni horloge. Les quatre branches se
// disent donc en quatre dates, sans harnais.

const DEPOT = new Date('2026-09-10T08:56:00.000Z');
const AVANT = new Date('2026-08-30T20:39:00.000Z');
const APRES = new Date('2026-09-11T09:00:00.000Z');

describe('fenetreDeDepot — la cadence du dépôt (D-166)', () => {
  it('AUCUN DÉPÔT : ouverte, quoi qu\'il arrive ailleurs', () => {
    expect(fenetreDeDepot(null, { lue: true, derniereAncreConfirmeeLe: null })).toEqual({ ouverte: true });
    expect(fenetreDeDepot(null, { lue: false })).toEqual({ ouverte: true });
  });

  it('un dépôt, une ancre ANTÉRIEURE : fermée, et elle porte la date du dépôt', () => {
    expect(fenetreDeDepot(DEPOT, { lue: true, derniereAncreConfirmeeLe: AVANT })).toEqual({
      ouverte: false,
      fermeeDepuis: DEPOT,
    });
  });

  it('un dépôt, une ancre POSTÉRIEURE : rouverte', () => {
    expect(fenetreDeDepot(DEPOT, { lue: true, derniereAncreConfirmeeLe: APRES })).toEqual({ ouverte: true });
  });

  // LES DEUX ÉTATS QU'ON NE DOIT JAMAIS CONFONDRE, et c'est la raison d'être
  // de `LectureAncres`. Un seul `null` pour les deux ferait, au choix, taire un
  // patient sur une panne, ou ne jamais borner un dossier sans cycle.
  it('AUCUNE ANCRE, mais la lecture a EU LIEU : fermée — aucun cycle n\'a pu commencer', () => {
    expect(fenetreDeDepot(DEPOT, { lue: true, derniereAncreConfirmeeLe: null })).toEqual({
      ouverte: false,
      fermeeDepuis: DEPOT,
    });
  });

  it('LECTURE IMPOSSIBLE : ouverte — on n\'oppose pas au patient un fait qu\'on ignore', () => {
    expect(fenetreDeDepot(DEPOT, { lue: false })).toEqual({ ouverte: true });
  });

  // Une ancre EXACTEMENT à la seconde du dépôt n'est pas postérieure : la
  // confirmation qui rouvre doit venir APRÈS, sinon le dépôt qu'on vient
  // d'écrire rouvrirait sa propre fenêtre.
  it('une ancre à l\'instant EXACT du dépôt ne rouvre pas', () => {
    expect(fenetreDeDepot(DEPOT, { lue: true, derniereAncreConfirmeeLe: new Date(DEPOT.getTime()) })).toEqual({
      ouverte: false,
      fermeeDepuis: DEPOT,
    });
  });
});
