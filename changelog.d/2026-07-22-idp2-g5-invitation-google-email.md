### IDP2 LOT-03f — l'e-mail d'accès propose Google, sans retirer le lien permanent (2026-07-22)

Constat après l'activation du gate G5 : sur les 13 accès portail ouverts, 12
n'avaient jamais utilisé le lien magique ni Google — rien ne le leur proposait.
Le dashboard praticien n'a aucun bouton lié à Google, et l'e-mail d'accès
(`sendPortailLinkEmail`, envoyé à la création d'une consultation ou à un
« Renvoyer le lien ») ne mentionnait que le jeton permanent.

- Quand `WN_G5_GOOGLE_PATIENT` est actif, l'e-mail propose désormais
  « Continuer avec Google » avant le lien permanent, qui reste présent en
  repli — cohérent avec la décision D1 (Google + lien magique, chemin
  optionnel).
- Drapeau éteint : texte inchangé, lettre pour lettre.
- Pas de migration, pas de route d'authentification touchée.
