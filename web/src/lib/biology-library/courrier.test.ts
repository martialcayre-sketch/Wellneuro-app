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
  ratios: [],
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

  it('étage 2 actif : la phrase « aucun résultat conservé » cède la place à l’état réel', () => {
    // Promettre au médecin qu'aucun résultat n'est conservé alors que la
    // saisie existe (D-122 §2) serait une fausse assurance sur le seul
    // artefact qui quitte le cabinet.
    const resultat = genererCourrierBiologie({
      ...entree([ligne({ panelCode: 'PANEL_SOCLE', libelle: 'Socle' })]),
      resultatsActifs: true,
    });
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.courrier.texte).not.toContain('Aucun résultat d’analyse n’est conservé');
    expect(resultat.courrier.texte).toContain('peuvent être consignées dans notre outil');
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

describe('rapports calculés (D-072)', () => {
  it('le courrier les nomme, et comme des CALCULS — pas comme des actes à demander', () => {
    // Les taire laissait la composition amputée sur le seul artefact qui quitte
    // le cabinet, alors que l'écran, lui, les montrait.
    const resultat = genererCourrierBiologie(entree([
      ligne({
        panelCode: 'PANEL_GLU',
        libelle: 'Glucidique',
        ratios: [{ code: 'RATIO_HOMA', libelle: 'Indice HOMA' }],
      }),
    ]));
    const texte = JSON.stringify(resultat);
    expect(texte).toContain('Indice HOMA');
    expect(texte).toMatch(/Rapports calculés/);
  });
});

describe('couplage rendu ↔ consigné (revue M1, D-073)', () => {
  it('le texte consigné EST le contenu médecin du document rendu', () => {
    // Le couplage n'est plus accidentel : le générateur refuse si le rendu ne
    // porte pas le texte. Ce banc fige l'identité sur le chemin heureux.
    const resultat = genererCourrierBiologie(entree([
      ligne({ panelCode: 'PANEL_SOCLE', libelle: 'Socle' }),
    ]));
    if (!resultat.ok) throw new Error('refus inattendu');
    const bloc = resultat.courrier.document.blocs[0];
    expect(bloc.contenu.medecin).toBe(resultat.courrier.texte);
    expect(resultat.courrier.html).toContain('Socle');
  });
});

describe('longueur au catalogue complet (revue B1)', () => {
  // CALIBRÉ SUR LE CATALOGUE RÉEL, et la calibration n'est pas un détail : une
  // première version de ce banc, aux libellés deux fois plus longs que les
  // vrais, DÉPASSAIT la borne (8 272 > 8 000). La marge n'est donc PAS
  // structurelle — elle tient aux libellés courts du catalogue courant. Le
  // refus serveur est propre (409, motif honnête), mais quiconque allonge
  // libellés ou objectifs du catalogue doit savoir que cette borne se
  // rapproche. Dimensions ci-dessous : les maxima réels du catalogue D-068
  // (libellé de panel ≤ 30 caractères, d'analyte ≤ 35, 47 analytes),
  // arrondies vers le haut.
  it('quinze panels proposés aux dimensions du catalogue tiennent sous la borne', () => {
    const lignes = Array.from({ length: 15 }, (_, i) =>
      ligne({
        panelCode: `PANEL_${i}`,
        libelle: `Panel tableau clinique ${i}`.padEnd(30, 'x'),
        statut: 'conditionnel',
        declencheurRempli: false,
        condition: 'Signes cliniques d’appel persistants au questionnaire dédié.',
        analytes: Array.from({ length: 4 }, (_, j) => ({
          code: `BIO_${i}_${j}`,
          libelle: `Analyte ${i}-${j}`.padEnd(35, 'x'),
          validationMedicaleRequise: j === 0,
          remboursement: { statut: 'non_evalue' as const, conditions: [], codesActesRetenus: [] },
        })),
        ratios: i < 2 ? [{ code: `RATIO_${i}`, libelle: `Rapport calculé ${i}` }] : [],
      }));
    const resultat = genererCourrierBiologie(entree(lignes));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.courrier.texte.length).toBeLessThan(8000);
  });
});
