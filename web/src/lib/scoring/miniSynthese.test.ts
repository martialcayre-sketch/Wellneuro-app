import { describe, expect, it } from 'vitest';
import { calculateScore, QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { buildMiniSynthese } from './miniSynthese';
import { rubriquesDuScore } from './rubriques';

type IdQuestionnaire = keyof typeof QUESTIONNAIRE_CATALOGUE;

function itemsDe(idQuestionnaire: IdQuestionnaire): string[] {
  const q = QUESTIONNAIRE_CATALOGUE[idQuestionnaire];
  return (q?.sections ?? []).flatMap((s: { questions?: { id: string }[] }) =>
    (s.questions ?? []).map((x) => x.id),
  );
}

function toutesA(idQuestionnaire: IdQuestionnaire, valeur: string): Record<string, string> {
  return Object.fromEntries(itemsDe(idQuestionnaire).map((id) => [id, valeur]));
}

describe('buildMiniSynthese', () => {
  it('renvoie une chaîne vide sans throw pour null, undefined ou {}', () => {
    expect(buildMiniSynthese(null)).toBe('');
    expect(buildMiniSynthese(undefined)).toBe('');
    expect(buildMiniSynthese({})).toBe('');
  });

  it('renvoie une chaîne vide pour une entrée non-objet', () => {
    // @ts-expect-error scores brut non garanti conforme (JSON stocké)
    expect(buildMiniSynthese('texte')).toBe('');
  });

  it('interprétation globale simple → le label seul', () => {
    const result = buildMiniSynthese({ interpretation: { label: 'Fatigue modérée' } });
    expect(result).toBe('Fatigue modérée');
  });

  it('interprétation globale avec detail → label + detail concaténés', () => {
    const result = buildMiniSynthese({
      interpretation: { label: 'Fatigue modérée', detail: 'à surveiller sur 4 semaines' },
    });
    expect(result).toBe('Fatigue modérée. à surveiller sur 4 semaines');
  });

  it('interprétation globale avec protocol (sans detail) → orientation ajoutée', () => {
    const result = buildMiniSynthese({
      interpretation: { label: 'Fatigue sévère', protocol: 'Protocole 21 jours' },
    });
    expect(result).toBe('Fatigue sévère — Orientation : Protocole 21 jours');
  });

  it('label vide/blanc est ignoré, retombe sur les subScores puis sur vide', () => {
    expect(buildMiniSynthese({ interpretation: { label: '   ' } })).toBe('');
  });

  it('multi-axes (DNSM) — aucun axe perturbé', () => {
    const result = buildMiniSynthese({
      subScores: [
        { id: 'D', label: 'Dopamine', total: 5, interpretation: { label: 'Dans la norme', color: 'success' } },
        { id: 'S', label: 'Sérotonine', total: 4, interpretation: { label: 'Dans la norme', color: 'success' } },
      ],
    });
    expect(result).toBe('Tous les axes explorés sont peu perturbés.');
  });

  it('multi-axes (DNSM) — tri par sévérité et limite à 3 axes perturbés', () => {
    const result = buildMiniSynthese({
      subScores: [
        { id: 'D', label: 'Dopamine', total: 1, interpretation: { label: 'Perturbation légère', color: 'warning' } },
        { id: 'N', label: 'Noradrénaline', total: 1, interpretation: { label: 'Perturbation sévère', color: 'danger' } },
        { id: 'S', label: 'Sérotonine', total: 8, interpretation: { label: 'Dans la norme', color: 'success' } },
        { id: 'M', label: 'Mélatonine', total: 1, interpretation: { label: 'Perturbation modérée', color: 'warning' } },
      ],
    });
    // Danger avant warning : Noradrénaline en tête.
    expect(result).toBe(
      'Noradrénaline : perturbation sévère ; Dopamine : perturbation légère ; Mélatonine : perturbation modérée'
    );
  });

  it('subScores présent mais vide → chaîne vide', () => {
    expect(buildMiniSynthese({ subScores: [] })).toBe('');
  });
});

// Ces cas exécutent le MOTEUR RÉEL. Avant, tous s'arrêtaient à leur phrase
// globale : PSQI, Berlin, IDTAS-AE, QIF et le test des 5 mots rangent leurs
// rubriques sous `components`, `categories`, `parts` et `phases`, quatre clés
// que la mini-synthèse ne lisait pas. Le praticien ne voyait donc jamais les
// sept composantes d'un PSQI ni les deux phases d'un rappel.
describe('buildMiniSynthese — détail par rubrique sur les sorties réelles du moteur', () => {
  it('PSQI : la phrase globale, puis les sept composantes', () => {
    const reponses: Record<string, string> = {
      Q1: '23', Q2: '45', Q3: '7', Q4: '5', Q5a: '2', Q6: '2', Q7: '1', Q8: '1', Q9: '1',
    };
    for (const id of ['Q5b', 'Q5c', 'Q5d', 'Q5e', 'Q5f', 'Q5g', 'Q5h', 'Q5i', 'Q5j']) reponses[id] = '1';

    const s = buildMiniSynthese(calculateScore('Q_SOM_01', reponses));
    expect(s).toContain('Troubles du sommeil modérés');
    expect(s).toContain('Qualité subjective 2');
    expect(s).toContain('Dysfonction diurne 1');
    // Aucun maximum n'est déclaré par composante : ne pas en inventer un.
    expect(s).not.toContain('/3');
  });

  it('Berlin : les catégories positives sont nommées, pas chiffrées', () => {
    const s = buildMiniSynthese(
      calculateScore('Q_SOM_03', {
        BE1: '1', BE2: '2', BE3: '2', BE4: '1', BE5: '1', BE6: '2', BE7: '1', BE8: '1', BE9: '32',
      }),
    );
    expect(s).toContain('Catégories positives : Ronflements, Somnolence diurne, Facteurs de risque');
    // Deux des trois catégories n'ont pas de score. Les afficher « 0 » les
    // dirait négatives alors qu'elles sont positives.
    expect(s).not.toContain('Somnolence diurne 0');
  });

  it('Test des 5 mots : les deux phases du rappel apparaissent', () => {
    const s = buildMiniSynthese(calculateScore('Q_GEO_06', toutesA('Q_GEO_06', '1')));
    expect(s).toContain('Rappel immédiat 5/5');
    expect(s).toContain('Rappel différé 5/5');
  });

  it('QIF : le maximum du libellé ne se répète pas derrière la valeur', () => {
    const s = buildMiniSynthese(calculateScore('Q_FIB_02', toutesA('Q_FIB_02', '2')));
    expect(s).toContain('Absentéisme 2.9/10');
    expect(s).not.toContain('Absentéisme (/10)');
  });

  it("IDTAS-AE : la rubrique qui porte l'interprétation globale ne la répète pas", () => {
    const s = buildMiniSynthese(calculateScore('Q_NEU_12', toutesA('Q_NEU_12', '1')));
    const occurrences = s.split('trouble affectif saisonnier').length - 1;
    expect(occurrences).toBe(1);
    expect(s).toContain('Score GSS 6/24');
  });

  it('HAD : comportement inchangé — les deux sous-échelles portent seules le propos', () => {
    const s = buildMiniSynthese(calculateScore('Q_NEU_11', toutesA('Q_NEU_11', '2')));
    expect(s).toBe('Anxiété : symptomatologie certaine ; Dépression : symptomatologie certaine');
  });

  // Le défaut qu'une revue adversariale a reproduit sur ce questionnaire : la
  // déduplication retirait les quatre sous-échelles en « C » (le verdict
  // global) et « Rubriques à noter » nommait la SEULE en « B ». Le praticien
  // lisait donc, sous un titre de hiérarchie, la rubrique la moins atteinte.
  it('TFD : quand des rubriques portent le verdict global, on énumère au lieu de classer', () => {
    const s = buildMiniSynthese(
      calculateScore('Q_GAS_01', {
        C1_1: '3', C1_2: '1', C1_3: '1', C1_4: '0', C1_5: '2', C1_6: '3', C1_7: '0', C1_8: '1',
        C2_1: '2', C2_2: '2', C2_3: '1', C2_4: '3', C2_5: '1', C2_6: '2', C2_7: '0',
        C3_1: '2', C3_2: '3', C3_3: '1', C3_4: '3', C3_5: '2',
        C4_1: '2', C4_2: '3', C4_3: '2', C4_4: '2', C4_5: '3', C4_6: '3',
        C5_1: '2', C5_2: '0', C5_3: '0', C5_4: '3', C5_5: '3',
      }),
    );
    expect(s).toContain('C — Prédominance de troubles fonctionnels majeurs');
    expect(s).not.toContain('Rubriques à noter');
    // Les cinq sous-échelles, pas seulement celle qui échappe au verdict.
    for (const axe of ['Digestif supérieur', 'Moyen-grêle', 'Transit', 'Selles', 'Douleurs intestinales']) {
      expect(s).toContain(axe);
    }
  });

  it('les grades cliniques gardent leur majuscule — « B — … » n’est pas « b — … »', () => {
    const s = buildMiniSynthese({
      subScores: [
        { id: 'X', label: 'Digestif supérieur', total: 11, max: 24, interpretation: { label: 'B — Troubles fonctionnels modérés', color: 'warning' } },
        { id: 'Y', label: 'Transit', total: 3, max: 15, interpretation: { label: 'A — Peu de troubles', color: 'success' } },
      ],
    });
    expect(s).toContain('B — Troubles fonctionnels modérés');
    expect(s).not.toContain('b — troubles');
  });

  it("une rubrique non calculée reste dans l'énumération, marquée comme telle", () => {
    // Six domaines sur sept renseignés : le septième doit se voir.
    const s = buildMiniSynthese(
      calculateScore('Q_MOD_03', { Q001: '5', Q002: '5', Q003: '5', Q004: '5', Q005: '5', Q006: '5' }),
    );
    expect(s).toContain('Mobilité non calculé');
    expect(s.split(',').length).toBe(7);
  });

  it('Tinetti : le maximum du libellé est dépouillé même quand le champ le porte aussi', () => {
    const s = buildMiniSynthese({
      interpretation: { label: 'Risque de chute' },
      subScores: [
        { id: 'E', label: 'Équilibre (/16)', total: 12, max: 16 },
        { id: 'M', label: 'Marche (/12)', total: 9, max: 12 },
      ],
    });
    expect(s).toContain('Équilibre 12/16');
    expect(s).not.toContain('(/16)');
  });

  // Changement de comportement assumé, verrouillé ici. L'ancienne version
  // affirmait « tous les axes explorés sont peu perturbés » sur des rubriques
  // qui ne portent AUCUNE interprétation — une réassurance qu'aucune donnée ne
  // soutenait. Concerne UPPS, Conners, BPCO, Monnier, QCT2 et SIGH-SAD.
  it('des rubriques sans interprétation ne produisent plus une fausse réassurance', () => {
    const s = buildMiniSynthese(calculateScore('Q_PED_02', toutesA('Q_PED_02', '3')));
    expect(s).not.toContain('peu perturbés');
    expect(s).toContain('Items clés de repérage 24/24');
  });

  it('une rubrique interprétée et non perturbée reste rassurante', () => {
    const s = buildMiniSynthese({
      subScores: [
        { id: 'D', label: 'Dopamine', total: 5, interpretation: { label: 'Dans la norme', color: 'success' } },
        { id: 'S', label: 'Sérotonine', total: 4, interpretation: { label: 'Dans la norme', color: 'success' } },
      ],
    });
    expect(s).toBe('Tous les axes explorés sont peu perturbés.');
  });

  it('Francis : le troisième instrument à `components` est bien couvert', () => {
    const s = buildMiniSynthese(calculateScore('Q_GAS_02', toutesA('Q_GAS_02', '50')));
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain('Détail');
  });

  // EVA — famille sans interprétation (`D-088`). La mini-synthèse ne fabrique
  // AUCUNE phrase à partir d'un total nu : elle rend '' plutôt que d'inventer
  // le verdict que l'instrument refuse de rendre (`DC-19`, `DC-27`).
  it('EVA sans interprétation : aucune phrase, pas même une reformulation du total', () => {
    const s = buildMiniSynthese({
      type: 'sum_no_interpretation',
      total: 10,
      maxTotal: 20,
      interpretation: null,
    });
    expect(s).toBe('');
  });

  it('Pichot : un score global sans rubrique reste une phrase unique', () => {
    const s = buildMiniSynthese(calculateScore('Q_SOM_06', toutesA('Q_SOM_06', '2')));
    expect(s).toBe(
      'Fatigue non significative selon le seuil fourni ; à interpréter selon le contexte clinique',
    );
    expect(s).not.toContain('Détail');
  });
});

// LA COULEUR `dark` ET LA COULEUR `info` ([[D-274]]). Le DASS-21 est le seul
// instrument du catalogue qui les porte au niveau de la RUBRIQUE (« Très
// sévère », « Léger »). Avant D-274, un axe très sévère sortait du résumé :
// « Tous les axes explorés sont peu perturbés » à D 21/21. Réponses de
// fixture, jouées sur le moteur réel.
describe('buildMiniSynthese — DASS-21 : « Très sévère » et « Léger » sont nommés ([[D-274]])', () => {
  const D = ['Q003', 'Q005', 'Q010', 'Q013', 'Q016', 'Q017', 'Q021'];
  const A = ['Q002', 'Q004', 'Q007', 'Q009', 'Q015', 'Q019', 'Q020'];
  const S = ['Q001', 'Q006', 'Q008', 'Q011', 'Q012', 'Q014', 'Q018'];
  const z = [0, 0, 0, 0, 0, 0, 0];
  const max = [3, 3, 3, 3, 3, 3, 3];
  function dass(d: number[], a: number[], s: number[]): string {
    const reponses: Record<string, number> = {};
    D.forEach((k, i) => { reponses[k] = d[i]; });
    A.forEach((k, i) => { reponses[k] = a[i]; });
    S.forEach((k, i) => { reponses[k] = s[i]; });
    return buildMiniSynthese(calculateScore('Q_STR_04', reponses) as Record<string, unknown>);
  }

  it('D très sévère, A et S normaux : la dépression est nommée, jamais la phrase rassurante', () => {
    const phrase = dass(max, z, z);
    expect(phrase).toBe('Dépression : très sévère');
    expect(phrase).not.toMatch(/peu perturbés/);
  });

  it('D très sévère, A modéré : la dépression vient en premier', () => {
    expect(dass(max, [3, 3, 0, 0, 0, 0, 0], z)).toBe('Dépression : très sévère ; Anxiété : modéré');
  });

  it('les trois axes très sévères : les trois sont nommés', () => {
    const phrase = dass(max, max, max);
    expect(phrase.split(' ; ')).toHaveLength(3);
    expect(phrase).not.toMatch(/peu perturbés/);
    for (const axe of ['Dépression', 'Anxiété', 'Stress']) expect(phrase).toContain(`${axe} : très sévère`);
  });

  it('deux axes très sévères et un modéré : le modéré passe derrière', () => {
    // La configuration mesurée en production le 2026-10-08 (en agrégat) :
    // le résumé ne nommait que l'axe modéré.
    const phrase = dass(max, max, [3, 3, 3, 1, 0, 0, 0]);
    expect(phrase).toMatch(/^(Dépression|Anxiété) : très sévère ; (Dépression|Anxiété) : très sévère ; Stress : modéré$/);
  });

  it('très sévère passe AVANT sévère, même placé après dans l’ordre de l’instrument', () => {
    // Le tri est stable : seul un axe plus grave placé APRÈS un moins grave
    // prouve le rang. `dark` à égalité avec `danger` laisserait la dépression
    // (sévère) devant l'anxiété (très sévère).
    expect(dass([3, 3, 3, 3, 0, 0, 0], max, z)).toBe('Anxiété : très sévère ; Dépression : sévère');
  });

  it('témoin `danger` inchangé : D sévère, A modéré', () => {
    expect(dass([3, 3, 3, 3, 0, 0, 0], [3, 3, 0, 0, 0, 0, 0], z)).toBe('Dépression : sévère ; Anxiété : modéré');
  });

  it('un axe léger est nommé, et retire la phrase rassurante', () => {
    // D 5 = « Léger » (5-6) ; A et S normaux.
    const phrase = dass([3, 2, 0, 0, 0, 0, 0], z, z);
    expect(phrase).toBe('Dépression : léger');
  });

  it('léger passe derrière modéré', () => {
    expect(dass([3, 2, 0, 0, 0, 0, 0], [3, 3, 0, 0, 0, 0, 0], z)).toBe('Anxiété : modéré ; Dépression : léger');
  });

  it('les trois axes normaux restent rassurants', () => {
    expect(dass(z, z, z)).toBe('Tous les axes explorés sont peu perturbés.');
  });
});

// LA GARDE DU CATALOGUE ([[D-274]] §2). La décision repose sur un fait : au
// niveau de la RUBRIQUE, seules les bandes « Léger » (`info`) et « Très
// sévère » (`dark`) du DASS-21 portent ces couleurs. Les libellés `info` non
// défavorables (« Niveau de stress bas », « Modérément du matin ») sont des
// interprétations globales, que la mini-synthèse recopie sans les trier. Un
// instrument futur qui mettrait un tel libellé sur une RUBRIQUE le ferait
// nommer comme axe à noter, et retirerait la phrase rassurante : ce banc
// rougit alors, et la décision est à reprendre.
describe('buildMiniSynthese — `info` et `dark` au niveau des rubriques : le DASS-21 seul ([[D-274]])', () => {
  it('aucun autre couple (instrument, libellé) ne porte `info` ou `dark` sur une rubrique', () => {
    const admis = new Set(['Q_STR_04|Léger', 'Q_STR_04|Très sévère']);
    const vus = new Set<string>();
    for (const id of Object.keys(QUESTIONNAIRE_CATALOGUE) as IdQuestionnaire[]) {
      const questions = (QUESTIONNAIRE_CATALOGUE[id]?.sections ?? []).flatMap(
        (s: { questions?: { id: string; options?: { v?: unknown }[] }[] }) => s.questions ?? [],
      );
      if (questions.length === 0) continue;
      // Niveaux déterministes : du minimum au maximum de chaque échelle, avec
      // un décalage par item pour croiser les rubriques entre elles.
      for (let niveau = 0; niveau <= 10; niveau += 1) {
        for (let decalage = 0; decalage < 4; decalage += 1) {
          const reponses: Record<string, unknown> = {};
          questions.forEach((q, i) => {
            const valeurs = (q.options ?? []).map(o => o.v).filter(v => v !== undefined);
            if (valeurs.length === 0) return;
            const p = Math.max(0, Math.min(1, (niveau + ((i * decalage) % 5) - 2) / 10));
            reponses[q.id] = valeurs[Math.round(p * (valeurs.length - 1))];
          });
          const scores = calculateScore(id, reponses) as Record<string, unknown>;
          if (!scores || 'error' in scores) continue;
          for (const r of rubriquesDuScore(scores)) {
            const couleur = r.interpretation?.color;
            if (couleur === 'info' || couleur === 'dark') vus.add(`${id}|${r.interpretation!.label}`);
          }
        }
      }
    }
    expect([...vus].filter(couple => !admis.has(couple))).toEqual([]);
    // Témoin : le balayage atteint bien les deux bandes admises — sinon il
    // prouverait le vide.
    expect(vus).toEqual(admis);
  });
});

