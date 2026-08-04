// Banc du RECUEIL PARTIEL du PSQI — 2026-08-04, lot de signature de la table
// d'orientation.
//
// CE QU'IL TIENT. Le PSQI publiait une bande d'interprétation sur une passation
// incomplète, et cette bande était RASSURANTE par construction : les items sans
// réponse de `C2`, `C5` et `C7` sont comptés à leur valeur la plus favorable
// (`?? 0`), si bien qu'un total /21 partiel est biaisé vers le bas.
//
// La garde de passation vide (#451) n'y suffisait pas, et le repli
// `totalGlobalDepuisSousScores` non plus : celui-ci ne rend `null` que si une
// composante entière est vide. Sept composantes « mesurées à au moins un item »
// produisaient donc un total, une bande, et une orientation clinique
// (`R-SOM-01` lit cette bande).
//
// D-014 — « une bande d'interprétation ne se lit que sur l'instrument complet ».
// Ce banc est la contre-épreuve de cette décision sur le PSQI.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';

/** Les 18 items cotés, tous répondus, au plancher rassurant. */
const COMPLET: Record<string, number> = {
  Q1: 23, Q2: 10, Q3: 7, Q4: 8,
  Q5a: 0, Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0,
  Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
  Q6: 0, Q7: 0, Q8: 0, Q9: 0,
};

/**
 * Le cas qui a motivé la garde : huit réponses qui touchent les SEPT
 * composantes, donc invisibles pour toutes les gardes antérieures.
 *
 * `Q5b` est à sa PIRE valeur — le patient dit se réveiller trois fois ou plus
 * par semaine — et les dix items sans réponse sont comptés au mieux.
 */
const HUIT_REPONSES_SEPT_COMPOSANTES = {
  Q1: 23, Q2: 10, Q3: 7, Q4: 8, // C1 n'est pas encore touché — Q6 s'en charge
  Q5b: 3,
  Q6: 0, Q7: 0, Q8: 0,
};

describe('PSQI — recueil partiel', () => {
  it('une passation COMPLÈTE garde sa bande, et ses deux comptes le disent', () => {
    // Contre-épreuve obligatoire : une garde qui rendrait `null` partout
    // passerait tous les tests d'absence sans rien protéger.
    const r: any = calculateScore('Q_SOM_01', COMPLET);
    expect(r.missing).toBe(0);
    expect(r.repondus).toBe(18);
    expect(r.total).toBe(0);
    expect(r.interpretation?.label).toBe('Pas de trouble du sommeil');
    expect(r.note ?? null).toBeNull();
  });

  it('huit réponses touchant les sept composantes ne produisent AUCUNE bande', () => {
    const r: any = calculateScore('Q_SOM_01', HUIT_REPONSES_SEPT_COMPOSANTES);
    // Les sept composantes sont bien calculées : c'est précisément ce qui
    // rendait le défaut invisible. Si cette attente casse, le scénario a changé
    // et le reste du test ne prouve plus ce qu'il annonce.
    expect(r.components.filter((c: any) => c.val !== null)).toHaveLength(7);
    expect(r.interpretation).toBeNull();
    expect(r.missing).toBe(10);
    expect(r.repondus).toBe(8);
    // La note DIT pourquoi la bande manque : sans elle, un `interpretation:
    // null` nu se lit comme un trou de grille.
    expect(r.note).toContain('Recueil partiel');
    expect(r.note).toContain('10 items');
  });

  it('le total partiel reste servi, à côté de ses comptes', () => {
    // Arbitrage aligné sur `sum` (#561) : c'est la BANDE qui conclut. Le total
    // part avec `missing`/`repondus`, qui le rendent vérifiable.
    const r: any = calculateScore('Q_SOM_01', HUIT_REPONSES_SEPT_COMPOSANTES);
    // ÉPINGLÉ À L'UNITÉ, pas borné. Une première rédaction annonçait « 2 sur
    // 21 » dans trois documents ; la valeur réelle est 1, et un
    // `toBeLessThanOrEqual(4)` ne l'aurait jamais dit. Un chiffre qui sert
    // d'argument doit être tenu par une assertion exacte.
    expect(r.total).toBe(1);
    // 1 sur 21 — « Pas de trouble du sommeil » — alors que le seul item de
    // perturbation renseigné est au MAXIMUM de son échelle.
    expect(r.maxTotal).toBe(21);
  });

  it('un SEUL item manquant suffit à retirer la bande', () => {
    // La frontière est « tous les items cotés », pas « presque tous ». Un banc
    // qui ne testerait que le cas à moitié rempli laisserait passer un seuil de
    // tolérance introduit plus tard.
    const { Q5j, ...dixSeptSurDixHuit } = { ...COMPLET };
    void Q5j;
    const r: any = calculateScore('Q_SOM_01', dixSeptSurDixHuit);
    expect(r.missing).toBe(1);
    expect(r.repondus).toBe(17);
    expect(r.interpretation).toBeNull();
    expect(r.note).toContain('1 item');
  });

  it('la note de recueil s’AJOUTE à celle de l’instrument, elle ne l’écrase pas', () => {
    // PIÈGE POSÉ POUR PLUS TARD, et c'est pour ça qu'il est tenu maintenant.
    // `Q_SOM_01` ne déclare aujourd'hui aucune `scoring.note` : écrire
    // `note: noteRecueil` seul ne perdait rien — jusqu'au jour où un lot de
    // certification en ajoute une, qui serait alors silencieusement écrasée sur
    // les passations COMPLÈTES, c'est-à-dire là où elle sert. `sum` et
    // `bms_average` composent depuis #561 ; ce banc impose la même forme ici.
    const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_SOM_01;
    const noteOrigine = def.scoring.note;
    const certifOrigine = def.scoring.certification;
    try {
      def.scoring.note = 'Note d’instrument fictive.';
      def.scoring.certification = { statut: 'fictif' };

      const complet: any = calculateScore('Q_SOM_01', COMPLET);
      expect(complet.note).toBe('Note d’instrument fictive.');
      expect(complet.certification).toEqual({ statut: 'fictif' });

      const partiel: any = calculateScore('Q_SOM_01', HUIT_REPONSES_SEPT_COMPOSANTES);
      expect(partiel.note).toContain('Note d’instrument fictive.');
      expect(partiel.note).toContain('Recueil partiel');
      expect(partiel.certification).toEqual({ statut: 'fictif' });
    } finally {
      if (noteOrigine === undefined) delete def.scoring.note; else def.scoring.note = noteOrigine;
      if (certifOrigine === undefined) delete def.scoring.certification; else def.scoring.certification = certifOrigine;
    }
  });

  it('le volet conjoint n’entre PAS dans le compte de complétude', () => {
    // `Q10` et `Q11a-e` sont `horsBareme`. Les compter sortirait du barème toute
    // passation sans conjoint — l'inverse exact de ce que cette garde vise.
    const r: any = calculateScore('Q_SOM_01', COMPLET);
    const avecVolet: any = calculateScore('Q_SOM_01', { ...COMPLET, Q10: 3, Q11a: 3, Q11b: 3 });
    expect(r.missing).toBe(0);
    expect(avecVolet.missing).toBe(0);
    expect(avecVolet.interpretation?.label).toBe(r.interpretation?.label);
  });
});
