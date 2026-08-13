import { describe, expect, it } from 'vitest';
import { PACKS_REGISTRY } from '@/lib/questionnaires-functional';
import { LIBELLE_EXTINCTION } from './stopRulesLibelles';
import { STOP_RULES_V1 } from './stopRulesV1';
import {
  formaterEcarts,
  verifierRestitutionOrientation,
  type TexteSynthese,
} from './verifierRestitutionOrientation';

// Le garde de restitution du LOT-06. Ce qu'il doit prouver n'est pas « le modèle
// n'invente rien » — indécidable — mais l'énoncé borné qui l'approche : un nom
// d'un vocabulaire fermé apparaît-il hors de ceux transmis.
//
// La moitié de ces cas sont des CONTRÔLES NÉGATIFS, et ils comptent autant que
// les positifs : la revue adversariale du 2026-08-03 a montré qu'un garde trop
// large accuse la prose clinique ordinaire et noie son propre signal.

const RIEN = { packs: [], questionnaires: [] };

describe('verifierRestitutionOrientation — ce qu’il signale', () => {
  it('ne signale rien sur une synthèse vide', () => {
    expect(verifierRestitutionOrientation({}, RIEN)).toEqual([]);
  });

  it('signale un pack nommé « pack X » alors qu’aucun n’a été transmis', () => {
    const synthese: TexteSynthese = { resume_praticien: 'Je recommande le pack Sommeil et chronobiologie.' };
    expect(verifierRestitutionOrientation(synthese, RIEN)).toEqual([
      { type: 'pack', identifiant: 'pack_sommeil_chronobiologie' },
    ]);
  });

  it('ne signale pas un pack qui a bien été transmis', () => {
    const synthese: TexteSynthese = { resume_praticien: 'Le pack Sommeil et chronobiologie est proposé.' };
    expect(
      verifierRestitutionOrientation(synthese, { packs: ['pack_sommeil_chronobiologie'], questionnaires: [] }),
    ).toEqual([]);
  });

  it('signale le pack en trop quand un autre a été transmis', () => {
    const synthese: TexteSynthese = {
      resume_praticien: 'La table propose le pack Sommeil et chronobiologie ; j’ajoute le pack Migraine et cephalees.',
    };
    expect(
      verifierRestitutionOrientation(synthese, { packs: ['pack_sommeil_chronobiologie'], questionnaires: [] }),
    ).toEqual([{ type: 'pack', identifiant: 'pack_migraine_cephalees' }]);
  });

  it('reste insensible à la casse, aux accents et à la ponctuation', () => {
    // Le registre écrit « Pediatrie, neurodeveloppement et oralite » sans
    // accents ; un modèle écrira « Pédiatrie, neurodéveloppement et oralité ».
    const synthese: TexteSynthese = {
      narratif_patient: 'un PACK PÉDIATRIE — NEURODÉVELOPPEMENT ET ORALITÉ vous sera proposé',
    };
    expect(verifierRestitutionOrientation(synthese, RIEN)).toEqual([
      { type: 'pack', identifiant: 'pack_pediatrie_neurodeveloppement_oralite' },
    ]);
  });

  it('détecte un slug recopié partout, sans exiger le mot « pack »', () => {
    // Un slug n'a aucun homonyme naturel dans une prose clinique.
    const synthese: TexteSynthese = { limites: 'Identifiant retenu : pack_migraine_cephalees.' };
    expect(verifierRestitutionOrientation(synthese, RIEN)).toEqual([
      { type: 'pack', identifiant: 'pack_migraine_cephalees' },
    ]);
  });

  it('voit un pack cité au pluriel dans une énumération', () => {
    // Le bloc injecté est numéroté et peut porter plusieurs entrées :
    // l'énumération est la formulation naturelle, et c'est exactement là qu'un
    // pack inventé se glisse à côté d'un pack légitime.
    const synthese: TexteSynthese = {
      resume_praticien: 'Les packs Sommeil et chronobiologie et Migraine et cephalees sont indiqués.',
    };
    expect(
      verifierRestitutionOrientation(synthese, { packs: ['pack_sommeil_chronobiologie'], questionnaires: [] }),
    ).toEqual([{ type: 'pack', identifiant: 'pack_migraine_cephalees' }]);
  });

  it('tolère un qualificatif intercalé entre « pack » et le titre', () => {
    const synthese: TexteSynthese = { limites: 'Orienter vers le pack d’exploration Migraine et cephalees.' };
    expect(verifierRestitutionOrientation(synthese, RIEN)).toEqual([
      { type: 'pack', identifiant: 'pack_migraine_cephalees' },
    ]);
  });

  it('inspecte l’intérieur des axes prioritaires', () => {
    const synthese: TexteSynthese = {
      axes_prioritaires: [
        { axe: 'Digestif', arguments: ['Orienter vers le pack Digestif et intestin-cerveau.'], points_a_confirmer: [] },
      ],
    };
    expect(verifierRestitutionOrientation(synthese, RIEN)).toEqual([
      { type: 'pack', identifiant: 'pack_digestif_intestin_cerveau' },
    ]);
  });

  it('signale un questionnaire non transmis', () => {
    const synthese: TexteSynthese = { questions_entretien: ['Faire passer Q_NEU_11 ?'] };
    expect(verifierRestitutionOrientation(synthese, { packs: [], questionnaires: ['Q_SOM_01'] })).toEqual([
      { type: 'questionnaire', identifiant: 'Q_NEU_11' },
    ]);
  });

  it('ne signale pas un questionnaire du dossier — le citer est le travail du modèle', () => {
    const synthese: TexteSynthese = { resume_praticien: 'Le Q_ALI_02 montre une exposition faible.' };
    expect(verifierRestitutionOrientation(synthese, { packs: [], questionnaires: ['Q_ALI_02'] })).toEqual([]);
  });

  it('ne signale un même questionnaire qu’une fois', () => {
    const synthese: TexteSynthese = {
      resume_praticien: 'Q_NEU_11 puis Q_NEU_11.',
      limites: 'Encore Q_NEU_11.',
    };
    expect(verifierRestitutionOrientation(synthese, RIEN)).toEqual([
      { type: 'questionnaire', identifiant: 'Q_NEU_11' },
    ]);
  });
});

describe('verifierRestitutionOrientation — ce qu’il NE doit PAS signaler', () => {
  // Quatre des seize titres sont des syntagmes cliniques français ordinaires.
  // Sans l'adjacence exigée du mot « pack », le garde accusait une synthèse
  // parfaitement fidèle — et l'aurait fait sur le SEUL chemin que la production
  // exécute aujourd'hui, table non signée et allowlist vide.
  const PROSE_CLINIQUE_ORDINAIRE = [
    "Prioriser l'axe digestif et intestin-cerveau au vu du score.",
    'Un stress chronique et burnout débutant sont évoqués.',
    'Le volet sommeil et chronobiologie reste à explorer.',
    'Une migraine et céphalées de tension coexistent.',
    'La cognition, vieillissement et aidants forment un axe à surveiller.',
  ];

  for (const phrase of PROSE_CLINIQUE_ORDINAIRE) {
    it(`n’accuse pas la prose clinique : « ${phrase.slice(0, 40)}… »`, () => {
      expect(verifierRestitutionOrientation({ resume_praticien: phrase }, RIEN)).toEqual([]);
    });
  }

  it('reste muet sur une synthèse entièrement ordinaire, allowlist vide', () => {
    const synthese: TexteSynthese = {
      resume_praticien:
        'Le patient rapporte un sommeil fragmenté et un stress chronique ; le versant digestif est secondaire.',
      narratif_patient: 'Votre sommeil et votre digestion méritent qu’on les regarde ensemble.',
      points_de_vigilance: ['Avis médical prioritaire sur les céphalées récentes.'],
      limites: 'Aucune mesure biologique n’est disponible.',
    };
    expect(verifierRestitutionOrientation(synthese, RIEN)).toEqual([]);
  });
});

describe('formaterEcarts', () => {
  it('rend un libellé court et typé', () => {
    expect(
      formaterEcarts([
        { type: 'pack', identifiant: 'pack_migraine_cephalees' },
        { type: 'questionnaire', identifiant: 'Q_NEU_11' },
      ]),
    ).toBe('pack:pack_migraine_cephalees, questionnaire:Q_NEU_11');
  });
});

describe('le vocabulaire reste fermé', () => {
  it('les seize packs de doctrine portent un titre non vide', () => {
    // Un titre vide rendrait le garde aveugle sur ce pack sans que rien ne le
    // dise : la fonction l'ignore délibérément, ce test le rend visible.
    expect(PACKS_REGISTRY.filter(pack => pack.titre.trim() === '')).toEqual([]);
    expect(PACKS_REGISTRY).toHaveLength(16);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// L'ALLOWLIST VIDE — le régime nominal depuis le 2026-08-06 (LOT-02, D-030).
//
// Plus aucune règle d'orientation ne cible un pack : `packsTransmis` rend `[]`
// sur une orientation pourtant active et non vide, et ce garde tourne donc
// TOUJOURS avec `packs: []`. Ce n'est pas un cas dégradé, c'est le cas courant,
// et il méritait ses deux bancs — un positif et un contrôle négatif.
//
// Sans le contrôle négatif, le positif ne prouverait rien : un garde qui
// signalerait TOUT texte parlant de stress ou de sommeil le passerait aussi.
describe('allowlist vide — plus aucun pack n’est proposé (2026-08-06)', () => {
  const AUCUN_PACK = { packs: [] as const, questionnaires: ['Q_SOM_01', 'Q_SOM_05'] };

  it('POSITIF — un pack cité en clair est un écart, puisque aucun n’a été transmis', () => {
    const synthese: TexteSynthese = {
      resume_praticien:
        'Au vu du sommeil non réparateur, je propose le pack Sommeil et chronobiologie.',
    };
    expect(verifierRestitutionOrientation(synthese, AUCUN_PACK)).toEqual([
      { type: 'pack', identifiant: 'pack_sommeil_chronobiologie' },
    ]);
  });

  it('POSITIF — le slug seul suffit, sans le mot « pack » devant', () => {
    const synthese: TexteSynthese = {
      resume_praticien: 'Orientation retenue : pack_stress_chronique_burnout.',
    };
    expect(verifierRestitutionOrientation(synthese, AUCUN_PACK)).toEqual([
      { type: 'pack', identifiant: 'pack_stress_chronique_burnout' },
    ]);
  });

  // LE CONTRÔLE NÉGATIF, ET C'EST LUI QUI DONNE SA VALEUR AU POSITIF.
  // « stress chronique et burnout » EST le titre d'un pack, au mot près. Mais
  // employé comme description clinique, sans « pack » adjacent, ce n'est pas
  // une citation de pack — c'est du français. Un garde qui le signalerait
  // journaliserait un écart à chaque synthèse parlant de burn-out, et le code
  // d'événement serait noyé avant d'être observable.
  it('NÉGATIF — une prose clinique ordinaire ne déclenche aucun écart', () => {
    const synthese: TexteSynthese = {
      resume_praticien:
        'Le tableau associe un stress chronique et burnout professionnel à un sommeil '
        + 'non réparateur ; le PSQI (Q_SOM_01) et le chronotype de Horne (Q_SOM_05) sont proposés.',
      narratif_patient:
        'Votre sommeil et votre niveau de stress méritent d’être mesurés avant toute conclusion.',
    };
    expect(verifierRestitutionOrientation(synthese, AUCUN_PACK)).toEqual([]);
  });

  // FAUX POSITIF ASSUMÉ, ÉPINGLÉ TEL QUEL (contre-revue du 2026-08-06). Quand
  // le mot « pack » apparaît à moins de 40 caractères d'un titre — y compris
  // pour dire qu'on n'en retient AUCUN —, la fenêtre d'adjacence signale un
  // écart. C'est le prix accepté d'un garde simple : journal seul, aucune
  // censure, aucun effet patient. Ce banc n'approuve pas ce comportement, il
  // le rend VISIBLE — l'élargir ou le corriger devra faire rougir cette ligne,
  // pas passer en silence.
  it('FAUX POSITIF ASSUMÉ — « pack » adjacent à un titre signale, même pour dire qu’aucun pack n’est retenu', () => {
    const synthese: TexteSynthese = {
      resume_praticien:
        'Je ne retiens pas de pack : le sommeil et chronobiologie du patient sont à explorer.',
    };
    expect(verifierRestitutionOrientation(synthese, AUCUN_PACK)).toEqual([
      { type: 'pack', identifiant: 'pack_sommeil_chronobiologie' },
    ]);
  });

  // Les questionnaires transmis, eux, restent citables : l'allowlist vide ne
  // porte que sur les packs. Sans ce banc, on pourrait « réparer » le garde en
  // le rendant muet, et les trois cas ci-dessus resteraient verts.
  it('NÉGATIF — un questionnaire NON transmis reste, lui, un écart', () => {
    const synthese: TexteSynthese = { resume_praticien: 'Je propose aussi le HAD (Q_NEU_11).' };
    expect(verifierRestitutionOrientation(synthese, AUCUN_PACK)).toEqual([
      { type: 'questionnaire', identifiant: 'Q_NEU_11' },
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ÉTEINTE ≠ RECOMMANDÉE — [[D-055]], arbitrage 5 (LOT-08).
//
// Le garde mesure la PRÉSENTATION : une cible éteinte doit voisiner un marqueur
// d'extinction à chaque citation, une cible recommandée vivante ne doit jamais
// en voisiner. Les angles morts sont en tête de module ; ces bancs couvrent le
// contrat, ses contre-épreuves, et un faux positif assumé.
// ─────────────────────────────────────────────────────────────────────────────

describe('verifierRestitutionOrientation — éteinte ≠ recommandée', () => {
  const FOURNIS_EXTINCTION = {
    packs: [] as const,
    // L'allowlist de citation garde TOUTES les cibles transmises, éteintes
    // comprises : la séparation ne retire pas le droit de citer.
    questionnaires: ['Q_STR_05', 'Q_STR_02'] as const,
    eteints: { packs: [] as const, questionnaires: ['Q_STR_05'] as const },
    recommandes: { packs: [] as const, questionnaires: ['Q_STR_02'] as const },
  };

  it('POSITIF — une cible éteinte citée sans marqueur est présentée comme recommandée', () => {
    const synthese: TexteSynthese = {
      resume_praticien: 'Je propose de faire passer le BMS-10 (Q_STR_05) pour évaluer le burnout.',
    };
    expect(verifierRestitutionOrientation(synthese, FOURNIS_EXTINCTION)).toEqual([
      { type: 'extinction', identifiant: 'Q_STR_05', sens: 'eteinte_presentee_recommandee' },
    ]);
  });

  it('NÉGATIF — la formulation que la consigne exige ne déclenche rien, même sur deux phrases', () => {
    const synthese: TexteSynthese = {
      resume_praticien:
        'Le BMS-10 (Q_STR_05) avait été proposé pour le dépistage. Il n’est plus nécessaire en l’état, les instruments spécifiques étant rassurants.',
    };
    expect(verifierRestitutionOrientation(synthese, FOURNIS_EXTINCTION)).toEqual([]);
  });

  it('NÉGATIF — le mot « éteinte » lui-même suffit comme marqueur', () => {
    const synthese: TexteSynthese = {
      points_de_vigilance: ['Recommandation Q_STR_05 éteinte : information suffisante.'],
    };
    expect(verifierRestitutionOrientation(synthese, FOURNIS_EXTINCTION)).toEqual([]);
  });

  it('POSITIF — une cible recommandée vivante voisinant un marqueur est présentée comme éteinte', () => {
    const synthese: TexteSynthese = {
      resume_praticien: 'Le PSS-10 (Q_STR_02) n’est pas nécessaire en l’état.',
    };
    expect(verifierRestitutionOrientation(synthese, FOURNIS_EXTINCTION)).toEqual([
      { type: 'extinction', identifiant: 'Q_STR_02', sens: 'recommandee_presentee_eteinte' },
    ]);
  });

  it('NÉGATIF — une cible recommandée citée sans marqueur, et une éteinte non citée : rien', () => {
    const synthese: TexteSynthese = {
      resume_praticien: 'Je propose le PSS-10 (Q_STR_02) pour mesurer l’intensité du stress.',
    };
    expect(verifierRestitutionOrientation(synthese, FOURNIS_EXTINCTION)).toEqual([]);
  });

  it('sans les listes eteints/recommandes, le comportement historique est inchangé — anti-vacuité', () => {
    const synthese: TexteSynthese = {
      resume_praticien: 'Je propose de faire passer le BMS-10 (Q_STR_05).',
    };
    expect(
      verifierRestitutionOrientation(synthese, { packs: [], questionnaires: ['Q_STR_05'] }),
    ).toEqual([]);
  });

  // FAUX POSITIF ASSUMÉ, ÉPINGLÉ TEL QUEL — même régime que celui de
  // l'adjacence pack : deux cibles dans la même fenêtre de 200 caractères
  // partagent leurs marqueurs. Journal seul, aucune censure ; l'élargir ou le
  // corriger devra faire rougir cette ligne, pas passer en silence.
  it('FAUX POSITIF ASSUMÉ — une recommandée vivante dans la fenêtre du marqueur d’une éteinte signale', () => {
    const synthese: TexteSynthese = {
      resume_praticien:
        'Le BMS-10 (Q_STR_05) n’est plus nécessaire en l’état. Je propose le PSS-10 (Q_STR_02).',
    };
    expect(verifierRestitutionOrientation(synthese, FOURNIS_EXTINCTION)).toEqual([
      { type: 'extinction', identifiant: 'Q_STR_02', sens: 'recommandee_presentee_eteinte' },
    ]);
  });

  it('formaterEcarts rend le sens de l’écart', () => {
    expect(
      formaterEcarts([
        { type: 'extinction', identifiant: 'Q_STR_05', sens: 'eteinte_presentee_recommandee' },
      ]),
    ).toBe('extinction:eteinte_presentee_recommandee:Q_STR_05');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ANTI-DÉRIVE DES MARQUEURS — revue wn-reviewer du 2026-08-13 (M4, M5).
//
// Les marqueurs qui comptent sont ceux des textes RÉELLEMENT servis : le
// libellé d'extinction affiché partout, et le motif de STOP-STR que la
// consigne demande de reprendre « tel qu'il t'est donné ». Ces bancs les
// tirent des constantes de production — reformuler `LIBELLE_EXTINCTION` ou le
// motif de la règle sans réviser le vocabulaire du garde rougit ici, au lieu
// de basculer toutes les extinctions en faux écarts sans rien de rouge.
// ─────────────────────────────────────────────────────────────────────────────

describe('verifierRestitutionOrientation — les marqueurs suivent les textes servis', () => {
  const FOURNIS = {
    packs: [] as const,
    questionnaires: ['Q_STR_05'] as const,
    eteints: { packs: [] as const, questionnaires: ['Q_STR_05'] as const },
    recommandes: { packs: [] as const, questionnaires: [] as const },
  };

  it('le libellé d’extinction servi (LIBELLE_EXTINCTION) blanchit une cible éteinte', () => {
    const synthese: TexteSynthese = {
      resume_praticien: `Q_STR_05 : ${LIBELLE_EXTINCTION}`,
    };
    expect(verifierRestitutionOrientation(synthese, FOURNIS)).toEqual([]);
  });

  it('le motif de STOP-STR, repris tel que donné, blanchit une cible éteinte', () => {
    // La consigne v25 : « reprends le motif d'arrêt tel qu'il t'est donné ».
    // C'est LE texte que le modèle a sous les yeux — s'il ne comptait pas comme
    // marqueur, la sortie la plus fidèle possible serait accusée.
    const stopStr = STOP_RULES_V1.find(regle => regle.id === 'STOP-STR');
    expect(stopStr).toBeDefined();
    const synthese: TexteSynthese = {
      resume_praticien: `Le BMS-10 (Q_STR_05) n'est plus proposé. ${stopStr?.motif}`,
    };
    expect(verifierRestitutionOrientation(synthese, FOURNIS)).toEqual([]);
  });

  it('la fenêtre est bornée par le HAUT dans les deux sens : un marqueur trop loin ne blanchit pas', () => {
    // 200 en amont, 420 en aval. Un remplissage clinique neutre qui pousse le
    // marqueur au-delà de ces bornes doit laisser l'écart : élargir l'une des
    // fenêtres — le geste qui multiplie les faux positifs sur `recommandes` —
    // doit rougir ici, pas passer en silence.
    const remplissage = 'Le dossier décrit un sommeil réparateur, une alimentation variée et une activité physique régulière. '.repeat(5);
    const apres: TexteSynthese = {
      resume_praticien: `Je retiens le Q_STR_05 pour la suite. ${remplissage} Une exploration n'est pas nécessaire en l'état.`,
    };
    expect(verifierRestitutionOrientation(apres, FOURNIS)).toEqual([
      { type: 'extinction', identifiant: 'Q_STR_05', sens: 'eteinte_presentee_recommandee' },
    ]);
    const avant: TexteSynthese = {
      resume_praticien: `Une exploration n'est pas nécessaire en l'état. ${remplissage.repeat(1)} Je retiens le Q_STR_05 pour la suite.`,
    };
    expect(verifierRestitutionOrientation(avant, FOURNIS)).toEqual([
      { type: 'extinction', identifiant: 'Q_STR_05', sens: 'eteinte_presentee_recommandee' },
    ]);
  });
});

describe('verifierRestitutionOrientation — un complément nommé en contexte prescriptif', () => {
  // Vocabulaire minimal, choisi pour ses pièges : « fer » est un sous-mot de
  // « ferritine » et le mot le plus fréquent de la prose biologique ; « zinc »
  // et « magnésium » se citent constamment comme analytes.
  const CATALOGUE = ['Fer', 'Zinc', 'Magnésium', 'Oméga-3', 'Mélatonine', 'Tyrosine'];
  const FOURNIS = { packs: [], questionnaires: [], complements: { vocabulaire: CATALOGUE } };

  const surResume = (resume_praticien: string) =>
    verifierRestitutionOrientation({ resume_praticien }, FOURNIS);

  it('signale une supplémentation conseillée', () => {
    expect(surResume('Une supplémentation en fer serait à envisager.'))
      .toEqual([{ type: 'complement', identifiant: 'Fer' }]);
  });

  it('signale une posologie, marqueur placé APRÈS le nom', () => {
    expect(surResume('Oméga-3 : 1000 mg par jour pendant huit semaines.'))
      .toEqual([{ type: 'complement', identifiant: 'Oméga-3' }]);
  });

  it('signale une cure nommée', () => {
    expect(surResume('Débuter une cure de magnésium.'))
      .toEqual([{ type: 'complement', identifiant: 'Magnésium' }]);
  });

  it('n’accuse pas une carence discutée comme biologie', () => {
    expect(surResume('Une carence en fer est plausible ; le bilan la confirmera.')).toEqual([]);
  });

  it('n’accuse pas un analyte cité dans un constat', () => {
    expect(surResume('Le statut en zinc reste à documenter avant toute conclusion.')).toEqual([]);
  });

  it('ne confond pas « ferritine » avec l’ingrédient « fer »', () => {
    // Sans recherche par mot entier, « ferritine » contiendrait « fer » et la
    // phrase la plus banale du dossier biologique deviendrait un écart.
    expect(surResume('Doser la ferritine ; prescrire le bilan martial complet.')).toEqual([]);
  });

  it('n’accuse pas « complément d’information », qui n’est pas un complément', () => {
    expect(surResume('Un complément d’information sur le fer sera utile.')).toEqual([]);
  });

  it('ne signale pas un complément porté par une intention déterministe', () => {
    expect(verifierRestitutionOrientation(
      { resume_praticien: 'Une supplémentation en fer est proposée.' },
      { packs: [], questionnaires: [], complements: { vocabulaire: CATALOGUE, autorises: ['Fer'] } },
    )).toEqual([]);
  });

  it('ne signale rien quand aucun vocabulaire n’est fourni', () => {
    expect(verifierRestitutionOrientation(
      { resume_praticien: 'Une supplémentation en fer est proposée.' },
      { packs: [], questionnaires: [] },
    )).toEqual([]);
  });

  it('ne compte qu’une fois un même ingrédient cité deux fois', () => {
    expect(surResume('Supplémentation en zinc. Le zinc, 15 mg par jour, sera réévalué.'))
      .toEqual([{ type: 'complement', identifiant: 'Zinc' }]);
  });

  it('couvre le narratif patient comme le résumé praticien', () => {
    expect(verifierRestitutionOrientation(
      { narratif_patient: 'Vous pourrez débuter une cure de mélatonine.' },
      FOURNIS,
    )).toEqual([{ type: 'complement', identifiant: 'Mélatonine' }]);
  });

  it('rend un écart de complément lisible au journal', () => {
    expect(formaterEcarts(surResume('Une supplémentation en tyrosine est conseillée.')))
      .toBe('complement:Tyrosine');
  });
});
