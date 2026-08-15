import { describe, expect, it } from 'vitest';
import { arbitragesSansRevision, type ArbitrageFilRow } from './biologieArbitree';
import { cartesBiologieArbitree, cleCarte, construireFil, resumeFil } from './cartes';

function arbitrage(surcharge: Partial<ArbitrageFilRow> = {}): ArbitrageFilRow {
  return {
    idPatient: 'PAT_1',
    protocolDraftId: 'proto_dc1#v1',
    intentionId: 'act-fer',
    verdict: 'infirme',
    arbitreLe: new Date('2026-08-15T09:00:00.000Z'),
    ...surcharge,
  };
}

describe('arbitragesSansRevision — différence entre deux artefacts persistés', () => {
  it('retient un arbitrage résolutif sur une version non supplantée', () => {
    const lignes = arbitragesSansRevision([arbitrage()], [
      { id: 'proto_dc1#v1', supersedesDraftId: null },
    ]);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ protocolDraftId: 'proto_dc1#v1', nbIntentions: 1 });
  });

  it('la révision éteint la carte : version supplantée, plus rien', () => {
    const lignes = arbitragesSansRevision([arbitrage()], [
      { id: 'proto_dc1#v1', supersedesDraftId: null },
      { id: 'proto_dc1#v2', supersedesDraftId: 'proto_dc1#v1' },
    ]);
    expect(lignes).toEqual([]);
  });

  it('un verdict sans_objet n’appelle aucune révision', () => {
    const lignes = arbitragesSansRevision(
      [arbitrage({ verdict: 'sans_objet' })],
      [{ id: 'proto_dc1#v1', supersedesDraftId: null }],
    );
    expect(lignes).toEqual([]);
  });

  it('agrège par version : compte des intentions, date du dernier arbitrage', () => {
    const lignes = arbitragesSansRevision(
      [
        arbitrage({ intentionId: 'act-fer', arbitreLe: new Date('2026-08-14T09:00:00.000Z') }),
        arbitrage({ intentionId: 'act-zinc', verdict: 'confirme', arbitreLe: new Date('2026-08-15T09:00:00.000Z') }),
      ],
      [{ id: 'proto_dc1#v1', supersedesDraftId: null }],
    );
    expect(lignes).toHaveLength(1);
    expect(lignes[0].nbIntentions).toBe(2);
    expect(lignes[0].arbitreLe.toISOString()).toBe('2026-08-15T09:00:00.000Z');
  });
});

describe('cartesBiologieArbitree', () => {
  const NOMS = new Map([['PAT_1', 'Sophie Nicola']]);
  const LIGNE = {
    idPatient: 'PAT_1',
    protocolDraftId: 'proto_dc1#v1',
    arbitreLe: new Date('2026-08-15T09:00:00.000Z'),
    nbIntentions: 2,
  };

  it('produit une carte ancrée sur la version arbitrée', () => {
    const [carte] = cartesBiologieArbitree([LIGNE], NOMS);
    expect(carte.type).toBe('biologie_arbitree');
    expect(carte.titre).toBe('Biologie arbitrée — protocole à réviser');
    expect(carte.cle).toBe(cleCarte('biologie_arbitree', 'proto_dc1#v1'));
    expect(carte.pourquoi).toContain('2 intentions en attente de résolution');
    expect(carte.nbElements).toBe(2);
  });

  it('entre dans l’ordre du Fil (après les jalons) et dans le résumé', () => {
    const cartes = construireFil({
      syntheses: [],
      jalons: [{ idCheckin: 'chk1', idPatient: 'PAT_1', soumisLe: new Date('2026-08-14T09:00:00.000Z') }],
      biologiesArbitrees: [LIGNE],
      assignations: [],
      activites: [],
      noms: NOMS,
      maintenant: new Date('2026-08-15T10:00:00.000Z'),
    });
    const types = cartes.map(c => c.type);
    expect(types.indexOf('jalon_j21')).toBeLessThan(types.indexOf('biologie_arbitree'));
    expect(resumeFil(cartes)).toContain('2 biologies arbitrées');
  });
});
