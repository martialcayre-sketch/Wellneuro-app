# LOT-12 — La contre-revue adverse : six trous, dont un servi au patient

- Date : 2026-08-24
- Campagne : `2026-08-18-doctrine-executable`, LOT-12
- Décision : `D-108`
- Branche : `clinique/lot12-bancs-elargis`
- Revue amont : PR #792 (`REVUE_CODEX_ADVERSE_2026-08-24.md`)

## La revue a été lancée avant la clôture, et c'est ce qui a payé

Sept des treize affirmations réfutées, six debout. Les six trouvailles ont été
**revérifiées une par une** dans l'arbre à `7793a4ac` avant tout correctif :
toutes réelles. Rien n'a été corrigé sur la parole de la revue.

Le LOT-08 ne change aucun code — la surface relue était identique avant et
après. Mais il **grave** l'état final. Une règle actée sur un banc qui ne mord
pas y serait inscrite comme fermée.

## Le trou qui n'était pas un banc perfectible

`PatientCompanionHome.tsx` servait du vocabulaire de jeu **au patient depuis le
2026-07-18** (`477fa20d`), monté par le portail. Le mot est le **deuxième
motif** de la liste surveillée : ce n'est pas la liste qui a failli, c'est le
périmètre — le garde connaissait la **page**, pas le **composant** qu'elle
monte.

**Deuxième fois que ce garde est pris à ne pas couvrir ce qu'il annonce.** Le
LOT-11 avait trouvé ses entrées de fichier muettes ; la non-vacuité *par entrée
déclarée* qu'il a posée ne pouvait rien dire d'une surface **jamais déclarée**.
Le correctif ferme la classe : remontée **transitive** des imports du portail,
chaque racine atteinte doit être déclarée. Deux manquaient (`patient-companion`,
`ui`).

## Les trois bancs, élargis — et ce que la mesure a corrigé en route

| Banc | Mutation qui passait | Après |
|---|---|---|
| bump de version | `× 100 → × 99` déplace tous les scores | 4 mutations rouges |
| seuils littéraux | `Math.min(0,95, …)` | mutation exacte rouge |
| nature du total | second affichage sous alias | mutation exacte rouge |

**Le sixième scénario a dû être mesuré.** Rejouée contre les cinq premiers, la
mutation n'en faisait rougir qu'**un**, et `Math.round → floor` passait vert sur
les cinq : l'arrondi entier absorbe 1 % sur les petites valeurs.
`frontiereArrondi` tombe sur **64,5** exactement. Les cinq sorties de référence
ont été **vérifiées à la main** avant inscription, jamais recopiées d'un
`console.log` — épingler le résultat d'une exécution fige un comportement sans
l'avoir jugé.

**Le `.slice` est resté dehors sur mesure** : 39 littéraux d'écrêtage dans
`src/lib`, dont **30** de troncature d'affichage. Les faire entrer aurait noyé
la liste d'exemptions sous une classe qui ne décide de rien.

## Deux surfaces que le suivi par nom ne pouvait pas voir

`TrajectoirePanel` et `J21DecisionPanel` atteignent le même agrégat par des
chemins de données distincts — la valeur change de nom en traversant une réponse
d'API. D'où un **second détecteur, par libellé** : il lit ce que le praticien
lit, pas ce que le code nomme.

## Un piège du dépôt, deux fois

- **Le `code=$?` d'une tâche de fond masque l'échec** : le premier T1 a rendu
  `0` alors que `type-check` était rouge — c'est le `echo` qui réussissait. La
  mémoire du dépôt le décrit ; il a fallu lire le log pour le voir.
- **Le garde de gamification lit les commentaires** : le commentaire qui
  expliquait le retrait du mot contenait le mot. Comportement correct — il lit
  du texte, pas des intentions.

## Validation

- **T1 vert** (code 0 réel, vérifié dans le log).
- Arbre restauré après chaque mutation (`git diff --stat` vide).

## Ouvert

- `F5`/`F6` portent sur l'arbre final, **non attribués** à un commit de la
  campagne : les corriger ici est un choix de sécurité, pas une réparation.
- Limite restante du détecteur par nom : le franchissement de **fichier** (prop
  renommée chez l'enfant). Le détecteur par libellé couvre par le mot, pas par
  la donnée.
- **LOT-08** reprend la main, désormais adossé à une revue adverse.
