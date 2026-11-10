---
id: "LOT-17"
titre: "BP-17 — Bibliothèque signée des options par hypothèse"
statut: "cadrage (2026-11-10) — fiche proposée, cinq questions ouvertes à la liste commune (20261110-1940-c à -1944-c), aucune D-xxx"
dépend_de: "LOT-11, LOT-28"
---

# LOT-17 (BP-17) — Bibliothèque signée des options par hypothèse

> **Fiche proposée le 2026-11-10**, sans arbitrage rendu. Les cinq questions
> sont dans la liste commune (`20261110-1940-c` à `-1944-c`). Le dépôt est
> public : cette fiche ne porte ni option, ni produit, ni dose, ni durée, ni
> précaution, ni contre-indication, ni libellé d'hypothèse. Ces contenus sont
> de la main du responsable (porte 23, `DC-11`).

## But

Donner au parcours de l'étage outil la bibliothèque que le cadrage v3 place
entre le constat et la prescription
(`docs/claude/campagnes/CADRAGE_BIO_PARCOURS_v3_2026-10-04.md:393`) :
pour une hypothèse confirmée, toutes les options, chacune avec ses
précautions, sa surveillance, son critère d'arrêt, sa population, la source
de sa dose (ou « information manquante ») et le statut réglementaire du
produit. **Aucune sélection d'après le dossier** (`:260`). BP-18a choisira
dans cette bibliothèque (`:394`). La prescription vient d'elle, pas de la
stratégie classée (`:15`).

## Résultat observable

Une structure signée de la main du responsable, lue par le code. Une option
sans précautions documentées n'y entre pas (`:47`, `:260`, arbitrage 1(4),
`DC-38`). Une structure retouchée après signature n'est plus signée. Le hook
`DC-17` protège son fichier. Rien n'est servi au patient, et rien n'est
prescrit : BP-18a et sa D-xxx en décideront.

## Ce que le dépôt dit aujourd'hui (lu le 2026-11-10 sur `fd65fb24`)

- **Ligne du cadrage** (`:393`) : migration « non » ; décision préalable
  « D-xxx de premier usage prescriptif (arbitrage 1) » ; dépend de BP-11 et
  BP-12b ; fin observable « signature à cinq termes ; hook DC-17 ; aucune
  option sans précautions ».
- **F11** (`docs/claude/PLAN_WELLNEURO.md:1631`) : rang 5, porte 23, critère
  de fin « signature ; hook DC-17 ; aucune option sans précautions ».
- **Part de `DC-11`** (`docs/decisions/D-417.md` §1, journal de F11 du
  2026-11-01) : BP-17 porte la dose, la durée, les contre-indications, les
  interactions et le rôle du praticien, avec les produits, le statut
  réglementaire et les renvois aux précautions (`D-314` §9, arbitrage 20).
  BP-12a garde population, indication et conditions d'entrée. Les rubriques
  `precautions` et `surveillance_arret` des fiches d'usage ne tiennent pas
  `DC-11`.
- **Vocabulaire d'hypothèses vide.** La structure signée des fiches d'usage
  (`web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts:1743-1744`) déclare une
  question clinique, 54 fiches, et **aucune hypothèse `HYP_…`** ; chaque
  fiche a une liste d'hypothèses vide. C'est voulu depuis la première
  signature (`docs/decisions/D-401.md:48`, « aucune position n'en nomme »)
  et inchangé après les re-signatures de `D-417`, `D-446` et `D-457`. Effet :
  aucun constat BP-11 ne peut être posé (`D-331` §1), et une bibliothèque
  « par hypothèse » n'a aucune clé. Question `20261110-1940-c`.
- **Sources de dose et de précaution déjà en base.** Les claims certifiés,
  et 18 positions d'expert signées (`WN-PE-0001` à `0018`, journal de F09 du
  2026-11-10), au modèle `PositionExpertVersion`
  (`web/prisma/schema.prisma:4183`) : rubriques `enonce`, `perimetre`,
  `population`, `limites`, claims d'appui, actes de signature. Le cadrage
  §4.2 nomme quatre sources de dose : claims, registre des compléments,
  référentiels ingérés, position d'expert signée.
- **Patron de signature.** `structureSignee()`
  (`ficheUsageBesoin2V1.ts:2454-2473`) : verrou posé, date ISO, liste des
  claims déclarés égale à celle des claims cités, `shaPerimetre` littéral
  égal à l'empreinte, structure cohérente. La structure du besoin 2 a été
  re-signée une fois par dossier.
- **Écarté, non reposé** : des rubriques neuves dans les fiches d'usage
  (`D-417` §1). La « règle signée et C4 » part dans le texte unique de BP-18a
  (arbitrage du 2026-11-07, journal de F12), et non dans la décision de
  BP-17 comme le disait `lots/LOT-07-dossier-de-preuve.md:138`.

## Préalables

| Préalable | État au 2026-11-10 |
|---|---|
| BP-11 (LOT-11) | terminé le 2026-10-20 (`D-331`) ; aucun constat possible tant que le vocabulaire d'hypothèses est vide |
| BP-12b (LOT-28) | clos d'après le journal de F09 du 2026-11-10 : 18 positions signées, 32 arbitrages de conflit, PR 7 (#1955) mergée. La fiche LOT-28 et la ligne de `CAMPAGNE.md` disent encore « en_cours » |
| Porte 23 | non levée : les parts BP-12a et BP-12b sont signées, il reste celle de BP-17 (journal de F09 du 2026-11-10) |

## Questions ouvertes (liste commune, 2026-11-10)

1. **Clé** (`20261110-1940-c`, clinique) : nommer les hypothèses par une
   re-signature de BP-12a (recommandée) ; ou accrocher aux fiches d'usage ;
   ou suspendre.
2. **Forme** (`20261110-1941-c`, migration) : une liste signée dans le code,
   par références seulement, sans migration (recommandée) ; ou une table en
   base ; ou les deux.
3. **Périmètre de la signature à cinq termes** (`20261110-1942-c`,
   clinique) : une structure par besoin, re-signée par dossier, positions
   vérifiées comme les claims (recommandée) ; ou une structure unique ; ou
   une par hypothèse.
4. **Porteur des contenus** (`20261110-1943-c`) : le responsable dresse la
   liste, la file B la transcrit, la file C code (recommandée) ; ou la
   file C fait tout ; ou la file B porte le lot. Les deux files se
   croient porteuses : le journal de F09 du 2026-11-10 écrit « Suite de la
   file B : BP-17 (F11) ».
5. **Place de la D-xxx de premier usage prescriptif** (`20261110-1944-c`,
   clinique) : une D-xxx d'objet pour BP-17, rédigée par la session et
   acceptée par le responsable, qui n'autorise aucun usage prescriptif ;
   l'autorisation reste dans le texte de BP-18a (recommandée). Ou tout dans
   le texte de BP-18a, ou une D-xxx de BP-17 de la main du responsable.

## Ordre des PR (provisoire, sur les options recommandées)

1. **Re-signature de BP-12a** avec les hypothèses du besoin 2, si la
   question 1 le retient (file B, geste du responsable).
2. **D-xxx d'objet de BP-17**, PR de décision seule, acceptée avant le code.
3. **Code** : format de la structure, `structureSignee()` sur le patron des
   fiches d'usage, garde « aucune option sans précautions », renvois
   vérifiés contre les claims et positions, fichier ajouté au hook `DC-17`
   et à la matrice de consommation. Structure vide, non signée.
4. **Contenus** : la liste du responsable transcrite en identifiants, puis
   sa signature (porte 23).

L'ordre change si la question 2 retient une table : migration seule, puis
release-db, puis code (`D-266` §11).

## Critère de fin (F11)

Structure signée à cinq termes par le responsable ; fichier sous le hook
`DC-17` ; aucune option sans précautions, prouvé par un banc ; porte 23
levée.

## Interdits

- Aucune option, dose, durée, précaution ni contre-indication rédigée par
  une session ; aucune sélection d'après le dossier.
- Aucun lecteur de `creePar` ni de `validePar` (`D-459` §7) : BP-18a en
  décidera.
- La D-xxx de BP-18a et la règle signée sont de la main du responsable.
- Pas de `schema.prisma` ni de migration sans arbitrage de la question 2.
- Rien au patient. Production en lecture seule, par conteneur, en agrégats.
