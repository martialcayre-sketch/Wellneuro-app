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

  it('Pichot : un score global sans rubrique reste une phrase unique', () => {
    const s = buildMiniSynthese(calculateScore('Q_SOM_06', toutesA('Q_SOM_06', '2')));
    expect(s).toBe(
      'Fatigue non significative selon le seuil fourni ; à interpréter selon le contexte clinique',
    );
    expect(s).not.toContain('Détail');
  });
});
