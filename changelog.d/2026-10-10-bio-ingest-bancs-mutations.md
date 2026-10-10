### BIO-INGEST : deux bancs qui ne mordaient pas, complétés (contre-revue, mutations) (2026-10-10)

- **Passe des mutations de la contre-revue adverse**
  (`REVUE_CODEX_MUTATIONS_2026-10-10.md`) : M12, M13, M14 et M17 mordent ; M16
  et M18 survivaient. Le code était juste, mais rien ne l'aurait gardé.
- **Journaux (M16)** : le garde « classe et code, jamais le message » couvre
  désormais la transmission du patient au portail, la saisie des résultats
  (unitaire et groupée) et le cron de purge à l'échéance, plus seulement
  l'import.
- **Route des décisions (M18)** : premier banc de la seule route qui fait
  entrer un import dans `resultats_biologiques`. Drapeaux, session,
  appartenance et dossier ouvert passent avant toute décision, et l'auteur
  vient de la session.
