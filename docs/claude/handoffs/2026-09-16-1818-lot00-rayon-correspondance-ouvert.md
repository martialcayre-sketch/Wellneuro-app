# Handoff — 2026-09-16 — LOT-00 : le rayon Correspondance sort du différé

Second lot de la campagne **ouverture du rayon Correspondance**. Il dépendait du
LOT-01 ([[D-209]], PR #1146, mergée) : sa page monte le panneau dont le contrat
venait de changer, et sa tâche de deep-link touche le même fichier. Décision
**D-210**.

## Ce que le lot ferme

| Défaut du cadrage | État |
|---|---|
| La page annonce « Module différé » pendant que le badge compte des lignes réelles | **fermé** |
| L'écran promet des pièces jointes que `D-122` interdit | **fermé** |
| Aucun lien du produit ne conduit à l'onglet où le geste se fait | **fermé** |
| Le badge compte les gestes de son propre lecteur | **fermé** |
| Aucun e2e ne visite `/dashboard/correspondance` | **fermé** |

## Les deux choix de fond

**La page oriente, elle ne duplique pas.** Le plan disait « monter le composant
qui existe déjà ». Vérification faite, c'était trop naïf : `PanneauRail` est
dimensionné pour l'aside de 300 px et se replie en une ligne quand il est vide.
Le patron juste existait à côté — `dashboard/biologie/page.tsx`, qui renvoie vers
la Bibliothèque plutôt que de rejouer le rayon. La page nomme le geste, mène au
dossier, et rend les **mêmes cinq lignes** que l'accueil.

Allonger cette liste aurait rouvert la question que [[D-209]] §3 laisse ouverte :
`recentes` nomme cinq dossiers sans écrire au journal d'accès. Le lot ne l'a pas
rouverte — c'est délibéré, et c'est écrit.

**Le badge désigne une tâche.** Il comptait toutes les consignations sur sept
jours glissants, sans filtre de sens ; les deux sens étant des gestes du
praticien, il reflétait son lecteur — et **montait** quand une réponse était
transcrite. Il compte désormais les dossiers dont la dernière ligne est un envoi
antérieur au délai. Transcrire la réponse le fait descendre.

## Réserves, écrites plutôt que tues

- **L'appariement est par dossier, jamais par médecin.** `medecinLibelle` est du
  texte libre dont la seule garde est le refus du « @ ».
- **Le rail ne se rafraîchit pas en cours de session** — `useEffect` sans
  dépendance, deux instances qui lisent chacune la leur. Une relance traitée
  reste affichée jusqu'au rechargement.
- **Le délai de sept jours est un repère produit, pas clinique.** Il reprend la
  fenêtre précédente faute de mieux, et se révisera au premier constat d'usage.

## Validation

- **T1 vert**, **T2** joué (un changement d'UI ne se prouve pas par du Vitest).
- **64 bancs** sur le domaine.
- **Mutation** : retirer le filtre de sens du compteur fait rougir les deux bancs
  qui tiennent le changement — « une réponse transcrite referme l'attente » et
  « un sens illisible n'invente pas une attente ».
- **Un e2e visite enfin l'adresse**, et épingle les deux affirmations retirées.
  Aucun des vingt-neuf spécifications ne le faisait : rien ne rougissait quand la
  page contredisait le produit livré.

## Ce qui reste, et l'ordre

`LOT-02` (confort de transcription) puis `LOT-03` (la lettre posable et
l'ancrage à deux tables), qui **verrouille** `LOT-04` — la lettre d'adressage,
cœur de la campagne : six dossiers sur vingt-cinq portent un signal qui suspend
la décision, et aucune surface n'offre le geste.

Deux arbitrages restent ouverts et n'ont pas bougé : la colonne `supersedes_*`
(aucune rectification n'existe), et la journalisation de `recentes`.

Suivi : `~/Developer/suivi-rayon-correspondance.html`, tenu à jour à chaque PR.
