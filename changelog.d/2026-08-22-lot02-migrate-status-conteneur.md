### LOT-02 HDS : `migrate status` vert sur conteneur prod — le dernier critère est constaté, et le « TTY requis » était faux (2026-08-22)

Le contrôle formel de l'état des migrations sur la cible — le seul que le
runbook reconnaisse — a été joué le 2026-08-22 à 11:44 CEST depuis un one-off
Scalingo (one-off-602) : 56 migrations trouvées, « Database schema is up to
date! », datasource `wellneuro-3449` sur `osc-fr1`. C'était le dernier
sous-critère ouvert de la chaîne cutover du LOT-02.

- **La contrainte documentée était fausse** : deux documents affirmaient que
  ce contrôle « exige un TTY » et restait donc hors de portée de l'assistant.
  `scalingo run -d` lance le one-off en détaché et sa sortie se lit dans
  `logs --filter one-off-N` — corrigé dans le rapport de recette et le
  runbook, avec la méthode.
- **La checklist de finalisation rejoint l'état réel** : provisioning prod
  (§D), `migrate deploy` avant chargement, restore aux comptes près, textes
  RGPD v2 au cutover (#732) et chaîne cutover (§E) passent à cochés, chacun
  daté et sourcé. Deux réserves écrites : HNSW/`match_*` non re-testés
  unitairement sur la cible, et le `migrate status` formel joué **a
  posteriori** de la bascule — avant elle, seuls les logs de `postdeploy` en
  tenaient lieu.
- Aucun code touché : consignation documentaire.
