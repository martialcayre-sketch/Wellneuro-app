# Handoff — 2026-11-13 — export pseudonymisé : pseudonyme d'export, dates relatives, âge en tranche (D-512)

## Branche et état Git

- Branche `claude/kind-roentgen-026ec6`, worktree `.claude/worktrees/jolly-noyce-53e3bf`, au-dessus de
  `origin/main` 9ac347466 (merge de #2067), atteint par deux avances `--ff-only` (#2068, puis #2067) : aucun
  commit propre avant, aucun fichier commun.
- Session de côté lancée par la session de la refonte « Lien » ; `git` et `gh` en direct, pas de `/wn-*`. Boîte
  du registre : `export-ia-externe`.

## Objectif

Appliquer à la version « IA externe » de l'export PDF les arbitrages du responsable du 2026-11-13 sur P1-2 et P1-3
de la revue de sécurité du 2026-11-12. Le lot P0-1, P1-1 et P2-1 est #2051, mergée en 53cd6134.

## Décisions prises

- [[D-512]] (amende [[D-252]] §2), numéro réservé par `wn-reserver-decision`. Elle cite les deux arbitrages du
  2026-11-13 :
  - J0 sans consultation = jour le plus ancien enregistré par l'application, jamais une date déclarée du passé ;
    le repère est dit au préambule ;
  - date d'export ramenée au jour, jamais en J+n.
- Pseudonyme `EXT-XXXXXX` :
  - HMAC-SHA256 avec le préfixe de domaine `wellneuro-export-ia-externe:v1:`, 30 bits écrits en base 32 de
    Crockford ;
  - secret `WN_EXPORT_PSEUDONYME_SECRET`, 32 caractères au moins ;
  - jamais stocké ; module serveur seul (`pseudonyme.ts`, `node:crypto`).
- Sans secret :
  - la route rend 503 `pseudonymisation_indisponible` avant toute lecture ou journalisation ;
  - l'assembleur lève aussi sans pseudonyme (double garde) ;
  - la version complète reste servie.
- Masqueur :
  - la cible protégée est le pseudonyme ;
  - l'identifiant interne du dossier et toute forme `pat[_-]?\d{3,12}` à frontière de mot sont masqués,
    y compris collés à un nom.
- Dates :
  - une abstraction `Dateur` est passée aux sections : calendaire pour la complète, relative pour l'externe ;
  - précisions mois et année écrites en M±n et A±n ;
  - date technique d'un texte fixe retirée ; métadonnées PDF au jour.
- Constat Codex écarté avec motif : les chiffres non latins, que le pli rend en espaces avant le motif.

## Fichiers modifiés

- Nouveaux :
  - `web/src/lib/export-dossier/pseudonyme.ts`, `datesExport.ts` et leurs tests ;
  - `docs/decisions/D-512.md` ;
  - `changelog.d/2026-11-13-export-ia-externe-pseudonyme-dates-relatives.md` ;
  - ce handoff.
- Dans `web/src/lib/export-dossier/`, avec leurs tests (dont `masquage.corpus.test.ts`) : `assembler.ts`,
  `masquage.ts`, `modele.ts`, `pdf.ts`, `reponsesExport.ts`, `sectionAdministrative.ts`, `sectionPerimetre.ts`,
  `sectionQuestionnaires.ts`, `sectionRenseignements.ts`, `sectionSynthese.ts`.
- Route, tiroir et E2E :
  - `web/src/app/api/praticien/export-dossier/route.ts` et son test ;
  - `web/src/components/patient-cockpit/ExportDossierPanel.tsx` et son test ;
  - `web/e2e/export-dossier.spec.ts`.
- `.github/workflows/ci.yml` et `scripts/wn-test-worktree.sh` : secret factice de test.
- `docs/FEATURE_FLAGS.md` §E ; `docs/DOSSIER_RGPD.md` (rubrique 6, version resserrée).

## Validations exécutées

- Vitest ciblé : `src/lib/export-dossier` 637 verts, route 23 verts, tiroir 20 verts.
- Contre-revue Codex (D-505) sur la première version du diff : BLOQUER. Quatre constats, tous corrigés avec des
  tests de mutation :
  - J0 sur l'historique et la première synthèse ;
  - tests de l'assembleur ;
  - instant d'une date stockée ;
  - date technique d'un texte fixe.
- T1 complet et T2 : résultats reportés dans la PR.

## Problèmes ouverts

- **Variable Scalingo à créer par le responsable avant le déploiement** : `WN_EXPORT_PSEUDONYME_SECRET`.
  - 32 caractères au moins, par exemple `openssl rand -base64 48`.
  - Recréer ensuite les conteneurs web : `env-set` ne redémarre pas.
  - Sans elle, l'export pseudonymisé affiche un message d'indisponibilité.
  - En développement, la poser dans `web/.env.local`.
- Changer le secret change tous les pseudonymes : le suivi par l'outil externe est rompu.
- Une collision reste possible sur 30 bits : négligeable à l'échelle du cabinet, non vérifiée.
- Profession, lieux et dates citées dans un texte libre ne sont pas masqués (D-512 §5) : relecture demandée.
- Les envois vers une IA externe restent suspendus ([[D-449]] §3), conditions inchangées.

## Prochaine action exacte

1. Attendre le CI de la tête (`wn-attendre-ci.mjs`) et la revue PR-Agent prouvée (`wn-revue-pr-agent.mjs` = 0) ;
   un verdict par remarque.
2. Déclarer « prête @<sha> » en commentaire de PR et par une ligne `prete` à l'`integrateur` (registre D-503).
   L'intégrateur merge.

## Interdits encore actifs

- Ne jamais écrire « anonymisé » pour cet export : c'est une pseudonymisation.
- Aucune donnée patient réelle ; fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Aucune migration, aucun changement clinique ; production en lecture seule.
- Aucun secret réel dans le dépôt, la CI ou un message : la valeur de CI est factice.
