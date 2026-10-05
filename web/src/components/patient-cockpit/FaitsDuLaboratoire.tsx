// FAITS DU LABORATOIRE ([[D-267]]) : l'intervalle de référence et la marque
// d'anomalie TELS QU'IMPRIMÉS sur le compte rendu, juxtaposés au résultat et
// attribués au laboratoire. Ils ne produisent ni statut, ni couleur, ni tri,
// ni priorité (§5) : aucune classe d'état, aucune comparaison à la valeur.
//
// LA MARQUE EST DANS UN SEUL ÉLÉMENT, QUI NE CONTIENT QUE LE CHAMP BRUT (§6).
// Un laboratoire imprime « H », « ↑ » ou « Élevé » : ces mots sont les siens,
// pas ceux de Wellneuro. La sentinelle exempte cet élément-là, et lui seul —
// `[data-fait-laboratoire="marquage"]` —, et un banc vérifie qu'il ne porte
// rien d'autre que le texte imprimé.

export const SELECTEUR_MARQUAGE_LABORATOIRE = '[data-fait-laboratoire="marquage"]';

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
          {intervalle !== null && <> intervalle {intervalle}</>}
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
