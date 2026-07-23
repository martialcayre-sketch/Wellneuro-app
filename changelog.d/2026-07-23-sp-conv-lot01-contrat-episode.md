### SP-CONV LOT-01 — contrat d'épisode partagé, une trajectoire deux lectures (2026-07-23)

Nouveau module pur `web/src/lib/trajectoire-partagee/` — aucune écriture,
aucun réseau, aucune migration : `phaseInitiale` (règle D5 : bloqueur de
sécurité > action exigible > première phase en attente > dernière phase
consultée ; état neutre pendant le chargement, jamais une phase affirmée),
`deriverEpisodeBandeau` (numéro d'épisode, position « T0 + X j », momentum
du tour précédent exposé uniquement à version de score identique — A8-3),
et `deriverEtatParcoursPatient` (étapes 5-6 du parcours HC-F dérivées des
seuls signaux que le portail sert déjà : statut de consultation, protocole
diffusé, fin de cycle, booklet — D11). Formulations patient D7 sous garde
structurelle : aucun chiffre, aucun délai promis, aucun vocabulaire de jeu
ou de dégradation. Le moteur `statutPhase` reste au cockpit, le score reste
à `lib/equilibre`. Consommé par les LOT-02 (cockpit) et LOT-04 (portail).
