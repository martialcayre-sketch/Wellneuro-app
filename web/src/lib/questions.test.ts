import { describe, expect, it } from 'vitest';
import { calculateScore, computeScoreFromDef } from './questions';

describe('calculateScore', () => {
  it('renvoie une erreur explicite pour un identifiant de questionnaire inconnu', () => {
    const result = calculateScore('Q_INCONNU_99', {});
    expect(result).toEqual({ error: 'Questionnaire introuvable' });
  });

  it('Q_SOM_06 (Pichot, sum) — 8 items 2,2,1,1,1,1,1,1 sur 0-4 donne un total de 10/32', () => {
    const result = calculateScore('Q_SOM_06', {
      P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1',
    });
    expect(result.type).toBe('sum');
    expect(result.total).toBe(10);
    expect(result.maxTotal).toBe(32);
    expect(result.interpretation.label).toBe(
      'Fatigue non significative selon le seuil fourni ; à interpréter selon le contexte clinique'
    );
    expect(result.interpretation.color).toBe('success');
  });

  it('Q_CAN_02 (sum_items) — un item conditionnel inclus/exclus selon la réponse au déclencheur', () => {
    // BR4 (perte de cheveux) = 1 (< 2) → BR5 conditionnel (BR4>=2) devient non applicable.
    // BR15 (activité sexuelle) = 3 (>= 2) → BR16 conditionnel (BR15>=2) devient applicable,
    // mais reste sans réponse → comptabilisé en item manquant, pas en erreur.
    const answers: Record<string, string> = { BR4: '1', BR15: '3' };
    for (const id of [
      'BR1', 'BR2', 'BR3', 'BR6', 'BR7', 'BR8', 'BR9', 'BR10', 'BR11', 'BR12', 'BR13',
      'BR14', 'BR17', 'BR18', 'BR19', 'BR20', 'BR21', 'BR22', 'BR23',
    ]) {
      answers[id] = '2';
    }

    const result = calculateScore('Q_CAN_02', answers);

    // Le moteur est passé de `sum_items` à `eortc` le 2026-07-30 : la somme brute
    // de 42 et sa bande « Rares problèmes occasionnels » n'existent plus — le
    // manuel EORTC ne définit aucun score global d'instrument. Ce que ce test
    // garde reste le même : le traitement des items conditionnels.
    expect(result.type).toBe('eortc');
    expect(result.notApplicable).toEqual(['BR5']);
    expect(result.missingIds).toEqual(['BR16']);
    expect(result.missing).toBe(1);
    expect(result.total).toBeNull();
    // BR5 est le seul item de son échelle : sans objet, elle n'est pas scorée.
    const hl = result.subScores.find((s: any) => s.id === 'BRHL');
    expect(hl.total).toBeNull();
    expect(hl.notApplicable).toBe(true);
    // BR16 manque mais BR15 a répondu : l'échelle du plaisir sexuel est bien
    // applicable, et c'est l'absence de réponse — pas le protocole — qui la laisse
    // sans score. Les deux cas se ressemblaient dans l'ancien `notApplicable`.
    const see = result.subScores.find((s: any) => s.id === 'BRSEE');
    expect(see.total).toBeNull();
    expect(see.notApplicable).toBeUndefined();
  });

  it('Q_CAN_02 (sum_items) — aucune réponse ne provoque pas de throw et dégrade proprement', () => {
    expect(() => calculateScore('Q_CAN_02', {})).not.toThrow();
    const result = calculateScore('Q_CAN_02', {});
    // Ces trois lignes attendaient `total: 0`, `missing: 21` et la liste des items
    // non applicables jusqu'au 2026-07-29 : le moteur produisait un résultat
    // complet à partir d'aucune réponse, et `Q_CAN_02` sortait « Aucun problème
    // signalé ». « Dégrader proprement » veut dire ne rien affirmer.
    expect(result.scored).toBe(false);
    expect(result.total).toBeNull();
    expect(result.interpretation).toBeNull();
    expect(result.raisonNonScore).toBeTruthy();
  });

  it('Q_CAN_02 — une seule réponse suffit à retrouver le détail du moteur', () => {
    // La garde ne mord QUE sur le vide : dès qu'une réponse existe, le moteur
    // reprend la main et rend `missing`, `notApplicable` et son total.
    const result = calculateScore('Q_CAN_02', { BR1: 1 });
    expect(result.scored).not.toBe(false);
    // Plus de total global (moteur `eortc`) : une réponse isolée ne renseigne
    // qu'un septième de son échelle, laquelle reste donc sans score.
    expect(result.total).toBeNull();
    expect(result.subScores.find((s: any) => s.id === 'BRST').total).toBeNull();
    // Sans réponse au DÉCLENCHEUR, BR5 et BR16 ne sont plus « non applicables »
    // depuis le 2026-07-30 : ils sont INDÉTERMINÉS, donc comptés comme manquants.
    // Les déclarer sans objet revenait à affirmer, dans la charge du modèle de
    // synthèse, que la patiente n'avait pas perdu ses cheveux et n'avait pas eu
    // d'activité sexuelle — alors qu'elle n'avait rien dit.
    expect(result.notApplicable).toEqual([]);
    expect(result.missingIds).toContain('BR5');
    expect(result.missingIds).toContain('BR16');
  });

  // ── Une bande ne se lit que sur l'instrument complet (`sum`, `bms_average`) ──
  //
  // Ce que ces cas épinglent, et ce qu'ils N'épinglent pas. La garde ne protège
  // pas d'un cas d'école : la seule barrière de complétude est celle du
  // NAVIGATEUR, et `api/patient/submit` ne l'exige que pour `def.cabinet` — or
  // aucun instrument servi par `sum` n'est de cabinet. Un POST partiel
  // authentifié est accepté aujourd'hui. Ce qui est nul, c'est le déjà-écrit :
  // aucune réponse en base n'est partielle. Le premier cas est donc le plus
  // important de tous — il prouve que rien de ce qui existe ne bouge.
  //
  // Le compte d'instruments est dans `questions.ts` (26 drapeau éteint, 25
  // allumé) ; ne pas le recopier ici, un chiffre à deux endroits se périme à un
  // seul.

  it('Q_SOM_06 (sum) complet — la bande est INCHANGÉE par la garde de complétude', () => {
    const result = calculateScore('Q_SOM_06', {
      P1: '3', P2: '3', P3: '3', P4: '3', P5: '3', P6: '3', P7: '3', P8: '3',
    });
    expect(result.total).toBe(24);
    expect(result.missing).toBe(0);
    expect(result.repondus).toBe(8);
    // La bande haute de Pichot, servie comme avant.
    expect(result.interpretation).not.toBeNull();
    expect(result.interpretation.label).toBe(
      'Signe de fatigue ; à évoquer avec le médecin ou le thérapeute'
    );
  });

  it('Q_SOM_06 (sum) partiel — le total reste, la bande tombe', () => {
    // Cinq items à 4 : 20, soit la bande « fatigue excessive » de l'instrument
    // COMPLET. Trois items n'ont pas été posés — les compter pour zéro comme le
    // faisait ce moteur SOUS-classait le patient, et c'est ici la direction
    // inverse qui est en jeu : 20 sur cinq items n'est pas 20 sur huit.
    const result = calculateScore('Q_SOM_06', {
      P1: '4', P2: '4', P3: '4', P4: '4', P5: '4',
    });
    expect(result.type).toBe('sum');
    expect(result.total).toBe(20);
    expect(result.missing).toBe(3);
    expect(result.repondus).toBe(5);
    expect(result.interpretation).toBeNull();
    expect(result.note).toContain('3 items');
    expect(result.note).toContain('Recueil partiel');
  });

  it('Q_SOM_06 (sum) — un seul item manquant suffit à retirer la bande', () => {
    // La mutation la plus tentante consiste à remplacer `missing > 0` par
    // `repondus === 0` : elle rétablit l'ancienne tolérance en gardant
    // l'apparence d'un garde. Un seul item manquant l'attrape.
    const result = calculateScore('Q_SOM_06', {
      P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1',
    });
    expect(result.missing).toBe(1);
    expect(result.repondus).toBe(7);
    expect(result.total).toBe(9);
    expect(result.interpretation).toBeNull();
    expect(result.note).toContain('1 item');
  });

  it('Q_SOM_06 (sum) — aucune réponse : la garde générale de passation vide prime', () => {
    const result = calculateScore('Q_SOM_06', {});
    expect(result.scored).toBe(false);
    expect(result.total).toBeNull();
    expect(result.interpretation).toBeNull();
    expect(result.raisonNonScore).toBeTruthy();
  });

  it('Q_STR_05 (BMS-10, bms_average) complet — moyenne et bande INCHANGÉES', () => {
    const answers: Record<string, string> = {};
    for (let i = 1; i <= 10; i++) answers[`B${i}`] = '5';
    const result = calculateScore('Q_STR_05', answers);
    expect(result.type).toBe('bms_average');
    expect(result.total).toBe(50);
    expect(result.average).toBe(5);
    expect(result.missing).toBe(0);
    expect(result.repondus).toBe(10);
    expect(result.interpretation.label).toBe('Élevé');
  });

  it('Q_STR_05 (bms_average) partiel — la moyenne tombe AVEC la bande', () => {
    // Six « Souvent » (5) sur dix. L'ancien moteur divisait par 10 : 30/10 = 3,0,
    // soit « Faible » — deux bandes sous ce que les six réponses disent. Le
    // dénominateur n'est pas « corrigé » à 6 pour autant : la source ne définit
    // aucune moyenne partielle, et la grille 1,0-7,0 n'y a jamais été calibrée.
    const answers: Record<string, string> = {};
    for (let i = 1; i <= 6; i++) answers[`B${i}`] = '5';
    const result = calculateScore('Q_STR_05', answers);
    expect(result.total).toBe(30);
    expect(result.average).toBeNull();
    expect(result.interpretation).toBeNull();
    expect(result.missing).toBe(4);
    expect(result.repondus).toBe(6);
    expect(result.note).toContain('4 items');
  });

  it('Q_STR_05 (bms_average) — un seul item manquant retire moyenne ET bande', () => {
    const answers: Record<string, string> = {};
    for (let i = 1; i <= 9; i++) answers[`B${i}`] = '2';
    const result = calculateScore('Q_STR_05', answers);
    expect(result.missing).toBe(1);
    expect(result.total).toBe(18);
    // Sans la garde : 18/10 = 1,8 → « Très faible ». Avec : rien n'est affirmé.
    expect(result.average).toBeNull();
    expect(result.interpretation).toBeNull();
  });

  // ── Les deux branches que les cas ci-dessus ne touchent pas ────────────────

  it("Q_STR_02 (sum) partiel — la note de recueil S'AJOUTE à celle de l'instrument", () => {
    // `note: [sc.note || null, noteRecueil].filter(Boolean).join(' ')` n'était
    // exercé par aucun cas : `Q_SOM_06` et `Q_STR_05` n'ont pas de `sc.note`, si
    // bien que la concaténation et un simple remplacement rendaient la même
    // chose. La mutation `note: noteRecueil || sc.note` passait T1 et T3 au vert
    // en perdant l'harmonisation de seuils EXACTEMENT quand elle compte — sur le
    // résultat où le praticien a le plus besoin de savoir comment le seuil est
    // tranché.
    //
    // `Q_STR_02` (PSS-10) porte cette note-là : le 27 y est rattaché au niveau
    // élevé, borne que le « >27 » de la source ne couvre pas explicitement.
    const answers: Record<string, string> = {};
    for (let i = 1; i <= 9; i++) answers[`P${i}`] = '3';
    const result = calculateScore('Q_STR_02', answers);
    expect(result.missing).toBe(1);
    expect(result.interpretation).toBeNull();
    // Les DEUX doivent être là. Tester la seule présence de « Recueil partiel »
    // laisserait passer le remplacement.
    expect(result.note).toContain('Le score 27 est rattaché au niveau élevé');
    expect(result.note).toContain('Recueil partiel');

    // Et sur une passation complète, la note de l'instrument est servie SEULE :
    // sans cette moitié, une note qui concaténerait toujours passerait.
    answers.P10 = '3';
    const complet = calculateScore('Q_STR_02', answers);
    expect(complet.missing).toBe(0);
    expect(complet.note).toContain('Le score 27 est rattaché au niveau élevé');
    expect(complet.note).not.toContain('Recueil partiel');
  });

  it('`repondus === 0` — tous les items écartés par leur conditionnel, sur `sum` et `bms_average`', () => {
    // Clause INATTEIGNABLE par le catalogue : aucun instrument servi par ces
    // deux moteurs n'a d'item conditionnel, si bien que la retirer laissait le
    // banc vert. Elle n'est pourtant pas décorative — c'est le seul cas où
    // `missing` vaut 0 sans qu'une seule réponse ait été comptée : un item
    // conditionnel dont la condition n'est pas remplie sort de `sumItems` sans
    // être compté nulle part (voir son commentaire). `total` vaut alors 0, et 0
    // décroche la bande la plus basse.
    //
    // La garde générale de passation vide ne couvre pas ce cas : elle exige que
    // TOUS les items soient nuls, et ici l'item déclencheur est renseigné.
    //
    // Définition forgée, faute d'instrument servi — même raison qu'ailleurs : ce
    // qui est vérifié est le contrat du moteur.
    const sections = [{
      id: 'A',
      questions: [
        { id: 'A1', type: 'number', min: 0, max: 10, conditionnel: 'G>=2' },
        { id: 'A2', type: 'number', min: 0, max: 10, conditionnel: 'G>=2' },
      ],
    }];
    // `G` n'est pas un item de l'instrument : c'est un déclencheur renseigné à 0,
    // qui empêche la garde de passation vide de mordre tout en laissant les deux
    // items hors du calcul. `A1` est renseigné et reste pourtant non compté.
    const reponses = { G: '0', A1: '7' };

    const sum: any = computeScoreFromDef(
      { sections, scoring: { type: 'sum', maxTotal: 20,
        interpretation: [{ min: 0, max: 5, label: 'bas' }, { min: 6, max: 20, label: 'haut' }] } },
      reponses,
    );
    expect(sum.repondus).toBe(0);
    expect(sum.missing, 'aucun item MANQUANT : ils sont écartés, pas omis').toBe(0);
    // Sans la clause : total 0 → bande « bas ».
    expect(sum.interpretation).toBeNull();
    expect(sum.note).toContain("Aucun item de cet instrument n'est renseigné");

    const bms: any = computeScoreFromDef(
      { sections, scoring: { type: 'bms_average', minTotal: 0, maxTotal: 20,
        interpretation: [{ min: 0, max: 5, label: 'bas' }, { min: 6, max: 20, label: 'haut' }] } },
      reponses,
    );
    expect(bms.repondus).toBe(0);
    expect(bms.missing).toBe(0);
    // Sans la clause : moyenne 0/2 = 0 → bande « bas ».
    expect(bms.average).toBeNull();
    expect(bms.interpretation).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// `group_majority` (Q_STR_01) — comptes de recueil et bande sur recueil complet
// seulement ([[D-055]], LOT-08).
//
// LE CAS QUI A MOTIVÉ LE LOT : ce moteur ne publiait ni `missing` ni `repondus`,
// et `totalSousScore` rend un total dès UN item par groupe — trois réponses sur
// vingt et une, rassurantes, décrochaient la bande la plus favorable de la
// grille, affichée fiche praticien et lue par le déclencheur porteur de
// STOP-STR. Les bancs ci-dessous jouent le VRAI `Q_STR_01`, pas une définition
// forgée : c'est l'instrument de production qui est l'objet de la décision.
// ─────────────────────────────────────────────────────────────────────────────

describe('group_majority (Q_STR_01) — la complétude est publiée, la bande exige le recueil complet', () => {
  const ITEMS = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
    'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14',
    'C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21',
  ];

  function toutes(valeur: number): Record<string, number> {
    return Object.fromEntries(ITEMS.map(id => [id, valeur]));
  }

  it('trois items sur vingt et un : total servi, comptes publiés, AUCUNE bande', () => {
    // Un item par groupe, au minimum — le scénario exact des trois réponses qui
    // produisaient « Oriente vers les conseils de vie antistress ».
    const result: any = calculateScore('Q_STR_01', { A1: 0, B8: 0, C15: 0 });
    expect(result.total).toBe(0);
    expect(result.repondus).toBe(3);
    expect(result.missing).toBe(18);
    expect(result.interpretation).toBeNull();
    // La note dit le trou en français, SANS effacer la note de l'instrument
    // (seuils 4 et 15 harmonisés) — même contrat que le TFD sur Q_GAS_01.
    expect(result.note).toContain('seuils 4 et 15');
    expect(result.note).toContain('Recueil partiel : 18 items sans réponse sur 21');
  });

  it('un groupe entièrement vide : pas de total global (inchangé), comptes publiés', () => {
    const result: any = calculateScore('Q_STR_01', { A1: 1, B8: 1 });
    expect(result.total).toBeNull();
    expect(result.interpretation).toBeNull();
    expect(result.repondus).toBe(2);
    expect(result.missing).toBe(19);
  });

  it('recueil complet rassurant : bande servie, comptes à zéro manquant — contre-épreuve', () => {
    const result: any = calculateScore('Q_STR_01', { ...toutes(0), A1: 2 });
    expect(result.total).toBe(2);
    expect(result.repondus).toBe(21);
    expect(result.missing).toBe(0);
    expect(result.interpretation?.label).toBe('Oriente vers les conseils de vie antistress');
    expect(result.note).toContain('seuils 4 et 15');
    expect(result.note).not.toContain('Recueil partiel');
  });

  it('recueil complet intermédiaire : le groupe dominant et son protocole restent servis', () => {
    // 5-14 : le bloc du dominant n'est atteignable que sur recueil complet
    // désormais — la contre-épreuve que la garde n'a pas emporté le protocole.
    const result: any = calculateScore('Q_STR_01', { ...toutes(0), B8: 2, B9: 2, B10: 2 });
    expect(result.total).toBe(6);
    expect(result.interpretation?.dominant).toBe('B');
    // `separerConduite` sort la conduite de l'interprétation : elle est servie à
    // la racine, jamais dans la bande.
    expect(result.conduite).toBe('Protocole sérotoninergique');
  });
});
