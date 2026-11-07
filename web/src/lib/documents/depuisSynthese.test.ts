import { describe, expect, it } from 'vitest';
import type { SyntheseSchema } from '@/lib/anthropic';
import { blocsDepuisSynthese, type SyntheseSource } from './depuisSynthese';
import { blocsPourDestinataire, contenuPourDestinataire, estBlocDiffusable } from './bloc';
import { evaluerConvergences } from '@/lib/clinical/convergenceEngine';
import { FENETRES_FRAICHEUR_ORIENTATION, ORIENTATION_RULES_V1 } from '@/lib/clinical/orientationRulesV1';
import { lignesDeVigilance } from '@/lib/clinical/vigilanceLongueur';

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

  it('porte une provenance praticien sans attribuer le contenu à l’IA', () => {
    const blocs = blocsDepuisSynthese({
      ...source('Validee_Praticien'),
      origine: 'praticien',
      versionPrompt: 'synthese-praticien-v1',
    });
    expect(blocs.every(bloc => bloc.regime === 'statique_valide')).toBe(true);
    expect(blocs.every(bloc => bloc.provenance.source === 'synthese_praticien')).toBe(true);
    expect(blocs.every(bloc => bloc.provenance.statutSource === undefined)).toBe(true);
  });

  it('refuse de composer un brouillon praticien non validé', () => {
    expect(() => blocsDepuisSynthese({
      ...source('Brouillon_Praticien'),
      origine: 'praticien',
    })).toThrow('doit être validé');
  });
});

describe('blocsDepuisSynthese — une discordance ne sort pas du praticien (D-057)', () => {
  // Symétrique du banc patient de `bilanPatient.test.ts`. Le constat déclare
  // `audience: 'praticien_seul'` ; converti en chaîne, il perdait son audience
  // et héritait du destinataire médecin du bloc « vigilance » — un
  // élargissement par effet de bord sur un document SORTANT.
  const DISCORDANCE = 'Discordance entre instruments constatée par le déterministe [C-STR] : '
    + 'Signal fonctionnel non confirmé par les instruments spécifiques. Clarifier en entretien.';
  const ANAMNESE = 'Signal d’alerte signalé par le patient : idées noires — avis médical à évaluer en priorité.';

  const blocsVigilance = () => blocsDepuisSynthese({
    syntheseJson: { ...synthese(), points_de_vigilance: [DISCORDANCE, ANAMNESE] },
    statut: 'Validee_Praticien',
    versionPrompt: 'synthese-v3',
    dateValidation: '2026-07-18T00:00:00.000Z',
  }).filter(bloc => bloc.type === 'vigilance');

  it('la discordance n’a aucun contenu médecin', () => {
    const [discordance] = blocsVigilance();
    expect(contenuPourDestinataire(discordance, 'medecin')).toBeNull();
  });

  it('elle reste entière côté praticien', () => {
    const [discordance] = blocsVigilance();
    expect(contenuPourDestinataire(discordance, 'praticien')).toContain('[C-STR]');
  });

  it('une vigilance d’anamnèse garde son destinataire médecin — le régime ne change que pour les discordances', () => {
    const [, anamnese] = blocsVigilance();
    expect(contenuPourDestinataire(anamnese, 'medecin')).toContain('Signal à discuter');
  });

  it('aucune vigilance, discordance comprise, n’atteint le patient', () => {
    for (const bloc of blocsVigilance()) {
      expect(contenuPourDestinataire(bloc, 'patient')).toBeNull();
    }
  });
});

describe('blocsDepuisSynthese — une convergence ne sort pas du praticien (H98, D-455)', () => {
  // Trouvé par `wn-reviewer` : `[CONV-B5]` ne passait pas le marqueur `[C-…]`,
  // et la ligne partait au médecin. Le banc lit les lignes RÉELLEMENT servies —
  // produites par le moteur, découpées par `lignesDeVigilance`, morceaux
  // « (suite) » compris — et non une phrase recomposée.
  const lignes = evaluerConvergences({
    reponses: [
      { idQuestionnaire: 'Q_MOD_01', dateReponse: '2026-11-05T10:00:00.000Z', idReponse: 'r1', statutValidite: 'VALID',
        scores: { subScores: [{ id: 'SOMMEIL', label: 'SOMMEIL', total: 10, repondus: 5, items: 5 }] } },
      { idQuestionnaire: 'Q_MOD_03', dateReponse: '2026-11-05T10:00:00.000Z', idReponse: 'r2', statutValidite: 'VALID',
        scores: { subScores: [{ id: 'fatigue', label: 'fatigue', total: 8, max: 10 }] } },
    ],
    drapeaux: {
      signauxAlerte: [], antecedentsDomaines: ['Respiratoire / apnée du sommeil'], facteursDeclenchants: [],
      attentes: ['Améliorer le sommeil'], automedication: [], intolerancesAlimentaires: [], symptomesFonctionnels: [],
      debut: null, evolution: null, variationPoids: null,
    },
    regles: ORIENTATION_RULES_V1,
    maintenantMs: Date.parse('2026-11-07T12:00:00.000Z'),
    fenetres: FENETRES_FRAICHEUR_ORIENTATION,
  }).flatMap(lignesDeVigilance);

  const blocs = () => blocsDepuisSynthese({
    syntheseJson: { ...synthese(), points_de_vigilance: lignes },
    statut: 'Validee_Praticien',
    versionPrompt: 'synthese-v31',
    dateValidation: '2026-11-07T00:00:00.000Z',
  }).filter(bloc => bloc.type === 'vigilance');

  it('le moteur produit bien des lignes, suite comprise — anti-vacuité', () => {
    expect(lignes.length).toBeGreaterThanOrEqual(3);
    expect(lignes.some(ligne => ligne.includes('[CONV-B5] (suite)'))).toBe(true);
  });

  it('aucune ligne de convergence n’a de contenu médecin ni patient', () => {
    for (const bloc of blocs()) {
      expect(contenuPourDestinataire(bloc, 'medecin')).toBeNull();
      expect(contenuPourDestinataire(bloc, 'patient')).toBeNull();
      expect(contenuPourDestinataire(bloc, 'praticien')).toContain('[CONV-B5]');
    }
  });
});
