import { describe, expect, it } from 'vitest';
import {
  CONTEXTE_INCONNU,
  champsInconnus,
  champsQuiDifferent,
  validerContextePrelevement,
  valeurAffichee,
  type ContextePrelevementSaisi,
} from './contextePrelevement';

const renseigne: ContextePrelevementSaisi = {
  aJeun: 'oui',
  supplementationArretee: 'non',
  traitementInterferent: 'non',
  episodeInflammatoire: 'non',
  grossesse: 'non',
  jourCycleEtat: 'renseigne',
  jourCycle: 3,
  delaiDernierePriseEtat: 'renseigne',
  delaiDernierePrise: 12,
  delaiDernierePriseUnite: 'heure',
};

describe('validerContextePrelevement (D-497 §2, §6 — la forme des CHECK)', () => {
  it('absent : « inconnu » partout, jamais rien (§4)', () => {
    expect(validerContextePrelevement(undefined)).toEqual({ ok: true, contexte: CONTEXTE_INCONNU });
    expect(validerContextePrelevement(null)).toEqual({ ok: true, contexte: CONTEXTE_INCONNU });
  });

  it('accepte un contexte renseigné et un contexte inconnu', () => {
    expect(validerContextePrelevement(renseigne)).toEqual({ ok: true, contexte: renseigne });
    expect(validerContextePrelevement({ ...CONTEXTE_INCONNU })).toEqual({ ok: true, contexte: CONTEXTE_INCONNU });
  });

  it('accepte un délai nul et un grand jour du cycle : aucune borne haute', () => {
    expect(validerContextePrelevement({ ...renseigne, delaiDernierePrise: 0 }).ok).toBe(true);
    expect(validerContextePrelevement({ ...renseigne, jourCycle: 90 }).ok).toBe(true);
    expect(validerContextePrelevement({ ...renseigne, delaiDernierePriseUnite: 'jour' }).ok).toBe(true);
  });

  const refus: Array<[string, unknown]> = [
    ['un tableau', []],
    ['une chaîne', 'oui'],
    ['une déclaration hors liste', { ...renseigne, aJeun: 'peut-etre' }],
    ['une déclaration nulle', { ...renseigne, grossesse: null }],
    ['une déclaration absente', { ...renseigne, episodeInflammatoire: undefined }],
    ['un état hors liste', { ...renseigne, jourCycleEtat: 'estime' }],
    ['une valeur avec l’état inconnu', { ...renseigne, jourCycleEtat: 'inconnu', jourCycle: 3 }],
    ['une valeur absente avec l’état renseigné', { ...renseigne, jourCycle: null }],
    ['un jour du cycle < 1', { ...renseigne, jourCycle: 0 }],
    ['un jour du cycle décimal', { ...renseigne, jourCycle: 2.5 }],
    ['un jour du cycle en texte', { ...renseigne, jourCycle: '3' }],
    ['un délai < 0', { ...renseigne, delaiDernierePrise: -1 }],
    ['un délai sans unité', { ...renseigne, delaiDernierePriseUnite: null }],
    ['un délai d’unité hors liste', { ...renseigne, delaiDernierePriseUnite: 'minute' }],
    [
      'une unité avec l’état inconnu',
      { ...renseigne, delaiDernierePriseEtat: 'inconnu', delaiDernierePrise: null, delaiDernierePriseUnite: 'heure' },
    ],
    ['un entier hors capacité de la colonne', { ...renseigne, delaiDernierePrise: 2 ** 31 }],
  ];
  it.each(refus)('refuse %s', (_cas, brut) => {
    expect(validerContextePrelevement(brut)).toEqual({ ok: false, raison: 'contexte_invalide' });
  });

  it('ne recopie aucune clé étrangère au contexte', () => {
    const verdict = validerContextePrelevement({ ...renseigne, praticienEmail: 'x@y.fr', idResultat: 'r' });
    expect(verdict.ok && Object.keys(verdict.contexte).sort()).toEqual(Object.keys(renseigne).sort());
  });
});

describe('champsInconnus et champsQuiDifferent (D-497 §5)', () => {
  it('un contexte inconnu manque de ses sept champs', () => {
    expect(champsInconnus(CONTEXTE_INCONNU)).toHaveLength(7);
    expect(champsInconnus(renseigne)).toEqual([]);
  });

  it('seuls les champs renseignés des deux côtés diffèrent', () => {
    expect(champsQuiDifferent(renseigne, { ...renseigne, aJeun: 'non' })).toEqual(['aJeun']);
    expect(champsQuiDifferent(renseigne, { ...renseigne, aJeun: 'inconnu' })).toEqual([]);
    expect(champsQuiDifferent(renseigne, { ...renseigne, jourCycle: 4 })).toEqual(['jourCycle']);
    expect(champsQuiDifferent(renseigne, CONTEXTE_INCONNU)).toEqual([]);
  });

  it('24 h et 1 jour diffèrent : aucune conversion', () => {
    expect(
      champsQuiDifferent(
        { ...renseigne, delaiDernierePrise: 24, delaiDernierePriseUnite: 'heure' },
        { ...renseigne, delaiDernierePrise: 1, delaiDernierePriseUnite: 'jour' },
      ),
    ).toEqual(['delaiDernierePrise']);
  });

  it('valeurAffichee écrit « inconnu », jamais un blanc', () => {
    expect(valeurAffichee(CONTEXTE_INCONNU, 'aJeun')).toBe('inconnu');
    expect(valeurAffichee(CONTEXTE_INCONNU, 'jourCycle')).toBe('inconnu');
    expect(valeurAffichee(CONTEXTE_INCONNU, 'delaiDernierePrise')).toBe('inconnu');
    expect(valeurAffichee(renseigne, 'jourCycle')).toBe('3');
    expect(valeurAffichee(renseigne, 'delaiDernierePrise')).toBe('12 h');
  });
});
