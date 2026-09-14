# Handoff — 2026-09-14 — Le périmètre du classement, posé et ancré

## Branche et état Git

`perimetre-classement`, partie d'`origin/main` à `42691bf2`.

**L'ORDRE DE MERGE ÉTAIT CONTRAINT, ET LA GARDE L'A IMPOSÉ.** `D-184` vivait sur
`objectif-priorite-source` (#1100) ; cette branche prend `D-185`. T1 a rendu
`✗ la suite est trouée : D-184 manque` tant que #1100 n'était pas mergée — la PR
n'a donc pas été ouverte avant. #1100 mergée en `30d16e42`, `main` intégré ici,
le trou est comblé.

**Ce lot porte AUSSI `D-186`**, entrée rétroactive pour #1089 (`f920c916`), mergée
sans numéro de décision. Sans rapport de fond avec `D-185` : dit plutôt que glissé.

## Objectif

Répondre à `D-162` §5, resté ouvert : « l'amendement qui ouvre le périmètre doit
dire lequel des deux il fait — signer d'abord, ou généraliser en ne se réclamant
d'aucune provenance certifiée ». Arbitrage du 2026-09-14 : **signer**, forme
« périmètre ET ancrage d'un coup ».

## Ce qui est livré

- `lib/clinical/perimetreClassementV1.ts` — module-feuille, sans import. Les trois
  termes de départage avec leur NATURE déclarée, le départage des ex aequo, les
  quatre textes servis, l'ordre des deux motifs d'abstention, les trois invariants
  du producteur.
- `chaineC1.ts` lit désormais ces données au lieu de les réécrire.
- `perimetreClassement.guard.test.ts` — 7 cas, empreinte `3d73b1207d55b99f`.

## Ce qui n'est PAS livré, et qui t'appartient

**L'attestation.** `ATTESTATION_CLASSEMENT` porte `relu: false`,
`dateRelecture: null`, `shaRelu: null`. Un banc échoue si quelqu'un la remplit sans
le décider. La relecture clinique des cinq objets ci-dessus est ton geste, pas le
mien, et rien ne la simule.

## Ce que l'attestation coûtera, à savoir AVANT de la poser

1. Déplacer un terme, réécrire un des quatre textes, permuter les deux motifs :
   chacun referme le verrou jusqu'à re-signature.
2. **`DecisionSummaryCard` sert ces quatre limitations sous l'intitulé « Ajoutées
   par le moteur (hors périmètre signé) ».** Cet intitulé deviendra FAUX le jour de
   l'attestation et doit bouger dans le même lot — sinon l'écran sous-promet sur du
   relu. C'est l'inverse du défaut habituel, mais c'est un écart.

## Le point de doctrine qui a guidé la forme

Un périmètre qui serait une COPIE de ce que le moteur applique aurait la forme de
la conformité sans son effet : la signature porterait sur un texte que rien
n'exécute (`DC-26`). D'où le branchement de `chaineC1.ts` sur le module, et le banc
qui lit la source du moteur pour refuser qu'un de ces textes y réapparaisse en dur.

## Risques

- Aucun comportement ne change (mêmes textes, même ordre, mêmes rangs) ; 806 bancs
  du moteur clinique passent sans édition. Le risque n'est pas dans le code, il est
  dans la TENTATION de lire ce périmètre comme une signature : il en a la forme, les
  bancs et le vocabulaire. Le second cas du banc existe pour ça.
- `DEPARTAGE_PLAINTE_EX_AEQUO.arbitrageCliniqueRendu` vaut `false` et doit le
  rester tant qu'aucun arbitrage sur « quelle plainte prime à intensité égale » n'a
  été rendu — `D-054` arbitrage 8.

## Dette de revue P0 — constatée le 2026-09-14, et arbitrée

`POLITIQUE_REVUE.md` classe P0 « clinique/scoring, garde-fous » et exige **une passe
Codex obligatoire**. Les **sept lots de cette session sont P0**, et **aucun n'a eu sa
passe** : ni #1086, #1087, #1089, #1092, ni #1098, #1100, ni celle-ci. Le hook
`gate-codex-p0.mjs` existe précisément pour empêcher cet oubli — il est armé dans
`settings.json`, et il n'a rien arrêté. Je ne l'avais pas lu avant de merger.

**Arbitrage du responsable, 2026-09-14** — trois options posées, la deuxième retenue :

1. ~~Rien de rétroactif~~ — écartée.
2. **Une passe sur le seul lot dont la sortie change ce qu'un soignant lit** : `D-183` /
   `synthese-v30` (#1098). Retenue.
3. ~~Une passe sur les six~~ — écartée, et la politique la déconseille (« jamais tout le
   corpus »).

**Deux blocs de briefing ont été rédigés au gabarit `$wellneuro-pr-review`** : #1101
(première passe, avant merge) et #1098 (première passe, rétroactive, sur lot déjà
déployé — un finding ouvre un lot de suite, il ne bloque rien).

**Ce qui reste sans passe, et c'est assumé, pas oublié** : #1086, #1087, #1089, #1092 et
#1100. Sur du déployé, ce qui a du rendement est une mesure de production, pas une
relecture — c'est ce que les deux mesures de cette session ont montré, l'une en réfutant
son hypothèse de départ.

**Question ouverte versée à la passe #1098**, parce qu'elle vaut au-delà du lot : j'ai
conclu qu'un garde de SORTIE sur `DC-19` était impossible **par analogie** avec `DC-09`
(`verifierRestitutionOrientation`, vocabulaire non fermé). L'analogie n'a pas été testée.
Une fenêtre de rappel est un vocabulaire nettement plus fermé qu'un glissement probatoire,
et cette conclusion est peut-être paresseuse.
