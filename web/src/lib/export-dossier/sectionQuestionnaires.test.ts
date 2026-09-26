import { describe, expect, it } from 'vitest';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { ETIQUETTE_NON_INTERPRETABLE } from '@/lib/scoring/passationsNonInterpretables';
import type { AssignationSansReponseExport, BlocExport, PassationExport } from './modele';
import { AVERTISSEMENT_DEFINITION_RETIREE, AVERTISSEMENT_SANS_RECOUVREMENT } from './reponsesExport';
import { sectionQuestionnaires } from './sectionQuestionnaires';

const DEF: QuestionnaireDef = {
  id: 'Q_TEST_01',
  titre: 'Questionnaire de test',
  sections: [
    {
      id: 'A',
      titre: 'Humeur',
      questions: [
        {
          id: 'H1',
          texte: 'Vous sentez-vous triste ?',
          type: 'likert',
          options: [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Parfois' }, { v: 2, l: 'Souvent' }],
        },
      ],
    },
    {
      id: 'B',
      titre: 'Mesures',
      questions: [{ id: 'P1', texte: 'Poids', type: 'number', unit: 'kg' }],
    },
  ],
};

function passation(partiel: Partial<PassationExport> = {}): PassationExport {
  return {
    idReponse: 'REP001',
    idQuestionnaire: 'Q_TEST_01',
    titre: 'Questionnaire de test',
    dateReponse: new Date('2026-09-12T10:00:00.000Z'),
    scores: { rawAnswers: { H1: 1, P1: 64 } },
    scorePrincipal: null,
    interpretation: null,
    statutValidite: 'VALID',
    invalideLe: null,
    motifInvalidation: null,
    nonInterpretable: null,
    definition: DEF,
    definitionRetiree: false,
    courante: true,
    ...partiel,
  };
}

function champ(blocs: BlocExport[], libelle: string): string | undefined {
  const trouve = blocs.find(b => b.type === 'champ' && b.libelle === libelle);
  return trouve?.type === 'champ' ? trouve.valeur : undefined;
}

function textes(blocs: BlocExport[]): string[] {
  return blocs.map(b => {
    if (b.type === 'titre') return `T${b.niveau} ${b.texte}`;
    if (b.type === 'paragraphe') return `P${b.ton ? `[${b.ton}]` : ''} ${b.texte}`;
    if (b.type === 'champ') return `C ${b.libelle} : ${b.valeur}`;
    if (b.type === 'liste') return `L ${b.elements.join(' | ')}`;
    return 'espace';
  });
}

describe('sectionQuestionnaires — squelette', () => {
  it('sans passation : titre de section et « Aucun questionnaire soumis. »', () => {
    expect(sectionQuestionnaires([], [])).toEqual([
      { type: 'titre', niveau: 1, texte: '3. Réponses aux questionnaires' },
      { type: 'paragraphe', texte: 'Aucun questionnaire soumis.' },
    ]);
  });

  it('une passation complète, dans l’ordre des blocs attendu', () => {
    const blocs = sectionQuestionnaires(
      [
        passation({
          scores: {
            total: 12,
            maxTotal: 30,
            interpretation: { label: 'Humeur modérément basse' },
            conduite: 'Réévaluer à quatre semaines.',
            note: 'Barème de la source.',
            certification: { source: 'drive', status: 'certifie' },
            missingIds: ['H9', 'H10'],
            notApplicable: ['H11'],
            rawAnswers: { H1: 1, P1: 64 },
          },
          scorePrincipal: 12,
          interpretation: 'Humeur modérément basse',
        }),
      ],
      [],
    );
    expect(textes(blocs)).toEqual([
      'T1 3. Réponses aux questionnaires',
      'T2 Questionnaire de test (Q_TEST_01)',
      'T3 Passation du 12/09/2026 — passation courante',
      'C Validité : Valide',
      'C Score : 12/30',
      'C Interprétation : Humeur modérément basse',
      'C Résumé du score : Humeur modérément basse — Orientation : Réévaluer à quatre semaines.',
      'C Note : Barème de la source.',
      'C Qualité : Scoring vérifié (Drive) ; 2 item(s) manquant(s) ; 1 non applicable(s)',
      'P Réponses :',
      'P[discret] Humeur',
      'C Vous sentez-vous triste ? : Parfois',
      'P[discret] Mesures',
      'C Poids : 64 kg',
    ]);
  });

  it('sans métadonnée de certification, la qualité est « Historique »', () => {
    const blocs = sectionQuestionnaires([passation({ courante: false })], []);
    expect(champ(blocs, 'Qualité')).toBe('Historique');
    expect(blocs).toContainEqual({ type: 'titre', niveau: 3, texte: 'Passation du 12/09/2026' });
  });
});

describe('sectionQuestionnaires — scores comme à l’écran', () => {
  it('des sous-scores remplacent score et interprétation, avec leur sens de lecture', () => {
    const blocs = sectionQuestionnaires(
      [
        passation({
          scores: {
            subScores: [
              { id: 'FA', label: 'Fatigue', total: 67, max: 100, sens: 'symptome', interpretation: { label: 'Élevée' } },
              { id: 'PF', label: 'Fonctionnement physique', total: 80, max: 100, sens: 'fonctionnelle' },
              { id: 'XX', label: 'Axe partiel', total: null, max: 20 },
            ],
            interpretation: { label: 'Profil perturbé' },
            rawAnswers: { H1: 2 },
          },
          scorePrincipal: 55,
          interpretation: 'Profil perturbé',
        }),
      ],
      [],
    );
    expect(champ(blocs, 'Score')).toBeUndefined();
    expect(champ(blocs, 'Interprétation')).toBeUndefined();
    expect(blocs).toContainEqual({
      type: 'liste',
      elements: [
        'Fatigue : 67/100 — Élevée (score élevé = symptômes plus importants)',
        'Fonctionnement physique : 80/100 (score élevé = meilleur fonctionnement)',
        'Axe partiel : non mesuré',
      ],
    });
  });

  it('les axes descriptifs sont restitués sous « Détail : »', () => {
    const blocs = sectionQuestionnaires(
      [
        passation({
          scores: {
            categories: [
              { id: 'C1', label: 'Catégorie 1', positive: true },
              { id: 'C2', label: 'Catégorie 2', positive: false },
            ],
            rawAnswers: { H1: 0 },
          },
        }),
      ],
      [],
    );
    const i = blocs.findIndex(b => b.type === 'paragraphe' && b.texte === 'Détail :');
    expect(i).toBeGreaterThan(0);
    expect(blocs[i + 1]).toEqual({ type: 'liste', elements: ['Catégorie 1 : positive', 'Catégorie 2 : négative'] });
    // Pas de score principal ni d'interprétation : aucun champ fabriqué.
    expect(champ(blocs, 'Score')).toBeUndefined();
  });
});

describe('sectionQuestionnaires — validité et passations non interprétables', () => {
  it('INVALID porte la date et le motif cité', () => {
    const blocs = sectionQuestionnaires(
      [
        passation({
          statutValidite: 'INVALID',
          invalideLe: new Date('2026-09-14T08:00:00.000Z'),
          motifInvalidation: 'Réponses données au hasard',
        }),
      ],
      [],
    );
    expect(champ(blocs, 'Validité')).toBe(
      'Invalidée par le praticien le 14/09/2026 — motif : « Réponses données au hasard »',
    );
  });

  it('les autres statuts, et un statut inconnu rendu brut', () => {
    const lu = (statutValidite: string) =>
      champ(sectionQuestionnaires([passation({ statutValidite })], []), 'Validité');
    expect(lu('AMBIGUOUS')).toBe('Ambiguë (signalée au praticien)');
    expect(lu('SUPERSEDED')).toBe('Remplacée par une passation ultérieure');
    expect(lu('HISTORICAL_ONLY')).toBe('Historique seulement (exclue du raisonnement clinique)');
    expect(lu('INVALID')).toBe('Invalidée par le praticien');
    expect(lu('STATUT_NEUF')).toBe('STATUT_NEUF');
  });

  it('non interprétable : alerte, qualité dédiée, définition retirée et codes bruts', () => {
    const blocs = sectionQuestionnaires(
      [
        passation({
          scores: { rawAnswers: { M2: 4, M1: 1 } },
          nonInterpretable: 'Instrument servi non conforme à sa source.',
          definition: null,
          definitionRetiree: true,
        }),
      ],
      [],
    );
    expect(blocs).toContainEqual({
      type: 'paragraphe',
      texte: `${ETIQUETTE_NON_INTERPRETABLE} — Instrument servi non conforme à sa source.`,
      ton: 'alerte',
    });
    expect(champ(blocs, 'Qualité')).toBe('Non interprétable');
    expect(textes(blocs).slice(-3)).toEqual([
      'P Réponses :',
      `P[alerte] ${AVERTISSEMENT_DEFINITION_RETIREE}`,
      'L M1 : 1 | M2 : 4',
    ]);
  });

  it('zéro recouvrement : aucune ligne traduite, alerte puis codes bruts', () => {
    const blocs = sectionQuestionnaires([passation({ scores: { rawAnswers: { MO1: 3 } } })], []);
    expect(textes(blocs).slice(-2)).toEqual([`P[alerte] ${AVERTISSEMENT_SANS_RECOUVREMENT}`, 'L MO1 : 3']);
  });

  it('recouvrement partiel : les codes orphelins sont annoncés comme non traduits', () => {
    const blocs = sectionQuestionnaires([passation({ scores: { rawAnswers: { H1: 1, ZZ1: 2 } } })], []);
    expect(textes(blocs).slice(-2)).toEqual([
      'P[discret] Codes enregistrés hors de la version actuelle du questionnaire, non traduits :',
      'L ZZ1 : 2',
    ]);
  });
});

describe('sectionQuestionnaires — regroupement et tri', () => {
  it('groupes par instrument, le plus récemment passé d’abord ; passations récentes d’abord', () => {
    const blocs = sectionQuestionnaires(
      [
        passation({ idReponse: 'R1', idQuestionnaire: 'Q_A', titre: 'Ancien titre A', dateReponse: new Date('2026-06-01T10:00:00Z'), courante: false }),
        passation({ idReponse: 'R2', idQuestionnaire: 'Q_B', titre: 'Instrument B', dateReponse: new Date('2026-08-01T10:00:00Z') }),
        passation({ idReponse: 'R3', idQuestionnaire: 'Q_A', titre: 'Instrument A', dateReponse: new Date('2026-09-01T10:00:00Z') }),
      ],
      [],
    );
    const titres = textes(blocs).filter(t => t.startsWith('T2') || t.startsWith('T3'));
    expect(titres).toEqual([
      'T2 Instrument A (Q_A)',
      'T3 Passation du 01/09/2026 — passation courante',
      'T3 Passation du 01/06/2026',
      'T2 Instrument B (Q_B)',
      'T3 Passation du 01/08/2026 — passation courante',
    ]);
  });
});

describe('sectionQuestionnaires — envois sans réponse', () => {
  const envois: AssignationSansReponseExport[] = [
    { idQuestionnaire: 'Q_SOM_03', titre: 'Questionnaire de Berlin', statut: 'En attente', dateAssignation: new Date('2026-09-20T09:00:00Z'), dateLimite: '2026-10-04' },
    { idQuestionnaire: 'Q_STR_02', titre: 'Stress perçu', statut: 'Annulée', dateAssignation: new Date('2026-09-02T09:00:00Z'), dateLimite: null },
  ];

  it('listés à part, avec la mise en garde et l’échéance en JJ/MM/AAAA', () => {
    const blocs = sectionQuestionnaires([], envois);
    expect(blocs.slice(2)).toEqual([
      { type: 'titre', niveau: 2, texte: 'Questionnaires envoyés sans réponse' },
      { type: 'paragraphe', texte: "Une absence de réponse ne renseigne pas sur l'état du patient.", ton: 'discret' },
      {
        type: 'liste',
        elements: [
          'Questionnaire de Berlin (Q_SOM_03) — En attente — envoyé le 20/09/2026, échéance 04/10/2026',
          'Stress perçu (Q_STR_02) — Annulée — envoyé le 02/09/2026',
        ],
      },
    ]);
  });

  it('rien quand tout a reçu une réponse', () => {
    const blocs = sectionQuestionnaires([passation()], []);
    expect(textes(blocs)).not.toContain('T2 Questionnaires envoyés sans réponse');
  });
});
