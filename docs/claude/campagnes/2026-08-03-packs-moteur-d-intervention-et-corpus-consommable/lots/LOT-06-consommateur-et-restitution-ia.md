---
id: "LOT-06"
titre: "Consommateur praticien et restitution IA"
statut: "en_revue"
dépend_de: "LOT-05"
palier: "T2"
---

# LOT-06 — Consommateur praticien et restitution IA

## But

Brancher un écran praticien sur la route d'orientation, et faire restituer la
recommandation par la première synthèse IA — sans jamais lui laisser la produire.

## Le défaut à corriger

```
grep -rln "praticien/orientation" web/src
  → la route, son test, et la table de règles. Rien d'autre.
```

La route existe depuis la campagne de certification et **personne ne l'appelle**.
Une recommandation que rien n'affiche n'est pas une fonctionnalité.

## Arbitrage tranché au cadrage (PMI-5)

Le moteur déterministe produit la recommandation ; la synthèse IA la **restitue
et l'explique**. Elle ne la génère pas, ne la complète pas, ne la réordonne pas.

La raison est la traçabilité : une recommandation produite par un modèle n'a ni
table signée ni `sha256`, et rien ne permet, six mois plus tard, de dire pourquoi
tel pack a été proposé à tel patient. L'option « l'IA propose, le moteur filtre »
a été examinée et écartée pour cette raison.

## Résultat observable

Sur la fiche d'un patient ayant répondu au pack initial, le praticien voit les
recommandations d'exploration, leur motif, et le `sha256` de la table qui les a
produites. Un clic assigne — le geste manuel existant, jamais un automatisme.

## Périmètre

- Choisir la surface d'accueil (question ouverte de campagne : fiche patient,
  Spirale, ou écran dédié) et l'écrire.
- Appeler `GET /api/praticien/orientation` et afficher le résultat, y compris
  l'état `actif: false` (message, pas d'erreur).
- Passer la recommandation déterministe **en entrée** de la synthèse IA
  (`web/src/app/api/praticien/synthese/route.ts`), avec une consigne de
  restitution.
- Journaliser ou afficher le `sha256` avec la recommandation.

## Hors périmètre

- Toute exposition patient de la recommandation.
- Toute auto-assignation.
- Toute génération de pack par le modèle.

## Fichiers probables

- surface praticien retenue (`web/src/app/dashboard/…`, composant)
- `web/src/app/api/praticien/synthese/route.ts`
- `web/src/lib/anthropic.ts` (consigne de restitution)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de texte UI en anglais.
- Pas de recommandation générée par le modèle.
- Pas d'assignation automatique.
- Pas de refactor hors lot.

## Étapes

- [x] Trancher la surface d'accueil et l'écrire dans `CAMPAGNE.md`.
- [x] Brancher l'appel et l'affichage, état inactif compris.
- [x] Injecter la recommandation en entrée de la synthèse, avec sa consigne.
- [x] Vérifier qu'un prompt ne peut pas faire inventer un pack au modèle.
- [x] `npm run check` puis `npm run test:worktree -- --fast`.

## Tests

- `actif: false` → message en français, pas d'erreur, pas d'écran vide.
- La synthèse ne cite aucun pack absent de la recommandation reçue.
- Aucune assignation n'est créée par l'affichage.
- E2E : le parcours praticien reste intact.

## Critères de done

- [x] Un écran praticien appelle réellement la route.
- [x] Le `sha256` accompagne la recommandation.
- [x] La synthèse restitue sans produire, vérifié par test.
- [x] Aucune régression E2E sur le parcours praticien (T2 vert, 108 tests).

## Résultats

**Surface tranchée : l'onglet Trajectoire de la fiche patient**, et non
`/dashboard/trajectoires` — cette page n'est qu'une liste de 21 lignes. La vue
par patient est `patient-cockpit/TrajectoirePanel.tsx`, atteinte par le
deep-link `?onglet=trajectoire`. L'encart n'est monté **qu'au présent** : une
recommandation se lit sur l'état courant, et l'afficher en lecture datée la
ferait passer pour ce que la table proposait à cette date-là.

**Limite assumée et connue d'avance.** La table du LOT-05 n'est pas signée : le
seul chemin exerçable en dev comme en production est `actif: false`. L'écran
affiche « en cours de constitution ». Le chemin `actif: true` n'est couvert que
par des tests à service mocké. Le critère de campagne « un écran praticien
appelle réellement la route » est atteint ; « la route sert des recommandations »
reste suspendu à la relecture clinique des six règles.

**Extraction imposée par un second consommateur.** L'évaluation a quitté
`route.ts` pour `lib/clinical/orientationService.ts` : la synthèse en avait
besoin, et dupliquer le double verrou fail-closed dans deux routes aurait créé
une copie qu'on peut oublier de corriger. Deux propriétés préservées et
désormais gardées par un banc : le contrat HTTP est inchangé (21/21 sans
retouche du test), et le verrou est vérifié **avant** le contrôle d'appartenance
— qui journalise l'accès au dossier. Table non signée, aucune lecture, donc
aucun accès consigné qui n'a pas eu lieu.

**Trois défauts évités au cadrage, chacun aurait produit un bouton menteur** :
`packs/assign` identifie le patient par son **email**, pas son identifiant, et
`TrajectoirePanel` ne recevait que `idPatient` — d'où la prop `emailPatient`
plutôt qu'une modification de la route d'écriture ; un pack de doctrine sans
`idPackBase` n'existe pas en base et son assignation échouerait en
`pack_not_found` ; et l'assignation **envoie un e-mail au patient**, ce qui
justifie une confirmation en deux temps depuis un écran de lecture.

**Le garde anti-invention est une mesure, pas une consigne.** « Le modèle a-t-il
inventé quelque chose » est indécidable ; « un nom du vocabulaire fermé des 16
packs apparaît-il hors de ceux transmis » ne l'est pas.
`verifierRestitutionOrientation` est une fonction pure sur ce vocabulaire.
Arbitrage : on **journalise sans censurer** — l'objet actionnable vient de la
route déterministe, jamais du modèle, donc un pack cité à tort dans la prose ne
peut rien déclencher, et un faux positif de correspondance textuelle ne doit pas
priver le praticien de sa synthèse. Code d'événement **distinct** de
`CONTEXT_UNAVAILABLE` : le premier dit qu'une donnée a manqué, celui-ci qu'une
donnée a été inventée ; les confondre rendrait l'écart invisible.

**Effet de bord relevé pendant le lot** : `orientationRulesV1` signe sa table
avec `sha256`, exporté par `corpusSyntheseV1`. Trois suites de la synthèse
mockaient ce module sans exposer `sha256` — l'import cassait dès que la route
atteignait le service. Mock complété dans les trois.

**Validation** : T1 vert, T2 (`test:worktree -- --fast`) vert en 4 min 3 s —
108 E2E passés, dont le parcours praticien et l'onglet Trajectoire. 29 nouveaux
tests unitaires (10 panneau, 10 service, 9 garde) plus 10 sur la restitution.

**Reste ouvert** : la signature de la table (geste praticien) ; aucun banc ne
confronte les `claimId` à `rag_corpus_claims` — la vérification reste manuelle
avant chaque signature.
