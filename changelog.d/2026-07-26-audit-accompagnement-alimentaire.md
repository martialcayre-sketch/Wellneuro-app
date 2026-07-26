### Audit et arbitrage — accompagnement alimentaire (2026-07-26)

Rapport d'audit sur la chaîne alimentaire complète, en réponse à deux documents
de travail du praticien (simulation de référence du workflow cible, verdict
métrologique sur les trois questionnaires alimentaires) —
`docs/claude/propositions/2026-07-26-audit-accompagnement-alimentaire/README.md`.

**Documentaire seul : aucun scoring, aucun seuil, aucune migration modifiés.**

- **Sept affirmations auditées vérifiées à la ligne près** sur `main @ a19df9b`,
  toutes exactes : `Q_ALI_01` servi en 14 items /42 sous le nom SIIN, besoin 2
  « Micronutriments » alimenté par la fatigue de Pichot, `Q_ALI_03` ne calculant
  ni g/j ni kcal/j, persistance JA adossée à `ProtocolDraft`, saisie patient non
  persistée côté serveur.
- **Quatre constats aggravants absents des documents** : le besoin 2 est une
  *fondation critique*, donc son effondrement plafonne le *Mon équilibre* global
  à 50 — un patient très fatigué est déclaré effondré en micronutriments sans
  qu'aucun micronutriment ait été mesuré ; `Q_ALI_02` et `Q_ALI_03`
  n'alimentent aucun besoin ; `Q_ALI_03` promet l'estimation dans ses consignes
  servies, pas seulement dans le catalogue (item `MO10` mort) ;
  `POST /api/portail/ja/observations` est complet, authentifié et testé mais
  n'est appelé par aucun client — la saisie patient reste en `sessionStorage`.
- **Désaccord de fond acté** : le PDF du cabinet n'est pas la source. Sur
  `Q_ALI_02`, la comparaison au MEDAS publié montre que l'application est *plus*
  fidèle que le PDF qu'on lui oppose. Le banc SOURCE ↔ SERVI (LOT-02/03)
  corrigerait donc l'application vers une copie dégradée. Règle proposée : la
  référence est la publication primaire, le PDF est un troisième artefact à
  auditer.
- Priorités P0 → P3 proposées, quatre questions d'arbitrage clinique laissées au
  praticien. Le P0 impliquerait un bump `VERSION_SCORE_EQUILIBRE` v3 → v4 :
  demande explicite requise avant toute exécution.
