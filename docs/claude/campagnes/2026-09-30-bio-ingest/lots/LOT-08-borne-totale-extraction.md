---
id: "LOT-08"
titre: "Durcissement : borne totale de l'extraction"
statut: "terminé"
dépend_de: "LOT-02"
---

# LOT-08 — Durcissement : borne totale de l'extraction

## But

Rendre vrai l'invariant que le LOT-02 croyait tenir : une extraction finit,
réussie ou en échec, avant la péremption d'un import en cours (5 min).

## Résultat observable

Un appel dont le flux ne finit jamais est clos `delai_depasse` avant la
péremption, au lieu de laisser l'import `en_cours` sans terme.

## Cause

L'option `timeout` du SDK Anthropic (0.107.0) n'arme son minuteur qu'autour du
`fetch` : il est effacé dès les en-têtes reçus. La lecture du flux qui suit
(`messages.stream().finalMessage()`, jusqu'à 32 000 jetons) n'avait aucune
borne. Le test « 180 s < 5 min » jugeait une constante, pas l'appel. Constat de
l'état des lieux BioFlow du 2026-10-04. Le défaut ne vise pas la photo ou le
scan (LOT-03) : il touche l'infrastructure d'extraction, d'où une fiche dédiée
(arbitrage du responsable, 2026-10-05).

## Périmètre

- Signal d'abandon sur l'appel entier, en-têtes et flux :
  `DUREE_TOTALE_EXTRACTION_MS` (240 s). `DELAI_EXTRACTION_MS` (180 s) reste la
  borne des en-têtes.
- Un abandon est classé `delai_depasse`, sans lire le message d'erreur.
- Délai explicite de la transaction des lignes (TEMPS 3) :
  `DELAI_TRANSACTION_LIGNES_MS` (20 s), à la place des 5 s implicites de
  Prisma.
- Invariant : borne totale + transaction des lignes + marge ≤ péremption.
- Correction de la fiche LOT-02 (120 s, 180 s).

## Hors périmètre

Worker, file d'attente, nouvelle tentative, balayeur des imports fantômes
(après LOT-07, arbitrage du 2026-10-05). Consigne, schéma de sortie et version
du procédé inchangés.

## Fichiers probables

- `web/src/lib/biology-library/import/extraction.ts`, `verrou.ts`,
  `lancerExtraction.ts` et leurs tests

## Interdits

- Pas de migration, pas de modification de `schema.prisma`.
- Pas de retry, pas de worker.
- Aucun message d'erreur journalisé (classe et code seulement).

## Dépendances

LOT-02

## Étapes

- [x] Écrire le test qui montre le défaut, sur le vrai client du SDK.
- [x] Borner l'appel entier.
- [x] Délai explicite de la transaction des lignes.
- [x] Corriger la documentation.

## Tests

`extraction.borne.test.ts` : vrai client du SDK, seul le `fetch` est simulé.
Un flux sans fin, un fournisseur muet, un flux complet sans minuteur résiduel.

## Critères de done

Le test du flux sans fin, rouge avant le correctif, est vert après. T1 et T2
verts, CI à 0.

## Résultats

- Avant le correctif, le flux sans fin restait pendant à 5 min (assertion
  rouge constatée) ; après, il est clos `delai_depasse`.
- Écart à l'état des lieux du 2026-10-04 : la transaction des lignes n'était
  pas « sans timeout » mais bornée aux 5 s implicites de Prisma. Le délai
  devient explicite (20 s). Il court attente du verrou comprise : si une
  décision tenait le verrou ses 20 s entières, la transaction expirerait et
  l'import serait clos `reponse_invalide`, motif inexact mais échec sûr et
  relançable (cas extrême, une décision dure quelques millisecondes ; c'était
  pire à 5 s). Le classement de cette expiration en `delai_depasse` est laissé
  à un lot ultérieur.
- Revue `wn-reviewer` : GO, aucun P0 ni P1. P2 traités : valeur exacte de la
  borne testée ; attente du verrou documentée. P2 accepté : une borne qui
  tombe entre la fin du flux et sa résolution donne un `delai_depasse`
  relançable (fenêtre de quelques microtâches).
- Reste à constater sur Scalingo : le client prend le `fetch` global, modifié
  par Next 15, dans `after()`. La preuve hors dépôt porte sur le `fetch` de
  Node nu. Un appel interrompu doit y finir `delai_depasse` ; ce constat
  rejoint celui de `after()` qu'attend déjà la fiche LOT-02.
- Risque résiduel : un compte rendu dense légitime de plus de 240 s finirait
  en échec, relançable à la main. 36 s ont été mesurées pour 75 lignes, ~95 s
  estimées pour 200.
