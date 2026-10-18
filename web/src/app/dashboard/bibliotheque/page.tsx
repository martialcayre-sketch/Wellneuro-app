import { redirect } from 'next/navigation';

// La page unique de la Bibliothèque est éclatée en rayons, un par entrée du
// menu (D-324 §4) : son adresse mène au premier, « Questionnaires ». Les liens
// et marque-pages anciens restent valides.
export default function BibliothequePage() {
  redirect('/dashboard/bibliotheque/questionnaires');
}
