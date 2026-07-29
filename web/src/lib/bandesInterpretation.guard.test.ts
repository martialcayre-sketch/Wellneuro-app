// Banc du repli de bande — 2026-07-29.
//
// Ce que ce banc protège : une bande d'interprétation rendue faute d'en avoir
// trouvé une. `interpretRanges` repliait sur `ranges[ranges.length - 1]`, la bande
// écrite en dernier — qui n'a aucune raison d'être la bonne. Mesuré sur le
// catalogue entier, ce repli tombe sur la plus SÉVÈRE ici et sur la plus
// RASSURANTE là : il ne penche pas d'un côté, il est arbitraire.
//
// Les cas ci-dessous sont pris sur des instruments RÉELS et à des scores
// ATTEIGNABLES — un banc bâti sur un catalogue de fixture prouverait le
// comportement d'une fixture.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore, computeScoreFromDef } from '@/lib/questions';

const itemsDe = (id: string) =>
  ((QUESTIONNAIRE_CATALOGUE as any)[id].sections ?? [])
    .flatMap((s: any) => s.questions ?? []);

/** Répartit `total` sur les items, en respectant leurs bornes. */
function repartir(id: string, total: number, min = 0, max = 10) {
  const items = itemsDe(id);
  const reponses: Record<string, number> = {};
  let reste = total;
  items.forEach((q: any, i: number) => {
    const bas = q.min ?? min;
    const haut = q.max ?? max;
    const restants = items.length - 1 - i;
    const v = Math.max(bas, Math.min(haut, reste - restants * bas));
    reponses[q.id] = v;
    reste -= v;
  });
  return reponses;
}

describe('bandes d’interprétation — aucune bande plutôt qu’une bande fausse', () => {
  it('Q_SOM_02 (Epworth) : 6 et 15 sont atteignables et ne relèvent d’aucune bande', () => {
    // Bandes : 0-5, 7-8, 9-14, 16-24. Huit items cotés 0 à 3 : tous les entiers de
    // 0 à 24 sont atteignables, 6 et 15 compris. Ils recevaient « Somnolence
    // diurne excessive ; syndrome d'apnées du sommeil possible » — la bande écrite
    // en dernier, et la plus alarmante de l'instrument.
    for (const total of [6, 15]) {
      const r: any = calculateScore('Q_SOM_02', repartir('Q_SOM_02', total, 0, 3));
      expect(r.total).toBe(total);
      expect(r.interpretation).toBeNull();
    }

    // Et un score QUI relève d'une bande la reçoit toujours : le garde refuse une
    // bande fausse, il n'en supprime aucune de vraie.
    const couvert: any = calculateScore('Q_SOM_02', repartir('Q_SOM_02', 12, 0, 3));
    expect(couvert.total).toBe(12);
    expect(couvert.interpretation?.label).toBeTruthy();
  });

  it('Q_MOD_03 : une moyenne à décimale ne relève d’aucune bande bornée sur des entiers', () => {
    // Bandes [1-3], [4-6], [7-8], [9-10] ; la valeur servie est une moyenne au
    // dixième. 28 % des totaux atteignables tombent entre deux bandes, et
    // recevaient tous « Intensité très élevée » (danger).
    //
    // La passation est COMPLÈTE depuis le 2026-07-29 : elle valait auparavant
    // trois plaintes sur sept, et le moteur ne rend plus ni total ni moyenne sur
    // une passation amputée. Le cas visé — une moyenne décimale entre deux
    // bandes — n'a jamais eu besoin d'un instrument partiel : sept plaintes
    // sommant 24 rendent la même moyenne de 3,4.
    const septPlaintes: any = calculateScore(
      'Q_MOD_03',
      Object.fromEntries(itemsDe('Q_MOD_03').map((q: any, i: number) => [q.id, i === 0 ? 6 : 3])),
    );
    expect(septPlaintes.total).toBe(24);
    expect(septPlaintes.average).toBe(3.4);
    expect(septPlaintes.interpretation).toBeNull();

    // Une moyenne entière tombe bien dans sa bande.
    const entier: any = calculateScore(
      'Q_MOD_03',
      Object.fromEntries(itemsDe('Q_MOD_03').map((q: any) => [q.id, 5])),
    );
    expect(entier.average).toBe(5);
    expect(entier.interpretation?.label).toBe('Intensité modérée');
  });

  it('un instrument entièrement non répondu ne reçoit pas la bande la plus sévère', () => {
    // Cinq jeux de bandes ne couvrent pas 0 ; une passation vide y tombait et
    // recevait la dernière. `Q_STR_05` (BMS-10) est celui qui l'exerce vraiment :
    // ses bandes vont de 1 à 7 et son moteur `bms_average` n'a pas de garde de
    // non-scoré. Une moyenne de 0 recevait « Très élevé ».
    //
    // Écrit sur CET instrument-là après vérification : le premier jet visait
    // `Q_STR_08`, dont le moteur `sum` porte déjà une garde de non-scoré et sort
    // avant d'atteindre les bandes — le test passait sans rien exercer.
    //
    // Un SEUL item répondu, et non zéro : depuis la garde de passation vide
    // (2026-07-29), un instrument sans aucune réponse sort avant les bandes. Une
    // réponse unique sur dix donne une moyenne de 0,1, sous le plancher de la
    // grille — c'est bien le chemin des bandes qui est exercé.
    const presqueVide: any = calculateScore('Q_STR_05', { [itemsDe('Q_STR_05')[0].id]: 1 });
    expect(presqueVide.scored).not.toBe(false);
    expect(presqueVide.average).toBe(0.1);
    expect(presqueVide.interpretation).toBeNull();
  });

  it('les grilles du catalogue ne portent plus aucun repli silencieux', () => {
    // Balayage : pour chaque instrument dont les bandes ne couvrent pas 0, une
    // passation vide ne doit rendre AUCUNE bande. Écrit en balayage plutôt qu'en
    // liste : un instrument ajouté demain avec une grille qui démarre au-dessus de
    // zéro est couvert sans que personne ait à y penser.
    const aVerifier: string[] = [];
    for (const [id, q] of Object.entries(QUESTIONNAIRE_CATALOGUE as any)) {
      const bandes = (q as any).scoring?.interpretation;
      if (!Array.isArray(bandes) || !bandes.every((b: any) => typeof b?.min === 'number')) continue;
      if (Math.min(...bandes.map((b: any) => b.min)) <= 0) continue;
      aVerifier.push(id);
    }
    // Le balayage doit trouver de quoi mordre : une liste vide passerait pour un
    // succès alors qu'elle ne prouverait rien.
    expect(aVerifier.length).toBeGreaterThanOrEqual(5);

    for (const id of aVerifier) {
      const r: any = calculateScore(id, {});
      expect(r.interpretation ?? null, `${id} : une passation vide reçoit une bande`).toBeNull();
    }
  });

  it('un score AU-DESSUS de toute la grille relève de la bande de tête', () => {
    // Le plafond d'une grille peut être écrit sous le maximum atteignable. Là,
    // l'ancien repli rendait la BONNE réponse, et le supprimer sans nuance
    // effaçait le résultat le plus sévère d'un instrument. Deux cas réels.

    // `Q_TAB_04` (cannabis) : 16 items, total atteignable 36, plafond de grille 32.
    const cannabisMax: any = calculateScore(
      'Q_TAB_04',
      Object.fromEntries(itemsDe('Q_TAB_04').map((q: any) => [
        q.id,
        q.options?.length ? Math.max(...q.options.map((o: any) => Number(o.v ?? o.value))) : (q.max ?? 0),
      ])),
    );
    expect(cannabisMax.total).toBe(36);
    expect(cannabisMax.interpretation?.label).toBe('Dépendance probable');

    // `Q_MOD_01/ADAPTATION_STRESS` : plafond 24, atteignable 28 — et ici la bande
    // de tête est la RASSURANTE. La règle suit l'ordre des scores, pas la
    // sévérité : c'est bien le patient le mieux adapté qui garde son libellé.
    const modeVieMax: any = calculateScore(
      'Q_MOD_01',
      Object.fromEntries(itemsDe('Q_MOD_01').map((q: any) => [
        q.id,
        q.options?.length ? Math.max(...q.options.map((o: any) => Number(o.v ?? o.value))) : (q.max ?? 0),
      ])),
    );
    const adaptation = modeVieMax.subScores.find((s: any) => s.id === 'ADAPTATION_STRESS');
    expect(adaptation.total).toBe(28);
    expect(adaptation.interpretation?.label).toBe('Adaptation satisfaisante');
  });

  it('la bande de tête est celle au `max` le plus haut, pas la dernière écrite', () => {
    // Les deux grilles réelles concernées écrivent leur bande de tête en dernier :
    // le catalogue ne distingue donc pas « dernière écrite » de « max le plus
    // haut ». Une grille rédigée du plus sévère au plus léger le distinguerait —
    // rien ne l'interdit, et prendre la dernière écrite rendrait alors la bande la
    // plus BASSE sur un score maximal.
    const def = {
      sections: [{ id: 'A', questions: [{ id: 'A1', type: 'number', min: 0, max: 50 }] }],
      scoring: {
        type: 'sum',
        interpretation: [
          { min: 20, max: 30, label: 'haut' },
          { min: 0, max: 19, label: 'bas' },
        ],
      },
    };
    const r: any = computeScoreFromDef(def, { A1: 42 });
    expect(r.total).toBe(42);
    expect(r.interpretation?.label).toBe('haut');
  });

  it('aucune grille du catalogue ne laisse son maximum atteignable sans bande', () => {
    // Balayage : c'est l'absence de ce contrôle qui a laissé passer les deux cas
    // ci-dessus. Il porte sur le HAUT de chaque grille, là où le premier jet du
    // lot ne regardait que les trous et les planchers.
    const valeurs = (q: any) => (q.options?.length
      ? q.options.map((o: any) => Number(o.v ?? o.value))
      : (q.max != null ? [q.min ?? 0, q.max] : null));

    let examinees = 0;
    for (const [id, def] of Object.entries(QUESTIONNAIRE_CATALOGUE as any)) {
      const bandes = (def as any).scoring?.interpretation;
      if (!Array.isArray(bandes) || !bandes.every((b: any) => typeof b?.max === 'number')) continue;
      const items = itemsDe(id);
      if (!items.length) continue;
      const maxAtteignable = items.reduce(
        (s: number, q: any) => s + (valeurs(q) ? Math.max(...valeurs(q)!) : 0), 0);
      // Les moteurs qui interprètent une MOYENNE ou un COMPTE comparent leur
      // grille à autre chose qu'une somme d'items : hors périmètre de ce contrôle.
      if (maxAtteignable > Math.max(...bandes.map((b: any) => b.max)) * 2) continue;
      examinees++;
      const auMax: any = calculateScore(id, Object.fromEntries(items.map((q: any) => [
        q.id, valeurs(q) ? Math.max(...valeurs(q)!) : 0])));
      const rendu = auMax?.interpretation ?? auMax?.subScores?.some((s: any) => s.interpretation);
      expect(rendu ?? null, `${id} : son maximum atteignable ne reçoit aucune bande`).not.toBeNull();
    }
    expect(examinees).toBeGreaterThanOrEqual(10);
  });

  // Les deux moteurs ci-dessous portaient leur PROPRE repli, distinct
  // d'`interpretRanges`. Les grilles du catalogue sont aujourd'hui contiguës
  // (`Q_NEU_12` couvre 0-24 d'un bloc, `Q_STR_01` 0-42), donc aucun instrument
  // servi ne les exerce : les prouver sur le catalogue serait les prouver sur
  // rien. Ils le sont donc sur une définition forgée, via `computeScoreFromDef` —
  // le point d'entrée que le moteur expose déjà pour les instruments hors
  // catalogue. Ce qui est vérifié est le contrat du moteur, pas l'état d'une
  // grille qu'un arbitrage peut faire bouger demain.

  it('composite_multi_parties : un score GSS hors des bornes ne reçoit aucune bande', () => {
    // Ce moteur-là n'est utilisé par AUCUN instrument du catalogue aujourd'hui —
    // le repli y dormait donc, prêt à servir au premier qui l'emploierait.
    // `idtas_ae`, qui lui ressemble et sert Q_NEU_12, rendait déjà `null` : le
    // défaut n'était pas là où le nom le laissait croire.
    const def = {
      sections: [{ id: 'P2', questions: [{ id: 'X1', type: 'number', min: 0, max: 30 }] }],
      scoring: {
        type: 'composite_multi_parties',
        parts: [{ id: 'P2', type: 'sum', items: ['X1'] }],
        // Grille à trou : 8 ne relève d'aucune bande.
        interpretation: [
          { gss_min: 0, gss_max: 5, label: 'bas' },
          { gss_min: 12, gss_max: 24, label: 'haut' },
        ],
      },
    };
    const dans: any = computeScoreFromDef(def, { X1: 3 });
    expect(dans.gssScore).toBe(3);
    expect(dans.interpretation?.label).toBe('bas');

    const hors: any = computeScoreFromDef(def, { X1: 8 });
    expect(hors.gssScore).toBe(8);
    expect(hors.interpretation).toBeNull();
  });

  it('group_majority : le protocole ne se greffe jamais sur une bande absente', () => {
    // `{...interp}` sur `null` fabriquait un objet ne portant qu'un protocole et
    // aucun libellé — lisible comme une interprétation là où il n'y en a pas.
    // Le total 9 tombe dans la fenêtre du protocole (5-14) ET dans le trou.
    const def = {
      sections: [{ id: 'A', questions: [{ id: 'A1', type: 'number', min: 0, max: 20 }] }],
      scoring: {
        type: 'group_majority',
        subScores: [{ id: 'A', label: 'Axe A', items: ['A1'], max: 20 }],
        interpretation: [
          { min: 0, max: 4, label: 'bas' },
          { min: 15, max: 42, label: 'haut' },
        ],
      },
    };
    const r: any = computeScoreFromDef(def, { A1: 9 });
    expect(r.total).toBe(9);
    expect(r.interpretation).toBeNull();

    // Et quand la bande existe, le protocole s'y greffe toujours.
    const defContigu = { ...def, scoring: { ...def.scoring,
      interpretation: [{ min: 0, max: 4, label: 'bas' }, { min: 5, max: 42, label: 'milieu' }] } };
    const avecBande: any = computeScoreFromDef(defContigu, { A1: 9 });
    expect(avecBande.interpretation?.label).toBe('milieu');
    expect(avecBande.interpretation?.dominant).toBe('A');
  });
});
