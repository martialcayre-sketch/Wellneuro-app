import { describe, expect, it } from 'vitest';
import { preparerCorrespondance } from '@/lib/praticien/correspondanceMedecin';
import { genererCourrierBiologie } from './courrier';
import type { LignePanelProposition } from './statuts';

const REMBOURSEMENT_NON_EVALUE = {
  statut: 'non_evalue' as const,
  conditions: [],
  codesActesRetenus: [],
};

function ligne(
  surcharge: Partial<LignePanelProposition> & { panelCode: string },
): LignePanelProposition {
  return {
    libelle: surcharge.panelCode,
    niveau: 'socle',
    objectif: null,
    statut: 'recommande',
    declencheurRempli: null,
    condition: null,
    motifs: [],
    justificationClaims: [{ claimId: 'WN-CL-9999-001', versionClaim: 'v1.0' }],
    analytes: [],
    ...surcharge,
  };
}

function entree(lignes: LignePanelProposition[]) {
  return {
    patientId: 'PAT_TEST',
    lignes,
    tableSha256: 'sha-fixture',
    dateCourrier: '2026-08-15T00:00:00.000Z',
  };
}

describe('genererCourrierBiologie', () => {
  it('rend un courrier non prescriptif par le chokepoint médecin', () => {
    const resultat = genererCourrierBiologie(entree([
      ligne({
        panelCode: 'PANEL_SOCLE',
        libelle: 'Socle',
        objectif: 'Situer l’état général.',
        analytes: [
          {
            code: 'BIO_INS',
            libelle: 'Insulinémie',
            validationMedicaleRequise: true,
            remboursement: REMBOURSEMENT_NON_EVALUE,
          },
        ],
      }),
    ]));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.courrier.html).toContain('Socle');
    expect(resultat.courrier.html).toContain('Insulinémie');
    expect(resultat.courrier.texte).toContain('Interprétation médicale requise pour : Insulinémie.');
    expect(resultat.courrier.texte).toContain('vous appartient pleinement');
    // Aucune valeur d'analyse, jamais : le courrier le dit explicitement.
    expect(resultat.courrier.texte).toContain('Aucun résultat d’analyse n’est conservé');
    expect(resultat.courrier.document.modeleId).toBe('courrier_biologie');
  });

  it('un déclencheur non rempli s’écrit avec sa condition — jamais absent en silence', () => {
    const resultat = genererCourrierBiologie(entree([
      ligne({
        panelCode: 'PANEL_HORMONAL',
        libelle: 'Bilan hormonal',
        statut: 'conditionnel',
        declencheurRempli: false,
        condition: 'Signes cliniques d’appel.',
      }),
    ]));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.courrier.texte).toContain('à envisager seulement si : Signes cliniques d’appel.');
  });

  it('signale les analytes hors nomenclature', () => {
    const resultat = genererCourrierBiologie(entree([
      ligne({
        panelCode: 'PANEL_MICRO',
        libelle: 'Micronutrition',
        analytes: [{
          code: 'BIO_ZNC',
          libelle: 'Zinc érythrocytaire',
          validationMedicaleRequise: false,
          remboursement: { statut: 'hors_nomenclature', conditions: [], codesActesRetenus: [] },
        }],
      }),
    ]));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.courrier.texte).toContain('Hors nomenclature');
  });

  it('refuse un courrier sans exploration proposée', () => {
    const resultat = genererCourrierBiologie(entree([
      ligne({ panelCode: 'PANEL_CORTISOL', statut: 'non_indique_actuellement' }),
      ligne({ panelCode: 'PANEL_SOCLE', statut: 'deja_documente' }),
    ]));
    expect(resultat).toEqual({ ok: false, raison: 'aucune_exploration_proposee' });
  });

  it('refuse au lieu de rendre si un libellé porte un terme prescriptif', () => {
    const resultat = genererCourrierBiologie(entree([
      ligne({ panelCode: 'PANEL_FER', libelle: 'Dosage de la ferritine' }),
    ]));
    expect(resultat).toEqual({ ok: false, raison: 'terme_prescriptif' });
  });

  it('produit un texte consignable tel quel par preparerCorrespondance', () => {
    const resultat = genererCourrierBiologie(entree([
      ligne({ panelCode: 'PANEL_SOCLE', libelle: 'Socle' }),
    ]));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    const preparation = preparerCorrespondance({
      idPatient: 'PAT_TEST',
      praticienEmail: 'praticien@wellneuro.fr',
      sens: 'sortant',
      medecinLibelle: 'Médecin traitant de Sophie Nicola',
      texte: resultat.courrier.texte,
    });
    expect(preparation.ok).toBe(true);
  });
});
