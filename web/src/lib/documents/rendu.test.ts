import { describe, expect, it } from 'vitest';
import { renderDocumentHtml } from './rendu';
import { assemblerDocument } from './document';
import { MODELE_SUIVI_21J } from './modele';
import { blocsDepuisSynthese } from './depuisSynthese';
import type { SyntheseSchema } from '@/lib/anthropic';
import { contientTermePrescriptif } from './vocabulaire';

function docValide() {
  const s: SyntheseSchema = {
    resume_praticien: 'Résumé clinique STRICTEMENT interne',
    axes_prioritaires: [
      { axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['réveils'], points_a_confirmer: [] },
    ],
    points_de_vigilance: ['fatigue'],
    questions_entretien: ['Depuis quand ?'],
    narratif_patient: 'Vos réponses évoquent un sommeil fragmenté.',
    limites: 'À valider.',
  };
  const blocs = blocsDepuisSynthese({
    syntheseJson: s,
    statut: 'Validee_Praticien',
    versionPrompt: 'synthese-v3',
    dateValidation: '2026-07-18T00:00:00.000Z',
  });
  return assemblerDocument({ modele: MODELE_SUIVI_21J, patientId: 'PAT_1', blocs });
}

describe('renderDocumentHtml', () => {
  it('rend un document HTML autonome', () => {
    const html = renderDocumentHtml(docValide(), 'patient', { patientNom: 'Sophie Nicola', dateDocument: '18 juillet 2026' });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Sophie Nicola');
  });

  it('rendu patient : badge « Validé par votre praticien », aucun champ interne', () => {
    const html = renderDocumentHtml(docValide(), 'patient');
    expect(html).toContain('Validé par votre praticien');
    expect(html).toContain('sommeil fragmenté');
    expect(html).not.toContain('STRICTEMENT interne');
    expect(html).not.toContain('Depuis quand ?'); // question d'entretien = praticien only
    expect(html).not.toContain('Piste à explorer'); // axes non diffusés au patient
  });

  it('rendu médecin : cadre « explorations à discuter », sans terme prescriptif', () => {
    const html = renderDocumentHtml(docValide(), 'medecin');
    expect(html).toContain('explorations à discuter');
    expect(html).toContain('Piste à explorer : Sommeil');
    expect(html).not.toContain('STRICTEMENT interne');
    expect(contientTermePrescriptif(html)).toBe(false);
  });

  it('rendu praticien : rendu complet sourcé', () => {
    const html = renderDocumentHtml(docValide(), 'praticien');
    expect(html).toContain('Résumé clinique STRICTEMENT interne');
    expect(html).toContain('Depuis quand ?');
    expect(html).not.toContain('Validé par votre praticien'); // badge patient seulement
  });

  it('échappe les valeurs dynamiques (pas d’injection HTML)', () => {
    const html = renderDocumentHtml(docValide(), 'patient', { patientNom: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
