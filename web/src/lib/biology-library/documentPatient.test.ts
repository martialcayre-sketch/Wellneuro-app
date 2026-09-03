import { describe, expect, it } from 'vitest';
import { termeAnxiogene } from '@/lib/documents/vocabulaire';
import { genererDocumentPatientBiologie } from './documentPatient';
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
    ratios: [],
    ...surcharge,
  };
}

function entree(lignes: LignePanelProposition[]) {
  return {
    patientId: 'PAT_TEST',
    lignes,
    tableSha256: 'sha-fixture',
    dateDocument: '2026-09-03T00:00:00.000Z',
  };
}

describe('genererDocumentPatientBiologie', () => {
  it('rend le document dans le registre patient, prudent et complet', () => {
    const resultat = genererDocumentPatientBiologie(entree([
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
    expect(resultat.documentPatient.texte).toContain('Socle');
    expect(resultat.documentPatient.texte).toContain('Pourquoi : Situer l’état général.');
    expect(resultat.documentPatient.texte).toContain('À interpréter avec un médecin : Insulinémie.');
    // Le document se situe lui-même : ni ordonnance ni diagnostic (DC-31/32),
    // et la demande, jamais le résultat.
    expect(resultat.documentPatient.texte).toContain('ni une ordonnance ni un diagnostic');
    expect(resultat.documentPatient.texte).toContain('Aucun résultat d’analyse n’est conservé');
    expect(resultat.documentPatient.document.modeleId).toBe('document_patient_biologie');
    // Rendu destinataire patient : le badge du chokepoint, pas le cadre médecin.
    expect(resultat.documentPatient.html).toContain('Validé par votre praticien');
  });

  it('étage 2 actif : la phrase « aucun résultat conservé » cède la place à l’état réel', () => {
    const resultat = genererDocumentPatientBiologie({
      ...entree([ligne({ panelCode: 'PANEL_SOCLE', libelle: 'Socle' })]),
      resultatsActifs: true,
    });
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.documentPatient.texte).not.toContain('Aucun résultat d’analyse n’est conservé');
    expect(resultat.documentPatient.texte).toContain('consigner des mesures dans son outil');
  });

  it('le gabarit lui-même ne déclenche pas la garde anxiogène', () => {
    // La garde vit dans la route ; ce banc prouve que le chemin nominal ne la
    // fait pas crier — un gabarit qui alarme par construction rendrait le
    // refus confirmable permanent, donc décoratif.
    const resultat = genererDocumentPatientBiologie(entree([
      ligne({ panelCode: 'PANEL_SOCLE', libelle: 'Socle', objectif: 'Situer l’état général.' }),
    ]));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(termeAnxiogene(resultat.documentPatient.texte)).toBeNull();
  });

  it('un déclencheur non rempli s’écrit avec sa situation — jamais absent en silence', () => {
    const resultat = genererDocumentPatientBiologie(entree([
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
    expect(resultat.documentPatient.texte).toContain(
      'à envisager seulement dans certaines situations (Signes cliniques d’appel.)',
    );
  });

  it('dit au patient ce qui resterait à sa charge', () => {
    const resultat = genererDocumentPatientBiologie(entree([
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
    expect(resultat.documentPatient.texte).toContain('resterait à votre charge');
    expect(resultat.documentPatient.texte).toContain('Zinc érythrocytaire');
  });

  it('nomme les rapports calculés, et comme des calculs (D-072)', () => {
    const resultat = genererDocumentPatientBiologie(entree([
      ligne({
        panelCode: 'PANEL_GLU',
        libelle: 'Glucidique',
        ratios: [{ code: 'RATIO_HOMA', libelle: 'Indice HOMA' }],
      }),
    ]));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.documentPatient.texte).toContain('calculer : Indice HOMA');
  });

  it('refuse un document sans exploration proposée', () => {
    const resultat = genererDocumentPatientBiologie(entree([
      ligne({ panelCode: 'PANEL_CORTISOL', statut: 'non_indique_actuellement' }),
      ligne({ panelCode: 'PANEL_SOCLE', statut: 'deja_documente' }),
    ]));
    expect(resultat).toEqual({ ok: false, raison: 'aucune_exploration_proposee' });
  });

  it('un libellé au registre prescriptif ne refuse PAS ici — deux registres, deux gardes', () => {
    // « Dosage » est interdit du REGISTRE MÉDECIN (chokepoint du courrier) ;
    // le registre patient est gardé sur l'ANXIOGÈNE, côté route, en refus
    // confirmable. Ce banc fige la frontière : la confondre ferait refuser au
    // patient un mot que seul le courrier proscrit.
    const resultat = genererDocumentPatientBiologie(entree([
      ligne({ panelCode: 'PANEL_FER', libelle: 'Dosage de la ferritine' }),
    ]));
    expect(resultat.ok).toBe(true);
  });
});

describe('couplage rendu ↔ consigné (patron M1, D-073)', () => {
  it('le texte consigné EST le contenu patient du document rendu', () => {
    const resultat = genererDocumentPatientBiologie(entree([
      ligne({ panelCode: 'PANEL_SOCLE', libelle: 'Socle' }),
    ]));
    if (!resultat.ok) throw new Error('refus inattendu');
    const bloc = resultat.documentPatient.document.blocs[0];
    expect(bloc.contenu.patient).toBe(resultat.documentPatient.texte);
    expect(bloc.provenance).toEqual({
      source: 'biologie_proposition',
      ancrageHash: 'sha-fixture',
      version: 'indications-biologie-v1',
    });
  });
});
