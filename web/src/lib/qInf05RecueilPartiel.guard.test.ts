// Banc du RECUEIL PARTIEL de `count_threshold` — 2026-08-05.
//
// CE QU'IL TIENT. Le moteur comptait déjà ses items sans réponse (`missing`) —
// et ne s'en servait pas : la bande sortait quand même. Un item muet ne peut
// jamais faire MONTER le comptage, donc la bande d'un recueil partiel est
// rassurante par construction, et se lit comme celle de l'instrument complet.
//
// D-014 — « une bande d'interprétation ne se lit que sur l'instrument complet ».
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';

const ITEMS = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'X9', 'X10', 'X11'];

/** Les 11 items cotés, tous répondus, au plancher rassurant (« Pas du tout »). */
const COMPLET: Record<string, number> = Object.fromEntries(ITEMS.map(id => [id, 0]));

/**
 * Le cas qui motive la garde : trois items au MAXIMUM de l'échelle
 * (« Extrêmement »), huit items muets. Comptage = 3 → « Niveau d'anxiété
 * modéré », alors que les huit réponses manquantes ne peuvent qu'ajouter — la
 * bande « critique » s'ouvre à 6.
 */
const TROIS_SUR_ONZE: Record<string, number> = { X1: 4, X2: 4, X3: 4 };

describe('Q_INF_05 (count_threshold) — recueil partiel', () => {
  it('une passation COMPLÈTE garde sa bande, et ses deux comptes le disent', () => {
    // Contre-épreuve obligatoire : une garde qui rendrait `null` partout
    // passerait tous les tests d'absence sans rien protéger.
    const r: any = calculateScore('Q_INF_05', COMPLET);
    expect(r.missing).toBe(0);
    expect(r.repondus).toBe(11);
    expect(r.count).toBe(0);
    expect(r.interpretation?.label).toBe("Peu ou pas d'anxiété");
    expect(r.note ?? null).toBeNull();
  });

  it('une passation COMPLÈTE atteignant le seuil garde sa bande sévère', () => {
    // Même comptage que le cas partiel ci-dessous (3), mais recueilli en entier :
    // c'est ce qui prouve que la garde porte sur la COMPLÉTUDE, pas sur la valeur.
    const r: any = calculateScore('Q_INF_05', { ...COMPLET, X1: 4, X2: 4, X3: 4 });
    expect(r.count).toBe(3);
    expect(r.missing).toBe(0);
    expect(r.interpretation?.label).toBe("Niveau d'anxiété modéré");
  });

  it('trois réponses sur onze ne produisent AUCUNE bande', () => {
    const r: any = calculateScore('Q_INF_05', TROIS_SUR_ONZE);
    expect(r.interpretation).toBeNull();
    expect(r.missing).toBe(8);
    expect(r.repondus).toBe(3);
    // La note DIT pourquoi la bande manque : sans elle, un `interpretation:
    // null` nu se lit comme un trou de grille.
    expect(r.note).toContain('Recueil partiel');
    expect(r.note).toContain('8 items');
  });

  it('le comptage partiel reste servi, à côté de ses comptes', () => {
    // Arbitrage aligné sur `sum` (#561) et `bms_average` : c'est la BANDE qui
    // conclut. Le comptage part avec `missing`/`repondus`, qui le rendent
    // vérifiable.
    const r: any = calculateScore('Q_INF_05', TROIS_SUR_ONZE);
    expect(r.count).toBe(3);
    expect(r.maxTotal).toBe(11);
    expect(r.threshold).toBe(3);
  });

  it('un SEUL item manquant suffit à retirer la bande', () => {
    // La frontière est « tous les items cotés », pas « presque tous ».
    const { X11, ...dixSurOnze } = { ...COMPLET };
    void X11;
    const r: any = calculateScore('Q_INF_05', dixSurOnze);
    expect(r.missing).toBe(1);
    expect(r.repondus).toBe(10);
    expect(r.interpretation).toBeNull();
    expect(r.note).toContain('1 item');
    expect(r.note).not.toContain('1 items');
  });

  it('une passation VIDE ne produit aucune bande — la garde générale la préempte', () => {
    // Le `repondus === 0` du moteur est un chemin RÉSIDUEL : la garde générale
    // de passation vide (#451) intercepte avant lui et rend `scored: false`.
    // Ce test épingle QUI répond, pour qu'un déplacement de l'une des deux
    // gardes ne laisse pas le cas orphelin.
    const r: any = calculateScore('Q_INF_05', {});
    expect(r.scored).toBe(false);
    expect(r.interpretation).toBeNull();
    expect(r.total).toBeNull();
    expect(r.raisonNonScore).toBe('aucune réponse ne correspond aux items de cet instrument');
  });

  it('la note de recueil s’AJOUTE à celle de l’instrument, elle ne l’écrase pas', () => {
    // PIÈGE POSÉ POUR PLUS TARD : `Q_INF_05` ne déclare aujourd'hui aucune
    // `scoring.note`, si bien qu'un `note: noteRecueil` nu ne perdrait rien —
    // jusqu'au jour où un lot de certification en ajoute une, silencieusement
    // écrasée sur les passations COMPLÈTES, c'est-à-dire là où elle sert.
    const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_INF_05;
    const noteOrigine = def.scoring.note;
    try {
      def.scoring.note = 'Note d’instrument fictive.';

      const complet: any = calculateScore('Q_INF_05', COMPLET);
      expect(complet.note).toBe('Note d’instrument fictive.');

      const partiel: any = calculateScore('Q_INF_05', TROIS_SUR_ONZE);
      expect(partiel.note).toContain('Note d’instrument fictive.');
      expect(partiel.note).toContain('Recueil partiel');
      // La certification survit à la composition : elle ne passe pas par `note`.
      expect(partiel.certification).toEqual({ source: 'drive', status: 'certifie' });
    } finally {
      if (noteOrigine === undefined) delete def.scoring.note; else def.scoring.note = noteOrigine;
    }
  });
});
