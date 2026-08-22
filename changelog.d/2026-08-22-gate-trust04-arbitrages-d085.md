### G-TRUST-04 : cinq arbitrages du responsable — il ne doit rester que l'exigence 1 (D-085, 2026-08-22)

Dans la foulée de la revue post-cutover, le responsable arbitre exigence par
exigence, avec pour cap une levée-conformité du gate quand l'exigence 1 se
fermera (annexe HDS + décommissionnement du 2026-09-01, `D-080`) :

- **Exigence 3 (isolation multi-praticien) : sans objet** — WellNeuro est
  mono-praticien de fait et de choix. Condition de réouverture écrite :
  l'exigence redevient bloquante avant toute création d'un second compte
  praticien. La garde 30/33 routes reste en défense en profondeur.
- **Exigence 5 (journalisation) : ✅** — preuve produite le matin même +
  arbitrage : l'absence d'écran de consultation est un choix (GD-3), pas un
  manque. Première ligne verte du tableau.
- **Exigence 6 (incidents)** : la confirmation par un conseil qualifié sort
  du gate (dette `D-TRUST-10`, 2026-T4) ; le registre physique des violations
  est **ouvert ce jour**, tenu hors dépôt par le responsable (EX-3 soldé).
  Reste le runbook Scalingo, commandé.
- **Exigence 7 (tests de sécurité)** : revue confiée à **Codex**, pilotée par
  le responsable — nature dite (revue automatisée par un second modèle, pas
  un pentest humain externe) ; fermée quand jouée et triée.
- **Exigences 2/4** : purge des colonnes dormantes `access_token*`
  **explicitement ordonnée** (migration sous protocole §C) ; constat au
  passage — la révocation de remplacement existe déjà
  (`sessionsInvalidesAvant`), la checklist disait à tort le contraire.
