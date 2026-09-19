# Handoff — 2026-09-19 — Réconciliation documentaire de la campagne assiettes

## 1. Branche et état Git

- Branche `wn-reconciliation-documentaire-2026-09-19`, partie de `origin/main` à
  `83bc2cec` (#1195, `D-232`). Worktree `phases-hash-2026-09-16`.
- Lot **documentaire seul** : aucun fichier de `web/src/`, aucune décision neuve.

## 2. Objectif de la session

Rendre les documents d'état fidèles à ce qui a été livré — au sens que
`FILE_ATTENTE.md` donne lui-même à « réconcilier » : *la réconciliation ne
réarbitre rien, elle rend la table fidèle à ce qui s'est passé*.

## 3. Décisions prises

**Aucune.** Un lot de réconciliation n'arbitre pas. Deux principes appliqués :

- **Les blocs DATÉS ne se réécrivent pas** — décision mergée, handoff passé,
  bloc « ÉTAT AU … ». Ils disent l'état d'un jour ; un bloc neuf les supplante.
- **Ce qui se lit comme une affirmation COURANTE est mis au passé**, précédé de
  l'état du jour, jamais supprimé : le motif d'alors reste utile.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** cinq affirmations devenues fausses : le catalogue à trois entrées
  (quinze depuis `D-230`), la méthylation « en attente de deux chantiers » (les
  deux sont livrés), l'arbitrage B2 du cadrage Boussole (tranché — et étendu aux
  **protocoles**, jamais aux fiches).
- **Ferme** quatre branches locales dont la PR est mergée, vérifiées **par l'état
  de la PR** et non par l'ascendance, que le squash rend menteuse.
- **N'atteint pas** : aucun code, aucun seuil, aucun claim. La table des
  indications reste **VIDE**, verrou **ÉTEINT**.

## 5. Fichiers modifiés

`SURFACE_RELECTURE_CATALOGUE_ASSIETTES_2026-09-16.md` (bloc d'état du 2026-09-19
en tête, trois paragraphes mis au passé) · `FILE_ATTENTE.md` ·
`CADRAGE_BOUSSOLE_ASSIETTE_2026-09-16.md` (B2 tranché) ·
`CADRAGE_PROTOCOLE_DEPUIS_LE_CORPUS_2026-09-16.md` · un fragment `changelog.d/` ·
ce handoff · `docs/claude/SESSION_LOG.md`.

## 6. Validations exécutées

- **`wn-etat-reel`** : 6 dimensions observées, **1 écart** — voir §7.
- **`wn-cycle`** : phase `travail`, et l'avertissement sur la branche par défaut.
- **Audit de campagnes** : vert. **Cohérence d'état** : 29 tests verts.
  **Numérotation des décisions** : 232, sans doublon ni trou.
- **Balayage ciblé** : plus aucune occurrence vivante de « trois entrées »,
  « attend deux chantiers » ou « tient trois entrées » hors blocs datés.
- **Pas de T1/T2** : aucun fichier de `web/src/` n'est touché. Le T2 vert de
  `D-232` (`T2-EXIT=0`, 583 fichiers, 205 E2E) reste celui qui fait foi.

## 7. Problèmes ouverts — DEUX ARBITRAGES HUMAINS, NON FAITS

- **`.wn/state.json` — `validation.last_checked_at` a 11 jours d'écart.**
  NON corrigé, et délibérément : les `checks` qu'il décrit sont ceux d'un **T3
  COMPLET** (certification scoring comprise). Cette session n'a joué que des
  **T2 `--fast`**. Avancer la date affirmerait une fraîcheur qu'on n'a pas.
  Elle se met à jour après un T3, pas après une réconciliation.
- **La branche par défaut locale est `behind 16`.** NON touchée : `wn-cycle` le
  dit — *réconcilier est un arbitrage humain, pas un geste automatique* —, et
  `main` est de toute façon prise par le worktree `correspondance-lot00`.
- **Trois branches distantes vivantes** portent du travail d'autres sessions
  (`wn-amendement-d226`, `wn-cloture-d049`, `wn-regles-revue-et-concurrence`) :
  rien à en faire ici.

## 8. Prochaine action exacte

1. Ouvrir la PR, **lire la revue Copilot aux TROIS emplacements avant de
   merger**, puis merger avec `--subject`.
2. Ensuite, le travail **clinique** : écrire les lignes d'indication depuis la
   surface, en relisant chaque claim sur pièce, source entière.
3. Puis l'attestation — surface, demande, transcription.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée.
- **Une entrée datée ne se réécrit pas** : elle se supplante.
- Une signature clinique ne se pose jamais par l'outil.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
