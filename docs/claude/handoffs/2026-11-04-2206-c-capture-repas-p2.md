# Handoff — 2026-11-04 — File C, place 11 : la photo s'efface dès l'envoi (correctif P2, D-437)

## Branche et état Git

Branche `fix/h83-capture-repas-post-perdu`, dans le worktree
`.claude/worktrees/c-constat-capture-repas` (session concurrente, cycle en `git`/`gh`
direct, aucun `/wn-*`). Partie d'`origin/main` 137012d6, puis avancée en `--ff-only` sur
c5fa8304 quand le crochet de fraîcheur a bloqué l'écriture. Sans migration, sans
release-db : ni `schema.prisma`, ni `web/src/lib/clinical/**`.

## Objectif

Corriger, avant l'activation de la place 11, le P2 laissé ouvert par la revue de #1857.
Une journée écrite dont la réponse du POST se perd doit effacer la photo, même si la
relecture échoue, et sans renvoi automatique du POST (arbitrage du responsable du
2026-11-04, D-437 §3 et §5).

## Décisions prises

- Rayon 08 (D-435) hors porte 18 (arbitrage du responsable). C'est une recherche
  praticien, en file B ; D-288 §1 vise les surfaces patient. Son constat ne bloque pas
  la place 11.
- Effacement dès l'envoi, et non dans le `catch` : la clé de `CaptureRepas` porte un
  compte `envois`, incrémenté au début d'`enregistrer`. La photo se démonte donc, et son
  nettoyage existant (toile vidée et réduite à 0×0, pistes arrêtées) s'exécute, quelle
  que soit l'issue. Le cas d'une réponse qui n'arrive jamais est couvert aussi, ce qu'un
  effacement dans le `catch` n'aurait pas fait.
- Pas de rechargement dans le `catch` : il remonterait le formulaire et ferait perdre au
  patient sa saisie si la journée n'a pas été écrite. Le formulaire reste ; « Réessayer »
  reste le geste du patient. Le POST n'est jamais renvoyé de lui-même.
- `CaptureRepas.test.tsx` inscrit à `BANCS_BALAYAGE` (`scripts/wn-controle-fusion.mjs`).
  Son `readdirSync` (banc 1) rougissait le banc de parité de T1 depuis #1857.

## Fichiers modifiés

- `web/src/components/patient/agenda-alimentaire/AgendaAlimentaireJournal.tsx` (compte
  `envois`, clé de la photo)
- `web/src/components/patient/agenda-alimentaire/CaptureRepas.test.tsx` (trois bancs
  neufs dans le banc 4)
- `scripts/wn-controle-fusion.mjs` (`BANCS_BALAYAGE`)
- `changelog.d/2026-11-04-d437-photo-effacee-des-l-envoi.md`
- `docs/claude/plan-journal/H83/2026-11-04-03-photo-effacee-des-l-envoi.md`

## Validations exécutées

- Suites de l'agenda (`src/components/patient/agenda-alimentaire/`) : 5 fichiers,
  86 tests verts.
- Contre-épreuve : clé ramenée à `photo-${cibleDate}`, les bancs « réponse perdue » et
  « réponse qui n'arrive jamais » rougissent ; le banc « relecture en échec » reste vert,
  le rechargement le tenant déjà, et il demeure en garde de non-régression.
- T1 complet (`npm run check`) vert, après `prisma generate` dans le worktree neuf.
- T2 (`npm run test:worktree -- --fast`) : voir le corps de la PR.

## Problèmes ouverts

- Constat de D-437 §7 non fait. La requête en agrégats est prête hors dépôt, dans le
  scratchpad de la session : lecture seule, un dossier désigné par identifiant, journées
  écrites depuis le geste, nombre de prises, clés hors contrat, trace d'image.
- Une photo est désormais perdue aussi quand le serveur refuse la journée (date hors
  fenêtre, réponse manquante). Le formulaire, déjà rempli, reste ; c'est le prix de la
  garantie « disparaît dès que vous enregistrez ».

## Prochaine action exacte

1. CI par `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond, puis revue CodeRabbit,
   ou PR-Agent sur la tête (D-393 §2). Lire tous les commentaires, en ligne compris, puis
   déclarer « prête @<sha> », sans merger (essai D-373).
2. Après le merge et le déploiement constaté : le responsable pose
   `WN_PORTAIL_CAPTURE_REPAS=true` et redémarre web (porte 18). La session relit la
   valeur par `env-get` et vérifie le 401 du GET de l'agenda sans session.
3. Après le geste en ligne du responsable (galerie iOS et Android, ou appareil manquant
   noté) : requête du constat en conteneur détaché, puis PR de doc (journal H83, état du
   drapeau dans `docs/FEATURE_FLAGS.md`, handoff).

## Interdits encore actifs

- L'assistant ne pose aucun drapeau et ne redémarre rien (porte 18, D-437 §7).
- Aucune IA, aucune dictée, aucune photo transmise ni conservée ; aucun texte patient
  hors des deux textes de D-437 §5.
- Aucune migration. Production en lecture seule, par conteneur détaché, en agrégats ;
  jamais une fixture pour le constat ; aucun nom ni e-mail de dossier dans le dépôt.
- Aucun lien d'artefact dans ce dépôt public. Aucun merge par la file C (D-373).
