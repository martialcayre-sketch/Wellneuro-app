import { describe, expect, it } from 'vitest';
import type { SyntheseSchema } from '@/lib/anthropic';
import {
  assemblerDocument,
  avancerEtat,
  blocsDepuisSynthese,
  MODELE_SUIVI_21J,
  renderDocumentHtml,
  type DocumentComposite,
} from '@/lib/documents';

// Parcours V1 de bout en bout (C3 LOT-04), en domaine pur : synthèse validée →
// blocs → assemblage → machine d'états jusqu'à « validé »/« envoyé » → rendus par
// destinataire. Vérifie que la frontière de données tient sur tout le parcours.

function syntheseValidee(): SyntheseSchema {
  return {
    resume_praticien: 'Synthèse clinique INTERNE praticien',
    axes_prioritaires: [
      { axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['réveils nocturnes'], points_a_confirmer: ['ferritine'] },
    ],
    points_de_vigilance: ['fatigue diurne'],
    questions_entretien: ['Depuis quand les réveils ?'],
    narratif_patient: 'Vos réponses évoquent un sommeil fragmenté à accompagner en douceur.',
    limites: 'À valider par le praticien.',
  };
}

function parcoursValide(): DocumentComposite {
  const blocs = blocsDepuisSynthese({
    syntheseJson: syntheseValidee(),
    statut: 'Validee_Praticien',
    versionPrompt: 'synthese-v3',
    dateValidation: '2026-07-18T00:00:00.000Z',
  });
  const brouillon = assemblerDocument({ modele: MODELE_SUIVI_21J, patientId: 'PAT_1', blocs });
  const relu = avancerEtat(brouillon, 'relu');
  const valide = avancerEtat(relu, 'valide', { parActionPraticien: true });
  return avancerEtat(valide, 'envoye');
}

describe('Parcours C3 V1 — composition → états → rendus', () => {
  it('mène un document de brouillon à envoyé par validation humaine', () => {
    const doc = parcoursValide();
    expect(doc.etat).toBe('envoye');
    expect(doc.version.hash).toHaveLength(64);
  });

  it('produit trois rendus distincts, frontière de données tenue', () => {
    const doc = parcoursValide();
    const patient = renderDocumentHtml(doc, 'patient');
    const medecin = renderDocumentHtml(doc, 'medecin');
    const praticien = renderDocumentHtml(doc, 'praticien');

    // Patient : narratif + badge, aucun contenu interne.
    expect(patient).toContain('sommeil fragmenté');
    expect(patient).toContain('Validé par votre praticien');
    expect(patient).not.toContain('INTERNE praticien');
    expect(patient).not.toContain('Depuis quand');

    // Médecin : explorations à discuter, aucun interne, aucun terme prescriptif.
    expect(medecin).toContain('explorations à discuter');
    expect(medecin).toContain('Piste à explorer : Sommeil');
    expect(medecin).not.toContain('INTERNE praticien');

    // Praticien : rendu complet.
    expect(praticien).toContain('INTERNE praticien');
    expect(praticien).toContain('Depuis quand');
  });

  it('bloque toute diffusion si la synthèse n’est pas validée', () => {
    const blocs = blocsDepuisSynthese({
      syntheseJson: syntheseValidee(),
      statut: 'Brouillon_IA',
      versionPrompt: 'synthese-v3',
    });
    const doc = assemblerDocument({ modele: MODELE_SUIVI_21J, patientId: 'PAT_1', blocs });
    const patient = renderDocumentHtml(doc, 'patient');
    const medecin = renderDocumentHtml(doc, 'medecin');
    expect(patient).toContain('Aucun contenu diffusé');
    expect(medecin).toContain('Aucun contenu diffusé');
  });
});
