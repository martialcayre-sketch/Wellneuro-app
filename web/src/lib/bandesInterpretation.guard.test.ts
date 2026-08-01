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
  it('Q_MOD_03 : une moyenne à décimale ne relève d’aucune bande bornée sur des entiers', () => {
    // Bandes [1-3], [4-6], [7-8], [9-10] ; la valeur servie est une moyenne au
    // dixième. 28 % des totaux atteignables tombent entre deux bandes, et
    // recevaient tous « Intensité très élevée » (danger).
    //
    // Le cas se lisait jusqu'ici sur trois plaintes de sept, dont la moyenne
    // était contaminée par les quatre manquantes. Depuis le 2026-07-29, une
    // passation incomplète ne sert plus ni total ni moyenne : le trou de grille
    // subsiste, mais sur une passation COMPLÈTE dont la somme n'est pas un
    // multiple de sept. C'est bien la grille qui est en cause, pas l'absence.
    const valeurs = [8, 8, 4, 1, 1, 1, 1]; // somme 24 → 24/7 = 3,4
    const complet: any = calculateScore(
      'Q_MOD_03',
      Object.fromEntries(itemsDe('Q_MOD_03').map((q: any, i: number) => [q.id, valeurs[i]])),
    );
    expect(complet.total).toBe(24);
    expect(complet.average).toBe(3.4);
    expect(complet.interpretation).toBeNull();

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

    // `Q_TAB_04` PORTAIT CE CAS jusqu'au 2026-08-01, et il en est sorti : ses
    // bandes ont été RETIRÉES, parce qu'elles étaient celles d'un instrument dont
    // le servi ne partage AUCUN item au sens strict — zéro paire de même question
    // ET mêmes modalités sur les 32 items relevés un à un ; neuf de même construit
    // seulement. (Cette ligne portait « ne partage qu'un item » : le SEPTIÈME
    // emplacement de cette affirmation, et le seul que le lot du 2026-08-01 avait
    // manqué en annonçant les avoir tous corrigés — il se comptait six.)
    // Il ne rend donc plus ni total ni bande, et
    // ne peut plus rien éprouver ici. Le cas qu'il illustrait — un plafond de
    // grille écrit SOUS le maximum atteignable — reste couvert par celui qui
    // suit, qui porte encore cet écart. Une garde ne se supprime pas parce que
    // son exemple disparaît ; elle se rattache à l'exemple qui subsiste.

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
describe('frontières du 2026-07-30 — alignées sur la source, ou arbitrées en le disant', () => {
  // Première rédaction refusée en revue : elle présentait le comblement du trou
  // Epworth à 6 comme « conforme à la source » (faux — la source a les MÊMES
  // trous à 6 et 15), déplaçait Horne 70 contre le « <= 69 » de sa propre source,
  // et n'avait corrigé qu'une des TROIS bornes chevauchées du QDRS.

  it('Epworth : les deux trous de source sont comblés par le même arbitrage', () => {
    // Source : « < 6 », « == 7 », « == 8 », « >= 9 », « <= 14 », « > 15 » — 6 et
    // 15 n'appartiennent à rien. Arbitrage praticien : 6 → bande moyenne (hors
    // normalité sans être >= 9), 15 → bande 9-15 (pas « excessive » au sens du
    // « > 15 »).
    expect((calculateScore('Q_SOM_02', repartir('Q_SOM_02', 6, 0, 3)) as any)
      .interpretation?.label).toContain('Score moyen');
    expect((calculateScore('Q_SOM_02', repartir('Q_SOM_02', 15, 0, 3)) as any)
      .interpretation?.label).toContain('pathologies possibles');
    // Les frontières de source, elles, ne bougent pas.
    expect((calculateScore('Q_SOM_02', repartir('Q_SOM_02', 5, 0, 3)) as any)
      .interpretation?.label).toContain('Pas de somnolence');
    expect((calculateScore('Q_SOM_02', repartir('Q_SOM_02', 16, 0, 3)) as any)
      .interpretation?.label).toContain('excessive');
  });

  it('QDRS : les TROIS bornes chevauchées vont à la bande la plus atteinte', () => {
    // Grille source, relevée à l'identique par les deux lectures du banc :
    // 0-1 / 1,5-5,5 / 6-12 / 12,5-17 / 17,5-30. Avant : 1,5 sortait « Normal »,
    // 12,5 « Démence légère », 17,5 « légère à modérée » — le patient le plus
    // atteint recevait la bande la plus rassurante, à chaque borne partagée.
    const items = itemsDe('Q_GEO_05');
    const totalDe = (t: number) => {
      // scores en pas de 0,5 : répartir t sur les items (max 3 chacun)
      const r: Record<string, number> = {};
      let reste = t;
      for (const q of items) { const v = Math.min(3, reste); r[q.id] = v; reste = +(reste - v).toFixed(1); }
      return r;
    };
    const cas: Array<[number, string]> = [
      [1, 'Normal'], [1.5, 'MCI'], [5.5, 'MCI'], [6, 'Démence légère'],
      [12, 'Démence légère'], [12.5, 'légère à modérée'], [17, 'légère à modérée'],
      [17.5, 'modérée à sévère'],
    ];
    for (const [t, attendu] of cas) {
      const r: any = calculateScore('Q_GEO_05', totalDe(t));
      expect(r.total, `total ${t}`).toBe(t);
      expect(r.interpretation?.label, `total ${t}`).toContain(attendu);
    }
  });

  it('Horne : 70 reste « Tout à fait du matin », comme la table publiée', () => {
    // La source du support porte un TROU à 70 (« modérément <= 69 », « tout à
    // fait > 70 ») ; la table publiée de Horne & Östberg met 70-86 en « tout à
    // fait ». Une première rédaction avait déplacé 70 vers « modérément » sur la
    // foi du seul « > 70 » : elle contredisait le « <= 69 » de la même source.
    expect((calculateScore('Q_SOM_05', repartir('Q_SOM_05', 69, 1, 5)) as any)
      .interpretation?.label).toBe('Modérément du matin');
    expect((calculateScore('Q_SOM_05', repartir('Q_SOM_05', 70, 1, 5)) as any)
      .interpretation?.label).toBe('Tout à fait du matin');
  });

  it('aucune grille du catalogue ne partage une borne entre deux bandes', () => {
    // La garde de CLASSE, écrite après que la borne 1,5 du QDRS a été corrigée
    // seule : un balayage attrape les deux autres et toutes les futures. Une
    // borne partagée est toujours résolue par l'ordre d'écriture — c'est-à-dire
    // par accident.
    // Exemption UNIQUE, nommée : la grille de l'AUDIT est différenciée par
    // population (« 0-6 homme », « 6-12 femme ») — le chevauchement est ENTRE
    // populations, par conception, et le moteur `audit` applique lui-même les
    // seuils par sexe sans passer par `interpretRanges` : l'ordre d'écriture ne
    // résout rien, parce que rien ne le lit. Toute nouvelle exemption doit venir
    // avec sa raison ici.
    const EXEMPTES = new Set(['Q_NEU_07']);
    const coupables: string[] = [];
    for (const [id, q] of Object.entries(QUESTIONNAIRE_CATALOGUE as any)) {
      if (EXEMPTES.has(id)) continue;
      const jeux: any[][] = [];
      const sc = (q as any).scoring;
      if (Array.isArray(sc?.interpretation) && sc.interpretation.every((b: any) => typeof b?.min === 'number')) {
        jeux.push(sc.interpretation);
      }
      for (const sub of sc?.subScores ?? []) if (Array.isArray(sub.ranges)) jeux.push(sub.ranges);
      for (const grp of Array.isArray(sc?.interpretation) ? sc.interpretation : []) {
        if (Array.isArray(grp?.ranges)) jeux.push(grp.ranges);
      }
      for (const bandes of jeux) {
        for (const a of bandes) for (const b of bandes) {
          if (a === b) continue;
          if (typeof a.max === 'number' && typeof b.min === 'number' && a.max === b.min) {
            coupables.push(`${id} : ${a.max} appartient à deux bandes`);
          }
        }
      }
    }
    expect(coupables, coupables.join('\n')).toEqual([]);
  });

  it('Berlin : la catégorie somnolence exige DEUX réponses positives, comme la source', () => {
    // Servi jusqu'ici : UNE seule suffisait. Un patient positif au seul
    // « fatigue au réveil », avec une HTA, sortait « Risque élevé d'apnée —
    // polysomnographie recommandée ». Les deux lectures du banc portent le
    // « >= 2 » de la source.
    const unSeul: any = calculateScore('Q_SOM_03',
      { BE1: 0, BE2: 0, BE3: 0, BE4: 0, BE5: 0, BE6: 2, BE7: 0, BE8: 1, BE9: 25 });
    const cat2 = unSeul.categories.find((c: any) => c.id === 'C2');
    expect(cat2.positive, 'une seule réponse positive ne suffit plus').toBe(false);
    expect(unSeul.highRisk).toBe(false);
    expect(unSeul.interpretation?.label).toContain('Risque faible');

    // Deux positives : la catégorie bascule, et le verdict avec elle.
    const deux: any = calculateScore('Q_SOM_03',
      { BE1: 0, BE2: 0, BE3: 0, BE4: 0, BE5: 1, BE6: 2, BE7: 0, BE8: 1, BE9: 25 });
    expect(deux.categories.find((c: any) => c.id === 'C2').positive).toBe(true);
    expect(deux.highRisk, 'somnolence + facteurs de risque = deux catégories').toBe(true);
  });
});


