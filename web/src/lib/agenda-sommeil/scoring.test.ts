import { describe, expect, it } from 'vitest';
import { calculateScore } from '@/lib/questions';
import { IDS_ASSIGNABLES } from '@/lib/bibliotheque';
import { AGENDA_SOMMEIL_ID } from './types';

// Le scoring `agenda_sommeil` lit les agrégats rangés dans rawAnswers. On le
// teste via le point d'entrée public `calculateScore` (id + answers), comme le
// fait le moteur d'équilibre.

// Agrégats d'un recueil complet et éligible, surchargeables.
function agregats(over: Record<string, number | null> = {}) {
  return {
    AGD_NB_NUITS: 18,
    AGD_NB_NUITS_TST: 18,
    AGD_NB_NUITS_EFF: 18,
    AGD_INDICE_ELIGIBLE: 1,
    AGD_TIB_MOY: 480,
    AGD_TST_MOY: 470,
    AGD_EFF_MOY: 95,
    AGD_LAT_MED: 10,
    AGD_WASO_MOY: 5,
    AGD_REV_MOY: 0.5,
    AGD_REG_ECT: 20,
    AGD_QUAL_MOY: 5,
    ...over,
  };
}

const axe = (r: { subScores: { id: string; total: number | null }[] }, id: string) =>
  r.subScores.find((s) => s.id === id)!;

describe('assignabilité Q_SOM_09', () => {
  it('Q_SOM_09 est assignable (intersection catalogue affichage ∩ définitions)', () => {
    expect(IDS_ASSIGNABLES).toContain(AGENDA_SOMMEIL_ID);
  });
});

describe('seuils de couverture', () => {
  it('recueil transmis sans indice sous 14 nuits (scored:false)', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_NB_NUITS: 12 }));
    expect(r.scored).toBe(false);
    expect(r.nbNuits).toBe(12);
    expect(r.total).toBeUndefined();
  });

  it('pas d’indice si la couverture week-end manque, même à 18 nuits', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_INDICE_ELIGIBLE: 0 }));
    expect(r.scored).toBe(false);
    expect(r.note).toContain('week-end');
  });

  it('un agenda d’avant la v2 (sans drapeau d’éligibilité) reste scoré sur le compte', () => {
    const sansDrapeau = agregats();
    delete (sansDrapeau as Record<string, unknown>).AGD_INDICE_ELIGIBLE;
    expect(calculateScore(AGENDA_SOMMEIL_ID, sansDrapeau).scored).toBe(true);
  });
});

describe('les quatre axes sont indépendants', () => {
  it('un recueil au plateau sur les quatre axes → 100', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, agregats());
    expect(r.scored).toBe(true);
    expect(r.total).toBe(100);
    expect(r.interpretation.label).toBe('Sommeil globalement satisfaisant');
    expect(r.subScores).toHaveLength(4);
    expect(r.subScores.map((s: { id: string }) => s.id)).toEqual(['DUREE', 'EFF', 'REG', 'QUAL']);
  });

  it('la latence n’est plus comptée une seconde fois hors de l’efficacité', () => {
    // Deux recueils de MÊME efficacité, même durée, même régularité et même
    // qualité, mais de latences médianes opposées. En v1 la latence entrait
    // aussi dans « Continuité » : le total différait. Elle est désormais portée
    // par la seule efficacité, donc les deux totaux coïncident.
    const courte = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_LAT_MED: 5 }));
    const longue = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_LAT_MED: 75 }));
    expect(longue.total).toBe(courte.total);
  });

  it('le compte de réveils ne pèse plus sur le total non plus', () => {
    const peu = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_REV_MOY: 0 }));
    const beaucoup = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_REV_MOY: 3 }));
    expect(beaucoup.total).toBe(peu.total);
  });

  it('la qualité vécue pèse sur le total (elle n’entrait dans aucun axe en v1)', () => {
    const bon = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_QUAL_MOY: 5 }));
    const mauvais = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_QUAL_MOY: 1 }));
    expect(bon.total - mauvais.total).toBe(25);
  });
});

describe('durée : aucune pénalité au-delà de 9 h', () => {
  it('un sommeil long ne coûte aucun point (l’AASM ne fixe pas de borne haute)', () => {
    const neufHeures = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_TST_MOY: 540 }));
    const onzeHeures = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_TST_MOY: 660 }));
    expect(onzeHeures.total).toBe(neufHeures.total);
    expect(axe(onzeHeures, 'DUREE').total).toBe(25);
  });

  it('un sommeil court reste pénalisé', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_TST_MOY: 300 }));
    expect(axe(r, 'DUREE').total!).toBeLessThan(25);
  });
});

describe('drapeau clinique — jamais des points', () => {
  it('temps au lit long + efficacité basse lève un drapeau sans retrancher de points', () => {
    // 10 h au lit pour 8 h de sommeil : efficacité 78 %, cible d'une restriction
    // de sommeil. Le drapeau le dit ; le total ne le confond pas avec un manque
    // de sommeil, qui appellerait la conduite inverse.
    const r = calculateScore(
      AGENDA_SOMMEIL_ID,
      agregats({ AGD_TIB_MOY: 600, AGD_TST_MOY: 480, AGD_EFF_MOY: 78 }),
    );
    expect(r.drapeaux).toHaveLength(1);
    expect(r.drapeaux[0]).toContain('restriction de sommeil');
    expect(axe(r, 'DUREE').total).toBe(25);
  });

  it('temps au lit long avec bonne efficacité ne lève aucun drapeau', () => {
    const r = calculateScore(
      AGENDA_SOMMEIL_ID,
      agregats({ AGD_TIB_MOY: 570, AGD_TST_MOY: 540, AGD_EFF_MOY: 95 }),
    );
    expect(r.drapeaux).toHaveLength(0);
  });
});

describe('ce qui n’entre PAS dans l’indice', () => {
  it('l’aide au sommeil ne bouge pas le total — c’est une exposition, pas un résultat', () => {
    const sansAide = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_NB_NUITS_AIDE: 0 }));
    const avecAide = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_NB_NUITS_AIDE: 15 }));
    expect(avecAide.total).toBe(sansAide.total);
  });

  it('mais un indice calculé sous aide ne se lit pas nu : un drapeau le dit', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_NB_NUITS_AIDE: 12 }));
    expect(r.drapeaux.some((d: string) => d.includes('12 sous aide au sommeil'))).toBe(true);
    // Aucune aide déclarée : aucun drapeau à ce titre.
    const sans = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_NB_NUITS_AIDE: 0 }));
    expect(sans.drapeaux.some((d: string) => d.includes('aide au sommeil'))).toBe(false);
  });

  it('la fréquence ne bouge pas le total — même grandeur que l’efficacité déjà présente', () => {
    const rare = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_FREQ_CRITERE_SEM: 0 }));
    const frequent = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_FREQ_CRITERE_SEM: 6 }));
    expect(frequent.total).toBe(rare.total);
  });

  it('au-delà de 3 nuits/semaine, la convention est nommée — jamais conclue', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_FREQ_CRITERE_SEM: 4 }));
    const drapeau = r.drapeaux.find((d: string) => d.includes('nuits/semaine'));
    expect(drapeau).toContain('convention de recherche');
    // Le drapeau rapporte un nombre et sa convention, il ne pose aucun diagnostic.
    expect(drapeau).not.toMatch(/insomnie|trouble|pathologi/i);
  });
});

// Constat B2 de la revue du 2026-07-28. `minNuits` porte sur le compte global,
// pas sur la couverture de chaque axe : une fenêtre mêlant des nuits d'avant et
// d'après un changement de contrat pouvait faire reposer la durée ET
// l'efficacité sur une seule nuit, et l'indice variait alors de 50 points selon
// cette nuit — sans que rien ne le signale.
describe('plancher de couverture par axe', () => {
  const cohorteTransition = (bonne: boolean) =>
    agregats({
      AGD_NB_NUITS: 21,
      AGD_NB_NUITS_TST: 1, // une seule nuit porte les champs nécessaires
      AGD_NB_NUITS_EFF: 1,
      AGD_TST_MOY: bonne ? 470 : 240,
      AGD_EFF_MOY: bonne ? 95 : 65,
    });

  it('durée et efficacité sur une seule nuit : aucun indice n’est produit', () => {
    // Deux axes tombent, il n'en reste que deux — sous le minimum de trois. Le
    // recueil part au praticien sans total, plutôt qu'avec un total que rien ne
    // soutient.
    const bonne = calculateScore(AGENDA_SOMMEIL_ID, cohorteTransition(true));
    const mauvaise = calculateScore(AGENDA_SOMMEIL_ID, cohorteTransition(false));
    expect(bonne.scored).toBe(false);
    expect(mauvaise.scored).toBe(false);
    expect(bonne.total).toBeUndefined();
  });

  it('un seul axe non soutenu : l’indice tient, mais cet axe n’y pèse plus', () => {
    const sousEchantillonne = (eff: number) =>
      agregats({ AGD_NB_NUITS_EFF: 1, AGD_EFF_MOY: eff });
    const bonne = calculateScore(AGENDA_SOMMEIL_ID, sousEchantillonne(95));
    const mauvaise = calculateScore(AGENDA_SOMMEIL_ID, sousEchantillonne(65));
    expect(bonne.scored).toBe(true);
    expect(bonne.nbAxesCouverts).toBe(3);
    expect(axe(bonne, 'EFF').total).toBeNull();
    // L'unique nuit d'efficacité ne déplace plus le total d'un point.
    expect(bonne.total).toBe(mauvaise.total);
  });

  it('un agenda d’avant les compteurs de couverture reste scoré', () => {
    const sansCompteurs = agregats();
    delete (sansCompteurs as Record<string, unknown>).AGD_NB_NUITS_TST;
    delete (sansCompteurs as Record<string, unknown>).AGD_NB_NUITS_EFF;
    const r = calculateScore(AGENDA_SOMMEIL_ID, sansCompteurs);
    expect(r.scored).toBe(true);
    expect(r.nbAxesCouverts).toBe(4);
  });
});

describe('métriques non couvertes — null, jamais 0', () => {
  it('moins de trois axes couverts : pas d’indice plutôt qu’un indice bancal', () => {
    const r = calculateScore(
      AGENDA_SOMMEIL_ID,
      agregats({ AGD_TST_MOY: null, AGD_EFF_MOY: null }),
    );
    expect(r.scored).toBe(false);
  });

  it('trois axes sur quatre suffisent, avec renormalisation et non un 0 implicite', () => {
    const r = calculateScore(AGENDA_SOMMEIL_ID, agregats({ AGD_EFF_MOY: null }));
    expect(r.scored).toBe(true);
    expect(r.nbAxesCouverts).toBe(3);
    expect(r.total).toBe(100); // les trois axes couverts sont au plateau
    expect(axe(r, 'EFF').total).toBeNull();
  });
});

describe('bornes', () => {
  it('total borné à [0,100] même avec des valeurs extrêmes', () => {
    const r = calculateScore(
      AGENDA_SOMMEIL_ID,
      agregats({
        AGD_TST_MOY: 60,
        AGD_EFF_MOY: 10,
        AGD_LAT_MED: 120,
        AGD_REG_ECT: 360,
        AGD_QUAL_MOY: 1,
      }),
    );
    expect(r.total).toBe(0);
    expect(r.interpretation.color).toBe('danger');
  });
});
