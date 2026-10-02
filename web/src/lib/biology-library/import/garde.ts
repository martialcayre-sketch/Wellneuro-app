import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import { isBioIngestEnabled } from '../featureFlag';
import { garderResultats, type VerdictGardeResultats } from '../gardeResultats';

// Garde des routes d'IMPORT (BIO-INGEST LOT-02). Le drapeau de l'import se
// teste AVANT `garderResultats`, qui journalise l'accès au dossier (GD-1) :
// une route éteinte ne doit consigner aucun accès qui n'a pas eu lieu. Le
// reste — session, format de l'identifiant, appartenance — est celui des
// résultats, sans copie.
export async function garderImport(idPatient: string, acces?: GabaritAcces): Promise<VerdictGardeResultats> {
  if (!isBioIngestEnabled()) {
    return {
      ok: false,
      reason: 'bio_ingest_desactive',
      error: 'L’import de comptes rendus n’est pas activé sur cet environnement.',
      status: 503,
    };
  }
  return garderResultats(idPatient, acces);
}
