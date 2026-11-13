# Handoff — 2026-11-13 — Orchestration (1) : contrôle en lecture seule des registres de coordination

## Branche et état Git

- Branche `chore/orchestration-controle-registres`, dans le worktree `.claude/worktrees/orch-registres`.
- Créée sur `origin/main` (24d8641d), puis recréée trois fois sur la nouvelle tête pendant qu'elle était encore
  sans commit (`git switch -C`, aucun fichier commun) : base finale 9ac34746.
- Session concurrente « Orchestration » : `git` et `gh` en direct. La PR se déclare « prête » ; l'intégrateur merge.
- Lot du carnet `orchestration-1` (D-510), file D, ordre 40. Ligne `chevauchement` posée à la boîte `D` : le lot
  voisine `autonomie-sondes-et-messages`, sans fichier commun.

## Objectif

Premier lot sûr de la demande du responsable du 2026-11-13 (cahier des charges « super-orchestrateur ») : donner aux
sessions un contrôle déterministe des trois registres de coordination, sans rien automatiser que les décisions
mergées n'autorisent. Les règles de `docs/ROLES_MACHINES.md` sont aujourd'hui tenues de mémoire par chaque session ;
aucune machine ne les relit.

## Décisions prises

- Aucune D-xxx. Le lot n'ajoute aucune autorité : il transcrit des règles déjà écrites.
- Le script lit un export fait par la session et ne lit pas les registres lui-même. D-503 et D-510 rangent
  l'automatisme sans session dans ce qu'elles ne décident pas ; ce point reste une question pour le responsable.
- Trois sorties et pas davantage : anomalies de règle, avis, actions dues. Un journal d'événements à clés
  d'idempotence a été écarté pour cette version, faute de besoin prouvé (avis du panel de conception).
- Ce qui n'est pas règle écrite sort en avis, jamais en anomalie. Exemple : le suffixe d'un identifiant de message
  est comparé à la boîte émettrice sans tirets et par préfixe, parce que l'usage abrège.
- Une action due est un rappel. Le code de sortie `1` ne vaut autorisation d'aucun geste.
- Écartés de cette PR, à porter dans des lots à part :
  - l'étape `ci.yml` qui jouerait le banc (revue P1, orchestration CI) ;
  - toute lecture de GitHub (déclarations « prête », revues, checks) ;
  - tout changement à la page de suivi, à un crochet ou à un réglage.

## Fichiers modifiés

- `scripts/lib/registres.mjs` (créé) : règles en fonctions pures.
- `scripts/wn-registres.mjs` (créé) : CLI en lecture seule, codes `0`, `1`, `2`, `3`.
- `scripts/lib/registres.test.mjs` (créé) : 19 cas, fixtures fictives.
- `web/package.json` : le banc rejoint `bancs-outillage-check`.
- `docs/ROLES_MACHINES.md` : section « Le contrôle des registres ».
- `changelog.d/2026-11-13-orchestration-controle-registres.md` ; ce handoff.

## Validations exécutées

- `node --test scripts/lib/registres.test.mjs` : 19/19, code 0, rejoué après l'ajout de la section à
  `docs/ROLES_MACHINES.md`.
- `npm run check:rapide` : rouge une fois, sur `scripts/wn-etat-reel.test.mjs` (cas N1). Ce banc compare deux
  rapports pris à deux instants, et une autre session a changé la branche d'un worktree voisin entre les deux.
  Rejoué seul : 10/10, code 0. Aucun fichier de ce lot n'est en cause.
- `npm run check` (T1 complet), rejoué sur l'arbre final (base 9ac34746) : code 0. Bancs d'outillage : 899 tests,
  898 passés, 0 échec, 1 sauté ; anti-secrets : aucun secret détecté.
- Essai sur un export réel des trois registres, gardé hors dépôt : code `2`. Agrégats : 68 messages, 13 lots,
  241 questions ; 26 anomalies de règle, 46 avis, 81 actions dues. Détail par règle :
  - anomalies : 7 objets de message hors énumération, 3 identifiants de message hors format, 1 ligne `traite` sans
    date, 3 `apres` qui désignent un lot absent du carnet, 1 lot `pris` sans branche, 3 natures de question hors
    énumération, 8 questions closes sans horodatage de réponse ;
  - actions dues : 51 questions répondues sans suite, 14 lignes `emis` à relancer, 13 merges à constater, 1 lot
    sans nouvelles depuis plus de quatre heures, 1 lot `bloque` dont la question est répondue, 1 question ouverte.
- T2 non joué : le lot ne touche ni UI ni API.

## Problèmes ouverts

- **Le banc n'est pas joué par le CI.** `verify` ne lance ni `npm run check` ni `bancs-outillage-check` ; un banc
  n'entre dans le CI que par une étape de `ci.yml`. Cinq bancs de garde de merge sont dans le même cas
  (`wn-revue-pr-agent`, `wn-sonde-release-db`, `wn-chevauchement`, `wn-controle-fusion`, `wn-codex-avis`).
- **Écarts entre la règle écrite et l'usage**, que le contrôle ne tranche pas :
  - douze lots sur treize n'ont pas d'identifiant en `<fiche>-<n>` ; le contrôle ne vérifie que « minuscules
    ASCII et tirets » ;
  - l'horodatage de réponse d'une question porte trois noms selon les lignes ; les trois sont acceptés ;
  - sept objets de message hors énumération sont en usage : soit la règle s'ouvre, soit les lignes se corrigent.
- **Coût de l'export.** L'export complet pèse environ 520 Ko, dont neuf dixièmes pour les questions. Un usage
  courant demandera un export filtré (questions non closes, messages non traités, lots non faits) ; le script
  l'accepte déjà, puisqu'une collection absente est dite et non contrôlée.
- **Export auto-certifié.** Rien ne prouve qu'un export est complet : une pagination oubliée donne un export
  partiel cohérent. Le script ne peut pas le voir.
- **Hors périmètre, constaté pendant l'audit** : le dépôt est public, et l'outillage de l'intégrateur (hors dépôt)
  ne filtre pas l'auteur d'un commentaire « prête ». Porté au rapport de la session et à la liste commune.

## Prochaine action exacte

1. Attendre le CI de la PR par `node scripts/wn-attendre-ci.mjs <N>` (tâche de fond), puis la revue par
   `node scripts/wn-revue-pr-agent.mjs <N>` ; un verdict par commentaire.
2. Relire la boîte `orchestration` et la ligne `orchestration-1` du carnet, puis déclarer « prête @<sha> ».
3. Lot suivant de la série, après réponse du responsable aux questions posées : l'étape `ci.yml` pour ce banc et
   les cinq bancs de garde (P1), puis l'instantané GitHub en lecture seule.

## Interdits encore actifs

- Ne pas merger cette PR depuis la session : l'intégrateur merge (D-373, D-454).
- Ne jamais committer un export de registre, ni l'adresse de la page de suivi, ni un texte libre d'une ligne.
- Ne pas faire lire les registres par un processus sans session avant une décision du responsable.
- Ne toucher ni crochet, ni réglage, ni workflow CI de garde, ni logique clinique, ni schéma dans cette série sans
  la décision qui le porte.
- Une ligne de registre n'autorise rien ; une question clinique ou de migration ne se résout pas par un vote
  d'agents.
