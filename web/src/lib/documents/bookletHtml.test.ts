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
    expect(html).not.toContain('axes prioritaires');
  });

  it('attribue honnêtement au praticien un booklet issu d’un brouillon manuel', () => {
    const html = buildBookletHTML('Sophie Nicola', '18 juillet 2026', synthese(), '', {
      assistanceIA: false,
    });
    expect(html).toContain('Document rédigé et validé par votre praticien.');
    expect(html).not.toContain('assistance d’intelligence artificielle');
  });

  // Le booklet part par e-mail AU PATIENT. Le field-filter de `depuisSynthese`
  // est formel : vigilance = « praticien + médecin, jamais patient » ; questions
  // d'entretien = « praticien uniquement ». Le booklet lisait `syntheseJson`
  // directement et contournait ce filtre. Ces deux cas le rendent impossible.
  it("ne rend JAMAIS les points de vigilance, même renseignés", () => {
    const html = buildBookletHTML('X', '2026', synthese(), '');
    expect(html).not.toContain('Points de vigilance');
    expect(html).not.toContain('fatigue');
  });

  it("ne rend JAMAIS les questions d'entretien, même renseignées", () => {
    const html = buildBookletHTML('X', '2026', synthese(), '');
    expect(html).not.toContain('Questions pour la consultation');
    expect(html).not.toContain('Depuis quand ?');
  });

  // Le cas qui a motivé la correction : la vigilance déterministe recopie les
  // signaux d'alerte déclarés par le patient. Reçue seule dans une boîte mail,
  // sans praticien en face, cette phrase est exactement ce qu'il ne faut pas
  // envoyer.
  it("ne laisse pas fuir un signal d'alerte déclaré par le patient", () => {
    const s: SyntheseSchema = {
      ...synthese(),
      points_de_vigilance: [
        "Signal d'alerte signalé par le patient : Idées noires ou suicidaires — avis médical à évaluer en priorité.",
      ],
    };
    const html = buildBookletHTML('X', '2026', s, '');
    expect(html).not.toContain('Idées noires');
    expect(html).not.toContain('avis médical à évaluer en priorité');
  });
});
