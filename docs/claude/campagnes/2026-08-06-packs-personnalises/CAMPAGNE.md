---
id: "2026-08-06-packs-personnalises"
titre: "Envoi personnalisé par patient — retrait des packs figés"
statut: "en_cours"
créée_le: "2026-08-06"
mise_à_jour: "2026-08-06"
lot_courant: "LOT-02"
branche_campagne: "campaign/2026-08-06-packs-personnalises/integration"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Envoi personnalisé par patient — retrait des packs figés

## Objectif

Remplacer les packs de questionnaires figés par des envois personnalisés composés
par patient, en ne conservant qu'un seul pack actif : « Base de consultation »
(assigné automatiquement à l'onboarding). Le chemin de remplacement **existe
déjà** — la file d'envoi Bibliothèque accepte un ensemble arbitraire de `qids`
par patient (plafond 60, même déduplication que les packs, un seul mail
récapitulatif). La campagne ne construit pas un nouveau canal : elle bascule
l'orientation et l'UI dessus, puis retire les packs.

## Résultat observable

À la clôture, quatre faits vérifiables :

1. **Un seul pack actif en base** (« Base de consultation »), les autres en
   `actif: false`, visibles en historique — vérifiable par lecture SQL.
2. **Toute recommandation d'orientation aboutit à un envoi personnalisé** : le
   panneau d'orientation ajoute des questionnaires à la file d'envoi, plus aucun
   bouton « Assigner ce pack ».
3. **Aucune règle d'orientation sans cible** : les 6 suggestions qui ciblaient un
   `packId` ont des cibles questionnaires, la table signée est re-signée, et la
   perte de cible d'une règle est journalisée (plus de disparition silencieuse).
4. **Le pack de base ne dérive plus** : registre relationnel = legacy (5 qids,
   `Q_SOM_09` inclus), `check:pack-registry` vert, plus aucun
   `PACK_REGISTRE_REPLI_LEGACY ensembles_divergents`.

## Contraintes non négociables

- Aucun secret en dur.
- Tous les textes UI en français.
- Aucun patient réel ; exemples limités à Sophie Nicola, Jennifer Martin et
  Michel Dogné.
- **Aucune migration dans cette campagne** : le retrait est un soft-delete de
  données par l'UI (route DELETE existante) ; toute dérive vers une migration
  exige une confirmation distincte et un lot dédié.
- Le LOT-02 touche la logique clinique (règles d'orientation) : demandé
  explicitement le 2026-08-06, à documenter au CHANGELOG, revue adversariale
  `wn-reviewer` obligatoire avant PR.
- Changements minimaux ; une PR par lot, une finalité par PR.

## Décisions prises

Arbitrages utilisateur du 2026-08-06 (session de cadrage) :

1. **Le second pack créé par le praticien (« Florence 1 ») est désactivé
   aussi** (hors doctrine, jamais ciblé par l'orientation) — « Base de
   consultation », elle aussi créée par le praticien, **n'est jamais
   désactivée** et reste le seul pack actif. Précision d'inventaire LOT-01
   (D-030) : la formulation initiale « les 2 packs praticien », lue
   littéralement, aurait désactivé le pack de base et cassé l'onboarding.
2. **Le geste d'envoi depuis l'orientation est l'ajout à la file d'envoi**
   (réutilisation de `POST /api/praticien/file-envoi`), pas l'assignation
   directe ligne à ligne.
3. **Cette campagne devient l'activité primaire** ; la reprise des dettes 5.0
   (LOT-06/07) attend sa clôture.

La décision produit formelle (D-030) s'écrit au LOT-01, sur pièces
d'inventaire.

## Questions ouvertes

- Les 6 suggestions à `packId` (`R2-SOM-05`, `R2-STR-02`, `R2-GAS-02`,
  `R2-ALI-01`, `R-STR-02`, `R-GAS-01`) portent-elles déjà des cibles
  `questionnaireId` de repli, ou faut-il les composer ? (à trancher au LOT-01,
  règle par règle)
- `pack-reevaluation` replie sur le pack `parDefaut` quand le pack de la
  dernière consultation est désactivé : comportement acceptable ou à ajuster ?
  (LOT-01, vérifié au LOT-03)
- Le seed doit-il écrire le registre relationnel (aujourd'hui repli
  `registre_absent` systématique en environnement seedé) ? (LOT-00)

## Dépendances

- Déduplication des assignations livrée et vérifiée en production (LOT-A/B/C,
  PR #588/#589/#592, index `assignations_unicite_ouverte_idx` constaté le
  2026-08-06) — la file d'envoi et l'orientation s'appuient dessus.
- Aucune dépendance de migration.

## Artefacts de préparation

- BRIEF_COMPILED.md : synthèse structurée des sources.
- CAMPAIGN_DRAFT.md : canevas R0→R6.
- Exploration du 2026-08-06 (session de cadrage) : surfaces packs, file
  d'envoi, règles d'orientation — références de fichiers reprises dans les lots.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Resynchroniser le pack de base (la question des questionnaires) | livré (#596, 2026-08-06) | — |
| LOT-01 | Inventaire des surfaces + décision produit D-030 | livré (2026-08-06) | LOT-00 |
| LOT-02 | L'orientation propose des ensembles personnalisés (⚠ clinique) | à_faire | LOT-01 |
| LOT-03 | Retrait effectif des packs non-base | à_faire | LOT-02 |
| LOT-04 | Clôture : E2E, changelog, vérification prod, reprise des dettes | à_faire | LOT-03 |

## Done de campagne

- [ ] Tous les lots requis sont terminés.
- [ ] Les quatre faits du « Résultat observable » sont vérifiés sur pièces
      (lecture SQL production incluse).
- [ ] La décision D-0xx est dans `docs/DECISIONS.md` et le CHANGELOG porte le
      changement de logique clinique du LOT-02.
- [ ] Le handoff final est produit et les dettes 5.0 redeviennent l'activité
      primaire.
