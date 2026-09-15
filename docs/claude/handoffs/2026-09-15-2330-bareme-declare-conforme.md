# Handoff — 2026-09-15 — Le barème de charge est déclaré conforme, et entre en service

Suite immédiate du handoff de 19 h 00. L'échelle était partie **hors service** dans la
PR #1122 ; ce qui manquait n'était pas du code.

## Pourquoi la signature avait été retirée

`D-195` a été rendue le même jour par une session parallèle, et elle gouverne
exactement ce geste : *« la déclaration de conformité du praticien précède la frappe,
et elle est le geste attestant »*. Son obstacle central : l'outil qui a écrit le
contenu à relire ne peut pas l'attester seul — *« le verrou n'enregistre plus, il
ratifie »*. L'échelle ayant été **proposée** par l'outil, la signature a été défaite
sur la branche avant merge, et la déclaration demandée séparément.

## Ce que la relecture a corrigé — et c'est la preuve qu'elle a eu lieu

`CHARGE-01` porte `min: null` : elle couvre donc **zéro**. Un protocole dont les trois
actions attendent un bilan (`D-190`, sans plafond) n'engage rien — et le motif proposé
disait « Une seule action engagée : un pas à tenir ». Il affirmait faux à l'écran dans
ce cas-là. Le praticien a demandé une phrase couvrant les deux : « **Au plus une
action engagée : la charge reste minimale.** »

Le périmètre a changé avec elle : la déclaration a été **reposée** sur le texte final,
jamais sur l'ancien. L'ancien SHA reste écrit au-dessus du nouveau, marqué *jamais
signé* (`D-195` §4).

## L'échelle en service

| Actions engagées | Niveau | Phrase |
|---|---|---|
| 0 – 1 | léger | « Au plus une action engagée : la charge reste minimale. » |
| 2 | modéré | « Deux actions engagées en parallèle. » |
| 3 | chargé | « Trois actions engagées, le maximum que le protocole permet. » |

Terme lu : `nombreActionsFermes`. `excessive` n'est atteignable par aucune ligne, et
le registre d'avertissement écrit pour lui est **nommé dormant** dans le code.

## Gardes posées le même jour

- Table **enrôlée immédiatement** dans `shaPerimetreLitteral.guard.test.ts` — le
  retard d'enrôlement est ce que `D-067` puis `D-084` ont dû rattraper après coup.
- `docs/FEATURE_FLAGS.md` mis à jour dans la même PR (`D-195` §5 : une signature n'est
  finie que quand ce que le dépôt en dit l'est aussi).
- Un banc parcourt les **quatre cas sur la table réelle signée**, pas sur fixture.

## Vérifications

Deux mutations vues ROUGES avant tout vert, restaurées **depuis une copie** :
élargir `CHARGE-02` à 3 tue 4 bancs ; remettre le motif qui ment à zéro en tue 3.

## Ce qui reste, et n'est pas un lot

La **mesure d'usage** au conteneur, par identifiant : la forme
`run -d -- bash -c "psql …"` est refusée par le classifier du mode auto — refus de
forme, pas de contenu. Elle attend une session hors mode auto ou une règle de
permission. La campagne reste `en_cours` : ses huit lots sont livrés, sa clôture
formelle libère le créneau primaire et appelle un arbitrage sur la campagne suivante.
