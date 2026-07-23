### Sécurité

- **Journal des accès praticien — routes restantes** (G-TRUST-04, exigence 5,
  PR-9 du lot durcissement) : les 10 routes GET « dossier nommé » à requête
  scopée ou identifiant indirect (besoins, cockpit, équilibre, synthèse,
  consultations, protocoles, aperçu-patient/réponses, booklet, documents,
  réponses) écrivent désormais dans `journal_acces_dossiers` après preuve
  d'appartenance — appel direct au helper, jamais la garde : leurs sémantiques
  404/liste-vide sont des choix anti-oracle préservés à l'octet. Limite
  assumée : un dossier possédé sans donnée (liste vide) n'est pas journalisé.
- **Correctif d'autorisation au passage** : le GET de `booklet`
  (prévisualisation praticien) lisait la synthèse sans clause d'appartenance ;
  il est rallié au scoping que son POST appliquait déjà — la synthèse d'un
  patient d'un autre praticien redevient « introuvable ».
