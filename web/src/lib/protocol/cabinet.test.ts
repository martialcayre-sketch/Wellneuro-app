import { describe, expect, it } from 'vitest';
import { construireTrajectoire, type TrajectoireCycle } from './trajectoire';
import { calculerMedianesCabinet, SEUIL_COHORTE_CABINET } from './cabinet';

// Fixtures synthétiques — aucun patient réel, aucun nom : des cycles nus.

function cycle(version: string | null, t0: number | null, j21: number | null, j42: number | null = null): TrajectoireCycle {
  return {
    cycleId: `c_${Math.abs(t0 ?? 0)}_${j21 ?? 'x'}_${version ?? 'null'}`,
    ancre: 'T0',
    dateAncre: '2026-01-01T00:00:00.000Z', jourZero: '2026-01-01T00:00:00.000Z',
    versionScore: version,
    jalons: [
      { jalon: 'T0', mesure: t0 !== null, valeur: t0, date: t0 === null ? null : '2026-01-01T00:00:00.000Z' },
      { jalon: 'J21', mesure: j21 !== null, valeur: j21, date: j21 === null ? null : '2026-01-22T00:00:00.000Z' },
      { jalon: 'J42', mesure: j42 !== null, valeur: j42, date: j42 === null ? null : '2026-02-12T00:00:00.000Z' },
      { jalon: 'J90', mesure: false, valeur: null, date: null },
    ],
    momentum: null,
    momentumParBesoin: [],
  };
}

describe('calculerMedianesCabinet (A6-R2)', () => {
  it('un cycle courant sans jour 0 n’entre pas dans le repère ([[D-397]] §2)', () => {
    const avec = Array.from({ length: 5 }, (_, i) => [cycle('v1', 40 + i, 50 + i)]);
    const sansJourZero = { ...cycle('v1', 10, 90), jourZero: null, motifMomentum: 'sans_jour_zero' as const };
    const resultat = calculerMedianesCabinet([...avec, [sansJourZero]], 'v1');
    expect(resultat.nTotal).toBe(5);
    expect(resultat.parJalon.find(m => m.jalon === 'J21')?.mediane).toBe(10);
  });

  it('version de référence inconnue : aucune cohorte, jamais une version supposée (A8-3)', () => {
    const resultat = calculerMedianesCabinet([[cycle('v1', 40, 50)]], null);
    expect(resultat.masque).toBe(true);
    expect(resultat.nTotal).toBe(0);
    expect(resultat.parJalon).toEqual([]);
  });

  it('sous le seuil de cohorte : masqué, mais n= reste exposé (A6-2)', () => {
    const resultat = calculerMedianesCabinet(
      [[cycle('v1', 40, 50)], [cycle('v1', 30, 45)]],
      'v1',
    );
    expect(resultat.nTotal).toBe(2);
    expect(resultat.masque).toBe(true);
    expect(resultat.parJalon).toEqual([]);
    expect(SEUIL_COHORTE_CABINET).toBe(5);
  });

  it('cohorte suffisante : médiane descriptive par jalon, versions étrangères exclues', () => {
    const cabinet = [
      [cycle('v1', 40, 50)], // Δ +10
      [cycle('v1', 30, 45)], // Δ +15
      [cycle('v1', 50, 55)], // Δ +5
      [cycle('v1', 20, 28)], // Δ +8
      [cycle('v1', 60, 72, 80)], // Δ +12 (et J42 : +20)
      [cycle('v2', 10, 90)], // autre version : JAMAIS comptée
      [cycle(null, 10, 90)], // version inconnue : JAMAIS comptée
    ];
    const resultat = calculerMedianesCabinet(cabinet, 'v1');
    expect(resultat.nTotal).toBe(5);
    expect(resultat.masque).toBe(false);
    const j21 = resultat.parJalon.find((m) => m.jalon === 'J21')!;
    // Médiane de [+10, +15, +5, +8, +12] = +10, sur n=5 lectures J21.
    expect(j21.mediane).toBe(10);
    expect(j21.n).toBe(5);
    expect(j21.nDossiers).toBe(5);
    expect(resultat.nDossiers).toBe(5);
    // J42 : une seule lecture, d'un seul dossier — masquée ([[D-298]] §2).
    expect(resultat.parJalon.find((m) => m.jalon === 'J42')).toBeUndefined();
    expect(resultat.jalonsMasques).toBe(1);
    // Aucune médiane inventée pour un jalon sans lecture.
    expect(resultat.parJalon.find((m) => m.jalon === 'J90')).toBeUndefined();
  });

  it('un cycle sans T0 mesuré n’entre pas dans la cohorte (A8-2 : rien n’est ancré sur un trou)', () => {
    const resultat = calculerMedianesCabinet(
      [
        [cycle('v1', null, 50)],
        [cycle('v1', 40, 50)],
      ],
      'v1',
    );
    expect(resultat.nTotal).toBe(1);
  });

  it('médiane paire : moyenne des deux valeurs centrales', () => {
    const cabinet = [
      [cycle('v1', 40, 50)], // +10
      [cycle('v1', 40, 60)], // +20
      [cycle('v1', 40, 44)], // +4
      [cycle('v1', 40, 56)], // +16
      [cycle('v1', 40, 46)], // +6
      [cycle('v1', 40, 52)], // +12
      [cycle('v1', 40, null)], // T0 mesuré, J21 non — compte dans nTotal, pas dans J21
    ];
    const resultat = calculerMedianesCabinet(cabinet, 'v1');
    expect(resultat.nTotal).toBe(7);
    const j21 = resultat.parJalon.find((m) => m.jalon === 'J21')!;
    expect(j21.n).toBe(6);
    expect(j21.mediane).toBe(11); // médiane de [4, 6, 10, 12, 16, 20]
  });

  // [[D-298]] §1, §2, §5 : cinq cycles d'un même patient décrivent un patient.
  it('cinq cycles venant de moins de cinq dossiers : masqué, nDossiers exposé', () => {
    const unPatient = [cycle('v1', 40, 50), cycle('v1', 30, 45), cycle('v1', 50, 55), cycle('v1', 20, 28), cycle('v1', 60, 72)];
    const resultat = calculerMedianesCabinet([unPatient], 'v1');
    expect(resultat.nTotal).toBe(5);
    expect(resultat.nDossiers).toBe(1);
    expect(resultat.masque).toBe(true);
    expect(resultat.parJalon).toEqual([]);

    const quatreDossiers = calculerMedianesCabinet(
      [[cycle('v1', 40, 50), cycle('v1', 30, 45)], [cycle('v1', 50, 55)], [cycle('v1', 20, 28)], [cycle('v1', 60, 72)]],
      'v1',
    );
    expect(quatreDossiers.nTotal).toBe(5);
    expect(quatreDossiers.nDossiers).toBe(4);
    expect(quatreDossiers.masque).toBe(true);
  });

  it('cohorte servie, mais un jalon venant de moins de cinq dossiers est masqué', () => {
    const cabinet = [
      [cycle('v1', 40, 50, 60), cycle('v1', 40, 50, 62)],
      [cycle('v1', 30, 45, 50)],
      [cycle('v1', 50, 55, 58)],
      [cycle('v1', 20, 28)],
      [cycle('v1', 60, 72)],
    ];
    const resultat = calculerMedianesCabinet(cabinet, 'v1');
    expect(resultat.masque).toBe(false);
    expect(resultat.nDossiers).toBe(5);
    // J42 : quatre lectures, mais trois dossiers seulement.
    expect(resultat.parJalon.find((m) => m.jalon === 'J42')).toBeUndefined();
    expect(resultat.parJalon.find((m) => m.jalon === 'J21')?.nDossiers).toBe(5);
    expect(resultat.jalonsMasques).toBe(1);
  });
});

// Constat F1-bis de l'audit du 2026-07-27 : cinq patients ayant répondu une
// seule fois franchissaient SEUIL_COHORTE_CABINET et servaient au praticien une
// médiane de +0 par jalon, présentée comme un repère descriptif de sa
// patientèle. Ce cas part des réponses brutes et traverse toute la chaîne —
// c'est là, et non sur des cycles construits à la main, que le défaut vivait.
describe('repère de cabinet — une cohorte silencieuse ne sert aucune médiane (F1-bis)', () => {
  const RAW = {
    P1: '2', P2: '2', P3: '3', P4: '3', P5: '3',
    P6: '2', P7: '3', P8: '3', P9: '2', P10: '3',
  };

  it('cinq cycles sans réponse après T0 : nTotal atteint le seuil, aucun jalon agrégé', () => {
    const cabinet = Array.from({ length: 5 }, (_, i) =>
      construireTrajectoire({
        episodes: [
          {
            id: `ep_${i}`,
            milestone: 'T0' as const,
            confirmedAt: new Date('2026-01-01T00:00:00.000Z'),
            cycleId: `cy_${i}`,
            versionScore: 'v1',
          },
        ],
        reponses: [
          {
            statutValidite: null,
            idQuestionnaire: 'Q_STR_02',
            dateReponse: new Date('2026-01-01T00:00:00.000Z'),
            scoresJson: { rawAnswers: RAW },
          },
        ],
        // Diffusés : un cycle sans jour 0 sort du repère ([[D-397]] §2), et ce
        // cas porte sur la cohorte silencieuse, pas sur la diffusion.
        joursZero: new Map([[`cy_${i}`, new Date('2026-01-01T00:00:00.000Z')]]),
      }).cycles,
    );

    const resultat = calculerMedianesCabinet(cabinet, 'v1');
    expect(resultat.nTotal).toBe(SEUIL_COHORTE_CABINET);
    expect(resultat.masque).toBe(false);
    // Le seuil est franchi, mais plus aucun delta fabriqué ne l'alimente.
    expect(resultat.parJalon).toEqual([]);
  });
});
