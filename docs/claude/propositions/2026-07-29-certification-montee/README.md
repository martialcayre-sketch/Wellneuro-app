# Montée de certification des instruments — 2026-07-29

Demande : « certifie tous les questionnaires ». Ce dossier dit ce qui a été fait, ce
qui reste à trancher, et pourquoi « tous certifiés » serait faux.

## En un coup d'œil

Au matin du 2026-07-29, **aucun des 64 instruments n'avait dépassé le deuxième barreau**
de l'échelle (60 `repere`, 4 `source_obtenue`). Ce lot en amène **10 à
`scoring_verifie`**, cinquième barreau sur huit, et fait sortir 49 autres du premier.

| Barreau | Avant | Après |
|---|---|---|
| `repere` | 60 | 1 |
| `source_obtenue` | 4 | 49 |
| `droits_verifies` | 0 | 1 |
| `contenu_verrouille` | 0 | 1 |
| `scoring_verifie` | 0 | **10** |
| `suspendu` | 0 | 2 |

**Personne n'atteint `publie`**, et le libellé « Validé pour l'usage WellNeuro » n'est
accordé à aucun instrument. Trois barreaux restent au-dessus, dont `psychometrie_revue`,
inatteignable tant que `measurement_evidence.json` est vide.

## Le résultat contre-intuitif, à lire en premier

**La déclaration de droits du 2026-07-29 ne dégage aucun instrument de plus.** Elle
porte sur les supports de cours du SIIN ; les instruments du référentiel SIIN avaient
déjà été tranchés le 2026-07-25 ; et **aucun** des 43 restants n'en relève — ce sont
toutes des échelles tierces que ces supports reproduisent.

Ce qui a réellement débloqué les 10, c'est **A1** : le rattachement de 55 instruments à
leurs sources, qui a fait franchir le premier barreau à ceux dont les droits étaient
réellement dégagés.

Deux revues adversariales ont été nécessaires. La première a rendu **NO-GO** : le lot
dégageait alors 35 instruments de plus, en décidant sur la **typologie du dossier**
— « une ligne © avait-elle été tapée ? » — et donnait donc le statut le plus permissif
aux instruments les moins instruits. La seconde a trouvé que la même règle n'était
toujours pas appliquée à **sept entrées posées par un lot antérieur**, dont le statut
`permission_obtenue` était démenti par leur propre texte : « aucune autorisation n'a été
sollicitée ni obtenue ». Elles sont redescendues. Détail dans `droits.md`.

## Les deux pièces

- **[droits.md](droits.md)** — ce que la déclaration règle et ce qu'elle ne règle pas.
  Les 8 instruments sous licence tierce à arbitrer, les 35 échelles tierces non
  instruites, et les pièces que le CI exige désormais à chaque barreau.
- **[scoring-et-contenu.md](scoring-et-contenu.md)** — les 7 bloqués par une divergence
  critique, le cas `Q_ALI_01` où le banc mesurait la mauvaise forme, sept anomalies de
  moteur relevées en chemin, et l'inscription du verdict du banc au registre.

## Les quatre choses à trancher en premier

1. **Les huit sous licence tierce** (`droits.md` §1) — obtenir la licence, ou retirer
   l'instrument du catalogue. Ils restent **assignables aujourd'hui** :
   `licence_requise` n'est consommé nulle part dans le code. Deux d'entre eux
   (`Q_PED_02`, `Q_PED_03`) n'ont jamais été passés au banc ; si le sort retenu est le
   retrait, la dépense n'a pas lieu d'être engagée.
2. ~~**Le plafond réel de `Q_ALI_01`**~~ — **VÉRIFIÉ le 2026-07-29, rien à trancher.**
   L'étendue réelle du score est 0 à 90 et les quatre bandes sont atteignables. Le
   29 → 52 venait de `bornesExecutees`, un encadrement approché du banc et non l'étendue
   servie (`scoring-et-contenu.md` §2b).
3. **Le banc ignore les drapeaux** (`scoring-et-contenu.md` §2a) — `npm run check`
   vérifie déjà aux deux positions ; le banc de certification, non.
4. **Les six échelles internationales non instruites** (`droits.md` §2) — Zarit, IAT,
   IRLS, Karasek, MFI-20, IPSS. Elles font partie des **42** dont les droits n'ont fait
   l'objet d'aucune recherche.

## Ce que ce lot n'a pas touché

Aucun barème, aucun seuil, aucune valeur servie. Aucune passation rescorée. Les fichiers
de données modifiés sont `docs/claude/corpus/instrument_registry.json` seul ; côté code,
le vérificateur du CI, son appelant et son banc.
