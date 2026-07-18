import type { SyntheseSchema } from '@/lib/anthropic';
import { construireBloc } from './bloc';
import type { Bloc, StatutSyntheseSource } from './types';

// Adaptateur : SyntheseIA (contenu validé) → blocs C3 (LOT-03). PUR (aucune Prisma :
// l'appelant fournit les champs lus). Applique le FIELD-FILTER par construction —
// `syntheseJson` mélange `resume_praticien` (praticien) et `narratif_patient`
// (patient) sur une même ligne ; chaque bloc ne remplit que les champs destinataire
// autorisés (frontière A2 + matrice bloc→destinataire du LOT-00). Régime `genere_ia` :
// la garde de diffusion (bloc.ts) exige un statut validé praticien.

/** Entrée minimale requise pour dériver des blocs d'une synthèse (pas de Prisma). */
export type SyntheseSource = {
  syntheseJson: SyntheseSchema;
  statut: StatutSyntheseSource;
  versionPrompt: string;
  dateValidation?: string | null;
};

/** Libellé de priorité côté praticien (le niveau n'est jamais exposé patient/médecin). */
const NIVEAU_LABEL: Record<'eleve' | 'modere' | 'faible', string> = {
  eleve: 'priorité élevée',
  modere: 'priorité modérée',
  faible: 'priorité faible',
};

/**
 * Dérive les blocs composables d'une synthèse. Chaque bloc porte une provenance
 * ancrée (`versionPrompt` + date/statut, faute d'`inputHash` sur `SyntheseIA`) et
 * un contenu FIELD-FILTRÉ par destinataire :
 * - narratif : patient (`narratif_patient`) + médecin (même narratif, non
 *   prescriptif) + praticien (`resume_praticien`) ;
 * - axes : praticien (détaillé) + médecin (« piste à explorer ») ; jamais patient ;
 * - vigilance : praticien + médecin (« signal à discuter ») ; jamais patient ;
 * - questions d'entretien : praticien uniquement.
 */
export function blocsDepuisSynthese(source: SyntheseSource): Bloc[] {
  const { syntheseJson: s, statut, versionPrompt, dateValidation } = source;
  const ancrageHash = `${versionPrompt}#${dateValidation ?? statut}`;
  const provenance = { source: 'synthese_ia' as const, ancrageHash, version: versionPrompt, statutSource: statut, dateValidation: dateValidation ?? undefined };
  const blocs: Bloc[] = [];

  const narratifPatient = s.narratif_patient?.trim();
  blocs.push(
    construireBloc({
      id: 'synthese_narratif',
      type: 'narratif',
      regime: 'genere_ia',
      provenance,
      contenu: {
        praticien: s.resume_praticien || 'Résumé praticien à compléter.',
        ...(narratifPatient ? { patient: narratifPatient, medecin: narratifPatient } : {}),
      },
    }),
  );

  (s.axes_prioritaires ?? []).forEach((axe, index) => {
    const args = (axe.arguments ?? []).map((a) => `• ${a}`).join('\n');
    blocs.push(
      construireBloc({
        id: `synthese_axe_${index}`,
        type: 'decision_validee',
        regime: 'genere_ia',
        provenance,
        contenu: {
          praticien: `${axe.axe} (${NIVEAU_LABEL[axe.niveau_priorite]})${args ? `\n${args}` : ''}`,
          medecin: `Piste à explorer : ${axe.axe}`,
        },
      }),
    );
  });

  (s.points_de_vigilance ?? []).forEach((point, index) => {
    blocs.push(
      construireBloc({
        id: `synthese_vigilance_${index}`,
        type: 'vigilance',
        regime: 'genere_ia',
        provenance,
        contenu: { praticien: point, medecin: `Signal à discuter : ${point}` },
      }),
    );
  });

  (s.questions_entretien ?? []).forEach((question, index) => {
    blocs.push(
      construireBloc({
        id: `synthese_question_${index}`,
        type: 'note_praticien',
        regime: 'genere_ia',
        provenance,
        contenu: { praticien: question },
      }),
    );
  });

  return blocs;
}
