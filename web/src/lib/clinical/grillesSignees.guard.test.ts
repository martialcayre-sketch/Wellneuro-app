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
// La cause n'était pas un oubli mais une FRONTIÈRE MAL PLACÉE : les deux sha ne
// hachaient que leur tableau de règles, alors que les zones citent des COULEURS
// et des LIBELLÉS — jamais des nombres. Le point d'allumage n'a jamais été dans
// la règle ; il est dans la grille de l'instrument.
//
// CE BANC GARDE LES TROIS FAÇONS DONT LA RÉPARATION POURRAIT MENTIR : un
// périmètre qui aurait l'air d'avoir grandi sans peser, une dérivation qui
// oublierait un instrument en silence, et une lecture des déclencheurs qui
// divergerait de celle des bancs anti-dérive.

// L'inventaire des instruments dont les GRILLES commandent une prescription de
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

describe('grilles signées — le périmètre couvre ce qui décide', () => {
  // (1) LA LECTURE DES DÉCLENCHEURS NE DIVERGE PAS.
  //
  // `grillesSignees` marche sur les deux tables, dont une seule expose
  // `feuillesDuDeclencheur`. Sa lecture est donc structurelle et indépendante
  // des types — ce qui la rend libre de dériver. Sans ce banc, une disjonction
  // d'une forme nouvelle serait lue par un côté et pas par l'autre, et des
  // grilles sortiraient du périmètre sans que rien ne le dise.
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

  // (2) AUCUNE GRILLE N'EST SILENCIEUSEMENT ABSENTE.
  //
  // C'est LE défaut de classe : `GRILLES_HORS_CATALOGUE` ne porte qu'une entrée,
  // et si un futur instrument échappait lui aussi au `scoring.interpretation` de
  // son questionnaire, son absence se hacherait en `GRILLE_INTROUVABLE` — donc
  // se verrait ici — au lieu de disparaître de l'objet.
  it.each([
    ['orientation', ORIENTATION_RULES_V1],
    ['indications biologiques', INDICATIONS_BIOLOGIE_V1],
  ])('chaque instrument cité par une zone de la table %s a une grille', (_nom, regles) => {
    const perimetre = grillesCitees(regles as never);
    const introuvables = Object.entries(perimetre)
      .filter(([, grille]) => grille === GRILLE_INTROUVABLE)
      .map(([id]) => id);
    expect(introuvables).toEqual([]);
    expect(Object.keys(perimetre).length).toBeGreaterThan(0);
  });

  // (2 bis) L'INVENTAIRE EST ÉPINGLÉ, ET C'EST CE QUI REND LA CROISSANCE VISIBLE.
  //
  // Le compte seul (« > 0 ») laisserait une règle ajoutée demain faire entrer un
  // instrument dans le périmètre en silence — donc casser les deux signatures
  // sans que le diff dise lequel. Nommer les instruments oblige à écrire le
  // changement au moment où il se fait.
  it('la table d’orientation lit exactement quatre instruments', () => {
    expect(instrumentsCitesParUneZone(ORIENTATION_RULES_V1)).toEqual([
      'Q_ALI_01',
      'Q_GAS_01',
      'Q_SOM_01',
      'Q_STR_02',
    ]);
  });

  it('la table des indications lit exactement seize instruments, nommés', () => {
    const instruments = instrumentsCitesParUneZone(INDICATIONS_BIOLOGIE_V1 as never);
    expect(instruments).toEqual(INSTRUMENTS_LUS_PAR_LES_INDICATIONS);
    // `Q_SOM_01` y est, et c'est le fait qui a coûté : la même grille commande
    // une orientation ET une prescription de panel.
    expect(instruments).toContain('Q_SOM_01');
  });

  // (3) LES DEUX TABLES LISENT BIEN LA MÊME GRILLE DU PSQI.
  //
  // C'est le fait qui a rendu le défaut coûteux : une seule grille commandait
  // deux tables signées. Il doit rester VÉRIFIÉ plutôt que rappelé en prose.
  it('la grille du PSQI est dans les deux périmètres, et c’est la même', () => {
    const orientation = grillesCitees(ORIENTATION_RULES_V1);
    const biologie = grillesCitees(INDICATIONS_BIOLOGIE_V1 as never);
    expect(orientation.Q_SOM_01).toBe(BANDES_PSQI);
    expect(biologie.Q_SOM_01).toBe(BANDES_PSQI);
  });

  // (4) LE PÉRIMÈTRE EST STABLE SOUS RÉORDONNANCEMENT.
  //
  // `JSON.stringify` respecte l'ordre d'INSERTION des clés. Sans le tri de
  // `instrumentsCitesParUneZone`, déplacer une règle dans le tableau changerait
  // le sha — une signature cassée par un geste qui ne touche à aucun contenu
  // clinique, et donc une incitation à « rattraper le sha » plutôt qu'à signer.
  it('déplacer une règle ne change pas l’empreinte des grilles', () => {
    const avant = sha256(JSON.stringify(grillesCitees(ORIENTATION_RULES_V1)));
    const permutees = [...ORIENTATION_RULES_V1].reverse();
    expect(sha256(JSON.stringify(grillesCitees(permutees)))).toBe(avant);
  });

  // (5) ET LA CONTRE-ÉPREUVE, qui est la seule à prouver que (4) garde quelque
  // chose : une grille RÉELLEMENT modifiée change bien l'empreinte.
  it('déplacer une borne change l’empreinte des grilles', () => {
    const perimetre = grillesCitees(ORIENTATION_RULES_V1);
    const avant = sha256(JSON.stringify(perimetre));
    const mute = {
      ...perimetre,
      Q_SOM_01: BANDES_PSQI.map((bande, i) => (i === 0 ? { ...bande, max: 4 } : bande)),
    };
    expect(sha256(JSON.stringify(mute))).not.toBe(avant);
  });
});
