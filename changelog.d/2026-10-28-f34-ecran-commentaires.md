### F34 : la fiche d'analyte sépare le motif signé du claim cité (D-389 §3)

- Sur la fiche d'analyte de la Bibliothèque, le motif d'une exploration non
  indiquée s'affiche sous « Motif de la table signée (lecture du
  responsable) », sans guillemets ; le claim s'affiche à part, sous « Claim
  cité : », avec son identifiant et sa version. « Source : » disparaît : le
  motif n'est plus présenté comme une citation du claim ([[D-389]] §1).
- `ExplorationNonIndiquee` porte `versionClaim`, lue dans la table signée,
  jamais écrite dans le module.
- Le commentaire §D de la table, l'en-tête du module des exclusions, le
  commentaire de l'écran et celui de la fixture disent « lecture signée du
  claim, reproduite mot pour mot de la table ».
- Bancs : les deux étiquettes, au caractère près, et la version du claim.
- Aucune règle, empreinte ni signature touchée ; sans migration ni schéma. Le
  fichier de la table étant chemin déclencheur ([[D-389]] §5), le merge passe
  par une release-db approuvée, sans migration dans la plage.
