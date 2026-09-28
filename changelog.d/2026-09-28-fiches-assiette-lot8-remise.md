### Fiches d'assiette : la remise au clic « Valider pour diffusion », avec son aperçu (D-251, lot 8) (2026-09-28)

- **Sous `WN_FICHES_ASSIETTE` seul, neuf et fermé à la livraison.** Fermé, la
  route de diffusion lit et écrit exactement ce qu'elle lisait et écrivait :
  aucun aperçu de fiches, aucune remise. Seule la réponse du GET porte une clé
  de plus, `fiches: null`.
- **L'aperçu, avant le geste.** Le panneau « Validation pour diffusion » liste,
  fiche par fiche, celles qui partiront, celles déjà remises et celles qui ne
  partiront pas, chacune avec sa phrase :
  - aucune version validée ;
  - version de référence qui ne passe plus les contrôles, sans repli sur une
    plus ancienne ;
  - action non ferme ;
  - assiette sans fiche.

  Un dossier clos, ou un protocole que le portail ne saurait pas servir,
  bloque toutes les fiches, et le motif est dit une fois.
- **Le clic remet les fiches dans la même transaction que l'approbation.**
  L'aperçu est recalculé sous le verrou de chaque fiche, le même que la
  validation d'une fiche. Le clic porte le jeton de l'aperçu affiché : s'il a
  changé entre-temps, le clic est refusé, rien n'est écrit, et l'aperçu à jour
  s'affiche (arbitrage du 2026-09-28).
- **Un clic sur une version déjà approuvée remet les fiches validées depuis**
  (§7). L'approbation est reprise telle quelle.
- **Seule la version de référence part, une fois par changement.** La base le
  tient aussi (trigger de M2). Seule une action ferme remet sa fiche : c'est
  l'aperçu qui le tient, pas la base. Les remises s'écrivent par `createMany`,
  dans l'ordre des fiches.
- **Au clic, l'état du dossier est lu dans la transaction et verrouillé en
  partage.** Une clôture de suivi concurrente attend la fin du clic.
- **Une lecture des fiches en échec ne fait pas tomber l'état de diffusion.**
  Elle se dit (« n'ont pas pu être lues »), et un clic posé sur cet aperçu est
  refusé. Sur un aperçu périmé, le cockpit recharge aussi les versions, ce qui
  empêche un refus sans fin.
- **Le rayon « Fiches conseils »** dit désormais où une fiche validée part :
  au clic « Valider pour diffusion » d'un protocole qui porte son assiette, une
  fois l'envoi ouvert.
- **Bancs.**
  - Aperçu, lecture et écriture, route (drapeau fermé et ouvert, jeton absent
    ou périmé, approbation reprise ou créée, dossier clos, remise en échec,
    lecture en échec), panneau, et une garde du câblage du cockpit.
  - L'invariant central, sans simuler la chaîne des fiches : le jeton servi
    par le GET est celui que le POST recalcule.
  - Vingt-quatre mutants, joués en session, sont tous tués par le banc qui
    vise leur règle.
  - Un passage d'intégration sur base réelle, en session : remise, rejeu sans
    effet, remplacement, puis v1 remise à nouveau après le retrait de la v2.
