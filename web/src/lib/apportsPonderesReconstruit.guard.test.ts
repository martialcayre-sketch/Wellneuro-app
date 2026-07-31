// Banc de la grille d'apports reconstruite (`Q_ALI_03`) — 2026-07-31.
//
// La source (WN-SRC-0473/0474) n'est pas un questionnaire de fréquences : c'est
// une feuille de calcul à cinq colonnes — un nombre de portions par ligne, une
// table de protéines par portion, un coefficient de conversion, et deux totaux
// nommés « Apports totaux en protéines » et « Apports totaux en calories ». Le
// servi en avait fait dix items de fréquence sans aucune quantité, soit l'exact
// contraire de ce que son titre annonçait.
//
// Ce banc tient ce que la reconstruction rétablit, et surtout les TROIS ÉCARTS
// déclarés à la source : les deux constantes rectifiées, et la division par sept
// des lignes hebdomadaires. Un écart déclaré qu'aucun test ne tient se défait au
// premier refactor, et redevient silencieusement la valeur fausse de la source.
//
// Chaque propriété a été éprouvée par mutation : coefficient déplacé d'un item à
// l'autre, `÷ 7` retiré, constante corrigée remise à sa valeur source.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';
import { motifNonInterpretable } from '@/lib/scoring/passationsNonInterpretables';
import { reponsesLisiblesPourPrompt } from '@/lib/scoring/reponsesLisibles';
import { scoresPourPrompt } from '@/lib/scoring/scoresPourPrompt';

const DEF: any = (QUESTIONNAIRE_CATALOGUE as any).Q_ALI_03;
const items = (): any[] => (DEF.sections ?? []).flatMap((s: any) => s.questions ?? []);
const SC: any = DEF.scoring;
const lignes = (): any[] => [...(SC.proteines ?? []), ...(SC.calories ?? [])];

describe('grille d’apports — ce qui est servi', () => {
  it('sert 23 items — 21 saisies chiffrées et 2 états exclusifs', () => {
    // 23 et non 39 : les 39 « items » que le banc de certification lit dans la
    // source sont ses 39 LIGNES DE TABLEAU — 25 lignes de saisie, 10 intitulés
    // de bloc et 4 lignes de calcul. Les 25 lignes de saisie sont toutes
    // servies ; deux paires sont fondues en choix uniques (le forfait selon le
    // sexe, l'état de grignotage), que la source pose comme exclusifs.
    const tous = items();
    expect(tous).toHaveLength(23);
    expect(tous.map((q: any) => q.id)).toEqual(
      Array.from({ length: 23 }, (_, i) => `AP${i + 1}`),
    );
    // Le compte des DEUX formes, et non « 23 items de saisie chiffrée » : les
    // deux paires fondues (le sexe, l'état de grignotage) sont des choix
    // uniques. Trois pièces du dossier ont porté cette approximation.
    expect(tous.filter((q: any) => q.type === 'number')).toHaveLength(21);
    expect(tous.filter((q: any) => q.type !== 'number').map((q: any) => q.id))
      .toEqual(['AP13', 'AP14']);
  });

  it('n’emploie AUCUN identifiant de la forme abandonnée', () => {
    // `MO1`…`MO10` ne doivent correspondre à rien. C'est ce qui fait mordre la
    // garde de passation vide (#451) sur l'unique passation du 2026-07-25 : la
    // relecture se dégrade au lieu de se renverser — le défaut trouvé en revue
    // sur le MFI-20, dont les identifiants avaient été conservés.
    const ids = new Set(items().map((q: any) => q.id));
    for (let i = 1; i <= 10; i += 1) expect(ids.has(`MO${i}`)).toBe(false);
  });

  it('toute saisie chiffrée porte son unité, et son unité dit sa périodicité', () => {
    // Un nombre nu arrive au modèle de synthèse comme une quantité sans sens.
    // L'unité est ce qui le rend lisible — et c'est aussi elle qui annonce au
    // patient la périodicité que le moteur applique ensuite.
    for (const q of items()) {
      if (q.type !== 'number') continue;
      expect(typeof q.unit === 'string' && q.unit.trim() !== '').toBe(true);
      expect(/\/(jour|semaine)$/.test(q.unit)).toBe(true);
    }
  });

  it('chaque item est lu par une ligne de barème, et une seule', () => {
    // Les deux sens. Un item servi qu'aucune ligne ne lit est un item décoratif
    // — le patient le renseigne pour rien ; une ligne sans item est un
    // coefficient appliqué à une réponse qui n'existe pas.
    const idsServis = items().map((q: any) => q.id).sort();
    const idsBareme = lignes().map((l: any) => l.id).sort();
    expect(idsBareme).toEqual(idsServis);
    expect(new Set(idsBareme).size).toBe(idsBareme.length);
  });
});

describe('grille d’apports — les trois écarts déclarés à la source', () => {
  it('les deux constantes rectifiées le sont, et le restent', () => {
    // La source porte 3,6 g de protéines pour deux œufs ET pour 150 g de
    // poisson — la même valeur pour deux aliments sans rapport, tous deux
    // sous-estimés d'un facteur 4 à 8. Arbitrage praticien du 2026-07-31 :
    // servir le calcul corrigé, et le déclarer. Ce test est ce qui empêche un
    // « alignement sur la source » de bonne foi de les y ramener.
    const coef = (id: string) => lignes().find((l: any) => l.id === id)?.coefficient;
    expect(coef('AP4')).toBe(13);
    expect(coef('AP5')).toBe(30);
    expect(coef('AP4')).not.toBe(3.6);
    expect(coef('AP5')).not.toBe(3.6);
  });

  it('les lignes hebdomadaires sont exactement celles des blocs hebdomadaires', () => {
    // Le troisième écart. La source additionne des lignes par jour et des
    // lignes par semaine sans aucune règle de conversion ; le servi ramène les
    // secondes au jour. La périodicité déclarée au barème doit donc être celle
    // que l'item annonce au patient — sinon l'un des deux ment.
    for (const q of items()) {
      const ligne = lignes().find((l: any) => l.id === q.id);
      const hebdomadaireAuBareme = ligne.parJour === false;
      if (q.type === 'number') {
        expect(hebdomadaireAuBareme).toBe(q.unit.endsWith('/semaine'));
      } else {
        // Les deux items à choix unique portent un état, pas un comptage : ils
        // se comptent tels quels, chaque jour.
        expect(hebdomadaireAuBareme).toBe(false);
      }
    }
    expect(lignes().filter((l: any) => l.parJour === false).map((l: any) => l.id))
      .toEqual(['AP4', 'AP5', 'AP19', 'AP20', 'AP21', 'AP22', 'AP23']);
  });

  it('une ligne hebdomadaire compte pour un septième d’une ligne quotidienne', () => {
    // La propriété, éprouvée sur le moteur et non sur la table. Muter le `÷ 7`
    // en `× 1` fait échouer ici, pas seulement au cas nominal.
    const hebdo: any = calculateScore('Q_ALI_03', { AP5: 7 });
    const quotidien: any = calculateScore('Q_ALI_03', { AP3: 1 });
    // 7 portions de poisson par semaine = 1 par jour = 30 g ; 1 grande portion
    // de viande par jour = 30 g.
    expect(hebdo.proteinesG).toBe(30);
    expect(quotidien.proteinesG).toBe(30);
  });
});

describe('grille d’apports — le calcul rendu', () => {
  it('rend les deux grandeurs que la source nomme, sur un cas calculé à la main', () => {
    // Cas complet, vérifié à la main ligne à ligne — c'est le seul contrôle qui
    // attrape un coefficient déplacé d'un item à l'autre, lequel laisse le
    // total inchangé si les deux items sont renseignés à la même valeur.
    const cas = {
      AP2: 1,   // 1 portion moyenne de viande / jour  → 25
      AP4: 3,   // 3 × 2 œufs / semaine                → 3 × 13 / 7  = 5,571…
      AP5: 2,   // 2 poissons / semaine                → 2 × 30 / 7  = 8,571…
      AP6: 1,   // 1 lait / jour                       → 7
      AP7: 1,   // 1 yaourt / jour                     → 3,5
      AP8: 1,   // 1 fromage / jour                    → 7
      AP10: 3,  // 3 pains / jour                      → 15
      AP13: 15, // forfait homme                       → 15
      AP14: 150, // grignotage modéré                  → 150 kcal
      AP15: 1,  // 1 verre de vin / jour               → 70 kcal
      AP20: 1,  // 1 charcuterie / semaine             → 50 / 7 kcal
      AP21: 1,  // 1 tarte sucrée / semaine            → 50 / 7 kcal
      AP23: 1,  // 1 repas festif / semaine            → 200 / 7 kcal
    };
    const r: any = calculateScore('Q_ALI_03', cas);
    expect(r.type).toBe('apports_ponderes');
    expect(r.proteinesG).toBe(86.6);
    expect(r.caloriesKcal).toBe(2342);
  });

  it('convertit en calories au coefficient de la source, conservé et non expliqué', () => {
    // « × 24 » n'est pas le facteur d'Atwater (4 kcal/g) : il extrapole l'énergie
    // TOTALE depuis le seul apport protéique. La source ne l'explique pas, mais
    // il n'est pas démontrablement faux — écart NON corrigé, et déclaré tel.
    expect(SC.facteurCalorique).toBe(24);
    const r: any = calculateScore('Q_ALI_03', { AP3: 1 });
    expect(r.proteinesG).toBe(30);
    expect(r.caloriesKcal).toBe(30 * 24);
  });

  it('ne rend aucun total, aucune bande, aucun seuil', () => {
    // La source n'en donne aucun — ni par âge, ni par sexe, ni par poids. Un
    // seuil inventé sur une estimation d'apports serait un verdict clinique
    // fabriqué, et c'est exactement ce que la campagne cherche à empêcher.
    expect(SC.interpretRanges).toBeUndefined();
    expect(SC.maxTotal).toBeUndefined();
    const r: any = calculateScore('Q_ALI_03', { AP3: 1 });
    expect(r.total).toBeNull();
    expect(r.interpretation).toBeUndefined();
  });

  it('une passation sans une seule ligne ne rend pas « 0 g »', () => {
    // Le défaut d'origine du prompt alimentaire : un calcul fantôme avait
    // affiché « 0 g de protéines » à un praticien. Zéro renseigné n'est pas
    // zéro consommé.
    // C'est la garde générale de passation vide (#451) qui répond, et non une
    // garde propre à ce moteur : le contrôle porte donc sur ce qui SORT — aucun
    // chiffre, et un motif — plutôt que sur l'endroit du code qui l'a produit.
    const r: any = calculateScore('Q_ALI_03', {});
    expect(r.scored).toBe(false);
    expect(r.total).toBeNull();
    expect(r.proteinesG ?? null).toBeNull();
    expect(r.caloriesKcal ?? null).toBeNull();
    expect(r.raisonNonScore).toBeTruthy();
  });

  it('la garde de passation vide ne mord pas sur une seule ligne renseignée', () => {
    // Contrôle négatif du test ci-dessus : sans lui, un moteur qui refuserait
    // TOUJOURS de calculer le passerait au vert.
    const r: any = calculateScore('Q_ALI_03', { AP3: 1 });
    expect(r.scored).not.toBe(false);
    expect(r.proteinesG).toBe(30);
  });
});

describe('grille d’apports — la frontière datée et le catalogue', () => {
  it('marque la passation antérieure, et laisse lire la neuve', () => {
    // Mesuré en production le 2026-07-31 : UNE passation, du 2026-07-25,
    // porteuse de `MO1`…`MO10` et d'un total qui ne mesure aucun apport.
    expect(motifNonInterpretable('Q_ALI_03', new Date('2026-07-25T07:38:20Z'))).toContain('feuille de CALCUL');
    expect(motifNonInterpretable('Q_ALI_03', new Date('2026-08-02T00:00:00Z'))).toBeNull();
    // Frontière FERMÉE : une date absente ou illisible vaut « antérieure ».
    expect(motifNonInterpretable('Q_ALI_03')).not.toBeNull();
  });

  it('est réactivé, et débaptisé', () => {
    // Corrigé sur trois points, il ne peut plus s'annoncer comme la méthode
    // qu'il dérive : le titre doit dire la dérivation, pas l'identité.
    const entree: any = (QUESTIONNAIRES_CATALOG as any[]).find(q => q.id === 'Q_ALI_03');
    expect(entree.actif).toBe(true);
    expect(entree.titre).toBe(DEF.titre);
    expect(entree.titre).toContain('dérivée de la méthode Monnier');
    expect(entree.titre).not.toContain('Fréquences');
  });
});

describe('grille d’apports — ce qui atteint le praticien et le modèle', () => {
  it('les deux grandeurs partent sous un porteur que la fiche sait rendre', () => {
    // Défaut trouvé en revue adversariale : `proteinesG` et `caloriesKcal`
    // n'étaient lus par AUCUNE surface. La fiche praticien balaie des porteurs
    // NOMMÉS ; un moteur qui invente ses propres clés n'y apparaît nulle part,
    // et l'instrument affichait « — » en calculant exactement ce que sa
    // description promet au patient.
    const r: any = calculateScore('Q_ALI_03', { AP3: 1 });
    expect(Array.isArray(r.apports)).toBe(true);
    expect(r.apports.map((a: any) => a.id)).toEqual(['PROT', 'KCAL']);
    // Chaque axe porte sa valeur ET son unité : sans elle, la fiche afficherait
    // « 86,6 » nu, que le praticien devrait deviner.
    for (const axe of r.apports) {
      expect(typeof axe.total).toBe('number');
      expect(typeof axe.unite).toBe('string');
      expect(axe.unite.endsWith('/jour')).toBe(true);
    }
    expect(r.apports[0].total).toBe(r.proteinesG);
    expect(r.apports[1].total).toBe(r.caloriesKcal);
  });

  it('mais AUCUNE des trois formes n’atteint le modèle de synthèse', () => {
    // La consigne système interdit au modèle de conclure à une masse consommée.
    // Lui livrer une estimation d'apport le mettrait en contradiction avec son
    // instruction — et filtrer les deux clés nues en laissant passer le porteur
    // qui les répète n'aurait rien filtré du tout.
    const r: any = calculateScore('Q_ALI_03', { AP3: 1 });
    // Contrôle sur les CLÉS et non sur le texte sérialisé : `type` vaut
    // « apports_ponderes », et une recherche de sous-chaîne y trouverait
    // « apports » sans qu'aucune valeur ne soit passée.
    const filtre = scoresPourPrompt(r) as Record<string, unknown>;
    expect(Object.keys(filtre)).not.toContain('proteinesG');
    expect(Object.keys(filtre)).not.toContain('caloriesKcal');
    expect(Object.keys(filtre)).not.toContain('apports');
    // Contrôle négatif : le filtre ne vide pas tout — la note et son type
    // restent, sinon ce test passerait sur un objet vide.
    expect(filtre.type).toBe('apports_ponderes');
    expect(typeof filtre.note).toBe('string');
  });

  it('chaque quantité déclarée part AVEC son unité, donc avec sa périodicité', () => {
    // « 2 » à la ligne « Tarte salée » (par semaine) et « 2 » à la ligne
    // « Viande — petite portion » (par jour) arrivaient identiques au modèle :
    // la périodicité ne vivait que dans le titre de section, jamais transmis.
    const lisible: any = reponsesLisiblesPourPrompt('Q_ALI_03', { rawAnswers: { AP1: 2, AP19: 2 } });
    const items = lisible.rawAnswers;
    expect(items.AP1.quantiteDeclaree).toBe(2);
    expect(items.AP1.unite).toBe('portions/jour');
    expect(items.AP19.unite).toBe('portions/semaine');
    // Et jamais « non exploitable » : une saisie chiffrée avec unité EST la
    // déclaration la plus directe qui soit.
    expect(items.AP1.valeurNonResolue).toBeUndefined();
  });

  it('le libellé transmis nomme encore l’aliment après retrait des masses', () => {
    // `libellePourLeModele` retire la parenthèse pour que le modèle ne puisse
    // pas multiplier « 3 portions » par « 100 g ». Sur trois items, elle
    // emportait le seul mot qui disait DE QUOI il s'agissait — « Petite
    // portion » de quoi ? L'aliment est désormais dans le libellé lui-même, pas
    // dans le titre de section.
    const lisible: any = reponsesLisiblesPourPrompt('Q_ALI_03', { rawAnswers: { AP1: 1, AP2: 1, AP3: 1 } });
    for (const id of ['AP1', 'AP2', 'AP3']) {
      const q: string = lisible.rawAnswers[id].question;
      expect(q).toContain('Viande');
      expect(q).not.toMatch(/\d+\s*g/);
    }
  });
});

describe('grille d’apports — le zéro fabriqué', () => {
  it('une passation SANS ligne protéique ne rend pas « 0 g de protéines »', () => {
    // La garde générale de passation vide (#451) exige que TOUS les items
    // soient nuls : elle ne couvrait donc pas le seul cas qui produit vraiment
    // le chiffre dangereux. `{ AP14: 0 }` — « aucun grignotage », une réponse
    // parfaitement légitime — sortait « 0 g de protéines par jour », c'est-à-dire
    // un signal de dénutrition sévère fabriqué à partir de rien. Et rien côté
    // serveur n'exigeait la complétude d'un questionnaire du catalogue.
    const r: any = calculateScore('Q_ALI_03', { AP14: 0 });
    expect(r.scored).toBe(false);
    expect(r.proteinesG).toBeNull();
    expect(r.caloriesKcal).toBeNull();
    expect(r.raisonNonScore).toContain('protéique');
  });

  it('une seule ligne protéique suffit à calculer (contrôle négatif)', () => {
    const r: any = calculateScore('Q_ALI_03', { AP7: 2, AP14: 0 });
    expect(r.scored).not.toBe(false);
    expect(r.proteinesG).toBe(7);
  });
});
