// Les libellés de l'atelier de la bibliothèque des options ([[D-480]] §1, §3) —
// purs, côté client. Les noms des rubriques sont ceux de D-480 §1 ; ils ne
// portent aucun contenu clinique.
//
// CHAQUE ÉTAT EST NOMMÉ POUR CE QU'IL EST (`DC-24`) : un texte qui accompagne
// une autre structure est « à relire », pas « à valider ».

import type { BadgeVariant } from '@/components/ui/Badge';
import type { EtatRubriqueOption } from '@/lib/atelier-bibliotheque-options/etat';
import type { EtatBibliotheque } from '@/lib/atelier-bibliotheque-options/structure';

export const NOM_RUBRIQUE_OPTION: Record<string, string> = {
  produit_statut_reglementaire: 'Produit et statut réglementaire',
  dose: 'Dose',
  duree: 'Durée',
  precautions: 'Précautions',
  contre_indications: 'Contre-indications',
  interactions: 'Interactions',
  surveillance: 'Surveillance',
  critere_arret: 'Critère d’arrêt',
  role_praticien: 'Rôle du praticien',
};

export const nomRubriqueOption = (rubrique: string): string => NOM_RUBRIQUE_OPTION[rubrique] ?? rubrique;

/** Un renvoi tel que la structure l'écrit ; l'information manquante, nommée. */
export const libelleRenvoi = (renvoi: string): string =>
  renvoi === 'information_manquante' ? 'Information manquante (déclarée)' : renvoi;

export const LIBELLE_ETAT_STRUCTURE: Record<EtatBibliotheque, { texte: string; variante: BadgeVariant }> = {
  non_signee: { texte: 'Structure non signée', variante: 'warning' },
  a_relire: { texte: 'Structure à relire', variante: 'warning' },
  signee: { texte: 'Structure signée', variante: 'success' },
};

export function libelleEtatRubrique(etat: EtatRubriqueOption): { texte: string; variante: BadgeVariant } {
  switch (etat.etat) {
    case 'vide':
      return { texte: 'Aucun texte', variante: 'neutral' };
    case 'hors_structure':
      return { texte: 'Hors structure', variante: 'warning' };
    case 'a_relire':
      return { texte: 'À relire', variante: 'warning' };
    case 'a_valider':
      return { texte: 'À valider', variante: 'info' };
    case 'validee':
      return { texte: 'Validé', variante: 'success' };
    case 'retiree':
      return { texte: 'Retiré', variante: 'neutral' };
    case 'illisible':
      return { texte: 'Statut illisible', variante: 'danger' };
  }
}

/** Ce qui empêche de VALIDER, ou `null` ; le retrait reste offert (coupe-circuit). */
export function obstacleValidation(etat: EtatRubriqueOption, structure: EtatBibliotheque): string | null {
  if (etat.etat === 'hors_structure') return 'Cette option n’est plus déclarée par la structure : son texte ne se valide plus.';
  if (etat.etat === 'a_relire') return 'Ce texte accompagne une structure qui n’est plus celle du jour : saisissez-en une version neuve.';
  if (structure !== 'signee') return 'La structure de la bibliothèque n’est pas signée : la validation s’ouvrira après sa signature.';
  return null;
}
