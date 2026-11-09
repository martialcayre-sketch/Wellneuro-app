### D-462 : le bloc des besoins entre dans la synthèse, sans valeur ; le texte patient sans score ; consigne `synthese-v32` (H95 part A) (2026-11-08)

- Le modèle reçoit un bloc déterministe des douze besoins, dans l'ordre fixe du
  cockpit : mesuré avec ses sources et ses dates, ou non mesuré avec son motif. Il
  suit le chemin de calcul du cockpit. Aucune valeur par besoin ne lui est
  transmise : elle reste au cockpit.
- La consigne `synthese-v32` (empreinte `80cec59c0cd0c136`) dit ce que « mesuré » et
  « non mesuré » autorisent : ni niveau, ni priorité, ni zéro, ni proposition de
  questionnaire.
- Le texte patient ne porte plus ni score, ni total calculé, ni pourcentage, ni
  nombre de besoins, même en toutes lettres, ni aucune dose de complément ou de
  médicament, même déclarée. Les noms comme oméga-3, les repères de parcours et les
  quantités brutes déclarées par le patient restent permis ; ces dernières sont
  actées comme cinquième famille d'exceptions de D-333 §1.
- Une forme de score relevée dans ce texte produit le signalement technique
  `SYNTHESE_IA.NARRATIF.FORME_DE_SCORE` : des codes de forme, jamais le texte, ni
  blocage ni correction.
- Si le calcul du bloc échoue, la synthèse part sans lui, avec l'événement
  `SYNTHESE_IA.BESOINS.INDISPONIBLES`. Le texte du bloc est tracé dans
  `donneesEntree`, sans migration.
- Aucun seuil, poids, borne, source ni table signée ne change. Déploiement au merge,
  sans `release-db` : le lot reste hors de `web/src/lib/clinical/**`.
