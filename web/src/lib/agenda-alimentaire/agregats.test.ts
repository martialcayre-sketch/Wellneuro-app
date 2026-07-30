import { describe, expect, it } from 'vitest';
import {
  calculerAgregatsAli,
  compterJoursPlausibles,
  couvertureSuffisante,
  estWeekEnd,
  heuresHabituelles,
  type JourAgregable,
} from './agregats';
import { decalerDate } from './jour';
import { MIN_JOURS_AGREGATS, MIN_PAIRES_JEUNE, type JourReponses } from './types';

const DEBUT = '2026-07-06'; // un lundi

function journee(over: Partial<JourReponses> = {}): JourReponses {
  return {
    prises: [
      { heure: '07:30', nature: 'repas' },
      { heure: '12:30', nature: 'repas' },
      { heure: '19:30', nature: 'repas' },
    ],
    premierePriseProteines: true,
    legumesDeuxPrises: true,
    fruitsOuOleagineux: true,
    ultraTransformes: false,
    ...over,
  };
}

/** n journées consécutives à partir de DEBUT. */
function serie(n: number, over: (i: number) => Partial<JourReponses> = () => ({})): JourAgregable[] {
  return Array.from({ length: n }, (_, i) => ({
    dateJour: decalerDate(DEBUT, i),
    reponses: journee(over(i)),
  }));
}

describe('estWeekEnd', () => {
  it('reconnaît samedi et dimanche, et eux seuls', () => {
    expect(estWeekEnd('2026-07-11')).toBe(true);
    expect(estWeekEnd('2026-07-12')).toBe(true);
    expect(estWeekEnd('2026-07-10')).toBe(false);
    expect(estWeekEnd('2026-07-06')).toBe(false);
  });
});

describe('calculerAgregatsAli — le seuil des agrégats', () => {
  it('rend null en dessous de sept jours, plutôt qu’un objet de zéros', () => {
    expect(calculerAgregatsAli(serie(MIN_JOURS_AGREGATS - 1))).toBeNull();
  });

  it('rend des agrégats dès sept jours', () => {
    const a = calculerAgregatsAli(serie(MIN_JOURS_AGREGATS));
    expect(a).not.toBeNull();
    expect(a?.nbJours).toBe(7);
  });

  it('exclut une journée non plausible du décompte', () => {
    const jours = serie(8);
    jours[3].reponses = {
      prises: [
        { heure: '05:00', nature: 'repas' },
        { heure: '00:30', nature: 'hors_repas' },
      ],
    };
    expect(compterJoursPlausibles(jours)).toBe(7);
    expect(calculerAgregatsAli(jours)?.nbJours).toBe(7);
  });
});

describe('le jeûne nocturne se compte en paires, pas en jours', () => {
  it('un recueil un jour sur deux porte des jours et zéro paire', () => {
    const jours: JourAgregable[] = Array.from({ length: 8 }, (_, i) => ({
      dateJour: decalerDate(DEBUT, i * 2),
      reponses: journee(),
    }));
    const a = calculerAgregatsAli(jours);
    expect(a?.nbJours).toBe(8);
    expect(a?.nbPairesJeune).toBe(0);
    // Et donc aucune médiane : la grandeur n'est pas couverte, elle n'est pas nulle.
    expect(a?.jeuneMedian).toBeNull();
  });

  it('une journée sans prise invalide les deux paires qui la touchent', () => {
    const jours = serie(10);
    jours[4].reponses = { aucunePrise: true };
    const a = calculerAgregatsAli(jours);
    // 9 paires possibles sur 10 jours ; celle qui arrive sur J5 et celle qui en
    // part sont écartées — un intervalle de plus de 24 h n'est pas un jeûne.
    expect(a?.nbPairesJeune).toBe(7);
    expect(a?.nbJoursSansPrise).toBe(1);
  });

  it('n’émet pas de médiane en dessous du seuil de paires', () => {
    const jours = serie(MIN_PAIRES_JEUNE); // 7 jours ⇒ 6 paires
    const a = calculerAgregatsAli(jours);
    expect(a?.nbPairesJeune).toBe(MIN_PAIRES_JEUNE - 1);
    expect(a?.jeuneMedian).toBeNull();
  });

  it('émet la médiane dès le seuil atteint', () => {
    const a = calculerAgregatsAli(serie(MIN_PAIRES_JEUNE + 1));
    expect(a?.nbPairesJeune).toBe(MIN_PAIRES_JEUNE);
    expect(a?.jeuneMedian).toBe(720);
  });
});

describe('la couverture est portée métrique par métrique', () => {
  it('un contenu partiellement renseigné n’est pas un contenu pauvre', () => {
    const jours = serie(10, (i) =>
      i < 4
        ? {}
        : {
            legumesDeuxPrises: undefined,
            fruitsOuOleagineux: undefined,
            ultraTransformes: undefined,
          },
    );
    const a = calculerAgregatsAli(jours);
    expect(a?.nbJours).toBe(10);
    expect(a?.nbJoursContenuConnu).toBe(4);
    // La fréquence porte sur les jours CONNUS, pas sur les dix.
    expect(a?.freqLegumesSem).toBe(7);
    // Les protéines, elles, restent connues partout : les couvertures sont indépendantes.
    expect(a?.nbJoursProteinesConnu).toBe(10);
  });

  it('rend null — jamais 0 — quand aucune journée ne porte l’information', () => {
    const a = calculerAgregatsAli(
      serie(10, () => ({
        legumesDeuxPrises: undefined,
        fruitsOuOleagineux: undefined,
        ultraTransformes: undefined,
        soirPlusCopieux: undefined,
      })),
    );
    expect(a?.nbJoursContenuConnu).toBe(0);
    expect(a?.freqLegumesSem).toBeNull();
    expect(a?.freqUltraTransformesSem).toBeNull();
    expect(a?.freqSoirCopieuxSem).toBeNull();
  });

  it('distingue « jamais de légumes » de « légumes inconnus »', () => {
    const jamais = calculerAgregatsAli(serie(10, () => ({ legumesDeuxPrises: false })));
    expect(jamais?.freqLegumesSem).toBe(0);
    const inconnu = calculerAgregatsAli(
      serie(10, () => ({
        legumesDeuxPrises: undefined,
        fruitsOuOleagineux: undefined,
        ultraTransformes: undefined,
      })),
    );
    expect(inconnu?.freqLegumesSem).toBeNull();
  });
});

describe('structure et régularité', () => {
  it('compte les repas et les prises hors repas séparément', () => {
    const a = calculerAgregatsAli(
      serie(8, (i) =>
        i < 4
          ? {
              prises: [
                { heure: '07:30', nature: 'repas' },
                { heure: '12:30', nature: 'repas' },
                { heure: '16:00', nature: 'hors_repas' },
                { heure: '19:30', nature: 'repas' },
              ],
            }
          : {},
      ),
    );
    expect(a?.nbRepasMoyen).toBe(3);
    expect(a?.nbHorsRepasMoyen).toBe(0.5);
    expect(a?.freqHorsRepasSem).toBe(3.5); // 4 jours sur 8
  });

  it('compte les jours à moins de deux repas structurés', () => {
    const a = calculerAgregatsAli(
      serie(8, (i) => (i < 2 ? { prises: [{ heure: '19:30', nature: 'repas' }] } : {})),
    );
    // 2 jours sur 8 ramenés à sept jours = 1,75, arrondi au dixième.
    expect(a?.freqMoinsDeuxRepasSem).toBe(1.8);
  });

  it('rend un écart-type nul sur des horaires identiques, non nul sinon', () => {
    const regulier = calculerAgregatsAli(serie(8));
    expect(regulier?.regularitePremiereEcartType).toBe(0);

    const irregulier = calculerAgregatsAli(
      serie(8, (i) => ({
        prises: [
          { heure: i % 2 === 0 ? '06:00' : '11:00', nature: 'repas' },
          { heure: '19:30', nature: 'repas' },
        ],
      })),
    );
    expect(irregulier?.regularitePremiereEcartType).toBeGreaterThan(150);
  });

  it('mesure la fenêtre alimentaire moyenne', () => {
    expect(calculerAgregatsAli(serie(8))?.fenetreAliMoyenne).toBe(720); // 07:30 → 19:30
  });
});

describe('couvertureSuffisante — compte ET week-end', () => {
  it('quatorze jours de semaine ne suffisent pas', () => {
    // Quatorze jours consécutifs contiennent forcément des week-ends : on
    // construit donc une série qui les évite explicitement.
    const joursSemaine = Array.from({ length: 15 }, (_, i) => decalerDate(DEBUT, i))
      .filter((d) => !estWeekEnd(d))
      .map((dateJour) => ({ dateJour, reponses: journee() }));
    expect(joursSemaine.length).toBeLessThan(14);
    expect(couvertureSuffisante(joursSemaine)).toBe(false);
  });

  it('quatorze jours dont quatre de week-end suffisent', () => {
    const jours = serie(18);
    expect(jours.filter((j) => estWeekEnd(j.dateJour)).length).toBeGreaterThanOrEqual(4);
    expect(couvertureSuffisante(jours)).toBe(true);
  });

  it('un recueil complet mais sans assez de week-end ne suffit pas', () => {
    const jours = serie(21).filter((j) => !estWeekEnd(j.dateJour));
    expect(jours.length).toBeGreaterThanOrEqual(14);
    expect(couvertureSuffisante(jours)).toBe(false);
  });
});

describe('heuresHabituelles — des suggestions, pas une mesure', () => {
  it('ne suggère rien en dessous de trois journées', () => {
    expect(heuresHabituelles(serie(2))).toBeNull();
  });

  it('ne suggère pas un rang observé une minorité de jours', () => {
    const jours = serie(9, (i) =>
      i < 2
        ? {
            prises: [
              { heure: '07:30', nature: 'repas' },
              { heure: '12:30', nature: 'repas' },
              { heure: '19:30', nature: 'repas' },
              { heure: '22:00', nature: 'hors_repas' },
            ],
          }
        : {},
    );
    // La quatrième prise n'est vue que 2 fois sur 9 : la suggérer inviterait à la saisir.
    expect(heuresHabituelles(jours)).toHaveLength(3);
  });
});
