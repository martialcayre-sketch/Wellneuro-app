### Ajouté

- **Le contrat de déclenchement clinique sait exprimer un « ou »** (`D-060`).
  Un déclencheur peut désormais être une disjonction `{ type: 'ou',
  declencheurs: [...] }` : la règle s'allume dès qu'UNE branche est atteinte,
  là où les déclencheurs d'une même règle restaient en ET. Six panels du
  catalogue biologie niveau 1 sont écrits « déclencheur X ou Y » et n'avaient
  aucune traduction : publier naïvement deux règles sur un même panel les
  aurait **écartés** au lieu de les élargir (`DC-30`).

  **Un recueil incomplet n'allume jamais une branche** (`DC-24`) : une branche
  ne compte que si SON instrument publie ses comptes et n'a rien de manquant.
  Sans cette règle, la disjonction aurait transformé la garde de complétude en
  passoire — il aurait suffi d'une branche non recueillie pour la contourner.
  Conséquence acquise par construction, et vérifiée par un banc : un plancher
  n'allume jamais un « ou ».

  **La traçabilité ne cite que la branche atteinte.** Les sources d'une
  contradiction et les `responseId` d'une carte de décision se construisaient
  jusqu'ici depuis la FORME de la règle ; ils se construisent maintenant depuis
  ce qui a réellement décidé. Sous un « ou », la lecture statique aurait cité
  des passations n'ayant rien décidé, et le praticien aurait vérifié la
  mauvaise donnée.

  **Aucune imbrication** : un « ou » ne contient que des déclencheurs feuilles,
  contrainte portée par le type et non par un banc. Une algèbre booléenne
  complète dans une table de règles cliniques serait illisible en revue, et la
  revue est le seul contrôle réel.

  **Les interdits survivent à la disjonction.** Ouvrir le « ou » à toutes les
  tables rendait aveugles cinq gardes anti-dérive qui filtraient sur le type du
  déclencheur racine : un nœud « ou » n'étant ni une zone, ni une comparaison,
  ni un drapeau, il était sauté en silence. Deux de ces gardes protègent le
  patient — une règle d'arrêt écrite sous « ou » aurait pu éteindre une
  recommandation sur une bande **défavorable** sans faire rougir le CI. Les cinq
  lisent désormais les feuilles : `signauxAlerte`, libellés d'anamnèse verbatim,
  bandes favorables et libellés publiés des règles d'arrêt, borne publiée des
  priorités (`DC-19`), passations non interprétables, et la garde `Q_ALI_01` que
  `D-051` cite comme protection.

  Aucune table ne portant encore de « ou », chacune de ces gardes est éprouvée
  par une règle fabriquée qui cache sa faute sous une branche : sans quoi
  l'aplatissement aurait été une ligne que rien ne tenait.

  Aucune table de règles n'est modifiée par ce lot : aucun contenu clinique
  signé ne change, aucun SHA épinglé ne bouge, et le comportement sur les
  règles existantes est inchangé.

### Modifié

- `docs/claude/MATRICE_CONSOMMATION.md` — la table d'orientation passe de 7 à 5
  surfaces indirectes. **Aucune consommation n'a disparu** : `chaineC1.ts` n'a
  plus besoin d'importer le type des déclencheurs, ce qui rallonge d'un saut le
  chemin vers les deux routes `protocoles`, au-delà de la profondeur que le
  générateur explore. Réserve nommée en `D-060` §8.
