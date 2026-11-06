# Handoff — 2026-11-07 — File D, d58 : rattachement des conditions d'orientation aux besoins (D-453), préalable de H98 levé

## Branche et état du dépôt

- Branche `docs/d58-rattachement-conditions`, depuis `origin/main`, avancée en `--ff-only` pendant la session (garde de fraîcheur).
- Worktree `.claude/worktrees/plan-d443-lot-code` : session concurrente, cycle en `git`/`gh` direct.
- PR de décision et de documentation, sans code : `docs/decisions/D-453.md` (neuve), amendement daté sous `docs/decisions/D-450.md`, trois lignes de `docs/claude/PLAN_WELLNEURO.md`, un fragment de journal H98, un fragment `changelog.d/`, ce handoff. Aucun `schema.prisma`, aucune table signée, aucun texte de consigne.
- **Pas de release-db attendue** : aucun chemin déclencheur touché.
- Essai `D-373` : la PR est déclarée « prête @<sha> », l'intégrateur la merge.

## Objectif

Poser la décision de rattachement que D-450 §2 exigeait avant le lot H98 : chaque condition déclencheuse de `ORIENTATION_RULES_V1` rattachée au besoin qu'elle mesure, sous provenance, dictée par le responsable. Recalculer ensuite les distributions en production.

## Décisions prises

- Inventaire des vocabulaires d'axe (agent `Explore`, lecture seule). Le numéro de besoin 1-12 est déjà la clé commune. `axeId` des packs, `AxeResolution` (D-103) et les axes biologiques (D-348) nomment autre chose. Aucun vocabulaire n'est créé (D-453 §6).
- Proposition remise en page privée (https://claude.ai/artifact/2bBXGHvPVfac7o3NwpiPaA) : 18 conditions, dont 6 couvertes, 6 rattachées au thème du guide et 6 à dicter.
- Onze réponses du responsable du 2026-11-06, consignées dans la liste commune de « Suivi de la file D » (`20261106-2300-d` à `2310-d`) :
  - rattachement multiple possible, justifié par besoin ; une source partagée compte une fois par besoin et par famille ;
  - une règle ouvre le besoin documenté par ses conditions, pas le besoin exploré ;
  - DNSM dissocié : DA au besoin 8, SE au besoin 9 (option hors liste, arbitrage d'organisation, sans validation publiée) ;
  - six rattachements par thème du guide ;
  - rythme biologique au besoin 5 ;
  - fatigue, moral, antécédent psychiatrique et attente « sommeil » : visibles, sans ouvrir ni compter. Pour le moral, la réponse a été reposée et précisée ;
  - apnée au besoin 5 (ANAMNÈSE), libellée « déclaré » ;
  - `Q_ALI_01` compte au besoin 1, et l'exclusion de D-443 §5 reste limitée au digestif.
- D-453 amende D-450 §2 et §3 et corrige un fait de D-450 §2 : `BESOIN_SOURCES` couvre `Q_INF_03`.

## Fichiers modifiés

- `docs/decisions/D-453.md` (neuve), `docs/decisions/D-450.md` (paragraphe d'amendement daté).
- `docs/claude/PLAN_WELLNEURO.md` : ligne H98 du §2, ligne D/45, ligne « de rattachement » du §10.
- `docs/claude/plan-journal/H98/2026-11-06-01-rattachement-d453-prealable-leve.md`.
- `changelog.d/2026-11-06-d453-rattachement-conditions-besoins.md`, ce handoff.

## Validations exécutées

- Recalcul à blanc sur une base locale de fixtures (`wellneuro_dev_3895729998`, créée et alimentée par `scripts/wn-dev-db.sh --migrate --seed`), puis en production depuis un conteneur `scalingo run -d` (one-off 7668), en lecture seule, avec le code déployé.
  - Le script vérifie que chacune des 18 conditions des 20 règles publiées figure dans la table ou dans la liste « sans compte », et aucune autre ; le contrôle passe.
  - Les agrégats sont masqués sous cinq, avec suppression secondaire, sans total. Résultat : aucun dossier au-delà de `CONVERGENCE_FAIBLE` (détail en D-453 §7).
  - Script et sortie : dossier privé `/private/tmp/wellneuro-revues/audit-orientation-d58/` (`q6-rattachement.ts`, `agregats-prod-rattachement-2026-11-06.json`), hors dépôt.
- T1 complet, CI et revue : voir la PR.

## Problèmes ouverts

- Le libellé du cockpit (source partagée, « plainte globale, composante à préciser », antécédent « déclaré ») est à soumettre au responsable dans le lot H98, avec celui de D-443 §8.
- Écart assumé entre la convergence et « Mon équilibre » pour le DNSM : DA et SE au 8 et au 9 d'un côté, au 10 de l'autre. Tout changement de « Mon équilibre » se décide à part.
- Lecteurs à vérifier par H98, toujours non constatés : la projection du cockpit et le chargeur des préconditions T0 (D-450 §6).
- Décompte du §0 du plan non recompté.

## Prochaine action exacte

1. CI (`node scripts/wn-attendre-ci.mjs <N>`, code 0), revue CodeRabbit ou PR-Agent sur la tête, trois sorties lues, puis « prête @<sha> ».
2. Ligne d58 de « Suivi de la file D » ; mémoire d58.
3. Lot H98 (file A, `web/src/lib/clinical/`, release-db retenue).

## Interdits encore actifs

- Pas de merge par cette session (essai D-373). Pas de pull, de merge ni de rebase sans arbitrage.
- Ne reposer ni les arbitrages d58 (du 2026-11-04 au 2026-11-06, y compris `2300-d` à `2310-d`) ni ceux de d61.
- Aucune valeur, aucun seuil ni aucun rattachement au dépôt public sans la main du responsable. Forme opaque, aucun texte de consigne.
- Production en lecture seule, par conteneur.
