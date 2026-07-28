import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { scoresPourPrompt } from '@/lib/scoring/scoresPourPrompt';
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

/** La charge RÉELLEMENT transmise au modèle, pas le retour nu du moteur. */
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
    // L'affirmation fausse de v9, épinglée : elle annonçait un dénombrement.
    expect(SYSTEM_PROMPT_GOUVERNANCE).not.toContain('sous deux clés');
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
    const sansMax: string[] = [];
    const horsTotal: string[] = [];
    const sansTotalGlobal: string[] = [];
    const totalNul: string[] = [];
    const seuilNul: string[] = [];
    const nonScores: string[] = [];
    const champs = new Set<string>();
    let sousScoresBalayes = 0;
    for (const id of ids) {
      let scores: any;
      let charge: any;
      try {
        const reponses = reponsesPour(id);
        scores = (calculateScore as any)(id, reponses);
        charge = scoresPourPrompt({ ...scores, rawAnswers: reponses });
      } catch {
        nonScores.push(id);
        continue;
      }
      if (scores?.scored === false) nonScores.push(id);
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
    return { emetteurs, sansMax, horsTotal, sansTotalGlobal, totalNul, seuilNul, nonScores, champs, sousScoresBalayes };
  })();

  it('aucun angle mort silencieux : tout instrument non scoré est déclaré', () => {
    // LA garde de méthode. C'est son absence qui a laissé `Q_SOM_09` — et avec lui
    // le seul contre-exemple à la règle écrite — sortir du recensement sans bruit.
    // Un instrument que le remplissage générique ne sait pas atteindre doit être
    // soit doté d'une fixture, soit déclaré comme n'émettant aucun sous-score.
    const inconnus = releve.nonScores.filter(id => !SANS_SOUS_SCORES.includes(id));
    expect(
      inconnus,
      `non scoré(s) et non déclaré(s) : ${inconnus.join(', ')} — ajouter une fixture dans FIXTURES, ou les déclarer dans SANS_SOUS_SCORES après avoir VÉRIFIÉ qu'ils n'émettent aucun sous-score`,
    ).toEqual([]);
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
    expect(releve.sousScoresBalayes, 'aucun sous-score balayé').toBe(66);
    expect(releve.emetteurs.subScores.length).toBe(17);
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
    const nonDecrits = [...releve.champs]
      .filter(c => !CHAMPS_EVIDENTS.has(c))
      .filter(c => !SYSTEM_PROMPT_GOUVERNANCE.includes(c))
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

  it('un seuil à null existe réellement, et atRisk y vaut false sans rien vouloir dire', () => {
    expect(releve.seuilNul).toEqual(['Q_STR_06/REC']);
    const rec = chargePour('Q_STR_06').subScores.find((s: any) => s.id === 'REC');
    expect(rec.seuil).toBeNull();
    expect(rec.atRisk).toBe(false);
    expect(rec.seuilLabel).toBe('Pas de seuil source');
  });

  it('atRisk part à vrai sur une donnée ABSENTE — le défaut que la règle doit contenir', () => {
    // Passation vide : chaque sous-échelle tombe à 0, et les seuils « faible si < X »
    // se déclenchent. `atRisk` n'est donc pas seulement muet quand le seuil manque,
    // il est ACTIVEMENT faux quand la donnée manque. Épinglé pour qu'un correctif
    // futur du moteur fasse rougir ce test en connaissance de cause.
    const vide = chargePour('Q_STR_06', {});
    const par = Object.fromEntries(vide.subScores.map((s: any) => [s.id, s]));
    expect(par.LAT.total).toBe(0);
    expect(par.LAT.atRisk).toBe(true);
    expect(par.SOU.atRisk).toBe(true);
    expect(par.DEM.atRisk).toBe(false);
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
    expect(releve.sansTotalGlobal).toEqual(['Q_STR_06']);
  });
});
