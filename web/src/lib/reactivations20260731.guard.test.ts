// Banc des deux instruments touchés le 2026-07-31 — cannabis et VQ11.
//
// Trois propriétés que le lot revendiquait sans les démontrer, relevées en revue
// adversariale. Chacune peut être défaite par une édition qui ne casse rien
// d'autre : une frontière déplacée, une conduite raccourcie, un item déplacé
// d'une composante à l'autre.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';

const DEF_TAB: any = (QUESTIONNAIRE_CATALOGUE as any).Q_TAB_04;
const DEF_PNE: any = (QUESTIONNAIRE_CATALOGUE as any).Q_PNE_01;

describe('Q_TAB_04 — les frontières de la source, et ce que la fusion coûte', () => {
  it('les deux valeurs qui CHANGENT DE BANDE sont 6 et 15, et elles changent dans les sens annoncés', () => {
    // Le lot annonce ces deux bascules ; sans épingle, un déplacement de
    // frontière les défait en silence. Le dépôt a le patron à côté — les 6 et 15
    // d'Epworth, les bornes du QDRS.
    const bande = (total: number) =>
      DEF_TAB.scoring.interpretation.find((b: any) => total >= b.min && total <= b.max)?.label;
    // 5 reste rassurant, 6 ne l'est plus : la frontière descend d'un cran.
    expect(bande(5)).toBe('Risque faible');
    expect(bande(6)).toBe('Risque réel');
    // 15 quitte la bande sévère, 16 y entre : la seconde frontière monte d'un cran.
    expect(bande(15)).toBe('Risque réel');
    expect(bande(16)).toBe('Risque aigu');
  });

  it('le pavage couvre 0 à 36 sans trou ni recouvrement', () => {
    for (let total = 0; total <= 36; total++) {
      const bandes = DEF_TAB.scoring.interpretation.filter(
        (b: any) => total >= b.min && total <= b.max);
      expect(bandes, `total ${total}`).toHaveLength(1);
    }
    expect(DEF_TAB.scoring.maxTotal).toBe(36);
  });

  it('le maximum DÉCLARÉ est le maximum EXÉCUTÉ — une borne déclarée peut mentir', () => {
    // Le défaut que ce lot corrige : 32 déclaré pour 36 atteignable, donc
    // « 34/32 » à la fiche. Le contrôle porte sur le moteur, pas sur le champ.
    const items = (DEF_TAB.sections ?? []).flatMap((s: any) => s.questions ?? []);
    const sature = Object.fromEntries(items.map((q: any) => [
      q.id,
      q.options?.length ? Math.max(...q.options.map((o: any) => Number(o.v ?? o.value))) : (q.max ?? 0),
    ]));
    const r: any = calculateScore('Q_TAB_04', sature);
    expect(r.total).toBe(DEF_TAB.scoring.maxTotal);
  });

  it('LA FUSION : les deux conduites sévères survivent toutes deux dans la bande de tête', () => {
    // « Aucune conduite n'est abandonnée » était vrai des CHAÎNES et faux de la
    // DISCRIMINATION — la quatrième bande portait la distinction usage nocif /
    // dépendance, et elle disparaît. Ce test garde ce qui peut l'être : les deux
    // textes. Un futur éditeur qui raccourcirait la conduite fusionnée en perdrait
    // un sans qu'aucun autre test bouge.
    const tete = DEF_TAB.scoring.interpretation.find((b: any) => b.max === 36);
    expect(tete.protocol).toContain('addictologue');
    expect(tete.protocol).toContain('sevrage progressif');
    expect(tete.protocol).toContain('prise en charge spécialisée');
    expect(tete.protocol).toContain('pharmacologique');
  });

  it('CE QUE LA FUSION COÛTE, épinglé plutôt que tu : 16 et 30 rendent le MÊME verdict', () => {
    // Avant, 16 relevait de « Usage nocif probable » et 30 de « Dépendance
    // probable » — deux orientations distinctes. La source ne connaît qu'une
    // bande sur cet intervalle : la distinction est perdue, et c'est le prix de
    // l'alignement, assumé par arbitrage praticien du 2026-07-31. Le jour où on
    // voudra la rétablir, ce test dira exactement ce qu'on avait accepté.
    const bande = (total: number) =>
      DEF_TAB.scoring.interpretation.find((b: any) => total >= b.min && total <= b.max);
    expect(bande(16)?.label).toBe(bande(30)?.label);
    expect(bande(16)?.protocol).toBe(bande(30)?.protocol);
  });
});

describe('Q_PNE_01 — la composition sur laquelle repose l’identification', () => {
  it('les trois composantes du VQ11 sont celles de la forme publiée', () => {
    // C'EST la pièce de la réouverture : l'instrument a été identifié comme le
    // VQ11 sur la correspondance exacte de ses onze items et de ses trois
    // composantes. Déplacer BP5 de la fonctionnelle vers la psychologique ne
    // ferait rougir aucun autre test, et invaliderait le motif en silence.
    const attendu = [
      { id: 'FONC', items: ['BP1', 'BP4', 'BP5', 'BP7', 'BP8'] },
      { id: 'PSY', items: ['BP2', 'BP6', 'BP10'] },
      { id: 'REL', items: ['BP3', 'BP9', 'BP11'] },
    ];
    const parId = new Map<string, any>(DEF_PNE.scoring.subScores.map((s: any) => [s.id, s]));
    expect(DEF_PNE.scoring.subScores).toHaveLength(3);
    for (const a of attendu) {
      expect(parId.get(a.id)?.items, a.id).toEqual(a.items);
    }
    // Les onze items, une seule fois chacun : une composante ne peut pas en
    // emprunter un à une autre.
    const tous = attendu.flatMap(a => a.items).sort();
    expect(new Set(tous).size).toBe(11);
  });

  it('aucune bande d’interprétation — c’est ce qui borne l’adaptation à quatre niveaux', () => {
    // Le support SIIN reproduit le VQ11 avec quatre niveaux de réponse là où la
    // forme publiée en compte cinq. Le registre borne la portée de cet écart sur
    // un fait précis : aucun seuil publié n'est appliqué à une échelle qui n'est
    // pas la sienne. Ajouter une bande demain défairait ce raisonnement sans
    // rien casser d'autre.
    expect(DEF_PNE.scoring.interpretation).toBeUndefined();
    const r: any = calculateScore('Q_PNE_01', Object.fromEntries(
      ['BP1','BP2','BP3','BP4','BP5','BP6','BP7','BP8','BP9','BP10','BP11'].map(id => [id, 3])));
    for (const s of r.subScores) expect(s.interpretation, s.id).toBeNull();
  });
});
