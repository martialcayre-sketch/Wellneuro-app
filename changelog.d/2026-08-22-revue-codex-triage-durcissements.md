### Revue de sécurité Codex jouée et triée — trois durcissements le jour même (exigence 7 du gate, 2026-08-22)

La revue commandée par [[D-085]] §4 (pilotée par le responsable, second
modèle) a rendu **0 constat H, 2 M, 1 L** — et son périmètre négatif compte
autant : aucun contournement réaliste de l'authentification `@wellneuro.fr`,
de la signature/révocation des sessions patient, de l'usage unique des
liens, de l'isolation praticien, des requêtes SQL, des appels sortants ni
des redirections OAuth. Les trois constats sont **corrigés le jour même** :

- **M — plafond de liens magiques contournable par concurrence** : comptage
  et création partagent désormais une transaction sous verrou consultatif
  par patient (`pg_advisory_xact_lock`) — des demandes simultanées ne
  peuvent plus franchir ensemble le plafond horaire ; l'échec de la
  transaction ne crée rien et n'envoie rien (fail-closed).
- **M — injection de prompt par les champs libres du patient** : le texte
  patient n'entre dans le prompt de synthèse que par un point unique, où il
  est désormais **neutralisé à la source** (chevrons et sauts de ligne
  remplacés — impossible de forger un délimiteur ou une section Markdown)
  puis **délimité comme donnée** (`<donnees_declaratives_patient>`), avec la
  consigne — dans le bloc ET dans le cadre déontologique — de ne jamais
  exécuter une instruction qui s'y trouverait et de la signaler en point de
  vigilance. Consigne versionnée : `synthese-v28`, empreintes reportées dans
  les deux gardes (états corpus éteint et allumé). Aucun seuil, aucune règle
  clinique, aucun texte du corpus signé modifiés.
- **L — égalisation temporelle incomplète** : l'envoi SMTP quitte le chemin
  mesuré (le serveur Scalingo est un processus long — la promesse s'achève
  après la réponse) ; le plancher et les paliers restent en défense en
  profondeur.

L'exigence 7 de `G-TRUST-04` se ferme aux termes de [[D-085]] §4 : revue
jouée, constats triés — il ne reste au gate que l'exigence 1, datée
(2026-09-01, [[D-080]]).
