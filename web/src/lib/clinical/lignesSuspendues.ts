import { reglesIndicationsSuspendues } from '@/lib/biology-library/publie';
import { CONTRADICTIONS_RULES_V1 } from './contradictionsV1';
import { ORIENTATION_RULES_V1 } from './orientationRulesV1';
import { STOP_RULES_V1 } from './stopRulesV1';

// LES LIGNES SUSPENDUES POUR RELECTURE — [[D-543]], réponse A à
// `20261119-1303-a`, et la règle d'arrêt `STOP-STR` (réponse C à
// `20261119-1635-a`).
//
// UNE RÈGLE D'ARRÊT SUSPENDUE POUR RELECTURE n'est pas une règle d'arrêt
// « suspendue » de [[D-491]] : celle-là l'est faute de claim admissible, et le
// service la dit dans `arretsSuspendus` ; celle-ci a le statut `suspendue`,
// le service ne la lit pas, et elle passe par cette liste-ci.
//
// Une ligne au statut `suspendue` n'est évaluée par aucun moteur : elle ne
// propose aucune exploration, aucun bilan, aucune discordance. Sans ce module,
// elle disparaissait en silence, et le praticien voyait moins de propositions
// sans savoir pourquoi (`DC-34`, `DC-35`). Le service d'orientation sert cette
// liste ; la synthèse et le cockpit en font UNE ligne, au texte validé mot pour
// mot, sans identifiant ni décompte.
//
// LA LISTE NE DÉPEND PAS DU DOSSIER, ET C'EST VOULU. Elle se lit sur les
// tables, jamais sur les réponses du patient : le service ne calcule pas ce
// qu'une ligne suspendue aurait produit, même patron que les règles d'arrêt
// suspendues ([[D-511]] §1). L'information s'affiche donc sur tout dossier dont
// l'orientation est active, que la ligne l'eût concerné ou non.
//
// Seul le statut `suspendue` compte : un `brouillon` n'a jamais servi, il n'y a
// pas d'arrêt à expliquer.

export type TableLigneSuspendue = 'orientation' | 'arret' | 'contradictions' | 'biologie';

export type LigneSuspendue = { table: TableLigneSuspendue; regleId: string };

export function lignesSuspenduesPourRelecture(): LigneSuspendue[] {
  return [
    ...ORIENTATION_RULES_V1
      .filter(regle => regle.statut === 'suspendue')
      .map(regle => ({ table: 'orientation' as const, regleId: regle.id })),
    ...STOP_RULES_V1
      .filter(regle => regle.statut === 'suspendue')
      .map(regle => ({ table: 'arret' as const, regleId: regle.id })),
    ...CONTRADICTIONS_RULES_V1
      .filter(regle => regle.statut === 'suspendue')
      .map(regle => ({ table: 'contradictions' as const, regleId: regle.id })),
    // La biologie se lit par son entrée publiée ([[D-306]] §2), qui ne sert que
    // les identifiants.
    ...reglesIndicationsSuspendues().map(regleId => ({ table: 'biologie' as const, regleId })),
  ];
}
