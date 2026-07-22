import { describe, expect, it } from 'vitest';
import {
  LONGUEUR_MAX_MEDECIN_LIBELLE,
  LONGUEUR_MAX_TEXTE,
  preparerCorrespondance,
} from './correspondanceMedecin';

const BASE = {
  idPatient: 'PAT_SEED_03',
  praticienEmail: 'praticien@wellneuro.fr',
  sens: 'sortant' as const,
  medecinLibelle: 'Dr Martin, médecin traitant',
  texte: 'Document de suivi remis en main propre.',
};

describe('preparerCorrespondance', () => {
  it('prépare une consignation valide, sortante puis entrante', () => {
    for (const sens of ['sortant', 'entrant'] as const) {
      const resultat = preparerCorrespondance({ ...BASE, sens });
      expect(resultat.ok).toBe(true);
      if (resultat.ok) {
        expect(resultat.donnees.sens).toBe(sens);
        expect(resultat.donnees.idSynthese).toBeNull();
        expect(resultat.donnees.echangeLe).toBeNull();
      }
    }
  });

  it('ne prépare JAMAIS de date de consignation — c’est la base qui la pose', () => {
    const resultat = preparerCorrespondance({ ...BASE });
    expect(resultat.ok).toBe(true);
    if (resultat.ok) {
      expect(Object.keys(resultat.donnees)).not.toContain('consigneLe');
      expect(Object.keys(resultat.donnees)).not.toContain('consigne_le');
    }
  });

  it('refuse un sens inconnu, absent ou non textuel', () => {
    for (const sens of ['autre', '', undefined, null, 3]) {
      const resultat = preparerCorrespondance({ ...BASE, sens });
      expect(resultat).toEqual({ ok: false, raison: 'sens_invalide' });
    }
  });

  it('refuse un libellé médecin vide ou blanc', () => {
    for (const medecinLibelle of ['', '   ', undefined, null]) {
      const resultat = preparerCorrespondance({ ...BASE, medecinLibelle });
      expect(resultat).toEqual({ ok: false, raison: 'medecin_libelle_vide' });
    }
  });

  it('refuse une adresse e-mail dans le libellé médecin (minimisation)', () => {
    const resultat = preparerCorrespondance({ ...BASE, medecinLibelle: 'dr.martin@cabinet.fr' });
    expect(resultat).toEqual({ ok: false, raison: 'medecin_libelle_email' });
  });

  it('refuse un libellé médecin trop long, accepte la borne exacte', () => {
    const juste = preparerCorrespondance({
      ...BASE,
      medecinLibelle: 'D'.repeat(LONGUEUR_MAX_MEDECIN_LIBELLE),
    });
    expect(juste.ok).toBe(true);
    const trop = preparerCorrespondance({
      ...BASE,
      medecinLibelle: 'D'.repeat(LONGUEUR_MAX_MEDECIN_LIBELLE + 1),
    });
    expect(trop).toEqual({ ok: false, raison: 'medecin_libelle_trop_long' });
  });

  it('refuse un texte vide, blanc ou absent', () => {
    for (const texte of ['', '   ', undefined, null]) {
      const resultat = preparerCorrespondance({ ...BASE, texte });
      expect(resultat).toEqual({ ok: false, raison: 'texte_vide' });
    }
  });

  it('refuse un texte trop long, accepte la borne exacte', () => {
    const juste = preparerCorrespondance({ ...BASE, texte: 'x'.repeat(LONGUEUR_MAX_TEXTE) });
    expect(juste.ok).toBe(true);
    const trop = preparerCorrespondance({ ...BASE, texte: 'x'.repeat(LONGUEUR_MAX_TEXTE + 1) });
    expect(trop).toEqual({ ok: false, raison: 'texte_trop_long' });
  });

  it('trime le libellé et le texte', () => {
    const resultat = preparerCorrespondance({
      ...BASE,
      medecinLibelle: '  Dr Martin  ',
      texte: '  Réponse reçue.  ',
    });
    expect(resultat.ok).toBe(true);
    if (resultat.ok) {
      expect(resultat.donnees.medecinLibelle).toBe('Dr Martin');
      expect(resultat.donnees.texte).toBe('Réponse reçue.');
    }
  });

  it('date d’échange absente, vide ou null → null', () => {
    for (const echangeLe of [undefined, null, '']) {
      const resultat = preparerCorrespondance({ ...BASE, echangeLe });
      expect(resultat.ok).toBe(true);
      if (resultat.ok) expect(resultat.donnees.echangeLe).toBeNull();
    }
  });

  it('refuse une date d’échange illisible ou non textuelle', () => {
    for (const echangeLe of ['pas-une-date', 42, {}]) {
      const resultat = preparerCorrespondance({ ...BASE, echangeLe });
      expect(resultat).toEqual({ ok: false, raison: 'date_echange_invalide' });
    }
  });

  it('refuse une date d’échange future, accepte le passé', () => {
    const futur = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    expect(preparerCorrespondance({ ...BASE, echangeLe: futur })).toEqual({
      ok: false,
      raison: 'date_echange_future',
    });
    const passe = preparerCorrespondance({ ...BASE, echangeLe: '2026-07-01' });
    expect(passe.ok).toBe(true);
    if (passe.ok) expect(passe.donnees.echangeLe?.toISOString()).toContain('2026-07-01');
  });

  it('idSynthese : chaîne non vide conservée, sinon null', () => {
    const avec = preparerCorrespondance({ ...BASE, idSynthese: 'SYN_001' });
    expect(avec.ok && avec.donnees.idSynthese).toBe('SYN_001');
    for (const idSynthese of [undefined, null, '', '   ', 42]) {
      const sans = preparerCorrespondance({ ...BASE, idSynthese });
      expect(sans.ok && sans.donnees.idSynthese).toBeNull();
    }
  });
});
