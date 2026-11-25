# Handoff — 2026-11-25 — File C, lot `r2-correction-mixte` : R2 rectifié, option « Mixte » (D-537 §9)

## Branche et état du dépôt

- Branche `c-r2-correction-mixte`, tirée d'`origin/main` (97e0d72d), dans
  le worktree `.claude/worktrees/suivi-c-h74-frise`. Session concurrente :
  cycle en `git`/`gh` direct.
- Documents seuls : aucun code, aucune migration, aucun drapeau, pas de
  release-db. D-454 : « prête @<sha> », puis l'intégrateur merge.
- Le lot `j3-mineurs-cadrage` a été pris puis rendu à `pret` le temps de
  cette correction ; la même session le reprend dès « prête ».

## Objectif

Rectifier la conclusion de R2 mergée par #2352 : la réponse du responsable
à `20261125-1400-c-2` est l'option « Mixte », non l'accord de chaque
titulaire dès l'entrée.

## Décisions prises

- Au démarrage du cadrage, la session a trouvé au cockpit trois réponses
  `envoyee` pour les questions de R2. Celle de `-c-2` (13:04Z) portait sur
  « Mixte : un seul parent pour les trois premiers mois, les deux pour
  poursuivre au-delà ». Six minutes plus tard, #2352 avait lu la réponse
  « A », donnée en session, comme l'option recommandée.
- Le responsable, interrogé en session le 2026-11-25, retient « Mixte ».
- Conséquences écrites : l'accompagnement n'est pas un acte courant ; il est
  un acte usuel pour sa première période de trois mois seulement. Un seul
  titulaire suffit pour entrer, sous les deux autres conditions de D-537 §1
  (autorité vérifiée, aucune opposition connue ; une opposition connue fait
  passer le dossier à la main, suivi commencé compris). Poursuivre au-delà
  de trois mois demande l'accord de chaque titulaire. La règle transitoire
  du §5 (les deux titulaires dès l'entrée) prend fin avec J3-mineurs.
- Les réponses `-c` et `-c-3` du cockpit concordent avec #2352 : rien ne
  change pour elles.

## Fichiers modifiés

- `docs/DOSSIER_RGPD.md` :
  - rubrique 4 : en-tête de R2, avec la rectification datée ;
  - point 2 (« Acte usuel », « De qui ») ;
  - grille, points ouverts, conclusions ;
  - renvois « admission » et « Conclusion arbitrée » ;
  - rubrique 14 : ligne 4.
- `docs/decisions/D-537.md` : la ligne du 2026-11-25 au §9, réécrite avec
  la mention de la première rédaction.
- `docs/claude/plan-journal/H79/2026-11-25-03-r2-correction-mixte.md`.
- `changelog.d/2026-11-25-r2-correction-mixte.md`.
- Ce handoff.
- Registres (hors dépôt) :
  - la question `-c-2` est repassée à `repondue`, avec la réponse
    « Mixte » ; elle se close au merge de cette PR ;
  - les trois lignes `reponses` sont passées à `reportee` ;
  - le lot `r2-correction-mixte` est inscrit et `pris`.

## Validations exécutées

- Les faits du contrat sont cités sans changement, et le 2B est inchangé.
- Aucune identité réelle, aucune métrique de dossier.
- `npm run check` : voir la PR.

## Problèmes ouverts — pour `j3-mineurs-cadrage`

Ce handoff remplace, pour la forme de l'accord, la liste du handoff
`2026-11-25-1420-c-r2-accord-parental-reexamen.md` :
- l'accord est en deux temps : un titulaire pour entrer, chaque titulaire
  pour poursuivre au-delà de trois mois ;
- le point 4 (la part des parents dans la poursuite) est tranché ;
- un point s'ajoute : ce qui se passe à trois mois si le second accord
  n'est pas recueilli.

Les autres points de ce handoff restent à trancher au cadrage (1 à 3, 5 à
8, ainsi que les points de la ligne de carnet).

## Prochaine action exacte

1. `npm run check`, commit, push, PR (`--body-file`) ; `wn-attendre-ci` en
   fond, puis `wn-revue-pr-agent` ; « prête @<sha> » à la boîte
   `integrateur`.
2. Reprendre `j3-mineurs-cadrage` au carnet, sur la branche
   `c-j3-mineurs-cadrage`, en mode Plan, à partir de ce handoff.

## Interdits encore actifs

- Ne pas reposer R2 : il est tranché, cette fois sur l'option « Mixte ».
- Ne pas lever la porte 24. Ne toucher ni la frise ni cg (H63).
- Aucune identité réelle, aucune métrique de dossier.
- Aucun mot du 2B ni des faits du contrat ne change.
- N'admettre aucun mineur : la pause reste en service.
- L'AIPD ne se tient pas pour validée.
- Citer l'avis comme un « avis GPT », sans le recopier.
