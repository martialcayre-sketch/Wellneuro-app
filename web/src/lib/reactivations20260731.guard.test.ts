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

describe('Q_TAB_04 — les bandes empruntées, et pourquoi elles sont parties', () => {
  // CE BLOC A CHANGÉ DE SENS LE 2026-08-01, et le récit vaut d'être gardé.
  //
  // Il épinglait, jusque-là, l'alignement du 2026-07-31 (#497) : trois bandes
  // 0-5 / 6-15 / 16-36 reprises « de la source », la fusion des deux conduites
  // sévères, et le coût de cette fusion sur 23 des 37 totaux. Tout cela était
  // exact — les trois bandes SONT bien celles de la source, elles se lisent à la
  // dernière page de WN-SRC-0495.
  //
  // Ce qui ne l'était pas : elles s'appliquaient à des items qui ne sont PAS
  // ceux pour lesquels elles ont été établies. La source est le Know Cannabis
  // Test, et le servi ne partage qu'UN item avec lui — elle demande la somme
  // dépensée par semaine, la fréquence d'ivresse cannabique, avec qui l'on fume ;
  // le servi demande l'âge de début, la tolérance, le manque, les symptômes
  // respiratoires. Une grille de lecture validée sur un instrument, posée sur un
  // autre, ne mesure rien.
  //
  // Et reconstruire le servi sur la source était impossible sans inventer : elle
  // porte ses 16 items avec leurs modalités, puis la grille de résultats — et
  // AUCUN point par option entre les deux. Arbitrage praticien du 2026-08-01 :
  // débaptiser et retirer les bandes.
  const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_TAB_04;

  it('ne porte plus aucune bande, et plus aucune conduite', () => {
    expect(def.scoring.interpretation).toBeUndefined();
    const tout = Object.fromEntries(
      (def.sections ?? []).flatMap((sec: any) => sec.questions ?? [])
        .map((q: any) => [q.id, Math.max(...q.options.map((o: any) => o.v))]),
    );
    const r: any = calculateScore('Q_TAB_04', tout);
    expect(r.interpretation ?? null).toBeNull();
    // Le contrôle porte sur le TEXTE servi, pas seulement sur l'absence de clé :
    // une conduite réintroduite dans un libellé de bande serait invisible d'un
    // `toBeUndefined`.
    expect(JSON.stringify(def.scoring)).not.toMatch(/protocol/);
  });

  it('ne rend plus de total : la somme elle-même est retirée', () => {
    // Ce moteur est une `sum` — sans bande, son total serait un « Score brut »
    // nu, sans dénominateur ni lecture, c'est-à-dire une sévérité qu'aucun
    // barème ne définit. `sansTotalGlobal` ne valait que pour `subscore` jusqu'au
    // 2026-08-01 ; il vaut maintenant dans les deux moteurs, et c'est en le
    // mesurant ICI qu'on a vu qu'il ne faisait rien.
    expect(def.scoring.sansTotalGlobal).toBe(true);
    const tout = Object.fromEntries(
      (def.sections ?? []).flatMap((sec: any) => sec.questions ?? [])
        .map((q: any) => [q.id, Math.max(...q.options.map((o: any) => o.v))]),
    );
    const r: any = calculateScore('Q_TAB_04', tout);
    expect(r.total).toBeNull();
  });

  it('est débaptisé : il ne s’annonce plus comme une évaluation, ni comme sa source', () => {
    // Il ne peut pas porter le nom de ce qu'il n'est pas — et « questionnaire
    // d'évaluation » promettait une mesure qu'il ne fait plus.
    expect(def.titre).toContain('WellNeuro');
    expect(def.titre.toLowerCase()).not.toContain('évaluation');
    expect(def.titre.toLowerCase()).not.toContain('know cannabis');
  });

  it('sert toujours ses 16 items (contrôle négatif)', () => {
    // Sans lui, vider l'instrument ferait passer les trois tests ci-dessus.
    const items = (def.sections ?? []).flatMap((sec: any) => sec.questions ?? []);
    expect(items).toHaveLength(16);
    expect(items.map((q: any) => q.id)).toEqual(
      Array.from({ length: 16 }, (_, k) => `CA${k + 1}`),
    );
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
