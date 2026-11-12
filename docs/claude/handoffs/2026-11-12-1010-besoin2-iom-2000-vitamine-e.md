# Handoff — 2026-11-12 — Besoin 2 : relecture de WN-CL-0649-005 contre l'IOM 2000, source au registre, un claim en attente (H15)

## Branche et état Git

`docs/besoin2-iom-2000-vitamine-e` est une session concurrente, dans le worktree `.claude/worktrees/b-fiche-usage-iode-selenium`. Elle part de `origin/main` `5823e961`, sans merge ni rebase. Documentation et registre seuls : aucun code, aucune migration, aucun `schema.prisma`, pas de release-db.

## Objectif

Restes du besoin 2, dans l'ordre déjà tranché : relire `WN-CL-0649-005` contre la source primaire qu'il cite (IOM 2000), puis arbitrer.

## Décisions prises

- Cadrage : l'IOM confirme les deux valeurs du claim et leur attribution ; le claim est fidèle au passage de l'Anses. L'IOM précise trois points absents du passage : la nature des données, le caractère prudent du critère, et son usage pour une population, pas pour un individu.
- Arbitrage du responsable (question à options, contre la recommandation de maintenir seul) : maintenir `WN-CL-0649-005`, inchangé, et ingérer l'IOM 2000 avec un claim distinct, en attente de sa signature. L'accord d'ingestion vaut pour cette source seule.
- Numéros fixés après contrôle de collision, relu juste avant l'écriture : `WN-SRC-0653`, lot `LOT_057_2026-11-12`.
- Quatre passages mot pour mot (pages imprimées 232 à 235) et un claim qui les cite tous ; pas de clé de lien (`D-321`), seule une rubrique prévue.
- Droits : `rightsStatus: to_verify`.
- Phrase du README sur les droits de `0652` et `0555` scindée (routée à ce lot par la revue de #1999).
- Pièces non opaques (cadrage, citations, passages, texte du claim, hash) au dépôt privé des revues, vérifié privé avant chaque dépôt : `polyphenols-antioxydants/iom-2000/`.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : notice `WN-SRC-0653`.
- `docs/claude/corpus/README.md` : comptes, inventaire, droits.
- `docs/claude/plan-journal/H15/2026-11-12-01-iom-2000-relecture-0649-005.md`.
- `changelog.d/2026-11-12-besoin2-iom-2000-vitamine-e.md`.
- ce handoff.

## Validations exécutées

- Lecture en production par conteneur (lecture seule) de `0649-005`, de ses passages et de ses décisions.
- Passages retrouvés mot pour mot dans l'édition en ligne ; charges passées aux parseurs du serveur.
- Ingestion en production par conteneur détaché : 4 passages (HTTP 200, vérification verte), puis 1 claim (HTTP 200, vérification verte).
- Constat par conteneur, en lecture seule : 4 passages actifs du lot ; `WN-CL-0653-001` en attente, 4 liens, sans validateur ni clé de lien ; `0649-005` VALIDE, hash inchangé ; base 8 596 validés, 35 en attente, 93 rejetés ; contrat de fraîcheur et `biology_liens_axe_v1.sql` en `exit=0`.
- `bash scripts/check_no_secrets.sh --staged` ; `cd web && npm run check`.

## Problèmes ouverts

- `WN-CL-0653-001` attend la signature du responsable ; puis constat (statut, hash, contrats).
- `WN-CL-0044-020` et `0044-021` restent à relire (`D-473` §6).
- Le `requiredAction` des notices `0652` et `0653` dit « en attente de la signature » : à passer à « signés » au prochain lot qui touche le registre, une fois les signatures constatées (`0573`, `0577` et `0578` portent le même retard).
- Toujours ouverts :
  - la licence non commerciale de l'OMS 2019 (`0652`), question au responsable ;
  - 0189-136 à 0189-140, dont l'unité de la source date de 2006 ;
  - la dette d'un banc de CI qui rejoue le contrat du catalogue sur une base avec signatures (H15 02) ;
  - le candidat NABM `7302`, à signer par le praticien ;
  - l'écran de revue de l'atelier (« lecture de revue impossible »), non instruit.

## Prochaine action exacte

1. CI et revue sur la tête : CodeRabbit, sinon Copilot (`D-468`), sinon PR-Agent prouvé. Un verdict par remarque, puis « prête @<sha> » pour l'intégrateur.
2. Le responsable signe `WN-CL-0653-001` dans l'atelier ; constat par conteneur.
3. Puis la réserve de `D-465` §3, et la déclaration « besoin 2 achevé ».

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d`.
- Aucun texte clinique, libellé de claim ou valeur dans le dépôt public (`D-251` §4).
- Aucune ingestion sans accord du responsable.
- Validation et signature des claims : gestes du responsable.
- Pas de pull, merge ni rebase sans arbitrage.
- Après tout changement de statut d'un claim : rejouer le contrat de fraîcheur et `biology_liens_axe_v1.sql`.
