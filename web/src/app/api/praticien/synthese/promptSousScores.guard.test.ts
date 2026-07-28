import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { scoresPourPrompt } from '@/lib/scoring/scoresPourPrompt';
import { SYSTEM_PROMPT_GOUVERNANCE } from '@/lib/anthropic';

// Résiduel documenté à la clôture de #437. La consigne `synthese-v9` décrivait
// DEUX porteurs de sous-scores — `dimensions` et `scoresBesoins` — et laissait le
// troisième, `subScores`, sans un mot. Mesuré avant d'écrire la v10, et c'est
// l'inverse d'un détail : `subScores` est le porteur DOMINANT (16 instruments du
// catalogue, 62 sous-scores), et en base **30 passations sur 76** le portent contre
// **0** pour les deux autres. La consigne décrivait donc les deux clés qu'aucune
// passation enregistrée ne porte, et se taisait sur celle qu'elles portent toutes.
//
// Ce fichier tient les deux sens du couplage :
//   · la consigne nomme les trois porteurs et les champs propres à `subScores` ;
//   · ces champs existent RÉELLEMENT dans la charge livrée — sinon la consigne
//     décrit un fantôme, et un fantôme s'enlève sans que rien ne rougisse.
//
// Les valeurs attendues sont ÉCRITES À LA MAIN, jamais dérivées du champ testé :
// un attendu recalculé depuis le moteur bouge avec lui et ne prouve rien. C'est la
// leçon déjà inscrite dans `promptAlimentaire.guard.test.ts`.

function questionsDe(id: string): Array<{ id: string; options?: Array<{ v: unknown }> }> {
  const def = (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[id];
  return (def?.sections ?? []).flatMap((s: any) => s.questions ?? []);
}

/** Réponses saturées à la borne haute — même patron que les gardes voisines. */
function reponsesAuMax(id: string): Record<string, number> {
  return Object.fromEntries(
    questionsDe(id).map(q => {
      const valeurs = (q.options ?? []).map(o => Number(o.v)).filter(Number.isFinite);
      return [q.id, valeurs.length ? Math.max(...valeurs) : 0];
    })
  );
}

/** La charge RÉELLEMENT transmise au modèle, pas le retour nu du moteur. */
function chargePour(id: string): any {
  const reponses = reponsesAuMax(id);
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
      ['subScores', "sous-échelles de l'instrument lui-même"],
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
    // Faux sur 3 des 62 (`Q_NEU_03`), et c'est l'affirmation qui autorisait le
    // modèle à fabriquer une proportion là où aucun dénominateur n'existe.
    expect(SYSTEM_PROMPT_GOUVERNANCE).not.toContain('Chaque sous-score porte **son propre total et son propre max**');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("n'invente aucun max");
  });

  it('décrit chaque champ de subScores par la règle qui le rend sûr', () => {
    // Marqueurs sémantiques, pas des noms de champs seuls : `toContain('scaled')`
    // serait satisfait par la seule présence de `maxScaled`, et une consigne qui
    // nomme un champ sans dire comment le lire ne protège de rien.
    const regles: Array<[string, string]> = [
      ['rawTotal', 'avant pondération'],
      ['horsTotal', "n'entre pas"],
      ['atRisk', 'ne le recalcule pas'],
      ['maxScaled', 'ne croise jamais les deux paires'],
      ['interpretation', 'jamais celle du questionnaire entier'],
    ];
    for (const [champ, regle] of regles) {
      expect(SYSTEM_PROMPT_GOUVERNANCE, `champ ${champ} non nommé`).toContain(champ);
      expect(SYSTEM_PROMPT_GOUVERNANCE, `règle de lecture de ${champ} absente`).toContain(regle);
    }
  });

  it('interdit de fabriquer un score global par addition', () => {
    // Le Karasek n'a AUCUN total global. Sans cette règle, le modèle additionne
    // ses quatre sous-échelles et publie un score que l'instrument ne définit pas.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("N'en fabrique pas un en additionnant");
  });
});

describe('couplage consigne / charge — les champs décrits sont réellement livrés', () => {
  const ids = Object.keys(QUESTIONNAIRE_CATALOGUE);

  const releve = (() => {
    const emetteurs: Record<string, string[]> = { subScores: [], dimensions: [], scoresBesoins: [] };
    const sansMax: string[] = [];
    const horsTotal: string[] = [];
    const sansTotalGlobal: string[] = [];
    let sousScoresBalayes = 0;
    for (const id of ids) {
      let charge: any;
      try {
        charge = chargePour(id);
      } catch {
        continue;
      }
      for (const cle of ['subScores', 'dimensions', 'scoresBesoins'] as const) {
        if (Array.isArray(charge?.[cle]) && charge[cle].length) emetteurs[cle].push(id);
      }
      const subs = charge?.subScores;
      if (!Array.isArray(subs) || !subs.length) continue;
      if (charge.total === undefined || charge.total === null) sansTotalGlobal.push(id);
      for (const s of subs) {
        sousScoresBalayes++;
        if (!('max' in s)) sansMax.push(`${id}/${s.id}`);
        if (s.horsTotal === true) horsTotal.push(`${id}/${s.id}`);
      }
    }
    return { emetteurs, sansMax, horsTotal, sansTotalGlobal, sousScoresBalayes };
  })();

  it('balaye réellement le catalogue — anti-vacuité', () => {
    // Sans cette assertion, un `catch` trop large viderait le relevé et toutes
    // les assertions « au moins un » ci-dessous deviendraient inexplicables.
    expect(ids.length).toBeGreaterThanOrEqual(60);
    expect(releve.sousScoresBalayes, 'aucun sous-score balayé').toBeGreaterThanOrEqual(60);
  });

  it('subScores est bien le porteur dominant — la raison même de le décrire', () => {
    expect(releve.emetteurs.subScores.length).toBeGreaterThanOrEqual(16);
    expect(
      releve.emetteurs.subScores.length,
      'subScores n’est plus dominant : relire la hiérarchie que la consigne installe',
    ).toBeGreaterThan(releve.emetteurs.dimensions.length + releve.emetteurs.scoresBesoins.length);
  });

  it('des sous-scores SANS max existent — sinon la règle « n’invente aucun max » est morte', () => {
    expect(releve.sansMax).toEqual(['Q_NEU_03/A', 'Q_NEU_03/B', 'Q_NEU_03/Q15_Q17']);
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
    expect(uro.total).not.toBe(ipss.total + qdv.total);
  });

  it('rawTotal diverge de total, et le lire contre le seuil INVERSE le verdict', () => {
    // Le cas qui justifie à lui seul la règle : sur la latitude décisionnelle du
    // Karasek, `total` est la valeur pondérée et `rawTotal` la somme brute. Le
    // seuil de l'instrument porte sur la pondérée.
    const lat = chargePour('Q_STR_06').subScores.find((s: any) => s.id === 'LAT');
    expect(lat.total).toBe(78);
    expect(lat.rawTotal).toBe(30);
    expect(lat.seuil).toBe(72);
    expect(lat.atRisk).toBe(false);
    // La démonstration de l'inversion, écrite comme telle : le score franchit le
    // seuil, le total intermédiaire non. Un modèle qui rapporte `rawTotal` conclut
    // à une latitude décisionnelle basse pour un patient qui n'en a pas.
    expect(lat.total >= lat.seuil).toBe(true);
    expect(lat.rawTotal < lat.seuil).toBe(true);
  });

  it('un questionnaire à sous-scores peut n’avoir AUCUN total global', () => {
    expect(releve.sansTotalGlobal).toEqual(['Q_STR_06']);
  });
});
