import type { SyntheseSchema } from '@/lib/anthropic';
import { construireBloc } from './bloc';
import { STATUTS_SYNTHESE_VALIDES, type Bloc, type StatutSyntheseSource } from './types';

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
  origine?: 'ia' | 'praticien';
};

/**
 * Une vigilance produite par le moteur de contradictions se reconnaît à son
 * marqueur de règle — `[C-STR]`, posé par `lignesDeVigilance`. Reconnaissance
 * par la FORME de la ligne, faute de mieux : `points_de_vigilance` est un
 * tableau de chaînes, et le contrat de synthèse ne porte pas d'audience par
 * point. Le jour où il en portera une, cette fonction disparaît au profit
 * d'elle.
 */
const MARQUEUR_REGLE_CONTRADICTION = /\[C-[A-Z0-9_-]+\]/;

function estVigilanceDiscordance(point: string): boolean {
  return MARQUEUR_REGLE_CONTRADICTION.test(point);
}

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
  const { syntheseJson: s, statut, versionPrompt, dateValidation, origine = 'ia' } = source;
  if (origine === 'praticien' && !STATUTS_SYNTHESE_VALIDES.includes(statut)) {
    throw new Error('Un brouillon praticien doit être validé avant composition documentaire.');
  }
  const ancrageHash = `${versionPrompt}#${dateValidation ?? statut}`;
  const provenance = origine === 'praticien'
    ? {
        source: 'synthese_praticien' as const,
        ancrageHash,
        version: versionPrompt,
        dateValidation: dateValidation ?? undefined,
      }
    : {
        source: 'synthese_ia' as const,
        ancrageHash,
        version: versionPrompt,
        statutSource: statut,
        dateValidation: dateValidation ?? undefined,
      };
  const regime = origine === 'praticien' ? 'statique_valide' as const : 'genere_ia' as const;
  const blocs: Bloc[] = [];

  const narratifPatient = s.narratif_patient?.trim();
  blocs.push(
    construireBloc({
      id: 'synthese_narratif',
      type: 'narratif',
      regime,
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
        regime,
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
        regime,
        provenance,
        // Le field-filter s'arrête au praticien pour une vigilance de
        // DISCORDANCE ([[D-057]], arbitrage 4). Le type du constat déclare
        // `audience: 'praticien_seul'` (`contradictionFinding.ts`) ; sans cette
        // exception, la conversion en chaîne lui faisait perdre son audience et
        // hériter du destinataire médecin du bloc — un élargissement par effet
        // de bord, sur un document SORTANT, sans qu'aucune décision ne l'ait
        // dit. Les vigilances d'anamnèse, elles, ne changent pas de régime.
        contenu: estVigilanceDiscordance(point)
          ? { praticien: point }
          : { praticien: point, medecin: `Signal à discuter : ${point}` },
      }),
    );
  });

  (s.questions_entretien ?? []).forEach((question, index) => {
    blocs.push(
      construireBloc({
        id: `synthese_question_${index}`,
        type: 'note_praticien',
        regime,
        provenance,
        contenu: { praticien: question },
      }),
    );
  });

  return blocs;
}
