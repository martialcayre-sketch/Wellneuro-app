// L'ENCART DES REFUS DE [[D-560]] §4 — texte validé mot pour mot par le
// responsable le 2026-11-25. Il ne se retouche pas ici : toute modification
// passe par un amendement de D-560, et `encartD560.guard.test.ts` compare ce
// texte à celui de la décision.
//
// LA DEUXIÈME PUCE AFFIRME UN ÉTAT DU CODE : « aucune ne l'est » (aucune bande
// de variation publiée). Elle est FIGÉE PAR UN BANC (arbitrage du responsable
// du 2026-11-25, question `20261125-1435-a-3`) : le banc rougit dès que
// `BANDES_DE_BRUIT` n'est plus vide ou passe `publiee: true`, et oblige à
// amender D-560 avant qu'une bande ne paraisse.

export const TITRE_ENCART_D560 = 'Ce que cette vue ne calcule pas';

export const PUCES_ENCART_D560 = [
  'aucun mot qui qualifie un écart : jamais « amélioration » ; « stable » seulement avec une bande de variation publiée, et aucune ne l’est ;',
  'aucun lien entre une action du protocole et une mesure ;',
  'aucun écart entre deux cycles, sauf la remesure tardive d’un bilan rouvert, ni entre deux versions d’un questionnaire ou de son score ;',
  'aucun pourcentage d’adhésion ;',
  'aucune flèche, couleur ni écart sur la biologie.',
] as const;

/**
 * Les surfaces de [[D-560]] §1. Chacune porte l'encart ; le banc vérifie
 * celles qui existent. `fichier: null` = surface pas encore livrée — le jour
 * où son lot la crée, il renseigne le chemin ici, et le banc la garde.
 */
export const SURFACES_D560: readonly { lot: string; nom: string; fichier: string | null }[] = [
  { lot: 'OF-2', nom: 'onglet « Évolution »', fichier: 'src/components/patient-cockpit/EvolutionPanel.tsx' },
  { lot: 'OF-3', nom: 'résultats du protocole', fichier: null },
  { lot: 'OF-4', nom: 'repères du cabinet', fichier: null },
];
