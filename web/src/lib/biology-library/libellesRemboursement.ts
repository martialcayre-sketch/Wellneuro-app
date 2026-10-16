import type { StatutRemboursement } from './remboursable';

// Libellés praticien des quatre états de remboursement — une FEUILLE, sans
// valeur importée : la fiche d'analyte de la Bibliothèque et la proposition de
// bilan du cockpit ([[D-316]] §4) les lisent toutes deux, et le cockpit ne
// doit pas tirer la fiche d'analyte dans son paquet pour quatre chaînes.
// Typé sur `StatutRemboursement` : un état ajouté sans libellé ne compile pas.
export const LABEL_REMBOURSEMENT: Record<StatutRemboursement, string> = {
  non_evalue: 'Non évalué',
  hors_nomenclature: 'Hors nomenclature courante',
  remboursable: 'Remboursable',
  remboursable_si_groupe: 'Remboursable en groupe d’actes',
};
