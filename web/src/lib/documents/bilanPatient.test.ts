import { describe, expect, it } from 'vitest';
import type { SyntheseSchema } from '@/lib/anthropic';
import { MODELE_REDACTION_PRATICIEN } from '@/lib/synthese-praticien';
import { NARRATIF_ABSENT, projeterBilanPatient, whereEnvoiVisible } from './bilanPatient';

function synthese(): SyntheseSchema {
  return {
    resume_praticien: 'Résumé réservé au praticien',
    axes_prioritaires: [
      { axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['réveils'], points_a_confirmer: ['ferritine'] },
    ],
    points_de_vigilance: ['fatigue'],
    questions_entretien: ['Depuis quand ?'],
    narratif_patient: 'Vos réponses évoquent un sommeil fragmenté.',
    limites: 'À valider.',
  };
}

const TRANSMIS_LE = new Date('2026-07-18T09:30:00.000Z');

function projeter(over: Partial<Parameters<typeof projeterBilanPatient>[0]> = {}) {
  return projeterBilanPatient({
    syntheseJson: synthese(),
    notesPraticien: 'Note pour vous',
    modele: 'claude-opus-5',
    transmisLe: TRANSMIS_LE,
    ...over,
  });
}

describe('projeterBilanPatient', () => {
  it('sert le narratif, la note et la date de transmission', () => {
    const bilan = projeter();
    expect(bilan.narratif).toBe('Vos réponses évoquent un sommeil fragmenté.');
    expect(bilan.notePraticien).toBe('Note pour vous');
    expect(bilan.transmisLe).toBe('2026-07-18T09:30:00.000Z');
  });

  it('attribue honnêtement au praticien un bilan issu d’un brouillon manuel', () => {
    expect(projeter({ modele: MODELE_REDACTION_PRATICIEN }).mentionPreparation).toBe(
      'Document rédigé et validé par votre praticien.',
    );
    expect(projeter().mentionPreparation).toContain('assistance d’intelligence artificielle');
  });

  it('rend une phrase d’attente plutôt qu’un écran vide sur un narratif absent', () => {
    const s: SyntheseSchema = { ...synthese(), narratif_patient: '   ' };
    expect(projeter({ syntheseJson: s }).narratif).toBe(NARRATIF_ABSENT);
  });

  it('distingue une note vide d’une note absente', () => {
    expect(projeter({ notesPraticien: null }).notePraticien).toBeNull();
    expect(projeter({ notesPraticien: '   ' }).notePraticien).toBeNull();
  });

  it('accepte un JSONB difforme sans jeter — le patient voit la phrase d’attente', () => {
    const bilan = projeter({ syntheseJson: { pas: 'une synthèse' } });
    expect(bilan.narratif).toBe(NARRATIF_ABSENT);
    expect(bilan.notePraticien).toBe('Note pour vous');
  });

  // ---------------------------------------------------------------------
  // Le field-filter, tenu sur la PROJECTION SÉRIALISÉE et non sur des champs
  // nommés : c'est ce que la route enverra au navigateur du patient. Un champ
  // ajouté par distraction ferait échouer ces tests, pas seulement une lecture
  // explicite de `axes_prioritaires`.
  // ---------------------------------------------------------------------

  it('ne laisse fuir ni les axes, ni la vigilance, ni les questions d’entretien', () => {
    const sérialisé = JSON.stringify(projeter());
    for (const réservé of ['Résumé réservé', 'réveils', 'ferritine', 'fatigue', 'Depuis quand ?', 'À valider.']) {
      expect(sérialisé).not.toContain(réservé);
    }
  });

  // Le cas qu'une revue adversariale avait trouvé sur le booklet : retirer
  // `questions_entretien` en laissant `points_a_confirmer` déplaçait la fuite.
  it('ne laisse pas fuir une question d’entretien déguisée en « point à confirmer »', () => {
    const s: SyntheseSchema = {
      ...synthese(),
      axes_prioritaires: [
        {
          axe: 'Humeur',
          niveau_priorite: 'eleve',
          arguments: ['BDI-II 42 — Dépression sévère'],
          points_a_confirmer: ['Avez-vous des idées noires ?'],
        },
      ],
    };
    const sérialisé = JSON.stringify(projeter({ syntheseJson: s }));
    expect(sérialisé).not.toContain('Dépression sévère');
    expect(sérialisé).not.toContain('idées noires');
  });

  // La vigilance déterministe recopie les signaux d'alerte déclarés par le
  // patient. Lus seuls, sans praticien en face, ils sont exactement ce qu'il ne
  // faut pas afficher.
  it('ne laisse pas fuir un signal d’alerte déclaré par le patient', () => {
    const s: SyntheseSchema = {
      ...synthese(),
      points_de_vigilance: [
        "Signal d'alerte signalé par le patient : Idées noires ou suicidaires — avis médical à évaluer en priorité.",
      ],
    };
    const sérialisé = JSON.stringify(projeter({ syntheseJson: s }));
    expect(sérialisé).not.toContain('Idées noires');
    expect(sérialisé).not.toContain('avis médical à évaluer en priorité');
  });
});

/**
 * La règle de visibilité elle-même, testée à la source.
 *
 * Les deux routes qui l'appellent (`api/portail/bilan` et
 * `api/portail/assignations`) l'assertent chacune sur la requête qu'elles
 * émettent — mais toutes deux en boîte blanche, sur un mock. Si la fonction
 * perdait une condition, DEUX bancs deviendraient faux ensemble et personne ne
 * nommerait la cause. Ici la forme du `where` est fixée en un seul endroit :
 * l'assertion est exhaustive (`toEqual`, pas `toMatchObject`), donc une
 * condition RETIRÉE rougit tout autant qu'une condition ajoutée.
 */
describe('whereEnvoiVisible', () => {
  it('exige les trois conditions, et rien d’autre', () => {
    expect(whereEnvoiVisible('PAT_TEST')).toEqual({
      // 1. L'envoi appartient au patient de la session.
      idPatient: 'PAT_TEST',
      // 2. Il a RÉUSSI : `Envoye` est le seul statut de succès de
      //    `logBookletEnvoi`. Une synthèse validée mais jamais transmise, ou un
      //    envoi en `Erreur`, n'a rien remis au patient.
      statut: 'Envoye',
      synthese: {
        is: {
          // 3a. Double concordance de patient : `logBookletEnvoi` RECOPIE
          //     l'idPatient de la synthèse, et une recopie peut mentir. Exiger
          //     que les deux concordent ferme « le bilan d'un autre ».
          idPatient: 'PAT_TEST',
          // 3b. Le rejet RETIRE la visibilité — seul recours du praticien qui
          //     s'aperçoit après coup qu'il a transmis un bilan erroné,
          //     `effacer` étant refusé dès qu'un envoi existe. Le filtre est
          //     `not: 'Rejetee'`, jamais une liste blanche de statuts valides :
          //     un statut ajouté au modèle resterait visible par défaut plutôt
          //     que de disparaître en silence de l'espace du patient.
          statut: { not: 'Rejetee' },
        },
      },
    });
  });

  it('n’emporte ni tri ni sélection — les deux appelants n’ont pas le même besoin', () => {
    const où = whereEnvoiVisible('PAT_TEST') as Record<string, unknown>;
    expect(où).not.toHaveProperty('orderBy');
    expect(où).not.toHaveProperty('select');
  });

  it('reporte fidèlement l’identifiant reçu, aux deux emplacements', () => {
    const où = whereEnvoiVisible('PAT_AUTRE') as {
      idPatient: string;
      synthese: { is: { idPatient: string } };
    };
    expect(où.idPatient).toBe('PAT_AUTRE');
    expect(où.synthese.is.idPatient).toBe('PAT_AUTRE');
  });
});

describe('projeterBilanPatient — étanchéité praticien → patient (D-057)', () => {
  // Cette propriété était vraie par construction ; elle devient une exigence
  // avec le LOT-09. Jusqu'ici `points_de_vigilance` ne portait que des signaux
  // d'anamnèse du patient lui-même — désormais il porte aussi des DISCORDANCES
  // ENTRE INSTRUMENTS, dont le type déclare `audience: 'praticien_seul'`. Une
  // régression sur la liste blanche de la projection ne serait plus une fuite
  // de prose interne : elle servirait au patient un constat qui ne lui est pas
  // destiné.
  const avecDiscordances = (): SyntheseSchema => ({
    ...synthese(),
    points_de_vigilance: [
      'Discordance entre instruments constatée par le déterministe : '
      + 'Signal fonctionnel non confirmé par les instruments spécifiques. Clarifier en entretien.',
      'Signal d’alerte signalé par le patient : idées noires — avis médical à évaluer en priorité.',
    ],
  });

  const projeter = () => projeterBilanPatient({
    syntheseJson: avecDiscordances(),
    notesPraticien: null,
    modele: MODELE_REDACTION_PRATICIEN,
    transmisLe: TRANSMIS_LE,
  });

  it('ne rend aucun point de vigilance, quel qu’en soit le nombre', () => {
    expect(JSON.stringify(projeter())).not.toContain('Discordance entre instruments');
  });

  it('ne rend aucun des trois champs réservés au praticien', () => {
    const rendu = JSON.stringify(projeter());
    expect(rendu).not.toContain('Résumé réservé au praticien');
    expect(rendu).not.toContain('Depuis quand ?');
    expect(rendu).not.toContain('idées noires');
  });

  it('rend bien le narratif patient — l’étanchéité ne vide pas le bilan', () => {
    expect(projeter().narratif).toBe('Vos réponses évoquent un sommeil fragmenté.');
  });
});
