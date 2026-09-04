### Fil du jour — encart « Nouveaux patients » : la mise en service d'un dossier devient visible (2026-09-04)

Un dossier neuf traverse trois portes avant d'exister cliniquement, et aucune
ne rendait compte au praticien. L'e-mail d'accès part à la création de la
**consultation** (`api/praticien/consultations`), pas à la création du compte —
un patient créé sans consultation n'a jamais rien reçu. Le patient doit ensuite
**entrer** dans le portail (lien magique ou Google) : l'e-mail parti ne dit rien
de l'entrée. Le pack de base, enfin, n'est assigné qu'à la **validation de
l'onboarding par le patient** (`api/portail/valider`) — jamais à l'ouverture du
dossier.

Un dossier resté derrière l'une de ces portes est, partout ailleurs dans
l'application, indiscernable d'un dossier qui commence : il est simplement
vide. Relevé en production le 2026-09-04 — cinq dossiers ouverts depuis le
2026-08-20, e-mail d'accès parti pour les cinq, **zéro entrée au portail et
zéro assignation**, sans qu'aucun écran ne le signale.

- **`lib/fil/nouveauxPatients.ts`** (fonctions pures) : `etapeNouveauPatient`
  nomme la PREMIÈRE porte fermée, jamais la dernière — signaler un pack absent
  à un patient qui n'a pas reçu son accès enverrait faire le mauvais geste.
  `pack_absent` est le seul état anormal des quatre : `api/portail/valider`
  assigne le pack dans la même requête que la validation, donc zéro assignation
  après validation est une incohérence, pas une attente.
- **`GET /api/praticien/nouveaux-patients`** : dossiers du praticien en session
  ouverts sur 30 jours glissants, quatre lectures bornées par identifiants
  (jamais une par patient). L'entrée au portail se lit sur `consommeLe` et sur
  `issue: 'consomme'` — un lien émis et jamais ouvert, une connexion Google
  refusée, sont précisément les cas à signaler. Un `Erreur` suivi d'un `Envoye`
  est un incident résolu, pas un blocage.
- **`NouveauxPatientsAside`**, en tête de la colonne de travail : un badge
  textuel par dossier (la couleur ne porte aucun sens que le libellé ne dise
  déjà, A5-R1), les dossiers en attente devant les dossiers complets — un tri
  chronologique seul pousserait hors du plafond d'affichage le dossier bloqué
  depuis trois semaines au profit de celui d'hier qui va bien. Une lecture qui
  échoue se dit ; elle ne s'affiche jamais comme « aucun nouveau patient ».
- **L'encart montre, il n'agit pas** : renvoyer un accès et assigner un pack
  restent au dossier, où ces gestes vivent déjà (`PatientsPanel`). Aucune
  surface d'action dupliquée.

Aucun changement de schéma, aucune écriture, aucune règle clinique touchée.
