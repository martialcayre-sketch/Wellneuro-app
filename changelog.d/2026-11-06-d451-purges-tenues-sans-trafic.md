### Durées de conservation tenues sans dépendre du trafic ni du processus de fond (D-451, 2026-11-06)

- Le cron horaire (`bio:purge-echeance`) purge aussi le journal des accès
  praticien (12 mois), les connexions Google (12 mois) et les tentatives de
  demande de lien (24 h). Ces tables ne se purgeaient qu'à l'écriture d'une
  ligne neuve. La purge à l'écriture reste, et chaque table est purgée à part
  (`lib/conservation/purgeTraces.ts`).
- Purge à 30 jours de la biologie : le report sous un travail de la file
  ouvert est borné à une période du cron. Le premier passage après
  l'échéance tolère encore le travail ; le suivant le clôt
  `echec`/`document_purge`, clôt ses imports en cours `delai_depasse`, puis
  purge le document. Un banc lie ce délai à la cadence de `web/cron.json`.
- Une nouvelle lecture d'un compte rendu déposé depuis 30 jours est refusée,
  même s'il n'est pas encore purgé (409 `document_echu`). Le message a été
  validé par le responsable.
- Aucune durée, aucun schéma, aucune migration ni aucun motif neuf.
  Amende D-282 et D-318 §4. Rubrique 8 de `docs/DOSSIER_RGPD.md`.
