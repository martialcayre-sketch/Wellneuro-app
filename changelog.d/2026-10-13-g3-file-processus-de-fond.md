### BioFlow : le processus de fond de la file des lectures, drapeau éteint (D-282, G3 lot 3, 2026-10-13)

- **Drapeau éteint, rien ne change** : `WN_BIO_EXTRACTION_ASYNC` absent, la
  route lance la lecture comme avant (`after()`), aucun travail n'est écrit.
  Le processus de fond n'est pas encore au `Procfile` (lot 4).
- **Drapeau allumé** : la route demande la lecture (un travail en attente,
  sans import) et rend 202. Mêmes refus qu'avant, jugés avant d'enfiler, et un
  de plus : « une lecture est déjà demandée » (409).
- **Le processus de fond** (`npm run bio:worker-extraction`) réclame le plus
  ancien travail, ouvre l'import et met le travail à jour dans une seule
  transaction, appelle la lecture inchangée (borne du LOT-08), puis termine le
  travail. Réservation de 6 minutes, datée par la base. Un processus mort :
  la réservation expire, la lecture est reprise une fois au nom du praticien
  d'origine, puis le travail passe en échec et l'écran rouvre la relance. Une
  lecture qui avait déjà répondu n'est jamais relue : son travail est
  simplement terminé.
  Toutes les minutes, il clôt les imports fantômes, drapeau éteint compris.
- **Ordre des verrous** : la réclamation verrouille le dossier en partage avant
  le travail, l'ordre de l'effacement d'un dossier — sans quoi les deux
  s'interbloquaient.
- **L'écran** : le compte rendu dit si une lecture est demandée ; l'écran la
  montre « en cours » pendant l'attente et pendant une reprise, au lieu de
  rouvrir le bouton. Seul écart à « l'écran ne change pas » de `D-282` : sans
  lui, l'import né à la réclamation rendait l'attente invisible.
- **Retrait d'un dépôt** : refusé tant qu'une lecture est demandée ; les
  travaux terminés partent avec le document.
- **Purge** : la purge horaire supprime les travaux terminés depuis 30 jours.
- **Banc** : `banc-file-extraction-deux-sessions.test.ts`, au CI et en T3 —
  demandes et réclamations concurrentes, reprise, lecture déjà aboutie,
  épuisement, purge, effacement réel contre une réclamation en vol (témoin :
  sans le verrou du dossier, l'effacement meurt en interblocage).
