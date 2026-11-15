### Cockpit en seconde page de la page de suivi : les réponses arrivent en lignes neuves, la session les reporte (2026-11-15)

Lot `cockpit-seconde-page` (carnet, ordre 81), réponses du responsable à `20261113-2355-d` et `20261115-1525-d`.

- Essai à blanc réussi : une page annexe du même artefact, ouverte par un lien relatif depuis la page de suivi, lit la même base. Les quatre collections ont été comptées, sans écriture. La page de test et son lien ont été retirés.
- Le cockpit est publié en seconde page du même artefact. On l'ouvre par l'onglet « Cockpit » de la page de suivi. Il montre en direct :
  - les questions ouvertes ou en séance ;
  - les réponses données depuis le cockpit ;
  - les lots pris ou bloqués, avec ceux restés sans nouvelles ;
  - les messages non lus.
- Le cockpit n'écrit jamais dans une question. Chaque réponse confirmée, en deux temps (« Retenir », puis « Confirmer »), crée une ligne neuve dans la collection `reponses`, ce qui évite tout écrasement. Le bouton n'est offert que sur une question `ordinaire` ; une question `clinique` ou `migration` se tranche en séance. Le cockpit n'a pas de bouton « Retirer ».
- `docs/ROLES_MACHINES.md`, liste commune : la consigne « Réponse depuis le cockpit » dit les champs de la ligne et le report par la session. La session reporte la réponse dans la question, avec `if_version`, au démarrage et avant « prête ». La plus récente l'emporte, et une ligne hors règle est écartée avec son motif.
- La page de suivi garde ses boutons « Retenir » et « Retirer », sans changement.
- Aucun code applicatif, aucune migration.
