# Handoff — 2026-11-17 — Refonte Lien / Empreinte, PRA-6 : constat à l'écran du portail praticien

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra6-fb3f11`, worktree `.claude/worktrees/festive-euclid-5b8aff`, avancée par `--ff-only` jusqu'à `58993aac8`. Documentation seule, un commit, poussé avec la PR.
- PR de code séparée : PRA-6a, #2227 (branche `claude/refonte-lien-pra6a-classes-cibles`).
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

PRA-6 (`plan-praticien.md`) : les vérifications du cadrage v3 l.540-553 côté praticien (quatre largeurs, zoom 200 %, clavier, mouvement réduit, états dégradés, Chromium et WebKit), la relecture `ui-ux-pro-max` et la comparaison aux prototypes de l'étape 3. Les écarts deviennent des lots nommés.

## Décisions prises

- Aucune décision : le rapport mesure et propose. Une seule correction entre dans le lot, PRA-6a, minime, sans texte, hors des captures de la fiche.
- Contrôle à l'écran par le cookie praticien des E2E (`web/e2e/helpers/auth.ts`) : l'OAuth Google n'a pas à être automatisé.
- Trois questions posées dans la liste commune : `20261117-1421-d` (quels lots, dans quel ordre, ordinaire), `20261117-1422-d` (PRA-6j, aperçu patient en mode consultation, clinique), `20261117-1423-d` (PRA-6e, h1 de la fiche, ordinaire).

## Fichiers modifiés

- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/pra6-constat.md` (neuf).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/README.md` (index), `plan-praticien.md` (PRA-6 : renvoi au constat).
- Ce handoff.

## Validations exécutées

- Constat local : 102 visites (35 écrans × Chromium, WebKit bureau, iPhone 13) sur `c5f99846` ; 28 visites à 320 px ; 9 visites P51, P52 et fiche sur `f18545d2`.
- Comparaison aux prototypes PRA-2, PRA-3a, PRA-3b, PRA-4 et PRA-5 par un sous-agent en lecture seule, écarts principaux recoupés dans le code.
- T1 rapide : 0 ; anti-secrets : OK. Pour PRA-6a : T1 complet 0, T2 `--fast` 0 (18 164 Vitest, 423 E2E).
- Outillage de mesure local, jamais versé : `pra6-constat.local.spec.ts` et `playwright.pra6.local.config.ts`. Leur copie est dans le dossier de notes partagé de la session parente.

## Problèmes ouverts

- Lots PRA-6b à PRA-6j : en attente des réponses aux trois questions.
- PRA-6c (courses de `SynthesePanel`, dont le booklet d'une synthèse affiché dans l'aperçu d'une autre avant envoi) est le plus urgent ; démontré dans le code, sans occurrence observée.
- Le CI de `main` à `f18545d2` était rouge sur `portail-rail-lateral.spec.ts:128` (patient, hors lot) ; vert dans le T2 local de PRA-6a.
- Non vu : lecteur d'écran réel, téléphone réel, écrans d'action vus par leurs seuls E2E (rapport §6).

## Prochaine action exacte

Après les réponses du responsable (liste commune), ouvrir les lots retenus dans l'ordre choisi, chacun dans une branche neuve sur `origin/main` ; PRA-6c avec `wn-reviewer`, PRA-6b après un DOC-n qui inscrit les noms accessibles dans D-488.

## Interdits encore actifs

- Ni route, ni garde, ni drapeau, ni schéma, ni règle clinique ; identités de fixture seulement.
- Aucun texte d'interface hors D-488 ; aucun décor avant COM-1.
- La session ne merge pas.
