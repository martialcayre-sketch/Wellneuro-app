### D-060 — le contrat de déclenchement apprendra la disjonction, et un recueil incomplet ne l'allumera jamais (2026-08-15)

Décision de cadrage, sans code : le lot d'implémentation suit.

En étendant le panel stress du catalogue biologie au BMS-10, on a constaté que
`OrientationDeclencheur` ne sait exprimer **aucun « ou »**. Dans une règle les
`declencheurs` sont en ET ; entre règles, deux règles publiées sur un même
panel sont traitées comme une discordance et le panel est **écarté**
(`statuts.ts`, `DC-30`). Six panels du catalogue écrits « déclencheur X ou Y »
ne sont donc pas implémentables — et les publier naïvement en deux règles
produirait l'inverse de l'intention.

Le manque déborde la biologie et a déjà coûté : la règle `Q_INF_03`
d'`orientationRulesV1.ts` dérivait son seuil de la négation de
`WN-CL-0136-004`, une conjonction dont la négation est une disjonction. Faute
de pouvoir l'écrire, elle a été refondée sur la bande d'entrée de la grille
certifiée. Le manque ne produit pas des règles absentes mais des règles dont
la provenance naturelle est remplacée par un repli, sans qu'aucun banc ne le
signale.

- **Disjonction dans le contrat partagé**, pas dans un correctif local à
  `statuts.ts` : le besoin sert aussi l'orientation, les priorités, les arrêts
  et les contradictions. La variante locale a été chiffrée et écartée sur le
  périmètre, non sur le coût.
- **Un recueil incomplet n'allume jamais une branche** : une branche ne compte
  que si son instrument est complètement recueilli. Sans cette règle, le OU
  ferait de la garde `DC-24` une passoire.
- **Pas d'imbrication**, **traçabilité limitée à la branche atteinte** (le
  retour d'`evaluerDeclencheur` s'élargit plutôt que de se dupliquer), et
  **interdit `signauxAlerte` maintenu sous `ou`**.

Deux PR suivront : contrat + évaluateur + consommateurs + bancs (T3 et revue
`wn-reviewer` exigés — garde de sécurité), puis reprise des six panels.
