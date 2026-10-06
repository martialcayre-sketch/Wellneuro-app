// FAITS DU LABORATOIRE ([[D-267]]) : l'intervalle de référence et la marque
// d'anomalie TELS QU'IMPRIMÉS sur le compte rendu, juxtaposés au résultat et
// attribués au laboratoire. Ils ne produisent ni statut, ni couleur, ni tri,
// ni priorité (§5) : aucune classe d'état, aucune comparaison à la valeur.
//
// CHAQUE FAIT EST DANS UN SEUL ÉLÉMENT, QUI NE CONTIENT QUE LE CHAMP BRUT (§6).
// Un laboratoire imprime « H », « ↑ » ou « Élevé », et un intervalle peut
// porter « anormal au-delà de … » ou « risque élevé si … » : ces mots sont les siens,
// pas ceux de Wellneuro. La sentinelle exempte ces deux éléments-là, et eux
// seuls — `[data-fait-laboratoire="marquage"]` et
// `[data-fait-laboratoire="intervalle"]` (précision du 2026-10-06) —, et un
// banc vérifie qu'ils ne portent rien d'autre que le texte imprimé.

export const SELECTEUR_MARQUAGE_LABORATOIRE = '[data-fait-laboratoire="marquage"]';
export const SELECTEUR_INTERVALLE_LABORATOIRE = '[data-fait-laboratoire="intervalle"]';

export function FaitsDuLaboratoire({
  intervalle,
  marquage,
  intervalleNonTranscrit = false,
  marquageNonTranscrit = false,
}: {
  intervalle: string | null;
  marquage: string | null;
  intervalleNonTranscrit?: boolean;
  marquageNonTranscrit?: boolean;
}) {
  const nonTranscrits = [
    ...(intervalleNonTranscrit ? ['l’intervalle de référence'] : []),
    ...(marquageNonTranscrit ? ['la marque d’anomalie'] : []),
  ];
  // Aucun fait, aucun signal : rien ne s'affiche (silences de [[D-157]] §4).
  if (intervalle === null && marquage === null && nonTranscrits.length === 0) return null;
  return (
    <>
      {(intervalle !== null || marquage !== null) && (
        <p className="mt-1 text-xs text-muted-foreground">
          Imprimé par le laboratoire :
          {intervalle !== null && (
            <>
              {' '}intervalle <span data-fait-laboratoire="intervalle">{intervalle}</span>
            </>
          )}
          {intervalle !== null && marquage !== null && ' ·'}
          {marquage !== null && (
            <>
              {' '}marque <span data-fait-laboratoire="marquage">{marquage}</span>
            </>
          )}
        </p>
      )}
      {nonTranscrits.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Imprimé mais trop long pour être transcrit : {nonTranscrits.join(' et ')}. À lire sur le compte rendu.
        </p>
      )}
    </>
  );
}
