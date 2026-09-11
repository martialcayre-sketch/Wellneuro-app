### Les deux dernières branches distantes tranchées, puis supprimées (2026-09-11)

`origin` ne porte plus que `main`. Les deux branches restantes ont été comparées
**fichier à fichier** à `main` avant le geste, et non par le compte d'un `diff`
à trois points — ce compte est ce qui les faisait passer pour porteuses de
contenu inédit à chaque examen.

`sauvegarde/runbook-scalingo-staging` (`0c437793`) : son contenu était versé dans
`main` à la main dès le 2026-08-05 (LOT-03 de la campagne
`2026-08-04-reprise-chantiers-en-suspens`), et **corrigé en cours de versement**.
Comparé directement, le runbook de `main` porte **178 lignes qu'elle n'a pas** —
`D-047`, la rétractation du « validé de bout en bout », l'inaccessibilité
d'`osc-secnum-fr1` sur ce compte, la section « ce que l'exécution de la migration
des données a appris (2026-08-22) ». Ses 81 lignes propres sont les formulations
**antérieures** des paragraphes que `main` a réécrits : la merger aurait régressé
le document. Le LOT-03 l'avait nommée « dangereuse à merger » sans pouvoir la
supprimer, la suppression relevant alors du ressort Copilot.

`copilot/fix-github-actions-job-yet-again` (`1e422cad`) : sa coordonnée de clic
est sur `main` depuis #924, avec la démonstration géométrique qui lui manquait, et
son attribution à Copilot y est déjà portée. Son unique artefact propre était un
fragment de changelog de trois lignes dont le motif — une superposition de l'arc
« Aujourd'hui » — est **réfuté** par la sonde navigateur du même correctif.

Les deux SHA sont consignés ici : une branche supprimée se restaure par
`git push origin <sha>:refs/heads/<nom>` tant que l'objet n'est pas ramassé.
