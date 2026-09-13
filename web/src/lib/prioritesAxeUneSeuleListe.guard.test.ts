import { describe, expect, it } from 'vitest';
import { NIVEAUX_PRIORITE } from '@/lib/anthropic';
import type { SyntheseSchema } from '@/lib/anthropic';
import { PRIORITES_AXE } from '@/lib/synthese-praticien';

// TROIS ÉCRITURES DE LA MÊME LISTE, ET CE BANC EST LA SEULE CHOSE QUI LES TIENT.
//
// Les niveaux de priorité d'un axe existent sous trois formes :
//   · `NIVEAUX_PRIORITE` (`lib/anthropic.ts`) — le contrat du MODÈLE, que
//     `analyserSortieSynthese` fait respecter à la sortie de génération ;
//   · `PRIORITES_AXE` (`lib/synthese-praticien.ts`) — la forme que l'ÉCRAN peut
//     importer en valeur, et que `validerBrouillonPraticien` fait respecter ;
//   · l'union de `SyntheseSchema['axes_prioritaires'][number]`, un TYPE.
//
// POURQUOI PAS UN SEUL IMPORT. `lib/anthropic.ts` instancie le client
// Anthropic : un composant `'use client'` qui en importerait une valeur
// tirerait le SDK dans le bundle du navigateur. `synthese-praticien.ts`
// n'importe de lui qu'un type, effacé à la compilation — c'est ce qui le rend
// importable par l'éditeur. La duplication est donc structurelle, pas une
// négligence ; ce qui serait une négligence, c'est de la laisser sans garde.
//
// LE DÉFAUT QUE CE BANC FERME, tel que la revue l'a nommé : une quatrième
// valeur ajoutée à `PRIORITES_AXE` seule apparaîtrait dans le sélecteur, serait
// acceptée par le validateur praticien, et REFUSÉE par la génération IA — un
// écran qui propose ce que le serveur refuse, sans qu'aucun banc ne le dise.

describe('les niveaux de priorité d’un axe ne divergent pas', () => {
  it('la liste de l’écran et le contrat du modèle portent les mêmes valeurs, dans le même ordre', () => {
    // L'ORDRE COMPTE AUSSI : `NIVEAUX_PRIORITE.join(' | ')` compose le message
    // de violation servi au modèle à la relance. Deux ordres divergents
    // rendraient ce message instable sans que rien ne l'explique.
    expect([...PRIORITES_AXE]).toEqual([...NIVEAUX_PRIORITE]);
  });

  it('aucune des deux listes n’est vide — anti-vacuité', () => {
    // Sans ce cas, deux listes vidées par une refonte malheureuse passeraient
    // le test précédent en se ressemblant parfaitement.
    expect(PRIORITES_AXE.length).toBeGreaterThan(0);
  });

  it('l’union de type ne porte ni plus ni moins que ces valeurs', () => {
    // TENU À LA COMPILATION, pas à l'exécution : ce `Record` exhaustif ne
    // compile que si ses clés couvrent l'union exactement. Une quatrième valeur
    // ajoutée à `SyntheseSchema` sans l'être ici ferait échouer `tsc` ; une clé
    // de trop aussi. L'assertion d'exécution en dessous n'est là que pour que
    // le cas ait un corps lisible.
    type NiveauPriorite = SyntheseSchema['axes_prioritaires'][number]['niveau_priorite'];
    const couverture: Record<NiveauPriorite, true> = { eleve: true, modere: true, faible: true };

    expect(Object.keys(couverture).sort()).toEqual([...PRIORITES_AXE].sort());
  });
});
