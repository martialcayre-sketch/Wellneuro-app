### Le corpus clinique sert en production — pose constatée par le comportement (2026-08-22)

L'arc ouvert par `D-082` se ferme dans la journée, dans l'ordre que la
doctrine exige : validation clinique (`D-082`) → build portant la signature
déployé (09:21 UTC) → drapeau `WN_ENABLE_CORPUS_CLINIQUE_V1=1` posé et
conteneurs recréés (09:36 UTC, constat `ps`) → **synthèse réelle à 10:22 UTC
dont la trace d'audit fait foi** : `corpusActif: true`, `synthese-v27`,
`corpus-clinique-v1`, SHA signé `19a55478…` concordant, et une mention de
limites « avec référentiel clinique SIIN Snapshot V1 — à valider par le
praticien ». La discipline `D-074` est servie : « posé, constaté » ne
s'écrit qu'ici, preuve à l'appui, relevée en base par sonde lecture seule
sans identité patient. `docs/FEATURE_FLAGS.md` §C passe à « les deux
conditions sont remplies ; le corpus SERT ».
