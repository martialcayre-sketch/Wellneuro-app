### BP-15, code : les décisions de parcours au cockpit, sous drapeau éteint (D-343, LOT-15, 2026-10-22)

- Drapeau `WN_DECISIONS_PARCOURS`, créé éteint, fail-closed : éteint, le
  cockpit ne montre rien et la route répond 503 (`docs/FEATURE_FLAGS.md`).
- Route `api/praticien/decisions-parcours` : GET journalisé (les versions
  du protocole du dossier, hors instantanés du carnet alimentaire, avec
  leur première diffusion recevable et leurs actions ; les décisions) ;
  POST (pose d'un choix du patient, d'un événement de mise en œuvre ou
  d'une révision, correction par remplacement de la tête, retrait). Refus
  nommés avant la base, sous les mêmes verrous : version d'un autre
  dossier, action absente de la version, mise en œuvre ou révision sur une
  version non diffusée, révision qui ne désigne pas la tête, correction
  hors famille ou hors action, version suivante inconnue ; dossier mineur
  et dossier clos refusés. Journal par classe et code d'erreur.
- Tiroir « Décisions de parcours » du cockpit : par version, la révision
  en vigueur et les fils de choix et de mise en œuvre, avec source, motif,
  note, date de l'événement ou « date inconnue », historique ; séquence
  incomplète dite par portée ; rappel du signalement d'effet indésirable ;
  première diffusion à côté des débuts réels. Libellés retenus par le
  responsable le 2026-10-22.
- Bancs : jour 0 et quatre empreintes inchangés après la pose de chaque
  nature (transaction de fixture qui refuse toute autre écriture) ;
  lecteurs épinglés ; demande, fils et route.
