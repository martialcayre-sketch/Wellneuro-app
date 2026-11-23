# Handoff — BP-27 : rattachement des claims fait, zinc choisi (2026-11-23)

## Branche et état Git

- Branche `docs/bp27-zinc-premier-marqueur` du worktree
  `b-besoin4-decision-guide`, tirée d'`origin/main` (`e6e4ebcf`) le
  2026-11-23. PR de documentation seule.
- La branche précédente, `docs/file-b-2026-11-20`, a été mergée par #2294
  (squash `85ea2501`).

## Objectif

Lot `bp27-cadrage` (file B, toujours « pris »). Deux étapes de `D-544` §8 sont
consignées :
- l'étape 1, le rattachement des claims aux quatre marqueurs ;
- le choix du premier marqueur par le responsable, au début de l'étape 2.

## Décisions prises

- Question `20261123-0838-b` (clinique) : le responsable a choisi le **zinc
  plasmatique**, usage « statut en zinc à examiner » (`HYP_ZINC_1`), plafonné
  à « information contributive ». Il a répondu en session (« go pour le
  zinc ») après les avis de Codex et de Fable. Le choix ne signe aucun claim
  et n'écrit pas la décision du marqueur (`D-266` §10).
- Les pièces sont dans deux dépôts privés, et aucune n'est dans ce dépôt
  public :
  - le dossier de rattachement, dans `wellneuro-artefacts`, à
    `05-biologie/4-evaluateur-signe/01-bp27-rattachement-des-claims/` ;
  - les avis, dans `wellneuro-revues`, à `bp27-cadrage-2026-11-21/`.

## Fichiers modifiés

- `docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md` (ligne BP-27)
- `docs/claude/plan-journal/F27/2026-11-23-01-rattachement-et-zinc-premier-marqueur.md`
- `changelog.d/2026-11-23-bp27-zinc-premier-marqueur.md`
- ce handoff

## Validations exécutées

- `node scripts/wn-campaign-audit.mjs`, `cd web && npm run check:rapide`
  et `bash scripts/check_no_secrets.sh` : résultats dans la PR.
- Lecture de la production : deux conteneurs `scalingo run -d` le
  2026-11-21 (one-off 122 et 724), en transaction `READ ONLY`, sans aucune
  écriture.
- Avis de Codex, tous au code 0 : quatre au premier passage, un sur la
  question reposée.

## Problèmes ouverts

- Pour le zinc, avant la décision du marqueur, il reste :
  - les recherches R5 (moment de prélèvement de référence) et R6 (délai
    après une supplémentation), aucune ingestion sans l'accord du
    responsable pour chaque envoi ;
  - l'arbitrage A2 : le catabolisme n'a pas de champ dans `D-497`. Codex et
    Fable proposent tous deux un amendement de `D-497` ;
  - la lecture du sexe et de l'âge pour le contrôle de population. Codex et
    Fable proposent un amendement de `D-544` §4. Fable rappelle que
    `D-497` §3 refuse de recopier ces données ;
  - le texte validé des fiches d'usage du zinc, préalable du lot de code
    (réponse `20261120-2257-b`). Au 2026-11-20, aucune des huit n'en avait.
- A1 (discordance sur la vitamine D) n'est pas urgent.
- Signalés, non tranchés :
  - J3-12f est attribué à la file A dans le plan, et à la file B par
    `20261118-2130-b` ;
  - les renvois du plan par numéro de ligne vers `CAMPAGNE.md` sont
    périmés ;
  - la page de suivi BioFlow est à mettre à jour par le responsable.

## Prochaine action exacte

Ouvrir la PR, attendre le CI et PR-Agent, donner un verdict à chaque
commentaire, puis déclarer la PR prête à l'intégrateur et clore
`20261123-0838-b` à son merge. Ensuite, avec l'accord du responsable : A2,
puis la question de population, puis R5 et R6.

## Interdits encore actifs

- Aucune signature clinique à la place du responsable, et aucun avis collé
  pris pour son accord.
- Rien n'est écrit en production hors de la route d'ingestion autorisée.
  Aucune ingestion sans l'accord du responsable pour chaque envoi.
- Forme opaque dans ce dépôt public (`D-251` §4) : ni texte de claim, ni
  valeur, ni seuil, ni borne.
- Aucun code clinique hors d'un lot désigné. Ne pas toucher au worktree
  `file-d1-suite`. Aucun autre lot de la file B sans l'accord du
  responsable.
