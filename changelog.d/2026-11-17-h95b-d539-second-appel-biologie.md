### Décision D-539 : la biologie passe par un second appel IA qui ne reçoit qu'elle, et ne fondera un axe que par un évaluateur signé (H95 part B, 2026-11-17)

PR de documentation seule, sans code. Elle écrit les arbitrages rendus après
l'évaluation non conforme de D-513 :
- `20261117-0816-b`, option E : le bloc de biologie part seul dans un second
  appel IA, qui ne reçoit ni les questionnaires, ni les scores, ni l'anamnèse,
  et ne remplit que les deux champs réservés au praticien ; l'appel principal
  ne reçoit plus aucune biologie ;
- `20261117-1356-b`, option F3 : la biologie ne fonde un axe que par un
  évaluateur signé, futur ; la synthèse IA ne croise jamais elle-même.

D-539 fixe aussi :
- la consigne du second appel, `synthese-biologie-v1`, et les retouches de la
  consigne principale, qui passe à `synthese-v37` ;
- la phrase fixe posée par le code dans le narratif patient pour dire la
  réception d'un bilan daté (`20261117-2324-b`, N3) ;
- les critères de l'évaluation rejouée : 24 dossiers fictifs × 3 passages,
  zéro violation (`20261117-2325-b`, C1) ;
- les textes d'information réécrits (« Vos données personnelles » v24, notice
  IA v9, conditions v7, e-mail `conditions_utilisation@7`, dossier RGPD), qui
  ne décrivent que ce qui ouvre (`20261117-2326-b`, T1).

Amende D-513 (§2, §3, §4, §6, §11, §12) et précise D-266 (R5). Rien n'est publié
ni ouvert : `WN_SYNTHESE_BIOLOGIE_ENABLED` reste éteint. Le second appel, les
textes et l'évaluation viennent dans les lots suivants.
