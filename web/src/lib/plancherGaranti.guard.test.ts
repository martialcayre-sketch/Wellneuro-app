// Banc du PLANCHER GARANTI — 2026-08-05.
//
// CE QU'IL TIENT. `D-014` a fermé le faux négatif rassurant : sur un recueil
// partiel, plus de bande d'interprétation. Sa justification était l'asymétrie —
// « l'erreur est à sens unique : SOUS-classement, jamais sur-classement ». Mais
// si l'erreur ne peut aller que vers le bas, la bande décrochée par les seules
// réponses cotées est un PLANCHER : la bande finale sera celle-là ou pire.
// L'éteindre supprimait donc, avec le faux négatif visé, les vrais positifs DÉJÀ
// ACQUIS.
//
// LE CAS QUI A MOTIVÉ LE LOT est celui du TFD, et il est arithmétique : items
// cotés 0 à 3, bande B ouverte à 24 — huit réponses au maximum suffisent, et les
// vingt-trois restantes ne peuvent qu'ajouter.
//
// CE QUE CE BANC NE PROUVE PAS, et qui vit dans `monotonieMoteurs.guard.test.ts` :
// que les moteurs concernés sont réellement monotones. Sans cette propriété, un
// plancher est un faux positif — et un faux positif portant la marque du garanti
// est pire que la bande qu'on venait de retirer.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';

/** Les 31 items du TFD, par axe, lus du catalogue et jamais réécrits ici. */
function itemsTfdParAxe(): { id: string; items: string[] }[] {
  const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_GAS_01;
  return def.scoring.subScores.map((s: any) => ({ id: s.id, items: s.items }));
}

/**
 * Huit réponses à la PIRE valeur (3), réparties sur les cinq axes.
 *
 * La répartition n'est pas un détail de confort : `totalGlobalDepuisSousScores`
 * rend `null` dès qu'un axe est ENTIÈREMENT vide, donc huit réponses concentrées
 * sur un seul axe ne produisent aucun total — et sans nombre, pas de plancher.
 * C'est la limite que le moteur documente, et ce banc la constate plus bas
 * plutôt que de la laisser croire couverte.
 */
const HUIT_AU_MAX: Record<string, number> = {
  C1_1: 3, C1_2: 3, C1_3: 3, C1_4: 3,
  C2_1: 3, C3_1: 3, C4_1: 3, C5_1: 3,
};

describe('TFD — plancher garanti', () => {
  it('huit réponses au maximum : aucune bande, mais un plancher en B', () => {
    const r: any = calculateScore('Q_GAS_01', HUIT_AU_MAX);

    // Le scénario d'abord : si ces trois attentes cassent, le reste du test ne
    // prouve plus ce qu'il annonce.
    expect(r.repondus).toBe(8);
    expect(r.missing).toBe(23);
    expect(r.total).toBe(24);

    // `D-014` tient : la bande d'interprétation reste absente.
    expect(r.interpretation).toBeNull();

    // Et le vrai positif déjà acquis est servi, à part et marqué.
    expect(r.bandePlancher).not.toBeNull();
    expect(r.bandePlancher.label).toBe('B — Troubles fonctionnels modérés à importants');
    expect(r.bandePlancher.garanti).toBe(true);

    // La note porte le plancher jusqu'au lecteur — c'est le seul canal déjà servi
    // par la fiche, la synthèse, le PDF et les prompts.
    expect(r.note).toContain('Au moins');
    expect(r.note).toContain('B — Troubles fonctionnels modérés à importants');
    // Et elle garde ce que l'instrument déclarait déjà (`Q_GAS_01` a une
    // `scoring.note`), au lieu de l'écraser.
    expect(r.note.length).toBeGreaterThan(
      'Au moins « B — Troubles fonctionnels modérés à importants » : les items sans réponse ne peuvent qu\'aggraver le score.'.length,
    );
  });

  it('le plancher se sert aussi par AXE, et seulement là où il dit quelque chose', () => {
    const r: any = calculateScore('Q_GAS_01', HUIT_AU_MAX);
    const axe = (id: string) => r.subScores.find((s: any) => s.id === id);

    // C1 : quatre items à 3 font 12, soit la bande B de l'axe (8-13).
    expect(axe('C1').total).toBe(12);
    expect(axe('C1').interpretation).toBeNull();
    expect(axe('C1').bandePlancher.label).toBe('B — Troubles fonctionnels modérés à importants');

    // C3 : un item à 3 reste dans la bande A (0-3), la plus basse. « Au moins A »
    // ne dit rien — le plancher doit donc être absent, pas égal à A.
    expect(axe('C3').total).toBe(3);
    expect(axe('C3').bandePlancher ?? null).toBeNull();
  });

  it('CONTRE-ÉPREUVE — un recueil partiel qui n\'atteint que la bande la plus basse ne rend AUCUN plancher', () => {
    // Cinq réponses à 1, une par axe : total 5, bande A (0-23).
    const faible: Record<string, number> = { C1_1: 1, C2_1: 1, C3_1: 1, C4_1: 1, C5_1: 1 };
    const r: any = calculateScore('Q_GAS_01', faible);
    expect(r.total).toBe(5);
    expect(r.interpretation).toBeNull();
    expect(r.bandePlancher ?? null).toBeNull();
    expect(r.note).not.toContain('Au moins');
  });

  it('CONTRE-ÉPREUVE — une passation COMPLÈTE garde sa bande et ne sert jamais de plancher', () => {
    // Une garde qui rendrait un plancher partout passerait les tests d'absence
    // sans rien protéger ; et un plancher servi à côté d'une bande pleine ferait
    // deux verdicts pour une seule mesure.
    const complet: Record<string, number> = {};
    for (const axe of itemsTfdParAxe()) for (const id of axe.items) complet[id] = 0;
    const r: any = calculateScore('Q_GAS_01', complet);
    expect(r.missing).toBe(0);
    expect(r.repondus).toBe(31);
    expect(r.interpretation?.label).toBe('A — Absence de troubles fonctionnels');
    expect(r.bandePlancher ?? null).toBeNull();
    for (const s of r.subScores) expect(s.bandePlancher ?? null).toBeNull();
  });

  it('LIMITE CONNUE — huit réponses maximales sur un SEUL axe ne produisent aucun plancher', () => {
    // Ce n'est pas le comportement souhaitable, c'est le comportement livré : la
    // somme des items répondus reste une borne inférieure du total final, mais
    // `totalGlobalDepuisSousScores` rend `null` faute d'un dénominateur complet,
    // et un plancher se lit sur un nombre. Le banc l'épingle pour que l'écart soit
    // visible plutôt que découvert par un praticien.
    const surUnAxe: Record<string, number> = {
      C1_1: 3, C1_2: 3, C1_3: 3, C1_4: 3, C1_5: 3, C1_6: 3, C1_7: 3, C1_8: 3,
    };
    const r: any = calculateScore('Q_GAS_01', surUnAxe);
    expect(r.total).toBeNull();
    expect(r.bandePlancher ?? null).toBeNull();
    // L'axe, lui, est complet : il garde donc sa bande pleine, et pas un plancher.
    const c1 = r.subScores.find((s: any) => s.id === 'C1');
    expect(c1.total).toBe(24);
    expect(c1.interpretation?.label).toBe('C — Prédominance de troubles fonctionnels majeurs');
    expect(c1.bandePlancher ?? null).toBeNull();
  });
});

describe('PSQI — plancher garanti', () => {
  /**
   * Dix items répondus sur dix-huit, dont assez de perturbations cotées à leur
   * pire valeur pour que le total dépasse déjà 10 — la borne haute de la bande
   * « légers » — et atteigne « modérés » (11-16).
   *
   * TOUTES les composantes doivent être touchées, et pas seulement quelques-unes :
   * `totalGlobalDepuisSousScores` annule le total dès qu'une seule est vide, et
   * un plancher se lit sur un nombre. C'est ce qui impose `Q8` ici — sans lui,
   * `C7` est nulle —, comme `Q1`/`Q3`/`Q4` que `C4` exige tous les trois. La
   * passation reste partielle : `Q5a`, `Q5e`..`Q5j` et `Q9` sont sans réponse.
   */
  const PARTIEL_DEJA_MODERE: Record<string, number> = {
    Q1: 23, Q2: 90, Q3: 7, Q4: 4, // C2 = 2 (latence > 60 min), C3 = 3, C4 = 3
    Q5b: 3, Q5c: 3, Q5d: 3,       // C5 = 1 (somme 9)
    Q6: 3,                        // C1 = 3
    Q7: 0,                        // C6 = 0
    Q8: 3,                        // C7 = 2 (Q9 sans réponse, compté 0)
  };

  it('un recueil partiel déjà en « modérés » sert ce plancher, sans bande', () => {
    const r: any = calculateScore('Q_SOM_01', PARTIEL_DEJA_MODERE);
    expect(r.missing).toBeGreaterThan(0);
    expect(r.interpretation).toBeNull();
    expect(r.bandePlancher).not.toBeNull();
    expect(r.bandePlancher.label).toBe('Troubles du sommeil modérés');
    expect(r.bandePlancher.garanti).toBe(true);
    expect(r.note).toContain('Au moins « Troubles du sommeil modérés »');
  });

  it('CONTRE-ÉPREUVE — un recueil partiel en bande la plus basse ne rend aucun plancher', () => {
    const r: any = calculateScore('Q_SOM_01', {
      Q1: 23, Q2: 10, Q3: 7, Q4: 8, Q5b: 0, Q6: 0, Q7: 0, Q8: 0,
    });
    expect(r.interpretation).toBeNull();
    expect(r.bandePlancher ?? null).toBeNull();
  });

  it('CONTRE-ÉPREUVE — une passation complète garde sa bande, sans plancher', () => {
    const r: any = calculateScore('Q_SOM_01', {
      Q1: 23, Q2: 10, Q3: 7, Q4: 8,
      Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0,
      Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
      Q6: 0, Q7: 0, Q8: 0, Q9: 0,
    });
    expect(r.missing).toBe(0);
    expect(r.interpretation?.label).toBe('Pas de trouble du sommeil');
    expect(r.bandePlancher ?? null).toBeNull();
  });
});

describe('LA PROPRIÉTÉ ELLE-MÊME — un plancher n\'est jamais dépassé par la bande finale', () => {
  // Les autres bancs prouvent les INGRÉDIENTS : la monotonie des totaux d'un
  // côté, le sens des grilles de l'autre. Aucun ne posait l'énoncé du lot — que
  // la bande d'une passation COMPLÈTE est toujours au moins aussi sévère que le
  // plancher annoncé par n'importe quel sous-ensemble de ses réponses. C'est la
  // seule affirmation que le praticien lit, et c'était la seule non éprouvée.
  function questionsDe(def: any): any[] {
    return (def.sections || []).flatMap((s: any) => s.questions || []);
  }

  /** Valeurs légales d'une question, bornes des items chiffrés comprises. */
  function valeurs(q: any): number[] {
    const v = (q.options || []).map((o: any) => Number(o.v)).filter(Number.isFinite);
    if (v.length) return v;
    if (q.type === 'number') return [q.min ?? 0, q.max ?? 0];
    return [];
  }

  function horsBareme(def: any, q: any): boolean {
    const exemptable = def.scoring.type === 'psqi' || def.scoring.type === 'tfd';
    return exemptable && (q.meta?.horsBareme === true || q.horsBareme === true);
  }

  /**
   * Passation complète atterrissant sur une bande INTERMÉDIAIRE.
   *
   * Une première rédaction de ce banc partait d'une passation SATURÉE. Elle
   * atterrissait alors, sur les 23 éligibles sans exception, dans la bande de
   * `min` le plus haut de la grille — et comme un plancher est par construction
   * l'un des `min` de cette même grille, `bandeFinale.min >= plancher.min` était
   * vrai de N'IMPORTE QUEL plancher, faux compris. Le banc ne pouvait pas
   * échouer : 41 de ses 59 comparaisons étaient la bande de tête comparée à
   * elle-même. Relevé en revue adversariale, sur la deuxième passe.
   *
   * On construit donc l'inverse : tous les items à leur valeur la plus basse,
   * puis on en sature un à un jusqu'à ce que le total franchisse la bande du
   * milieu. Il reste alors de la marge AU-DESSUS du plancher, et une promesse
   * trop forte a de quoi se voir.
   *
   * LE TOTAL EST RELU DU MOTEUR À CHAQUE PAS, et non estimé par la somme brute
   * des réponses. Une rédaction intermédiaire faisait cette somme : elle
   * coïncide avec le total sur `sum` et `tfd`, mais **pas sur `psqi`**, dont le
   * /21 est construit depuis sept composantes seuillées — la fonction visait 11
   * et atterrissait à 6, une bande plus bas, si bien que le PSQI ne produisait
   * aucune marge. L'instrument dont la monotonie est la plus subtile était donc
   * éprouvé par une seule égalité. Relu du moteur, il atteint sa cible.
   */
  function versBandeIntermediaire(def: any): Record<string, number> | null {
    const grille = grilleDe(def);
    if (!grille || grille.length < 3) return null;
    const cible = grille[Math.floor(grille.length / 2)].min;

    const base: Record<string, number> = {};
    for (const q of questionsDe(def)) base[q.id] = Math.min(...(valeurs(q).length ? valeurs(q) : [0]));

    for (const q of questionsDe(def).filter((x: any) => !horsBareme(def, x))) {
      const total = (calculateScore(def.id, base) as any).total;
      if (typeof total === 'number' && total >= cible) break;
      const v = valeurs(q);
      if (v.length) base[q.id] = Math.max(...v);
    }
    return base;
  }

  /** Grille de l'instrument, triée par `min`. `psqi` l'écrit dans le moteur. */
  function grilleDe(def: any): any[] | null {
    const sc = def.scoring;
    const g = sc.interpretation || sc.globalInterpretation;
    if (Array.isArray(g) && g.length) return [...g].sort((a: any, b: any) => a.min - b.min);
    if (sc.type === 'psqi') {
      // Copie de `BANDES_PSQI`, que le moteur n'exporte pas. Les libellés sont
      // repris : sans eux, le message de violation de la contre-épreuve par
      // mutation afficherait « au moins undefined ». Si cette copie divergeait
      // du moteur, la dégradation serait silencieuse — `bandeFinale` vient du
      // moteur, seule la CIBLE viendrait d'ici.
      return [
        { min: 0, max: 4, label: 'Pas de trouble du sommeil' },
        { min: 5, max: 10, label: 'Troubles du sommeil légers' },
        { min: 11, max: 16, label: 'Troubles du sommeil modérés' },
        { min: 17, max: 21, label: 'Troubles du sommeil sévères' },
      ];
    }
    return null;
  }

  /**
   * Éligibles que la propriété n'éprouve PAS, et pourquoi — déclarés plutôt que
   * silencieusement sautés.
   *
   * `versBandeIntermediaire` a besoin d'au moins trois bandes pour qu'il existe
   * une bande « du milieu » qui ne soit ni la plus basse ni la plus haute. Ces
   * cinq instruments n'en ont que deux : il n'y a chez eux qu'un seul plancher
   * possible, et il coïncide toujours avec la bande finale. Un banc qui borne sa
   * couverture doit le dire — sinon le vert se lit comme « tout est couvert ».
   */
  const HORS_PROPRIETE = ['Q_SOM_06', 'Q_FIB_01', 'Q_NEU_04', 'Q_GEO_02', 'Q_TAB_05'];

  function eligibles(): any[] {
    return (Object.values(QUESTIONNAIRE_CATALOGUE as any) as any[])
      .filter((def: any) => def?.scoring?.severiteCroissante === true);
  }

  /**
   * Passation saturée — réservée au contrôle de la CONDUITE, où elle est le bon
   * outil et non un biais : les `protocol` du catalogue vivent sur les bandes les
   * plus sévères, et saturer est ce qui les fait apparaître. C'est pour la
   * PROPRIÉTÉ qu'elle serait trompeuse, la bande finale y étant toujours la plus
   * haute de la grille.
   */
  function saturee(def: any): Record<string, number> {
    const r: Record<string, number> = {};
    for (const q of questionsDe(def)) {
      const v = valeurs(q);
      r[q.id] = v.length ? Math.max(...v) : 0;
    }
    return r;
  }

  /**
   * Le contrôle lui-même, extrait pour que la contre-épreuve par mutation
   * puisse le rejouer sur un plancher délibérément faux.
   *
   * Rend `{comparaisons, marges, instrumentsAvecMarge, violations}`. Une MARGE
   * est un cas où le plancher est STRICTEMENT en dessous de la bande finale :
   * c'est ce qui distingue un banc qui prouve d'un banc qui compare une bande à
   * elle-même. L'assertion porte sur `instrumentsAvecMarge` et non sur `marges`,
   * un compte brut se réglant à une unité près de son seuil ; `marges` reste
   * rendu pour le diagnostic.
   */
  function eprouverPropriete(fauxPlancher?: (r: any, def: any) => any) {
    let comparaisons = 0;
    let marges = 0;
    const instrumentsAvecMarge = new Set<string>();
    const violations: string[] = [];

    for (const def of eligibles()) {
      const complet = versBandeIntermediaire(def);
      if (!complet) continue;
      const rComplet: any = calculateScore(def.id, complet);
      const bandeFinale = rComplet.interpretation;
      if (!bandeFinale || typeof bandeFinale.min !== 'number') continue;

      const retirables = questionsDe(def).filter((q: any) => !horsBareme(def, q)).map((q: any) => q.id);
      if (retirables.length < 3) continue;

      // Les sous-ensembles sont tirés des DEUX bouts, et non de la seule fin de
      // liste : sur le PSQI, la fin est le volet conjoint (`Q10`, `Q11a-e`), tous
      // hors barème — retirer par la fin ne faisait pas bouger `missing`, et
      // l'instrument dont la monotonie est la plus subtile n'était jamais visité.
      const tirages: string[][] = [
        retirables.slice(-1),
        retirables.slice(0, 1),
        retirables.slice(0, Math.max(1, Math.floor(retirables.length / 3))),
        retirables.slice(-Math.max(1, Math.floor(retirables.length / 2))),
      ];

      // Cinquième tirage, GLOUTON et non positionnel : on retire tout ce qui
      // peut l'être sans annuler le total. Sans lui, le PSQI ne produisait
      // aucune marge — non parce qu'il atteignait mal sa cible, mais parce que
      // presque tous ses retraits font tomber une composante entière, donc le
      // total, donc le plancher : les tirages par position ne lui laissaient
      // qu'une seule comparaison, et c'était une égalité. Ce tirage-ci descend
      // aussi bas que la mesure le permet, là où la marge se trouve.
      const glouton: string[] = [];
      for (const id of retirables) {
        const essai = { ...complet };
        for (const x of [...glouton, id]) delete essai[x];
        if (typeof (calculateScore(def.id, essai) as any).total === 'number') glouton.push(id);
      }
      if (glouton.length) tirages.push(glouton);

      for (const aRetirer of tirages) {
        if (aRetirer.length >= retirables.length) continue;
        const partiel = { ...complet };
        for (const id of aRetirer) delete partiel[id];
        const rPartiel: any = calculateScore(def.id, partiel);
        const plancher = fauxPlancher ? fauxPlancher(rPartiel, def) : rPartiel.bandePlancher;
        if (!plancher || typeof plancher.min !== 'number') continue;

        comparaisons++;
        if (plancher.min < bandeFinale.min) { marges++; instrumentsAvecMarge.add(def.id); }
        if (bandeFinale.min < plancher.min) {
          violations.push(
            `${def.id} — « au moins ${plancher.label} » (min ${plancher.min}) alors que le complet dont il est extrait rend « ${bandeFinale.label} » (min ${bandeFinale.min})`,
          );
        }
      }
    }
    return { comparaisons, marges, instrumentsAvecMarge, violations };
  }

  it('aucun sous-ensemble de réponses ne promet plus que la passation complète dont il est extrait', () => {
    const { comparaisons, instrumentsAvecMarge, violations } = eprouverPropriete();
    expect(violations, `plancher(s) dépassé(s) par le complet : ${violations.join(' | ')}`).toEqual([]);
    // Anti-vacuité en DEUX temps. Le compte de comparaisons ne suffit pas : c'est
    // lui qui rendait la première rédaction verte à vide, ses 41 comparaisons sur
    // 59 étant la bande de tête comparée à elle-même. Il faut de la MARGE — des
    // cas où le plancher est STRICTEMENT sous la bande finale.
    //
    // La mesure porte sur le nombre d'INSTRUMENTS DISTINCTS qui en produisent, et
    // non sur le nombre de marges : un compte brut se règle à une unité près du
    // seuil, et rougit alors pour une bande ajoutée à une grille, c'est-à-dire
    // pour une raison étrangère à la propriété.
    expect(comparaisons).toBeGreaterThan(20);
    expect(
      instrumentsAvecMarge.size,
      'trop peu d\'instruments produisent un plancher STRICTEMENT sous leur bande finale : le banc compare surtout des égalités et ne prouve presque rien',
    ).toBeGreaterThanOrEqual(6);
  });

  it('la couverture de la propriété est DÉCLARÉE, pas subie', () => {
    // Anti-angle-mort. `versBandeIntermediaire` écarte les grilles de moins de
    // trois bandes ; sans cette liste, cinq instruments sortaient du contrôle
    // sans que rien ne le dise, et le vert se lisait « tout est couvert ».
    const ecartes = eligibles()
      .filter((def: any) => versBandeIntermediaire(def) === null)
      .map((def: any) => def.id)
      .sort();
    expect(
      ecartes,
      `la liste des éligibles hors propriété a changé : la mettre à jour en connaissance de cause, ou comprendre pourquoi un instrument en sort.`,
    ).toEqual([...HORS_PROPRIETE].sort());
  });

  it('CONTRE-ÉPREUVE PAR MUTATION — un plancher trop optimiste fait rougir le banc', () => {
    // Ce que la première rédaction ne pouvait pas faire. On force le plancher à
    // la bande la PLUS SÉVÈRE de la grille : la propriété doit alors être violée
    // quelque part. Si ce test passe sans violation, c'est le contrôle ci-dessus
    // qui est vide, et non le moteur qui est bon.
    const { violations } = eprouverPropriete((_r, def) => {
      const grille = grilleDe(def);
      return grille ? grille[grille.length - 1] : null;
    });
    expect(violations.length, 'un plancher forcé à la bande la plus sévère ne viole rien : le contrôle de propriété ne contrôle rien').toBeGreaterThan(0);
  });

  it('AUCUN plancher ne transporte de conduite à tenir', () => {
    // Une bande dit ce que vaut la mesure, une conduite ce qu'il faut faire, et
    // `separerConduite` les sépare à un endroit unique — qui sort immédiatement
    // quand `interpretation` vaut `null`, c'est-à-dire précisément sur le recueil
    // partiel. Le plancher est donc le seul objet du moteur qui puisse porter un
    // `protocol` hors de l'entonnoir. Cinq instruments éligibles en déclarent un
    // sur leur bande la plus sévère.
    let planchersVus = 0;
    for (const def of eligibles()) {
      const complet = saturee(def);
      const ids = Object.keys(complet);
      const partiel = { ...complet };
      delete partiel[ids[ids.length - 1]];
      const r: any = calculateScore(def.id, partiel);
      const candidats = [r.bandePlancher, ...(r.subScores || []).map((s: any) => s.bandePlancher)];
      for (const p of candidats) {
        if (!p) continue;
        expect(p, `${def.id} — un plancher sort avec une conduite à tenir`).not.toHaveProperty('protocol');
        planchersVus++;
      }
    }
    expect(planchersVus).toBeGreaterThan(10);
  });
});

describe('sum — le plancher ne se sert que sur une grille déclarée croissante', () => {
  /** Valeurs légales d'une question, lues de ses options. */
  function valeurs(def: any, id: string): number[] {
    for (const sec of def.sections || []) {
      for (const q of sec.questions || []) {
        if (q.id === id) return (q.options || []).map((o: any) => o.v);
      }
    }
    return [];
  }

  function itemsDe(def: any): string[] {
    return (def.sections || []).flatMap((s: any) => (s.questions || []).map((q: any) => q.id));
  }

  it('un instrument à grille DÉCROISSANTE ne rend jamais de plancher', () => {
    // `Q_ALI_02` : « Très faible adhérence » en bas, « Bonne adhérence » en haut.
    // Un plancher de SCORE y serait un plafond de SÉVÉRITÉ — exactement le faux
    // positif rassurant que `D-014` combat, en pire.
    const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_ALI_02;
    expect(def.scoring.severiteCroissante).toBeUndefined();

    const items = itemsDe(def);
    const partiel: Record<string, number> = {};
    for (const id of items.slice(0, items.length - 2)) {
      const v = valeurs(def, id);
      partiel[id] = Math.max(...v);
    }
    const r: any = calculateScore('Q_ALI_02', partiel);
    expect(r.missing).toBeGreaterThan(0);
    expect(r.interpretation).toBeNull();
    expect(r.bandePlancher ?? null).toBeNull();
  });

  it('un instrument à grille croissante rend le plancher de la bande atteinte', () => {
    // `Q_SOM_02` (Epworth) : huit items cotés 0 à 3, grille croissante déclarée.
    const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_SOM_02;
    expect(def.scoring.severiteCroissante).toBe(true);

    const items = itemsDe(def);
    const grille = [...def.scoring.interpretation].sort((a: any, b: any) => a.min - b.min);
    const viser = grille[1].min; // la première bande AU-DESSUS de la plus basse

    // On sature les items un à un jusqu'à atteindre la cible, en en laissant au
    // moins un sans réponse — sans quoi il n'y aurait pas de recueil partiel.
    const partiel: Record<string, number> = {};
    let total = 0;
    for (const id of items.slice(0, items.length - 1)) {
      if (total >= viser) break;
      const max = Math.max(...valeurs(def, id));
      const pris = Math.min(max, viser - total);
      partiel[id] = pris;
      total += pris;
    }
    expect(total).toBe(viser);

    const r: any = calculateScore('Q_SOM_02', partiel);
    expect(r.total).toBe(viser);
    expect(r.missing).toBeGreaterThan(0);
    expect(r.interpretation).toBeNull();
    expect(r.bandePlancher?.label).toBe(grille[1].label);
    expect(r.bandePlancher?.garanti).toBe(true);
  });
});
