import { describe, expect, it } from 'vitest';
import { etatDeLaRubrique, type ActeLu } from './etat';

// L'état dérivé d'un couple option × rubrique (D-480 §3, contrat de lecture de
// la migration). Empreintes et comptes synthétiques.

const TEXTE = 'a'.repeat(64);
const STRUCTURE = 'b'.repeat(64);
const AUTRE_STRUCTURE = 'c'.repeat(64);
const ctx = { empreinteStructure: STRUCTURE, optionDeclaree: true };

const acte = (ordre: number, genre: string, extra: Partial<ActeLu> = {}): ActeLu => ({
  ordre: BigInt(ordre),
  acte: genre,
  empreinte: TEXTE,
  validateur: 'responsable@exemple.fr',
  relectureIntegrale: genre === 'validee',
  motif: genre === 'retiree' ? 'motif' : null,
  le: new Date('2026-11-13T10:00:00Z'),
  ...extra,
});
const version = (actes: ActeLu[], structureSha256 = STRUCTURE) => ({ texteSha256: TEXTE, structureSha256, actes });

describe('état d’une rubrique d’option (D-480 §3)', () => {
  it('aucune version : vide', () => {
    expect(etatDeLaRubrique(null, ctx)).toEqual({ etat: 'vide' });
  });

  it('dernière version sans acte : à valider ; dernier acte au sens d’ordre, jamais de `le`', () => {
    expect(etatDeLaRubrique(version([]), ctx).etat).toBe('a_valider');
    const retiree = acte(2, 'retiree', { le: new Date('2026-01-01T00:00:00Z') });
    expect(etatDeLaRubrique(version([acte(1, 'validee'), retiree]), ctx).etat).toBe('retiree');
    expect(etatDeLaRubrique(version([retiree, acte(3, 'validee')]), ctx).etat).toBe('validee');
  });

  it('une empreinte de structure qui n’est plus celle du jour rend « à relire », même validée', () => {
    expect(etatDeLaRubrique(version([acte(1, 'validee')], AUTRE_STRUCTURE), ctx)).toEqual({ etat: 'a_relire' });
  });

  it('une option que la structure ne déclare plus : hors structure, avant « à relire »', () => {
    const etat = etatDeLaRubrique(version([acte(1, 'validee')], AUTRE_STRUCTURE), { ...ctx, optionDeclaree: false });
    expect(etat).toEqual({ etat: 'hors_structure' });
  });

  it('l’illisible l’emporte sur tout (DC-24)', () => {
    const illisible = version([acte(1, 'signee')], AUTRE_STRUCTURE);
    expect(etatDeLaRubrique(illisible, { ...ctx, optionDeclaree: false })).toEqual({ etat: 'illisible', raison: 'acte_inconnu' });
    expect(etatDeLaRubrique(version([acte(1, 'validee', { empreinte: 'd'.repeat(64) })]), ctx).etat).toBe('illisible');
  });
});
