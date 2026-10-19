### E2E : l'aperçu de « Mon équilibre » attend la vue détail avant « Retour » (t07b)

- Le parcours portail cliquait « Retour » juste après « Voir le détail de mes
  12 besoins » ; quand la vue n'avait pas encore changé, le clic tombait sur
  le « Retour » de l'accueil, qui ramène à la consultation. Rouge intermittent
  constaté sur le CI de `main` (d867b290, WebKit), qui retenait le déploiement.
  Le test attend désormais le titre « Mes 12 besoins ». Aucun code applicatif
  ne change.
