# 2026-08-22 15:25 — Alliance 6.0-A LOT-05 : l'EVA entre par la voie cabinet, sans jamais classer

## Ce qui a changé

- **`D-087` au registre** — la garde « tout instrument du cabinet porte une
  grille complète et couvrante » est **relâchée pour une famille déclarée, et
  pour elle seule** : `sum_no_interpretation`. Les trois familles qui
  concluent (`sum`, `sum_reversed`, `count_threshold`) sont inchangées au
  caractère près ; leurs bancs sont verts sans modification.
- **La contrepartie est une garde inverse, plus stricte** : sur cette famille,
  une bande — une seule, même « neutre », même couvrante — est **refusée** aux
  **cinq** points d'appel de `validerInstrumentCabinet`. L'item `number` borné
  y est admis, `min`/`max` **déclarés** obligatoires ; il reste refusé
  partout ailleurs.
- **Le moteur n'a pas bougé d'une ligne.** `sum_no_interpretation` existe dans
  `questions.ts` depuis le catalogue Drive — servi par `Q_PED_01`
  (Matinalité-Vespéralité Enfant, `questions.ts:939`) et `Q_MOD_02`
  (`questionnaires/mode-de-vie.ts:140`) ; `Q_MOD_01` est `subscore`, pas cette
  famille — et rend `interpretation: null`. **Aucune migration** : les
  colonnes Json suffisent.
- **Écran de relecture** : plus de crash sur une grille absente (`.map` gardé
  aux deux endroits que le typage a fait apparaître) ; la relecture affiche
  l'énoncé et ses ancres, déclare « Aucune interprétation : cet instrument
  pilote la conversation, il ne classe pas », publie sous « Relu — publier ».
  L'éditeur **refuse** cette famille au lieu de lui poser une amorce de bande.

## Le piège du lot, et où il était

Ce n'était pas la grille absente, c'était la **grille par défaut** : la bande
unique « Grille à définir — relecture requise », colorée `warning`, posée quand
la grille manque. Sur un instrument qui ne classe pas, ce libellé d'attente est
un verdict de fait.

**Deux sites actifs, un défensif — dit tel quel**, parce qu'une première
rédaction annonçait « trois sites » et surestimait la couverture :

- **ACTIF** — `validerInstrumentCabinet` refuse toute bande sur cette famille,
  d'où qu'elle vienne. C'est la garde qui tient réellement.
- **ACTIF** — l'amorce de l'éditeur : il refuse la famille au lieu de lui
  poser sa bande d'attente.
- **DÉFENSIF** — le paramètre `typeDemande` de `scoringParDefaut` : la garde y
  est câblée mais **aucun appelant ne le passe**. Les trois appels de
  `import/route.ts` sont sans second argument et n'ont lieu que lorsque
  `scoring` est absent — cas où aucune famille n'est déclarable. Chemin
  inatteignable en l'état ; gardé pour un futur appelant, pas pour aujourd'hui.

Ce qui couvre réellement « items `number`, grille absente » est donc un
**refus dédié de l'import** : il nomme le geste attendu (déclarer
`scoring: { type: 'sum_no_interpretation' }`) là où les messages de la famille
par défaut — « seul “likert” est admis », « entre 2 et 8 options » — sont
exacts mais muets sur ce qu'il faut faire. Fail-closed inchangé : 400 avant,
400 après ; seul le message change.

La garde nommée `interditTouteBande` vit dans **`@/lib/echelles-cabinet`**
(module feuille, sans Prisma) et non dans `@/lib/instruments` : la Bibliothèque
est un panneau **client**, et importer `instruments.ts` y aurait embarqué
Prisma dans le bundle navigateur — le module feuille existe déjà pour cette
raison, son en-tête le dit.

## À savoir pour la suite

- **Réserve fermée par banc** : `sum_no_interpretation` n'émet ni `missing` ni
  `repondus` (contrairement à `sum`). La complétude d'un recueil de cette
  famille n'est tenue que par la garde d'`api/patient/submit` — assertée, et
  rouge à son débranchement. Tout futur consommateur qui lirait `missing` sur
  un instrument du cabinet doit le savoir.
- **L'entrée d'une EVA se fait par import JSON** (shape complète : items
  `number` bornés + `scoring: { type: 'sum_no_interpretation' }`), pas par
  l'éditeur — celui-ci ne sait écrire que des likert sur échelle nommée et des
  bandes contiguës, il détruirait l'instrument des deux côtés.
- **Non fait, volontairement** : aucune surface de **trajectoire** (les
  passations successives d'une même EVA côte à côte). Le lot pose la voie et
  les gardes ; la restitution reste celle qui existe — valeur, `—` en
  interprétation, badge « Cabinet — scoring non vérifié ».
- L'union discriminée `ScoringCabinet` rend `interpretation` **optionnel** :
  tout nouveau consommateur devra le garder (`?? []`). C'est voulu — le typage
  a trouvé les deux crash latents à notre place.

## Ouvert

- PR du lot non ouverte : c'est la session principale qui la crée après revue.
- **`D-086` : résolu.** La contrainte d'ordre annoncée au premier jet est
  tombée — #748 est mergée, `D-086` est au registre, `origin/main` a été mergé
  dans cette branche (conflit `DECISIONS.md` résolu : `D-087` en tête, `D-086`
  dessous) et le garde de numérotation rend 87 décisions sans doublon ni trou.

### Dus d'affinage — nommés, non faits

Aucun n'est bloquant ; tous sont des angles que la revue a vus et que ce lot
n'a pas voulu élargir.

- **`step` n'est pas validé à l'import.** `normaliserDefinitionCabinet` laisse
  passer `step` tel quel sur un item `number` (`step: 0`, négatif ou non
  numérique inclus). Sans conséquence de score — le moteur lit la valeur, pas
  le pas — mais l'attribut part au navigateur. À border si l'on veut que
  l'ancre soit vraie de bout en bout.
- **La bascule d'un instrument gradué vers cette famille est admise en
  l'état** (PATCH `scoring.type` → `sum_no_interpretation`). C'est
  **fail-safe** : les bandes sont perdues, jamais inventées, et le changement
  de contenu repasse l'instrument en brouillon, donc une republication relue
  est exigée avant tout envoi. À re-trancher si l'on préfère un refus explicite
  plutôt qu'une conversion silencieuse d'un instrument déjà passé.
- **Bancs dus** (quatre, tous sur des chemins réels non couverts) :
  1. `publier` / `demander_relecture` sur une ligne portant **déjà** une bande
     en base pour cette famille — la validation les refuse, mais rien ne
     l'asserte à ces deux points d'appel ;
  2. PATCH `sum` → `sum_no_interpretation` (la bascule ci-dessus) ;
  3. `step` invalide à l'import ;
  4. aperçu praticien (`bibliotheque/apercu`) d'un item `number` — le rendu
     est celui de `QuestionField`, jamais joué sur un instrument du cabinet.
