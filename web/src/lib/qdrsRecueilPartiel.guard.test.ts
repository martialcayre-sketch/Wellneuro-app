// Banc du RECUEIL PARTIEL du QDRS (`sum_decimal`) — 2026-08-05.
//
// CE QU'IL TIENT. Le moteur sommait ce qu'il trouvait sans compter ce qui
// manquait : quatre domaines sur dix cotés au maximum rendaient 12 — « Démence
// légère » — quand les six domaines muets suffisaient à atteindre 17,5,
// « Démence modérée à sévère ». L'instrument est rempli par un AIDANT, qui peut
// ignorer de bonne foi ce qu'il n'observe pas : le recueil partiel y est plus
// probable qu'ailleurs.
//
// D-014 — « une bande d'interprétation ne se lit que sur l'instrument complet ».
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';

const ITEMS = ['QD1', 'QD2', 'QD3', 'QD4', 'QD5', 'QD6', 'QD7', 'QD8', 'QD9', 'QD10'];

/** Les 10 domaines, tous renseignés à « Normal » (0). */
const COMPLET: Record<string, number> = Object.fromEntries(ITEMS.map(id => [id, 0]));

/** Quatre domaines au maximum, six muets → 12 sur 30, et une bande rassurante. */
const QUATRE_SUR_DIX: Record<string, number> = { QD1: 3, QD2: 3, QD3: 3, QD4: 3 };

describe('Q_GEO_05 (sum_decimal / QDRS) — recueil partiel', () => {
  it('une passation COMPLÈTE garde sa bande, et ses deux comptes le disent', () => {
    // Contre-épreuve obligatoire : une garde qui rendrait `null` partout
    // passerait tous les tests d'absence sans rien protéger.
    const r: any = calculateScore('Q_GEO_05', COMPLET);
    expect(r.missing).toBe(0);
    expect(r.repondus).toBe(10);
    expect(r.total).toBe(0);
    expect(r.interpretation?.label).toBe('Normal ou oublis bénins');
    expect(r.note ?? null).toBeNull();
  });

  it('les demi-points restent sommés sur une passation COMPLÈTE', () => {
    // Le moteur existe POUR les valeurs 0,5 : le vérifier ici garantit que la
    // garde n'a pas déplacé l'accumulation ni l'arrondi.
    const r: any = calculateScore('Q_GEO_05', { ...COMPLET, QD1: 0.5, QD2: 0.5, QD3: 0.5 });
    expect(r.total).toBe(1.5);
    expect(r.missing).toBe(0);
    expect(r.interpretation?.label).toBe('MCI — Déclin cognitif léger');
  });

  it('quatre domaines sur dix ne produisent AUCUNE bande', () => {
    const r: any = calculateScore('Q_GEO_05', QUATRE_SUR_DIX);
    expect(r.interpretation).toBeNull();
    expect(r.missing).toBe(6);
    expect(r.repondus).toBe(4);
    // La note DIT pourquoi la bande manque.
    expect(r.note).toContain('Recueil partiel');
    expect(r.note).toContain('6 items');
    // Le total partiel reste servi : c'est la BANDE qui conclut.
    expect(r.total).toBe(12);
    expect(r.maxTotal).toBe(30);

    // Contre-épreuve : le même total, mais recueilli en entier, garde sa bande —
    // et c'est bien la bande RASSURANTE que le recueil partiel servait.
    const complet: any = calculateScore('Q_GEO_05', { ...COMPLET, QD1: 3, QD2: 3, QD3: 3, QD4: 3 });
    expect(complet.total).toBe(12);
    expect(complet.interpretation?.label).toBe('Démence légère');
  });

  it('un SEUL domaine manquant suffit à retirer la bande', () => {
    const { QD10, ...neufSurDix } = { ...COMPLET };
    void QD10;
    const r: any = calculateScore('Q_GEO_05', neufSurDix);
    expect(r.missing).toBe(1);
    expect(r.repondus).toBe(9);
    expect(r.interpretation).toBeNull();
    expect(r.note).toContain('1 item');
    expect(r.note).not.toContain('1 items');
  });

  it('une passation VIDE ne produit aucune bande — la garde générale la préempte', () => {
    // Le `repondus === 0` du moteur est un chemin RÉSIDUEL : la garde générale
    // de passation vide (#451) intercepte avant lui et rend `scored: false`.
    // Sans elle, un QDRS blanc totalisait 0 et sortait « Normal ».
    const r: any = calculateScore('Q_GEO_05', {});
    expect(r.scored).toBe(false);
    expect(r.interpretation).toBeNull();
    expect(r.total).toBeNull();
    expect(r.raisonNonScore).toBe('aucune réponse ne correspond aux items de cet instrument');
  });

  it('la note de recueil s’AJOUTE à celle de l’instrument, elle ne l’écrase pas', () => {
    // PIÈGE POSÉ POUR PLUS TARD : `Q_GEO_05` ne déclare aujourd'hui aucune
    // `scoring.note`, mais le moteur en sert désormais une — la composition doit
    // être tenue avant qu'une note d'instrument n'existe.
    const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_GEO_05;
    const noteOrigine = def.scoring.note;
    try {
      def.scoring.note = 'Note d’instrument fictive.';

      const complet: any = calculateScore('Q_GEO_05', COMPLET);
      expect(complet.note).toBe('Note d’instrument fictive.');

      const partiel: any = calculateScore('Q_GEO_05', QUATRE_SUR_DIX);
      expect(partiel.note).toContain('Note d’instrument fictive.');
      expect(partiel.note).toContain('Recueil partiel');
    } finally {
      if (noteOrigine === undefined) delete def.scoring.note; else def.scoring.note = noteOrigine;
    }
  });

  it('un instrument sans grille ne rend pas de bande, recueil COMPLET compris', () => {
    // Les deux conditions répondent à des questions différentes : « une grille
    // est-elle déclarée ? » et « est-elle lisible sur ce recueil ? ». Remplacer
    // l'une par l'autre rendrait une bande sur un instrument sans grille.
    const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_GEO_05;
    const grilleOrigine = def.scoring.interpretation;
    try {
      delete def.scoring.interpretation;
      const r: any = calculateScore('Q_GEO_05', COMPLET);
      expect(r.missing).toBe(0);
      expect(r.interpretation).toBeNull();
      // Aucune note de recueil : le recueil est complet, c'est la grille qui manque.
      expect(r.note ?? null).toBeNull();
    } finally {
      def.scoring.interpretation = grilleOrigine;
    }
  });
});
