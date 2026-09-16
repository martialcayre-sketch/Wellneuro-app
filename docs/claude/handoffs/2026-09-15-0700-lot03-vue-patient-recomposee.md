# Handoff — 2026-09-15 — LOT-03 (1/2) : la vue patient recomposée

Première livraison du matin, et **la première moitié du LOT-03**. Elle part sur un
arbitrage du responsable rendu au réveil, sur trois questions posées **après**
vérification du code — la nuit précédente avait produit deux arbitrages rendus sur
prémisse fausse, et c'est la correction de ce défaut.

## L'arbitrage, et ce qu'il a fallu vérifier avant de le poser

`buildPatientProtocolView` exige une `DecisionCard` **entière**. Aucune table
`decision_cards` n'existe. Trois faits ont été établis avant la question :

1. **La carte ne fournit qu'un seul champ à la vue** — `priorityLabel`, qui vaut
   `candidate.label`, c'est-à-dire exactement `regle.libelle` du registre signé. Les
   trois autres champs qu'elle porte sont déjà persistés sur `protocol_drafts`. Tout
   le reste de la carte est de la **garde**.
2. **Ces gardes ne sont opposées nulle part** — la route de diffusion ne construit
   aucune carte : elle lit `version.decisionCardInputHash` sur la ligne du brouillon
   et approuve.
3. **La dérive de l'empreinte est bornée** : le snapshot est borné à
   `episode.includedResponseIds` et l'horodatage vaut `episode.confirmedAt`, donc
   **une passation nouvelle ne bouge rien**.

Le responsable a tranché **la recomposition à la lecture** (et non la voie
recommandée), les gardes **portées à la diffusion**, et le **refus net + signal
praticien**. Les trois réponses forment un tout cohérent : l'écran patient devient
une re-dérivation vivante, et quand elle ne correspond plus à ce qui a été approuvé,
le patient lit l'indisponibilité au lieu d'une vue périmée.

## Branche et état Git

- Branche `lot03-vue-patient`, partie d'`origin/main` à `55ac299b`.
- Sur `main` depuis l'ouverture de la campagne : #1103, #1104, #1106 (`D-188`),
  #1108 (`D-189`), #1109 (LOT-02), #1110 (`D-190`), #1111 (LOT-04 1/2), #1112.

## Ce qui est livré

- **`rejeuCarteDecision.ts`** — la chaîne C1 rejouée depuis la base à l'horodatage de
  confirmation de l'épisode que le brouillon nomme, par la **même lecture**
  (`entreesRuntime`, désormais exportée) et la **même construction**
  (`construireChaineC1Tolerante`) que le cockpit et que le vérificateur. Quatre motifs
  de refus nommés, aucun ne traverse jusqu'au patient.
- **La garde de fraîcheur** : empreinte recomposée ≠ empreinte approuvée ⇒ rien n'est
  servi.
- **Le contrat branché dans les deux routes** — portail patient et `praticien/ja/cycle`,
  qui se déclarait « miroir exact » en commentaire tout en recopiant le même défaut.
- **`vuePatientSurLeFil.ts`** — la projection, écrite **en un seul endroit**, que les
  deux routes et les trois écrans lisent. Elle écarte nommément les identifiants
  d'enveloppe et les trois empreintes.
- **L'écran patient** : les trois actions, la phrase d'attente sur une intervention
  non ferme, le libellé d'axe signé, le critère à trois semaines. Le « jour difficile »
  ne propose **jamais** une action suspendue.
- **Le refus des deux côtés** : indisponibilité distincte de l'attente côté patient ;
  constat « n'est plus affiché à votre patient » sur l'écran de diffusion, calculé par
  **la même fonction**, sur la **version approuvée** — distinct de `stale`.
- **Le bouton « Ma fiche conseils »** dit ce qu'il fait.

## Deux défauts trouvés en chemin

1. **Le carnet alimentaire s'ancrait sur `actions[0]`, quel que soit son type.**
   Invisible tant que toute action neuve naissait `food` ; depuis `D-189`, la première
   action peut être une **orientation médecin**, et le carnet ALIMENTAIRE l'aurait
   affichée comme l'essai à observer.
2. **La fixture de son banc posait `type: 'alimentation'`** — un type qui n'existe à
   aucun contrat. Le champ était `string` : le banc passait au vert sur une valeur que
   la production n'aurait jamais produite. Le type du contrat y entre.

## Les bancs sont vérifiés, pas affirmés

- Projection réduite à une action ⇒ **trois bancs rouges** constatés.
- Garde de fraîcheur neutralisée ⇒ **un banc rouge** constaté.
- Restauration **depuis une copie** dans les deux cas, jamais par `git checkout --`.

## Vérifications

- T1 vert (après deux gardes d'état : `active_lot` et la tête de `next_action`, plus
  la matrice de consommation régénérée avec `--markdown`).
- Suite unitaire entière : **9 211 verts**.
- T3 : 192 verts. Seul rouge — `portail-dossier-deux-voix` sur iPhone 13, signature
  `D-049`, macOS seulement, diagnostiquée par le script lui-même comme sans rapport
  avec le diff.
- Aucune migration, aucun drapeau, aucune identité patient.

## Ce qui reste

- **PR 2 du LOT-03** : porter à la diffusion les gardes que la carte portait —
  abstention requise et constat de sécurité, opposés nulle part aujourd'hui.
- **LOT-04 (2/2)** : bloqué sur l'arbitrage du porteur de provenance de la citation.
- **LOT-06** : attend la première ligne de barème signée du praticien.
- **Dettes nommées, non refermées** : `adviceSheetRef` mort de bout en bout ; aucune
  limitation patient servie ; le marquage « votre patient lira ceci » reporté au
  LOT-04, qui touche déjà ces champs.

Voir [[D-191]].
