import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore, computeScoreFromDef } from '@/lib/questions';
import { scoresPourPrompt } from '@/lib/scoring/scoresPourPrompt';
import { Q_ALI_01_SIIN_57 } from '@/lib/questionnaires/alimentaire';
import { SYSTEM_PROMPT_GOUVERNANCE } from '@/lib/anthropic';

// Résiduel documenté à la clôture de #437. La consigne `synthese-v9` décrivait
// DEUX porteurs de sous-scores — `dimensions` et `scoresBesoins` — et laissait le
// troisième, `subScores`, sans un mot. Mesuré avant d'écrire la v10, et c'est
// l'inverse d'un détail : `subScores` est le porteur DOMINANT (17 instruments du
// catalogue, 66 sous-scores), et en base **30 passations sur 76** le portent contre
// **0** pour les deux autres. La consigne décrivait donc les deux clés qu'aucune
// passation enregistrée ne porte, et se taisait sur celle qu'elles portent toutes.
//
// Ce fichier tient les deux sens du couplage :
//   · la consigne nomme les trois porteurs et les champs propres à `subScores` ;
//   · ces champs existent RÉELLEMENT dans la charge livrée — sinon la consigne
//     décrit un fantôme, et un fantôme s'enlève sans que rien ne rougisse.
//
// LEÇON DE MÉTHODE, payée par un NO-GO en revue. La première version de ce banc
// remplissait chaque questionnaire en saturant les OPTIONS de ses questions. Or
// `Q_SOM_09` (agenda du sommeil) n'a pas d'options — son scoring lit des agrégats
// numériques. L'instrument tombait donc à `scored: false` et sortait du recensement
// SANS BRUIT… et c'était le seul à porter des `total: null`, c'est-à-dire le seul
// cas qui invalidait la règle que la consigne s'apprêtait à énoncer. La méthode de
// mesure avait caché le contre-exemple. D'où `FIXTURES` ci-dessous, et surtout la
// garde « aucun angle mort silencieux » : tout instrument que le remplissage
// générique ne score pas doit être déclaré ICI, avec sa raison.
//
// Les valeurs attendues sont ÉCRITES À LA MAIN, jamais dérivées du champ testé :
// un attendu recalculé depuis le moteur bouge avec lui et ne prouve rien.

/** Instruments dont le scoring ne lit pas les options des questions. */
const FIXTURES: Record<string, Record<string, number | null>> = {
  // Agrégats d'un recueil complet et éligible (patron de `agenda-sommeil/scoring.test.ts`).
  Q_SOM_09: {
    AGD_NB_NUITS: 18, AGD_NB_NUITS_TST: 18, AGD_NB_NUITS_EFF: 18,
    AGD_INDICE_ELIGIBLE: 1, AGD_TIB_MOY: 480, AGD_TST_MOY: 470,
    AGD_EFF_MOY: 95, AGD_LAT_MED: 10, AGD_WASO_MOY: 5,
    AGD_REV_MOY: 0.5, AGD_REG_ECT: 20, AGD_QUAL_MOY: 5,
  },
};

/**
 * Instruments que le remplissage générique ne score pas et qui n'émettent AUCUN
 * sous-score. Vérifié (test « aucun angle mort silencieux »), jamais supposé :
 * tous deux sont de type `journal`, un recueil sans score ni sous-échelle.
 */
const SANS_SOUS_SCORES = ['Q_URO_02', 'Q_FIB_03'];

/**
 * Instruments dont au moins une question n'a pas d'options : le remplissage
 * générique leur envoie `0`, ce qui n'est PAS une passation représentative.
 *
 * C'est la détection de CLASSE, et elle remplace un premier essai qui ne visait que
 * l'incident : la garde s'adossait à `scored === false`, or seul le moteur
 * `agenda_sommeil` émet ce champ. Un instrument inatteignable dont le moteur rend un
 * objet d'allure normale serait ressorti muet. Ici le critère porte sur l'ENTRÉE, pas
 * sur ce que le moteur veut bien dire de lui-même.
 *
 * Chaque entrée déclare pourquoi le relevé reste valable, ou porte une fixture.
 */
const REMPLISSAGE_NON_REPRESENTATIF: Record<string, string> = {
  Q_SOM_09: 'agrégats numériques — fixture fournie',
  Q_ALI_03: 'nombres de portions en saisie chiffrée ; n’émet pas `subScores` mais deux apports pondérés (hors périmètre)',
  Q_MOD_03: 'échelles 0-10 en saisie directe — fixtures partielle et vide fournies',
  Q_NEU_12: 'comptages mensuels ; n’émet pas `subScores` mais `parts` (hors périmètre)',
  Q_SOM_01: 'PSQI ; n’émet pas `subScores` mais `components` (hors périmètre)',
  Q_FIB_02: 'n’émet pas `subScores` mais `components` (hors périmètre)',
  Q_GAS_02: 'n’émet pas `subScores` mais `components` (hors périmètre)',
  Q_SOM_03: 'Berlin ; n’émet pas `subScores` mais `categories` (hors périmètre)',
  Q_URO_02: 'type `journal` — aucun sous-score',
  Q_ALI_09: 'agenda alimentaire : AUCUN item (`sections: []`), la saisie passe par un composant patient dédié — le remplissage générique n’a rien à remplir. Type `journal`, donc aucun sous-score non plus',
};

/**
 * Les SEPT porteurs de découpages qui arrivent réellement au prompt. La v9 en
 * annonçait deux, une première rédaction de la v10 en annonçait trois : les deux
 * dénombrements étaient faux. Épinglé par NOM pour qu'un huitième porteur — ou la
 * disparition d'un existant — rougisse au lieu de passer.
 */
const PORTEURS_ATTENDUS = [
  'categories', 'components', 'dimensions', 'parts', 'phases', 'scoresBesoins', 'subScores',
];

/** Les 17 émetteurs de `subScores`, par identifiant : un compte ne voit pas une substitution. */
// Dix-neuf depuis le 2026-07-30. `Q_CAN_01` et `Q_CAN_02` sont entrés en même
// temps que la cotation officielle EORTC : leurs quinze et huit échelles 0-100
// remplacent la somme brute qui leur tenait lieu de score, et ce sont désormais
// ces échelles qui arrivent au modèle de synthèse. Entrée VOULUE — un score de
// fonctionnement physique dit quelque chose à la consultation, une somme de 28 à
// 112 ne disait rien.
// `Q_SOM_07` (MFI-20) a rejoint la liste le 2026-07-31 : reconstruit depuis sa
// source, il passe du scoring `sum` — une somme brute sur /80, que sa source ne
// définit pas — à `subscore`, avec les cinq sous-échelles qu'elle déclare.
//
// `Q_ALI_03` l'a QUITTÉE le même jour, et pour la raison inverse : reconstruit
// depuis sa feuille de calcul source, il ne rend plus cinq « index » ordinaux
// mais deux grandeurs pondérées (grammes de protéines, kilocalories) sous le
// moteur `apports_ponderes`. Elles ne sont pas des sous-scores et n'atteignent
// pas le prompt — `scoresPourPrompt` les écarte, la consigne interdisant au
// modèle de conclure à une masse consommée.
const EMETTEURS_SUBSCORES = [
  'Q_CAN_01', 'Q_CAN_02', 'Q_GAS_01', 'Q_GEO_01', 'Q_INF_03', 'Q_MOD_01',
  'Q_MOD_03', 'Q_NEU_03', 'Q_NEU_05', 'Q_NEU_11', 'Q_PED_02', 'Q_PNE_01', 'Q_SOM_07',
  'Q_SOM_09', 'Q_STR_01', 'Q_STR_04', 'Q_STR_06', 'Q_TAB_03', 'Q_URO_01',
];

/** Champs de `subScores` que la consigne n'a pas à décrire : ils se lisent seuls. */
const CHAMPS_EVIDENTS = new Set(['id', 'label']);

function questionsDe(id: string): Array<{ id: string; options?: Array<{ v: unknown }> }> {
  const def = (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[id];
  return (def?.sections ?? []).flatMap((s: any) => s.questions ?? []);
}

function reponsesPour(id: string): Record<string, unknown> {
  if (FIXTURES[id]) return FIXTURES[id];
  return Object.fromEntries(
    questionsDe(id).map(q => {
      const valeurs = (q.options ?? []).map(o => Number(o.v)).filter(Number.isFinite);
      return [q.id, valeurs.length ? Math.max(...valeurs) : 0];
    })
  );
}

/**
 * La charge transmise au modèle, et non le retour nu du moteur — `conduite` est
 * légitime en sortie de moteur et n'arrive jamais au modèle.
 *
 * Nuance à ne pas surestimer : `route.ts` applique encore
 * `reponsesLisiblesPourPrompt` par-dessus, qui ne touche que `rawAnswers` des
 * `Q_ALI` et ne modifie aucun sous-score. Ce banc porte donc sur la charge telle
 * qu'elle est vue par les sous-scores, pas sur l'objet final octet pour octet.
 */
function chargePour(id: string, reponses: Record<string, unknown> = reponsesPour(id)): any {
  const scores = (calculateScore as any)(id, reponses);
  return scoresPourPrompt({ ...scores, rawAnswers: reponses });
}

describe('consigne système — les trois porteurs de sous-scores', () => {
  it('nomme les TROIS porteurs, et ne prétend plus qu’il y en a deux', () => {
    // Chaque porteur est éprouvé par son nom ET par ce qui le DÉFINIT. La première
    // rédaction de cette garde n'assertait que le nom : supprimer la définition de
    // `subScores` la laissait verte, le token survivant dans le bloc des champs
    // plus bas. Une garde satisfaite par une autre occurrence ne garde rien —
    // trouvé par la preuve par mutation, qui n'a servi qu'à ça.
    const definitions: Array<[string, string]> = [
      ['subScores', "sous-échelles propres à l'instrument"],
      ['dimensions', "découpage d'**affichage**"],
      ['scoresBesoins', "**mesure d'un besoin**"],
    ];
    for (const [cle, definition] of definitions) {
      expect(SYSTEM_PROMPT_GOUVERNANCE, `porteur ${cle} non nommé`).toContain(cle);
      expect(SYSTEM_PROMPT_GOUVERNANCE, `porteur ${cle} nommé mais non défini`).toContain(definition);
    }
    // La faute de v9 était d'annoncer un DÉNOMBREMENT (« sous deux clés »), et la
    // première v10 l'a refaite en écrivant « trois » alors qu'il y en a sept.
    // Interdire le seul littéral « deux » laissait passer sa reformulation :
    // mesuré, la mutation « ré-annoncer trois clés » ressortait VERTE. Le motif
    // couvre donc tous les dénombrements de cette forme, et la formule non
    // exhaustive est exigée en positif. Une garde textuelle ne fermera jamais une
    // classe SÉMANTIQUE — « les porteurs sont au nombre de trois » passerait
    // encore ; c'est assumé, pas ignoré.
    expect(SYSTEM_PROMPT_GOUVERNANCE, 'la consigne ré-annonce un dénombrement de porteurs')
      .not.toMatch(/sous (deux|trois|quatre|cinq|six|sept|huit) clés/);
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('sous plusieurs clés');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("d'autres existent");
  });

  it('nomme le couple total/max pour les TROIS porteurs, et récuse les faux dénominateurs', () => {
    // Régression introduite en réécrivant la règle générale : v9 nommait le couple
    // (« lis toujours un total contre le max qui l'accompagne ») ; une rédaction
    // intermédiaire de la v10 ne l'a plus nommé que pour `subScores` et a laissé
    // « le dénominateur du même bloc » pour les deux autres. Or c'est précisément
    // LÀ que la charge en offre plusieurs : une dimension SIIN porte
    // `{total: 4, max: 12, repondus: 6, items: 6}`. « 4 sur 6 » au lieu de « 4 sur
    // 12 » — 67 % au lieu de 33 %, dans le sens rassurant, sur l'instrument
    // alimentaire servi en production. Aucune garde ne couvrait ces deux clés.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('la valeur est **total**, son dénominateur est **max**');
    for (const compte of ['**items**', '**repondus**']) {
      expect(SYSTEM_PROMPT_GOUVERNANCE, `${compte} non récusé comme dénominateur`).toContain(compte);
    }
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('comptent des **questions**');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('vaut 4 sur 12, pas 4 sur 6');
  });

  it('la charge porte bien ces faux dénominateurs — sinon la règle vise un fantôme', () => {
    // Sur la DÉFINITION SIIN, jamais via le catalogue : drapeau éteint, `Q_ALI_01`
    // sert la forme courte, sans dimensions ni scoresBesoins.
    const reponses = Object.fromEntries(
      Q_ALI_01_SIIN_57.sections.flatMap(s =>
        s.questions.map(q => [q.id, Number((q.options ?? [])[0]?.v)] as const)
      )
    );
    const charge = scoresPourPrompt({
      ...(computeScoreFromDef as any)(Q_ALI_01_SIIN_57 as any, reponses),
      rawAnswers: reponses,
    }) as any;
    const dim = charge.dimensions.find((d: any) => d.id === 'DIVERSITE_VEGETALE');
    // Attendus écrits à la main. `items` et `max` DIVERGENT : c'est ce qui rend le
    // leurre atteignable. S'ils coïncidaient, la règle serait sans objet ici.
    expect(dim.total).toBe(4);
    expect(dim.max).toBe(12);
    expect(dim.items).toBe(6);
    expect(dim.repondus).toBe(6);
    expect(dim.items).not.toBe(dim.max);
    // Et le porteur besoin porte les mêmes champs.
    const besoin = charge.scoresBesoins.find((b: any) => b.id === 'RYTHME_CHRONO');
    expect(besoin.max).toBe(7);
    expect(besoin.items).toBe(4);
  });

  it('dimensions et scoresBesoins produisent des `total: null` PAR CONCEPTION', () => {
    // Pourquoi la règle du `total: null` ne peut pas être scopée à `subScores` :
    // la parade anti-zéro du moteur SIIN produit ces `null` délibérément, et sur
    // l'instrument allumé en production. Une passation à moitié remplie reproduit
    // le motif du second NO-GO — sous-scores `null` + total global comptant les
    // manquants pour zéro + bande la plus sévère.
    const toutes = Q_ALI_01_SIIN_57.sections.flatMap(s => s.questions);
    const moitie = Object.fromEntries(
      toutes.slice(0, Math.floor(toutes.length / 2)).map(q => [q.id, Number((q.options ?? [])[0]?.v)] as const)
    );
    const charge = scoresPourPrompt({
      ...(computeScoreFromDef as any)(Q_ALI_01_SIIN_57 as any, moitie),
      rawAnswers: moitie,
    }) as any;
    const dimNulles = charge.dimensions.filter((d: any) => d.total === null);
    const besoinsNuls = charge.scoresBesoins.filter((b: any) => b.total === null);
    expect(dimNulles.length, 'aucune dimension à null — le cas n’est plus exercé').toBeGreaterThan(0);
    expect(besoinsNuls.length, 'aucun besoin à null — le cas n’est plus exercé').toBeGreaterThan(0);
    // Et ces null coexistent avec un total global qui, lui, n'est PAS renormalisé.
    expect(typeof charge.total).toBe('number');
  });

  it('n’affirme plus que TOUT sous-score porte un max', () => {
    // Faux sur 3 des 66 (`Q_NEU_03`), et c'est l'affirmation qui autorisait le
    // modèle à fabriquer une proportion là où aucun dénominateur n'existe.
    expect(SYSTEM_PROMPT_GOUVERNANCE).not.toContain('Chaque sous-score porte **son propre total et son propre max**');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("n'invente aucun max");
  });

  it('dit qu’un total à null n’est PAS un zéro', () => {
    // La règle que la première rédaction de la v10 avait manquée, et qui lui a valu
    // un NO-GO : elle ordonnait de lire `total` contre `max` sans réserve, alors que
    // `Q_SOM_09` produit délibérément `total: null` pour un axe non couvert. Le
    // modèle aurait écrit « qualité de sommeil 0/25 » à côté d'un total de 100/100.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('**total à null**');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("n'a pas été mesuré");
    // Et cette règle porte sur les TROIS clés, pas sur `subScores` seul. Une
    // rédaction intermédiaire écrivait « sous subScores, total peut manquer » :
    // vrai, mais l'implicature disait le contraire des deux autres — or ce sont
    // `dimensions` et `scoresBesoins` qui produisent `total: null` PAR CONCEPTION
    // (parade anti-zéro du moteur SIIN), sur l'instrument servi en production.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('Sous **ces trois clés**, **total** peut manquer');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('vaut sous les **trois** clés');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('Ce n’est **pas** un zéro'.replace('’', "'"));
  });

  it('dit qu’un seuil à null vide atRisk de son sens', () => {
    // `atRisk` est initialisé à `false` et n'est calculé que si un seuil existe :
    // c'est une valeur par défaut, pas une conclusion. Sans cette règle, la consigne
    // érigeait en verdict un booléen qui vaut « rien à dire ».
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('**seuil peut valoir null**');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('par défaut et ne signifie rien');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("n'en conclus ni risque, ni absence de risque");
  });

  it('décrit chaque champ de subScores par la règle qui le rend sûr', () => {
    // Marqueurs sémantiques, pas des noms de champs seuls : `toContain('scaled')`
    // serait satisfait par la seule présence de `maxScaled`, et une consigne qui
    // nomme un champ sans dire comment le lire ne protège de rien.
    const regles: Array<[string, string]> = [
      ['rawTotal', 'avant pondération'],
      ['horsTotal', "n'entre pas"],
      ['atRisk', 'ne se recalcule pas depuis le total'],
      ['maxScaled', 'ne croise jamais les deux paires'],
      ['interpretation', 'jamais celle du questionnaire entier'],
    ];
    for (const [champ, regle] of regles) {
      expect(SYSTEM_PROMPT_GOUVERNANCE, `champ ${champ} non nommé`).toContain(champ);
      expect(SYSTEM_PROMPT_GOUVERNANCE, `règle de lecture de ${champ} absente`).toContain(regle);
    }
  });

  it('interdit de fabriquer un score global par addition, et n’en promet pas une non plus', () => {
    // Le Karasek n'a AUCUN total global. Sans cette règle, le modèle additionne ses
    // quatre sous-échelles et publie un score que l'instrument ne définit pas.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("N'en fabrique pas un en additionnant");
    // Et la contraposée de `horsTotal` est fermée : `Q_NEU_03` recoupe ses items
    // (`Q15_Q17` est déjà compté dans A et dans B) sans porter le drapeau.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("N'en conclus pas pour autant que les autres s'additionnent");
  });

  it('n’accorde pas l’autorité d’une source publiée à un axe maison', () => {
    // Plusieurs porteurs de `subScores` sont des découpages WellNeuro et non des
    // sous-échelles publiées (`Q_ALI_03`, `Q_MOD_01`, `Q_SOM_09`).
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("l'autorité d'une échelle publiée");
  });
});

describe('couplage consigne / charge — les champs décrits sont réellement livrés', () => {
  const ids = Object.keys(QUESTIONNAIRE_CATALOGUE);

  const releve = (() => {
    const emetteurs: Record<string, string[]> = { subScores: [], dimensions: [], scoresBesoins: [] };
    const porteurs = new Set<string>();
    const sansMax: string[] = [];
    const horsTotal: string[] = [];
    const sansTotalGlobal: string[] = [];
    const totalNul: string[] = [];
    const seuilNul: string[] = [];
    const sansOptions: string[] = [];
    const leves: string[] = [];
    const champs = new Set<string>();
    let sousScoresBalayes = 0;
    const ajouterPorteurs = (charge: any) => {
      for (const [cle, valeur] of Object.entries(charge ?? {})) {
        if (Array.isArray(valeur) && valeur.length && typeof valeur[0] === 'object' && valeur[0] !== null && 'id' in (valeur[0] as any)) {
          porteurs.add(cle);
        }
      }
    };
    // Sur la DÉFINITION SIIN, jamais via le catalogue : drapeau éteint, `Q_ALI_01`
    // sert la forme courte, qui ne porte ni `dimensions` ni `scoresBesoins`. Sans
    // ce passage, le recensement des porteurs dépendrait de la position du drapeau
    // — la cécité au drapeau, déjà trouvée trois fois dans cette campagne.
    {
      const reponses = Object.fromEntries(
        Q_ALI_01_SIIN_57.sections.flatMap(s => s.questions.map(q => [q.id, Number((q.options ?? [])[0]?.v)] as const))
      );
      ajouterPorteurs(scoresPourPrompt({ ...(computeScoreFromDef as any)(Q_ALI_01_SIIN_57 as any, reponses), rawAnswers: reponses }));
    }
    for (const id of ids) {
      // Détection de classe, sur l'ENTRÉE : une question à laquelle le remplissage
      // générique ne sait pas répondre reçoit `0`, ce qui n'est pas une passation
      // représentative. Le critère porte sur l'absence d'option NUMÉRIQUE, et non
      // sur l'absence d'options : `Q_GAS_02` a des `select` à `v: "oui"/"non"` et
      // n'entrait dans la liste que par ses questions `number` — vert pour une
      // mauvaise raison, et un instrument fait de tels selects seuls y aurait
      // échappé entièrement.
      const questions = questionsDe(id);
      const nonRemplissable = !questions.length
        || questions.some(q => !(q.options ?? []).map(o => Number(o.v)).filter(Number.isFinite).length);
      if (nonRemplissable) sansOptions.push(id);
      let charge: any;
      try {
        const reponses = reponsesPour(id);
        charge = scoresPourPrompt({ ...(calculateScore as any)(id, reponses), rawAnswers: reponses });
      } catch (e) {
        // Jamais un `continue` muet : un moteur qui lève ferait disparaître son
        // instrument de `porteurs`, `champs` et `emetteurs` sans un bruit — la
        // forme même de l'angle mort que ce fichier existe pour fermer.
        leves.push(`${id}: ${(e as Error)?.message ?? e}`);
        continue;
      }
      ajouterPorteurs(charge);
      for (const cle of ['subScores', 'dimensions', 'scoresBesoins'] as const) {
        if (Array.isArray(charge?.[cle]) && charge[cle].length) emetteurs[cle].push(id);
      }
      const subs = charge?.subScores;
      if (!Array.isArray(subs) || !subs.length) continue;
      if (charge.total === undefined || charge.total === null) sansTotalGlobal.push(id);
      for (const s of subs) {
        sousScoresBalayes++;
        Object.keys(s).forEach(c => champs.add(c));
        if (!('max' in s)) sansMax.push(`${id}/${s.id}`);
        if (s.horsTotal === true) horsTotal.push(`${id}/${s.id}`);
        if (s.total === null) totalNul.push(`${id}/${s.id}`);
        if ('seuil' in s && s.seuil === null) seuilNul.push(`${id}/${s.id}`);
      }
    }
    return { emetteurs, porteurs, sansMax, horsTotal, sansTotalGlobal, totalNul, seuilNul, sansOptions, leves, champs, sousScoresBalayes };
  })();

  it('aucun instrument n’est avalé par une exception de moteur', () => {
    expect(releve.leves, `moteur(s) en erreur, donc absent(s) du relevé : ${releve.leves.join(' | ')}`).toEqual([]);
  });

  it('aucun angle mort silencieux : tout remplissage non représentatif est déclaré', () => {
    // LA garde de méthode. C'est son absence qui a laissé `Q_SOM_09` — et avec lui
    // le seul contre-exemple à la règle écrite — sortir du recensement sans bruit.
    // Un premier essai s'adossait à `scored === false` : trop étroit, seul le moteur
    // `agenda_sommeil` émet ce champ. Le critère porte donc sur l'ENTRÉE.
    expect(
      releve.sansOptions.slice().sort(),
      'instrument(s) dont le remplissage générique n’est pas représentatif : les déclarer dans REMPLISSAGE_NON_REPRESENTATIF, avec une fixture si le relevé doit les couvrir',
    ).toEqual(Object.keys(REMPLISSAGE_NON_REPRESENTATIF).sort());
  });

  it('les SEPT porteurs de découpages sont épinglés par nom', () => {
    // La v9 annonçait deux clés, une première v10 en annonçait trois : les deux
    // dénombrements étaient faux. Un huitième porteur doit rougir, pas passer.
    expect([...releve.porteurs].sort()).toEqual(PORTEURS_ATTENDUS);
  });

  it('les 19 émetteurs de subScores sont épinglés par identifiant, pas par compte', () => {
    // Un compte ne voit pas une substitution : un instrument qui cesse d'émettre et
    // un autre qui commence laisseraient `toBe(17)` vert — soit exactement la
    // disparition silencieuse que ce fichier existe pour rendre bruyante.
    expect(releve.emetteurs.subScores.slice().sort()).toEqual(EMETTEURS_SUBSCORES);
  });

  it('les instruments déclarés sans sous-scores n’en émettent réellement aucun', () => {
    // Anti-tautologie de la garde ci-dessus : sans ce contrôle, `SANS_SOUS_SCORES`
    // serait une trappe où l'on ferait disparaître n'importe quel gêneur.
    for (const id of SANS_SOUS_SCORES) {
      const charge = chargePour(id);
      expect(charge?.subScores ?? [], `${id} émet des sous-scores : il ne peut pas être déclaré sans`).toEqual([]);
    }
  });

  it('balaye réellement le catalogue — anti-vacuité', () => {
    expect(ids.length).toBeGreaterThanOrEqual(60);
    // 66 jusqu'au 2026-07-30 ; +23 avec les quinze échelles du QLQ-C30 et les huit
    // du QLQ-BR23, qui remplacent deux sommes brutes ; +5 le 2026-07-31 avec les
    // cinq sous-échelles du MFI-20 reconstruit, −5 le même jour avec celles de
    // `Q_ALI_03`, qui quitte `subscore` pour deux apports pondérés.
    expect(releve.sousScoresBalayes, 'aucun sous-score balayé').toBe(89);
  });

  it('aucun total à null n’apparaît sur une passation SATURÉE', () => {
    // Le pendant du relevé : à saturation, tout est renseigné, donc rien ne doit
    // être `null`. Un nouveau producteur de `null` sous saturation signalerait un
    // moteur qui rend « non mesuré » pour une passation complète — à comprendre
    // avant de l'admettre. Les producteurs légitimes sont exercés ci-dessous, sur
    // des passations volontairement incomplètes.
    expect(releve.totalNul).toEqual([]);
  });

  it('subScores est bien le porteur dominant — la raison même de le décrire', () => {
    expect(
      releve.emetteurs.subScores.length,
      'subScores n’est plus dominant : relire la hiérarchie que la consigne installe',
    ).toBeGreaterThan(releve.emetteurs.dimensions.length + releve.emetteurs.scoresBesoins.length);
  });

  it('aucun champ livré n’échappe à la consigne', () => {
    // La garde qui rend le lot durable : elle vieillit avec le moteur. Un champ neuf
    // sous `subScores` arrive au modèle sans mode d'emploi tant qu'il n'est pas
    // décrit — c'est exactement ce qui est arrivé au porteur `subScores` lui-même.
    // Marqueur `**champ**`, jamais le mot nu : la consigne fait 12 000 caractères et
    // contient « valeur », « valoir », « sous-scores », si bien qu'un test de
    // sous-chaîne déclarerait décrits des champs nommés `val`, `items` ou `score`
    // qu'elle n'évoque nulle part. Relevé en revue — la garde passait pour une
    // mauvaise raison, comme celle du porteur `subScores` avant elle.
    const nonDecrits = [...releve.champs]
      .filter(c => !CHAMPS_EVIDENTS.has(c))
      .filter(c => !SYSTEM_PROMPT_GOUVERNANCE.includes(`**${c}**`))
      .sort();
    expect(
      nonDecrits,
      `champ(s) livré(s) au modèle mais absent(s) de la consigne : ${nonDecrits.join(', ')}`,
    ).toEqual([]);
  });

  it('des sous-scores SANS max existent — sinon la règle « n’invente aucun max » est morte', () => {
    expect(releve.sansMax).toEqual(['Q_NEU_03/A', 'Q_NEU_03/B', 'Q_NEU_03/Q15_Q17']);
  });

  it('un total à null existe réellement, et le total global l’exclut', () => {
    // Le contre-exemple que la première méthode de mesure ne voyait pas.
    const agenda = chargePour('Q_SOM_09', { ...FIXTURES.Q_SOM_09, AGD_QUAL_MOY: null });
    const qual = agenda.subScores.find((s: any) => s.id === 'QUAL');
    expect(qual.total).toBeNull();
    expect(qual.max).toBe(25);
    // Attendus écrits à la main : le global est RENORMALISÉ sur les axes couverts,
    // il ne compte pas l'axe manquant comme un 0. C'est précisément ce que la
    // consigne doit empêcher le modèle de défaire.
    expect(agenda.total).toBe(100);
    expect(agenda.maxTotal).toBe(100);
  });

  it('les deux régimes de total global décrits par la consigne existent réellement', () => {
    // Le second NO-GO de v10. La correction du premier avait ajouté « le total
    // global a déjà été calculé sans lui » : vrai de `Q_SOM_09`, FAUX de
    // `Q_MOD_03`, qui comptait alors les axes manquants pour zéro. v10 avait donc
    // fini par décrire TROIS régimes, dont un — « il le compte pour zéro » — que
    // le lot du 2026-07-29 a fermé sur les neuf moteurs qui le portaient encore.
    //
    // v11 n'en décrit plus que deux, et ce test les tient tous les deux : sans
    // lui, la consigne pourrait décrire une chute qui n'a pas lieu, ou taire une
    // renormalisation qui, elle, a bien lieu.
    //
    // Régime 1 — le total TOMBE avec l'axe. Trois plaintes sur sept à 8/10 :
    const items = questionsDe('Q_MOD_03').map(q => q.id);
    const partiel = Object.fromEntries(items.slice(0, 3).map(i => [i, 8]));
    const c = chargePour('Q_MOD_03', partiel);
    const par = Object.fromEntries(c.subScores.map((s: any) => [s.id, s.total]));
    // Attendus écrits à la main — les identifiants de sous-scores ne sont PAS ceux
    // des questions. Trois axes mesurés au même niveau…
    expect(items.length).toBe(7);
    expect([par.fatigue, par.douleurs, par.digestion]).toEqual([8, 8, 8]);
    // …quatre non mesurés, correctement rendus `null`…
    expect(c.subScores.filter((s: any) => s.total === null).map((s: any) => s.id))
      .toEqual(['surpoids', 'sommeil', 'moral', 'mobilite']);
    // …et le total global TOMBE avec eux. Jusqu'au 2026-07-29, il valait 24 sur
    // un dénominateur de 70 inchangé : un nombre juste sur un dénominateur faux,
    // que le modèle ne pouvait pas distinguer d'un patient peu plaintif.
    expect(c.total).toBeNull();
    expect(c.maxTotal).toBe(70);
    // La moyenne était contaminée de la même façon — 24/7 et non 24/3 — et elle
    // est SERVIE au modèle. Elle tombe avec le total : une moyenne dont le
    // numérateur n'existe plus n'a pas de valeur de repli.
    expect(c.average).toBeNull();
    // Et la moyenne 3,4 ne tombe dans AUCUNE plage : les bandes de cet instrument
    // sont bornées sur des entiers ([1-3], [4-6], [7-8], [9-10]) alors que la valeur
    // servie porte une décimale. Jusqu'au 2026-07-29, le moteur repliait alors sur
    // la dernière bande, et ces deux lignes attendaient « Intensité très élevée »
    // (danger) — le pire niveau de l'instrument, pour trois plaintes sur sept.
    //
    // Le repli est retiré : plus de bande fausse, donc plus de bande du tout. La
    // grille reste à refaire contiguë au dixième — c'est une décision de seuil
    // clinique, elle ne se prend pas dans un lot de code.
    expect(c.interpretation).toBeNull();

    // Régime 2 — le total est RENORMALISÉ sur les axes couverts, et l'instrument
    // le dit : un dénominateur qui ne dépend pas du nombre d'axes, et un compte
    // d'axes couverts servi à côté. Sans cette réserve, « le total tombe avec
    // l'axe » serait faux de l'agenda du sommeil — c'est ce contre-exemple qui a
    // fait réécrire la première rédaction de v11.
    const agenda = chargePour('Q_SOM_09', { ...FIXTURES.Q_SOM_09, AGD_QUAL_MOY: null });
    expect(agenda.subScores.find((s: any) => s.id === 'QUAL').total).toBeNull();
    expect(agenda.total).toBe(100);
    expect(agenda.maxTotal).toBe(100);
    // Trois axes couverts sur les QUATRE de l'agenda (Durée, Efficacité,
    // Régularité, Qualité vécue) — c'est aussi le minimum sous lequel il cesse
    // de scorer, ce qui rend le compte d'autant plus nécessaire à côté du 100.
    expect(agenda.nbAxesCouverts).toBe(3);

    // Régime 3 — le total est servi NON NUL à côté d'un axe à null, et sans
    // compte d'axes couverts. Le découpage n'entre pas dans le total, mais ses
    // items y entrent et y comptent pour ZÉRO : le total est incomplet et tiré
    // vers le bas. C'est le régime que la première rédaction de v11 avait effacé
    // de la consigne, en croyant le lot du 2026-07-29 l'avoir fermé — il ne l'a
    // fermé que là où l'axe CONTRIBUE au total. Deux items de `Q_CAR_01` sur
    // vingt-cinq points rendent « Risque faible », en vert.
    const carItems = questionsDe('Q_CAR_01').map(q => q.id);
    const car = chargePour('Q_CAR_01', Object.fromEntries(carItems.slice(0, 2).map(i => [i, 1])));
    expect(car.dimensions.find((d: any) => d.id === 'PERSO').total).toBeNull();
    expect(car.dimensions.find((d: any) => d.id === 'VIE').total).toBeNull();
    expect(car.total).toBe(2);
    expect(car.maxTotal).toBe(25);
    // La BANDE, elle, ne part plus : cette ligne attendait « Risque faible »
    // jusqu'à la garde de complétude du moteur `sum`. Le régime 3 subsiste
    // entier — un total non nul, servi à côté d'axes à `null`, sans compte
    // d'axes couverts, et c'est bien pour lui que la consigne met en garde —
    // mais il ne s'accompagne plus du verdict vert qui le faisait lire comme
    // une mesure. La mise en garde reste donc nécessaire : le NOMBRE arrive
    // toujours au modèle, et c'est le nombre qui est incomplet.
    expect(car.interpretation).toBeNull();
    expect(car.missing).toBe(carItems.length - 2);
    expect(car.nbAxesCouverts).toBeUndefined();
  });

  it('la consigne décrit les TROIS régimes de total global, pas deux', () => {
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('Le total vaut null lui aussi');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('Le total est renormalisé');
    // Le troisième régime, celui que la première rédaction de v11 avait effacé.
    // Sans cette mise en garde, la seule règle décrivant un total non nul à côté
    // d'un axe à null est celle de la renormalisation — qui se conclut par « ce
    // total-là est utilisable ». Le modèle lirait « Risque faible » sur deux
    // items de vingt-cinq points comme une mesure.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('Le total est servi non nul, sans compte d’axes couverts'.replace('’', "'"));
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('Présente-le comme **incomplet**');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('ne fonde aucune conclusion de gravité là-dessus');
    // Le régime fermé par le lot du 2026-07-29 ne doit plus être décrit comme un
    // comportement des axes CONTRIBUTEURS : le décrire inviterait le modèle à se
    // défier d'un total qui ne lui arrive plus, et à en reconstruire un.
    expect(SYSTEM_PROMPT_GOUVERNANCE).not.toContain('ou le compte pour zéro');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("ni en comptant l'axe manquant pour zéro");
    // La mise en garde couvre aussi la MOYENNE : `Q_MOD_03` en sert une, qui
    // tombait avec son total (24/7 et non 24/3), et c'est le nombre le plus
    // citable de sa charge.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('toute moyenne servie à côté de lui');
    // Et surtout, elle ne doit pas RASSURER : c'est la phrase du second NO-GO.
    expect(SYSTEM_PROMPT_GOUVERNANCE).not.toContain('a déjà été calculé sans lui');
  });

  it('la consigne dit comment lire un booléen à null, et distingue les deux absences de total', () => {
    // Neuf moteurs émettent désormais des drapeaux à `null` là où ils rendaient
    // `false` — dont `suicidalIdeation`, que la source assortit d'une
    // appréciation clinique immédiate. Rien dans la consigne ne disait comment
    // lire un `null` à cette place : `false` et `null` s'y lisaient « non ».
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('booléen à null');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("Ce n'est **pas** « non »");
    // Et la réserve nommée à la clôture du lot précédent : `total` ABSENT (un
    // instrument sans score global) ne se dit pas comme `total` à `null` (un
    // score global qui n'a pas pu être établi).
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("n'a pas pu être établi sur cette passation");
  });

  it('un seuil à null existe réellement, et atRisk y vaut false sans rien vouloir dire', () => {
    expect(releve.seuilNul).toEqual(['Q_STR_06/REC']);
    const rec = chargePour('Q_STR_06').subScores.find((s: any) => s.id === 'REC');
    expect(rec.seuil).toBeNull();
    expect(rec.atRisk).toBe(false);
    expect(rec.seuilLabel).toBe('Pas de seuil source');
  });

  it('atRisk ne part plus à vrai sur une donnée absente — défaut fermé', () => {
    // Ce test a rougi deux fois de suite, à dessein. Il épinglait d'abord la
    // passation VIDE (« pour qu'un correctif futur du moteur le fasse rougir en
    // connaissance de cause ») ; #451 a fermé ce cas-là et l'a réépinglé sur le
    // cas PARTIEL, en annonçant qu'il ferait rougir le lot suivant. C'est ce lot.
    const vide = chargePour('Q_STR_06', {});
    expect(vide.scored).toBe(false);
    expect(vide.subScores).toBeUndefined();

    // Passation où SEULE la sous-échelle « demande » est renseignée. Les trois
    // autres valaient 0, leurs seuils « faible si < X » se déclenchaient, et
    // l'instrument rendait « Iso-Strain — risque burnout élevé » : son libellé le
    // plus grave, sur trois sous-échelles sans une seule donnée.
    const demSeule = chargePour('Q_STR_06', Object.fromEntries(
      (QUESTIONNAIRE_CATALOGUE as any).Q_STR_06.scoring.subScores
        .find((s: any) => s.id === 'DEM').items.map((i: string) => [i, 4]),
    ));
    const par = Object.fromEntries(demSeule.subScores.map((s: any) => [s.id, s]));

    // L'axe MESURÉ garde tout : son total, son seuil, et son verdict de risque.
    expect(par.DEM.total).toBe(33);
    expect(par.DEM.atRisk).toBe(true);

    // Les axes NON mesurés ne valent plus zéro, et ne déclenchent plus rien.
    // Depuis le lot des drapeaux (2026-07-29), leur `atRisk` vaut `null` : un
    // `false` y affirmait « pas à risque » sur une question jamais posée. `REC`
    // reste à `false` — il ne publie aucun seuil, cas que la consigne décrit.
    for (const id of ['LAT', 'SOU']) {
      expect(par[id].total, `${id} devrait être non mesuré`).toBeNull();
      expect(par[id].atRisk, `${id} ne peut pas être « à risque » sans donnée`).toBeNull();
    }
    expect(par.REC.total).toBeNull();
    expect(par.REC.atRisk, 'REC ne publie aucun seuil : false par défaut').toBe(false);

    // Et le verdict composite ne se déduit plus de deux absences : il reste celui
    // du seul axe mesuré, pas l'Iso-Strain.
    expect(demSeule.interpretation.label).toBe('Forte demande psychologique');
    expect(demSeule.jobStrain, 'indéterminé, jamais faux : LAT n’est pas jugeable').toBeNull();
    expect(demSeule.isoStrain).toBeNull();
  });

  it('horsTotal existe, et exclut réellement le sous-score du total global', () => {
    expect(releve.horsTotal).toEqual(['Q_URO_01/QdV']);
    const uro = chargePour('Q_URO_01');
    const ipss = uro.subScores.find((s: any) => s.id === 'IPSS');
    const qdv = uro.subScores.find((s: any) => s.id === 'QdV');
    // Attendus écrits à la main. Le total global vaut l'IPSS SEUL : si `horsTotal`
    // cessait d'être honoré, il vaudrait 41 et cette assertion tomberait.
    expect(ipss.total).toBe(35);
    expect(qdv.total).toBe(6);
    expect(uro.total).toBe(35);
  });

  it('les sous-scores ne sont pas additifs même sans horsTotal', () => {
    // `Q_NEU_03` : `Q15_Q17` est un score corrigé, déjà compté dans A et dans B, et
    // il ne porte AUCUN drapeau. La contraposée de `horsTotal` est donc fausse —
    // d'où la phrase ajoutée à la consigne.
    const neu = chargePour('Q_NEU_03');
    const par = Object.fromEntries(neu.subScores.map((s: any) => [s.id, s.total]));
    expect(par.A).toBe(50);
    expect(par.B).toBe(24);
    expect(par.Q15_Q17).toBe(2);
    expect(neu.total).toBe(74);
  });

  it('rawTotal diverge de total, et le lire contre le seuil INVERSE le verdict', () => {
    // Le cas qui justifie à lui seul la règle : sur la latitude décisionnelle du
    // Karasek, `total` est la valeur pondérée et `rawTotal` la somme brute. Le
    // seuil de l'instrument porte sur la pondérée. 78 ≥ 72 (pas à risque), mais
    // 30 < 72 : un modèle qui rapporte `rawTotal` conclut à une latitude
    // décisionnelle basse pour un patient qui n'en a pas.
    const lat = chargePour('Q_STR_06').subScores.find((s: any) => s.id === 'LAT');
    expect(lat.total).toBe(78);
    expect(lat.rawTotal).toBe(30);
    expect(lat.seuil).toBe(72);
    expect(lat.atRisk).toBe(false);
  });

  it('un questionnaire à sous-scores peut n’avoir AUCUN total global', () => {
    // Quatre désormais, et trois le sont par CONSTRUCTION. Le manuel EORTC ne
    // définit aucun score global d'instrument, seulement des échelles 0-100 : la
    // somme brute que WellNeuro rendait à leur place — 28→112 pour le C30, 23→92
    // pour le BR23 — était une mesure fabriquée, avec pour le BR23 une bande de
    // tête inatteignable. Le MFI-20 rejoint la liste le 2026-07-31, pour la même
    // raison dite par sa propre source : « Il n'y a pas de barème
    // interprétation », et elle ne totalise jamais ses cinq sous-échelles. Il est
    // le premier à le déclarer explicitement, par `scoring.sansTotalGlobal` —
    // les deux EORTC l'obtiennent de leur moteur dédié. Ne pas rendre de total
    // est ici la correction, pas une lacune.
    //
    // CINQ depuis le 2026-08-01 : `Q_PED_02` rejoint la liste avec sa
    // débaptisation, et pour une raison qui ne tient pas à sa source mais à
    // l'absence de source — aucune ne donne de sens à un /84 sur cette grille.
    // Le moteur en rendait un, qui partait en `scorePrincipal` et s'affichait
    // « Score brut » au Fil sans dénominateur ni bande. C'est ce test qui observe
    // ce que le modèle de synthèse reçoit réellement.
    expect(releve.sansTotalGlobal.slice().sort())
      .toEqual(['Q_CAN_01', 'Q_CAN_02', 'Q_PED_02', 'Q_SOM_07', 'Q_STR_06']);
  });
});
