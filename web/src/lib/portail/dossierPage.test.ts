import { describe, expect, it } from 'vitest';
import {
  EN_TETE_DOSSIER_PAGE,
  MESSAGE_AUTRE_DOSSIER,
  enTeteDossierPage,
  estRefusAutreDossier,
  segmentCanonique,
  segmentEstLeDossier,
} from './dossierPage';

// Le dossier de la page ([[D-481]], complément DOC-12 ; [[D-488]] DOC-12).

describe('segmentEstLeDossier', () => {
  it('le segment égal à l’idPatient désigne le dossier', () => {
    expect(segmentEstLeDossier('PAT_SEED_01', 'PAT_SEED_01')).toBe(true);
  });

  it('un autre segment, absent ou vide ne le désigne pas', () => {
    expect(segmentEstLeDossier('PAT_SEED_02', 'PAT_SEED_01')).toBe(false);
    expect(segmentEstLeDossier('jeton-de-parcours', 'PAT_SEED_01')).toBe(false);
    expect(segmentEstLeDossier(null, 'PAT_SEED_01')).toBe(false);
    expect(segmentEstLeDossier(undefined, 'PAT_SEED_01')).toBe(false);
    expect(segmentEstLeDossier('', 'PAT_SEED_01')).toBe(false);
  });

  it('forme encodée ou décodée d’un caractère réservé : même dossier', () => {
    expect(segmentEstLeDossier('PAT 01', 'PAT 01')).toBe(true);
    expect(segmentEstLeDossier('PAT%2001', 'PAT 01')).toBe(true);
  });

  it('une séquence `%` invalide ne lève pas et ne vaut aucun dossier', () => {
    expect(() => segmentCanonique('%E0%A4%A')).not.toThrow();
    expect(segmentEstLeDossier('%E0%A4%A', 'PAT_SEED_01')).toBe(false);
  });

  it('la casse compte : un idPatient voisin ne passe pas', () => {
    expect(segmentEstLeDossier('pat_seed_01', 'PAT_SEED_01')).toBe(false);
  });
});

describe('enTeteDossierPage', () => {
  it('porte le segment canonique sous l’en-tête de la garde', () => {
    expect(enTeteDossierPage('PAT_SEED_01')).toEqual({ [EN_TETE_DOSSIER_PAGE]: 'PAT_SEED_01' });
    expect(enTeteDossierPage('PAT 01')).toEqual({ [EN_TETE_DOSSIER_PAGE]: 'PAT%2001' });
  });

  it('sans segment, aucun en-tête : la route refusera', () => {
    expect(enTeteDossierPage(undefined)).toEqual({});
    expect(enTeteDossierPage('')).toEqual({});
  });
});

describe('estRefusAutreDossier', () => {
  it('reconnaît le seul 409 de la garde', () => {
    expect(estRefusAutreDossier(409, { reason: 'autre_dossier' })).toBe(true);
    expect(estRefusAutreDossier(409, { reason: 'dossier_cloture' })).toBe(false);
    expect(estRefusAutreDossier(400, { reason: 'autre_dossier' })).toBe(false);
    expect(estRefusAutreDossier(409, null)).toBe(false);
  });
});

describe('T-51', () => {
  it('mot pour mot, D-488 amendement DOC-12', () => {
    expect(MESSAGE_AUTRE_DOSSIER).toBe(
      'Rien n’a été envoyé : cette page a été ouverte sous un autre compte. Rechargez-la pour continuer.',
    );
  });
});
