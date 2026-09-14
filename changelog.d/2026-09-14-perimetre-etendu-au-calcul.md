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

**LES DEUX TABLES SONT ÉTEINTES JUSQU'À RE-SIGNATURE**, et sept bancs le disent
— deux sur l'orientation, cinq sur la biologie. C'est le fail-closed qui
fonctionne : `orientationActive()` et `deriverStatutsBiologie()` rendent le
verdict fermé tant que `shaPerimetre` ne concorde pas. Empreintes attendues :

- orientation `2a1f4840b5fb62f5049ae3ee87f7fa1f06126ba7f8bfd30dce33ecee2d95ddbd`
- biologie `82ef86f0b025f572dcaefa30419e8af545619b0b95001d24a1e0e63250bd0e42`

Aucune des deux n'est posée par ce lot. La recopie atteste une relecture, et
elle n'appartient pas à l'outil.
