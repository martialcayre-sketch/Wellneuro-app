import { describe, expect, it } from 'vitest';
import type { SyntheseSchema } from '@/lib/anthropic';
import { blocsDepuisSynthese, type SyntheseSource } from './depuisSynthese';
import { blocsPourDestinataire, contenuPourDestinataire, estBlocDiffusable } from './bloc';

function synthese(): SyntheseSchema {
  return {
    resume_praticien: 'Résumé clinique interne',
    axes_prioritaires: [
      { axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['réveils nocturnes'], points_a_confirmer: [] },
    ],
    points_de_vigilance: ['fatigue diurne'],
    questions_entretien: ['Depuis quand ?'],
    narratif_patient: 'Vos réponses évoquent un sommeil fragmenté.',
    limites: 'À valider par le praticien.',
  };
}

function source(statut: SyntheseSource['statut']): SyntheseSource {
  return { syntheseJson: synthese(), statut, versionPrompt: 'synthese-v3', dateValidation: '2026-07-18T00:00:00.000Z' };
}

describe('blocsDepuisSynthese — field-filter par construction', () => {
  it('ancre la provenance sur versionPrompt + date (pas d’inputHash)', () => {
    const blocs = blocsDepuisSynthese(source('Validee_Praticien'));
    expect(blocs[0].provenance.ancrageHash).toBe('synthese-v3#2026-07-18T00:00:00.000Z');
    expect(blocs[0].provenance.version).toBe('synthese-v3');
    expect(blocs[0].provenance.statutSource).toBe('Validee_Praticien');
  });

  it('le narratif est patient + médecin, jamais le résumé praticien côté patient', () => {
    const blocs = blocsDepuisSynthese(source('Validee_Praticien'));
    const narratif = blocs.find((b) => b.id === 'synthese_narratif')!;
    expect(contenuPourDestinataire(narratif, 'patient')).toContain('sommeil fragmenté');
    expect(contenuPourDestinataire(narratif, 'praticien')).toBe('Résumé clinique interne');
    // Le patient ne voit jamais le résumé praticien.
    expect(contenuPourDestinataire(narratif, 'patient')).not.toContain('Résumé clinique interne');
  });

  it('les axes ne sont jamais diffusés au patient, « piste à explorer » au médecin', () => {
    const blocs = blocsDepuisSynthese(source('Validee_Praticien'));
    const patient = blocsPourDestinataire(blocs, 'patient').map((b) => b.id);
    expect(patient).not.toContain('synthese_axe_0');
    const axe = blocs.find((b) => b.id === 'synthese_axe_0')!;
    expect(contenuPourDestinataire(axe, 'medecin')).toBe('Piste à explorer : Sommeil');
    expect(contenuPourDestinataire(axe, 'patient')).toBeNull();
  });

  it('les questions d’entretien restent praticien uniquement', () => {
    const blocs = blocsDepuisSynthese(source('Validee_Praticien'));
    const q = blocs.find((b) => b.id === 'synthese_question_0')!;
    expect(contenuPourDestinataire(q, 'praticien')).toBe('Depuis quand ?');
    expect(contenuPourDestinataire(q, 'patient')).toBeNull();
    expect(contenuPourDestinataire(q, 'medecin')).toBeNull();
  });

  it('un statut non validé rend tous les blocs non diffusables (garde de régime IA)', () => {
    const blocs = blocsDepuisSynthese(source('Brouillon_IA'));
    expect(blocs.every((b) => !estBlocDiffusable(b))).toBe(true);
    expect(blocsPourDestinataire(blocs, 'patient')).toHaveLength(0);
    expect(blocsPourDestinataire(blocs, 'medecin')).toHaveLength(0);
  });
});
