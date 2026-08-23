# LOT-04 — un objet de sécurité qui existait partout sauf à l'entrée

Campagne « Doctrine exécutable », décision [[D-099]], branche
`worktree-doctrine+lot04-objet-securite`.

## Ce que le lot a trouvé en s'ouvrant

`SafetyFinding` avait son type, son consommateur (`decisionCard.ts` bloque dès
`safetyFindings.length > 0`) et ses bancs depuis la chaîne T0. Il n'avait
jamais eu d'**entrée** : `chaineC1.ts` posait `safetyFindings: 0` en dur.
`DC-12` et `DC-23`, actées depuis [[D-043]], étaient donc **inertes en
production** — actées, bancées, et sans effet.

Le fond était déjà tranché ailleurs, et il fallait le retrouver : l'arbitrage
praticien du 2026-08-03, inscrit en tête d'`orientationRulesV1.ts`, interdit à
la table d'orientation de se déclencher sur un signal d'alerte — « un signal
d'alerte appelle un ADRESSAGE, pas une exploration ; la surface manque, c'est
un lot dédié ». Ce lot était ce lot-là, et personne ne l'avait relié.

## Ce qui a été mesuré avant de décider

Trois lectures de production (conteneurs `one-off-7803`, `one-off-9489`,
lecture seule, agrégats sans identité) :

- **25 consultations, 9 portent au moins un signal** — 36 %.
- **6 portent au moins un signal de rang `adressage`** — 24 %.
- Six libellés distincts, **tous exacts** : le cas « libellé hors cotation »
  est vide en production.

Ces chiffres ont changé l'arbitrage. La cotation **uniforme** — l'option qui
n'inventait rien et n'exigeait aucun arbitrage neuf — faisait taire le cockpit
sur 36 % des dossiers, y compris sur une constipation récente. La cotation
graduée rend **trois dossiers** à la table des priorités.

## Les deux gestes que le lot a dû demander

1. **Coter les douze signaux**, item par item, sur un critère écrit — « le
   report est-il lui-même le risque ? ». Aucun claim du corpus ne gradue ces
   libellés : la provenance est **décisionnelle**, régime d'[[D-062]].
2. **Re-signer la table des priorités.** Le texte signé d'`ABST-NR-01`
   affirmait « aucun producteur n'existe à ce jour » — ce lot l'a rendu faux, et
   le corriger referme le verrou. Conséquence découverte en cours de lot, pas
   anticipée au cadrage.

## Ce que la revue a trouvé, et qui était le vrai défaut

**L'inhibition mordait, et ne disait pas pourquoi.** Deux motifs d'abstention
existent et appellent des gestes **opposés** — adressage médical contre
passation —, et les trois surfaces du cockpit affichaient les deux « bloqueurs
décisionnels à revoir ». Les textes qui les distinguent étaient calculés,
entraient dans l'empreinte de la carte, arrivaient au navigateur : **aucun
composant ne les rendait**. Six dossiers sur vingt-cinq seraient passés en
écran muet dès le merge, et `DC-34`/`DC-35` n'étaient pas tenues.

Second défaut, plus fin : ma phrase re-signée disait « la portée de cette
**lecture** ». Or `adaptRuntimeInputs` rend une liste vide aussi bien sur
« aucun signal coché » que sur « aucune consultation validée à lire », et un
jalon post-T0 se confirme sans les préconditions qui exigent cette
consultation. J'affirmais donc une lecture qui n'avait pas forcément eu lieu —
le `DC-24` exact que cette re-signature existait pour corriger. Le texte a été
repris et le périmètre re-signé dessus.

## Ce qui reste ouvert, nommé plutôt qu'oublié

- **Deux requêtes de consultation coexistent** dans le dépôt. La chaîne C1 lit
  `statut: 'validee'` triée par `dateValidation` ; `orientationService`,
  `contradictionsService` et la synthèse lisent `NOT anamnese DbNull` triée par
  `createdAt`. Sur un dossier portant deux consultations validées dans un ordre
  divergent, la synthèse peut nommer un signal que le cockpit ne voit pas — et
  la synthèse passe par `extraireVigilanceDeterministe`, **le repli exact sur
  lequel s'appuie le rang `vigilance`**. Divergence **préexistante**, que ce lot
  fait porter sur un chemin de sécurité. Trancher laquelle fait foi est un
  arbitrage clinique : **au LOT-05**, qui rencontrera la même question.
- **Le tour du vérificateur n'est éprouvé sur aucun dossier portant un
  signal** : `ANAMNESE_C1_FIXTURE` n'en porte pas. Le code des deux lectures est
  identique — vérifié ligne à ligne en revue —, rien ne le garde.
- **Le verrou de la cotation a un sens inverse des autres** : le refermer
  retire une inhibition au lieu de faire taire un moteur. Contrepoids étroit
  (règle en `candidate`, CI rouge), nommé et non fermé.
- **`DC-42`** — l'effet indésirable déclaré au portail — est le second
  producteur, et il appartient au LOT-05.

## À savoir pour le lot suivant

- Le classificateur `wn-diagnostic-e2e.mjs` **reste muet** sur le blocage
  WebKit rencontré ici : son prédicat « journal réseau vide » lit le fichier
  entier, et une seule requête de montage antérieure au `goto` suffit à le faire
  taire. Le fait discriminant est que **la navigation** n'émet rien, pas que le
  journal soit vide. Le LOT-10 porte le sujet ; ce cas lui donne sa forme
  exacte.
- `scripts/wn-cycle.mjs --appliquer` resynchronise `ACTIVE_CAMPAIGN.md`
  **depuis** `.wn/state.json`, jamais l'inverse : `active_lot` s'édite à la
  main, sinon le banc de cohérence rougit sans dire quoi corriger.
- `origin/main` a bougé **deux fois** pendant le lot (campagne Alliance 6.0-B,
  PR #775 et #776). Aucun recoupement les deux fois, mais le hook de fraîcheur
  bloque l'édition à chaque fois : réconcilier tôt coûte moins que de le
  découvrir au moment du commit.
