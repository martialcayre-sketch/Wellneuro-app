import { describe, expect, it } from 'vitest';
import { sha256 } from './corpusSyntheseV1';
import {
  GRILLE_INTROUVABLE,
  grillesCitees,
  instrumentsCitesParUneZone,
} from './grillesSignees';
import { BANDES_PSQI } from './bandesPsqi';
import { feuillesDuDeclencheur, ORIENTATION_RULES_V1 } from './orientationRulesV1';
import { INDICATIONS_BIOLOGIE_V1 } from '@/lib/biology-library/indicationsBiologieV1';

// LE TROU QUE CE MODULE REFERME, ET COMMENT ON L'A TROUVÉ.
//
// Le 2026-09-13, la borne 4/5 du PSQI a été portée à 5/6 sur arbitrage praticien
// ([[D-180]]). Le geste était relu, et son effet sur `R-SOM-01` était l'objet
// même de l'arbitrage. Ce qui ne l'était pas : `BIO-SOM-01` — règle `publiee`
// d'une table ELLE AUSSI signée, qui prescrit `PANEL_SOMMEIL_1` — lit la même
// zone couleur sur le même instrument. Elle a cessé de prescrire à 5 sans avoir
// été éditée, sans re-signature, et sans qu'un seul des bancs du jour ne
// rougisse.
//
// PUIS LE MÊME DÉFAUT A ÉTÉ TROUVÉ DANS LA RÉPARATION. La première frontière ne
// couvrait que les GRILLES : la dernière étape du calcul, `score → couleur`. Le
// contre-audit du 2026-09-14 a montré que celle d'avant, `réponses → score`,
// restait dehors — retirer `C1_8` de `Q_GAS_01.scoring.subScores[0].items` fait
// tomber la couleur globale de `warning` à `success` et éteint `BIO-DIG-01`,
// sha inchangé. Le périmètre couvre depuis le `scoring` ENTIER et la cotation
// des items.
//
// CE BANC GARDE LES FAÇONS DONT LA RÉPARATION POURRAIT MENTIR : un périmètre
// qui aurait l'air d'avoir grandi sans peser, une dérivation qui oublierait un
// instrument en silence, une lecture des déclencheurs qui divergerait des bancs
// anti-dérive — et une empreinte qui changerait à tout coup, ce qui ne
// garderait rien non plus.

// L'inventaire des instruments dont le CALCUL commande une prescription de
// panel. Épinglé, parce qu'une liste comptée ne dit pas laquelle a bougé.
const INSTRUMENTS_LUS_PAR_LES_INDICATIONS = [
  'Q_CAR_01',
  'Q_GAS_01',
  'Q_GAS_02',
  'Q_GEO_03',
  'Q_GEO_04',
  'Q_GEO_05',
  'Q_GEO_06',
  'Q_INF_05',
  'Q_NEU_01',
  'Q_NEU_06',
  'Q_NEU_11',
  'Q_SOM_01',
  'Q_SOM_04',
  'Q_SOM_06',
  'Q_STR_02',
  'Q_STR_05',
];

/** Copie profonde — muter le périmètre dérivé, jamais le catalogue vivant. */
const copie = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const empreinte = (v: unknown) => sha256(JSON.stringify(v));

describe('périmètre signé — il couvre ce qui décide', () => {
  // (1) LA LECTURE DES DÉCLENCHEURS NE DIVERGE PAS.
  //
  // `grillesSignees` marche sur les deux tables, dont une seule expose
  // `feuillesDuDeclencheur`. Sa lecture est donc structurelle et indépendante
  // des types — ce qui la rend libre de dériver. Sans ce banc, une disjonction
  // d'une forme nouvelle serait lue par un côté et pas par l'autre, et des
  // instruments sortiraient du périmètre sans que rien ne le dise.
  it('lit les mêmes feuilles que `feuillesDuDeclencheur` sur la table d’orientation', () => {
    const parLeModule = instrumentsCitesParUneZone(ORIENTATION_RULES_V1);
    const parLaTable = new Set<string>();
    for (const regle of ORIENTATION_RULES_V1) {
      for (const declencheur of regle.declencheurs) {
        for (const feuille of feuillesDuDeclencheur(declencheur)) {
          const zone = (feuille as { zone?: { type?: string } }).zone;
          if (zone?.type !== 'couleur' && zone?.type !== 'interpretation') continue;
          const id = (feuille as { idQuestionnaire?: unknown }).idQuestionnaire;
          if (typeof id === 'string') parLaTable.add(id);
        }
      }
    }
    expect(parLeModule).toEqual([...parLaTable].sort());
    // Et la lecture n'est pas vide : un banc d'égalité entre deux vides serait
    // vert et ne garderait rien.
    expect(parLeModule.length).toBeGreaterThan(0);
  });

  // (2) AUCUN INSTRUMENT N'EST SILENCIEUSEMENT ABSENT.
  it.each([
    ['orientation', ORIENTATION_RULES_V1],
    ['indications biologiques', INDICATIONS_BIOLOGIE_V1],
  ])('chaque instrument cité par une zone de la table %s entre au périmètre', (_nom, regles) => {
    const perimetre = grillesCitees(regles as never);
    const introuvables = Object.entries(perimetre)
      .filter(([, bloc]) => bloc === GRILLE_INTROUVABLE)
      .map(([id]) => id);
    expect(introuvables).toEqual([]);
    expect(Object.keys(perimetre).length).toBeGreaterThan(0);
  });

  // (2 bis) L'INVENTAIRE EST ÉPINGLÉ, ET C'EST CE QUI REND LA CROISSANCE VISIBLE.
  it('la table d’orientation lit exactement quatre instruments', () => {
    expect(instrumentsCitesParUneZone(ORIENTATION_RULES_V1)).toEqual([
      'Q_ALI_01',
      'Q_GAS_01',
      'Q_SOM_01',
      'Q_STR_02',
    ]);
  });

  it('le périmètre signé de Q_ALI_01 contient les formes COURT_14 et SIIN_57', () => {
    const orientation = grillesCitees(ORIENTATION_RULES_V1);
    expect(Object.keys(orientation.Q_ALI_01 as Record<string, unknown>).sort()).toEqual([
      'COURT_14',
      'SIIN_57',
    ]);
  });

  it('la table des indications lit exactement seize instruments, nommés', () => {
    const instruments = instrumentsCitesParUneZone(INDICATIONS_BIOLOGIE_V1 as never);
    expect(instruments).toEqual(INSTRUMENTS_LUS_PAR_LES_INDICATIONS);
    // `Q_SOM_01` y est, et c'est le fait qui a coûté : le même instrument
    // commande une orientation ET une prescription de panel.
    expect(instruments).toContain('Q_SOM_01');
  });

  // (2 ter) UN INSTRUMENT INCONNU REND BIEN `GRILLE_INTROUVABLE`.
  //
  // LE BANC (2) NE PEUT PAS L'ATTRAPER : il n'exerce que des tables réelles, où
  // tout se résout. Une régression qui remplacerait `?? GRILLE_INTROUVABLE` par
  // une omission le laisserait VERT — la liste des introuvables resterait vide,
  // mais parce que la clé aurait disparu de l'objet, pas parce que l'instrument
  // existe. C'est le mode de défaillance que ce module répare, retourné contre
  // son propre garde.
  it('un instrument sans scoring est HACHÉ comme introuvable, jamais omis', () => {
    const regleFictive = [{
      declencheurs: [{
        type: 'zone',
        idQuestionnaire: 'Q_INSTRUMENT_QUI_N_EXISTE_PAS',
        zone: { type: 'couleur', couleurs: ['danger'] },
      }],
    }];
    const perimetre = grillesCitees(regleFictive as never);
    expect(Object.keys(perimetre)).toEqual(['Q_INSTRUMENT_QUI_N_EXISTE_PAS']);
    expect(perimetre.Q_INSTRUMENT_QUI_N_EXISTE_PAS).toBe(GRILLE_INTROUVABLE);
    // Et l'absence PÈSE : deux périmètres qui ne diffèrent que par un instrument
    // trouvé ou non doivent avoir deux empreintes.
    expect(empreinte(perimetre)).not.toBe(empreinte({}));
  });

  // ── CE QUE LE PÉRIMÈTRE CONTIENT, NOMMÉ ────────────────────────────────────
  //
  // L'inventaire épinglé est la seule forme qui aurait attrapé les deux défauts
  // de ce chantier : la première version ne lisait que `scoring.interpretation`
  // et `Q_GAS_01` en ressortait vide ; la seconde recopiait six champs et en
  // laissait douze dehors. Un champ ajouté demain au catalogue fait rougir ce
  // banc — c'est le but : il entre au périmètre, donc il appelle une
  // re-signature, donc quelqu'un doit l'écrire.
  it('Q_GAS_01 apporte son scoring ENTIER et la cotation de ses items', () => {
    const g = grillesCitees(ORIENTATION_RULES_V1).Q_GAS_01 as Record<string, any>;
    expect(Object.keys(g)).toEqual(['options', 'scoring']);
    expect(Object.keys(g.scoring)).toEqual([
      'certification',
      'globalInterpretation',
      'note',
      'severiteCroissante',
      'subScores',
      'type',
    ]);
    expect(g.scoring.subScores.map((s: any) => s.id)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5']);
    // LES ITEMS DE CHAQUE AXE, qui manquaient au périmètre du 2026-09-13.
    expect(g.scoring.subScores[0].items).toEqual([
      'C1_1', 'C1_2', 'C1_3', 'C1_4', 'C1_5', 'C1_6', 'C1_7', 'C1_8',
    ]);
    // ET LA COTATION : quatre valeurs de 0 à 3 par item du TFD.
    expect(g.options.C1_1).toEqual({ type: 'likert', valeurs: [0, 1, 2, 3] });
  });

  // LE TEXTE DES QUESTIONS RESTE DEHORS, et c'est une décision, pas un oubli :
  // corriger une coquille ne doit pas éteindre deux tables signées. Ce banc
  // énumère plutôt qu'il n'échantillonne — il relit toute la sérialisation.
  it('aucun libellé de question n’entre dans l’empreinte', () => {
    const serialise = JSON.stringify(grillesCitees(ORIENTATION_RULES_V1));
    expect(serialise).not.toContain("J'ai la bouche sèche");
    expect(serialise).not.toContain('Jamais, cela ne me concerne pas');
    // Contre-épreuve : ce qui DOIT y être y est, sans quoi le banc ci-dessus
    // passerait sur une sérialisation vide.
    expect(serialise).toContain('C1_8');
  });

  // ── LES MUTATIONS, ET LEUR CONTRE-ÉPREUVE ──────────────────────────────────
  //
  // Un banc de mutation n'établit son propos que si le NON-mutant passe : sans
  // lui, « le sha a changé » reste compatible avec « le sha change à tout coup ».
  // Deux bancs du 2026-09-13 ont commis exactement cette faute, en remplaçant un
  // objet par un tableau — ils mesuraient la forme. La copie profonde ci-dessous
  // est donc la première chose à vérifier.
  it('recopier le périmètre à l’identique ne change PAS l’empreinte', () => {
    const perimetre = grillesCitees(ORIENTATION_RULES_V1);
    expect(empreinte(copie(perimetre))).toBe(empreinte(perimetre));
  });

  it.each([
    ['retirer un item d’un axe — le cas du contre-audit', (p: any) => {
      p.Q_GAS_01.scoring.subScores[0].items.pop();
    }],
    ['déplacer une borne de sous-score', (p: any) => {
      p.Q_GAS_01.scoring.subScores[0].ranges[0].max = 8;
    }],
    ['renommer une bande globale', (p: any) => {
      p.Q_GAS_01.scoring.globalInterpretation[0].label += ' ';
    }],
    ['recoter une option', (p: any) => {
      p.Q_GAS_01.options.C1_1.valeurs[3] = 5;
    }],
    ['déplacer une borne du PSQI, hors catalogue', (p: any) => {
      p.Q_SOM_01.grilleHorsCatalogue[0].max = 4;
    }],
    ['basculer `severiteCroissante`', (p: any) => {
      p.Q_SOM_01.scoring.severiteCroissante = false;
    }],
    ['RETIRER `severiteCroissante` — une absence ne s’omet pas', (p: any) => {
      delete p.Q_SOM_01.scoring.severiteCroissante;
    }],
    ['poser `sansTotalGlobal`', (p: any) => {
      p.Q_SOM_01.scoring.sansTotalGlobal = true;
    }],
    ['changer le moteur de scoring', (p: any) => {
      p.Q_SOM_01.scoring.type = 'sum';
    }],
  ])('%s change l’empreinte', (_nom, muter) => {
    const perimetre = grillesCitees(ORIENTATION_RULES_V1);
    const mute = copie(perimetre);
    muter(mute);
    // La mutation s'est bien appliquée — sans quoi l'égalité des deux
    // empreintes se lirait comme une régression du périmètre.
    expect(JSON.stringify(mute)).not.toBe(JSON.stringify(perimetre));
    expect(empreinte(mute)).not.toBe(empreinte(perimetre));
  });

  // LE SEUIL QUI PORTE SON NOM. `Q_INF_05` est cité par la table des
  // indications, et son `scoring.threshold` valait 3 hors de tout périmètre
  // signé — un champ nommé *seuil*, dehors d'une signature bâtie pour couvrir
  // les seuils cliniques.
  it('le `threshold` de Q_INF_05 pèse dans l’empreinte de la table biologique', () => {
    const perimetre = grillesCitees(INDICATIONS_BIOLOGIE_V1 as never);
    expect((perimetre.Q_INF_05 as any).scoring.threshold).toBe(3);
    const mute = copie(perimetre);
    (mute.Q_INF_05 as any).scoring.threshold = 4;
    expect(empreinte(mute)).not.toBe(empreinte(perimetre));
  });

  // (3) LES DEUX TABLES LISENT BIEN LE MÊME PSQI.
  //
  // C'est le fait qui a rendu le défaut coûteux : un seul instrument commandait
  // deux tables signées. Il doit rester VÉRIFIÉ plutôt que rappelé en prose.
  it('le PSQI est dans les deux périmètres, et c’est le même', () => {
    const orientation = grillesCitees(ORIENTATION_RULES_V1) as Record<string, any>;
    const biologie = grillesCitees(INDICATIONS_BIOLOGIE_V1 as never) as Record<string, any>;
    expect(orientation.Q_SOM_01.grilleHorsCatalogue).toEqual(BANDES_PSQI);
    expect(orientation.Q_SOM_01).toEqual(biologie.Q_SOM_01);
  });

  it('le PSQI porte `severiteCroissante`, comme tout instrument du catalogue', () => {
    const psqi = grillesCitees(ORIENTATION_RULES_V1).Q_SOM_01 as Record<string, any>;
    expect(psqi.scoring.severiteCroissante).toBe(true);
    expect(psqi.scoring.sansTotalGlobal).toBeUndefined();
  });

  // (4) LE PÉRIMÈTRE EST STABLE SOUS RÉORDONNANCEMENT.
  //
  // `JSON.stringify` respecte l'ordre d'INSERTION des clés. Sans le tri de
  // `instrumentsCitesParUneZone` et la forme canonique, déplacer une règle dans
  // le tableau changerait le sha — une signature cassée par un geste qui ne
  // touche à aucun contenu clinique, et donc une incitation à « rattraper le
  // sha » plutôt qu'à signer.
  it('déplacer une règle ne change pas l’empreinte du périmètre', () => {
    const avant = empreinte(grillesCitees(ORIENTATION_RULES_V1));
    const permutees = [...ORIENTATION_RULES_V1].reverse();
    expect(empreinte(grillesCitees(permutees))).toBe(avant);
  });
});
