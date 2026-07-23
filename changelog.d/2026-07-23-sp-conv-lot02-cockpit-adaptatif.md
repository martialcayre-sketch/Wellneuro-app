### SP-CONV LOT-02 — cockpit adaptatif : la fiche s'ouvre là où le travail attend (2026-07-23)

La fiche patient ne s'ouvre plus systématiquement sur « Décision » : la
phase focale initiale est calculée par la règle D5 du contrat partagé —
bloqueur de sécurité (protocole bloqué → Actions) > action exigible
(correction en attente → Patient, décision due → Décision) > première
phase en attente > dernière phase consultée (mémoire locale praticien,
jamais en base). Pendant le chargement du runtime, aucune phase n'est
affirmée ; la navigation manuelle du praticien prime définitivement sur
l'automatique. Le bandeau porte désormais la position d'épisode
(« Épisode N en cours · T0 + X j · vous êtes ici », cycles G2) et un chip
delta inter-tours affiché uniquement à version de score identique (A8-3).
L'eyebrow de la zone focale dit « Phase due » quand la phase affichée
attend une action. Plein écran réel (D10) : chrome condensé, le cockpit
prend l'espace restant de l'écran à la place de `min(80vh, 700px)` — le
reliquat V13 (hauteur > 900 px) est clos. La fermeture du tiroir
d'instrument passe à 44 px. Trois tests unitaires réécrits pour prouver le
nouveau contrat (l'ancien comportement « le signal n'a rien déplacé »
était précisément le reproche de l'audit).
