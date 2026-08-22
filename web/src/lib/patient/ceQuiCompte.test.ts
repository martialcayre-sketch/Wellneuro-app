import { describe, expect, it } from 'vitest';
import {
  LONGUEUR_MAX_CE_QUI_COMPTE,
  TOLERANCE_FUSEAU_MS,
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
