import { describe, expect, it } from 'vitest';

import {
  BANDES_DE_BRUIT,
  bandePourBesoin,
  calculerMomentumParBesoin,
  MOMENTUM_PAR_BESOIN_VERSION,
  type BandesMetadata,
  type LectureBesoin,
} from './momentumParBesoin';

// Ce que cette matrice défend (`D-058`) : sur le dépôt d'aujourd'hui — aucune
// bande de bruit publiée — le momentum par besoin rend le delta et NE LE
// QUALIFIE PAS. Et un besoin non re-mesuré n'a pas de momentum : ni zéro, ni
// « stable », ni silence.

const VERSION = 'equilibre-v15';

const lecture = (jalon: LectureBesoin['jalon'], couverture: number): LectureBesoin => ({
  jalon,
  date: new Date(`2026-01-0${jalon === 'T0' ? 1 : 2}T00:00:00.000Z`),
  couverture,
});

function momentum(series: Map<number, LectureBesoin[]>, metadata?: BandesMetadata) {
  return calculerMomentumParBesoin({
    series,
    versionScoreCycle: VERSION,
    versionScoreCourante: VERSION,
    metadata,
  });
}

const BANDE_PUBLIEE: BandesMetadata = {
  version: MOMENTUM_PAR_BESOIN_VERSION,
  publiee: true,
  datePublication: '2026-09-01',
  bandes: [{ besoin: 4, ecartMinimal: 5, source: 'fidélité test-retest fixture' }],
};

describe('Bandes de bruit — la table est vide et non publiée', () => {
  it('la table livrée n’est pas publiée et ne contient rien', () => {
    // L'état du dépôt. Ce banc rougit le jour où quelqu'un publie une bande
    // sans passer par une décision — c'est exactement ce qu'il garde.
    expect(BANDES_DE_BRUIT.publiee).toBe(false);
    expect(BANDES_DE_BRUIT.bandes).toHaveLength(0);
    expect(BANDES_DE_BRUIT.datePublication).toBeNull();
  });

  it('aucune bande n’est utilisable tant que la table n’est pas publiée', () => {
    // Même si quelqu'un ajoutait une entrée sans lever `publiee` : la table
    // non publiée ne rend rien, comme une table clinique non signée.
    expect(bandePourBesoin(4, {
      ...BANDE_PUBLIEE, publiee: false,
    })).toBeNull();
  });
});

describe('Momentum par besoin — ce qui n’est pas mesuré n’a pas de momentum', () => {
  it('un besoin à une seule lecture n’a PAS de momentum — ni 0, ni « stable »', () => {
    const [resultat] = momentum(new Map([[4, [lecture('T0', 60)]]]));
    expect(resultat.mesure).toBe(false);
    expect(resultat.delta).toBeNull();
    expect(resultat.qualification).toBeNull();
    expect(resultat.motif).toContain('n’est pas une stabilité');
  });

  it('un besoin re-mesuré rend son delta factuel', () => {
    const [resultat] = momentum(new Map([[4, [lecture('T0', 60), lecture('J21', 72)]]]));
    expect(resultat.mesure).toBe(true);
    expect(resultat.delta).toBe(12);
  });

  it('un besoin re-mesuré à l’identique rend un delta de 0 — et ce n’est pas « stable »', () => {
    // LE PIÈGE que `D-058` nomme : le scalaire existant appelle « stable » un
    // delta exactement nul. Ici, 0 est un delta comme un autre, et il n'est pas
    // qualifié tant qu'aucune bande ne dit ce que 0 vaut.
    const [resultat] = momentum(new Map([[4, [lecture('T0', 60), lecture('J21', 60)]]]));
    expect(resultat.mesure).toBe(true);
    expect(resultat.delta).toBe(0);
    expect(resultat.qualification).toBeNull();
  });

  it('rend les besoins dans un ordre déterministe', () => {
    const resultats = momentum(new Map([
      [9, [lecture('T0', 40), lecture('J21', 45)]],
      [1, [lecture('T0', 50), lecture('J21', 55)]],
    ]));
    expect(resultats.map(r => r.besoin)).toEqual([1, 9]);
  });
});

describe('Momentum par besoin — sans bande publiée, rien n’est qualifié', () => {
  it('ne qualifie AUCUN besoin sur la table livrée', () => {
    const resultats = momentum(new Map([
      [1, [lecture('T0', 50), lecture('J21', 51)]],
      [4, [lecture('T0', 60), lecture('J21', 90)]],
    ]));
    expect(resultats.every(r => r.qualification === null)).toBe(true);
  });

  it('donne un motif, pas un silence — y compris sur un écart énorme', () => {
    const [resultat] = momentum(new Map([[4, [lecture('T0', 10), lecture('J21', 95)]]]));
    expect(resultat.delta).toBe(85);
    expect(resultat.motif).toContain('aucune bande de bruit n’est publiée');
  });

  it('qualifie de part et d’autre de la borne dès qu’une bande est publiée', () => {
    // Le mécanisme est prouvé ici, en fixture ; la table de production reste
    // vide. C'est le même partage que pour les tables cliniques non signées.
    const [petit] = momentum(new Map([[4, [lecture('T0', 60), lecture('J21', 63)]]]), BANDE_PUBLIEE);
    expect(petit).toMatchObject({ delta: 3, qualification: 'dans_la_bande' });

    const [grand] = momentum(new Map([[4, [lecture('T0', 60), lecture('J21', 70)]]]), BANDE_PUBLIEE);
    expect(grand).toMatchObject({ delta: 10, qualification: 'au_dessus_de_la_bande' });
  });

  it('une bande publiée ne couvrant PAS le besoin ne qualifie pas ce besoin', () => {
    const [resultat] = momentum(new Map([[1, [lecture('T0', 60), lecture('J21', 70)]]]), BANDE_PUBLIEE);
    expect(resultat.qualification).toBeNull();
  });
});

describe('Momentum par besoin — les versions de score ne se soustraient pas', () => {
  it('refuse de soustraire deux lectures de versions différentes', () => {
    const [resultat] = calculerMomentumParBesoin({
      series: new Map([[4, [lecture('T0', 60), lecture('J21', 72)]]]),
      versionScoreCycle: 'equilibre-v14',
      versionScoreCourante: VERSION,
    });
    expect(resultat).toMatchObject({ mesure: false, delta: null });
    expect(resultat.motif).toContain('ne se soustraient pas');
  });

  it('refuse aussi sur une version de cycle INCONNUE — jamais assimilée à la courante', () => {
    const [resultat] = calculerMomentumParBesoin({
      series: new Map([[4, [lecture('T0', 60), lecture('J21', 72)]]]),
      versionScoreCycle: null,
      versionScoreCourante: VERSION,
    });
    expect(resultat).toMatchObject({ mesure: false, delta: null });
  });
});
