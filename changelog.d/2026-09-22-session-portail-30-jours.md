### Session portail — 12 h glissantes deviennent 30 jours, et le patient peut enfin fermer la sienne (2026-09-22)

La fenêtre de session du portail patient valait 12 h. Un agenda alimentaire se
remplit une fois par jour, le soir : 24 h entre deux passages pour une fenêtre
de 12 h — **le patient était donc déconnecté à chaque visite**, et devait
reprouver son identité par un lien magique (usage unique, 24 h) ou par Google.

Constaté en production le 2026-09-22 sur un dossier réel, lu par identifiant
depuis un conteneur : entré le 19/09 à 10:42, session morte le soir même, retour
le 21/09 devant deux portes fermées — le lien de son e-mail était déjà consommé
(4 rejeux refusés, dernière tentative le 21/09 à 13:32) et son compte Google
porte une adresse différente de celle du dossier (9 refus `sans_espace_eligible`
avec `id_patient` à NULL sur 14 jours). Aucun des deux échecs n'était un défaut :
c'est la fenêtre qui les rendait fréquents.

- **`SESSION_TTL_SECONDS` : 12 h → 30 jours**, charge signée et `maxAge` du
  cookie accordés par construction (un banc les compare — les désaccorder ferait
  expirer le cookie côté navigateur avant la session qu'il porte).
- **La durée des cookies legacy est figée à part** (`LEGACY_SESSION_TTL_SECONDS`,
  12 h). Les cookies d'avant IDP2 LOT-02 ne portent pas de `iat` : il se
  reconstruit par `exp - durée`, et seule la durée qui a servi à les ÉMETTRE rend
  la reconstruction exacte. Adossée à la constante courante, elle se serait mise
  à mentir de 29 jours et demi. Le format est en pratique éteint ; la justesse
  d'une reconstruction ne doit pas reposer sur l'argument qu'on ne l'exécute plus.
- **`POST /api/portail/deconnexion`** — le geste n'existait pas, et n'avait pas
  besoin d'exister tant que la session se fermait d'elle-même en fin de journée.
  Sur un ordinateur familial, « je ne peux pas me déconnecter » cesse d'être un
  détail quand la session survit un mois. La route efface le cookie du navigateur
  qui appelle, et rien de plus : la session est sans état côté serveur, un cookie
  déjà copié ailleurs n'est pas tué par ce geste — c'est la révocation praticien
  (`sessionsInvalidesAvant`) qui tient ce rôle, et elle est inchangée.
- **« Se déconnecter » dans l'en-tête du portail**, rendu par le layout
  uniquement quand une session signée est présente. Une fois déconnecté, il n'y a
  plus de cookie, donc plus de bouton sur l'écran d'arrivée — et la référence
  visuelle de la page de connexion reste intacte.

**Ce que le geste ne fait pas** : il ne purge pas les brouillons de questionnaire
gardés en `localStorage` (30 jours, `lib/questionnaire-draft.ts`). L'application
ne les restitue pas sans session, mais ils survivent sur l'appareil partagé.
Écarté pour cette fois — détruire du travail non envoyé sans avertissement est un
arbitrage distinct, consigné en `D-241` §6 plutôt que passé sous silence.

**Ce qui ne change pas — la révocation.** `isSessionValideForPatient` relit en
base `actif`, `accessTokenRevoked` et `sessionsInvalidesAvant` à chaque requête.
Un cookie de 30 jours meurt dans la seconde où le praticien révoque : la durée du
cookie n'a jamais été ce qui tient l'accès fermé. Ce que l'allongement déplace
est le risque d'appareil partagé, et c'est précisément ce que la déconnexion
livrée avec lui vient couvrir.

Aucune migration, aucun drapeau : le changement prend au déploiement. Les
sessions déjà ouvertes ne sont pas rompues — elles gardent leur `exp` courant et
passent à la fenêtre longue à leur prochain rafraîchissement.
