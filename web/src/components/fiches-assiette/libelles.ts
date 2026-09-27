// Les libellés du rayon « Fiches conseils » ([[D-251]] §5, lot 6) — purs, sans
// import de valeur serveur : ils vivent à côté des composants client.
//
// CHAQUE ÉTAT EST NOMMÉ POUR CE QU'IL EST (`DC-24`) : « statut illisible »
// n'est jamais « à valider », et une fiche sans version n'est pas « non
// validée » — elle n'a rien à valider.

import type { BadgeVariant } from '@/components/ui/Badge';
import type { EtatVersion } from '@/lib/fiches-assiette/etat';

export function libelleEtat(etat: EtatVersion): { texte: string; variante: BadgeVariant } {
  switch (etat.etat) {
    case 'a_valider':
      return { texte: 'À valider', variante: 'info' };
    case 'validee':
      return { texte: 'Validée', variante: 'success' };
    case 'retiree':
      return { texte: 'Retirée', variante: 'neutral' };
    case 'illisible':
      return { texte: 'Statut illisible', variante: 'danger' };
  }
}

export const RAISON_ILLISIBLE: Record<Extract<EtatVersion, { etat: 'illisible' }>['raison'], string> = {
  acte_inconnu: 'le dernier acte est d’un genre inconnu',
  empreinte_acte_divergente: 'le dernier acte ne porte pas l’empreinte de cette version',
  retrait_sans_motif: 'le dernier retrait n’a pas de motif',
};

export function formatDateHeure(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' });
}
