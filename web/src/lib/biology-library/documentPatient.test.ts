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

  // D-316 §1-§2 : trois états dits, la remboursable tue ; jamais qui paie.
  function etat(statut: 'remboursable' | 'remboursable_si_groupe' | 'hors_nomenclature' | 'non_evalue') {
    return { statut, conditions: [], codesActesRetenus: [] };
  }

  it('dit chaque état de remboursement au patient, sans dire qui paie (D-316)', () => {
    const resultat = genererDocumentPatientBiologie(entree([
      ligne({
        panelCode: 'PANEL_MICRO',
        libelle: 'Micronutrition',
        analytes: [
          { code: 'BIO_FER', libelle: 'Ferritine', validationMedicaleRequise: false, remboursement: etat('remboursable') },
          { code: 'BIO_TSH', libelle: 'TSH', validationMedicaleRequise: false, remboursement: etat('remboursable_si_groupe') },
          { code: 'BIO_HCY', libelle: 'Homocystéine', validationMedicaleRequise: false, remboursement: etat('hors_nomenclature') },
          { code: 'BIO_FOL', libelle: 'Folates', validationMedicaleRequise: false, remboursement: etat('non_evalue') },
        ],
      }),
    ]));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    const texte = resultat.documentPatient.texte;
    expect(texte).toContain(
      'Remboursement par l’assurance maladie non vérifié à ce jour : Folates. '
      + 'Remboursé seulement s’il est demandé avec d’autres examens : TSH. '
      + 'Non remboursé par l’assurance maladie : Homocystéine.',
    );
    // La remboursable n'a pas de mention : elle n'est nommée qu'à « ce qui serait analysé ».
    expect(texte.match(/Ferritine/g)).toHaveLength(1);
    expect(texte).not.toMatch(/à votre charge|pris en charge/);
    expect(termeAnxiogene(texte)).toBeNull();
  });

  it('une ligne entièrement remboursable ne porte aucune mention de remboursement', () => {
    const resultat = genererDocumentPatientBiologie(entree([
      ligne({
        panelCode: 'PANEL_FER',
        libelle: 'Fer',
        analytes: [
          { code: 'BIO_FER', libelle: 'Ferritine', validationMedicaleRequise: false, remboursement: etat('remboursable') },
        ],
      }),
    ]));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.documentPatient.texte).not.toMatch(/rembours/i);
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

describe('longueur au catalogue complet (D-316)', () => {
  // Jumeau du banc du courrier (`courrier.test.ts`, revue B1), même borne de
  // consignation (8 000, route du document patient) et mêmes dimensions : les
  // mentions de remboursement se disent une fois, des analyses distinctes.
  it('quinze panels proposés, tout non évalué, tiennent sous la borne', () => {
    const lignes = Array.from({ length: 15 }, (_, i) =>
      ligne({
        panelCode: `PANEL_${i}`,
        libelle: `Panel tableau clinique ${i}`.padEnd(30, 'x'),
        statut: 'conditionnel',
        declencheurRempli: false,
        condition: 'Signes cliniques d’appel persistants au questionnaire dédié.',
        analytes: Array.from({ length: 4 }, (_, j) => ({
          code: `BIO_${(i * 4 + j) % 35}`,
          libelle: `Analyte ${(i * 4 + j) % 35}`.padEnd(35, 'x'),
          validationMedicaleRequise: j === 0,
          remboursement: REMBOURSEMENT_NON_EVALUE,
        })),
        ratios: i < 2 ? [{ code: `RATIO_${i}`, libelle: `Rapport calculé ${i}` }] : [],
      }));
    const resultat = genererDocumentPatientBiologie(entree(lignes));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.documentPatient.texte.length).toBeLessThan(8000);
    // Une seule mention, quelle que soit la répétition des analyses.
    expect(resultat.documentPatient.texte.match(/non vérifié à ce jour/g)).toHaveLength(1);
  });
});

describe('genererDocumentPatientBiologie — compositions signées (D-323 §2-§4)', () => {
  it('un groupe dit son acte, ce pour quoi il est demandé et ses constituants ; un calculé, ses mesures', () => {
    const resultat = genererDocumentPatientBiologie(entree([
      ligne({
        panelCode: 'PANEL_FATIGUE',
        libelle: 'Fatigue',
        analytes: [
        {
          code: 'BIO_NFS',
          libelle: 'Numération formule sanguine',
          validationMedicaleRequise: false,
          remboursement: { statut: 'remboursable' as const, conditions: [], codesActesRetenus: ['1104'] },
          constituants: [
            { code: 'BIO_HEMOGLOBINE', libelle: 'Hémoglobine', validationMedicaleRequise: true, proposeParLeBilan: true },
            { code: 'BIO_PLAQUETTES', libelle: 'Plaquettes', validationMedicaleRequise: false, proposeParLeBilan: false },
          ],
          demandeePour: [{ code: 'BIO_HEMOGLOBINE', libelle: 'Hémoglobine' }],
        },
        {
          code: 'BIO_RATIO_HOMA',
          libelle: 'Indice HOMA',
          validationMedicaleRequise: false,
          remboursement: {
            statut: 'remboursable' as const,
            conditions: [],
            codesActesRetenus: ['0552', '7422'],
            parMesures: [
              { code: 'BIO_GLYCEMIE_JEUN', libelle: 'Glycémie à jeun', statut: 'remboursable' as const, codesActes: ['0552'] },
              { code: 'BIO_INSULINE', libelle: 'Insuline', statut: 'remboursable' as const, codesActes: ['7422'] },
            ],
          },
        },
        ],
      }),
    ]));
    if (!resultat.ok) throw new Error(resultat.raison);
    const texte = resultat.documentPatient.texte;
    expect(texte).toContain('Ce qui serait analysé : Indice HOMA.');
    expect(texte).toContain(
      'Numération formule sanguine (acte 1104), analyse demandée pour : Hémoglobine — comprend : Hémoglobine, Plaquettes.',
    );
    expect(texte).toContain('Indice HOMA : remboursé par ses mesures (Glycémie à jeun 0552, Insuline 7422).');
    // Rangée sous son groupe, l'hémoglobine garde son exigence de validation.
    expect(texte).toContain('À interpréter avec un médecin : Hémoglobine.');
  });
});
