import { describe, expect, it } from 'vitest';
import { TEXTE_ENQUETE_ALIMENTAIRE_INCOMPLETE, texteScoreNonCalcule } from './enqueteAlimentaireIncomplete';
import { SYSTEM_PROMPT_GOUVERNANCE } from '@/lib/anthropic';

describe('texteScoreNonCalcule ([[D-517]])', () => {
  it('rend le texte validé sur une enquête SIIN refusée pour recueil incomplet', () => {
    expect(texteScoreNonCalcule({ type: 'seuils_points', scored: false, total: null, missing: 3 }))
      .toBe(TEXTE_ENQUETE_ALIMENTAIRE_INCOMPLETE);
  });

  it.each([
    ['résultat absent', null],
    ['enquête complète', { type: 'seuils_points', scored: true, total: 60, missing: 0 }],
    ['recueil vide (motif du vide, sans compte)', { type: 'seuils_points', scored: false, total: null }],
    ['passation calculée avant D-517, avec manquants', { type: 'seuils_points', scored: true, total: 12, missing: 45 }],
    ['autre moteur non scoré avec manquants', { type: 'apports_ponderes', scored: false, total: null, missing: 2 }],
  ])('ne rend rien : %s', (_nom, scores) => {
    expect(texteScoreNonCalcule(scores as Record<string, unknown> | null)).toBeNull();
  });
});

describe('consigne de synthèse — le refus de calcul à la racine (synthese-v35)', () => {
  it('dit de reprendre raisonNonScore, sans bande ni total reconstitué', () => {
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('**à sa racine**, **scored** à false et un **raisonNonScore**');
    // Le mot pour mot ne vaut que pour le texte validé : le motif technique de
    // `apports_ponderes` (« apport protéique nul — passation incomplète ») se
    // reprend en son sens, jamais comme un apport mesuré.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain(`Quand il vaut « ${TEXTE_ENQUETE_ALIMENTAIRE_INCOMPLETE} », reprends-le tel qu'il est écrit ; tout autre motif, reprends-en le sens`);
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('ne reconstitue aucun total, ni depuis ses dimensions, ni depuis ses réponses');
  });
});
