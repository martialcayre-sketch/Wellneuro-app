---
id: "LOT-00"
titre: "Cadrage, D-256, ouverture de la campagne"
statut: "en_cours"
dépend_de: "—"
---

# LOT-00 — Cadrage, D-256, ouverture de la campagne

## But

Poser le cadre avant tout code : décision `D-256`, cadrage lié, campagne suivie ouverte.

## Résultat observable

`D-256` au registre ; `CADRAGE_BIO_INGEST_2026-09-30.md` renvoie vers la décision et la campagne ; campagne active dans `.wn/state.json`.

## Périmètre

`docs/DECISIONS.md`, le cadrage, ce dossier de campagne, `.wn/state.json`, `ACTIVE_CAMPAIGN.md`, fragment `changelog.d/`.

## Hors périmètre

Tout code applicatif, toute migration.

## Fichiers probables

- `docs/DECISIONS.md`
- `docs/claude/campagnes/CADRAGE_BIO_INGEST_2026-09-30.md`
- `docs/claude/campagnes/2026-09-30-bio-ingest/`
- `changelog.d/2026-09-30-bio-ingest-cadrage-d256.md`

## Interdits

- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune écriture dans `resultats_biologiques` sans validation humaine explicite.
- Aucune qualification clinique d'une valeur (basse, haute, pathologique), aucune recommandation.
- Aucune conversion d'unité (`D-157`), aucun choix final d'analyte par LLM.
- Pas de migration hors d'un lot marqué « confirmation obligatoire » (`D-087`).
- Pas de refactor hors lot.

## Dépendances

—

## Étapes

- [x] Réserver `D-256` depuis `main` (texte rédigé en séance le 2026-09-30).
- [x] Relier le cadrage à la décision et à la campagne.
- [x] Ouvrir la campagne suivie.
- [x] T1 complet + `wn-campaign-audit --fail-on-warning-codes`.
- [x] Handoff (`docs/claude/handoffs/2026-09-30-1749-bio-ingest-lot00.md`).
- [ ] PR vers `main`.

## Tests

Documentaire : `npm run check`, audit des campagnes, `check_no_secrets.sh --staged`.

## Critères de done

PR mergée, CI vert (`wn-attendre-ci` code 0), commentaires de revue traités.

## Résultats

Clos sur la branche le 2026-09-30, avant la PR. `D-256` posée avec le texte rédigé en séance (le hook de fraîcheur avait bloqué l'édition de la session d'origine). Validations : `npm run check` code 0 (504 tests), `wn-campaign-audit --fail-on-warning-codes` code 0, `check_no_secrets.sh --staged` OK. Aucun code, aucune migration.
