import type { Bloc, DocumentComposite, EtatDocument, ModeleDocument } from './types';
import { ORDRE_ETATS } from './types';
import { deriveVersionDocument } from './versioning';

/** Entrée d'assemblage d'un document composite. */
export type AssemblerDocumentInput = {
  modele: ModeleDocument;
  patientId: string;
  blocs: Bloc[];
};

/**
 * Assemble un document composite à l'état initial `brouillon`. Ne recalcule aucune
 * clinique : il ordonne les blocs fournis selon les `typesBlocs` du modèle et dérive
 * la version (tuple des versions de blocs). Un type de bloc du modèle sans bloc
 * correspondant est simplement absent (composition partielle autorisée).
 */
export function assemblerDocument(input: AssemblerDocumentInput): DocumentComposite {
  const { modele, patientId, blocs } = input;
  if (!patientId) throw new Error('Un document doit être rattaché à un patient.');

  const rang = new Map<string, number>();
  modele.typesBlocs.forEach((type, index) => rang.set(type, index));

  const blocsOrdonnes = [...blocs].sort((left, right) => {
    const rl = rang.get(left.type) ?? Number.MAX_SAFE_INTEGER;
    const rr = rang.get(right.type) ?? Number.MAX_SAFE_INTEGER;
    return rl - rr;
  });

  return {
    modeleId: modele.id,
    patientId,
    blocs: blocsOrdonnes,
    etat: 'brouillon',
    version: deriveVersionDocument(blocsOrdonnes),
  };
}

/** Étape suivante dans l'ordre canonique des états, ou `null` si `envoye`. */
export function etatSuivant(etat: EtatDocument): EtatDocument | null {
  const index = ORDRE_ETATS.indexOf(etat);
  if (index < 0 || index >= ORDRE_ETATS.length - 1) return null;
  return ORDRE_ETATS[index + 1];
}

/**
 * Autorise-t-on la transition `depuis → vers` ? Règles :
 * - progression d'exactement une étape dans l'ordre canonique (jamais de saut) ;
 * - le franchissement de `valide` exige une action humaine explicite
 *   (`parActionPraticien: true`) — aucune validation automatique.
 */
export function peutAvancer(
  depuis: EtatDocument,
  vers: EtatDocument,
  options: { parActionPraticien?: boolean } = {},
): boolean {
  if (etatSuivant(depuis) !== vers) return false;
  if (vers === 'valide' && !options.parActionPraticien) return false;
  return true;
}

/**
 * Fait avancer le document d'un état. Lève si la transition est invalide (saut
 * d'étape, ou passage à `valide` sans action humaine explicite). Retourne un
 * nouveau document (immuable).
 */
export function avancerEtat(
  document: DocumentComposite,
  vers: EtatDocument,
  options: { parActionPraticien?: boolean } = {},
): DocumentComposite {
  if (!peutAvancer(document.etat, vers, options)) {
    // Distingue la vraie raison : un saut d'étape prime sur la garde de validation.
    const estSaut = etatSuivant(document.etat) !== vers;
    const raison = estSaut
      ? ' (saut d’étape interdit).'
      : ' (validation humaine explicite requise).';
    throw new Error(`Transition d'état refusée : ${document.etat} → ${vers}${raison}`);
  }
  return { ...document, etat: vers };
}
