// Banc du RECUEIL PARTIEL du TFD (`Q_GAS_01`) — 2026-08-04.
//
// CE QU'IL TIENT. `tfd` était le dernier moteur de la classe atteignable par une
// règle d'orientation publiée à ne pas fermer le recueil partiel. Le trou est
// nommé trois fois dans le dépôt par le lot qui l'a laissé ouvert
// (`clinical/orientationEngine.ts` ×2, `clinical/orientationRulesV1.ts` ×1).
//
// `totalGlobalDepuisSousScores` ne rend `null` que si un axe ENTIER est vide. Un
// seul item répondu par axe suffisait donc à produire un total : cinq réponses
// sur trente-et-une, cotées à leur PIRE valeur, donnaient 15 sur 93 et
// décrochaient « A — Absence de troubles fonctionnels » (0-23). Le biais est à
// sens unique — un item non répondu est IGNORÉ, jamais compté 0 —, et sur cette
// grille le bas est le rassurant.
//
// D-014 — « une bande d'interprétation ne se lit que sur l'instrument complet ».
// Ce banc en est la contre-épreuve sur le TFD, au grain de l'axe comme au grain
// de l'instrument.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';
import { calculerCouvertureBesoin, calculerCouvertureSource } from '@/lib/equilibre/score';
import { BESOINS_FONDATIONS_CRITIQUES, BESOIN_SOURCES, SEUIL_EFFONDREMENT } from '@/lib/equilibre/constants';

/** Les 31 items cotés, DÉRIVÉS du découpage — jamais réécrits à la main. */
const ITEMS: string[] = ((QUESTIONNAIRE_CATALOGUE as any).Q_GAS_01.scoring.subScores as any[])
  .flatMap(sub => sub.items as string[]);

const remplir = (valeur: number) => Object.fromEntries(ITEMS.map(id => [id, valeur]));

/** Passation complète au PIRE — 93 sur 93, la bande la plus sévère. */
const COMPLET_MAX = remplir(3);
/** Passation complète au MIEUX — 0 sur 93, la bande la plus rassurante. */
const COMPLET_MIN = remplir(0);

/**
 * Le cas qui a motivé la garde : cinq réponses qui touchent les CINQ axes, donc
 * invisibles pour `totalGlobalDepuisSousScores` comme pour la garde de passation
 * vide. Chacune est à sa PIRE valeur, et les vingt-six items sans réponse sont
 * ignorés.
 */
const CINQ_REPONSES_CINQ_AXES = { C1_1: 3, C2_1: 3, C3_1: 3, C4_1: 3, C5_1: 3 };

describe('TFD — recueil partiel', () => {
  it('le découpage cote bien 31 items sur 5 axes', () => {
    // Le balayage doit mordre : tout ce banc dérive de cette liste, et une liste
    // qui rétrécit rendrait les comptes ci-dessous vrais sans rien prouver.
    expect(ITEMS).toHaveLength(31);
    expect(new Set(ITEMS).size).toBe(31);
  });

  it('une passation COMPLÈTE garde ses bandes, et ses deux comptes le disent', () => {
    // Contre-épreuve obligatoire : une garde qui rendrait `null` partout
    // passerait tous les tests d'absence sans rien protéger.
    const pire: any = calculateScore('Q_GAS_01', COMPLET_MAX);
    expect(pire.missing).toBe(0);
    expect(pire.repondus).toBe(31);
    expect(pire.total).toBe(93);
    expect(pire.interpretation?.label).toBe('C — Prédominance de troubles fonctionnels majeurs');
    // Chaque axe garde la sienne, et pas seulement le global.
    expect(pire.subScores.map((s: any) => s.interpretation?.label ?? null))
      .toEqual(Array(5).fill('C — Prédominance de troubles fonctionnels majeurs'));

    // Aux DEUX bornes : une garde qui ne laisserait passer que le sévère
    // supprimerait en silence la seule bande rassurante légitime.
    const mieux: any = calculateScore('Q_GAS_01', COMPLET_MIN);
    expect(mieux.total).toBe(0);
    expect(mieux.interpretation?.label).toBe('A — Absence de troubles fonctionnels');
  });

  it('cinq réponses touchant les cinq axes ne produisent AUCUNE bande', () => {
    const r: any = calculateScore('Q_GAS_01', CINQ_REPONSES_CINQ_AXES);
    // Les cinq axes sont bien mesurés : c'est précisément ce qui rendait le
    // défaut invisible. Si cette attente casse, le scénario a changé et le reste
    // du test ne prouve plus ce qu'il annonce.
    expect(r.subScores.filter((s: any) => s.total !== null)).toHaveLength(5);
    expect(r.interpretation).toBeNull();
    expect(r.missing).toBe(26);
    expect(r.repondus).toBe(5);
    // La note DIT pourquoi la bande manque : sans elle, un `interpretation:
    // null` nu se lit comme un trou de grille.
    expect(r.note).toContain('Recueil partiel');
    expect(r.note).toContain('26 items');
  });

  it('le total partiel reste servi, à côté de ses comptes', () => {
    // Arbitrage aligné sur `sum` (#561) et sur le PSQI : c'est la BANDE qui
    // conclut. Le total part avec `missing`/`repondus`, qui le rendent
    // vérifiable.
    const r: any = calculateScore('Q_GAS_01', CINQ_REPONSES_CINQ_AXES);
    // ÉPINGLÉ À L'UNITÉ, pas borné : c'est le chiffre qui sert d'argument.
    // 15 sur 93 — « A — Absence de troubles fonctionnels » — alors que les cinq
    // items renseignés sont TOUS au maximum de leur échelle.
    expect(r.total).toBe(15);
    expect(r.maxTotal).toBe(93);
  });

  it('un axe partiellement répondu perd SA bande et garde son total', () => {
    // Le grain de l'axe, et c'est l'écart assumé au précédent `subscore` : les
    // bandes d'axe du TFD sont calibrées sur l'axe COMPLET (`C1` lit « Absence »
    // de 0 à 7 sur ses huit items) et sont AFFICHÉES sur la fiche praticien.
    const r: any = calculateScore('Q_GAS_01', CINQ_REPONSES_CINQ_AXES);
    const c1 = r.subScores.find((s: any) => s.id === 'C1');
    expect(c1.total).toBe(3);
    expect(c1.interpretation).toBeNull();
    // La complétude de l'axe devient LISIBLE — ce sont les deux clés que lit
    // `recueilIncomplet` dans `clinical/orientationEngine.ts`.
    expect(c1.repondus).toBe(1);
    expect(c1.items).toBe(8);
  });

  it('un SEUL item manquant suffit à retirer la bande', () => {
    // La frontière est « tous les items cotés », pas « presque tous ». Un banc
    // qui ne testerait que le cas à moitié rempli laisserait passer un seuil de
    // tolérance introduit plus tard.
    const { C5_5, ...trenteSurTrenteEtUn } = { ...COMPLET_MAX };
    void C5_5;
    const r: any = calculateScore('Q_GAS_01', trenteSurTrenteEtUn);
    expect(r.missing).toBe(1);
    expect(r.repondus).toBe(30);
    expect(r.interpretation).toBeNull();
    expect(r.note).toContain('1 item');
    // Les quatre axes COMPLETS gardent la leur ; seul `C5` perd la sienne.
    expect(r.subScores.filter((s: any) => s.interpretation !== null)).toHaveLength(4);
    expect(r.subScores.find((s: any) => s.id === 'C5').interpretation).toBeNull();
  });

  it('la note de recueil s’AJOUTE à celle de l’instrument, elle ne l’écrase pas', () => {
    // Ici ce n'est PAS un piège posé pour plus tard, contrairement au PSQI :
    // `Q_GAS_01` déclare réellement une `scoring.note` (les valeurs frontières
    // non explicitement couvertes par les seuils source). Un `note: noteRecueil`
    // nu l'aurait effacée sur toutes les passations partielles.
    const noteInstrument: string = (QUESTIONNAIRE_CATALOGUE as any).Q_GAS_01.scoring.note;
    expect(noteInstrument).toBeTruthy();

    const complet: any = calculateScore('Q_GAS_01', COMPLET_MAX);
    expect(complet.note).toBe(noteInstrument);

    const partiel: any = calculateScore('Q_GAS_01', CINQ_REPONSES_CINQ_AXES);
    expect(partiel.note).toContain(noteInstrument);
    expect(partiel.note).toContain('Recueil partiel');
    // La certification suit le même chemin et ne se perd pas en route.
    expect(partiel.certification).toEqual(complet.certification);
  });

  it('« Mon équilibre » cesse de lire une couverture fabriquée', () => {
    // `Q_GAS_01` alimente le besoin 4 en `inverser: true` (`max: 93`) :
    // `extraireValeurBrute` divise le total par 93 puis prend `1 − ratio`. Un
    // total effondré par l'absence de réponses y devenait « besoin bien
    // couvert » — l'erreur change de SIGNE et devient rassurante.
    // `calculerCouvertureSource` prend les réponses BRUTES et rescore lui-même :
    // lui passer un score déjà calculé le ferait rendre `null` pour la mauvaise
    // raison, et le test aurait été vert avant le correctif comme après.
    //
    // La source est LUE dans `BESOIN_SOURCES`, jamais reconstruite à la main :
    // une source écrite en dur resterait verte le jour où `Q_GAS_01` quitte le
    // besoin 4 ou change de `max`, en n'affirmant plus rien sur le produit.
    const source = BESOIN_SOURCES[4].find(s => s.idQuestionnaire === 'Q_GAS_01');
    expect(source, 'Q_GAS_01 n’est plus source du besoin 4').toBeDefined();
    expect(source!.inverser).toBe(true);
    expect(source!.max).toBe(93);

    expect(calculerCouvertureSource(source!, { Q_GAS_01: CINQ_REPONSES_CINQ_AXES })).toBeNull();

    // Contre-épreuve, aux deux bornes : la source reste lue quand elle est
    // complète, et dans le bon sens. Sans le correctif, le recueil partiel
    // ci-dessus rendait 1 − 15/93 ≈ 0,84 — plus « couvert » qu'un TFD complet et
    // dégradé.
    expect(calculerCouvertureSource(source!, { Q_GAS_01: COMPLET_MAX })).toBe(0);
    expect(calculerCouvertureSource(source!, { Q_GAS_01: COMPLET_MIN })).toBe(1);
  });

  it('LE COÛT, épinglé : un partiel DÉJÀ sévère cesse lui aussi d’être lu', () => {
    // Ce que la garde emporte, écrit comme un attendu et non découvert plus tard.
    // Trente items sur trente-et-un, tous au maximum : le total atteint 90 sur 93.
    // Les items de `O_TFD` sont cotés 0 à 3, donc l'item manquant ne peut
    // qu'AJOUTER — la sévérité est ACQUISE, pas probable. La garde l'écarte quand
    // même, parce qu'une bande ne se lit que sur l'instrument complet (D-014).
    //
    // Direction de l'effet sur « Mon équilibre », et c'est l'inverse de l'autre
    // branche : la couverture passait sous `SEUIL_EFFONDREMENT`, faisait du
    // besoin 4 une fondation critique et plafonnait le score global à 50. La
    // rendre non mesurée LÈVE ce plafond.
    const { C5_5, ...trenteSurTrenteEtUn } = { ...COMPLET_MAX };
    void C5_5;
    const r: any = calculateScore('Q_GAS_01', trenteSurTrenteEtUn);
    expect(r.total).toBe(90);
    expect(r.interpretation).toBeNull();

    const source = BESOIN_SOURCES[4].find(s => s.idQuestionnaire === 'Q_GAS_01')!;
    // LE FAIT PORTEUR, asséré et non raconté. Toute la thèse « le plafond se
    // lève » repose sur l'appartenance du besoin 4 aux fondations critiques :
    // l'en retirer rendrait faux le commentaire ci-dessus ET les dix lignes de
    // `equilibre/constants.ts`, sans qu'aucun banc ne rougisse.
    expect(BESOINS_FONDATIONS_CRITIQUES).toContain(4);
    // Avant la garde : 1 − 90/93 ≈ 0,032, très en dessous du seuil de 0,34.
    // Arithmétique sur littéraux — elle documente le chiffre, elle ne le garde
    // pas ; c'est l'assertion précédente qui garde.
    expect(1 - 90 / 93).toBeLessThan(SEUIL_EFFONDREMENT);
    // Après : plus de mesure du tout, donc plus de fondation critique.
    expect(calculerCouvertureSource(source, { Q_GAS_01: trenteSurTrenteEtUn })).toBeNull();
    // Le besoin 4 n'a qu'une autre source (`Q_INF_01`), absente ici : le besoin
    // entier ressort non mesuré, et non pas 0 — un 0 le replacerait sous le seuil
    // d'effondrement par la porte de derrière.
    expect(calculerCouvertureBesoin(4, { Q_GAS_01: trenteSurTrenteEtUn })).toBeNull();
  });

  it('la mini-synthèse ne conclut plus « peu perturbés » sur un axe non lu', () => {
    // Trouvé en revue adversariale : retirer la bande d'un axe ne suffisait pas,
    // `buildMiniSynthese` la RE-FABRIQUAIT un étage plus haut. Quatre axes
    // complets et calmes, plus un `C5` renseigné à UN item sur cinq — coté au
    // maximum, « crampes intestinales douloureuses, très fréquemment ».
    const quatreCalmesUnPartielSevere: Record<string, number> = {
      C1_1: 0, C1_2: 0, C1_3: 0, C1_4: 0, C1_5: 0, C1_6: 0, C1_7: 0, C1_8: 0,
      C2_1: 0, C2_2: 0, C2_3: 0, C2_4: 0, C2_5: 0, C2_6: 0, C2_7: 0,
      C3_1: 0, C3_2: 0, C3_3: 0, C3_4: 0, C3_5: 0,
      C4_1: 0, C4_2: 0, C4_3: 0, C4_4: 0, C4_5: 0, C4_6: 0,
      C5_3: 3,
    };
    const r: any = calculateScore('Q_GAS_01', quatreCalmesUnPartielSevere);
    // Le scénario est bien celui qu'on croit : quatre axes portent une bande, le
    // cinquième n'en porte aucune mais garde un total non nul.
    expect(r.subScores.filter((s: any) => s.interpretation !== null)).toHaveLength(4);
    expect(r.subScores.find((s: any) => s.id === 'C5').total).toBe(3);

    const texte = buildMiniSynthese(r);
    expect(texte).not.toContain('peu perturbés');
    // Le repli énumère : il en dit PLUS, il ne rassure pas moins pour rien.
    expect(texte).toContain('Douleurs intestinales');
  });

  it('les deux chemins de sortie SANS score gardent une forme lisible', () => {
    // La garde générale de passation vide court-circuite la branche `tfd` : ces
    // objets ne portent NI `missing` NI `repondus`. C'est sans danger — `total`
    // y est `null`, donc aucune bande ne peut sortir — mais le lot vient de faire
    // de ces deux clés un contrat lu en aval (`recueilIncomplet`,
    // `extraireValeurBrute`). Figer la forme, pour que le jour où quelqu'un
    // déplace cette garde, le banc parle au lieu de se taire.
    for (const entree of [{}, { ZZZ: 3 }]) {
      const r: any = calculateScore('Q_GAS_01', entree);
      expect(r.total).toBeNull();
      expect(r.interpretation).toBeNull();
      expect(r.missing).toBeUndefined();
      expect(r.repondus).toBeUndefined();
    }
  });
});
