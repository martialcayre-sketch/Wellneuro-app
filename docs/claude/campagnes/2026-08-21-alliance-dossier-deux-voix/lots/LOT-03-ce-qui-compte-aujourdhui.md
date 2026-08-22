---
id: "LOT-03"
statut: "livré à la PR (2026-08-22) — dépôt portail sous drapeau neuf et éteint WN_CE_QUI_COMPTE, lecture praticien chronologique, cinq gardes vues rouges par mutation réelle puis vertes ; aucune migration, aucune colonne, aucune surface de correction ni de suppression"
dépend_de: "LOT-01 (migration appliquée, constatée par conteneur le 2026-08-22 : 58 migrations up to date, contrat alli_ vert)"
---

# LOT-03 — « Ce qui compte pour moi aujourd'hui »

## But

À la fin de ce lot, le patient peut déposer au portail un champ libre
horodaté — « ce qui compte pour moi aujourd'hui » — avant un check-in ou un
rendez-vous. Chaque entrée est **conservée** : la trajectoire de sens vit à
côté des scores et ne s'y résume jamais. Le praticien la lit dans le dossier,
en regard des passations.

## Périmètre

- Route portail (dépôt) + route praticien (lecture chronologique), sur la
  table du LOT-01.
- Surface portail minimale de saisie ; lecture praticien dans le dossier.
- Deux dates par entrée : saisie (déclarée par le client, bornée) ≠
  enregistrement (serveur).
- Garde structurelle : **aucun agrégat, aucun score, aucun résumé calculé**
  de ces entrées (invariant de campagne « jamais un score », adossé à
  `DC-19`/`DC-20` — `DC-27` était cité à tort au cadrage : il dit
  « association ≠ causalité ; score ≠ diagnostic ») ; **une absence d'entrée
  n'est ni zéro ni
  « rien à signaler »** (`DC-24`) — l'affichage distingue « silence » de
  « réponse vide », et un banc le prouve.

## Fichiers probables

- `web/src/app/api/portail/` (route de dépôt + banc — patron des routes
  portail existantes, session lien magique).
- `web/src/app/api/praticien/` (lecture).
- `web/src/lib/` (module + bancs), surfaces portail et dossier.

## Interdits

- Aucune analyse, catégorisation ou notation du texte patient — ni affichage
  qui l'insinue.
- Aucune modification des check-ins existants ; le champ s'ajoute à côté, il
  ne s'insère pas dans leurs payloads.
- Pas d'e-mail, pas de notification (tout message neuf = registre de
  gabarits, hors périmètre de ce lot).
- Aucune donnée patient réelle dans bancs et fixtures.

## Dépendances

LOT-01 releasé et vérifié. Indépendant de LOT-02.

## Étapes

1. Contrat (qui écrit, quand, bornes de taille, deux dates) + bancs rouges.
2. Routes + surfaces.
3. Garde « silence ≠ réponse » et garde anti-agrégat vues rouges.
4. T2 ; fragment `changelog.d/`.

## Tests

- Bancs de route portail (session patient exigée, dépôt refusé hors session).
- Conservation prouvée : deux dépôts successifs = deux entrées, aucune
  écrasée.
- Deux dates asserties ; garde anti-agrégat vue rouge.
- T2 avant commit.

## Critères de done

- [x] Dépôt patient au portail, conservé, horodaté à deux dates — sous le
      drapeau **neuf et éteint `WN_CE_QUI_COMPTE`** (arbitrage du
      responsable : la surface patient ne s'allume que par un geste séparé).
- [x] Lecture praticien chronologique en regard du dossier (onglet
      « Trajectoire »), ordre déterministe `creeLe desc, id desc`.
- [x] « Silence ≠ réponse » prouvé par banc ; aucun agrégat nulle part —
      cinq gardes **vues rouges par mutation réelle** : G1 silence ≠ réponse,
      G2 anti-agrégat et non-consommation par un moteur clinique, G3
      conservation, G4 portée session, G5 deux dates.
- [x] T2 vert ; fragment `changelog.d/` écrit ; aucune colonne, aucune
      migration.

## Décisions prises à l'exécution (2026-08-22)

- **`authentifierPatientPortail`, pas `authorizePortail`** : le second exige
  une assignation et refuserait (404) un patient qui n'en a plus — précédent
  motivé `api/portail/bilan/route.ts:36-38`.
- **Dossier clos : le dépôt reste autorisé** (arbitrage du responsable). La
  clôture est un état du suivi praticien, pas un ordre de silence fait au
  patient. Commenté dans la route et asserté par banc, pour que l'absence de
  garde se lise comme un choix et non comme un oubli.
- **Borne de 4 000 caractères par refus, jamais par troncature.** Le dépôt
  porte un contre-patron dans le même répertoire de routes portail
  (`trust/signalement/route.ts:61-62` tronque du texte libre patient) : la
  troncature silencieuse d'une parole est une altération de donnée, pas une
  validation. Le module le dit en commentaire de tête.
- **`saisiLe` absente reste absente** — jamais comblée par `creeLe`, ni à
  l'écriture ni à l'affichage : ce serait fabriquer une déclaration (`DC-24`).
- **Un interrupteur `GET` sur la route de dépôt** rend le lien du hub patient
  gardable : le drapeau est serveur, le hub est un composant client, et le
  seul autre idiome du dépôt s'appuie sur des données que le serveur envoie
  déjà — ce que ce lot n'a pas. Il ne lit aucune entrée (asserté), passe la
  même authentification que le dépôt, et rien ne s'affiche tant qu'il n'a pas
  répondu.
- **Le bouton de réessai porte un nom qualifié** (« Réessayer la lecture ») :
  l'onglet « Trajectoire » en portait déjà un, et deux homonymes rendaient un
  banc préexistant indéterminé — en plus d'être ambigus au lecteur d'écran.

## Dettes nommées, sans lot d'accueil

- **Aucune cadence sur les routes portail authentifiées** — le seul plafond du
  dépôt vit sur le canal non authentifié `lien/demande`. Risque assumé, nommé
  ici, aggravé par le fait qu'un dépôt est une écriture. La borne technique de
  transport ajoutée à la revue (64 Kio, refus avant lecture du corps) borne la
  TAILLE d'un appel, pas leur NOMBRE : elle ne referme pas cette dette, elle
  en retire seulement le cas du corps aberrant.
- **Pas de relecture patient de ses propres entrées** : l'écran d'assemblage
  est le LOT-06. Tant que le drapeau est éteint, la question ne se pose pas ;
  elle se posera à l'allumage.

## Dettes ouvertes par la revue indépendante (2026-08-22), non corrigées ici

Nommées, arbitrées « hors périmètre du lot », à reprendre là où elles ont un
lot d'accueil :

- **La lecture praticien n'est pas gardée par `WN_CE_QUI_COMPTE`** — c'est un
  choix motivé dans la route (drapeau éteint ⇒ liste vide, qui est un silence
  honnête ; un 503 ferait croire à une panne). Son effet de bord, lui, n'est
  pas cadré : le panneau `CeQuiComptePanel` charge à chaque activation de
  l'onglet « Trajectoire », et `verifierAppartenancePatient` **journalise un
  accès au dossier à chaque fois**, drapeau éteint compris. Le journal d'accès
  (`G-TRUST-04`) se remplit donc de lectures d'une surface qui n'est pas
  ouverte. Rien n'est faux — l'accès a bien eu lieu —, mais le bruit est réel
  et grandira à l'allumage.
- **Aucun E2E du trajet dépôt → lecture.** Tout ce qui est prouvé l'est par
  bancs unitaires, route par route et écran par écran : personne n'a joué le
  parcours complet (le patient dépose au portail, le praticien relit la même
  parole dans le dossier). Le drapeau étant neuf et éteint, l'E2E devra
  l'allumer explicitement — à écrire avant l'allumage en production, pas
  après.
- **La session portail dure 12 h, et une saisie longue peut la dépasser.** Le
  formulaire ne vide pas le champ sur erreur (asserté par banc), donc le texte
  reste À L'ÉCRAN sur un 401 — mais rien n'est persisté : un rechargement, une
  fermeture d'onglet ou une navigation perd la saisie. Aucun brouillon local,
  aucune reprise. Le risque est proportionnel à ce que le champ invite à
  écrire.
