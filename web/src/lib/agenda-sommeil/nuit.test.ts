import { describe, expect, it } from 'vitest';
import {
  decalerDate,
  ensureNuitReponses,
  estDateSaisissable,
  estDateValide,
  resolveNuitsActives,
} from './nuit';
import { NB_REVEILS_MAX, type NuitRow } from './types';

const express = { heureCoucher: '23:00', heureLever: '07:00', latence: 'lt15', qualite: 4 };

// Nuit complète au sens du contrat v2, telle qu'une écriture doit la fournir.
const v2 = {
  ...express,
  reveils: { dureeTotale: 'aucun' },
  aideSommeil: 'aucune',
  extinctionImmediate: true,
  leverImmediat: true,
};

// L'écriture est stricte, la lecture tolérante — c'est toute la raison d'être du
// drapeau. Ces tests protègent la frontière : la resserrer casserait la lecture
// de l'historique, la desserrer laisserait entrer des zéros inventés.
describe('lecture de l’héritage v1 (tolérante)', () => {
  it('lit une nuit v1 sans aucun des trois champs obligatoires', () => {
    const r = ensureNuitReponses({ ...express, contractVersion: 'agenda-sommeil-v1' });
    expect(r.reveils).toBeUndefined();
    expect(r.aideSommeil).toBeUndefined();
    expect(r.leverImmediat).toBeUndefined();
  });

  it('lit une classe d’éveil héritée sans lever — sinon l’historique devient illisible', () => {
    for (const heritee of ['e15_45', 'gt45']) {
      const r = ensureNuitReponses({ ...express, reveils: { dureeTotale: heritee } });
      expect(r.reveils?.dureeTotale).toBe(heritee);
    }
  });

  it('refuse ces mêmes classes en écriture', () => {
    expect(() =>
      ensureNuitReponses({ ...v2, reveils: { dureeTotale: 'e15_45' } }, { exigerObligatoires: true }),
    ).toThrow(TypeError);
  });

  it('normalise l’artefact v1 « 0 réveil » en lecture, sans jamais lever', () => {
    const r = ensureNuitReponses({ ...express, reveils: { nombre: 0, dureeTotale: 'lt15' } });
    expect(r.reveils?.dureeTotale).toBe('aucun');
  });

  // Constat non bloquant de la revue : `toNuitRow` re-valide chaque ligne lue.
  // Une règle d'ordre appliquée en lecture ferait lever le GET entier d'un
  // patient sur une ligne historique bancale — un incident de production pour
  // une donnée qui n'a jamais servi.
  it('lit une ligne aux heures incohérentes sans lever (les ordres sont une règle d’écriture)', () => {
    const bancale = { ...express, heureReveilFinal: '08:00' }; // après le lever
    expect(() => ensureNuitReponses(bancale)).not.toThrow();
    expect(() => ensureNuitReponses(bancale, { exigerObligatoires: true })).toThrow(TypeError);
  });

  it('conserve les champs facultatifs même quand les contrôles d’écriture sont sautés', () => {
    // La lecture court-circuite les contrôles d'ordre ; elle ne doit pas pour
    // autant court-circuiter la suite du parsing.
    const r = ensureNuitReponses({
      ...express,
      forme: 3,
      siesteVeille: 'lt20',
      facteurs: { stress: true },
      commentaire: 'nuit agitée',
    });
    expect(r.forme).toBe(3);
    expect(r.siesteVeille).toBe('lt20');
    expect(r.facteurs).toEqual({ stress: true });
    expect(r.commentaire).toBe('nuit agitée');
  });
});

describe('écriture v2 (stricte)', () => {
  it('accepte une nuit complète', () => {
    const r = ensureNuitReponses(v2, { exigerObligatoires: true });
    expect(r.aideSommeil).toBe('aucune');
    expect(r.leverImmediat).toBe(true);
  });

  it('exige les quatre champs obligatoires', () => {
    for (const champ of [
      'reveils',
      'aideSommeil',
      'extinctionImmediate',
      'leverImmediat',
    ] as const) {
      const { [champ]: _absent, ...incomplet } = v2;
      expect(() => ensureNuitReponses(incomplet, { exigerObligatoires: true })).toThrow(TypeError);
    }
  });

  // Constat B1 de la revue du 2026-07-28. Le formulaire posait `nombre: 0` au
  // choix « nuit continue » et ne le remettait pas à `undefined` ensuite : un
  // patient qui se ravisait envoyait `{ dureeTotale: 'e30_60', nombre: 0 }`, et
  // la normalisation v1 réécrivait sa classe en « aucun ». Un éveil DÉCLARÉ
  // devenait WASO = 0, indiscernable en base d'une vraie nuit continue.
  it('ne réécrit JAMAIS une classe d’éveil déclarée à cause d’un compte résiduel', () => {
    expect(() =>
      ensureNuitReponses(
        { ...v2, reveils: { dureeTotale: 'e30_60', nombre: 0 } },
        { exigerObligatoires: true },
      ),
    ).toThrow(TypeError);
  });

  it('refuse aussi la contradiction inverse : nuit continue avec des réveils comptés', () => {
    expect(() =>
      ensureNuitReponses(
        { ...v2, reveils: { dureeTotale: 'aucun', nombre: 2 } },
        { exigerObligatoires: true },
      ),
    ).toThrow(TypeError);
  });

  // v3 : le compte est EXACT — « 3 ou plus » n'existe plus à l'écriture. La
  // fragmentation au-delà de trois réveils, jusqu'ici écrasée sur la valeur 3,
  // doit passer telle que déclarée.
  it('accepte un compte exact au-delà de trois (v3)', () => {
    const r = ensureNuitReponses(
      { ...v2, reveils: { dureeTotale: 'e30_60', nombre: 7 } },
      { exigerObligatoires: true },
    );
    expect(r.reveils).toEqual({ dureeTotale: 'e30_60', nombre: 7 });
  });

  it('borne le compte par vraisemblance (NB_REVEILS_MAX), à l’écriture comme en lecture', () => {
    const invraisemblable = { dureeTotale: 'gt60', nombre: NB_REVEILS_MAX + 1 };
    expect(() =>
      ensureNuitReponses({ ...v2, reveils: invraisemblable }, { exigerObligatoires: true }),
    ).toThrow(TypeError);
    // En lecture aussi : aucune ligne ne peut en porter davantage, le contrat
    // v3 naît avec la borne — la refuser ne rend aucun historique illisible.
    expect(() => ensureNuitReponses({ ...express, reveils: invraisemblable })).toThrow(TypeError);
  });

  it('refuse une mise au lit contradictoire avec le mode de coucher', () => {
    expect(() =>
      ensureNuitReponses({ ...v2, heureMiseAuLit: '22:00' }, { exigerObligatoires: true }),
    ).toThrow(TypeError);
    expect(() =>
      ensureNuitReponses({ ...v2, extinctionImmediate: false }, { exigerObligatoires: true }),
    ).toThrow(TypeError);
  });

  it('refuse une mise au lit postérieure à l’extinction', () => {
    // 23:30 est après l'extinction (23:00) : le temps au lit avant extinction
    // serait négatif, donc l'efficacité fausse — et fausse dans le sens
    // flatteur, le pire des deux.
    expect(() =>
      ensureNuitReponses(
        { ...v2, extinctionImmediate: false, heureMiseAuLit: '23:30' },
        { exigerObligatoires: true },
      ),
    ).toThrow(TypeError);
  });

  it('accepte les quatre ancres dans l’ordre, minuit traversé', () => {
    const r = ensureNuitReponses(
      {
        ...v2,
        extinctionImmediate: false,
        heureMiseAuLit: '22:00',
        leverImmediat: false,
        heureReveilFinal: '05:00',
      },
      { exigerObligatoires: true },
    );
    expect(r.heureMiseAuLit).toBe('22:00');
    expect(r.heureReveilFinal).toBe('05:00');
  });

  it('refuse un réveil antérieur à l’extinction quand les quatre ancres sont là', () => {
    // 22:30 tombe entre la mise au lit et l'extinction : ce n'est pas un réveil.
    expect(() =>
      ensureNuitReponses(
        {
          ...v2,
          extinctionImmediate: false,
          heureMiseAuLit: '22:00',
          leverImmediat: false,
          heureReveilFinal: '22:30',
        },
        { exigerObligatoires: true },
      ),
    ).toThrow(TypeError);
  });

  it('refuse un réveil final contradictoire avec le mode de lever', () => {
    expect(() =>
      ensureNuitReponses({ ...v2, heureReveilFinal: '05:00' }, { exigerObligatoires: true }),
    ).toThrow(TypeError);
    expect(() =>
      ensureNuitReponses({ ...v2, leverImmediat: false }, { exigerObligatoires: true }),
    ).toThrow(TypeError);
  });

  it('refuse un réveil final situé après la sortie du lit', () => {
    // 08:00 est au-delà du lever (07:00) : l'éveil au lit serait négatif, donc
    // le TST gonflé. Une nuit fausse vaut moins qu'une nuit absente.
    expect(() =>
      ensureNuitReponses(
        { ...v2, leverImmediat: false, heureReveilFinal: '08:00' },
        { exigerObligatoires: true },
      ),
    ).toThrow(TypeError);
  });

  it('accepte un réveil final avant le lever, minuit traversé', () => {
    const r = ensureNuitReponses(
      { ...v2, leverImmediat: false, heureReveilFinal: '05:00' },
      { exigerObligatoires: true },
    );
    expect(r.heureReveilFinal).toBe('05:00');
    expect(r.leverImmediat).toBe(false);
  });
});

describe('ensureNuitReponses', () => {
  it('accepte une nuit express valide', () => {
    const r = ensureNuitReponses(express);
    expect(r.heureCoucher).toBe('23:00');
    expect(r.qualite).toBe(4);
  });

  it('ignore les clés supplémentaires (contractVersion)', () => {
    const r = ensureNuitReponses({ ...express, contractVersion: 'agenda-sommeil-v1' });
    expect(r).not.toHaveProperty('contractVersion');
  });

  it('rejette une heure hors pas de 15 min', () => {
    expect(() => ensureNuitReponses({ ...express, heureCoucher: '23:07' })).toThrow(TypeError);
  });

  it('rejette une latence hors classe', () => {
    expect(() => ensureNuitReponses({ ...express, latence: '12min' })).toThrow(TypeError);
  });

  it('rejette une qualité hors 1..5', () => {
    expect(() => ensureNuitReponses({ ...express, qualite: 6 })).toThrow(TypeError);
    expect(() => ensureNuitReponses({ ...express, qualite: 3.5 })).toThrow(TypeError);
  });

  it('accepte les champs facultatifs valides', () => {
    const r = ensureNuitReponses({
      ...express,
      reveils: { nombre: 2, dureeTotale: 'e15_45' },
      forme: 3,
      siesteVeille: 'lt20',
      facteurs: { cafeApres14h: true, alcool: false },
      commentaire: 'nuit agitée',
    });
    expect(r.reveils).toEqual({ nombre: 2, dureeTotale: 'e15_45' });
    expect(r.facteurs).toEqual({ cafeApres14h: true, alcool: false });
    expect(r.commentaire).toBe('nuit agitée');
  });

  it('rejette un commentaire de plus de 200 caractères', () => {
    expect(() => ensureNuitReponses({ ...express, commentaire: 'x'.repeat(201) })).toThrow(
      TypeError,
    );
  });

  it('rejette un facteur non booléen', () => {
    expect(() => ensureNuitReponses({ ...express, facteurs: { alcool: 'oui' } })).toThrow(TypeError);
  });
});

describe('estDateValide', () => {
  it('accepte une date réelle', () => {
    expect(estDateValide('2026-07-25')).toBe(true);
  });
  it('rejette une date impossible', () => {
    expect(estDateValide('2026-13-40')).toBe(false);
    expect(estDateValide('25-07-2026')).toBe(false);
  });
});

describe('decalerDate', () => {
  it('décale d’un jour en avant et en arrière', () => {
    expect(decalerDate('2026-07-25', 1)).toBe('2026-07-26');
    expect(decalerDate('2026-07-25', -1)).toBe('2026-07-24');
  });
  it('franchit une frontière de mois', () => {
    expect(decalerDate('2026-07-31', 1)).toBe('2026-08-01');
    expect(decalerDate('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('estDateSaisissable', () => {
  const today = '2026-07-25';
  it('accepte aujourd’hui et la veille', () => {
    expect(estDateSaisissable('2026-07-25', today)).toBe(true);
    expect(estDateSaisissable('2026-07-24', today)).toBe(true);
  });
  it('refuse l’avant-veille et le futur', () => {
    expect(estDateSaisissable('2026-07-23', today)).toBe(false);
    expect(estDateSaisissable('2026-07-26', today)).toBe(false);
  });
});

describe('resolveNuitsActives — chaînage append-only', () => {
  const base = (over: Partial<NuitRow>): NuitRow => ({
    id: 'n1',
    idPatient: 'PAT',
    idAssignation: 'ASS',
    dateNuit: '2026-07-24',
    reponses: ensureNuitReponses(express),
    canal: 'portail',
    supersedesNuitId: null,
    soumisLe: '2026-07-24T07:00:00.000Z',
    ...over,
  });

  it('une seule nuit par date : garde la tête de chaîne (correction)', () => {
    const rows: NuitRow[] = [
      base({ id: 'n1', dateNuit: '2026-07-24', soumisLe: '2026-07-24T07:00:00.000Z' }),
      base({
        id: 'n2',
        dateNuit: '2026-07-24',
        supersedesNuitId: 'n1',
        soumisLe: '2026-07-25T08:00:00.000Z',
      }),
    ];
    const actives = resolveNuitsActives(rows);
    expect(actives).toHaveLength(1);
    expect(actives[0].id).toBe('n2');
  });

  it('conserve une nuit par date distincte, triées chronologiquement', () => {
    const rows: NuitRow[] = [
      base({ id: 'b', dateNuit: '2026-07-25' }),
      base({ id: 'a', dateNuit: '2026-07-24' }),
    ];
    const actives = resolveNuitsActives(rows);
    expect(actives.map((n) => n.dateNuit)).toEqual(['2026-07-24', '2026-07-25']);
  });
});
