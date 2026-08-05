// Banc du RECUEIL PARTIEL de l'ECAB (`ecab`) — 2026-08-05.
//
// CE QU'IL TIENT. Le moteur ne comptait RIEN de ce qui manquait : un item sans
// réponse sortait de la boucle en silence, et le total /10 partiel décrochait
// quand même une bande — rassurante par construction, la grille n'ayant qu'une
// frontière, à 6. `EC10` est le cas le plus retors : inversé, son absence
// n'ajoute rien, exactement comme la réponse « Vrai ».
//
// D-014 — « une bande d'interprétation ne se lit que sur l'instrument complet ».
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';

const ITEMS = ['EC1', 'EC2', 'EC3', 'EC4', 'EC5', 'EC6', 'EC7', 'EC8', 'EC9', 'EC10'];

/** Les 10 items, tous répondus « Faux » (0). `EC10` étant inversé, il vaut 1. */
const COMPLET: Record<string, number> = Object.fromEntries(ITEMS.map(id => [id, 0]));

/** Cinq « Vrai » sur les neuf items directs, cinq items muets → total 5. */
const CINQ_SUR_DIX: Record<string, number> = { EC1: 1, EC2: 1, EC3: 1, EC4: 1, EC5: 1 };

/** Tout est renseigné SAUF `EC10`, le seul item inversé. */
const SANS_EC10: Record<string, number> = {
  EC1: 1, EC2: 1, EC3: 1, EC4: 1, EC5: 1, EC6: 1, EC7: 1, EC8: 1, EC9: 1,
};

describe('Q_NEU_08 (ecab) — recueil partiel', () => {
  it('une passation COMPLÈTE garde sa bande, et ses deux comptes le disent', () => {
    // Contre-épreuve obligatoire : une garde qui rendrait `null` partout
    // passerait tous les tests d'absence sans rien protéger.
    const r: any = calculateScore('Q_NEU_08', COMPLET);
    expect(r.missing).toBe(0);
    expect(r.repondus).toBe(10);
    // `EC10` à « Faux » vaut 1 point — l'inversion est intacte.
    expect(r.total).toBe(1);
    expect(r.interpretation?.label).toBe("Attachement cognitif non confirmé par le seuil de l'échelle");
    expect(r.note ?? null).toBeNull();
  });

  it('cinq réponses sur dix ne produisent AUCUNE bande', () => {
    const r: any = calculateScore('Q_NEU_08', CINQ_SUR_DIX);
    expect(r.interpretation).toBeNull();
    expect(r.missing).toBe(5);
    expect(r.repondus).toBe(5);
    // La note DIT pourquoi la bande manque.
    expect(r.note).toContain('Recueil partiel');
    expect(r.note).toContain('5 items');
    // Le total partiel reste servi : c'est la BANDE qui conclut.
    expect(r.total).toBe(5);
    expect(r.maxTotal).toBe(10);
  });

  it('`EC10` seul manquant : pas de bande, et le total n’a rien gagné pour lui', () => {
    // LE CAS QUI JUSTIFIE CE BANC. `EC10` est inversé — « Faux » (0) vaut 1
    // point, « Vrai » (1) en vaut 0. Une absence n'ajoute rien, donc elle est
    // INDISCERNABLE d'un « Vrai » dans le total : le seul item dont le silence
    // se confond avec une réponse était aussi le seul à n'être compté nulle
    // part. Il est désormais `missing`, et la bande tombe.
    const r: any = calculateScore('Q_NEU_08', SANS_EC10);
    expect(r.missing).toBe(1);
    expect(r.repondus).toBe(9);
    expect(r.interpretation).toBeNull();
    expect(r.note).toContain('1 item');
    // Neuf « Vrai » = 9 ; `EC10` manquant n'a RIEN ajouté (l'inversion ne
    // s'applique pas à une absence).
    expect(r.total).toBe(9);

    // Contre-épreuve : le même total, mais recueilli en entier, garde sa bande.
    const complet: any = calculateScore('Q_NEU_08', { ...SANS_EC10, EC10: 1 });
    expect(complet.total).toBe(9);
    expect(complet.missing).toBe(0);
    expect(complet.interpretation?.label).toContain('Attachement aux benzodiazépines validé');
  });

  it('une passation VIDE ne produit aucune bande — la garde générale la préempte', () => {
    // Le `repondus === 0` du moteur est un chemin RÉSIDUEL : la garde générale
    // de passation vide (#451) intercepte avant lui. Sans elle, `EC10` absent
    // n'ajoutant rien, un ECAB blanc sortait à 0 — soit la bande rassurante.
    const r: any = calculateScore('Q_NEU_08', {});
    expect(r.scored).toBe(false);
    expect(r.interpretation).toBeNull();
    expect(r.total).toBeNull();
    expect(r.raisonNonScore).toBe('aucune réponse ne correspond aux items de cet instrument');
  });

  it('la note de recueil s’AJOUTE à celle de l’instrument, elle ne l’écrase pas', () => {
    // PIÈGE POSÉ POUR PLUS TARD : `Q_NEU_08` ne déclare aujourd'hui aucune
    // `scoring.note` ; le jour où un lot de certification en ajoute une, un
    // `note: noteRecueil` nu l'effacerait sur les passations COMPLÈTES.
    const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_NEU_08;
    const noteOrigine = def.scoring.note;
    try {
      def.scoring.note = 'Note d’instrument fictive.';

      const complet: any = calculateScore('Q_NEU_08', COMPLET);
      expect(complet.note).toBe('Note d’instrument fictive.');

      const partiel: any = calculateScore('Q_NEU_08', CINQ_SUR_DIX);
      expect(partiel.note).toContain('Note d’instrument fictive.');
      expect(partiel.note).toContain('Recueil partiel');
      expect(partiel.certification).toEqual({ source: 'drive', status: 'certifie' });
    } finally {
      if (noteOrigine === undefined) delete def.scoring.note; else def.scoring.note = noteOrigine;
    }
  });
});
