### Agenda du sommeil (Q_SOM_09) — barème /100 validé, conséquence momentum v3 vérifiée nulle

Les deux décisions laissées ouvertes à la livraison de l'agenda du sommeil sont
tranchées.

**Barème /100 validé cliniquement par le praticien (2026-07-26)** — aucun seuil
ne change. Les quatre sous-indices /25 (durée 7–9 h ; efficacité ≥ 85 % ;
continuité = latence + réveils ; régularité = écart-type du milieu de sommeil) et
les bandes d'interprétation (< 50 « nettement perturbé », 50–74 « fragilités »,
≥ 75 « satisfaisant ») sont confirmés. Les mentions « proposition / à valider »
sont retirées du code (`questions.ts`, `questionnaires/sommeil.ts`,
`equilibre/constants.ts`) et des docs (`GUIDE_12_BESOINS_NEURONUTRITION.md`,
`MON_EQUILIBRE_CONTEXTE.md`). Modification purement documentaire : la logique de
scoring `agenda_sommeil` est inchangée.

**Conséquence du bump `VERSION_SCORE_EQUILIBRE` v2→v3 sur le momentum : nulle en
pratique.** Vérification en base de production (lecture seule) : la table
`assessment_episodes` est vide — 0 épisode, 0 patient, 0 cycle. La doctrine
A8-3 (« deux `versionScore` différents ne se comparent pas ») ne pouvait donc
orpheliner aucun couple v2/v3 existant. La comparaison de jalons momentum
démarrera normalement au premier couple v3.
