---
id: "2026-08-05-cloture-des-dettes-wellneuro-5-0"
titre: "Clôture des dettes Wellneuro 5.0"
statut: "en_cours"
créée_le: "2026-08-05"
mise_à_jour: "2026-08-05"
lot_courant: "LOT-04"
branche_campagne: "campaign/2026-08-05-cloture-des-dettes-wellneuro-5-0/integration"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Clôture des dettes Wellneuro 5.0

## Objectif

Fermer les dettes qui empêchent de déclarer Wellneuro 5.0 achevé — sans nouvelle
ingestion de savoir, sans nouvelle migration technologique. Le fil conducteur
n'est pas « ajouter », c'est **rendre observable et consommable ce qui est déjà
livré**, et **fermer les chemins en double**.

## Résultat observable

À la clôture de la campagne, on peut répondre par un artefact vérifiable, et non
par une lecture de mémoire, à ces cinq questions :

1. Quelle surface consomme quelle source de savoir, pour produire quelle décision,
   et le patient la voit-il ? → matrice de consommation générée, pas rédigée.
2. Un pack servi vient-il du registre ou du repli legacy ? → signal observé, avec
   alerte sur repli, et non seulement calculé.
3. Un patient a-t-il un seul parcours ? → une URL cible, la seconde documentée
   comme sortante avec sa date de retrait.
4. Quel est l'état réel du dépôt ? → `.wn/state.json` régénéré depuis le code, les
   migrations, les flags et la production, pas maintenu à la main.
5. Par quel chemin la base de production est-elle écrite ? → **un seul**, gaté par
   un environnement protégé.

## Ce que l'audit d'entrée disait de faux — corrections retenues au cadrage

L'audit du 2026-08-05 a été confronté au dépôt. Trois écarts, dont deux inversent
la priorité :

- **Point 7 — le risque est inversé.** Le workflow `release-db.yml` et
  `docs/DEPLOIEMENT_RELEASE_DB.md` sont **déjà sur `main`** depuis #517
  (2026-08-01). La PR #435 ne crée pas le workflow : elle **retire les écritures
  de `web/scripts/vercel-build.sh`** (−149 lignes) et aligne la doctrine. Donc
  aujourd'hui **deux chemins d'écriture coexistent**, dont celui du build, non
  gaté. « Ne pas merger #435 » n'est pas prudent : c'est laisser ouvert le chemin
  faible. Le blocage est **ops** (environnement GitHub `release-db` — le nom
  `production` est déjà pris par l'intégration Vercel —, secrets, reviewers
  distincts), pas du code.
- **Point 8 — le gate HDS n'est pas en attente, il est arbitré.** Décision du
  2026-07-22 : rester sur l'hébergement actuel, borner la phase de test au
  2026-10-21, ne pas instruire de migration HDS. Ce n'est pas une dette de 5.0
  mais une échéance datée. Les dettes actionnables sont les exigences
  indépendantes de l'hébergeur : piste d'audit des accès légitimes, procédure de
  violation de données, dossier RGPD.
- **Point 2 — l'écart est déjà nommé.** #560 (« ce que “certifié” ne dit pas »)
  a écrit la distinction calcul/psychométrie. Reste à la solder : notices
  bibliographiques, COSMIN, escalade SIIN ouverte depuis le 2026-07-25.

Angle mort de l'audit : **la PR #372** (2026-07-25, non brouillon, rubriques de six
questionnaires) est ouverte et non mentionnée. Deux PR ouvertes sont deux dettes.

Les points 1, 3, 4, 5 et 6 sont confirmés sur pièces. Le point 6 est **pire** que
décrit : `.wn/state.json` porte une branche de worktree morte
(`worktree-signature-table-orientation`), `dirty: true`, une validation datée du
2026-07-23, et un `next_action` de plusieurs milliers de caractères mêlant
décisions closes et actions en vol.

## Ordre des lots — pourquoi celui-ci

Deux lots avant tout le reste, pour la même raison : **on ne mesure pas une dette
depuis un état incertain**. LOT-00 ferme le chemin d'écriture faible (risque
production, et le plus court à fermer). LOT-01 rend l'état lisible
automatiquement — sans quoi chaque lot suivant rouvre le débat sur ce qui est
vrai. Les lots 02 à 05 sont indépendants entre eux et parallélisables.

## Contraintes non négociables

- Aucun secret en dur.
- Tous les textes UI en français.
- Aucun patient réel ; exemples limités à Sophie Nicola, Jennifer Martin, Michel Dogné.
- Aucune migration Prisma/SQL ou écriture Supabase sans confirmation distincte.
- Changements minimaux — pas de refactor hors périmètre de lot.
- **Aucune nouvelle ingestion de savoir** dans cette campagne.
- **Aucune modification de seuil clinique** sans demande explicite et `changelog.d/`.

## Décisions prises

- La campagne ne produit **aucune nouvelle source de savoir**. Elle branche,
  observe et ferme.
- LOT-00 est **ops-first** : il ne se merge qu'après les étapes GitHub, et c'est
  la seule dépendance externe de la campagne.
- Le retrait du parcours patient legacy (LOT-04) est **préparé et daté**, pas
  exécuté à l'aveugle : on ne supprime pas une URL sans preuve qu'elle n'est plus
  empruntée.
- Les trois moteurs de scoring ouverts (LOT-03) sont corrigés **avant** d'être
  reliés à une règle d'orientation, jamais après.

## Questions ouvertes

- La PR #435 est-elle rebasable telle quelle sur `main` après huit jours, ou
  faut-il la refaire ? (tranché en ouverture de LOT-00)
- La PR #372 est-elle encore pertinente, ou son périmètre a-t-il été absorbé par
  #566/#567 ? (tranché en LOT-05)
- Le repli legacy des packs a-t-il déjà été emprunté en production ? Une lecture
  `execute_sql` le dit ; elle conditionne l'urgence de LOT-02.
- Q_GEO_04 : l'escalade SIIN du 2026-07-25 reste sans réponse. Faut-il un plan B
  (sourcer les bandes HAS 2011 directement) ou attendre ?

## Dépendances

- **Externe et bloquante** : création de l'environnement GitHub `release-db`
  (nom dédié : `Production` appartient déjà à l'intégration Vercel, et les noms
  d'environnement GitHub sont insensibles à la casse), ajout des secrets,
  désignation de reviewers distincts du déclencheur. Sans elle, LOT-00 ne se
  merge pas.
- G-TRUST-04 : phase de test bornée au 2026-10-21. LOT-06 avance les exigences
  indépendantes de l'hébergeur ; il ne lève pas le gate.
- Campagne `2026-08-04-reprise-chantiers-en-suspens` (ouverte, 0/3) : vérifier au
  cadrage qu'aucun lot ne se recouvre.

## Artefacts de préparation

- `sources/brief-dettes.md` : audit d'entrée challengé, avec les vérifications.
- `BRIEF_COMPILED.md` : synthèse structurée des sources.
- `CAMPAIGN_DRAFT.md` : canevas R0→R6.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Un seul chemin d'écriture en base (PR #435) | livré (#435, 2026-08-05) | — (dépendance ops externe) |
| LOT-01 | Vue de vérité générée — état réel du dépôt | livré (#575, 2026-08-05) | — |
| LOT-02 | Packs : observer le repli legacy avant de le fermer | livré (#581, 2026-08-05) | LOT-01 |
| LOT-03 | Fermer `sum_decimal`, `count_threshold`, `ecab` | livré (#583, 2026-08-05) | — |
| LOT-04 | Un seul parcours patient | à_faire | LOT-01 |
| LOT-05 | Matrice de consommation du savoir | à_faire | LOT-01 |
| LOT-06 | Dettes psychométriques et exigences RGPD | à_faire | — |
| LOT-07 | Clôture : PR ouvertes soldées, déclaration 5.0 | à_faire | LOT-00…06 |

## Done de campagne

- [ ] Un seul chemin d'écriture en base, gaté par environnement protégé.
- [ ] `.wn/state.json` régénéré par script, plus maintenu à la main.
- [ ] Le repli legacy des packs est observé ; sa fréquence réelle est connue.
- [ ] Les trois moteurs de scoring ouverts sont fermés, avec tests de mutation.
- [ ] Le parcours patient legacy est daté pour retrait, ou retiré.
- [ ] La matrice de consommation existe et est générée.
- [ ] Aucune PR ouverte non justifiée (#435, #372 soldées).
- [ ] Les validations T1/T2/T3 sont documentées.
- [ ] La documentation canonique est à jour.
- [ ] Le handoff final est produit.
