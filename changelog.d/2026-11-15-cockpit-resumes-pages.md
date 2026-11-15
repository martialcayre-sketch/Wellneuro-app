### Cockpit : un résumé par page de suivi (2026-11-15)

Lot `cockpit-resumes-pages` (carnet, file D, ordre 82, après `cockpit-v2`). Le responsable a retenu l'option A : chaque page de suivi a sa propre base, et une page ne lit pas celle d'un autre artefact ; les sessions déposent donc un résumé de leur page dans la base du cockpit.

- Le cockpit (hors dépôt) gagne une section « Pages de suivi » : une carte par page, avec compteurs, ce qui est en cours, ce qui attend, la dernière entrée du journal, la date de la page, l'heure du résumé et un lien vers la page. La page de la file D est lue en direct ; les autres (file A, file C, BioFlow, refonte Lien praticien et patient) viennent de la collection `resumes`.
- Premiers résumés déposés par la session de la file D, calculés sur les bases des cinq pages lues le 2026-11-15.
- `docs/ROLES_MACHINES.md` : la consigne « Les résumés des pages de suivi » dit qui dépose (la session qui met à jour une page de suivi), où (collection `resumes`, un document par page, `if_version`), quels champs, et ce que la page en fait (« résumé à rafraîchir » au-delà de quarante-huit heures, seuil d'affichage).
- Aucun code applicatif, aucune migration.
