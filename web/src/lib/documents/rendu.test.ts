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

  // Ce cadre devient du PAPIER au LOT-03, signé « Docteur en Pharmacie ».
  // « Confraternel » y laissait lire une qualité que l'auteur n'a pas, pour
  // un gain nul : la phrase dit déjà que ce sont des explorations à discuter.
  // Le mot ne revient pas par une reformulation — ce banc le tient.
  it('rendu médecin : l’échange est INTERPROFESSIONNEL, jamais confraternel', () => {
    const html = renderDocumentHtml(docValide(), 'medecin');
    expect(html).toContain('échange interprofessionnel');
    expect(html.toLowerCase()).not.toContain('confratern');
  });

  // LE CADRE ET LE TITRE SUIVENT LE MODÈLE ([[D-218]], constat de revue). Ils
  // étaient en dur : la lettre d'adressage — qui ne transmet AUCUNE exploration
  // et demande un avis médical avant toute proposition — s'imprimait sous un
  // en-tête « explorations à discuter », chez un médecin. La garde ne le voit
  // pas : elle juge le corps, pas ces trois phrases fixes.
  it('rendu médecin : la lettre d’adressage n’annonce PAS des explorations', () => {
    const document = { ...docValide(), modeleId: 'courrier_adressage' };
    const html = renderDocumentHtml(document, 'medecin');
    expect(html).toContain('adressage sur signal d’alerte');
    expect(html).toContain('déclarés par le patient');
    expect(html).not.toContain('explorations à discuter');
    expect(html).not.toContain('éléments à discuter');
  });

  it('un modèle inconnu de la table garde le libellé historique', () => {
    // Ajouter un modèle ne doit rien changer aux rendus existants.
    const html = renderDocumentHtml(docValide(), 'medecin');
    expect(html).toContain('explorations à discuter');
    expect(html).toContain('éléments à discuter');
  });

  // Banc de câblage (Socle LOT-01, carte des chemins sortants —
  // `documents/vocabulaire.ts`) : la garde est indissociable du chokepoint.
  // Retirer l'appel à `assertRenduMedecinNonPrescriptif` de `rendu.ts` rend
  // ce test rouge — `vocabulaire.test.ts` ne prouve que la fonction, pas
  // son câblage.
  it('rendu médecin : un contenu prescriptif fait lever le rendu au chokepoint', () => {
    const s: SyntheseSchema = {
      resume_praticien: 'Résumé interne',
      axes_prioritaires: [
        { axe: 'Sommeil (posologie à revoir)', niveau_priorite: 'eleve', arguments: ['réveils'], points_a_confirmer: [] },
      ],
      points_de_vigilance: ['fatigue'],
      questions_entretien: [],
      narratif_patient: 'Vos réponses évoquent un sommeil fragmenté.',
      limites: 'À valider.',
    };
    const blocs = blocsDepuisSynthese({
      syntheseJson: s,
      statut: 'Validee_Praticien',
      versionPrompt: 'synthese-v3',
      dateValidation: '2026-07-18T00:00:00.000Z',
    });
    const doc = assemblerDocument({ modele: MODELE_SUIVI_21J, patientId: 'PAT_1', blocs });
    expect(() => renderDocumentHtml(doc, 'medecin')).toThrow(/prescriptive/);
    // La garde est propre au registre médecin : le même document se rend pour
    // le praticien — surface interne, franchise clinique voulue.
    expect(() => renderDocumentHtml(doc, 'praticien')).not.toThrow();
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
