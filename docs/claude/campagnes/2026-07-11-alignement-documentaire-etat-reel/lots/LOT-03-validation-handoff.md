---
id: "LOT-03"
titre: "Validation et handoff"
statut: "terminé"
dépend_de: "LOT-02"
---

# LOT-03 — Validation et handoff

## But

Clôturer l'alignement et transmettre un état de départ fiable.

## Résultat observable

Un handoff court : état confirmé, dettes actives, fichiers canoniques et autorisation de lancer la campagne suivante.

## Périmètre

- Relire le diff.
- Documenter les commandes exécutées.
- Mettre à jour le statut de campagne.
- Préparer le contexte minimal pour la campagne suivante.

## Hors périmètre

- Commencer le cockpit
- Corriger une dette technique identifiée

## Fichiers probables

- CAMPAGNE.md
- lots/LOT-03-validation-handoff.md
- documentation modifiée dans LOT-02

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

- [x] Vérifier tous les critères.
- [x] Produire la liste des dettes hors périmètre.
- [x] Décider go/no-go.
- [x] Mettre à jour le journal selon les pratiques du repo.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l'affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [x] Le go/no-go est explicite.
- [x] Aucune question bloquante n'est masquée.
- [x] La prochaine campagne connaît ses dépendances réelles.

## Risques / points de vigilance

- Déclarer go alors qu'une divergence critique reste ouverte.

## Résultats

**Clôturé le 2026-07-11.**

**Diff relu** : 10 fichiers `.md` modifiés sur toute la campagne (LOT-00→03) — `docs/ROADMAP_TECHNIQUE.md`, `docs/roadmap.md`, `docs/ROADMAP_PRODUIT.md`, `docs/claude/ROADMAP_AGENT_PLAN.md`, `docs/claude/SESSION_LOG.md`, `CAMPAGNE.md`, les 4 fichiers `lots/LOT-0X-*.md`, `docs/claude/campagnes/ACTIVE_CAMPAIGN.md`. Aucun fichier de code applicatif, schéma Prisma ou route API touché.

**Commandes exécutées** :
- `bash scripts/check_no_secrets.sh` → `OK: aucun secret évident détecté.`
- `cd web && npm run type-check` → aucune erreur.
- `npm run scoring-check`, smoke test navigateur, vérification mobile/tablette : non applicables (lot 100 % documentaire, aucune interface ni logique de score modifiée).

**Dette hors périmètre listée** :
- Dette de pagination/cockpit (question ouverte #3 de `CAMPAGNE.md`) : non auditée dans C0, non bloquante, reportée à une campagne technique future si besoin.
- Aucune autre dette documentaire connue sur le périmètre C0.

**Clarification découverte pendant ce lot** : `CAMPAGNE.md` (objectif) mentionnait un handoff vers C1 directement, mais `PROGRAMME_WELLNEURO_3_0.md` montre l'ordre réel **C0 → C0-UX → C1** (C1 dépend de « C0 + C0-UX »). Le handoff pointe donc vers **C0-UX**, pas C1.

**Décision go/no-go** : **GO pour C0** (clôturée, aucune divergence bloquante restante). **C0-UX peut démarrer** (sa dépendance vers C0 est satisfaite). **C1 reste bloquée** jusqu'à la clôture de C0-UX.

**Prochaine campagne** : C0-UX (`docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/`), LOT-00 (cadrage et arbitrage des questions ouvertes, zéro code) — à démarrer sur instruction explicite de l'utilisateur, pas automatiquement par ce lot.
