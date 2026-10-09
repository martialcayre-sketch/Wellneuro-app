import { describe, expect, it } from 'vitest';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { Q_ALI_01_COURT_14, Q_ALI_01_SIIN_57 } from '@/lib/questionnaires/alimentaire';
import { Q_PED_02 } from '@/lib/questionnaires/pediatrie';
import { Q_SOM_09 } from '@/lib/questionnaires/sommeil';
import { ETIQUETTE_NON_INTERPRETABLE } from '@/lib/scoring/passationsNonInterpretables';
import { LEGENDE_AGREGATS_SOMMEIL } from './libellesAgendas';
import type { AssignationSansReponseExport, BlocExport, PassationExport } from './modele';
import { AVERTISSEMENT_DEFINITION_RETIREE, AVERTISSEMENT_SANS_RECOUVREMENT } from './reponsesExport';
import { MISE_EN_GARDE_FORME_VARIABLE, sectionQuestionnaires } from './sectionQuestionnaires';

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
      'L « M1 » : 1 | « M2 » : 4',
    ]);
  });

  it('zéro recouvrement : aucune ligne traduite, alerte puis codes bruts', () => {
    const blocs = sectionQuestionnaires([passation({ scores: { rawAnswers: { MO1: 3 } } })], []);
    expect(textes(blocs).slice(-2)).toEqual([`P[alerte] ${AVERTISSEMENT_SANS_RECOUVREMENT}`, 'L « MO1 » : 3']);
  });

  it('recouvrement partiel : les codes orphelins sont annoncés comme non traduits, clés citées (NF2)', () => {
    const blocs = sectionQuestionnaires([passation({ scores: { rawAnswers: { H1: 1, ZZ1: 2 } } })], []);
    expect(textes(blocs).slice(-2)).toEqual([
      'P[discret] Codes enregistrés hors de la version actuelle du questionnaire, non traduits :',
      'L « ZZ1 » : 2',
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
      { type: 'titre', niveau: 2, texte: 'Questionnaires envoyés et non soumis' },
      {
        type: 'paragraphe',
        texte: "Une absence de réponse ne renseigne pas sur l'état du patient.",
        ton: 'discret',
        garderAvecSuite: true,
      },
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
    expect(textes(blocs)).not.toContain('T2 Questionnaires envoyés et non soumis');
  });

  it('agenda en cours de recueil : ses saisies sont dites, jamais une absence de réponse (constat 11)', () => {
    const blocs = sectionQuestionnaires([], [
      {
        idQuestionnaire: 'Q_SOM_09',
        titre: 'Agenda du sommeil — 21 nuits',
        statut: 'En attente',
        dateAssignation: new Date('2026-09-05T09:00:00Z'),
        dateLimite: null,
        recueilEnCours: { saisies: 15, unite: 'nuit' },
      },
      {
        idQuestionnaire: 'Q_ALI_09',
        titre: 'Agenda alimentaire — 21 jours',
        statut: 'En attente',
        dateAssignation: new Date('2026-09-06T09:00:00Z'),
        dateLimite: '2026-09-27',
        recueilEnCours: { saisies: 1, unite: 'journée' },
      },
      {
        idQuestionnaire: 'Q_SOM_09',
        titre: 'Agenda du sommeil — 21 nuits',
        statut: 'Annulée',
        dateAssignation: new Date('2026-08-01T09:00:00Z'),
        dateLimite: null,
        recueilEnCours: { saisies: 3, unite: 'nuit' },
      },
      ...envois.slice(0, 1),
    ]);
    expect(textes(blocs).slice(2)).toEqual([
      'T2 Questionnaires envoyés et non soumis',
      "P[discret] Une absence de réponse ne renseigne pas sur l'état du patient ; les saisies d'un agenda non clôturé ne figurent pas dans ce document.",
      'L Agenda du sommeil — 21 nuits (Q_SOM_09) — recueil en cours : 15 nuits saisies, agenda non clôturé — envoyé le 05/09/2026'
        + ' | Agenda alimentaire — 21 jours (Q_ALI_09) — recueil en cours : 1 journée saisie, agenda non clôturé — envoyé le 06/09/2026, échéance 27/09/2026'
        + ' | Agenda du sommeil — 21 nuits (Q_SOM_09) — Annulée : 3 nuits saisies, agenda non clôturé — envoyé le 01/08/2026'
        + ' | Questionnaire de Berlin (Q_SOM_03) — En attente — envoyé le 20/09/2026, échéance 04/10/2026',
    ]);
  });

  it('agenda dont les saisies sont illisibles : nombre inconnu, jamais une absence de réponse', () => {
    const blocs = sectionQuestionnaires([], [
      {
        idQuestionnaire: 'Q_SOM_09',
        titre: 'Agenda du sommeil — 21 nuits',
        statut: 'En attente',
        dateAssignation: new Date('2026-09-05T09:00:00Z'),
        dateLimite: null,
        recueilEnCours: { saisies: null, unite: 'nuit' },
      },
      {
        idQuestionnaire: 'Q_ALI_09',
        titre: 'Agenda alimentaire — 21 jours',
        statut: 'En attente',
        dateAssignation: new Date('2026-09-07T09:00:00Z'),
        dateLimite: null,
        recueilEnCours: { saisies: null, unite: 'journée' },
      },
    ]);
    expect(textes(blocs).slice(2)).toEqual([
      'T2 Questionnaires envoyés et non soumis',
      "P[discret] Une absence de réponse ne renseigne pas sur l'état du patient ; les saisies d'un agenda non clôturé ne figurent pas dans ce document.",
      'L Agenda du sommeil — 21 nuits (Q_SOM_09) — recueil en cours : nuits saisies en nombre inconnu (lecture impossible), agenda non clôturé — envoyé le 05/09/2026'
        + ' | Agenda alimentaire — 21 jours (Q_ALI_09) — recueil en cours : journées saisies en nombre inconnu (lecture impossible), agenda non clôturé — envoyé le 07/09/2026',
    ]);
  });
});

describe('sectionQuestionnaires — instrument du cabinet modifié après la passation (constat 12, NF4)', () => {
  const reserve =
    'Instrument du cabinet modifié le 20/09/2026 après cette passation : les réponses ne sont pas rapportées à ses questions actuelles : codes bruts ci-dessous.';

  it('la réserve suspend la traduction : codes bruts cités sous l’alerte, aucune réponse sous une question actuelle', () => {
    const blocs = sectionQuestionnaires(
      [passation({ idQuestionnaire: 'CAB_TEST', avertissementLecture: reserve })],
      [],
    );
    expect(textes(blocs).slice(-3)).toEqual(['P Réponses :', `P[alerte] ${reserve}`, 'L « H1 » : 1 | « P1 » : 64']);
    expect(blocs).toContainEqual({ type: 'paragraphe', texte: reserve, ton: 'alerte', garderAvecSuite: true });
    expect(blocs.some(b => b.type === 'champ' && b.libelle === 'Vous sentez-vous triste ?')).toBe(false);
    expect(blocs.some(b => b.type === 'paragraphe' && b.texte.startsWith('Codes enregistrés hors'))).toBe(false);
  });

  it('sans réserve, la passation se traduit et aucune alerte n’est ajoutée', () => {
    const sans = sectionQuestionnaires([passation({ avertissementLecture: null })], []);
    expect(sans.some(b => b.type === 'paragraphe' && b.ton === 'alerte')).toBe(false);
    expect(champ(sans, 'Vous sentez-vous triste ?')).toBe('Parfois');
  });
});

describe('sectionQuestionnaires — Q_SOM_09 clôturé (NF5, N15)', () => {
  it('légende de l’export sans « null », qualité avec son échelle, drapeau d’indice en oui / non', () => {
    const blocs = sectionQuestionnaires(
      [
        passation({
          idQuestionnaire: 'Q_SOM_09',
          titre: Q_SOM_09.titre,
          definition: Q_SOM_09,
          scores: { rawAnswers: { AGD_NB_NUITS: 21, AGD_QUAL_MOY: 3.4, AGD_INDICE_ELIGIBLE: 1, AGD_REV_MOY: null } },
        }),
        passation({
          idReponse: 'R0',
          idQuestionnaire: 'Q_SOM_09',
          titre: Q_SOM_09.titre,
          definition: Q_SOM_09,
          dateReponse: new Date('2026-06-01T10:00:00Z'),
          courante: false,
          scores: { rawAnswers: { AGD_NB_NUITS: 15, AGD_QUAL_MOY: 2, AGD_INDICE_ELIGIBLE: 0 } },
        }),
      ],
      [],
    );
    const t = textes(blocs);
    expect(t.filter(l => /\bnull\b/.test(l))).toEqual([]);
    expect(t).toContain(`P[discret] ${LEGENDE_AGREGATS_SOMMEIL}`);
    expect(t).toContain('C Qualité subjective moyenne : 3.4 (échelle de 1 à 5)');
    expect(t).toContain("C Couverture suffisante pour l'indice composite : oui");
    expect(t).toContain('C Qualité subjective moyenne : 2 (échelle de 1 à 5)');
    expect(t).toContain("C Couverture suffisante pour l'indice composite : non");
    expect(t).toContain('C Réveils nocturnes moyens par nuit : Non calculé : données insuffisantes');
  });
});

describe('sectionQuestionnaires — consignes et légendes (constat 14)', () => {
  it('Q_PED_02 : la consigne porteuse de la légende d’échelle sort une fois, sous le titre de l’instrument', () => {
    const blocs = sectionQuestionnaires(
      [
        passation({ idReponse: 'R2', idQuestionnaire: 'Q_PED_02', titre: Q_PED_02.titre, definition: Q_PED_02, scores: { rawAnswers: { CE1: 2 } } }),
        passation({ idReponse: 'R1', idQuestionnaire: 'Q_PED_02', titre: Q_PED_02.titre, definition: Q_PED_02, scores: { rawAnswers: { CE1: 1 } }, dateReponse: new Date('2026-06-01T10:00:00Z'), courante: false }),
      ],
      [],
    );
    const consignes = blocs.filter(b => b.type === 'paragraphe' && b.texte.startsWith('Consigne du questionnaire : '));
    expect(consignes).toEqual([
      { type: 'paragraphe', texte: `Consigne du questionnaire : ${Q_PED_02.instructions}`, ton: 'discret', garderAvecSuite: true },
    ]);
    expect(blocs.indexOf(consignes[0])).toBe(2);
    expect(consignes[0].type === 'paragraphe' && consignes[0].texte).toContain('0 = Pas du tout · 1 = Un peu · 2 = Souvent · 3 = Très souvent');
  });

  it('Q_FIB_03 : la légende de section suit le titre de la section', () => {
    const fib = (QUESTIONNAIRE_CATALOGUE as unknown as Record<string, QuestionnaireDef>).Q_FIB_03;
    const blocs = sectionQuestionnaires(
      [passation({ idQuestionnaire: 'Q_FIB_03', titre: fib.titre, definition: fib, scores: { rawAnswers: { EL1: 3 } } })],
      [],
    );
    const t = textes(blocs);
    const i = t.indexOf('P[discret] Points douloureux — Partie supérieure');
    expect(t.slice(i, i + 3)).toEqual([
      'P[discret] Points douloureux — Partie supérieure',
      'P[discret] 0 = Aucune douleur · 1 = Sensibilité légère · 2 = Douleur modérée · 3 = Douleur intense',
      'C Zone occipitale (base du crâne, bilatéral) : 3',
    ]);
  });

  it('une passation sans définition n’imprime aucune consigne', () => {
    const blocs = sectionQuestionnaires([passation({ definition: null, scores: { rawAnswers: { H1: 1 } } })], []);
    expect(textes(blocs).some(t => t.includes('Consigne du questionnaire'))).toBe(false);
  });
});

describe('sectionQuestionnaires — Q_ALI_01 à forme variable (constat 18)', () => {
  function formes(statutAncienne: string): PassationExport[] {
    return [
      passation({ idReponse: 'R2', idQuestionnaire: 'Q_ALI_01', titre: Q_ALI_01_SIIN_57.titre, definition: Q_ALI_01_SIIN_57, courante: false, scores: { rawAnswers: { SIIN01: 1 } } }),
      passation({ idReponse: 'R1', idQuestionnaire: 'Q_ALI_01', titre: Q_ALI_01_COURT_14.titre, definition: Q_ALI_01_SIIN_57, courante: statutAncienne !== 'VALID', statutValidite: statutAncienne, dateReponse: new Date('2026-06-01T10:00:00Z'), scores: { rawAnswers: { AL1: 1 } } }),
    ];
  }

  it('deux passations exploitables : la mise en garde dit pourquoi aucune n’est courante', () => {
    const blocs = sectionQuestionnaires(formes('VALID'), []);
    expect(blocs[2]).toEqual({ type: 'paragraphe', texte: MISE_EN_GARDE_FORME_VARIABLE, ton: 'discret', garderAvecSuite: true });
    expect(MISE_EN_GARDE_FORME_VARIABLE).toBe(
      "Cet identifiant a désigné deux formes distinctes du questionnaire : aucune passation n'est désignée comme courante, et deux passations ne se comparent pas entre elles.",
    );
  });

  it('une seule passation exploitable : pas de mise en garde', () => {
    const blocs = sectionQuestionnaires(formes('SUPERSEDED'), []);
    expect(blocs).not.toContainEqual(expect.objectContaining({ texte: MISE_EN_GARDE_FORME_VARIABLE }));
  });

  it('un instrument à forme fixe passé deux fois : pas de mise en garde', () => {
    const blocs = sectionQuestionnaires(
      [passation({ idReponse: 'R2' }), passation({ idReponse: 'R1', dateReponse: new Date('2026-06-01T10:00:00Z') })],
      [],
    );
    expect(blocs).not.toContainEqual(expect.objectContaining({ texte: MISE_EN_GARDE_FORME_VARIABLE }));
  });
});

describe('sectionQuestionnaires — pseudo-titres gardés avec leur suite', () => {
  it('« Réponses : », « Sous-scores : », « Détail : », titres et légendes de section', () => {
    const blocs = sectionQuestionnaires(
      [
        passation({
          scores: {
            subScores: [{ id: 'FA', label: 'Fatigue', total: 3, max: 10 }],
            categories: [{ id: 'C1', label: 'Catégorie 1', positive: true }],
            rawAnswers: { H1: 1, P1: 64, ZZ1: 2 },
          },
        }),
      ],
      [],
    );
    const gardes = blocs.flatMap(b => (b.type === 'paragraphe' && b.garderAvecSuite ? [b.texte] : []));
    expect(gardes).toEqual([
      'Sous-scores :',
      'Détail :',
      'Réponses :',
      'Humeur',
      'Mesures',
      'Codes enregistrés hors de la version actuelle du questionnaire, non traduits :',
    ]);
  });
});

describe('sectionQuestionnaires — scores persistés malformés', () => {
  it('un sous-score ou un axe qui n’est pas un objet est ignoré, l’export ne tombe pas', () => {
    const blocs = sectionQuestionnaires(
      [
        passation({
          scores: {
            subScores: [null, 7, { id: 'FA', label: 'Fatigue', total: 3, max: 10 }],
            dimensions: [null, { id: 'D1', label: 'Dimension', total: 2, max: 4 }],
            rawAnswers: { H1: 1 },
          },
        }),
      ],
      [],
    );
    const listes = blocs.flatMap(b => (b.type === 'liste' ? b.elements : []));
    expect(listes).toContain('Fatigue : 3/10');
    expect(listes).toContain('Dimension : 2/4');
  });
});
