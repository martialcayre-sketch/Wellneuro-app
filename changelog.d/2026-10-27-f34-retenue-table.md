### F34 : la table signée des indications retient le déploiement (D-389 §5)

- `web/src/lib/biology-library/indicationsBiologieV1.ts` devient le troisième
  chemin déclencheur de `release-db.yml` et de `CHEMINS_RELEASE_DB` du
  déployeur : sa re-signature (F34, étape 3) passera par une release-db
  approuvée ([[D-044]], [[D-382]] §6). Le fichier seul, pas son dossier.
- La comparaison de la tête dépassante le tient comme une migration, à côté
  de `clinical/**` (H88) : une tête qui le modifie après l'approbation arrête
  le déclenchement.
- La sonde de H88 le gèle en phase 1 comme fichier exact : la liste des
  chemins gelés lui ajoutait un `/` qui ne gelait rien.
- Le résumé pour l'approbateur nomme la table quand le push la modifie ; il
  ne lisait que les migrations et affichait « push clinique seul ».
- Bancs : parité du filtre, du déployeur et de la sonde sur les trois chemins,
  borne du filtre portée à trois, citations du commentaire, et quatre cas joués
  sur dépôt jouet (refus, run obsolète, résumé avec et sans table).
- Sans migration, sans schéma, sans règle d'indication touchée ; la table, son
  empreinte et sa signature sont inchangées.
