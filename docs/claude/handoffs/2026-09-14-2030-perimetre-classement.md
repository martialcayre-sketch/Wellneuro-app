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

## La passe Codex a bloqué — et #1101 était déjà mergée

Chronologie, dite parce qu'elle explique pourquoi une seconde PR existe :

- **21:18** — #1101 mergée (`4fa98fc7`). `D-185` entre au registre avec sa thèse
  centrale **fausse**.
- **après** — la passe Codex rend BLOQUER sur `8107291f`, avec deux P1 ; un finding
  Copilot était resté ouvert et disait la même chose sous un troisième angle.

Le périmètre défectueux est donc passé en production, et la correction a demandé une
PR distincte. **La fenêtre de revue a été fermée avant que la revue obligatoire
n'ait eu lieu** — c'est la conséquence directe de la dette P0 consignée plus haut,
et elle s'est matérialisée le jour même.

**Ce que les trois findings établissaient**, tous rejoués avant d'être admis :

1. Trois des cinq objets (`TERMES_DE_CLASSEMENT`, `DEPARTAGE_PLAINTE_EX_AEQUO`,
   `INVARIANTS_PRODUCTEUR`) n'étaient importés par personne.
2. Les conditions d'affichage vivaient dans un commentaire, hors empreinte.
3. Le banc de consommation lisait la SOURCE : défait par concaténation, et — pire —
   laissait passer un texte révisé au périmètre que le moteur ignorait.

**La liaison se fait désormais par COMPORTEMENT** (arbitrage du responsable, trois
options posées). Empreinte `c2fb8332f9527886` → `da1ba306c0551d7b`.

**Conséquence pour l'attestation** : ne PAS signer sur l'empreinte publiée par
#1101. Le document de relecture a été republié sur la nouvelle.

## Deuxième passe Codex — 23:30, sur `b52d21b1`

**BLOQUER de nouveau, et les trois findings tiennent.** Rejoués par mutation, tous
verts sur 46 cas avant correction :

| Mutation | Avant | Après |
| --- | --- | --- |
| Texte d'`etatInconnu` révisé au périmètre, ancien littéral au moteur | 46/46 verts | rouge |
| `etatInconnu.condition` déclarée « toujours » | 46/46 verts | rouge |
| Priorité intrinsèque INVERSÉE dans le comparateur du moteur | 46/46 verts | rouge |
| Départage déclaré « dernier domaine » au lieu de « premier » | (signalé) vert | rouge |
| Terme 2 déclaré `technique` au lieu de `clinique` | (ajoutée ici) | rouge |

**Ce qui a changé** : le banc n'est plus écrit à la main, il itère sur
`LIMITATIONS_CANDIDAT` et exige un oracle par entrée, indexé PAR LA CONDITION
DÉCLARÉE. Les trois termes sont exercés un par un — dominante `surpoids` isole le
premier, dominante `fatigue` (qu'aucune règle ne porte) isole le second. Le
troisième est **déclaré inatteignable et gardé comme tel** : quatre règles, quatre
priorités distinctes.

**Le périmètre n'a pas bougé d'un octet.** `da1ba306c0551d7b` tient, la surface
d'attestation est inchangée — la correction est entièrement dans la preuve.
T1 exit 0 ; 816 cas verts sur `clinical` + `clinical-engine`.

**Ce qui reste ouvert et n'est pas dans ce lot** : la passe Codex sur #1098
(`synthese-v30`, rétroactive), l'attestation du praticien, et le compteur
d'ouverture de « Voir les sources et limites ».
