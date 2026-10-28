- **Mise à jour (2026-10-27, e-mail envoyé ; correction)** : le responsable a envoyé l'e-mail des conditions v4 depuis le cockpit. Constat par conteneur, en lecture seule et en agrégats (`correspondances_patient`, par version du document) :

  | Version | Envoyés | Date |
  |---|---|---|
  | v1 | 15 | 2026-10-16 |
  | v2 | 15 | 2026-10-20 |
  | v3 | 15 | 2026-10-24 |
  | v4 | 15 | 2026-10-27 |

  Aucun échec, aucune clé libérée. **Correction** : la mise à jour précédente, la PR #1728, son handoff et l'entrée du `SESSION_LOG` disent la @3 « jamais partie », et annoncent un seul e-mail. C'est faux. La @3 est née avec les conditions v3 (#1677, 2026-10-24), et elle est partie le même jour. L'affirmation a été écrite sans relire l'historique des envois. L'erreur ne change ni le code ni l'envoi : un dossier reçoit un e-mail par version, comme prévu. Les patients suivis ont reçu quatre e-mails de conditions en onze jours. La v22 de D-378 (H26) en enverrait un cinquième : la grouper avec d'autres changements, si possible.
