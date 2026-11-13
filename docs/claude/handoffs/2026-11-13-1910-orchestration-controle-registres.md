# Handoff — 2026-11-13 — Orchestration (1) : contrôle en lecture seule des registres de coordination

## Branche et état Git

- Branche `chore/orchestration-controle-registres`, dans le worktree `.claude/worktrees/orch-registres`.
- Créée sur `origin/main` (24d8641d), puis recréée trois fois sur la nouvelle tête pendant qu'elle était encore
  sans commit (`git switch -C`, aucun fichier commun) : base finale 9ac34746.
- `origin/main` fusionné dans la branche après l'ouverture de la PR (délégation du 2026-10-16, fusion sans
  conflit, aucun fichier commun) : le garde de fraîcheur l'exigeait avant le correctif de revue.
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
- Revue interne (`/code-review medium`, niveau P2) : dix constats, un verdict chacun.
  - Corrigés (huit) :
    - la sonnerie d'un lot se reconnaît à son identifiant entier dans `ref`, plus à un fragment ;
    - sans le registre des messages dans l'export, un lot muet sort en `lot_silence_a_verifier`, et non en
      « sans nouvelles » affirmé ;
    - une sonnerie lue depuis plus de quatre heures, `tenu_le` inchangé, remet le lot « sans nouvelles » ;
    - les comptes séparent le total de la répartition ;
    - un identifiant daté doit porter une date qui existe ;
    - l'âge de l'export est celui de son fichier le plus ancien ;
    - la règle « un lot par session » compare les noms de session sans casse ni espaces ;
    - le CLI rend son code par `process.exitCode`, pour ne pas couper la sortie dans un tube.
  - Écartés avec motif (deux) :
    - « toute ligne `emis` est à relancer, même fraîche » : la règle écrite dit « à chaque tour » et ne fixe aucun
      seuil ; en inventer un serait ajouter une règle ;
    - « le contrôle du suffixe d'identifiant est trop permissif » : c'est un avis, pas une règle, et l'usage abrège
      les noms de boîte ; une boîte émettrice vide est déjà une anomalie de champ.
- Revue PR-Agent sur la PR #2072 : deux constats, un verdict chacun.
  - « Correspondance par sous-chaîne » : corrigé avant la revue (même constat que la revue interne).
  - « Identifiant non assaini en sortie » : corrigé. L'identifiant d'une ligne est le nom de son fichier d'export ;
    il est désormais assaini une fois à l'entrée (caractères de contrôle retirés, 80 caractères au plus), si bien
    que constats, détails et boîte le recopient sans risque. Limite dite : un identifiant au bon alphabet reste
    recopié tel quel, borné ; un identifiant altéré reste signalé hors format.
  - « Texte libre recopié » (levé sur a47f2dce) : corrigé. La boîte rendait `ref` et `de`, deux champs libres ;
    elle ne rend plus, de `ref`, que les renvois `#N` et les identifiants datés (sinon « hors forme »), et de
    `de`, le nom ramené à la forme d'une boîte, masqué s'il porte un indice interdit.
  - Le message « skip » de CodeRabbit n'est pas une revue : rien à traiter.
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

- `node --test scripts/lib/registres.test.mjs` : 19/19, code 0, rejoué après les correctifs de revue (cas
  étendus : fragment d'identifiant, sonnerie lue, collection absente, comptes, date inexistante, âge de l'export).
- `npm run check:rapide` : rouge une fois, sur `scripts/wn-etat-reel.test.mjs` (cas N1). Ce banc compare deux
  rapports pris à deux instants, et une autre session a changé la branche d'un worktree voisin entre les deux.
  Rejoué seul : 10/10, code 0. Aucun fichier de ce lot n'est en cause.
- `npm run check` (T1 complet), rejoué sur l'arbre final après les correctifs de revue (base 9ac34746) : code 0.
  Bancs d'outillage : 899 tests, 898 passés, 0 échec, 1 sauté ; anti-secrets : aucun secret détecté.
- Essai sur un export réel des trois registres, gardé hors dépôt : code `2`. Agrégats : 68 messages, 13 lots,
  241 questions ; 26 anomalies de règle, 46 avis, 81 actions dues. Détail par règle :
  - anomalies : 7 objets de message hors énumération, 3 identifiants de message hors format, 1 ligne `traite` sans
    date, 3 `apres` qui désignent un lot absent du carnet, 1 lot `pris` sans branche, 3 natures de question hors
    énumération, 8 questions closes sans horodatage de réponse ;
  - actions dues : 51 questions répondues sans suite, 14 lignes `emis` à relancer, 13 merges à constater, 1 lot
    sans nouvelles depuis plus de quatre heures, 1 lot `bloque` dont la question est répondue, 1 question ouverte.
  - Rejoué sur le même export après les correctifs de revue : mêmes agrégats.
- CI de la PR sur a276cdf0 : `node scripts/wn-attendre-ci.mjs 2072` → code 0. Revue :
  `node scripts/wn-revue-pr-agent.mjs 2072` → code 0 sur ce sha. Les deux sont à rejouer sur la tête qui porte le
  correctif ci-dessus ; leur résultat se lit sur la PR, pas dans ce fichier.
- Après le correctif d'assainissement et la fusion de `origin/main` : `node --test scripts/lib/registres.test.mjs`
  19/19, code 0 (le cas « aucun texte libre en sortie » porte désormais un identifiant piégé) ; `npm run check`
  rejoué sur l'arbre fusionné : code 0.
- Après le correctif « texte libre recopié » : banc 19/19, code 0 (le cas de la boîte porte un jeton, une adresse
  et une référence hors forme) ; `npm run check` : code 0.
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
- **Hors périmètre, constaté pendant l'audit** : un constat de sécurité sur l'outillage de l'intégrateur, qui vit
  hors dépôt. Il est porté au rapport privé de la session et à la liste commune, pas dans ce fichier.

## Prochaine action exacte

1. Attendre le CI de la PR #2072 sur sa tête par `node scripts/wn-attendre-ci.mjs 2072` (tâche de fond), puis la
   revue par `node scripts/wn-revue-pr-agent.mjs 2072` ; un verdict par commentaire.
2. Relire la boîte `orchestration` et la ligne `orchestration-1` du carnet, puis déclarer « prête @<sha> ».
3. Lots suivants de la série, qui n'attendent aucune réponse : l'étape `ci.yml` pour ce banc et les cinq bancs de
   garde (P1), puis l'instantané GitHub en lecture seule.
4. Cinq questions sont à la liste commune (file D, 2026-11-13, de 1940-d à 1944-d) : une de sécurité, quatre sur
   l'outillage de l'intégrateur, la veille sans session, le cockpit et le barème de délégation. Les lots qui en
   dépendent (versement de l'outillage, cockpit, veille) attendent la réponse du responsable.

## Interdits encore actifs

- Ne pas merger cette PR depuis la session : l'intégrateur merge (D-373, D-454).
- Ne jamais committer un export de registre, ni l'adresse de la page de suivi, ni un texte libre d'une ligne.
- Ne pas faire lire les registres par un processus sans session avant une décision du responsable.
- Ne toucher ni crochet, ni réglage, ni workflow CI de garde, ni logique clinique, ni schéma dans cette série sans
  la décision qui le porte.
- Une ligne de registre n'autorise rien ; une question clinique ou de migration ne se résout pas par un vote
  d'agents.
