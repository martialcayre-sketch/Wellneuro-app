import { describe, expect, it } from 'vitest';

import type { ReponseBrute } from './depuisPrisma';
import { calculerMomentumDuCycle } from './momentumDuCycle';
import {
  calculerMomentumParBesoinDuCycle,
  construireSeriesParBesoinDuCycle,
  etiquetteLecture,
} from './momentumParBesoin';
import type { AncreCycle } from './types';

// BANC T-3 ([[D-397]] §8) — les paires du momentum du cycle courant :
// - une remesure hors fenêtre forme la paire sans confirmer de jalon ;
// - les motifs d'absence se distinguent (sans jour 0, sans lecture d'ancre,
//   sans remesure ; « sans source » pour un besoin), jamais zéro ni « stable » ;
// - aucun momentum sans jour 0, même là où l'ancien calcul en produisait un ;
// - la référence est la lecture d'ancre, jamais la première réponse ;
// - le delta reste brut. L'absence de paire T0–T1 est tenue par le banc T-2.

const JOUR = 24 * 60 * 60 * 1000;
const ANCRE = new Date('2026-01-10T09:00:00.000Z');
const JOUR_ZERO = new Date('2026-01-12T14:30:00.000Z');
const apresZero = (jours: number) => new Date(JOUR_ZERO.getTime() + jours * JOUR);
const MAINTENANT = apresZero(120);

// PSS-10 complet (besoin 9) : deux jeux de réponses aux totaux distincts.
const pss = (valeur: string) =>
  Object.fromEntries(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'].map(id => [id, valeur]));
const passation = (date: Date, valeur: string, idQuestionnaire = 'Q_STR_02'): ReponseBrute => ({
  idQuestionnaire,
  dateReponse: date,
  scoresJson: { rawAnswers: idQuestionnaire === 'Q_STR_02' ? pss(valeur) : hadD(valeur) },
  statutValidite: null,
});
// HADS, versant dépressif (besoin 8).
const hadD = (valeur: string) => Object.fromEntries(['D2', 'D4', 'D6', 'D8', 'D10', 'D12', 'D14'].map(id => [id, valeur]));

const ancreT0 = { ancre: 'T0' as AncreCycle, date: ANCRE };
const avantAncre = new Date(ANCRE.getTime() - 60_000);

describe('momentum du cycle courant — scalaire (D-397 §1-§3)', () => {
  const calcul = (reponses: ReponseBrute[], jourZero: Date | null = JOUR_ZERO, ancre = ancreT0) =>
    calculerMomentumDuCycle({ reponses, ancre, jourZero, maintenant: MAINTENANT });

  it('sans ancre ni jour 0 : aucun momentum, motif « sans jour 0 »', () => {
    const reponses = [passation(avantAncre, '1'), passation(apresZero(21), '3')];
    expect(calculerMomentumDuCycle({ reponses, ancre: null, jourZero: null, maintenant: MAINTENANT })).toEqual({
      statut: 'absent',
      motif: 'sans_jour_zero',
    });
    // Le repli sur l'ancre en produisait un : il est supprimé (§2).
    expect(calcul(reponses, null)).toEqual({ statut: 'absent', motif: 'sans_jour_zero' });
  });

  it('aucune réponse connue à l’ancre : motif « sans lecture d’ancre »', () => {
    expect(calcul([passation(apresZero(21), '3')])).toEqual({ statut: 'absent', motif: 'sans_lecture_ancre' });
  });

  it('aucune passation nouvelle après l’ancre : motif « sans remesure », jamais « stable »', () => {
    expect(calcul([passation(avantAncre, '1')])).toEqual({ statut: 'absent', motif: 'sans_remesure' });
  });

  it('une remesure hors de toute fenêtre de jalon forme la paire, datée de sa passation', () => {
    const libre = apresZero(33); // J21 + 12 j, J42 − 9 j : hors des deux fenêtres.
    expect(etiquetteLecture(libre, JOUR_ZERO)).toBe('remesure');
    const resultat = calcul([passation(avantAncre, '1'), passation(libre, '3')]);
    expect(resultat).toMatchObject({ statut: 'disponible' });
    if (resultat.statut !== 'disponible') throw new Error('inatteignable');
    expect(resultat.depart.date).toEqual(ANCRE);
    expect(resultat.arrivee.date).toEqual(libre);
  });

  it('une remesure postérieure à l’ancre mais antérieure au jour 0 compte aussi (§3)', () => {
    const avantZero = new Date(ANCRE.getTime() + 60 * 60 * 1000);
    const resultat = calcul([passation(avantAncre, '1'), passation(avantZero, '3')]);
    expect(resultat).toMatchObject({ statut: 'disponible', arrivee: { date: avantZero } });
  });

  it('l’arrivée est la DERNIÈRE remesure (Q5), pas le dernier jalon atteint', () => {
    const resultat = calcul([
      passation(avantAncre, '1'),
      passation(apresZero(21), '3'),
      passation(apresZero(50), '2'),
    ]);
    expect(resultat).toMatchObject({ statut: 'disponible', arrivee: { date: apresZero(50) } });
  });

  it('la référence est la lecture d’ancre, pas la première réponse du dossier', () => {
    // Première réponse haute, réponse du bilan d'ancre basse, remesure haute :
    // depuis la première réponse, l'écart serait nul ; depuis l'ancre, non.
    const reponses = [
      passation(new Date(ANCRE.getTime() - 40 * JOUR), '3'),
      passation(avantAncre, '1'),
      passation(apresZero(21), '3'),
    ];
    const resultat = calcul(reponses);
    if (resultat.statut !== 'disponible') throw new Error('attendu : disponible');
    const depuisLaPremiere = calcul([reponses[0], reponses[2]]);
    if (depuisLaPremiere.statut !== 'disponible') throw new Error('attendu : disponible');
    expect(depuisLaPremiere.delta).toBe(0);
    expect(resultat.delta).not.toBe(0);
  });
});

describe('momentum du cycle courant — par besoin (D-397 §4)', () => {
  const momentum = (reponses: ReponseBrute[], jourZero: Date | null = JOUR_ZERO) =>
    calculerMomentumParBesoinDuCycle({
      series: construireSeriesParBesoinDuCycle({ brutes: reponses, ancre: ancreT0, jourZero, maintenant: MAINTENANT }),
      ancre: 'T0',
      jourZero,
    });
  const ligne = (lignes: ReturnType<typeof momentum>, besoin: number) => {
    const trouvee = lignes.find(l => l.besoin === besoin);
    if (!trouvee) throw new Error(`besoin ${besoin} absent`);
    return trouvee;
  };

  it('douze emplacements, toujours : les besoins sans source portent « sans source »', () => {
    const lignes = momentum([passation(avantAncre, '1'), passation(apresZero(33), '3')]);
    expect(lignes.map(l => l.besoin)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // Les besoins sans source au mapping (lettre o, contre-revue Codex).
    for (const besoin of [2, 6, 7, 11]) {
      expect(ligne(lignes, besoin)).toMatchObject({ mesure: false, delta: null, motifAbsence: 'sans_source' });
    }
    expect(lignes.filter(l => l.motifAbsence === 'sans_source').map(l => l.besoin)).toEqual([2, 6, 7, 11]);
  });

  it('remesure hors fenêtre : la paire se forme, étiquetée « remesure », et le delta reste brut', () => {
    const lignes = momentum([passation(avantAncre, '1'), passation(apresZero(21), '2'), passation(apresZero(33), '3')]);
    const b9 = ligne(lignes, 9);
    expect(b9.mesure).toBe(true);
    expect(b9.lectures?.map(l => l.jalon)).toEqual(['T0', 'J21', 'remesure']);
    expect(b9.depart?.jalon).toBe('T0');
    expect(b9.arrivee).toMatchObject({ jalon: 'remesure', date: apresZero(33) });
    expect(b9.delta).toBe((b9.arrivee?.couverture ?? NaN) - (b9.depart?.couverture ?? NaN));
  });

  it('trois motifs distincts : sans lecture d’ancre, sans remesure, sans jour 0', () => {
    const lignes = momentum([passation(avantAncre, '1'), passation(apresZero(21), '1', 'Q_NEU_11')]);
    // Besoin 8 lu seulement après l'ancre : la v1 aurait formé J21 → J42, ici rien.
    expect(ligne(lignes, 8)).toMatchObject({ mesure: false, motifAbsence: 'sans_lecture_ancre' });
    expect(ligne(lignes, 9)).toMatchObject({ mesure: false, motifAbsence: 'sans_remesure' });
    expect(ligne(lignes, 8).motif).toContain('Ce n’est pas une stabilité');

    const sansZero = momentum([passation(avantAncre, '1'), passation(apresZero(21), '3')], null);
    expect(sansZero.every(l => l.motifAbsence === 'sans_jour_zero' && !l.mesure)).toBe(true);
  });
});
