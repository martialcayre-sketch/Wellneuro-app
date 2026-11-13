import { describe, expect, it } from 'vitest';
import { computeScoreFromDef } from '@/lib/questions';
import { TEXTE_ENQUETE_ALIMENTAIRE_INCOMPLETE } from '@/lib/scoring/enqueteAlimentaireIncomplete';
import { Q_ALI_01_SIIN_57, Q_ALI_01_COURT_14 } from './alimentaire';

// Banc de l'Enquête alimentaire SIIN, forme complète.
//
// Il verrouille ce que la source impose (57 items, total 90, quatre bandes) et
// ce que le dépôt impose (aucune réponse héritée ne doit produire un 0). La
// somme de 90 est VÉRIFIÉE ici plutôt qu'affirmée en commentaire : c'est elle
// qui rattache le barème servi au /90 du guide clinique.

const SCORING = Q_ALI_01_SIIN_57.scoring as any;
const BAREME: Array<{ id: string; points: number; seuil: any }> = SCORING.bareme;

function itemsDeLaDefinition(def: any): Array<{ id: string; options?: Array<{ v: number }> }> {
  return def.sections.flatMap((s: any) => s.questions);
}

/** Valeur d'option qui satisfait le seuil — ou `null` si aucune ne le peut. */
function valeurAuSeuil(id: string, seuil: any): number | null {
  const q = itemsDeLaDefinition(Q_ALI_01_SIIN_57).find(i => i.id === id);
  const valeurs = (q?.options ?? []).map(o => Number(o.v));
  for (const v of valeurs) {
    if (seuil.egal !== undefined ? v === seuil.egal
      : (seuil.min === undefined || v >= seuil.min) && (seuil.max === undefined || v <= seuil.max)) {
      return v;
    }
  }
  return null;
}

/** Valeur d'option qui NE satisfait PAS le seuil. */
function valeurHorsSeuil(id: string, seuil: any): number | null {
  const q = itemsDeLaDefinition(Q_ALI_01_SIIN_57).find(i => i.id === id);
  const valeurs = (q?.options ?? []).map(o => Number(o.v));
  for (const v of valeurs) {
    const atteint = seuil.egal !== undefined ? v === seuil.egal
      : (seuil.min === undefined || v >= seuil.min) && (seuil.max === undefined || v <= seuil.max);
    if (!atteint) return v;
  }
  return null;
}

describe('barème — fidélité à la source', () => {
  it('compte exactement 57 items', () => {
    expect(BAREME).toHaveLength(57);
    expect(itemsDeLaDefinition(Q_ALI_01_SIIN_57)).toHaveLength(57);
  });

  it('la somme des points vaut exactement 90', () => {
    // C'est LE rattachement à la source : le guide clinique et la boussole
    // parlent d'un score /90. Une valeur d'item modifiée le casse ici.
    expect(BAREME.reduce((s, e) => s + e.points, 0)).toBe(90);
    expect(SCORING.maxTotal).toBe(90);
  });

  it('n’attribue que des valeurs de 1 ou 2 points, comme la source', () => {
    for (const e of BAREME) {
      expect([1, 2], `${e.id} : ${e.points} point(s)`).toContain(e.points);
    }
  });

  it('barème et questions se recouvrent exactement — aucun orphelin des deux côtés', () => {
    const idsBareme = new Set(BAREME.map(e => e.id));
    const idsQuestions = new Set(itemsDeLaDefinition(Q_ALI_01_SIIN_57).map(q => q.id));
    expect([...idsBareme].filter(id => !idsQuestions.has(id))).toEqual([]);
    expect([...idsQuestions].filter(id => !idsBareme.has(id))).toEqual([]);
  });

  it('chaque item offre au moins une réponse qui score et une qui ne score pas', () => {
    // Un item dont aucune option n'atteint le seuil est un point mort : il
    // retirerait silencieusement ses points du maximum atteignable.
    for (const e of BAREME) {
      expect(valeurAuSeuil(e.id, e.seuil), `${e.id} : aucune option n’atteint le seuil`).not.toBeNull();
      expect(valeurHorsSeuil(e.id, e.seuil), `${e.id} : toutes les options scorent`).not.toBeNull();
    }
  });
});

describe('espace de noms — la parade des brouillons', () => {
  it('aucun identifiant ne réutilise ceux de la forme courte', () => {
    // Les brouillons patients sont stockés en localStorage avec les
    // identifiants d'items comme clés. Réutiliser `AL1`–`AL14` ferait
    // transplanter les réponses d'un patient en cours sur d'autres questions.
    const anciens = new Set(itemsDeLaDefinition(Q_ALI_01_COURT_14).map(q => q.id));
    for (const q of itemsDeLaDefinition(Q_ALI_01_SIIN_57)) {
      expect(anciens.has(q.id), `${q.id} réutilise un identifiant de la forme courte`).toBe(false);
    }
  });
});

describe('scoring', () => {
  it('toutes les réponses au seuil → 90 et la bande optimale', () => {
    const answers = Object.fromEntries(BAREME.map(e => [e.id, valeurAuSeuil(e.id, e.seuil)]));
    const r = computeScoreFromDef(Q_ALI_01_SIIN_57, answers as Record<string, number>);
    expect(r.scored).toBe(true);
    expect(r.total).toBe(90);
    expect(r.interpretation.label).toContain('optimale');
  });

  it('aucune réponse au seuil → 0 et la bande la plus basse', () => {
    const answers = Object.fromEntries(BAREME.map(e => [e.id, valeurHorsSeuil(e.id, e.seuil)]));
    const r = computeScoreFromDef(Q_ALI_01_SIIN_57, answers as Record<string, number>);
    expect(r.scored).toBe(true);
    expect(r.total).toBe(0);
    expect(r.interpretation.label).toContain('très déséquilibrée');
  });

  it('une passation partielle n’est pas calculée et compte ses manquants (D-517)', () => {
    const deuxItems = BAREME.slice(0, 2);
    const answers = Object.fromEntries(deuxItems.map(e => [e.id, valeurAuSeuil(e.id, e.seuil)]));
    const r = computeScoreFromDef(Q_ALI_01_SIIN_57, answers as Record<string, number>);
    expect(r.scored).toBe(false);
    expect(r.total).toBeNull();
    expect(r.interpretation).toBeNull();
    expect(r.raisonNonScore).toBe(TEXTE_ENQUETE_ALIMENTAIRE_INCOMPLETE);
    expect(r.missing).toBe(55);
  });
});

describe('recueil incomplet — D-517 (D-403 §6)', () => {
  const auSeuil = () => Object.fromEntries(BAREME.map(e => [e.id, valeurAuSeuil(e.id, e.seuil)])) as Record<string, number>;

  it('le texte est celui que le responsable a validé, mot pour mot', () => {
    expect(TEXTE_ENQUETE_ALIMENTAIRE_INCOMPLETE).toBe('Enquête alimentaire incomplète : score non calculé.');
  });

  it('un seul item manquant suffit : ni total, ni bande, aucun prorata', () => {
    for (const absent of [BAREME[0].id, BAREME[BAREME.length - 1].id]) {
      const answers = auSeuil();
      delete answers[absent];
      const r = computeScoreFromDef(Q_ALI_01_SIIN_57, answers);
      expect(r.scored, absent).toBe(false);
      expect(r.total, absent).toBeNull();
      expect(r.interpretation, absent).toBeNull();
      expect(r.missing, absent).toBe(1);
      expect(r.missingIds, absent).toEqual([absent]);
    }
  });

  it('une réponse non numérique compte comme manquante', () => {
    const answers = auSeuil() as Record<string, unknown>;
    answers[BAREME[3].id] = 'abc';
    const r = computeScoreFromDef(Q_ALI_01_SIIN_57, answers as Record<string, number>);
    expect(r.scored).toBe(false);
    expect(r.missingIds).toEqual([BAREME[3].id]);
  });

  it('les dimensions restent servies, avec leurs comptes', () => {
    const answers = auSeuil();
    const absent = SCORING.dimensions[0].items[0];
    delete answers[absent];
    const r = computeScoreFromDef(Q_ALI_01_SIIN_57, answers);
    expect(r.dimensions).toHaveLength(SCORING.dimensions.length);
    const premiere = r.dimensions[0];
    expect(premiere.repondus).toBe(premiere.items - 1);
    expect(typeof premiere.total).toBe('number');
  });

  it('le sous-score du besoin 3 tombe même quand ses quatre items sont remplis', () => {
    const answers = auSeuil();
    const rythme: string[] = SCORING.sousScoresBesoins[0].items;
    const absent = BAREME.map(e => e.id).find(id => !rythme.includes(id))!;
    delete answers[absent];
    const r = computeScoreFromDef(Q_ALI_01_SIIN_57, answers);
    const sousScore = r.scoresBesoins.find((s: { id: string }) => s.id === 'RYTHME_CHRONO');
    expect(sousScore.repondus).toBe(sousScore.items);
    expect(sousScore.total).toBeNull();
  });

  it('contrôle négatif — une passation complète reste calculée, avec son sous-score', () => {
    const r = computeScoreFromDef(Q_ALI_01_SIIN_57, auSeuil());
    expect(r.scored).toBe(true);
    expect(r.raisonNonScore).toBeUndefined();
    expect(r.missing).toBe(0);
    expect(typeof r.scoresBesoins[0].total).toBe('number');
  });
});

describe('la parade anti-zéro — le risque majeur du lot', () => {
  it('des réponses de la forme courte ne produisent PAS un score de 0', () => {
    // Sans cette garde : total 0 → couverture du besoin 1 à 0 → sous le seuil
    // d'effondrement → « Mon équilibre » plafonné à 50 pour les 6 patients
    // concernés, sans une erreur. C'est le défaut que ce lot existe pour
    // éviter.
    const heritees = Object.fromEntries(
      itemsDeLaDefinition(Q_ALI_01_COURT_14).map(q => [q.id, 2]),
    );
    const r = computeScoreFromDef(Q_ALI_01_SIIN_57, heritees as Record<string, number>);
    expect(r.scored).toBe(false);
    expect(r.total).toBeNull();
    expect(r.raisonNonScore).toBeTruthy();
  });

  it('un total non numérique est ce que `equilibre` interprète comme « non mesuré »', () => {
    // Contrat exact avec `extraireValeurBrute` (equilibre/score.ts) : elle rend
    // `null` dès que `total` n'est pas un nombre, et `null` ≠ 0 y est décisif.
    const r = computeScoreFromDef(Q_ALI_01_SIIN_57, { AL1: 2 } as Record<string, number>);
    expect(typeof r.total === 'number').toBe(false);
  });

  it('contrôle négatif — une seule réponse valide n’est plus un recueil vide', () => {
    // Sans lui, la garde du recueil vide et celle du recueil incomplet
    // ([[D-517]]) ne se distingueraient pas : une réponse SIIN valide dit
    // « incomplète », pas « aucune réponse ne correspond ». Le contrôle
    // positif (passation complète calculée) vit dans le bloc D-517.
    const premier = BAREME[0];
    const r = computeScoreFromDef(
      Q_ALI_01_SIIN_57,
      { [premier.id]: valeurAuSeuil(premier.id, premier.seuil) } as Record<string, number>,
    );
    expect(r.scored).toBe(false);
    expect(r.raisonNonScore).toBe(TEXTE_ENQUETE_ALIMENTAIRE_INCOMPLETE);
    expect(r.missing).toBe(BAREME.length - 1);
  });
});

describe('sous-catégories — descriptives et dark', () => {
  it('ne référencent que des items du barème', () => {
    const idsBareme = new Set(BAREME.map(e => e.id));
    for (const d of SCORING.dimensions) {
      for (const id of d.items) {
        expect(idsBareme.has(id), `${d.id} référence ${id}, absent du barème`).toBe(true);
      }
    }
  });

  it('couvrent les 57 items, chacun dans exactement une catégorie', () => {
    // Une couverture partielle afficherait un profil dont les catégories ne
    // s'additionnent pas au total — un profil faux sous un score juste. Un
    // item compté deux fois gonflerait une catégorie sans que rien ne le dise.
    const occurrences = new Map<string, number>();
    for (const d of SCORING.dimensions) {
      for (const id of d.items) occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
    }
    const jamais = BAREME.filter(e => !occurrences.has(e.id)).map(e => e.id);
    const plusieursFois = [...occurrences].filter(([, n]) => n > 1).map(([id]) => id);
    expect(jamais, 'items sans catégorie').toEqual([]);
    expect(plusieursFois, 'items dans plusieurs catégories').toEqual([]);
    expect(occurrences.size).toBe(57);
  });

  it('le `max` déclaré de chaque catégorie est celui de ses items', () => {
    // Le `max` est écrit dans la définition (le garde de certification le lit
    // statiquement) ET recalculé par le moteur. Deux sources pour une même
    // valeur : sans ce test, elles divergeraient en silence et le profil
    // afficherait des fractions fausses.
    for (const d of SCORING.dimensions) {
      const calcule = d.items.reduce(
        (s: number, id: string) => s + (BAREME.find(e => e.id === id)?.points ?? 0), 0,
      );
      expect(d.max, `${d.id} : max déclaré ${d.max}, items ${calcule}`).toBe(calcule);
    }
  });

  it('la somme des maximums de catégorie vaut le total de l’instrument', () => {
    // Corollaire mesuré de la couverture : c'est ce qui rend le profil
    // additif, et donc lisible à côté du score.
    expect(SCORING.dimensions.reduce((s: number, d: any) => s + d.max, 0)).toBe(90);
  });

  it('sont rendues sous `dimensions`, jamais sous `subScores`', () => {
    // Le mur : la fiche patient bascule ses colonnes Score et Interprétation en
    // mode sous-scores dès que `subScores` existe, et REMPLACE alors le total
    // /90 et sa bande. Les catégories doivent donc rester sous `dimensions`.
    //
    // À jour au 2026-07-28 : la phrase qui vivait ici — « aucun besoin ne peut
    // les lire, ce lot est dark par construction » — n'est PLUS vraie.
    // `BESOIN_SOURCES` lit désormais aussi `scoresBesoins`, une TROISIÈME clé
    // introduite pour le besoin 3 précisément parce que ce mur interdisait
    // `subScores`. Les catégories, elles, restent hors de portée d'un besoin :
    // le sous-score servi est un objet déclaré à part.
    const answers = Object.fromEntries(BAREME.map(e => [e.id, valeurAuSeuil(e.id, e.seuil)]));
    const r = computeScoreFromDef(Q_ALI_01_SIIN_57, answers as Record<string, number>);
    expect(Array.isArray(r.dimensions)).toBe(true);
    expect(r.subScores).toBeUndefined();
  });

  it('ne touchent pas au total', () => {
    const answers = Object.fromEntries(BAREME.map(e => [e.id, valeurAuSeuil(e.id, e.seuil)]));
    const avec = computeScoreFromDef(Q_ALI_01_SIIN_57, answers as Record<string, number>);
    const sansDimensions = { ...Q_ALI_01_SIIN_57, scoring: { ...SCORING, dimensions: [] } };
    const sans = computeScoreFromDef(sansDimensions, answers as Record<string, number>);
    expect(avec.total).toBe(sans.total);
  });

  it('rendent `null`, jamais 0, quand aucun de leurs items n’est répondu', () => {
    const uneCategorie = SCORING.dimensions[0];
    const autre = BAREME.find(e => !uneCategorie.items.includes(e.id))!;
    const r = computeScoreFromDef(
      Q_ALI_01_SIIN_57,
      { [autre.id]: valeurAuSeuil(autre.id, autre.seuil) } as Record<string, number>,
    );
    const rendue = r.dimensions.find((d: any) => d.id === uneCategorie.id);
    expect(rendue.total).toBeNull();
    expect(rendue.repondus).toBe(0);
  });
});

describe('vocabulaire — contrainte, pas préférence', () => {
  it('aucun libellé ne parle de carence, déficit ou manque', () => {
    // Une carence est biologique ; un questionnaire de fréquence ne la voit
    // pas. C'est l'interdiction posée au modèle en #408, appliquée à la source
    // même des mots : un libellé interne finit toujours par s'afficher.
    const textes = [
      ...SCORING.dimensions.map((d: any) => `${d.id} ${d.label}`),
      ...SCORING.interpretation.map((b: any) => b.label),
      ...itemsDeLaDefinition(Q_ALI_01_SIIN_57).map((q: any) => q.texte),
      Q_ALI_01_SIIN_57.titre,
      Q_ALI_01_SIIN_57.instructions,
    ].join(' ').toLowerCase();
    for (const interdit of ['carence', 'déficit', 'deficit', 'insuffisan']) {
      expect(textes, `« ${interdit} » apparaît dans un libellé servi`).not.toContain(interdit);
    }
  });

  it('aucune bande ne porte de conduite clinique', () => {
    // Les conduites sont sorties des bandes au lot #389 : une bande dit ce que
    // vaut la mesure, pas ce qu'il faut faire.
    for (const bande of SCORING.interpretation) {
      expect(bande.protocol, `bande « ${bande.label} » porte une conduite`).toBeUndefined();
    }
  });
});

// ── Le miroir de la parade anti-zéro ────────────────────────────────────────
//
// La première version de ce banc n'écrivait que le sens qui l'arrangeait :
// « réponses AL* contre la forme SIIN ». La revue adversariale du 2026-07-28 a
// relevé le sens inverse — servir la forme COURTE après avoir recueilli des
// réponses SIIN — qui rendait `total: 0`, donc la bande la plus basse ET sa
// conduite « bilan approfondi nécessaire », sur un dossier illisible. Sur une
// source de fondation critique, cela plafonne « Mon équilibre » à 50.
//
// C'est le scénario de l'EXTINCTION du drapeau, que le changelog présente comme
// le retour arrière : il devait donc être gardé dans les deux sens.
describe('parade anti-zéro — les deux sens', () => {
  it('la forme COURTE ne score pas des réponses SIIN', () => {
    const reponsesSiin = Object.fromEntries(BAREME.map(e => [e.id, valeurAuSeuil(e.id, e.seuil)]));
    const r = computeScoreFromDef(Q_ALI_01_COURT_14, reponsesSiin as Record<string, number>);
    expect(r.scored).toBe(false);
    expect(r.total).toBeNull();
    expect(r.interpretation).toBeNull();
    // La conduite clinique ne doit surtout pas être émise.
    expect(r.conduite).toBeUndefined();
  });

  it('contrôle négatif — la forme courte score toujours ses propres réponses', () => {
    const items = Q_ALI_01_COURT_14.sections.flatMap((s: any) => s.questions);
    const siennes = Object.fromEntries(items.map((q: any) => [q.id, 3]));
    const r = computeScoreFromDef(Q_ALI_01_COURT_14, siennes as Record<string, number>);
    expect(r.scored).not.toBe(false);
    expect(typeof r.total).toBe('number');
  });
});
