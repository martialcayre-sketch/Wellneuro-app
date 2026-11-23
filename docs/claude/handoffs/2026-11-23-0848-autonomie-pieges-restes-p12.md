# Handoff — lot `autonomie-pieges-restes`, partie 12 : one-off Scalingo recyclé (2026-11-23)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie12`, tirée d'`origin/main` à e6e4ebcf (#2305, partie 11, mergée le
  2026-11-22 à 00:07Z). Elle vit dans le worktree `.claude/worktrees/orch-ci`. L'ancienne
  `chore/autonomie-pieges-partie11` est périmée et n'a pas été touchée.
- Le commit est fait tard, juste avant le push (D-518).
- Carnet : le lot `autonomie-pieges-restes` (ordre 35) reste pris par cette session. `branche` et `tenu_le` ont été
  mis à jour avec `if_version`, en version 41.
- Boîte D lue au démarrage : un seul message `emis`, le `merge_fait` de #2305, passé à « lu ». Rien de neuf
  d'autre.

## 2. Objectif

Convertir en contrôle le piège « one-off Scalingo recyclé » (mémoire du 2026-11-09, constat de #1947). Il a deux
causes :

- Scalingo recycle les numéros de one-off : `scalingo logs --filter one-off-N` peut rendre la sortie d'un ancien
  conteneur au même numéro.
- Le filtre est une expression régulière : `one-off-635` attrape `[one-off-6351]`.

## 3. Décisions prises

- **Le numéro n'identifie pas le conteneur ; l'identifiant hexadécimal, si.** Format relevé ce jour sur la
  production, lignes `[manager]` seules :
  - `… [manager] container [one-off-N] (<id hex>) started with the command '<cmd>'` ;
  - puis `… has stopped`.

  La même fenêtre de 3 000 lignes portait deux conteneurs `one-off-6587` le même matin : le piège est courant.
- **Lecteur `scripts/wn-one-off-logs.mjs`**, en lecture seule. Il ne lance rien : le lancement reste un
  `scalingo run -d "…"` visible des crochets (une sous-commande `lancer` aurait rendu la commande opaque aux gardes,
  et elle a été écartée pour cela).
  - `--depuis` est obligatoire : l'heure lue avant le lancement, ISO avec fuseau.
  - Il retient le seul démarrage du nom exact postérieur à `--depuis`, et rien en cas d'ambiguïté (code 4).
  - La fenêtre va jusqu'au prochain démarrage du nom sous un autre identifiant. Les lignes datées plus d'1 s après
    notre arrêt sont écartées et comptées.
  - Un arrêt de moins de 10 s rend le code 1 (`arret_recent`).
  - `--commande` exige en plus le texte lancé.
  - `--attendre` relit jusqu'à l'arrêt.
- **Refus dans `block-risky-commands.mjs`** plutôt que « demande ». La lecture sûre existe et le message la donne :
  même régime que les pièges des parties 2 et 6. La règle lit la commande masquée, sans mise en minuscules (`-F`
  filtre, `-f` suit), segment par segment. Une valeur citée ou portée par une variable est refusée, puisqu'on ne
  peut pas la lire.
- **`release-db.yml` n'est pas touché** : ses sentinelles sont liées au run (`id=<run>`), donc la sortie d'un ancien
  porteur du numéro n'y passe pas pour la sienne. Le toucher aurait aussi engagé un chemin gelé par la sonde.
- **Risque** : P1 (crochet de sécurité, outillage). Revue : `wn-reviewer`, puis PR-Agent → 0.
- **Revue `wn-reviewer`, première passe : NO-GO sur deux P1, corrigés.**
  - P1-1 : sous `--commande`, un réemploi postérieur du numéro par une autre commande ne bornait pas la fenêtre, et
    ses lignes partaient en code 0. Désormais, le prochain démarrage du nom, sous un autre identifiant, borne la
    fenêtre ; sans arrêt lu du nôtre, le résultat est « ambigu ».
  - P1-2 : `--filter="…"` passait (le masque met des espaces autour de `""`). Motif `(?:=\s*|\s+)`.
- **Verdicts sur ses P2** :
  - P2-1, ingestion : corrigé, un délai de grâce de 10 s après l'arrêt (état `arret_recent`, code 1) ;
  - P2-2, sortie datée avant le démarrage : corrigé, comptée et signalée, jamais rendue ;
  - P2-3, `--commande` : ajouté dans `wn-merge` et `RUNBOOK.md`, mais laissé facultatif ;
  - P2-4, préfixes `env`, `timeout N`, `then`, `{`… et valeurs-expressions (`off-3`) : corrigé. Une valeur est
    refusée dès qu'elle peut attraper `one-off-N`.
  - P2-5, `release-db.yml` cite encore `logs --filter $ONEOFF` dans ses messages : écarté. C'est un message de CI
    pour un humain, et la release est un chemin P0 gelé par la sonde : ne pas le toucher pour du cosmétique.
  - P2-6, échec de lecture muet (stderr ignoré) : accepté tel quel. L'issue est sûre (code 3), et stderr ne porte
    que l'avertissement de version.
- **Revue de l'écart : GO.** Verdicts sur ses P2 :
  - P2-1, lignes après l'arrêt (désordre à la frontière, démarrage étranger illisible) : corrigé. Au-delà d'1 s
    après l'arrêt, elles sont écartées et comptées. Un cas neuf tient aussi la borne haute, que cette tolérance
    rendait non couverte.
  - P2-2, `"$(…)"` avalé par le masque : épinglé en trou assumé, au banc et dans `hooks-garde-fous.md`.
    `timeout -s KILL`, `gtimeout` et `sudo` restent non épinglés, car improbables.
  - P2-3, horloge locale en retard : le message d'`arret_recent` la nomme.
  - P2-4, handoff périmé : corrigé (§3, §4).

## 4. Fichiers modifiés

- `scripts/wn-one-off-logs.mjs` et son banc `scripts/wn-one-off-logs.test.mjs` (neufs) ; le banc est inscrit à
  `bancs-outillage-check` (`web/package.json`).
- `.claude/hooks/block-risky-commands.mjs` (le refus) et `.claude/hooks/block-risky-commands.test.mjs` (24 refus,
  11 passages, 3 trous épinglés).
- `.claude/rules/hooks-garde-fous.md`, `.claude/rules/db-prisma.md`, `.claude/skills/wn-merge/SKILL.md`,
  `docs/RUNBOOK.md` : renvoi au lecteur.
- `changelog.d/2026-11-23-autonomie-pieges-partie12.md`, ce handoff.

## 5. Validations exécutées

- **Banc du lecteur** : 18 sur 18. **Banc du crochet** : 24 refus, 11 passages et 3 trous épinglés.
- **Mutations**, chacune rétablie ensuite :
  - `--depuis` ignoré : 6 cas rouges, dont celui du piège ;
  - nom lu par préfixe : 1 cas rouge, celui du voisin ;
  - identifiant ignoré : 2 cas rouges ;
  - `--commande` ignorée : 1 cas rouge.
  - Correctifs de la revue :
    - borne haute retirée : 1 cas rouge (celui du réemploi dans la seconde) ;
    - tolérance après l'arrêt retirée : 1 cas rouge ;
    - redémarrage sans arrêt toléré : 1 cas rouge ;
    - grâce retirée : 1 cas rouge ;
    - `=` du crochet remis : 3 cas rouges ;
    - préfixes retirés : 6 cas rouges ;
    - sous-chaînes de `one-off-` ignorées : 3 cas rouges.
- **Sur la production** (lecture de logs, aucune commande lancée), conteneur de purge de 08:21 :
  - `--depuis` 07:21Z avec la commande : code 0, 15 lignes, l'ancien porteur écarté ;
  - `--depuis` 07:30Z : code 2, rien rendu ;
  - autre commande : code 2, « numéro recyclé ? ».

  Seuls l'en-tête et les comptes ont été affichés.
- **Bancs des crochets** (`node --test .claude/hooks/*.test.mjs`) : 699 sur 699.
- **T1 complet** (`npm run check`) : vert (code 0), anti-secrets compris. T2 n'est pas joué : aucun E2E n'est
  concerné.

## 6. Problèmes ouverts

- Trous assumés du refus : une chaîne exécutée (`bash -c '…'`), une substitution entre guillemets doubles
  (`X="$(…)"`) et une option groupée (`-nF`). Le lecteur reste le chemin documenté.
- Les propositions archivées de la migration HDS (`docs/claude/propositions/2026-07-24-audit-migration-hds/`)
  citent encore `logs --filter one-off-N`. Ce sont des documents historiques, non réécrits.
- Toujours en suspens depuis la partie 11 :
  - deux dossiers temporaires `wn-repro-imp-*` sous `$TMPDIR`, à supprimer à la main ;
  - les commentaires de `dansLeDepot` dans `outillageBancs.guard.test.ts` et `cockpit.guard.test.ts`.
- Pièges encore à traiter dans le lot :
  - réservation WN-SRC ;
  - focus areas de PR-Agent ;
  - SESSION_LOG réordonné ;
  - sessions concurrentes ;
  - crochets de la copie principale en retard ;
  - `wn-attendre-ci` ;
  - statut « transféré » (décision requise) ;
  - lint « objet d'erreur brut ».
- Toujours à arbitrer par le responsable : les deux lots rangés « bloque » par les passes cloud du 2026-11-21 faute
  de droits (403). Reste à donner les droits à la routine, ou à la couper.

## 7. Prochaine action exacte

1. Verdicts sur la revue `wn-reviewer`, puis commit, push et PR (`--body-file`), puis `wn-attendre-ci` en fond.
2. PR-Agent → 0. Chaque remarque reçoit un verdict.
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`). Ensuite, plus aucune écriture sur la PR (D-546).
4. Ensuite, le piège suivant : « réservation WN-SRC ».

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Fixtures neutres seulement. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`. `release-db.yml` non touché.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune routine créée, rallumée ni lancée. `orchestrateur/arret` vaut `false` ; cette session n'y touche pas. La
  phase 3 (pilote) attend le feu vert du responsable.
- Ne pas déclarer la porte 24 levée. Aucune adresse de page privée dans le dépôt.
- Horodater en lisant l'heure système.
