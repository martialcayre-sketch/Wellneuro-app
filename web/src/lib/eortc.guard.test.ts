// Banc du moteur EORTC — 2026-07-30.
//
// Les deux questionnaires du groupe Qualité de Vie de l'EORTC étaient servis par
// une SOMME BRUTE de leurs items, assortie de bandes locales : un nombre que la
// littérature EORTC ne décrit nulle part, et dont le questionnaire du sein
// portait une bande de tête inatteignable (« aucun problème signalé » couvrait
// 0–13 pour un plancher de 23 — la patiente sans aucune plainte ne pouvait pas la
// recevoir).
//
// Le moteur applique désormais la cotation officielle, relevée dans les manuels
// EORTC QLQ-C30 (3e éd., 2001) et QLQ-BR23 (version révisée). Ce banc vérifie les
// quatre règles qu'ils posent, une par une, parce qu'aucune ne se déduit des
// autres — et que trois d'entre elles ont un sens clinique inversé si on les rate.
import { describe, expect, it } from 'vitest';
import { calculateScore } from '@/lib/questions';

const echelle = (r: any, id: string) => r.subScores.find((s: any) => s.id === id);

/** Toutes les réponses d'un instrument à une même valeur. */
const uniforme = (prefixe: string, n: number, v: number, sauf: Record<string, number> = {}) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefixe}${i + 1}`, sauf[`${prefixe}${i + 1}`] ?? v]));

describe('EORTC — transformation linéaire 0-100 du manuel', () => {
  it('QLQ-C30 : le patient au mieux de sa forme obtient 100 en fonctionnel et 0 en symptômes', () => {
    // Items 1-28 à « pas du tout » (1), santé globale à 7. Fonctionnelles : RS=1
    // → S = (1 − 0/3) × 100 = 100. Symptômes : S = 0. Globale : (7−1)/6 × 100.
    const r: any = calculateScore('Q_CAN_01', { ...uniforme('QL', 28, 1), QL29: 7, QL30: 7 });
    expect(r.total, "l'EORTC ne définit aucun score global d'instrument").toBeNull();
    for (const id of ['C30PF2', 'C30RF2', 'C30EF', 'C30CF', 'C30SF']) {
      expect(echelle(r, id).total, `${id} fonctionnelle au maximum`).toBe(100);
    }
    for (const id of ['C30FA', 'C30NV', 'C30PA', 'C30DY', 'C30SL', 'C30AP', 'C30CO', 'C30DI', 'C30FI']) {
      expect(echelle(r, id).total, `${id} symptôme au minimum`).toBe(0);
    }
    expect(echelle(r, 'C30QL2').total, 'santé globale au maximum').toBe(100);
  });

  it('QLQ-C30 : le patient le plus atteint obtient 0 en fonctionnel et 100 en symptômes', () => {
    const r: any = calculateScore('Q_CAN_01', { ...uniforme('QL', 28, 4), QL29: 1, QL30: 1 });
    expect(echelle(r, 'C30PF2').total).toBe(0);
    expect(echelle(r, 'C30FA').total).toBe(100);
    expect(echelle(r, 'C30QL2').total, 'santé globale au minimum').toBe(0);
  });

  it('QLQ-C30 : une valeur intermédiaire suit exactement la formule du manuel', () => {
    // Fonctionnement émotionnel, items 21-24 à 2, 3, 3, 4 → RS = 3.
    // S = (1 − (3−1)/3) × 100 = 33,3. Le manuel donne cet exemple textuellement.
    const r: any = calculateScore('Q_CAN_01', { QL21: 2, QL22: 3, QL23: 3, QL24: 4 });
    expect(echelle(r, 'C30EF').total).toBe(33.3);
  });

  it('la santé globale utilise une étendue de 6, les autres de 3', () => {
    // Même position relative (le milieu) sur les deux types d'items : 4 sur 1-7
    // et 2,5 sur 1-4 donnent tous deux 50. Un range de 3 appliqué aux items 1-7
    // rendrait 200 — c'est cette confusion que le test épingle.
    const r: any = calculateScore('Q_CAN_01', { QL29: 4, QL30: 4, QL8: 2, QL11: 3 });
    expect(echelle(r, 'C30QL2').total).toBe(50);
    expect(echelle(r, 'C30DY').total, 'dyspnée : (2−1)/3 × 100').toBe(33.3);
    expect(echelle(r, 'C30SL').total, 'insomnie : (3−1)/3 × 100').toBe(66.7);
  });
});

describe('EORTC — l’inversion que le manuel BR23 exige', () => {
  // « Take into account that the scoring of questions 44, 45 and 46 must be
  // reversed prior to statistical analysis. » Ce sont nos BR14, BR15, BR16.
  //
  // C'est LA règle qui ne se devine pas : les items sont formulés « dans quelle
  // mesure vous êtes-vous intéressée à la sexualité » — une réponse haute est une
  // BONNE nouvelle, à l'inverse de toutes les autres échelles fonctionnelles du
  // module. Sans l'inversion, la formule fonctionnelle rend le contraire de la
  // réalité de la patiente.
  it('la patiente la plus intéressée obtient le fonctionnement sexuel le plus élevé', () => {
    const r: any = calculateScore('Q_CAN_02', { BR14: 4, BR15: 4, BR16: 4 });
    expect(echelle(r, 'BRSEF').total, 'intérêt maximal → fonctionnement maximal').toBe(100);
    expect(echelle(r, 'BRSEE').total, 'plaisir maximal → score maximal').toBe(100);
  });

  it('la patiente sans intérêt obtient le fonctionnement sexuel le plus bas', () => {
    const r: any = calculateScore('Q_CAN_02', { BR14: 1, BR15: 1 });
    expect(echelle(r, 'BRSEF').total).toBe(0);
  });

  it('l’image du corps, elle, n’est PAS inversée — la règle est ciblée', () => {
    // Contre-épreuve : BRBI est fonctionnelle comme BRSEF, mais ses items sont
    // formulés en négatif (« vous êtes-vous sentie moins attirante »). Inverser
    // les quatre échelles fonctionnelles « par cohérence » casserait celle-ci.
    const r: any = calculateScore('Q_CAN_02', { BR9: 1, BR10: 1, BR11: 1, BR12: 1 });
    expect(echelle(r, 'BRBI').total, 'aucune atteinte de l’image du corps → 100').toBe(100);
    const atteinte: any = calculateScore('Q_CAN_02', { BR9: 4, BR10: 4, BR11: 4, BR12: 4 });
    expect(echelle(atteinte, 'BRBI').total).toBe(0);
  });
});

describe('EORTC — absence et non-applicabilité ne sont pas des zéros', () => {
  it('une échelle dont moins de la moitié des items est répondue n’est pas scorée', () => {
    // Règle du manuel : XNUM >= NITEMS / 2. Effets secondaires = 7 items ; trois
    // réponses ne suffisent pas, quatre suffisent.
    const trois: any = calculateScore('Q_CAN_02', { BR1: 4, BR2: 4, BR3: 4 });
    expect(echelle(trois, 'BRST').total).toBeNull();
    expect(echelle(trois, 'BRST').raisonNonScore).toContain('moins de la moitié');

    const quatre: any = calculateScore('Q_CAN_02', { BR1: 4, BR2: 4, BR3: 4, BR4: 4 });
    expect(echelle(quatre, 'BRST').total, 'quatre items sur sept : la moitié est atteinte').toBe(100);
  });

  it('une passation vide n’atteint même pas le moteur', () => {
    // Le contrat exact, et la première rédaction de ce test ne le prouvait pas :
    // elle écrivait `(vide?.subScores ?? []).every(...)`, or la garde de #451
    // retourne AVANT le moteur et n'émet aucune clé `subScores` — `[].every()`
    // vaut `true` et l'assertion passait sans rien vérifier.
    for (const id of ['Q_CAN_01', 'Q_CAN_02']) {
      const vide: any = calculateScore(id, {});
      expect(vide.scored, `${id} : passation vide non scorée`).toBe(false);
      expect(vide.subScores, `${id} : aucune échelle émise du tout`).toBeUndefined();
      expect(vide.total ?? null).toBeNull();
    }
  });

  it('un déclencheur NON RÉPONDU laisse l’échelle indéterminée, pas « sans objet »', () => {
    // La faute que ce test empêche : `evalConditionnel` rend `false` aussi bien
    // sur un déclencheur répondu par la négative que sur un déclencheur MUET. Les
    // deux tombaient dans la même branche et l'échelle sortait « sans objet pour
    // cette patiente » — une phrase qui part dans la charge du modèle de synthèse,
    // donc dans ce que le praticien lit et dans le narratif rendu au patient. On
    // affirmait qu'une patiente n'avait pas eu d'activité sexuelle alors qu'elle
    // n'avait rien dit.
    const muet: any = calculateScore('Q_CAN_02', { BR1: 2 });
    expect(echelle(muet, 'BRSEE').notApplicable, 'rien n’autorise « sans objet »').toBeUndefined();
    expect(echelle(muet, 'BRHL').notApplicable).toBeUndefined();
    expect(muet.notApplicable).toEqual([]);
    // Indéterminé veut dire manquant : le badge « N manquant(s) » les relance.
    expect(muet.missingIds).toContain('BR16');
    expect(muet.missingIds).toContain('BR5');

    // Contre-épreuve : déclencheur RÉPONDU et négatif — là, « sans objet » est le
    // mot juste, et c'est ce que dit le manuel (« if item 45 is "not at all" »).
    const declare: any = calculateScore('Q_CAN_02', { BR1: 2, BR4: 1, BR15: 1 });
    expect(echelle(declare, 'BRSEE').notApplicable).toBe(true);
    expect(echelle(declare, 'BRHL').notApplicable).toBe(true);
    expect(declare.missingIds).not.toContain('BR16');
  });

  it('une seule réponse ne suffit à scorer que les échelles à un item', () => {
    // Frontière voisine, et c'est celle qui compte en pratique : le moteur tourne
    // bien, et la règle de la demi-moitié fait le tri. Un seul item répondu score
    // sa propre échelle mono-item et laisse toutes les autres à `null`.
    const r: any = calculateScore('Q_CAN_01', { QL8: 3 });
    expect(echelle(r, 'C30DY').total, 'dyspnée, échelle à un item').toBe(66.7);
    expect(echelle(r, 'C30PF2').total, 'fonctionnement physique : 0 item sur 5').toBeNull();
    expect(echelle(r, 'C30QL2').total, 'santé globale : 0 item sur 2').toBeNull();
  });

  it('le plaisir sexuel est SANS OBJET, pas manquant, si l’activité est « pas du tout »', () => {
    // Le manuel : « SEE is not applicable if item 45 is "not at all" ». La
    // distinction compte — « sans objet » et « non répondu » n'appellent pas la
    // même relance en consultation.
    const r: any = calculateScore('Q_CAN_02', { BR14: 2, BR15: 1 });
    const see = echelle(r, 'BRSEE');
    expect(see.total).toBeNull();
    expect(see.notApplicable).toBe(true);
    expect(see.raisonNonScore).toContain('sans objet');
  });

  it('la contrariété due à la perte de cheveux est sans objet s’il n’y a pas eu de perte', () => {
    const r: any = calculateScore('Q_CAN_02', { BR4: 1 });
    expect(echelle(r, 'BRHL').notApplicable).toBe(true);
  });
});

describe('EORTC — ce que la somme brute faisait et qui est réparé', () => {
  it('aucune échelle ne porte de bande inatteignable', () => {
    // Le défaut d'origine : la bande « aucun problème signalé » du BR23 couvrait
    // 0–13 pour un plancher de 23. Le patient sans plainte ne pouvait pas la
    // recevoir. Avec la cotation du manuel, chaque échelle atteint réellement
    // ses deux extrêmes — ici sur les deux instruments, aux deux bornes.
    for (const [id, prefixe, n] of [['Q_CAN_01', 'QL', 28], ['Q_CAN_02', 'BR', 23]] as const) {
      const bas: any = calculateScore(id, { ...uniforme(prefixe, n, 1), QL29: 1, QL30: 1 });
      const haut: any = calculateScore(id, { ...uniforme(prefixe, n, 4), QL29: 7, QL30: 7 });
      for (const s of bas.subScores) {
        if (s.total === null) continue;
        expect([0, 100], `${id}/${s.id} à la borne basse`).toContain(s.total);
      }
      for (const s of haut.subScores) {
        if (s.total === null) continue;
        expect([0, 100], `${id}/${s.id} à la borne haute`).toContain(s.total);
      }
    }
  });

  it('chaque échelle est lue dans SON sens — les deux bornes, en valeur signée', () => {
    // Le test des bornes ci-dessus n'assert que « 0 ou 100 » : formule et sens
    // basculent ENSEMBLE, si bien qu'inverser le sens d'une échelle le laisse
    // vert. Passer `BRAS` en fonctionnelle afficherait « symptômes du bras :
    // 100/100 » à une patiente qui n'en a aucun, sans qu'un test bouge. Ici
    // chaque échelle est nommée avec sa valeur attendue, dans les deux sens.
    const rien: any = calculateScore('Q_CAN_02', uniforme('BR', 23, 1));
    const tout: any = calculateScore('Q_CAN_02', uniforme('BR', 23, 4));
    const attendu: Array<[string, number | null, number | null]> = [
      ['BRST', 0, 100],   // symptôme
      ['BRAS', 0, 100],   // symptôme
      ['BRBS', 0, 100],   // symptôme
      ['BRBI', 100, 0],   // fonctionnelle, items formulés en négatif
      ['BRFU', 100, 0],   // fonctionnelle, item formulé en négatif
      ['BRSEF', 0, 100],  // fonctionnelle INVERSÉE : peu d'intérêt → fonctionnement bas
    ];
    for (const [id, bas, haut] of attendu) {
      expect(echelle(rien, id).total, `${id} avec toutes les réponses au minimum`).toBe(bas);
      expect(echelle(tout, id).total, `${id} avec toutes les réponses au maximum`).toBe(haut);
    }
    // BRHL et BRSEE dépendent d'un déclencheur : au minimum ils sont sans objet
    // (pas de perte de cheveux, pas d'activité), au maximum ils sont scorés.
    expect(echelle(rien, 'BRHL').notApplicable).toBe(true);
    expect(echelle(tout, 'BRHL').total, 'contrariété maximale').toBe(100);
    expect(echelle(rien, 'BRSEE').notApplicable).toBe(true);
    expect(echelle(tout, 'BRSEE').total, 'plaisir maximal (item inversé)').toBe(100);
  });

  it('les échelles à un item du C30 ne sont pas interverties', () => {
    // Toutes les autres épreuves emploient des réponses uniformes : un échange
    // entre constipation (item 16) et diarrhée (item 17) y passerait en silence.
    // Une réponse distincte par item l'attrape.
    const r: any = calculateScore('Q_CAN_01', { QL8: 4, QL11: 3, QL13: 2, QL16: 1, QL17: 4, QL28: 3 });
    expect(echelle(r, 'C30DY').total, 'dyspnée = item 8').toBe(100);
    expect(echelle(r, 'C30SL').total, 'insomnie = item 11').toBe(66.7);
    expect(echelle(r, 'C30AP').total, 'perte d’appétit = item 13').toBe(33.3);
    expect(echelle(r, 'C30CO').total, 'constipation = item 16').toBe(0);
    expect(echelle(r, 'C30DI').total, 'diarrhée = item 17').toBe(100);
    expect(echelle(r, 'C30FI').total, 'difficultés financières = item 28').toBe(66.7);
  });

  it('la frontière de la demi-moitié tombe juste sur une échelle PAIRE', () => {
    // 3-vs-4 sur sept items ne dit rien du cas pair : la règle du manuel est
    // `XNUM >= NITEMS / 2`, donc 2 sur 4 SCORE et 1 sur 4 non. Un « strictement
    // plus » passerait à sept items et échouerait ici.
    const deux: any = calculateScore('Q_CAN_02', { BR9: 1, BR10: 1 });
    expect(echelle(deux, 'BRBI').total, 'image du corps, 2 items sur 4').toBe(100);
    const un: any = calculateScore('Q_CAN_02', { BR9: 1 });
    expect(echelle(un, 'BRBI').total, 'image du corps, 1 item sur 4').toBeNull();
  });

  it('plus aucun total global n’est fabriqué', () => {
    // L'EORTC n'en définit aucun ; en rendre un revenait à inventer une mesure.
    for (const id of ['Q_CAN_01', 'Q_CAN_02']) {
      const r: any = calculateScore(id, { QL1: 2, BR1: 2 });
      expect(r.total, `${id} : aucun score global`).toBeNull();
      expect(r.interpretation ?? null, `${id} : aucune bande globale`).toBeNull();
    }
  });
});
