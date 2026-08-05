// Banc des deux instruments touchés le 2026-07-31 — cannabis et VQ11.
//
// Trois propriétés que le lot revendiquait sans les démontrer, relevées en revue
// adversariale. Chacune peut être défaite par une édition qui ne casse rien
// d'autre : une frontière déplacée, une conduite raccourcie, un item déplacé
// d'une composante à l'autre.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';

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
  // Test (Kerssemakers, clinique Jellinek, 2000), et le servi ne partage AUCUN
  // item avec lui au sens strict — sur les 32 items relevés un à un, zéro paire
  // ne présente la même question ET les mêmes modalités ; neuf paires de même
  // construit, sept items propres au servi, sept propres à la source, soit
  // 9 + 7 = 16 de chaque côté. Elle demande la somme dépensée par semaine, la
  // fréquence d'ivresse cannabique, avec qui l'on fume ; le servi demande l'âge
  // de début, l'ancienneté, les symptômes respiratoires, les épisodes de
  // paranoïa. Une grille de lecture validée sur un instrument, posée sur un
  // autre, ne mesure rien.
  //
  // NE PAS RÉÉCRIRE « qu'UN item », ni citer « le manque » comme propre au
  // servi : CA6 a pour contrepartie l'item 13 de la source. Et FAIRE L'ADDITION
  // avant de republier un décompte — la rédaction qui a corrigé le « un item »
  // annonçait six paires et laissait sept items dans aucune catégorie. Les trois
  // versions ont été données pour « vérifiées ».
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
    // ET LE DÉNOMINATEUR AVEC. Ajouté le 2026-08-01 après revue : remettre
    // `maxTotal: sc.maxTotal` dans la branche `sum` laissait passer les 3229
    // tests de la suite. La moitié de la correction moteur n'était tenue par
    // rien. Un `/36` sans total n'est pas une demi-mesure, c'est une invitation
    // à refaire la somme à la main.
    expect(r.maxTotal).toBeUndefined();
  });

  it('rend la MÊME forme sur une passation vide que sur une passation pleine', () => {
    // La branche « aucune réponse ne correspond » est un autre chemin de sortie,
    // et elle rendait `maxTotal: 36` là où la branche pleine n'en rendait aucun.
    // Deux formes contradictoires pour le même instrument, toutes deux
    // persistées dans `scores_json` — donc relues plus tard par la fiche.
    const vide: any = calculateScore('Q_TAB_04', {});
    expect(vide.total).toBeNull();
    expect(vide.maxTotal).toBeUndefined();
  });

  it('est débaptisé : il ne s’annonce plus comme une évaluation, ni comme sa source', () => {
    // Il ne peut pas porter le nom de ce qu'il n'est pas — et « questionnaire
    // d'évaluation » promettait une mesure qu'il ne fait plus.
    //
    // LES QUATRE SURFACES, ET NON LE SEUL TITRE, depuis le 2026-08-01. Cette
    // garde ne balayait que `def.titre` : le mot « évalue » a donc survécu dans
    // les INSTRUCTIONS lues par le patient, juste sous un titre d'où elle
    // l'interdisait. Relevé en revue adversariale. Le patron est celui de la
    // débaptisation jumelle, `tdahEnseignantDebaptise.guard.test.ts` — les deux
    // catalogues portent des textes distincts, et le patient comme le praticien
    // ne voient pas le même : les garder tous les quatre est ce qui empêche d'en
    // débaptiser un seul.
    const auRayon: any = (QUESTIONNAIRES_CATALOG as any[]).find(q => q.id === 'Q_TAB_04');
    expect(auRayon, 'Q_TAB_04 doit exister au catalogue d’affichage').toBeDefined();
    for (const texte of [def.titre, def.instructions, auRayon.titre, auRayon.description]) {
      const t = String(texte).toLowerCase();
      expect(t, texte).not.toContain('évalu');
      expect(t, texte).not.toContain('know cannabis');
      expect(t, texte).not.toContain('jellinek');
      // Le dénominateur retiré du moteur ne doit pas revenir par la prose.
      expect(t, texte).not.toContain('/36');
    }
    expect(def.titre).toContain('WellNeuro');
  });

  it('la promesse faite au patient est tenue par le moteur', () => {
    // Le couplage que rien ne gardait : les instructions annoncent au patient
    // qu'il ne calcule aucun score et ne conclut rien. Si une bande était
    // réintroduite un jour — la note [11] du registre prévoit explicitement ce
    // cas — l'instrument recommencerait à conclure pendant que le texte lu par
    // le patient continuerait de promettre l'inverse. Le mensonge s'inverserait
    // sans que rien ne rougisse.
    expect(def.instructions.toLowerCase()).toContain('ne calcule aucun score');
    const tout = Object.fromEntries(
      (def.sections ?? []).flatMap((sec: any) => sec.questions ?? [])
        .map((q: any) => [q.id, Math.max(...q.options.map((o: any) => o.v))]),
    );
    for (const reponses of [tout, {}]) {
      const r: any = calculateScore('Q_TAB_04', reponses);
      expect(r.total).toBeNull();
      expect(r.maxTotal).toBeUndefined();
      expect(r.interpretation ?? null).toBeNull();
    }
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
