### Refonte Lien, PAT-7d : plus de « Réessayer » sous « Suivi non reconnu. » au hub ; « Réessayer » sur U24 et U25 après un échec de lecture (2026-11-20)

Application de l'amendement DOC-18 de [[D-488]] (réponse du responsable du
2026-11-19 à `20261117-1243-d`).

- **Hub, volet « Mon accompagnement »** (U10) : un refus 404 (« Suivi non
  reconnu. ») se lit dans la forme « constat », sans « Réessayer », comme au
  point de suivi. Les autres erreurs gardent le bouton. Le débordement de ce
  bouton à 195 px disparaît avec lui.
- **« Ce que mon praticien a compris de moi »** (U24) et **« Mon dossier, à
  deux voix »** (U25) : « Réessayer » sous le message d'échec de lecture,
  après une erreur technique (HTTP 5xx, sauf 503) ou une coupure réseau. Il
  relit la page. Un refus (session, compte, espace non ouvert) garde le
  message seul.

Aucun texte neuf. Aucune route, garde, drapeau, schéma ni règle clinique
modifiés ; aucun texte de consentement, de droits ni de sécurité modifié ;
aucun décor avant COM-1.
