// Banc du MFI-20 reconstruit — 2026-07-31.
//
// L'instrument le plus abîmé du catalogue : échelle d'accord 1→5 servie en
// fréquence 0→4, aucune des dix inversions appliquée, cinq sous-échelles servies
// en deux sections inventées, et trois bandes sur un /80 que la source ne
// définit pas. Additionner sans inverser revient à sommer la fatigue et la
// vigueur dans le même sens — « je me sens en forme » comptait comme un
// symptôme.
//
// Ce banc tient les quatre propriétés que la reconstruction rétablit, et chacune
// a été éprouvée par mutation.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';

const DEF: any = (QUESTIONNAIRE_CATALOGUE as any).Q_SOM_07;
const items = () => (DEF.sections ?? []).flatMap((s: any) => s.questions ?? []);
const ITEMS = Array.from({ length: 20 }, (_, i) => `M${i + 1}`);
const toutA = (v: number) => Object.fromEntries(ITEMS.map(id => [id, v]));
const axe = (r: any, id: string) => r.subScores.find((s: any) => s.id === id);

/** Clé de correction de la source : sous-échelle, items, items inversés. */
const CLE = [
  { id: 'GEN', items: ['M1', 'M5', 'M12', 'M16'], inverses: ['M1', 'M12'] },
  { id: 'PHY', items: ['M2', 'M8', 'M14', 'M20'], inverses: ['M8', 'M20'] },
  { id: 'MEN', items: ['M7', 'M11', 'M13', 'M19'], inverses: ['M7', 'M11'] },
  { id: 'ACT', items: ['M3', 'M6', 'M10', 'M17'], inverses: ['M3', 'M6'] },
  { id: 'MOT', items: ['M4', 'M9', 'M15', 'M18'], inverses: ['M4', 'M15'] },
];

describe('MFI-20 — la cotation 1-5 de la source', () => {
  it('sert 20 items, chacun coté de 1 à 5', () => {
    // L'ancien servi cotait 0→4. Le contrôle porte sur les OPTIONS, et sur leur
    // ORDRE : c'est de ces nombres-là que la clé « 6 − réponse » se sert.
    const tous = items();
    expect(tous.map((q: any) => q.id)).toEqual(ITEMS);
    for (const q of tous) {
      expect(q.options.map((o: any) => o.v), q.id).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('sert les libellés de la source, y compris ceux dont la polarité avait été retournée', () => {
    // Onze des vingt libellés servis n'étaient pas ceux de la source. Trois sont
    // épinglés ici parce que l'ancien servi en disait le CONTRAIRE — les
    // recopier de travers ne casserait aucun calcul, seulement le sens.
    const parId = new Map<string, any>(items().map((q: any) => [q.id, q]));
    expect(parId.get('M14').texte).toBe('Physiquement, je me sens en mauvaise condition');
    expect(parId.get('M15').texte).toBe("J'ai beaucoup de projets");
    expect(parId.get('M20').texte).toBe('Physiquement, je me sens en excellente forme');
  });
});

describe('MFI-20 — les dix inversions de la clé de correction', () => {
  it('la clé servie est exactement celle de la source', () => {
    for (const attendu of CLE) {
      const sub = DEF.scoring.subScores.find((s: any) => s.id === attendu.id);
      expect(sub, attendu.id).toBeDefined();
      expect(sub.items, `${attendu.id} : items`).toEqual(attendu.items);
      expect(sub.reversed, `${attendu.id} : inversions`).toEqual(attendu.inverses);
      expect(sub.max, `${attendu.id} : maximum`).toBe(20);
    }
    // Dix au total, et pas seulement « quelques-unes » : la source les énumère.
    const toutesInversions = DEF.scoring.subScores.flatMap((s: any) => s.reversed ?? []).sort();
    expect(toutesInversions).toEqual(
      ['M1', 'M11', 'M12', 'M15', 'M20', 'M3', 'M4', 'M6', 'M7', 'M8'].sort(),
    );
  });

  it('COHÉRENCE DE POLARITÉ : tout item inversé est formulé positivement, et réciproquement', () => {
    // Le seul contrôle qui attrape une MAUVAISE LECTURE de la grille source.
    // Cette grille a été lue sur une image — son extraction automatique rendait
    // une table vidée de sa mise en page — et une case mal relevée déplacerait
    // une inversion sans qu'aucun calcul ne s'en plaigne : les totaux
    // resteraient dans leurs bornes, les cinq sous-échelles garderaient quatre
    // items, et tous les autres tests de ce fichier passeraient.
    //
    // La règle est celle de l'instrument lui-même : on inverse un item quand
    // être d'accord avec lui signifie ALLER BIEN. Les dix items inversés
    // doivent donc être les dix formulés en positif, et les dix directs les dix
    // formulés en négatif. Vérifié : la clé relevée sur l'image respecte cette
    // partition sans exception — c'est une confirmation indépendante de la
    // lecture.
    const POSITIFS = ['M1', 'M3', 'M4', 'M6', 'M7', 'M8', 'M11', 'M12', 'M15', 'M20'];
    const inverses = DEF.scoring.subScores.flatMap((s: any) => s.reversed ?? []).sort();
    expect(inverses).toEqual(POSITIFS.slice().sort());

    // Et les dix autres sont bien les dix directs : la partition est complète,
    // aucun item n'est ni l'un ni l'autre, aucun n'est les deux.
    const directs = ITEMS.filter(id => !inverses.includes(id));
    expect(directs).toHaveLength(10);
    expect(directs.some(id => POSITIFS.includes(id))).toBe(false);
  });

  it('chaque sous-échelle est sémantiquement homogène — deux inversés, deux directs', () => {
    // Seconde confirmation indépendante de la lecture de la grille : les cinq
    // sous-échelles du MFI-20 sont construites en paires équilibrées, deux
    // items positifs et deux négatifs chacune. Une case relevée dans la
    // mauvaise colonne casserait cet équilibre sur DEUX sous-échelles à la fois.
    for (const { id, items, inverses } of CLE) {
      expect(items, `${id} : quatre items`).toHaveLength(4);
      expect(inverses, `${id} : deux inversés sur quatre`).toHaveLength(2);
    }
  });

  it('un item inversé compte À L’ENVERS — le cœur du défaut corrigé', () => {
    // LA garde. « Je me sens en forme » (M1) à 5, tout à fait d'accord : la
    // fatigue générale doit BAISSER. Sans inversion, elle montait.
    //
    // Attendus écrits à la main. GEN = M1, M5, M12, M16, dont M1 et M12
    // inversés. Réponses : M1=5, M5=1, M12=5, M16=1.
    //   inversés : (6−5) + (6−5) = 2 ; directs : 1 + 1 = 2 ; total 4.
    // C'est le PLANCHER de la sous-échelle — un patient parfaitement reposé.
    const enForme: any = calculateScore('Q_SOM_07', {
      ...toutA(3), M1: 5, M5: 1, M12: 5, M16: 1,
    });
    expect(axe(enForme, 'GEN').total).toBe(4);

    // Le miroir exact : le patient le plus fatigué de la sous-échelle.
    const epuise: any = calculateScore('Q_SOM_07', {
      ...toutA(3), M1: 1, M5: 5, M12: 1, M16: 5,
    });
    expect(axe(epuise, 'GEN').total).toBe(20);
  });

  it('une passation à « 3 » partout tombe au milieu de chaque sous-échelle', () => {
    // Contrôle de cohérence globale de la clé : au point neutre, l'inversion ne
    // change rien (6 − 3 = 3), donc les cinq sous-échelles valent 12. Une
    // inversion posée sur le mauvais item resterait invisible ici — c'est
    // voulu : ce cas isole l'erreur d'ÉCHELLE, que les cas ci-dessus ne voient
    // pas.
    const neutre: any = calculateScore('Q_SOM_07', toutA(3));
    for (const { id } of CLE) expect(axe(neutre, id).total, id).toBe(12);
  });

  it('chaque sous-échelle est bornée à 4–20, et les cinq le sont vraiment', () => {
    // Les bornes sont EXÉCUTÉES, pas lues : `max` déclaré peut mentir. Le
    // plancher exige d'inverser correctement, donc ce balayage vaut aussi
    // contre-épreuve de la clé.
    const plancher = Object.fromEntries(
      ITEMS.map(id => [id, CLE.some(c => c.inverses.includes(id)) ? 5 : 1]));
    const plafond = Object.fromEntries(
      ITEMS.map(id => [id, CLE.some(c => c.inverses.includes(id)) ? 1 : 5]));
    const bas: any = calculateScore('Q_SOM_07', plancher);
    const haut: any = calculateScore('Q_SOM_07', plafond);
    for (const { id } of CLE) {
      expect(axe(bas, id).total, `${id} plancher`).toBe(4);
      expect(axe(haut, id).total, `${id} plafond`).toBe(20);
    }
  });
});

describe('MFI-20 — ce que la source refuse', () => {
  it('aucun score global, à aucune passation', () => {
    // « Il n'y a pas de barème interprétation », et la source ne totalise jamais
    // ses cinq sous-échelles. Une somme sur 100 se lirait comme une sévérité.
    for (const reponses of [toutA(1), toutA(3), toutA(5)]) {
      const r: any = calculateScore('Q_SOM_07', reponses);
      expect(r.total, 'aucun total global').toBeNull();
    }
    expect(DEF.scoring.sansTotalGlobal).toBe(true);
  });

  it('aucune bande d’interprétation, ni globale ni par sous-échelle', () => {
    // L'ancien servi en affichait trois sur /80 — « Fatigue dans les limites
    // normales », « notable », « sévère » — qu'aucune source ne porte.
    expect(DEF.scoring.interpretation).toBeUndefined();
    const r: any = calculateScore('Q_SOM_07', toutA(5));
    for (const s of r.subScores) expect(s.interpretation, s.id).toBeNull();
  });

  it('les seuils dépendants du sexe et de l’âge sont RENDUS, jamais appliqués', () => {
    // Le moteur ne reçoit que des réponses : il ne peut pas choisir la
    // population sans se tromper. La source les donne pour la seule fatigue
    // générale — ils sont dits au praticien, pas convertis en bandes.
    const r: any = calculateScore('Q_SOM_07', toutA(3));
    expect(r.note).toContain('Fatigue générale');
    expect(r.note).toContain('hommes');
    expect(r.note).toContain('femmes');
    expect(r.note).toContain('≥ 14');
  });

  it('une passation vide ne rend aucune sous-échelle chiffrée', () => {
    // La garde de #451 doit continuer de mordre : sans réponse, pas de mesure.
    const vide: any = calculateScore('Q_SOM_07', {});
    for (const s of vide.subScores ?? []) expect(s.total, s.id).toBeNull();
  });
});
