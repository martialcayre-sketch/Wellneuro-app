# Handoff — 2026-09-16 — Le corpus devient désignable, et la HAS ne dit pas ce qu'on lui faisait dire

Deux lots dans la nuit : la fermeture du chantier reflow (PR #1130, mergée) et l'ouverture
du chantier corpus (PR #1132, CI en cours à l'heure de ce handoff).

## Lot 1 — reflow de la lecture datée (#1130, mergée `c4464a51`)

La page ne saute plus sous le doigt sur la fiche patient : plancher de hauteur posé **des
deux côtés** de `CeQuiComptePanel`, chargement et état résolu. Saut mesuré **50 px → 0**.

**La mesure a réfuté la conclusion qu'elle devait confirmer.** La contre-analyse Codex
tenait sur la chronologie — `/api/praticien/ce-qui-compte` répond bien **entre l'appui et
le relâchement** (départ `12:21:50.526`, durée `607,208 ms`) — mais pas sur le mécanisme.
Le banc instrumenté enregistre la cible native de chaque phase :

```
pointerdown  scrollY=1222  haut du bouton=310
pointerup    scrollY=1272  haut du bouton=309
click        → BUTTON:Retour au présent
```

Les cinquante pixels sont là, mais **l'ancrage de défilement du navigateur les compense** :
le clic atteint sa cible. Le `pointerup` égaré ne se reproduit pas dans l'application
réelle. **LA CAUSE DE L'ÉCHEC CI RESTE OUVERTE** — ce lot supprime sa meilleure candidate
sans démontrer la causalité, et c'est écrit tel quel au changelog.

**Trois rédactions, deux fausses.** (1) Réserver par le texte de l'état résolu rendu
invisible : le banc a rougi, et il avait raison — « Aucun dépôt à ce jour » entrait dans le
DOM pendant le chargement. *Rendre un texte invisible ne le rend pas absent.* Le garde n'a
pas été touché ; la réserve a changé. (2) Plancher d'un seul côté : 50 px → 2 px, rejoué à
l'envers. (3) Des deux côtés : 0.

**Le banc garde sa propre précondition** — sans elle il verdirait à vide, il suffirait que
le panneau se résolve avant l'appui.

**Coût assumé et écrit** : à 1 440 px le message d'absence tient sur une ligne quand la
réserve en vaut trois — la carte porte une quarantaine de pixels de blanc. Le régler par
paliers de largeur reviendrait à deviner une hauteur par point de rupture.

## Lot 2 — le corpus devient désignable (#1132, CI en cours)

**La contradiction était dans le registre, pas dans les instruments** : 31 entrées
déclaraient `reference_identifiee` sans porter le moindre identifiant ouvrable. Les entrées
à DOI ou PMID passent de **12 à 37 sur 65**.

**Le recroisement PubMed a rattrapé une erreur que la lecture des titres avait laissée
passer** : le DOI retenu pour le HIT-6 rendait un premier auteur *Bjorner*, pas *Kosinski*
— même revue, même année, mais c'était l'article de **calibration du HIT**. Deux pièges
écartés en amont : Bristol apparié à un **article d'aéronautique de l'AIAA** sur le seul
accord « Lewis » + 1997, et le QLQ-C30 apparié au **QLQ-LC13**, module poumon.

**Trois négatifs consignés, et ce sont des résultats.** L'ECAB n'est indexée nulle part.
L'article de Young de 1998 présente un questionnaire à **8 items**, pas l'IAT à 20 — l'y
attacher aurait fabriqué une provenance juste d'apparence. Et la **Conners 3 n'a aucune
publication de développement** : il n'existe rien à quoi sa version servie pourrait être
déclarée conforme.

**Ce que ces identifiants n'établissent pas**, écrit dans chaque `verifiePar` : ils rendent
une revendication **vérifiable**, ils ne la **vérifient** pas. Aucun texte intégral lu,
aucun barème confronté. Relevés outillés, **non contre-vérifiés par le praticien**, à la
différence des douze du 2026-09-14.

### Le second saut du MMSE est mesuré — et la mesure renforce la réserve

`Q_GEO_04` attendait cette lecture depuis le 2026-08-01. La recommandation HAS de décembre
2011 **n'écrit pas les quatre bandes servies**. Elle porte trois seuils, dans un tout autre
usage — l'indication médicamenteuse :

> au stade léger (MMSE > 20) … au stade modéré (10 < MMSE < 20) … au stade sévère (MMSE < 10)

1. Ce sont des **stades de traitement**, présupposant un diagnostic posé.
2. **Aucun seuil de normalité** — or c'est la bande « 27-30 Normal » qui décide de ne rien
   signaler.
3. Le stade léger est **ouvert vers le haut** : le plafond à 26 n'a pas de source HAS.
4. La borne modérée est **stricte** : 10 et 20 n'appartiennent à **aucun** stade ; la bande
   servie les referme. C'est une complétion, annoncée comme une transcription.

**Aucune bande n'a été touchée.**

## Prochaine action

Lire `scratchpad/ci-1132.log` — **jamais le code de la notification de tâche de fond**, qui
rapporte le dernier `echo` et a menti deux fois cette nuit. Merger sur `WN-CI-EXIT=0` seul,
en `--squash --subject`. Pas de `D-xxx` : aucun seuil clinique n'est modifié.

## Ce qui reste à trancher

**N'attend que le praticien** : les bandes du MMSE (réaligner sur la HAS, ou cesser de les
lui attribuer) · `Q_ALI_03` colonne calorique jamais vérifiée · `Q_FIB_03` ELFE suspendu
(7 items source / 12 servis, aucun score) · `Q_PED_03` Conners 3 (licence, ou retrait) ·
`Q_SOM_09` agenda sommeil (1-10 source / 1-5 servi, second axe non recueilli) · `Q_ALI_09`
seul instrument aux droits `a_verifier`.

**N'attend pas un arbitrage mais une lecture de source** : `Q_GEO_06` (85 %/90 % attribués
à Dubois, Presse Med 2002) · `Q_GEO_03` (bornes 5 et 15, PMID 22367356) · `Q_GEO_01`
(borne 26 contre ≥ 24, JAGS 1986 sans abrégé indexé) · `Q_NEU_08` ECAB, introuvable par
Crossref et PubMed. **Deux d'entre elles portent des chiffres affichés aujourd'hui à
l'utilisateur** — c'est le geste le plus rentable de la suite.

**Ouvert ailleurs** : la cause du flake `fiche-trajectoire-peuplee`.

## Artefacts locaux laissés, déjà signalés

Six migrations appliquées et seed rejoué sur la base de dev locale (`127.0.0.1`), et une
base jetable `wn_e2e_repro` — **conservée volontairement** : c'est elle qui fait marcher le
harnais de reproduction E2E, désormais fonctionnel de bout en bout.
