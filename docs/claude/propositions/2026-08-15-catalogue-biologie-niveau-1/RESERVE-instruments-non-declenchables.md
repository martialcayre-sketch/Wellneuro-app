# Réserve bloquante — sept des dix-sept instruments déclencheurs ne peuvent pas allumer leur panel

> **À lire avant d'écrire la moindre règle dans `INDICATIONS_BIOLOGIE_V1`.**
> Constat du 2026-08-16, établi en auditant les dix-sept instruments cités
> comme déclencheurs par le `README.md` de cette proposition. Vérifié à la
> source (code) **et** en production (lecture MCP). Aucune ligne du catalogue
> n'a été modifiée : ce document signale, il ne comble pas.

## Pourquoi cet audit a eu lieu

`D-060` (disjonction) impose qu'une branche de `ou` ne compte que si SON
instrument est complètement recueilli — donc que son moteur de scoring publie
ses comptes (`repondus`/`items`, ou `missing`). La revue `wn-reviewer` du
2026-08-16 a relevé que rien ne le vérifiait : une branche visant un
instrument muet serait **inerte à vie**, sans erreur, sans log, sans test
rouge. Les six panels écrits « X ou Y » auraient été livrés morts en paraissant
fonctionner.

L'audit a confirmé ce risque, et en a découvert un **plus grave et plus large**,
qui ne dépend pas de la disjonction.

## Deux causes distinctes, à ne pas confondre

### A. Cinq instruments sont SUSPENDUS — leurs panels sont morts en toutes formes

`actif: false` au catalogue (`web/src/lib/questionnaires-catalog.ts`), donc
membres d'`IDS_SUSPENDUS` : ils ne sont plus assignables par aucun des quatre
chemins d'écriture, et `scoresRecalculesPourRaisonnement` rend `null` **avant
même** d'appeler `calculateScore`. Aucun déclencheur ne peut mordre sur eux —
ni sous un `ou`, ni en déclencheur simple.

| Instrument | Ligne catalogue | Passations en production |
|---|---|---|
| `Q_NEU_06` (MMT SIIN) | 141 | **0** |
| `Q_GEO_04` (MMSE) | 456 | **0** |
| `Q_GEO_03` (AQ Sabbagh) | 479 | **0** |
| `Q_GEO_05` (QDRS Galvin) | 481 | **0** |
| `Q_GEO_06` (test des 5 mots) | 483 | **0** |

Le zéro n'est pas un artefact de table vide : la production porte 107 passations
sur 26 instruments à la même date.

**Conséquence sur le catalogue — deux panels entiers :**

- **`PANEL_MEMOIRE_1`** (§B.5) — ses trois déclencheurs sont `Q_GEO_04`,
  `Q_GEO_06` et `Q_NEU_06`. **Les trois sont suspendus.**
- **`PANEL_NEURODEG_1`** (§B.8) — ses deux déclencheurs sont `Q_GEO_03` et
  `Q_GEO_05`. **Les deux sont suspendus.**

Ces deux panels ne sont pas « partiellement dégradés » : aucune de leurs
conditions ne peut jamais être remplie. En mode `conditionnel` ils resteraient
**affichés** avec leur condition (`D-059` §5 — un panel conditionnel ne
disparaît jamais), mais afficheraient éternellement « déclencheur non rempli ».
Le praticien lirait « Plainte mnésique ou cognitive repérée » comme une
condition simplement non satisfaite, sans qu'aucune surface ne dise que
l'instrument qui la repérerait n'est plus assignable. **C'est un faux négatif
silencieux, et c'est exactement ce que `DC-24` proscrit sur les données.**

### B. Deux instruments vivants n'allument pas de branche sous `ou`

Leur moteur ne publie aucun compte sur le porteur visé. Ils fonctionnent en
déclencheur SIMPLE (`extraireCible` lit le total et l'interprétation sans
exiger de comptes), mais jamais en branche de disjonction.

| Instrument | Porteur visé | Ce que le moteur publie |
|---|---|---|
| `Q_NEU_11` (HAD) | sous-scores `A` et `D` | `{id, label, total, max, interpretation}` — **aucun compte**, ni sur les axes ni à la racine (`web/src/lib/questions.ts:2832-2841`) |
| `Q_GAS_02` (IBS-SSS) | racine | aucun compte lisible par `comptesDuRecueil` |

**Conséquence sur le catalogue — trois panels amputés d'une branche :**

- **`PANEL_HUMEUR_1`** (§B.1) : garde `Q_NEU_01` (BDI) et `Q_NEU_02` (MADRS),
  perd la branche `Q_NEU_11` (HAD-D).
- **`PANEL_ANXIETE_1`** (§B.2) : garde `Q_INF_05`, perd la branche `Q_NEU_11`
  (HAD-A). **Il ne lui resterait qu'un seul déclencheur vivant.**
- **`PANEL_DIGESTIF_1`** (§B.6) : garde `Q_GAS_01` (TFD), perd la branche
  `Q_GAS_02` (IBS-SSS).

C'est l'incarnation concrète de `D-060` §6 : `{ou:[X]}` est plus restrictif que
`X`. Le HAD est le cas d'école — vivant en feuille, inerte en branche.

## Les dix instruments qui, eux, allument bien une branche

`Q_NEU_01` (BDI) · `Q_NEU_02` (MADRS) · `Q_STR_02` (PSS-10) · `Q_STR_05`
(BMS-10) · `Q_SOM_01` (PSQI) · `Q_SOM_04` (IRLS) · `Q_SOM_06` (Pichot) ·
`Q_GAS_01` (TFD) · `Q_CAR_01` (cardio-métabolique) · `Q_INF_05` (anxiété SIIN).

Les panels **stress**, **sommeil**, **fatigue**, **SJSR**, **métabolique** et
les deux panels de population ne sont donc pas touchés.

## Réserve annexe — une bande à relire avant transcription

Le tableau des zones du `README.md` (§F.2) écrit « `warning` (5-21) » pour
`Q_GEO_03`. C'est l'ÉTENDUE DE SCORE, pas la bande : la grille publie
`warning` 5-14 et `danger` 15-21 (`web/src/lib/questionnaires/gerontologie.ts:40-41`).
Le §B.8 dit correctement « zone `warning` **et au-delà** ». Une transcription
littérale en `zones: ['warning']` manquerait 15-21 — la démence probable — et
échouerait de surcroît l'inclusion de `zoneGarantieParLePlancher`. Le même
piège vaut pour toute bande citée par son étendue dans ce tableau : **c'est le
§B qui fait foi, pas la colonne du §F.2.**

## Ce qui est demandé au praticien, et qui n'est pas un geste d'assistant

Aucune de ces trois questions ne se tranche depuis le code :

1. **Panels mémoire et neurodégénératif** — les écrire quand même (affichés,
   condition jamais remplie), les retenir jusqu'à réactivation des
   instruments, ou réactiver `Q_GEO_03/04/05/06` et `Q_NEU_06` ? La suspension
   de ces instruments est une décision produit antérieure, dont le motif n'est
   pas dans cette proposition.
2. **Branches HAD et IBS-SSS** — les écrire malgré leur inertie (elles
   s'allumeraient le jour où ces moteurs publieraient leurs comptes), ou faire
   publier les comptes par les moteurs `had` et l'IBS-SSS (lot de scoring
   distinct, qui touche des instruments certifiés) ?
3. **`PANEL_ANXIETE_1`** — s'il ne lui reste que `Q_INF_05`, la disjonction n'a
   plus d'objet pour ce panel : le `ou` doit-il devenir un déclencheur simple ?

**Tant que ces trois points ne sont pas tranchés, PR-2 et PR-3 ne peuvent pas
écrire les règles correspondantes** — les écrire produirait un catalogue dont
une partie serait inerte sans que rien ne le dise.
