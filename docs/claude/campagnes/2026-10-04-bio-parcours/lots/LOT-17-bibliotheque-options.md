---
id: "LOT-17"
titre: "BP-17 — Bibliothèque signée des options par hypothèse"
statut: "cadrage (2026-11-11) — cinq réponses rendues le 2026-11-10 ; D-477 mergée (#1980) ; D-480 proposée ; découpage des PR à accepter (20261111-1131-c), aucune migration avant"
dépend_de: "LOT-11, LOT-28"
---

# LOT-17 (BP-17) — Bibliothèque signée des options par hypothèse

> **Fiche proposée le 2026-11-10, mise à jour le 2026-11-11.** Les cinq
> questions du cadrage ont reçu leur réponse le 2026-11-10 (liste commune,
> `20261110-1940-c` à `-1944-c`). La décision d'objet est `D-480`
> (proposée) ; le découpage des PR attend l'accord du responsable
> (`20261111-1131-c`). Le dépôt est public : cette fiche ne porte ni option, ni produit, ni dose, ni durée, ni
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

| Préalable | État au 2026-11-10 (mis à jour le 2026-11-11) |
|---|---|
| BP-11 (LOT-11) | terminé le 2026-10-20 (`D-331`) ; vocabulaire d'hypothèses vide le 2026-11-10, six hypothèses inscrites par `D-477` le 2026-11-11 |
| BP-12b (LOT-28) | clos d'après le journal de F09 du 2026-11-10 : 18 positions signées, 32 arbitrages de conflit, PR 7 (#1955) mergée. La fiche LOT-28 et la ligne de `CAMPAGNE.md` disent encore « en_cours » |
| Porte 23 | non levée : les parts BP-12a et BP-12b sont signées, il reste celle de BP-17 (journal de F09 du 2026-11-10) |

## Réponses du responsable (2026-11-10)

Rendues sur les questions du cadrage, inscrites `repondue` dans la liste
commune. Elles ne se reposent pas.

1. **Clé** (`20261110-1940-c`) : les hypothèses `HYP_…` du besoin 2,
   nommées par une re-signature de BP-12a. Fait le 2026-11-11 : `D-477`,
   six hypothèses inscrites, `HYP_FER_1` réservé et non inscrit (#1980,
   mergée ; release-db verte sur `ac3f0ead` ; empreinte constatée en
   production, #1982). La saisie des libellés à l'atelier reste à la file B.
2. **Forme** (`20261110-1941-c`) : les deux, références dans le code et
   texte d'accompagnement en base. Ce choix n'autorise à lui seul aucune
   migration : le découpage ci-dessous attend l'accord du responsable.
3. **Signature** (`20261110-1942-c`) : une structure par besoin, re-signée
   à chaque dossier ; les positions d'expert citées sont contrôlées comme
   des claims.
4. **Porteurs** (`20261110-1943-c`) : le responsable fournit et valide les
   contenus. La file B porte les hypothèses, leur re-signature et la
   transcription des contenus. La file C porte la migration, le code, les
   surfaces de l'atelier et du cockpit, et la coordination de BP-17.
5. **Décision** (`20261110-1944-c`) : une D-xxx d'objet pour BP-17, sans
   prescription ; l'autorisation va au texte de BP-18a. C'est `D-480`,
   proposée le 2026-11-11. Elle écrit que « `prescriptif` exigé pour la
   seule source de dose » est un régime des claims (`D-046`) et ne dispense
   d'aucune autre métadonnée de `DC-11`.

Autres choix rendus le 2026-11-10 (session de la file B) : deux tables au
contrat de fraîcheur, `prescriptif` exigé de la seule source de dose ;
cockpit sous drapeau éteint, avec sa ligne dans la trame de BP-26.

## Découpage des PR (proposé le 2026-11-11, à accepter : `20261111-1131-c`)

| # | PR | Dépend de | Porteur | Palier |
|---|---|---|---|---|
| 0 | `D-477`, hypothèses du besoin 2 | — | file B | fait (#1980) |
| 1 | `D-480` et ce découpage, PR de doc | — | file C | T1 |
| 2 | **Migration seule** : table du texte d'accompagnement et de ses actes, en ajout seul, triggers et contrat SQL négatif ; `schema.prisma` à la main | accord sur `D-480` et sur ce découpage | file C | T3, `wn-reviewer` ; release-db approuvée, constat par conteneur |
| 3 | **Structure par références** : format, structure du besoin 2 vide et non signée, signature à cinq termes, empreinte de la structure des fiches d'usage | `D-477` ; accord sur `D-480` | file C | T3 (chemin clinique) |
| 4 | **Contrôles et garde** : aucune option sans précautions ; deux tables au contrat de fraîcheur ; contrat des positions citées ; aucune lecture de dossier ; hook DC-17 et matrice de consommation | PR 3 | file C | T3 ; T1 sur les crochets |
| 5 | **Surfaces de l'atelier** : saisie du texte par rubrique, acte daté du responsable, « à relire » après re-signature | PR 2 constatée en production ; PR 3 | file C | T2 |
| 6 | **Cockpit sous drapeau éteint**, ligne dans la trame de BP-26, ligne de `docs/FEATURE_FLAGS.md` | PR 5 | file C | T2 |
| 7 | **Contenus** : liste du responsable transcrite en identifiants et renvois, texte saisi à l'atelier, puis signature | PR 3 à 5 ; contenus du responsable | file B (transcription), responsable (contenus, signature) | T3 |

Les PR 2 et 3 sont indépendantes et peuvent avancer en parallèle. Aucune
n'écrit de contenu clinique. La garde des libellés d'hypothèse
(`20261111-0008-b`, `D-477` §2) est un lot de la file C distinct de BP-17,
sans dépendance avec ce découpage.

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
- Pas de `schema.prisma` ni de migration avant l'accord du responsable sur
  `D-480` et sur le découpage (réponse `20261110-1941-c`).
- Rien au patient. Production en lecture seule, par conteneur, en agrégats.
