import { describe, expect, it } from 'vitest';
import { estLieeALaPriorite, hierarchiserAssiettes } from './hierarchieAssiettes';

// [[D-254]] — la hiérarchie lit la VRAIE table `BESOIN_SOURCES` : un lien
// fabriqué au banc prouverait que la fonction sait lire UNE table, pas celle qui
// est signée. Besoins cités : 4 (`Q_GAS_01`, `Q_INF_01` entiers), 8 (`Q_NEU_11`
// sous-score `D`), 10 (`Q_INF_03` sous-scores `DA`, `NA`, `SE`).

type Instrument = { idQuestionnaire: string; sousScore?: string };

function assiette(id: string, ...voies: Instrument[][]) {
  return { id, voiesAtteintes: voies.map(instruments => ({ instruments })) };
}

const ids = (liste: { id: string }[]) => liste.map(a => a.id);

describe('estLieeALaPriorite — le lien passe par la table signée des besoins', () => {
  it('un sous-score source couvre ce sous-score, et lui seul', () => {
    expect(estLieeALaPriorite(assiette('a', [{ idQuestionnaire: 'Q_INF_03', sousScore: 'DA' }]), [10])).toBe(true);
    expect(estLieeALaPriorite(assiette('a', [{ idQuestionnaire: 'Q_INF_03', sousScore: 'ME' }]), [10])).toBe(false);
    // Le TOTAL d'un questionnaire dont le besoin ne vise qu'un sous-score : non.
    expect(estLieeALaPriorite(assiette('a', [{ idQuestionnaire: 'Q_NEU_11' }]), [8])).toBe(false);
    expect(estLieeALaPriorite(assiette('a', [{ idQuestionnaire: 'Q_NEU_11', sousScore: 'D' }]), [8])).toBe(true);
  });

  it('une source ENTIÈRE couvre toutes les lectures de son questionnaire', () => {
    expect(estLieeALaPriorite(assiette('a', [{ idQuestionnaire: 'Q_GAS_01' }]), [4])).toBe(true);
    expect(estLieeALaPriorite(assiette('a', [{ idQuestionnaire: 'Q_GAS_01', sousScore: 'X' }]), [4])).toBe(true);
  });

  it('la SECONDE voie porte le lien à elle seule — la raison d’être de `voiesAtteintes`', () => {
    const a = assiette('a', [{ idQuestionnaire: 'Q_GAS_01' }], [{ idQuestionnaire: 'Q_INF_03', sousScore: 'SE' }]);
    expect(estLieeALaPriorite(a, [10])).toBe(true);
  });

  it('une voie d’anamnèse ou d’âge n’a pas d’instrument : jamais liée', () => {
    expect(estLieeALaPriorite(assiette('a', []), [4, 8, 10])).toBe(false);
  });

  it('aucun besoin visé : rien n’est lié', () => {
    expect(estLieeALaPriorite(assiette('a', [{ idQuestionnaire: 'Q_GAS_01' }]), [])).toBe(false);
  });
});

describe('hierarchiserAssiettes — la priorité visée, puis la convergence, puis la table', () => {
  const table = [
    assiette('une-voie-non-liee', [{ idQuestionnaire: 'Q_STR_01' }]),
    assiette('deux-voies-non-liee', [{ idQuestionnaire: 'Q_STR_01' }], []),
    assiette('une-voie-liee', [{ idQuestionnaire: 'Q_INF_03', sousScore: 'DA' }]),
    assiette('deux-voies-liee', [{ idQuestionnaire: 'Q_GAS_01' }], [{ idQuestionnaire: 'Q_INF_03', sousScore: 'NA' }]),
  ];

  it('les liées d’abord, chaque groupe classé par nombre de voies', () => {
    const { liees, autres } = hierarchiserAssiettes(table, [10]);
    expect(ids(liees)).toEqual(['deux-voies-liee', 'une-voie-liee']);
    expect(ids(autres)).toEqual(['deux-voies-non-liee', 'une-voie-non-liee']);
  });

  it('sans priorité visée : un seul groupe, classé par convergence', () => {
    const { liees, autres } = hierarchiserAssiettes(table, []);
    expect(liees).toEqual([]);
    expect(ids(autres)).toEqual(['deux-voies-non-liee', 'deux-voies-liee', 'une-voie-non-liee', 'une-voie-liee']);
  });

  it('à égalité, l’ordre de la table tient — rien n’est réordonné sans critère', () => {
    const egales = [
      assiette('premiere', [{ idQuestionnaire: 'Q_STR_01' }]),
      assiette('deuxieme', [{ idQuestionnaire: 'Q_STR_02' }]),
      assiette('troisieme', [{ idQuestionnaire: 'Q_STR_03' }]),
    ];
    expect(ids(hierarchiserAssiettes(egales, []).autres)).toEqual(['premiere', 'deuxieme', 'troisieme']);
  });

  it('rien ne se perd, rien ne se double', () => {
    const { liees, autres } = hierarchiserAssiettes(table, [10]);
    expect([...ids(liees), ...ids(autres)].sort()).toEqual(ids(table).sort());
  });
});
