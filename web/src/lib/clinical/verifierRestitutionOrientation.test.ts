import { describe, expect, it } from 'vitest';
import { verifierRestitutionOrientation, type TexteSynthese } from './verifierRestitutionOrientation';

// Le garde de restitution du LOT-06. Ce qu'il doit prouver n'est pas « le modèle
// n'invente rien » — indécidable — mais l'énoncé borné qui l'approche : un nom
// du vocabulaire fermé des packs apparaît-il hors de ceux transmis.

const VIDE: TexteSynthese = {};

describe('verifierRestitutionOrientation', () => {
  it('ne signale rien sur une synthèse vide', () => {
    expect(verifierRestitutionOrientation(VIDE, [])).toEqual([]);
  });

  it('ne signale rien quand la synthèse ne cite aucun pack', () => {
    const synthese: TexteSynthese = {
      resume_praticien: 'Le patient rapporte un sommeil fragmenté depuis trois mois.',
      points_de_vigilance: ['Avis médical prioritaire sur les céphalées récentes.'],
    };
    expect(verifierRestitutionOrientation(synthese, [])).toEqual([]);
  });

  it('signale un pack cité alors qu’aucun n’a été transmis', () => {
    const synthese: TexteSynthese = {
      resume_praticien: 'Je recommande le pack Sommeil et chronobiologie.',
    };
    expect(verifierRestitutionOrientation(synthese, [])).toEqual(['pack_sommeil_chronobiologie']);
  });

  it('ne signale pas un pack qui a bien été transmis', () => {
    const synthese: TexteSynthese = {
      resume_praticien: 'Le pack Sommeil et chronobiologie est proposé par la table.',
    };
    expect(verifierRestitutionOrientation(synthese, ['pack_sommeil_chronobiologie'])).toEqual([]);
  });

  it('signale le pack en trop quand un autre a été transmis', () => {
    const synthese: TexteSynthese = {
      resume_praticien:
        'La table propose le pack Sommeil et chronobiologie ; j’ajoute le pack Stress chronique et burnout.',
    };
    expect(verifierRestitutionOrientation(synthese, ['pack_sommeil_chronobiologie'])).toEqual([
      'pack_stress_chronique_burnout',
    ]);
  });

  it('reste insensible à la casse, aux accents et à la ponctuation', () => {
    // Le registre écrit « Pediatrie, neurodeveloppement et oralite » sans
    // accents ; un modèle écrira « Pédiatrie, neurodéveloppement et oralité ».
    // Comparer sans normaliser ne verrait rien passer.
    const synthese: TexteSynthese = {
      narratif_patient: 'un PÉDIATRIE — NEURODÉVELOPPEMENT ET ORALITÉ vous sera proposé',
    };
    expect(verifierRestitutionOrientation(synthese, [])).toEqual([
      'pack_pediatrie_neurodeveloppement_oralite',
    ]);
  });

  it('détecte un slug recopié, pas seulement un titre', () => {
    const synthese: TexteSynthese = {
      limites: 'Identifiant retenu : pack_migraine_cephalees.',
    };
    expect(verifierRestitutionOrientation(synthese, [])).toEqual(['pack_migraine_cephalees']);
  });

  it('inspecte tous les champs texte, y compris à l’intérieur des axes', () => {
    const synthese: TexteSynthese = {
      axes_prioritaires: [
        {
          axe: 'Digestif',
          arguments: ['Orienter vers le pack Digestif et intestin-cerveau.'],
          points_a_confirmer: [],
        },
      ],
    };
    expect(verifierRestitutionOrientation(synthese, [])).toEqual(['pack_digestif_intestin_cerveau']);
  });

  it('signale plusieurs écarts à la fois', () => {
    const synthese: TexteSynthese = {
      questions_entretien: [
        'Envisager le pack Migraine et cephalees ?',
        'Ou le pack Tabacologie officinale ?',
      ],
    };
    expect(verifierRestitutionOrientation(synthese, []).sort()).toEqual(
      ['pack_migraine_cephalees', 'pack_tabacologie_officinale'].sort(),
    );
  });
});
