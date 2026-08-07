---
id: "2026-08-06-packs-personnalises"
titre: "Envoi personnalisé par patient — retrait des packs figés"
statut: "terminé (2026-08-07)"
créée_le: "2026-08-06"
mise_à_jour: "2026-08-07"
lot_courant: "aucun"
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
2. **Dans le panneau d'orientation, toute recommandation aboutit à un envoi
   personnalisé** : le geste offert y est « Ajouter à la file d'envoi »
   (`OrientationPanel.tsx:195-196,345`), et ce panneau ne porte plus aucun bouton
   d'assignation de pack. L'énoncé est **restreint à ce panneau**, et pas à
   l'application : `PacksPanel.tsx:483-513` sert toujours un formulaire
   « Assigner un pack à un patient » (`POST /api/praticien/packs/assign`) —
   survivance assumée, qui depuis le retrait ne peut plus proposer que « Base de
   consultation ». Preuve disponible : **unitaire seulement**
   (`OrientationPanel.test.tsx`, `api/praticien/file-envoi/route.test.ts`,
   `api/praticien/file-envoi/envoyer/route.test.ts`). **Aucune preuve E2E** ne
   couvre le parcours orientation → file d'envoi → envoi ; c'est le LOT-01 de la
   campagne `2026-08-07-dettes-packs-residuelles`.
3. **Aucune règle d'orientation sans cible** : les 6 suggestions qui ciblaient un
   `packId` ont des cibles questionnaires, la table signée est re-signée (sha
   `547119c6…`, 23/23 claims VALIDE), et la perte de cible **par pack** est
   rendue **impossible** — non journalisée : `orientationRulesV1.test.ts:463`
   assère qu'aucune entrée de la table, **quel que soit son statut** (publiée ou
   non), ne cible un pack. La substitution du banc au log est justifiée en
   `lots/LOT-03-integration.md:21-28` : `packId` ne survit que dans l'union de
   type, un log serait vert en test et muet à vie en production.
   **L'énoncé ne porte que sur la cible pack.** Les **deux points de fail-closed
   silencieux** que [[D-030]] nommait écartent, eux, des cibles
   **questionnaire**, et restent **non instrumentés** :
   `web/src/lib/clinical/orientationEngine.ts:627` — si
   `suggestion.questionnaireId && estAdministrable(…)` est faux, `cibles` reste
   vide et rien n'est journalisé — et
   `web/src/lib/clinical/orientationService.ts:262-264`, filtrage muet sur
   `estAdministrableParLaRoute`. Dette écrite, **sans lot**.
4. **Le pack de base ne dérive plus** — **partiellement vérifié : la dérive est
   survenue, et elle n'a pas été prévenue.**
   - L'invariant « registre relationnel = legacy » **tient** : **6 qids** côté
     `packs` (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_SOM_09`, `Q_ALI_01`,
     `Q_ALI_09`) et `pack_questionnaires` aligné à **6 lignes** pour ce pack,
     lecture SQL de production du 2026-08-07 ; `check:pack-registry` vert, plus
     aucun `PACK_REGISTRE_REPLI_LEGACY ensembles_divergents`.
   - La **non-dérive**, elle, est **démentie**. Le LOT-00 mesurait **5 qids** en
     production le 2026-08-06 (`lots/LOT-00-cadrage.md:90-91` :
     `Q_MOD_03, Q_MOD_01, Q_INF_03, Q_SOM_09, Q_ALI_01`) et certifiait
     « 8/8 packs en MATCH exact », « 5 lignes, ordres 0..4 sans trou »
     (`lots/LOT-00-cadrage.md:119-123`). La lecture du 2026-08-07 en donne 6, et
     `packs.updated_at` porte **2026-08-06 18:02:38.913**, qui ne borne que la
     **dernière** écriture sur la ligne. Ce qui est prouvé : `Q_ALI_09` est entré
     dans le pack de base **pendant la campagne**, **entre la mesure du LOT-00
     (2026-08-06) et 18:02:38.913**, dernière écriture connue — après cette
     mesure et **avant** l'existence du garde `IDS_SUSPENDUS` sur `PATCH`
     (LOT-03, #604, 2026-08-07). La lecture du 2026-08-05 consignée en [[D-025]]
     (« aucun des 8 packs ne le référence ») corrobore : dérive **postérieure au
     2026-08-05**.
   - **L'auteur du geste est indéterminé** : aucune colonne d'audit ne le porte,
     aucun document de campagne ne le mentionne.
   - C'est nommément la réserve de [[D-025]] (« Aucun garde n'empêche `Q_ALI_09`
     d'entrer dans un pack… ») et le **point 4 de [[D-030]]** : la seule dérive
     documentée du pack de base sur toute la période s'est produite **pendant**
     la campagne qui devait la fermer.

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
| LOT-02 | L'orientation propose des ensembles personnalisés (⚠ clinique) | livré (2026-08-06) | LOT-01 |
| LOT-03 | Retrait effectif des packs non-base | livré (#604, 2026-08-07) | LOT-02 |
| LOT-04 | Clôture : preuves, changelog, vérification prod, reprise des dettes | livré (2026-08-07) | LOT-03 |

## Done de campagne

- [x] Tous les lots requis sont terminés — LOT-00 (#596), LOT-01, LOT-02 (#599),
      LOT-03 (#604), LOT-04 ; statuts en front matter de chaque
      `lots/LOT-0N-*.md`.
- [x] Les quatre faits du « Résultat observable » sont vérifiés sur pièces.
      Fait 1 : lecture SQL du 2026-08-07, 1 pack `actif = true`
      (`PACK_-bG21yeIvVYRhrdlYuWIMnFz`, `par_defaut = true`) sur 8, les 7 autres
      en historique ; `questionnaire_packs` à 1 actif / 7 inactifs (le
      soft-delete s'est propagé). Fait 2 : **unitaire seulement**
      (`OrientationPanel.test.tsx`, `api/praticien/file-envoi/route.test.ts`,
      `.../envoyer/route.test.ts`) — pas de preuve E2E, et l'énoncé est restreint
      au panneau d'orientation. Fait 3 : `orientationRulesV1.test.ts:463`
      (invariant « aucune règle ne cible un pack », publiée ou non) + sha
      `547119c6…` épinglé — **restreint à la cible pack**, la branche
      questionnaire (`orientationEngine.ts:627`, `orientationService.ts:262-264`)
      restant non instrumentée. Fait 4 : **partiellement vérifié** — l'invariant
      registre = legacy tient (6 qids, 6 lignes `pack_questionnaires`, lecture
      SQL du 2026-08-07), mais la **non-dérive est démentie** : 5 qids mesurés le
      2026-08-06 (`lots/LOT-00-cadrage.md:90-91,119-123`) → 6 le même jour à
      18:02 (`packs.updated_at = 2026-08-06 18:02:38.913`), auteur indéterminé,
      garde `IDS_SUSPENDUS` sur `PATCH` inexistant à cette date.
- [x] La décision est dans `docs/DECISIONS.md` — [[D-030]] (LOT-01), [[D-031]]
      (LOT-02) et [[D-032]] (clôture, ce lot) —, et le changement de logique
      clinique du LOT-02 est au changelog
      (`changelog.d/2026-08-06-orientation-ensembles-personnalises.md`), complété
      par `changelog.d/2026-08-07-packs-cloture-campagne.md`.
- [x] Le handoff final est produit
      (`docs/claude/handoffs/2026-08-07-0930-packs-lot04-cloture.md`) ; la
      bascule d'activité vers les dettes 5.0 (LOT-06) est **faite dans cette PR**
      (`.wn/state.json` puis `node scripts/wn-campaign.mjs sync`, qui régénère
      `ACTIVE_CAMPAIGN.md`). Après le merge, il ne reste que `node
      scripts/wn-cycle.mjs --appliquer` depuis `main`, qui réconcilie les seuls
      champs `git.*` avant de relancer `sync`.
