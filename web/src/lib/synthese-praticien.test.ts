import { describe, expect, it } from 'vitest';
import {
  LIMITE_SYNTHESE_PRATICIEN,
  MODELE_REDACTION_PRATICIEN,
  estRedactionPraticien,
  nouveauBrouillonPraticien,
  validerBrouillonPraticien,
} from './synthese-praticien';

describe('brouillon de synthèse praticien', () => {
  it('crée un brouillon vide identifié comme rédaction praticien', () => {
    expect(estRedactionPraticien(MODELE_REDACTION_PRATICIEN)).toBe(true);
    expect(nouveauBrouillonPraticien()).toMatchObject({
      resume_praticien: '',
      narratif_patient: '',
      limites: LIMITE_SYNTHESE_PRATICIEN,
    });
  });

  it('normalise un brouillon complet sans accepter de limites personnalisées', () => {
    const resultat = validerBrouillonPraticien({
      resume_praticien: '  Résumé interne  ',
      narratif_patient: '  Texte patient  ',
      axes_prioritaires: [{
        axe: ' Sommeil ',
        niveau_priorite: 'modere',
        arguments: [' Réveils nocturnes ', ''],
        points_a_confirmer: [],
      }],
      points_de_vigilance: [' Fatigue '],
      questions_entretien: [' Depuis quand ? '],
      limites: 'Texte injecté',
    });

    expect(resultat).toEqual({
      ok: true,
      synthese: expect.objectContaining({
        resume_praticien: 'Résumé interne',
        narratif_patient: 'Texte patient',
        axes_prioritaires: [{
          axe: 'Sommeil',
          niveau_priorite: 'modere',
          arguments: ['Réveils nocturnes'],
          points_a_confirmer: [],
        }],
        limites: LIMITE_SYNTHESE_PRATICIEN,
      }),
    });
  });

  it('refuse un brouillon sans texte patient', () => {
    const resultat = validerBrouillonPraticien({
      ...nouveauBrouillonPraticien(),
      resume_praticien: 'Résumé',
    });
    expect(resultat).toEqual({ ok: false, error: 'Le texte destiné au patient est requis.' });
  });
});
