### F34 : la table signée des indications retient le déploiement (D-389 §5)

- `web/src/lib/biology-library/indicationsBiologieV1.ts` devient le troisième
  chemin déclencheur de `release-db.yml` et de `CHEMINS_RELEASE_DB` du
  déployeur : sa re-signature (F34, étape 3) passera par une release-db
  approuvée ([[D-044]], [[D-382]] §6). Le fichier seul, pas son dossier.
- La comparaison de la tête dépassante tient ce fichier comme une migration :
  une tête qui le modifie après l'approbation arrête le déclenchement.
- Bancs : parité du filtre et du déployeur sur les trois chemins (le parseur
  lit aussi un fichier exact), borne du filtre portée à trois, commentaire du
  déclencheur, et un cas joué sur le dépôt jouet (mutation constatée).
- Sans migration, sans schéma, sans règle d'indication touchée ; la table, son
  empreinte et sa signature sont inchangées.
