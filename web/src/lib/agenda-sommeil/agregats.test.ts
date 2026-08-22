import { describe, expect, it } from 'vitest';
import {
  calculerAgregats,
  compterNuitsPlausibles,
  couvertureSuffisante,
  dureeMinutes,
  minutesDepuisMidi,
  type NuitAgregable,
} from './agregats';
import type { NuitReponses } from './types';

// Fabrique une nuit v2 complète, surchargeable. Les trois champs obligatoires du
// contrat v2 (éveil, aide au sommeil, mode de lever) sont renseignés par défaut ;
// les cas d'héritage v1 les omettent explicitement.
function rep(over: Partial<NuitReponses> = {}): NuitReponses {
  return {
    heureCoucher: '23:00',
    heureLever: '07:00',
    latence: 'lt15',
    qualite: 4,
    reveils: { dureeTotale: 'aucun' },
    aideSommeil: 'aucune',
    extinctionImmediate: true,
    leverImmediat: true,
    ...over,
  };
}

// Série de nuits consécutives à partir d'un lundi (2026-01-05), pour que la
// couverture week-end soit déterministe.
const LUNDI = '2026-01-05';

function decale(date: string, n: number): string {
  const [a, m, j] = date.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

function serie(n: number, over: Partial<NuitReponses> = {}, depuis = LUNDI): NuitAgregable[] {
  return Array.from({ length: n }, (_, i) => ({
    dateNuit: decale(depuis, i),
    reponses: rep(over),
  }));
}

describe('dureeMinutes — traversée de minuit', () => {
  it('extinction 23:30 → lever 07:00 = 450 min', () => {
    expect(dureeMinutes('23:30', '07:00')).toBe(450);
  });

  it('extinction 01:00 → lever 07:00 = 360 min (sans traversée)', () => {
    expect(dureeMinutes('01:00', '07:00')).toBe(360);
  });

  it('heures égales = 0 min (cas dégénéré)', () => {
    expect(dureeMinutes('07:00', '07:00')).toBe(0);
  });
});

describe('minutesDepuisMidi — ancrage anti-minuit', () => {
  it('23:30 et 00:30 restent proches (60 min), jamais ~720 d’écart', () => {
    expect(Math.abs(minutesDepuisMidi('00:30') - minutesDepuisMidi('23:30'))).toBe(60);
  });

  it('midi = 0', () => {
    expect(minutesDepuisMidi('12:00')).toBe(0);
  });
});

describe('calculerAgregats — seuil et plausibilité', () => {
  it('retourne null sous 7 nuits plausibles', () => {
    expect(calculerAgregats(serie(6))).toBeNull();
  });

  it('agrège 7 nuits régulières 23:00→07:00 (TIB 480, latence lt15)', () => {
    const a = calculerAgregats(serie(7))!;
    expect(a.AGD_NB_NUITS).toBe(7);
    expect(a.AGD_TIB_MOY).toBe(480);
    // TST = 480 − 8 (latence lt15) − 0 (nuit continue) = 472
    expect(a.AGD_TST_MOY).toBe(472);
    expect(a.AGD_EFF_MOY).toBe(98);
    expect(a.AGD_REG_ECT).toBe(0);
    expect(a.AGD_QUAL_MOY).toBe(4);
  });

  it('exclut une nuit implausible (TIB hors [120,960]) des agrégats', () => {
    const nuits = [
      ...serie(7),
      { dateNuit: decale(LUNDI, 7), reponses: rep({ heureCoucher: '20:00', heureLever: '19:00' }) },
    ];
    expect(compterNuitsPlausibles(nuits)).toBe(7);
    expect(calculerAgregats(nuits)!.AGD_TIB_MOY).toBe(480);
  });

  it('la régularité augmente avec des heures d’extinction dispersées', () => {
    const regulier = calculerAgregats(serie(7))!;
    const horaires: [string, string][] = [
      ['22:00', '06:00'],
      ['00:30', '08:30'],
      ['23:00', '07:00'],
      ['01:00', '09:00'],
      ['21:30', '05:30'],
      ['23:45', '07:45'],
      ['00:15', '08:15'],
    ];
    const irregulier = calculerAgregats(
      horaires.map(([c, l], i) => ({
        dateNuit: decale(LUNDI, i),
        reponses: rep({ heureCoucher: c, heureLever: l }),
      })),
    )!;
    expect(irregulier.AGD_REG_ECT).toBeGreaterThan(regulier.AGD_REG_ECT);
  });

  it('l’éveil nocturne diminue le TST', () => {
    const a = calculerAgregats(serie(7, { reveils: { dureeTotale: 'e30_60', nombre: 2 } }))!;
    expect(a.AGD_REV_MOY).toBe(2);
    expect(a.AGD_WASO_MOY).toBe(45);
    // TST = 480 − 8 (latence) − 45 (éveil e30_60) = 427
    expect(a.AGD_TST_MOY).toBe(427);
  });

  it('la moyenne de réveils suit un compte exact au-delà de trois (v3)', () => {
    // Sous v2 ces nuits auraient toutes été écrasées à 3 : la moyenne aurait
    // rendu 3 au lieu de 7 — la fragmentation sévère était invisible.
    const a = calculerAgregats(serie(7, { reveils: { dureeTotale: 'gt60', nombre: 7 } }))!;
    expect(a.AGD_REV_MOY).toBe(7);
  });

  it('DST : une nuit décalée de 60 min reste plausible et n’exclut rien', () => {
    const nuits = serie(7);
    nuits[6] = { dateNuit: decale(LUNDI, 6), reponses: rep({ heureLever: '08:00' }) };
    expect(calculerAgregats(nuits)!.AGD_NB_NUITS).toBe(7);
  });
});

describe('couverture par métrique — « pas répondu » n’est jamais 0', () => {
  it('une nuit v1 sans réveils sort du TST et de l’efficacité, pas du reste', () => {
    const nuits = serie(7);
    // Nuit héritée v1 : aucune information sur l'éveil nocturne.
    nuits[0] = { dateNuit: LUNDI, reponses: rep({ reveils: undefined }) };
    const a = calculerAgregats(nuits)!;
    expect(a.AGD_NB_NUITS).toBe(7); // comptée pour qualité, régularité, TIB
    expect(a.AGD_NB_NUITS_TST).toBe(6); // exclue du sommeil et de l'efficacité
    expect(a.AGD_TIB_MOY).toBe(480);
    expect(a.AGD_QUAL_MOY).toBe(4);
  });

  it('la nuit sans réveils ne gonfle PAS l’efficacité (défaut v1 corrigé)', () => {
    // Toutes les nuits ont 30 min d'éveil sauf une, dont l'éveil est INCONNU.
    // En v1 cette nuit valait « 0 minute éveillée » et tirait l'efficacité vers
    // le haut : le recueil récompensait la non-réponse.
    const nuits = serie(7, { reveils: { dureeTotale: 'e30_60' } });
    nuits[0] = { dateNuit: LUNDI, reponses: rep({ reveils: undefined }) };
    const a = calculerAgregats(nuits)!;
    // Efficacité calculée sur les 6 nuits connues : (480−8−45)/480 ≈ 89 %.
    expect(a.AGD_NB_NUITS_TST).toBe(6);
    expect(a.AGD_TST_MOY).toBe(427);
    expect(a.AGD_EFF_MOY).toBe(89);
  });

  it('aucune nuit exploitable pour le TST → null, jamais 0', () => {
    const a = calculerAgregats(serie(7, { reveils: undefined }))!;
    expect(a.AGD_TST_MOY).toBeNull();
    expect(a.AGD_EFF_MOY).toBeNull();
    expect(a.AGD_WASO_MOY).toBeNull();
    expect(a.AGD_NB_NUITS_TST).toBe(0);
  });

  it('le compte de réveils, facultatif en v2, vaut null quand nul ne l’a donné', () => {
    const a = calculerAgregats(serie(7, { reveils: { dureeTotale: 'lt15' } }))!;
    expect(a.AGD_REV_MOY).toBeNull();
    expect(a.AGD_NB_NUITS_REV).toBe(0);
    expect(a.AGD_WASO_MOY).toBe(8); // le WASO, lui, est connu
  });

  it('« nuit continue » est une réponse : WASO = 0, pas null', () => {
    const a = calculerAgregats(serie(7, { reveils: { dureeTotale: 'aucun' } }))!;
    expect(a.AGD_WASO_MOY).toBe(0);
    expect(a.AGD_NB_NUITS_TST).toBe(7);
  });
});

describe('éveil du matin au lit (TWAK)', () => {
  it('le temps passé éveillé au lit le matin n’est plus compté comme du sommeil', () => {
    // Réveil à 05:00, lever à 07:00 : deux heures d'éveil au lit. Avant cette
    // correction, elles entraient dans le TST et le réveil matinal précoce
    // n'apparaissait nulle part.
    const a = calculerAgregats(
      serie(7, { leverImmediat: false, heureReveilFinal: '05:00' }),
    )!;
    expect(a.AGD_TWAK_MOY).toBe(120);
    // TST = 480 − 8 (latence) − 0 (nuit continue) − 120 (éveil du matin) = 352
    expect(a.AGD_TST_MOY).toBe(352);
    expect(a.AGD_NB_NUITS_TWAK).toBe(7);
  });

  it('« levé dès mon réveil » vaut zéro explicite, pas inconnu', () => {
    const a = calculerAgregats(serie(7))!;
    expect(a.AGD_TWAK_MOY).toBe(0);
    expect(a.AGD_NB_NUITS_TWAK).toBe(7);
    expect(a.AGD_TST_MOY).toBe(472);
  });

  it('une nuit d’avant la question sort du TST plutôt que de valoir zéro', () => {
    const nuits = serie(7);
    nuits[0] = { dateNuit: LUNDI, reponses: rep({ leverImmediat: undefined }) };
    const a = calculerAgregats(nuits)!;
    expect(a.AGD_NB_NUITS_TWAK).toBe(6);
    expect(a.AGD_NB_NUITS_TST).toBe(6);
    expect(a.AGD_NB_NUITS).toBe(7); // toujours comptée ailleurs
  });
});

describe('mise au lit — le temps au lit change de définition', () => {
  it('le temps au lit court de la mise au lit au lever, pas de l’extinction', () => {
    // Au lit à 22:00, extinction 23:00, lever 07:00 : fenêtre de 8 h, temps au
    // lit de 9 h. C'est ce dernier qui dénomine l'efficacité.
    const a = calculerAgregats(
      serie(7, { extinctionImmediate: false, heureMiseAuLit: '22:00' }),
    )!;
    expect(a.AGD_FENETRE_MOY).toBe(480);
    expect(a.AGD_TIB_MOY).toBe(540);
    expect(a.AGD_PRELIT_MOY).toBe(60);
  });

  it('l’efficacité BAISSE : c’était le but de l’ancre manquante', () => {
    const sansPrelit = calculerAgregats(serie(7))!;
    const avecPrelit = calculerAgregats(
      serie(7, { extinctionImmediate: false, heureMiseAuLit: '22:00' }),
    )!;
    // TST identique (472) ; seul le dénominateur change : 472/480 vs 472/540.
    expect(avecPrelit.AGD_TST_MOY).toBe(sansPrelit.AGD_TST_MOY);
    expect(avecPrelit.AGD_EFF_MOY!).toBeLessThan(sansPrelit.AGD_EFF_MOY!);
    expect(avecPrelit.AGD_EFF_MOY).toBe(87);
  });

  it('le temps avant extinction ne sort PAS du temps de sommeil', () => {
    // Le patient ne cherchait pas encore à dormir : ces minutes pèsent sur
    // l'efficacité, pas sur le sommeil estimé.
    const a = calculerAgregats(
      serie(7, { extinctionImmediate: false, heureMiseAuLit: '21:00' }),
    )!;
    expect(a.AGD_TST_MOY).toBe(472);
    expect(a.AGD_PRELIT_MOY).toBe(120);
  });

  it('« éteint en me couchant » vaut zéro explicite', () => {
    const a = calculerAgregats(serie(7))!;
    expect(a.AGD_PRELIT_MOY).toBe(0);
    expect(a.AGD_TIB_MOY).toBe(480); // temps au lit = fenêtre
    expect(a.AGD_NB_NUITS_PRELIT).toBe(7);
  });

  it('une nuit d’avant la question perd l’efficacité, pas le sommeil', () => {
    const nuits = serie(7);
    nuits[0] = { dateNuit: LUNDI, reponses: rep({ extinctionImmediate: undefined }) };
    const a = calculerAgregats(nuits)!;
    expect(a.AGD_NB_NUITS_TST).toBe(7); // le TST ne dépend pas de la mise au lit
    expect(a.AGD_NB_NUITS_EFF).toBe(6); // l'efficacité, si
    expect(a.AGD_NB_NUITS_PRELIT).toBe(6);
  });

  it('la régularité reste ancrée sur le sommeil, pas sur le coucher', () => {
    // Deux patients de même rythme de SOMMEIL, dont l'un traîne au lit de façon
    // erratique avant d'éteindre : la régularité ne doit pas s'en trouver
    // dégradée — ce n'est pas le rythme qu'elle mesure.
    const regulier = calculerAgregats(serie(7))!;
    const traineur = calculerAgregats(
      ['21:00', '22:30', '20:15', '22:00', '21:45', '20:00', '22:15'].map((lit, i) => ({
        dateNuit: decale(LUNDI, i),
        reponses: rep({ extinctionImmediate: false, heureMiseAuLit: lit }),
      })),
    )!;
    expect(traineur.AGD_REG_ECT).toBe(regulier.AGD_REG_ECT);
  });
});

describe('aide au sommeil — comptée, jamais scorée', () => {
  it('compte les nuits sous aide et leur couverture', () => {
    const nuits = serie(7);
    nuits[0] = { dateNuit: LUNDI, reponses: rep({ aideSommeil: 'prise' }) };
    nuits[1] = { dateNuit: decale(LUNDI, 1), reponses: rep({ aideSommeil: 'prise' }) };
    const a = calculerAgregats(nuits)!;
    expect(a.AGD_NB_NUITS_AIDE).toBe(2);
    expect(a.AGD_NB_NUITS_AIDE_CONNU).toBe(7);
  });

  it('vaut null — jamais 0 — quand la question n’a jamais été posée', () => {
    const a = calculerAgregats(serie(7, { aideSommeil: undefined }))!;
    expect(a.AGD_NB_NUITS_AIDE).toBeNull();
    expect(a.AGD_NB_NUITS_AIDE_CONNU).toBe(0);
  });
});

describe('fréquences — le critère clinique est un nombre de nuits par semaine', () => {
  it('une moyenne rassurante peut recouvrir un profil insomniaque', () => {
    // Quatre nuits à 8 min d'endormissement, trois à plus d'une heure. La
    // médiane vaut 8 min ; la fréquence dit 3 nuits/semaine au-delà de 30 min.
    const nuits = serie(7);
    for (const i of [4, 5, 6]) {
      nuits[i] = { dateNuit: decale(LUNDI, i), reponses: rep({ latence: 'gt60' }) };
    }
    const a = calculerAgregats(nuits)!;
    expect(a.AGD_LAT_MED).toBe(8); // la médiane efface le problème
    expect(a.AGD_FREQ_LAT30_SEM).toBe(3); // la fréquence le montre
    expect(a.AGD_FREQ_CRITERE_SEM).toBe(3);
    expect(a.AGD_NB_NUITS_FREQ).toBe(7);
  });

  it('la borne à 30 min rend l’éveil nocturne classable', () => {
    const a = calculerAgregats(serie(7, { reveils: { dureeTotale: 'e30_60' } }))!;
    expect(a.AGD_FREQ_WASO30_SEM).toBe(7);
    // « 15 à 30 » est en dessous du seuil : la nuit compte, mais pas au-delà.
    const enDessous = calculerAgregats(serie(7, { reveils: { dureeTotale: 'e15_30' } }))!;
    expect(enDessous.AGD_FREQ_WASO30_SEM).toBe(0);
    expect(enDessous.AGD_NB_NUITS_FREQ).toBe(7);
  });

  it('une classe d’éveil héritée rend la nuit indéterminée, jamais rangée d’office', () => {
    // « 15 à 45 min » chevauche le seuil de 30 : impossible de trancher. La nuit
    // sort du calcul de fréquence tout en restant dans la moyenne d'éveil.
    const nuits = serie(7);
    nuits[0] = { dateNuit: LUNDI, reponses: rep({ reveils: { dureeTotale: 'e15_45' } }) };
    const a = calculerAgregats(nuits)!;
    expect(a.AGD_NB_NUITS_FREQ).toBe(6);
    expect(a.AGD_WASO_MOY).not.toBeNull(); // centre de classe conservé
    expect(a.AGD_NB_NUITS_TST).toBe(7); // et toujours exploitable pour le TST
  });

  it('aucune nuit classable pour l’éveil → null, jamais 0', () => {
    const a = calculerAgregats(serie(7, { reveils: { dureeTotale: 'gt45' } }))!;
    expect(a.AGD_FREQ_WASO30_SEM).toBeNull();
    expect(a.AGD_FREQ_CRITERE_SEM).toBeNull();
    expect(a.AGD_NB_NUITS_FREQ).toBe(0);
  });

  it('la fréquence de latence reste calculable sur une cohorte 100 % héritée', () => {
    // La latence est obligatoire depuis la v1 et ses bornes ont toujours inclus
    // 30 min : partager le dénominateur de l'éveil la rendait `null` alors que
    // la réponse était connue — une perte de donnée gratuite.
    const a = calculerAgregats(
      serie(7, { latence: 'gt60', reveils: { dureeTotale: 'gt45' } }),
    )!;
    expect(a.AGD_FREQ_LAT30_SEM).toBe(7);
    expect(a.AGD_FREQ_WASO30_SEM).toBeNull();
  });
});

describe('écart-type d’échantillon (n−1)', () => {
  it('ne sous-estime plus la dispersion sur petit effectif', () => {
    // Lever fixe à 07:00, extinction alternée 22:00 / 00:00, plus une nuit
    // médiane. Milieux de sommeil : 870, 930 (×3 chacun) et 900 → moyenne 900,
    // somme des carrés des écarts = 5400.
    const horaires = ['22:00', '00:00', '22:00', '00:00', '22:00', '00:00', '23:00'];
    const a = calculerAgregats(
      horaires.map((h, i) => ({
        dateNuit: decale(LUNDI, i),
        reponses: rep({ heureCoucher: h, heureLever: '07:00' }),
      })),
    )!;
    // n−1 : √(5400/6) = 30 min. Le diviseur n rendait √(5400/7) ≈ 28 min, soit
    // une régularité ~7 % plus flatteuse que la réalité de l'échantillon.
    expect(a.AGD_REG_ECT).toBe(30);
    expect(Math.sqrt(5400 / 7)).toBeLessThan(a.AGD_REG_ECT);
  });
});

describe('couvertureSuffisante — l’indice demande aussi du week-end', () => {
  it('14 nuits consécutives depuis un lundi : suffisant (4 nuits de week-end)', () => {
    const nuits = serie(14);
    expect(couvertureSuffisante(nuits)).toBe(true);
    expect(calculerAgregats(nuits)!.AGD_INDICE_ELIGIBLE).toBe(1);
    expect(calculerAgregats(nuits)!.AGD_NB_NUITS_WE).toBe(4);
  });

  it('13 nuits : insuffisant sur le compte', () => {
    expect(couvertureSuffisante(serie(13))).toBe(false);
  });

  it('14 nuits toutes ouvrables : insuffisant malgré le compte', () => {
    // Deux séries de 7 lundi→dimanche dont on ne garde que les matins de semaine.
    const ouvrables = Array.from({ length: 21 }, (_, i) => decale(LUNDI, i)).filter((d) => {
      const [a, m, j] = d.split('-').map(Number);
      const jour = new Date(Date.UTC(a, m - 1, j)).getUTCDay();
      return jour !== 0 && jour !== 6;
    });
    const nuits = ouvrables.slice(0, 14).map((dateNuit) => ({ dateNuit, reponses: rep() }));
    expect(nuits).toHaveLength(14);
    expect(couvertureSuffisante(nuits)).toBe(false);
    expect(calculerAgregats(nuits)!.AGD_INDICE_ELIGIBLE).toBe(0);
  });
});
