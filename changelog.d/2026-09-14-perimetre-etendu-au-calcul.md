### Périmètre signé — il couvre désormais le calcul entier, pas seulement les grilles (2026-09-14)

**LE DÉFAUT DE [[D-180]] A ÉTÉ RETROUVÉ DANS SA PROPRE RÉPARATION.** Le
périmètre posé le 2026-09-13 hachait les GRILLES des instruments cités : la
dernière étape du calcul, `score → couleur`. Celle d'avant, `réponses → score`,
restait dehors — et c'est elle qui produit le nombre que la grille classe.

**LA PREUVE, EXÉCUTÉE SUR LA TABLE BIOLOGIQUE RÉELLE, SIGNATURE INCHANGÉE.**
`Q_GAS_01`, les huit items de l'axe C1 cotés au maximum. Retirer `C1_8` de
`scoring.subScores[0].items` :

| | avant | après |
|---|---:|---:|
| total C1 | 24 | 21 |
| couleur globale | `warning` | `success` |
| `BIO-DIG-01` | s'allume | s'éteint |
| `shaPerimetre` | `3d692ff5…` | `3d692ff5…` |

Le panel digestif cesse d'être proposé, la signature reste valide, aucun banc ne
rougit. Exactement le scénario de `BIO-SOM-01` au PSQI, par une autre porte.

**ET CE N'ÉTAIT PAS UNE PORTE, C'ÉTAIT UN COULOIR.** L'énumération des dix-sept
instruments cités par les deux tables a rendu douze clés hors périmètre :
`type` (17 instruments), `maxTotal` (13), `note` (6), `dimensions` (2),
`subscalesA`/`subscalesD`, `phases`, `minTotal`, `bareme`,
`sousScoresBesoins`, `subScores[].items`/`max` — et **`threshold: 3` sur
`Q_INF_05`**, un champ qui s'appelle *seuil*, hors d'un périmètre de signature
bâti pour couvrir les seuils cliniques. En dessous encore, les VALEURS
D'OPTIONS : `O_PSS_INVERSE` porte l'inversion d'items du PSS dans ses nombres
mêmes, et un `conditionnel` décide si un item est posé, donc de `missing`, donc
de ce que `bandePlancher` sert.

**LA RÈGLE N'EST PLUS UNE LISTE, ET C'EST LE FOND DE LA CORRECTION.** Le
périmètre hache le bloc `scoring` ENTIER de chaque instrument cité, plus la
cotation de ses items. Choisir les champs à couvrir était le piège : une
sélection se périme en silence le jour où le catalogue gagne un champ, et
personne ne le voit — c'est littéralement ce qui vient d'arriver, deux fois.
Hacher le bloc entier est **auto-maintenu** : ce qui s'ajoute demain entre tout
seul (arbitrage praticien du 2026-09-14).

**CE QUI RESTE DEHORS EST UNE DÉCISION, PAS UN OUBLI** : le texte des questions
et les libellés d'options. Ni l'un ni l'autre n'entre dans un calcul ; les
inclure ferait refermer les deux verrous sur une correction de coquille. Un banc
énumère la sérialisation entière pour le vérifier.

**FORME CANONIQUE.** Les clés d'objets sont triées avant hachage : déplacer
`severiteCroissante` au-dessus de `type` dans un littéral du catalogue ne doit
pas casser deux signatures. Les TABLEAUX gardent leur ordre — `interpretRanges`
prend la première bande qui contient le score, l'ordre des bandes est du contenu
clinique. Conséquence assumée : réordonner `subScores` referme les verrous.

**LES DEUX TABLES ONT ÉTÉ ÉTEINTES, PUIS RE-SIGNÉES.** Sept bancs ont porté
l'extinction — deux sur l'orientation, cinq sur la biologie — jusqu'à la
seconde attestation praticien du 2026-09-14, la première portant sur les grilles
seules ([[D-182]]). C'est le fail-closed qui fonctionne : `orientationActive()`
et `deriverStatutsBiologie()` rendent le verdict fermé tant que `shaPerimetre`
ne concorde pas.

- orientation `2a1f4840b5fb62f5049ae3ee87f7fa1f06126ba7f8bfd30dce33ecee2d95ddbd`
- biologie `82ef86f0b025f572dcaefa30419e8af545619b0b95001d24a1e0e63250bd0e42`

**CE QUI A ÉTÉ RELU AVANT LA RECOPIE, ET DANS CET ORDRE** : les vingt
rattachements `needIds` — dont six arbitrages et six dérivations où le besoin du
DÉCLENCHEUR diffère du besoin DÉCLARÉ, la dérivation portant sur les
questionnaires SUGGÉRÉS —, puis le delta de périmètre sur les dix-huit blocs de
scoring. Les claims n'ont pas bougé ; leur relecture du matin couvre celle-ci.

Les `note` de scoring ont été vérifiées une par une avant d'être laissées dans
le périmètre : elles ne sont pas des commentaires. `Q_GAS_02` y écrit que
FR_Q003 est multiplié par 10, `Q_STR_02` y rattache le score 27 au niveau élevé,
`Q_GEO_06` y porte les 85 % / 90 % sous réserve. Ce sont des décisions de
scoring qui ne vivent nulle part ailleurs.
