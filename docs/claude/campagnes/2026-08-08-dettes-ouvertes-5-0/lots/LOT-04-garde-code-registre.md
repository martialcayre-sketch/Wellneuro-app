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
  décision produit, à prendre **sur la liste que ce lot produit**, et à écrire en
  `D-037` : elle suppose de choisir la source d'autorité d'une affirmation
  clinique, ce que `D-034` fige.
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
  c'est la matière de `D-037`.
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

Sept sur le garde, chacune isolément, banc restauré entre deux :

| Mutation | Verdict |
| --- | --- |
| retirer le contrôle bloquant | rouge (1 cas) |
| retirer le `barreau !== -1` | rouge (1 cas) |
| `<=` au lieu de `<` | rouge (2 cas) |
| retirer le garde « aucun statut » | rouge (1 cas) |
| retirer le garde « carte partielle » | rouge (1 cas) |
| accepter une carte absente | rouge (1 cas) |
| inventorier même quand écran et registre sont d'accord | rouge (2 cas) |

**Une huitième mutation a SURVÉCU à la première rédaction**, et c'est le constat
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

### Ce que la validation dit, et ce qu'elle ne dit pas

T1 vert. Banc du validateur : **73 cas verts**. Les deux positions du garde de
certification : code de sortie `0`, inventaire à 22.

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
