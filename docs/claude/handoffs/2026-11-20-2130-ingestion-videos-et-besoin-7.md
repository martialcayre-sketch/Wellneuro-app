# Handoff — 2026-11-20 — vingt-trois textes libres des vidéos et du besoin 7 ingérés, quarante et une notices seules, lot de la file B

## Branche et état Git

- Branche `docs/corpus-ingestion-videos-besoin7`, créée sur `origin/main` (`8f39f398c`), avancée par `--ff-only` sur `c71d6934c` avant la première écriture (D-518). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. Aucune PR ouverte ne touche le registre des sources ni le journal H15 (relevé à l'écriture : #2178 hygiène Markdown, #2287 orchestration, fusionnée depuis).

## Objectif

Exécuter l'accord du responsable du 2026-11-20 pour les envois des vidéos de cours et du besoin 7 : ingérer les textes libres, enregistrer les notices seules, laisser la trace au registre et au journal H15.

## Décisions prises

- Réponses Q1 à Q6 appliquées : trois manuscrits d'auteur admis comme `WN-SRC-0755` (Q1 = A) ; trois textes à ingérer après fourniture du PDF, notice seule d'ici là (Q2 = B) ; notices pour quatre documents officiels, texte de NICE non ingéré (Q3 = A) ; deux textes CC BY-NC-SA admis (Q4 = A) ; un texte hors périmètre en notice (Q5 = A) ; notice de l'ANSES non ajoutée, à relire à la main (Q6 = A).
- Ingestion en trois envois, un à la fois, chacun constaté en base par lecture seule avant le suivant : `WN-SRC-0760` à `0782`, lots `LOT_129` à `LOT_151`, 80 passages, 90 claims `EN_ATTENTE_VALIDATION`. Aucun claim étiqueté (D-325).
- Notices seules : `WN-SRC-0783` à `0823`. Rang du journal H15 : `07` du 2026-11-20.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` (64 notices, 795 au total) ; `docs/claude/corpus/README.md` (comptes et paragraphe) ; `docs/claude/plan-journal/H15/2026-11-20-07-ingestion-videos-et-besoin-7.md` ; `changelog.d/2026-11-20-videos-besoin-7-ingestion.md` ; ce handoff.
- Hors dépôt : spécifications, charges utiles et sorties des envois (bloc-notes de la session), jamais versées.

## Validations exécutées

- Avant chaque envoi : contrôle de construction (ancres retrouvées, empreintes, nombres des claims présents dans les passages cités, aucune durée ni dose en claim), zéro problème.
- Après chaque envoi : lecture seule en conteneur (une ligne active par passage et par claim, empreintes distinctes, aucun exclu de la recherche, aucun embedding manquant, liens claim-passage présents, plus grand identifiant et plus grand lot conformes).
- JSON du registre rechargé, aucun doublon d'identifiant. `check:rapide` non joué en local (worktree sans dépendances) : le CI en fait foi.

## Problèmes ouverts et prochaine action

- PDF à fournir par le responsable pour trois textes (`WN-SRC-0784`, `0802`, `0804`), puis ingestion.
- Notice de l'ANSES à relire à la main avant ajout (précautions, `D-415` §4, sans rattachement au besoin 7).
- Lire avec le texte : `WN-SRC-0762` (correction d'auteur non relue), `WN-SRC-0781` (publication corrigée), `WN-SRC-0802` (Department of Error).
- Validation des claims par le responsable, puis étiquetage (`D-325`). Enregistrer `WN-SRC-0799` et `0800` avant la signature de `D-415`.

## Interdits encore actifs

- Aucun texte de fiche, claim ou passage au dépôt public ; aucun code clinique, seuil ni `BESOIN_SOURCES` avant `J3-12f` ; production lue seulement par conteneur ; aucune ingestion sans accord par envoi ; toute écriture en production hors ingestion accordée : arrêt.
