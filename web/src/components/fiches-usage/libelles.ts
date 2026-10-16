// Les libellés de l'écran des fiches d'usage ([[D-314]] §3) — purs, sans
// import de valeur serveur : ils vivent à côté des composants client.
//
// CHAQUE ÉTAT EST NOMMÉ POUR CE QU'IL EST (`DC-24`) : un texte qui rédige une
// autre structure est « à relire », pas « à valider » ; une fiche que la
// structure ne déclare pas est « hors structure », pas « non validée ».

import type { BadgeVariant } from '@/components/ui/Badge';
import type { EtatLibelle, EtatTexte, EtatVersionUsage, RaisonIllisible } from '@/lib/fiches-usage/etat';

export const NOM_RUBRIQUE: Record<string, string> = {
  question: 'Question',
  population: 'Population d’usage',
  preanalytique_contexte: 'Préanalytique et contexte',
  resultats_consequences: 'Résultats et conséquences',
  interpretations: 'Interprétations',
  options: 'Options',
  precautions: 'Précautions',
  surveillance_arret: 'Surveillance et arrêt',
  limites: 'Limites',
  argument_preference: 'Argument de préférence',
};

export const nomRubrique = (rubrique: string): string => NOM_RUBRIQUE[rubrique] ?? rubrique;

export const NOM_NATURE: Record<string, string> = {
  hypothese: 'Hypothèse',
  population: 'Population d’usage',
};

export const RAISON_ILLISIBLE: Record<RaisonIllisible, string> = {
  acte_inconnu: 'le dernier acte est d’un genre inconnu',
  empreinte_acte_divergente: 'le dernier acte ne porte pas l’empreinte de ce texte',
  retrait_sans_motif: 'le dernier retrait n’a pas de motif',
};

/** L'état d'un texte seul : une rubrique, un libellé. */
export function libelleEtatTexte(etat: EtatTexte | EtatLibelle): { texte: string; variante: BadgeVariant } {
  switch (etat.etat) {
    case 'a_valider':
      return { texte: 'À valider', variante: 'info' };
    case 'validee':
      return { texte: 'Validé', variante: 'success' };
    case 'retiree':
      return { texte: 'Retiré', variante: 'neutral' };
    case 'illisible':
      return { texte: 'Statut illisible', variante: 'danger' };
    case 'hors_structure':
      return { texte: 'Hors structure', variante: 'warning' };
    case 'a_relire':
      return { texte: 'À relire', variante: 'warning' };
  }
}

/** L'état d'une version de fiche, dérivé de ses rubriques et de la structure. */
export function libelleEtatVersion(etat: EtatVersionUsage): { texte: string; variante: BadgeVariant } {
  switch (etat.etat) {
    case 'illisible':
      return { texte: 'Statut illisible', variante: 'danger' };
    case 'hors_structure':
      return { texte: 'Hors structure', variante: 'warning' };
    case 'a_relire':
      return { texte: 'À relire', variante: 'warning' };
    case 'non_conforme':
      return { texte: 'Rubriques non conformes', variante: 'danger' };
    case 'retiree':
      return { texte: 'Retirée', variante: 'neutral' };
    case 'a_valider':
      return { texte: `À valider · ${etat.validees}/${etat.attendues} rubriques`, variante: 'info' };
    case 'validee':
      return { texte: 'Validée', variante: 'success' };
  }
}

/** Pourquoi une version ne peut pas être validée, en une phrase — ou `null`. */
export function obstacleDeVersion(etat: EtatVersionUsage, structureSignee: boolean): string | null {
  if (!structureSignee) return 'La structure des fiches d’usage n’est pas signée : aucun texte ne se valide avant elle.';
  switch (etat.etat) {
    case 'illisible':
      return 'L’état d’une rubrique est illisible : aucune validation n’est possible.';
    case 'hors_structure':
      return 'Cette fiche n’est pas déclarée par la structure signée : ses rubriques ne se valident pas.';
    case 'a_relire':
      return 'Cette version rédige une autre structure que celle du jour : une nouvelle version doit être déposée.';
    case 'non_conforme':
      return 'Les rubriques de cette version ne sont pas celles que la structure attend : une nouvelle version doit être déposée.';
    default:
      return null;
  }
}

/** Pourquoi un libellé ne peut pas être validé, en une phrase — ou `null`. */
export function obstacleDeLibelle(etat: EtatLibelle, structureSignee: boolean): string | null {
  if (!structureSignee) return 'La structure des fiches d’usage n’est pas signée : aucun texte ne se valide avant elle.';
  if (etat.etat === 'hors_structure') return 'Ce terme n’est pas déclaré par la structure signée.';
  if (etat.etat === 'a_relire') return 'Ce libellé a été déposé pour une autre structure : un nouveau libellé doit être déposé.';
  return null;
}

export function formatDateHeure(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' });
}
