import { describe, expect, it } from 'vitest';
import { calculateScore } from './questions';

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
});
