import { describe, expect, it } from 'vitest';
import {
  CODES_REVOCATION,
  estCodeRevocation,
  etatLecture,
  importsALire,
  type ActeLectureRow,
  type ImportValideRow,
} from './lectureImport';

// L'ACTE DE LECTURE D'UN IMPORT VALIDÉ ([[D-268]], BP-10) — le domaine pur.
// Identités de fixture seulement.

const PRATICIEN = 'praticien@wellneuro.fr';
const ANCIEN = 'ancien.praticien@wellneuro.fr';

function lecture(id: string, minute: number, praticienEmail = PRATICIEN): ActeLectureRow {
  return { id, acte: 'lecture', idLectureRevoquee: null, codeRevocation: null, praticienEmail, acteLe: new Date(Date.UTC(2026, 9, 6, 10, minute)) };
}
function revocation(id: string, cible: string, minute: number, code = 'lecture_a_refaire'): ActeLectureRow {
  return { id, acte: 'revocation', idLectureRevoquee: cible, codeRevocation: code, praticienEmail: PRATICIEN, acteLe: new Date(Date.UTC(2026, 9, 6, 10, minute)) };
}
function importValide(partiel: Partial<ImportValideRow> = {}): ImportValideRow {
  return {
    idImport: 'imp_sophie',
    idPatient: 'PAT_SOPHIE',
    nbValidees: 2,
    nbProposees: 0,
    valideLe: new Date('2026-10-06T09:00:00Z'),
    actes: [],
    ...partiel,
  };
}
const OUVERT = () => true;
const CLOS = () => false;

describe('codes de révocation (liste fermée, D-268 §5)', () => {
  it('exactement les trois codes de la migration, sans ajout', () => {
    expect([...CODES_REVOCATION]).toEqual(['acte_pose_par_erreur', 'mauvais_import', 'lecture_a_refaire']);
  });

  it('refuse tout autre code, et tout ce qui n’est pas une chaîne', () => {
    for (const code of CODES_REVOCATION) expect(estCodeRevocation(code)).toBe(true);
    for (const autre of ['', 'autre', 'LECTURE_A_REFAIRE', ' mauvais_import', null, undefined, 3]) {
      expect(estCodeRevocation(autre)).toBe(false);
    }
  });
});

describe('etatLecture', () => {
  it('aucun acte : ni lecture active, ni révocation', () => {
    expect(etatLecture([])).toEqual({ active: null, derniereRevocation: null });
  });

  it('une lecture non révoquée est active', () => {
    expect(etatLecture([lecture('l1', 1)]).active?.id).toBe('l1');
  });

  it('une révocation ROUVRE : plus de lecture active, la révocation est rendue', () => {
    const etat = etatLecture([lecture('l1', 1), revocation('r1', 'l1', 2, 'mauvais_import')]);
    expect(etat.active).toBeNull();
    expect(etat.derniereRevocation?.codeRevocation).toBe('mauvais_import');
  });

  it('une relecture après révocation redevient active', () => {
    const etat = etatLecture([lecture('l1', 1), revocation('r1', 'l1', 2), lecture('l2', 3)]);
    expect(etat.active?.id).toBe('l2');
    expect(etat.derniereRevocation).toBeNull();
  });

  it('la lecture d’un ANCIEN praticien du dossier reste active (précision du 2026-10-06)', () => {
    expect(etatLecture([lecture('l1', 1, ANCIEN)]).active?.praticienEmail).toBe(ANCIEN);
  });
});

describe('importsALire — le signalement (D-268 §1, §5, §8)', () => {
  it('BANC : un import validé SANS lecture est signalé', () => {
    expect(importsALire([importValide()], OUVERT)).toEqual([
      expect.objectContaining({ idImport: 'imp_sophie', idPatient: 'PAT_SOPHIE', nbProposees: 0, derniereRevocation: null }),
    ]);
  });

  it('un import validé et LU ne l’est plus', () => {
    expect(importsALire([importValide({ actes: [lecture('l1', 1)] })], OUVERT)).toEqual([]);
  });

  it('BANC : une révocation ROUVRE le signalement, avec la révocation qui l’a rouvert', () => {
    const [ligne] = importsALire([importValide({ actes: [lecture('l1', 1), revocation('r1', 'l1', 2)] })], OUVERT);
    expect(ligne?.derniereRevocation?.codeRevocation).toBe('lecture_a_refaire');
  });

  it('un import sans ligne validée n’appelle aucune lecture (le déclencheur est la validation)', () => {
    expect(importsALire([importValide({ nbValidees: 0, nbProposees: 3 })], OUVERT)).toEqual([]);
  });

  it('un import validé qui garde des lignes à décider est signalé, suivi ouvert', () => {
    expect(importsALire([importValide({ nbProposees: 2 })], OUVERT)).toEqual([
      expect.objectContaining({ nbProposees: 2 }),
    ]);
  });

  it('BANC : dossier clos et lignes à décider → PAS de carte (geste que la route refuse)', () => {
    expect(importsALire([importValide({ nbProposees: 2 })], CLOS)).toEqual([]);
  });

  it('dossier clos et import entièrement décidé → la carte reste (l’acte se pose sur un dossier clos)', () => {
    expect(importsALire([importValide()], CLOS)).toHaveLength(1);
  });

  it('une lecture de l’ancien praticien résout la carte', () => {
    expect(importsALire([importValide({ actes: [lecture('l1', 1, ANCIEN)] })], OUVERT)).toEqual([]);
  });
});
