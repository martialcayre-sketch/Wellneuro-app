// Banc du volet « conjoint ou camarade de chambre » du PSQI — 2026-07-31.
//
// Le PSQI servi comptait 18 items là où sa source en compte 24. Arbitrage du
// praticien du 2026-07-31 : servir les 24. Les six items ajoutés sont la
// question 10 et ses cinq sous-questions 11a–11e.
//
// CE QUE CE BANC TIENT, et pourquoi il existe : ces six items NE SONT PAS
// COTÉS. Buysse 1989 construit les sept composantes et le total /21 sur les
// seules questions 1 à 9 — la question 10 et ses sous-parties sont
// informatives. Ajouter des items à un instrument sans toucher son score est
// exactement le genre de propriété qu'un remaniement ultérieur défait sans
// s'en apercevoir : le moteur `psqi` ne les nomme nulle part, donc rien dans le
// code ne dit qu'il ne DOIT pas les lire. C'est ce banc qui le dit.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { construireReponsesLisibles } from '@/lib/questionnaire-reponses';

const DEF: any = (QUESTIONNAIRE_CATALOGUE as any).Q_SOM_01;
const items = () => (DEF.sections ?? []).flatMap((s: any) => s.questions ?? []);

/** Passation complète des questions 1 à 9, au plancher rassurant. */
const NEUF_PREMIERES = {
  Q1: 23, Q2: 10, Q3: 7, Q4: 8,
  Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0,
  Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
  Q6: 0, Q7: 0, Q8: 0, Q9: 0,
};

/** Le volet partenaire à son PIRE : conjoint dans le même lit, tout à 3. */
const VOLET_AU_PIRE = { Q10: 3, Q11a: 3, Q11b: 3, Q11c: 3, Q11d: 3, Q11e: 3 };

describe('PSQI — les 24 items de la source sont servis', () => {
  it('sert 24 items, et ce sont ceux de la source', () => {
    const ids = items().map((q: any) => q.id);
    expect(ids).toEqual([
      'Q1', 'Q2', 'Q3', 'Q4',
      'Q5a', 'Q5b', 'Q5c', 'Q5d', 'Q5e', 'Q5f', 'Q5g', 'Q5h', 'Q5i', 'Q5j',
      'Q6', 'Q7', 'Q8', 'Q9',
      'Q10', 'Q11a', 'Q11b', 'Q11c', 'Q11d', 'Q11e',
    ]);
    expect(ids).toHaveLength(24);
  });

  it('la question 10 est posée à tout le monde, les cinq observations non', () => {
    // La 10 conditionne les cinq autres : elle ne peut pas être elle-même
    // conditionnelle, sinon personne n'y répond et les cinq restent muettes.
    const parId = new Map<string, any>(items().map((q: any) => [q.id, q]));
    expect(parId.get('Q10').conditionnel).toBeUndefined();
    for (const id of ['Q11a', 'Q11b', 'Q11c', 'Q11d', 'Q11e']) {
      // `conditionnel` vaut « facultatif » dans le formulaire patient : sans lui,
      // un patient qui dort seul ne peut pas terminer le questionnaire.
      expect(parId.get(id).conditionnel, `${id} doit rester facultatif`).toBe('Q10>=1');
    }
  });
});

describe('PSQI — le volet partenaire n’entre dans AUCUN score', () => {
  it('le pire volet possible ne bouge ni le total ni une seule composante', () => {
    // LA garde. Conjoint dans le même lit, ronflement fort, pauses
    // respiratoires, secousses, confusion, agitation — tout à « très
    // fréquemment ». Le score doit être identique à celui d'une passation où le
    // volet est vide.
    const sans: any = calculateScore('Q_SOM_01', { ...NEUF_PREMIERES });
    const avec: any = calculateScore('Q_SOM_01', { ...NEUF_PREMIERES, ...VOLET_AU_PIRE });

    expect(avec.total).toBe(sans.total);
    expect(avec.components).toEqual(sans.components);
    expect(avec.efficiency).toBe(sans.efficiency);
    expect(avec.interpretation).toEqual(sans.interpretation);
  });

  it('contre-épreuve : le même « 3 » sur un item COTÉ, lui, déplace le score', () => {
    // Sans elle, le test ci-dessus passerait aussi sur un moteur qui ignore
    // toutes ses entrées. `Q5b` appartient à la composante 5 ; trois y suffisent
    // à la faire passer de 0 à 1, donc le total de 0 à 1.
    const sans: any = calculateScore('Q_SOM_01', { ...NEUF_PREMIERES });
    const avec: any = calculateScore('Q_SOM_01', { ...NEUF_PREMIERES, Q5b: 3 });
    expect(sans.total).toBe(0);
    expect(avec.total).toBe(1);
    expect(avec.components.find((c: any) => c.id === 'C5').val).toBe(1);
  });

  it('le total reste borné à 21 sur sept composantes, volet renseigné ou non', () => {
    const pire = {
      Q1: 20, Q2: 120, Q3: 4, Q4: 3,
      Q5a: 3, Q5b: 3, Q5c: 3, Q5d: 3, Q5e: 3,
      Q5f: 3, Q5g: 3, Q5h: 3, Q5i: 3, Q5j: 3,
      Q6: 3, Q7: 3, Q8: 3, Q9: 3,
    };
    const r: any = calculateScore('Q_SOM_01', { ...pire, ...VOLET_AU_PIRE });
    expect(r.maxTotal).toBe(21);
    expect(r.total).toBe(21);
    expect(r.components).toHaveLength(7);
  });

  it('un volet renseigné SEUL ne fabrique aucun score', () => {
    // La garde de passation vide (#451) doit continuer de mordre : six réponses
    // qui n'alimentent aucune composante ne sont pas une passation.
    const r: any = calculateScore('Q_SOM_01', { ...VOLET_AU_PIRE });
    expect(r?.total ?? null).toBeNull();
  });
});

describe('PSQI — ce que le volet sert vraiment', () => {
  it('les observations du conjoint atteignent le praticien en toutes lettres', () => {
    // Recueillir sans restituer ne vaudrait rien. Les deux signaux d'apnée que
    // seul un tiers peut rapporter doivent ressortir avec leur libellé.
    const lisibles = construireReponsesLisibles(DEF, { ...NEUF_PREMIERES, ...VOLET_AU_PIRE });
    const parId = new Map(lisibles.map(r => [r.idQuestion, r]));

    expect(parId.get('Q11a')?.libelleQuestion).toBe('Un ronflement fort');
    expect(parId.get('Q11b')?.libelleQuestion).toBe('De longues pauses respiratoires pendant votre sommeil');
    expect(parId.get('Q11a')?.libelleReponse).toBe('Très fréquemment');
    expect(parId.get('Q10')?.libelleReponse).toBe('Conjoint dans le même lit');
    // Et sous leur section, pour que le praticien sache d'où vient l'observation.
    expect(parId.get('Q11b')?.section).toBe('Conjoint ou camarade de chambre');
  });
});
