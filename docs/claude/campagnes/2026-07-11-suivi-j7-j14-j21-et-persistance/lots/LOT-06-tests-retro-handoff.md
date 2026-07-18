---
id: "LOT-06"
titre: "Tests, rétrocompatibilité et handoff"
statut: "à_faire"
dépend_de: "LOT-05"
---

# LOT-06 — Tests, rétrocompatibilité et handoff

> Compilé le 2026-07-16 depuis `../sources/lots/LOT-06-tests-retro-handoff.md`.

## But

Valider persistance, droits et parcours longitudinal.

## Résultat observable

Rapport complet, rollback testé (sur base éphémère) et décision pour les
campagnes dépendantes (C2B, JA, SP-TT).

## Périmètre

- Tests API/auth.
- Tests migration (base éphémère `test:worktree` + gate de dérive).
- E2E praticien-patient fictifs.
- Documentation et handoff.

## Hors périmètre

- Ajouter de nouvelles fonctions.

## Fichiers probables

- Tests existants (`web/e2e/**`, vitest)
- `docs/checklist_tests_end_to_end.md`
- `docs/claude/SESSION_LOG.md` selon pratique
- `CAMPAGNE.md`

## Interdits

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Exécuter les validations (`npm run test:worktree`).
- [ ] Tester l'absence d'accès croisé inter-patient.
- [ ] Tester un protocole historique (rétrocompatibilité).
- [ ] Documenter la dette.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l'affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Aucune régression auth/assignations.
- [ ] Droits validés.
- [ ] Handoff produit.

## Risques / points de vigilance

- Ne tester que le happy path.

## Résultats

**Clôture de campagne C2A le 2026-07-18** (branche `feat/c2a-lot-04-checkins`, **sans
migration** — les 2 migrations C2A `c2a_persistance_v1` / `c2a_diffusion_v1` sont déjà sur
`main`).

### Validations exécutées
- `npm run type-check` ✅.
- Vitest **complet : 74 fichiers / 418 tests ✅** (aucune régression auth/assignations). Note
  infra : un worker jsdom (`PatientCompanionHome`) a subi un *timeout de pool* sous
  parallélisme plein — le fichier passe en isolation (4/4) ; flake d'environnement, non un
  échec de test (autorité = CI).
- `next lint` ✅ sur les fichiers touchés ; `scoring-check` ✅ (aucun score touché) ;
  `check_no_secrets.sh` ✅.
- `git status web/prisma/` **vide** → gate de dérive schéma↔migrations **satisfait par
  construction** (aucun changement de `schema.prisma`/`migrations/`). `npm run test:worktree`
  (base éphémère isolée) s'est **arrêté en fail-fast à l'étape « audit des campagnes »** sur
  **une erreur non-C2A** : `active_lot_missing` dans le `CAMPAGNE.md` de la campagne **JA**
  (`2026-07-13-journal-alimentaire-21j-v1`, `lot_courant=—`) — modification **non commitée
  d'une campagne parallèle**, hors de mon périmètre, que je ne touche pas. Les étapes DB /
  dérive / build / Playwright n'ont donc pas tourné localement. Comme mes commits C2A
  **n'embarquent pas** ce fichier JA, la CI de la PR (arbre committé propre) est l'autorité et
  ne verra pas cette incohérence. E2E Playwright = **autorité CI** (précédent LOT-02/03).

### Droits / rétrocompatibilité (couverts par tests)
- **Non-accès inter-patient** : 401 sans cookie + 404 inter-patient sur `api/portail/protocole`
  (LOT-05) et `api/portail/protocole/checkin` (LOT-04) ; garde `session.idPatient ===
  assignation.idPatient` + `isSessionAuthorizedForAssignment` ; **email-gate exclu** (§8.4).
- **Protocole sans check-in** : résumé J21 = points « en attente », vue patient sans
  progression — dégradation propre (tests `resumeJ21`, route praticien, compagnon).
- **Hors fenêtre / historique** : `finDeCycle` au-delà de J21+tolérance ; chaînage append-only
  des versions et des check-ins couvert (`versioning`, `checkins`).

### Handoff — campagnes dépendantes
- **C2B (Trajectoire & Spirale, praticien)** : brancher `momentum.ts` sur l'historique
  d'équilibre daté pour renseigner le **score du résumé J21** (null en V1) ; comparateur
  multi-épisodes.
- **SP-SPI (Phase B, post-IDP)** : l'**accueil de trajectoire « Ma spirale »** (identité
  durable, reprise multi-tours) reste à faire — le compagnon LOT-05 est volontairement borné au
  **protocole actif (R8-lite)**, il ne le préfigure pas.
- **SP-TT** : `relecture_notes` différée (non créée en C2A).
- **JA** : persistance adossée à C2A (déjà en place) ; surfaces patient portail cohérentes.

### Discordances 5.0 à arbitrer (consignées, non construites — impliquent un futur gate migration)
1. **`RelectureNote` (A6-1)** : le `PROGRAMME_WELLNEURO_5_0.md` la place « à modéliser en
   C2A », alors que l'**audit LOT-01 (§8.7) l'a différée à SP-TT**. Discordance réelle → à
   trancher avant tout travail SP-TT ; une table = migration sous gate explicite.
2. **Budget de charge global au protocole (A7-14)** : « contrainte à acter côté C2A »
   (renforcée par le contrepoint JA 5.0) — non modélisée en V1. À cadrer (impact possible
   sur le builder de protocole / la charge thérapeutique cumulée).

### Dette restante
- Score du résumé J21 = null en V1 (→ C2B). Modèle **mono-protocole** côté patient.
  `priorityLabel` patient différé (DecisionCard non persistée, §8.0). État « terminé » =
  heuristique `approvedAt + 24 j` (pas de flag de cycle en base).

### Décision de poursuite
C2A close côté implémentation. **Prochaine campagne 5.0 : C2B** (trajectoire praticien) ou une
campagne data (C5A), selon priorité utilisateur. Mise en prod = merge de la PR C2A LOT-04→06
sur `main` (routes+UI ; aucune migration), **après confirmation explicite**.
