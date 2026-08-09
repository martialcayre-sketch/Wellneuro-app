---
id: "LOT-04"
titre: "Le libellé emprunte le nom d'un barreau qu'il ne lit pas — et le seed omet une clé que le moteur produit"
statut: "en_cours"
dépend_de: "LOT-02"
---

# LOT-04 — Relier « Scoring vérifié » au barreau `scoring_verifie`, et rendre le seed aussi fidèle que le moteur

## But

Deux dettes nommées par `D-036`, qui partagent leur sujet — ce que l'écran dit de
la vérification d'un scoring, et ce qu'un banc peut en prouver.

**Ce lot produit une mesure, et c'est sa raison d'être principale.** La sortie du
garde EST la liste des instruments dont l'écran taît une vérification que le
registre déclare. Sans elle, la troisième dette de `D-036` (le badge muet) ne
peut pas être arbitrée sur autre chose qu'un chiffre relevé une fois à la main.

## Pourquoi ce n'est pas le LOT-03

Les deux lots gardent une « dérive entre deux sources », et l'arbitrage
d'ouverture du LOT-03 a posé la question. Ils ne partagent **aucun mécanisme** :
le LOT-03 compare deux tables Postgres et vit dans `web/prisma/checks/` ; celui-ci
compare deux fichiers du dépôt et vit dans `scripts/lib/`. Paliers de validation
différents, revues différentes, et un diff du LOT-03 qui les porterait tous deux
aurait trois finalités.

## Périmètre

### 1. Le garde code ↔ registre

`scripts/lib/verifier_registre_instruments.js` reçoit le catalogue comme du
**texte** et ne compare aujourd'hui que les **identifiants** (`:205-210`). Lui
faire comparer `def.scoring.certification.status` (catalogue de code, écrit à la
main) au `statutCertification` de `docs/claude/corpus/instrument_registry.json`,
sur le vocabulaire déjà déclaré `:11-26`.

Ce que le garde doit dire, et qui n'est pas trivial : les deux échelles ne sont
pas la même. `certification.status` vaut `certifie` / `ambigu` / `a_verifier` /
`non_score` ; `statutCertification` est un barreau de cycle de vie en huit
échelons plus deux états terminaux. **La correspondance à établir est celle des
divergences qui MENTENT** — un `certifie` à l'écran sous un barreau qui n'atteint
pas `scoring_verifie` — et non une bijection.

Joué par l'étape CI existante « Registre des instruments (banc du validateur) ».

### 2. Le seed aussi fidèle que le moteur

`web/prisma/seed.ts` porte 15 blocs `scoresJson`, **aucun** ne porte la clé
`certification` que tous les moteurs produisent (`questions.ts`,
`certification: sc.certification || null`) et que `api/patient/submit` persiste.
Conséquence : la colonne « Qualité » de la fiche patient retombe toujours sur
« Historique », et aucun E2E ne voit un seul des six libellés de passation.

Poser la clé sur les blocs dont le catalogue déclare une certification, plus
**une** assertion Playwright — aucun E2E n'ouvre aujourd'hui le tableau
« Détail des réponses ».

**Le plafond s'écrit, il ne s'adoucit pas** : Sophie Nicola porte cinq
passations, quatre certifiées au catalogue ; la cinquième (PSQI, `Q_SOM_01`)
restera « Historique » même seed étendu — c'est l'un des instruments muets.

## Hors périmètre

- **Faire parler le badge** pour les 18 instruments que le registre déclare
  `scoring_verifie` et que l'écran laisse en « Statut inconnu ». C'est une
  décision produit, à prendre **sur la liste que ce lot produit**, et à écrire au
  **prochain numéro libre du registre** : elle suppose de choisir la source
  d'autorité d'une affirmation clinique, ce que `D-034` fige. (Elle visait
  `D-037` ; ce numéro est pris depuis le 2026-08-09 par la décision HDS — un
  numéro ne se réserve pas, `decisions-numerotation.mjs` refuse tout trou.)
- Renommer quelque valeur de donnée que ce soit pour aligner le dossier sur
  l'écran (`D-034` : `instrument_registry.json`, le champ `cosmin`).
- La cohérence packs ↔ miroir relationnel — LOT-03.

## Interdits

- Ne pas dériver l'attendu du module testé : un attendu qui bouge avec sa source
  ne prouve rien.
- Ne pas creuser d'exception dans un motif de garde.

## Preuve attendue

- Le garde est **mutation-testé** : introduire une divergence
  `certification.status` ↔ barreau fait rougir ; l'inverse aussi.
- La liste des divergences est **consignée avec sa date** dans `## Résultats` —
  c'est la matière de la décision produit ci-dessus.
- T2 avant commit ; T3 si le seed bouge (il change les données des parcours).

## Résultats — 2026-08-09

### Ce que ce périmètre disait de faux, mesuré avant d'écrire

Trois corrections au texte ci-dessus, toutes vérifiées sur le dépôt :

1. **Les lignes citées du garde sont `:202-209`**, pas `:205-210`.
2. **La divergence bloquante ferait rougir l'étape CI « Scoring certification
   (63 questionnaires, blocking) »** (`ci.yml:357-361`), pas « Registre des
   instruments (banc du validateur) » (`:367`) — cette dernière est le banc qui
   prouve que le garde échoue quand il doit échouer.
3. **DEUX blocs du seed restent nus, et dans DEUX états différents** — le texte
   n'en annonçait qu'un. `Q_SOM_01` (PSQI, Sophie) affiche « Historique » : le
   catalogue ne déclare rien. `Q_SOM_07` (MFI-20, Jennifer) affiche **« Non
   interprétable »** : sa passation est datée du 2026-06-15, donc antérieure à
   la reconstruction du 2026-07-31, et la branche `nonInterpretable` de la fiche
   passe AVANT celle du badge de certification. Y poser une certification serait
   inerte à l'écran. Le plafond est donc de **13 blocs sur 15**.

### L'inventaire — la mesure que ce lot produit (matière de D-037)

Croisement du catalogue **résolu** (`chargerCatalogue()`, 65 instruments) et du
registre (65 entrées), **identique dans les deux positions de
`WN_ALI_01_SIIN57`** :

| Croisement | Compte |
| --- | --- |
| Catalogue : `certifie` / `ambigu` / aucune clé | 38 / 6 / 21 |
| Registre : `scoring_verifie` / autres barreaux / terminaux | 60 / 3 / 2 |
| **Sens « menteur »** — `certifie` sous un barreau < `scoring_verifie` | **0** |
| **Sens inverse** — barreau ≥ `scoring_verifie`, écran muet | **18** |
| idem, écran `ambigu` | **4** |

**Les deux familles ne se valent pas, et les confondre fausserait `D-037`.**
La revue adversariale du 2026-08-09 a repris une première rédaction qui les
rangeait toutes deux sous le mot « muet » et attribuait à la fiche patient un
libellé qui est celui de la **bibliothèque** :

| Famille | Bibliothèque | Fiche patient, pour une passation | Ce que ça vaut |
| --- | --- | --- | --- |
| **Aucune certification (18)** | « Statut inconnu » | « Historique » | un vrai **silence** |
| **`ambigu` (4)** | « Scoring ambigu » | « Scoring ambigu (Drive) » | l'écran **AFFIRME un doute** contre un registre qui déclare le scoring vérifié |

Les 4 sont peut-être la divergence la plus embarrassante des 22 : ce n'est pas
une taisance. `D-037` doit les arbitrer séparément.

**Deux réserves sur ce tableau, faute de quoi il généralise à son tour** (la
première a été relevée en revue sur une version précédente de ces lignes) :

- la colonne « fiche patient » décrit ce que rend le badge **quand rien ne le
  précède**. Une passation `nonInterpretable` affiche « Non interprétable »
  quelle que soit sa certification — c'est le cas de `Q_SOM_07`, l'un des 18, et
  le banc E2E de ce lot l'assère ;
- la bibliothèque lit le **catalogue**, la fiche lit le `scores_json` **figé à la
  soumission**. Un instrument sans passation ne montre donc rien nulle part, et
  une passation ancienne garde ce que le moteur écrivait à son époque.

**Aucune certification déclarée (18)** : `Q_NEU_06 Q_SOM_01 Q_SOM_03 Q_SOM_04
Q_SOM_07 Q_GAS_03 Q_CAR_01 Q_TAB_03 Q_TAB_04 Q_PED_02 Q_MOD_01 Q_MOD_02
Q_ALI_01 Q_ALI_02 Q_ALI_03 Q_GEO_03 Q_GEO_05 Q_GEO_06`.

**Écran `ambigu` (4)** : `Q_SOM_02 Q_GAS_01 Q_FIB_02 Q_URO_01`.

**Le point dur du lot, et l'arbitrage qui en découle.** L'assertion bloquante
que ce périmètre décrit comme sa preuve est **vraie aujourd'hui** : sa sortie
serait vide, et le lot ne produirait donc pas la liste dont `D-037` a besoin. Le
garde porte pour cette raison **deux sorties de natures différentes** — une
assertion bloquante (sens menteur) et un **inventaire non bloquant** (sens
inverse), imprimé avec son compte à chaque `npm run check`. Arbitré le
2026-08-09 : pas de cliquet, pas de liste d'identifiants figée dans le garde —
ce serait l'inverse de la discipline « dérivé des données » tenue partout dans
ce fichier.

### Mutations jouées

Neuf sur le garde, chacune isolément, banc restauré entre deux :

| Mutation | Verdict |
| --- | --- |
| retirer le contrôle bloquant | rouge (1 cas) |
| retirer le `barreau !== -1` | rouge (1 cas) |
| `<=` au lieu de `<` | rouge (2 cas) |
| retirer le garde « aucun statut » | rouge (1 cas) |
| retirer le garde « carte partielle » | rouge (1 cas) |
| accepter une carte absente | rouge (1 cas) |
| inventorier même quand écran et registre sont d'accord | rouge (2 cas) |
| retirer le garde de vocabulaire | rouge (1 cas) |
| élargir le vocabulaire au cycle de vie du registre | rouge (1 cas) |

**Toutes sont des mutations de BANC**, et **trois** d'entre elles n'ont aucun
effet sur les données du jour — mesuré (`0 erreur / 22 lignes` avant comme
après), et écrit à côté du code plutôt que laissé à deviner : le refus de carte
partielle est décoratif tant que l'appelant bâtit sa carte depuis les
identifiants qu'il passe ; le `barreau !== -1` ne change rien tant que les deux
`suspendu` du registre portent `ambigu` au catalogue ; et le garde de vocabulaire
est lui aussi purement prospectif. Ce sont des protections **de classe**, pas des
constats sur l'état actuel — la distinction a déjà été perdue une fois dans ce
fichier.

Quatre mutations de plus sur le **seed**, contre `seedCertification.guard.test.ts` :
un statut faux, une provenance fausse, une clé retirée, une certification posée
sur le PSQI. Les quatre rougissent.

Trois enfin sur la **liaison** entre le Set de vocabulaire (recopié en dur dans
un fichier CommonJS, qui ne peut pas importer du TypeScript) et son union source
`CertificationStatus` : élargir le Set seul, élargir l'union seule, renommer
l'union. Les trois rougissent — la troisième parce que le banc refuse une
extraction qui ne trouve plus rien, plutôt que de se taire.

**Une mutation de plus a SURVÉCU à la première rédaction**, et c'est le constat
utile : le contrôle sortait les états terminaux par une branche
`ETATS_TERMINAUX` nommée, doublée d'un `barreau !== -1` dans la condition. La
branche nommée ne portait **rien** — la retirer ne faisait tomber aucun cas.
Elle a été supprimée et le commentaire, qui désignait la mauvaise pièce,
réécrit : ce qui protège est le `barreau !== -1`, et le cas terminal du banc le
prouve en tombant quand on l'ôte.

Trois mutations sur les **données réelles**, sans écrire dans le dépôt (registre
et catalogue réels, un seul statut déplacé) : `Q_SOM_09`, `Q_ALI_09` et
`Q_GEO_04` passés à `certifie` à l'écran rougissent chacun, en nommant les deux
valeurs. Et le renommage silencieux de la clé `certification` — le cas
réellement dangereux — est attrapé : sans le garde, l'inventaire passerait de
**22 à 60** sans un bruit.

### Ce que la revue adversariale a repris

Verdict `wn-reviewer` : **GO sous conditions**, deux constats majeurs, tous deux
corrigés — et aucun ne portait sur la logique du garde, les deux portaient sur ce
que le lot **dit** :

1. **La sortie livrable nommait un libellé qui n'existe pas sur l'écran qu'elle
   désigne** — « Statut inconnu » est le badge de la bibliothèque, la fiche rend
   « Historique » — et rangeait les 4 `ambigu` sous le mot « muet » alors que
   l'écran y affirme un doute. C'est précisément la sortie sur laquelle `D-037`
   sera arbitré. Corrigé aux trois endroits, et le champ renommé
   `divergencesEcranRegistre`.
2. **Le seed est inerte sur une base déjà seedée** (`upsert` avec `update: {}`) :
   les 13 clés ne s'écrivent que sur une base neuve, et l'E2E est donc rouge sur
   la base de dev partagée, avec un symptôme qui ne dit rien du code. Écrit dans
   le seed et dans l'en-tête du spec.

Trois constats moyens corrigés aussi : **rien ne tenait l'égalité seed ↔
catalogue** (le trou le plus sérieux — un `status` qui bougerait laissait le seed
mentir et l'E2E vert : `seedCertification.guard.test.ts` le ferme, dans les deux
sens) ; deux commentaires faisaient croire vivant un risque **prospectif**. Une
non-couverture est désormais **nommée** plutôt que découverte plus tard : un
instrument à l'état terminal dont le catalogue déclare encore `certifie` échappe
aux deux sorties, et ses passations passées continueraient d'afficher « Scoring
vérifié » — zéro cas aujourd'hui, arbitrage à prendre.

### Ce que la SECONDE passe de revue a repris

Le reviewer a été relancé **sur les correctifs de la première passe** — motif
explicite : sur une PR précédente de ce dépôt, un correctif de revue avait
introduit un chiffre faux. Verdict **GO**, et deux énoncés faux de plus, tous
deux dans la prose que le premier correctif venait d'écrire :

1. **Le nouveau garde de vocabulaire nommait la mauvaise source de vérité.** Le
   commentaire renvoyait à `statutCertificationRuntime` (`bibliotheque.ts`) —
   qui énumère SIX valeurs et accepte n'importe quelle chaîne non vide, parce
   qu'elle traduit vers des libellés d'écran. Un mainteneur suivant ce pointeur
   aurait ajouté `non_certifie` et `inconnu` au Set, **rouvrant exactement le
   trou que ce garde venait de fermer**. La source est `CertificationStatus`
   (`scoring/types.ts`), et un banc l'y attache désormais plutôt que de s'en
   remettre à la vigilance.
2. **Le correctif E2E réfutait l'en-tête de son propre fichier sans le
   corriger** : « ces dossiers sont en lecture seule » y cohabitait, 45 lignes
   plus haut, avec la découverte que `provisionnerReponseOrientation` écrit pour
   Sophie. C'était la garantie de sûreté qui était fausse.

Cinq mineurs corrigés aussi, dont trois comptes périmés dans ce fichier même
(« sept » mutations au-dessus d'un tableau de neuf ; « deux » protections
prospectives alors qu'il y en a trois, mesuré) et **une généralisation de plus
dans le tableau bibliothèque/fiche** — il annonçait « Historique » pour les 18,
ce qui est faux de `Q_SOM_07`, que le banc E2E de ce lot affiche
« Non interprétable ». Le tableau porte maintenant ses réserves.

Une question du reviewer a été tranchée **en refusant** ce qu'elle suggérait :
exiger qu'au moins un instrument porte `certifie` est juste, mais pas dans la
fonction pure — ses fixtures portent un seul instrument à barreau bas, sur lequel
un `certifie` d'écran est précisément ce que le contrôle bloquant refuse. Aucune
fixture ne pourrait satisfaire les deux. C'est une propriété de la DISTRIBUTION
du catalogue réel : elle est assérée chez l'appelant.

### Ce que la validation dit, et ce qu'elle ne dit pas

T1 vert. Banc du validateur : **76 cas verts**. Banc seed ↔ catalogue : 4 verts,
4 mutations tuées. Liaison Set ↔ `types.ts` : 3 mutations tuées. Les deux
positions du garde de certification : code de sortie `0`, inventaire à 22.

**Les E2E rendent 133 verts et 1 rouge, et ce rouge n'appartient pas à ce lot.**
Un test de `visual.spec.ts` bloque 120 s sur un `page.goto` dans le projet
iPhone 13 (WebKit). Bissection, sur base et build figés :

- suite sans les deux tests de ce lot : **66 tests, 28,9 s, tout vert** ;
- suite avec : le **67e** test bloque ;
- **deux tests témoins triviaux** (un `goto` sur une fiche patient, rien
  d'autre) posés à la place des miens : **même échec, même rang** ;
- quatre témoins au lieu de deux : c'est encore le **67e** qui bloque, mais ce
  n'est plus le même test — `visual.spec.ts:131` (page praticien) au lieu de
  `visual.spec.ts:168` (portail) ;
- la même suite de 66 jouée **deux fois** (132 tests, 56,4 s) : **tout vert**.

Ni le seed, ni le contenu du spec de ce lot ne sont en cause : la suite vivait
**exactement à 66 tests** sur ce projet, c'est-à-dire au bord d'une fragilité
macOS/WebKit que le premier lot ajoutant un test devait rencontrer. Le test qui
suit immédiatement celui qui bloque ouvre **la même page pour le même patient**
en 287 ms. Ce n'est ni un compte de contextes, ni un temps écoulé — la cause
reste à trouver, et elle est hors du périmètre de ce lot.

**Le CI (Linux) ne la reproduit pas** : le job `verify` de la PR #630 a
réellement tourné et est vert. La fragilité est donc **locale à macOS**, et elle
ne bloque rien — mais elle mordra la prochaine session qui jouera T3 sur Mac, ce
qui est la raison d'être de ce relevé.
