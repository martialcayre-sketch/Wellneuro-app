- **Mise à jour (2026-11-06, constat de [[D-437]] §7)** : le correctif de l'en-tête (#1878, 1987b5c0, mergé à 12:27 UTC) est en production. `curl -sI` rend `camera=(self), microphone=(), geolocation=()` sur `/portail/<jeton>/questionnaires/<assignation>`, et `camera=()` sur le hub. **Geste du responsable sur un Pixel 9 Pro (Android), sur un dossier de test majeur** : le bouton « Photographier mon repas » apparaît, la photo est prise, la journée est enregistrée, et aucune photo n'apparaît dans la galerie. **iOS : appareil non disponible, noté manquant.** **Lecture de la journée par identifiant**, en conteneur détaché, transaction en lecture seule, agrégats, depuis le merge :
  - le dossier est majeur ;
  - une journée est écrite, canal `portail`, sans remplacement ;
  - elle porte deux prises en 274 octets, et ses clés sont celles du contrat (`contractVersion` compris), aucune clé de prise hors `heure`/`nature` ;
  - aucune trace d'image (`data:image`, `blob:`, `base64`, `image/…`).

  Aucune fixture. **La place 11 est faite.** Deux points sont reportés au lot qui suit ce constat, sur la fiche H83 :
  - (1) asserter `featurePolicy`/`camera` sous Chromium dans l'E2E de l'agenda (nitpick CodeRabbit de #1878) ;
  - (2) un contrôle qui refuse un script d'une autre origine sur la route du questionnaire, car `self` y laisse la caméra à tout script de la page (PR-Agent sur #1878).

  Limite observée, non rouverte : un patient qui a refusé la caméra ne voit pas le bouton, et rien ne lui dit pourquoi. C'est le choix de [[D-437]] §6, aucun texte neuf.
