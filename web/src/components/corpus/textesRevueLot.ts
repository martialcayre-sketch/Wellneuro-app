// Textes de la confirmation de la revue en lot (Q7 (a) du complément DOC-13
// de [[D-481]]) : T-71 et T-72, mot pour mot de [[D-488]], variantes
// comprises. La confirmation précède la soumission sans la changer : même
// route, même garde `statutAttendu`, décision claim par claim.

function terme(nombre: number, singulier: string, pluriel: string): string {
  return `${nombre} ${nombre === 1 ? singulier : pluriel}`;
}

/**
 * T-71. Un terme à zéro s'omet ; un terme égal à 1 s'écrit au singulier ;
 * pour une seule décision, la seconde phrase tombe.
 */
export function questionSoumissionLot(validations: number, rejets: number): string {
  const total = validations + rejets;
  const termes = [
    validations > 0 ? terme(validations, 'validation', 'validations') : null,
    rejets > 0 ? terme(rejets, 'rejet', 'rejets') : null,
  ].filter((t): t is string => t !== null);
  const question = `Soumettre ${terme(total, 'décision', 'décisions')} (${termes.join(', ')}) ?`;
  return total === 1 ? question : `${question} Chaque décision est enregistrée séparément.`;
}

/** T-72. */
export function libelleConfirmerLot(total: number): string {
  return total === 1 ? 'Confirmer la décision' : 'Confirmer les décisions';
}
