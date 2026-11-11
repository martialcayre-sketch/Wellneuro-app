### File D, d53 : relance praticien de l'agenda du sommeil rouverte en production (2026-11-11)

- Le responsable a reposé `WN_AGENDA_RELANCE` sur Scalingo le 2026-11-11 à
  08:24:43 UTC et redémarré les conteneurs. La variable était absente depuis
  la bascule du 2026-08-22. La repose a été faite après la clôture du LOT-02
  (#1971).
- L'effet a été constaté le jour même par le responsable, sans envoi : le
  bouton « Relancer ce patient » est visible au tableau de bord, et
  `relanceActive` vaut `true` dans la réponse de suivi. Le registre
  `docs/FEATURE_FLAGS.md` est annoté.
