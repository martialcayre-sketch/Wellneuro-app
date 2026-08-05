### Observabilité — le repli legacy des packs se journalise pour ses trois raisons, pas une seule

`resolvePackQuestionnaireIds` retombe sur `packs.qids` (legacy) dans trois cas,
distingués par sa `raison` de retour : `registre_absent`, `registre_vide`
(bénins — pack jamais synchronisé avec le registre relationnel) et
`ensembles_divergents` (une vraie dérive entre les deux descriptions du même
pack). Seule la dérive était journalisée (`logger.warn`), dans les deux
appelants du résolveur (`api/praticien/packs/assign`, `api/portail/valider`) :
les deux cas bénins étaient invisibles.

Ils le restent en `WARN` — la décision documentée en commentaire tient :
alerter sur un pack neuf rendrait l'alarme permanente, donc nulle — mais
deviennent observables en `INFO`, sous le même code d'événement
(`PACK_REGISTRE_REPLI_LEGACY`), avec `metadata: { raison, registryCount }`.
Aucun changement de comportement : dans les trois cas, `packs.qids` reste la
source de vérité et rien n'est jamais bloqué.

Une lecture de production du 2026-08-05 confirme le périmètre : sur 8 packs, 7
correspondent exactement au registre et 1 (« Base de consultation »,
`PACK_-bG21yeIvVYRhrdlYuWIMnFz`, envoyé à chaque onboarding) est en
`ensembles_divergents` (`Q_SOM_09` présent côté legacy, absent du registre) —
aucun n'est en `registre_absent`/`registre_vide`.
