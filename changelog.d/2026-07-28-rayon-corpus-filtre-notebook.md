### Rayon corpus compléments : filtrage par notebook, l'étagère n'est plus vide (2026-07-28)

Le rayon corpus (C4, fiche complément praticien) sélectionnait les claims sur
`metadata.rayon` — un champ qu'aucun claim de production ne portait, si bien que
l'étagère affichait « corpus en cours de constitution » en permanence, alors même
que les claims du notebook 10 étaient validés. Le filtre passe désormais **par le
notebook** de la source (`sourcesDuNotebook()`), appliqué au niveau SQL via le
paramètre `filter_source_ids` de `match_wellneuro_rag_claims` : les N meilleurs
claims sont calculés à l'intérieur du notebook, sans éviction silencieuse par un
autre rayon. Décision praticien du 2026-07-27 (ni migration, ni backfill ; barrière
D-003 inchangée). Un rayon inconnu ou un notebook sans source rend un résultat vide,
jamais un filtre ignoré. Les claims prescriptifs sont servis au praticien avec un
badge. Correspondance figée : `micronutrition` → notebook 10 (seul consommateur
actif) ; `biologie` → 08 et `nutrition` → 09 déclarés pour la suite. Un contrat SQL
(`rag_rayon_notebook_coherence_v1`) garde la cohérence source → notebook.
