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

**Revue adversariale : NO-GO, puis GO.** Le défaut bloquant n'était pas dans le
chemin nominal mais dans **le seul que la production exécute**. Table non signée
→ aucun bloc injecté → allowlist vide → et le garde tournait quand même,
comparant la prose du modèle aux seize titres de packs. Quatre d'entre eux sont
des syntagmes cliniques français ordinaires (« digestif et intestin-cerveau »,
« stress chronique et burnout », « sommeil et chronobiologie », « migraine et
cephalees ») : une synthèse fidèle se voyait accusée d'avoir cité un pack hors
recommandation, **l'accusation était persistée dans le dossier patient**, et le
code d'événement créé pour mesurer l'infidélité aurait été saturé de bruit avant
que le chemin qu'il surveille existe. Reproduit à la main avant correction.

Six correctifs issus de cette revue :

1. Le garde est conditionné à l'**injection effective** d'un bloc, pas à `actif`.
2. Un titre de pack ne compte que **précédé du mot « pack »** ; le slug, sans
   homonyme naturel, reste cherché partout. Cinq proses cliniques ordinaires sont
   au banc en contrôles négatifs.
3. Le garde couvre désormais aussi les **questionnaires** — la consigne les
   interdisait déjà, et le modèle a leur vocabulaire en main puisqu'il reçoit le
   dossier. L'allowlist inclut donc les questionnaires du dossier : les citer est
   son travail.
4. `emailPatient` n'est passé que s'il **désigne le patient affiché** : deux
   identifiants de deux sources dont aucune ne vérifiait l'autre, pour un geste
   qui envoie un e-mail.
5. Après une assignation réussie, le bouton **ne revient pas** — la route ne
   déduplique pas. Un échec, lui, laisse réessayer.
6. Invariant : aucun déclencheur de la table ne porte sur une passation du
   registre `passationsNonInterpretables`. Vrai par accident, désormais gardé.

Et deux points de forme : la nouvelle consigne ne prime plus « sur toute autre »
mais sur celles **relatives aux explorations** — trois règles mutuellement
suprêmes ne forment pas un ordre ; et `orientationVersion` n'est plus inscrit
quand aucun bloc n'est parti.

**Contre-revue : NO-GO à son tour, sur trois défauts que le premier correctif
avait créés ou laissés.** Aucun n'était structurel, tous étaient réels.

1. **Une affirmation que le code contredit.** L'écran disait « le patient a reçu
   son e-mail ». Or `packs/assign` envoie en **best-effort** et rend
   `success: true` même sur échec SMTP — le dépôt distingue explicitement les
   deux (`statut: 'Non_envoye'`). Un praticien lisant cette phrase ne relance pas.
   L'UI dit désormais « Pack déjà assigné depuis cet écran », ce que la route
   garantit et rien de plus. C'était le seul défaut du lot qui **affirmait au
   praticien un fait faux**.
2. **La classe de défaut du premier NO-GO revenait par les questionnaires.** Le
   prompt système cite lui-même seize identifiants en exemple (`Q_ALI_03`…). Le
   modèle les a sous les yeux avant de voir le dossier : les lui reprocher, c'est
   l'accuser d'avoir inventé ce qu'on lui a soufflé — et persister l'accusation
   dans le dossier. L'allowlist a une **troisième source**, dérivée du prompt réel
   et non recopiée, pour qu'un exemple ajouté demain n'ouvre pas la même faille.
3. **L'état d'assignation survivait au patient.** Les clés (`pack:slug`) ne
   portent pas l'identifiant : sans démontage, un patient B héritait du « déjà
   assigné » de A — affirmation fausse **et** geste légitime bloqué. Remise à zéro
   sur `idPatient` seul, dans un effet séparé : la relancer sur « Réessayer »
   rouvrirait la porte à une seconde assignation.

Deux points mineurs traités dans la foulée : l'adjacence « pack » ratait le
pluriel (« les packs X et Y ») alors que **l'énumération est la formulation
naturelle d'un bloc numéroté**, et c'est exactement là qu'un pack inventé se
glisse à côté d'un légitime — remplacée par une fenêtre de 40 caractères tolérant
pluriel et qualificatif intercalé ; et `orientationVersion` est de nouveau
persisté même sans bloc, parce que « quelle table était en vigueur » et « un bloc
est-il parti » sont deux faits distincts que `orientationInjectee` sépare déjà.

**Non traité, inscrit en réserve** : le garde ne voit pas un pack nommé sans
« pack » nulle part avant lui, ni un pack cité loin derrière son introducteur, ni
une exploration en langage libre, ni un **réordonnancement** — pourtant interdit,
mais qui demanderait de comparer des positions dans une prose. C'est écrit dans
l'en-tête du module pour qu'aucun lecteur ne le croie couvert. Reste aussi
ouverte la question de fond soulevée par la revue : un écart mesuré par
heuristique textuelle a-t-il sa place dans `donneesEntree` du dossier, ou
seulement dans le journal ?

**Validation** : T1 vert (3 393 tests unitaires + 872 bancs). T2
(`test:worktree -- --fast`) vert en 3 min 53 s. Un premier T2 avait échoué sur
`portail-lien-magique.spec.ts:48` — l'anti-oracle de temps du portail patient,
qui compare deux durées à 800 ms près et mesurait 21 s sur une machine chargée.
Sans rapport avec ce diff, qui ne touche pas le portail, et vert au rejeu.
41 nouveaux tests unitaires : 13 panneau, 10 service, 18 garde, plus 16 sur la
restitution et l'invariant.

**Reste ouvert** : la signature de la table (geste praticien) ; aucun banc ne
confronte les `claimId` à `rag_corpus_claims` — la vérification reste manuelle
avant chaque signature.
