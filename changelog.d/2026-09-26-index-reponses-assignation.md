### Les réponses de questionnaire s'indexent par assignation (2026-09-26)

- **Un index sur `questionnaire_reponses.id_assignation`**, le report nommé au
  LOT-07 de l'agenda alimentaire (2026-08-05). Ce lien souple est lu par la
  liste des patients du praticien, par le comptage de l'annulation
  d'assignation et par la clôture des deux agendas.
- Additif seulement : aucune colonne, aucune ligne touchée, aucun code modifié.
  Constaté en production avant écriture : 221 lignes, aucun index du même nom.
- Première migration sous le déployeur GitHub Actions (D-248, lot 3) : le
  déployeur doit retenir son commit jusqu'à l'approbation de `release-db`, qui
  le déploie puis applique la migration. Le constat sera consigné à D-248 après
  l'application, dans une PR de documentation distincte.
