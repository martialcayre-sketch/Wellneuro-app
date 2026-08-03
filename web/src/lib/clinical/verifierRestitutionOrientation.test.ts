import { describe, expect, it } from 'vitest';
import { PACKS_REGISTRY } from '@/lib/questionnaires-functional';
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
