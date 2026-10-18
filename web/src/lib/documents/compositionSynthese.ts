import type { SyntheseSchema } from '@/lib/anthropic';
import { estRedactionPraticien } from '@/lib/synthese-praticien';
import { assemblerDocument } from './document';
import { blocsDepuisSynthese } from './depuisSynthese';
import { MODELE_SUIVI_21J } from './modele';
import { renderDocumentHtml } from './rendu';
import type { Bloc, StatutSyntheseSource } from './types';

// La composition d'un document depuis une synthèse VALIDÉE, CÔTÉ SERVEUR — une
// seule source pour l'aperçu (`GET /api/praticien/documents`) et pour
// l'impression du document pour le médecin ([[D-307]] §2, F38). Deux copies
// de ces lignes laisseraient l'instantané imprimé diverger de l'aperçu relu.
//
// Hors de l'index de `lib/documents` : le panneau client importe l'index, et
// ce module tire la détection de rédaction praticien, qui n'y a rien à faire.

export type SyntheseComposable = {
  syntheseJson: unknown;
  statut: string;
  versionPrompt: string;
  dateValidation: Date | null;
  dateGeneration: Date;
  modele: string;
};

export type Composition = { patientNom: string; dateDocument: string; blocs: Bloc[] };

export function compositionDepuisSynthese(
  synthese: SyntheseComposable,
  patient: { prenom: string; nom: string } | null,
): Composition {
  const patientNom = patient ? `${patient.prenom} ${patient.nom}` : '';
  const dateDocument = (synthese.dateValidation ?? synthese.dateGeneration).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const blocs = blocsDepuisSynthese({
    syntheseJson: synthese.syntheseJson as unknown as SyntheseSchema,
    statut: synthese.statut as StatutSyntheseSource,
    versionPrompt: synthese.versionPrompt,
    dateValidation: synthese.dateValidation ? synthese.dateValidation.toISOString() : null,
    origine: estRedactionPraticien(synthese.modele) ? 'praticien' : 'ia',
  });
  return { patientNom, dateDocument, blocs };
}

/**
 * Le HTML du document pour le médecin, tel que l'aperçu le rend (même modèle,
 * même identifiant d'aperçu). Lève si un contenu médecin emploie un registre
 * prescriptif (`assertRenduMedecinNonPrescriptif`, au rendu) : l'appelant le
 * traite comme un refus, jamais comme une impression.
 */
export function htmlDocumentMedecin(composition: Composition): string {
  const composite = assemblerDocument({ modele: MODELE_SUIVI_21J, patientId: 'apercu', blocs: composition.blocs });
  return renderDocumentHtml(composite, 'medecin', {
    patientNom: composition.patientNom,
    dateDocument: composition.dateDocument,
  });
}
