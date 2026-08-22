import { describe, expect, it } from 'vitest';
import { calculateScore, QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { buildMiniSynthese } from './miniSynthese';

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
