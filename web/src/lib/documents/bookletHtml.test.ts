import { describe, expect, it } from 'vitest';
import type { SyntheseSchema } from '@/lib/anthropic';
import { buildBookletHTML } from './bookletHtml';

function synthese(): SyntheseSchema {
  return {
    resume_praticien: 'Résumé',
    axes_prioritaires: [
      { axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['réveils'], points_a_confirmer: ['ferritine'] },
    ],
    points_de_vigilance: ['fatigue'],
    questions_entretien: ['Depuis quand ?'],
    narratif_patient: 'Vos réponses évoquent un sommeil fragmenté.',
    limites: 'À valider.',
  };
}

describe('buildBookletHTML (extrait de la route booklet)', () => {
  it('produit un document HTML autonome badgé praticien', () => {
    const html = buildBookletHTML('Sophie Nicola', '18 juillet 2026', synthese(), 'Note interne');
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('Validé par votre praticien');
    expect(html).toContain('Sophie Nicola');
    expect(html).toContain('sommeil fragmenté');
    expect(html).toContain('Priorité élevée');
    expect(html).toContain('Note interne');
  });

  it('échappe les valeurs dynamiques', () => {
    const html = buildBookletHTML('<b>x</b>', '2026', synthese(), '');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('omet les sections vides', () => {
    const s: SyntheseSchema = { ...synthese(), points_de_vigilance: [], questions_entretien: [], axes_prioritaires: [] };
    const html = buildBookletHTML('X', '2026', s, '');
    expect(html).not.toContain('Points de vigilance');
    expect(html).not.toContain('Questions pour la consultation');
    expect(html).not.toContain('axes prioritaires');
  });
});
