# Handoff — 2026-11-13 — export pseudonymisé : P0-1, P1-1 et P2-1 de la revue de sécurité du 2026-11-12

## Branche et état Git

- Branche `lot/export-ia-externe-masquage-forme`, créée sur `origin/main` f927eefe4 (merge de #2045), recréée
  sur 40c432e78 (merge de #2042) avant le commit, dans le worktree
  `.claude/worktrees/export-ia-externe-masquage-forme`.
- Session hors file (boîte du registre : `export-ia-externe`), lancée par une session de la refonte « Lien »
  (PRA-3b, Q15 a) ; `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Revue de sécurité en lecture seule de l'export « Pour une IA externe (pseudonymisée) » ([[D-252]]), puis, sur
la réponse du responsable (« Oui, ce lot »), le lot de correction sans décision nouvelle : P0-1, P1-1, P2-1. La
note de revue (risques P0 à P2 et addendum sur l'API OpenAI) vit hors dépôt, dans le dossier de notes partagé de
la session de la refonte.

## Décisions prises

- Mot proscrit pour cet export : « anonymisé » ; c'est une pseudonymisation, le RGPD s'applique.
- P1-1 : trois motifs génériques au masqueur (`MOTIFS_GENERIQUES`), quel que soit le titulaire : e-mail (partie
  locale ≤ 64, libellés ≤ 63, au plus huit), numéro français (« 0 » ou indicatif, puis quatre paires sous un même
  séparateur espace, point ou tiret — une date suivie d'une heure n'en est pas un), NIR de 13 ou 15 chiffres
  (2A et 2B compris, clé NON vérifiée : un NIR mal recopié reste un NIR). Les noms de tiers ne se détectent pas
  par la forme : la relecture reste demandée.
- P0-1 : la suspension de [[D-449]] §3 est dite dans l'aide du tiroir et dans le préambule du PDF (« suspendu
  depuis le 5 novembre 2026 »). Le texte la dit, il ne la tient pas ; aucune version n'est désactivée (désactiver
  la pseudonymisée pousserait vers la complète).
- P2-1 : un gabarit littéral de route par version dans le journal des accès
  (`/api/praticien/export-dossier?version=…`), sans migration ; aucun lecteur du champ `route` dans `web/src`.
- Écartés de ce lot, faute d'arbitrage : P1-2 (identifiant `PATnnn` dans le PDF et le nom du fichier ; option
  recommandée : pseudonyme HMAC propre à l'export externe, D-xxx amendant D-252 §2) et P1-3 (âge, dates exactes,
  lieux, profession).
- Contre-revue (API OpenAI) : l'export n'emprunte aucune API ; le seul appel OpenAI de l'application sert aux
  embeddings de la bibliothèque. Le P0-1 tient pour le flux déclaré (ChatGPT, offre individuelle) ; l'API est une
  condition de reprise à instruire, pas un correctif.

## Fichiers modifiés

- `web/src/lib/export-dossier/masquage.ts` (motifs génériques), `masquage.test.ts`, `masquage.corpus.test.ts`
  (cas P1-1 dans les deux sens ; le cas NF0 « e-mail d'un autre cabinet » passe de la fidélité aux fuites).
- `web/src/lib/export-dossier/sectionPerimetre.ts` et son test (préambule).
- `web/src/components/patient-cockpit/ExportDossierPanel.tsx` et son test (aide du tiroir).
- `web/src/app/api/praticien/export-dossier/route.ts` et son test (gabarit par version).
- `docs/DOSSIER_RGPD.md` (risque NIR levé, sortie de l'export précisée).
- `changelog.d/2026-11-13-export-ia-externe-masquage-forme.md` (nouveau) ; ce handoff.

## Validations exécutées

- Vitest ciblé (`src/lib/export-dossier`, route, tiroir) : 611 tests verts.
- T1 (`npm run check:rapide`) : `exit=0` ; T1 complet (`npm run check`) : `exit=0`.
- T2 (`npm run test:worktree -- --fast`), deux passages sur la base f927eefe4. Chacun est rouge sur UN test
  étranger au diff, jamais le même :
  - 1er passage : Vitest 17 213 verts ; E2E 369 verts, 1 rouge — `agenda-sommeil-praticien.spec.ts:235` sur
    iPhone 13 (WebKit). Le bouton « Clôturer et agréger » est absent après le clic sur « Agenda du sommeil »,
    AVANT tout export ; la trace montre la page chargée et le clic parti. Le même test est vert sur Desktop
    Chromium, assertions de l'export comprises (versions `ia-externe` et `complete`).
  - 2e passage : Vitest 1 rouge, délai de 5 s dépassé dans `ProtocolMiniBuilder.test.tsx` (vert au 1er
    passage) ; les E2E ne sont pas joués.
  - Pas de 3e passage (pas de rejeu jusqu'au vert) ; le CI joue la suite entière.
- Branche recréée sur `origin/main` 40c432e78 (`git switch -C`, sans merge ni rebase : aucun commit propre,
  aucun fichier commun avec #2042 et #2047), liberté de cycle approuvée le 2026-11-11.

## Problèmes ouverts

- P1-2 et P1-3 attendent l'arbitrage du responsable (décision D-xxx amendant D-252 §2).
- Reprise des envois vers une IA externe : conditions listées dans l'addendum de la note (accord art. 28,
  transferts, HDS, base légale art. 9, AIPD, ZDR et résidence UE constatés) ; affirmations sur OpenAI non vérifiées
  sur source officielle.
- Le numéro étranger (hors +33) n'est pas reconnu par la forme.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`) ; revue PR-Agent prouvée (`wn-revue-pr-agent.mjs` = 0), sinon
   `wn-reviewer` ; un verdict par remarque.
2. Déclarer « prête @<sha> » en commentaire de PR et par une ligne `prete` à l'`integrateur` (registre `D-503`) ;
   l'intégrateur merge.

## Interdits encore actifs

- Ne jamais écrire « anonymisé » pour cet export.
- Aucune donnée patient réelle dans le dépôt, les tests ou les messages ; fixtures : Sophie Nicola, Jennifer
  Martin, Michel Dogné.
- Aucune migration, aucun changement clinique ; la production se lit par conteneur `scalingo run -d`.
- Pas de lot P1-2 / P1-3 sans arbitrage écrit du responsable.
