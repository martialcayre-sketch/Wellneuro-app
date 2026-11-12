# Handoff — 2026-11-12 — D-505 : Codex appelé par la session

## Branche et état Git

- Branche `docs/codex-appele-par-la-session`, créée sur `origin/main` a84e5a69 puis avancée en `--ff-only`
  (28cbd3e0, puis 47070085), dans le worktree `.claude/worktrees/autonomie-registre-messages`.
- Session concurrente : `git` et `gh` en direct, pas de `/wn-*`. PR déclarée « prête » ; l'intégrateur merge.

## Objectif

Point 4 du cadrage « autonomie des sessions » : la session appelle Codex elle-même pour trois usages, sur la réponse
du responsable à la question `20261112-1702-g` (« Oui, pour les trois usages actuels »). Aucune donnée patient ni
secret envoyé ; ni clinique, ni migration, ni schéma ; aucune contrainte de plus pour le responsable.

## Décisions prises

- `D-505` réservée par `wn-reserver-decision.mjs` et rédigée. Elle amende la règle du 2026-08-21 (« Codex : geste
  manuel »). Les trois usages : contre-revue P0, avis à l'aveugle joint aux questions cliniques, accord sur une question
  ordinaire (périmètre borné, §6). Le skill personnel reste le repli (§7). Mise en service au merge (§8).
- Une seule voie d'appel, `scripts/wn-codex-avis.mjs`. La session écrit le paquet, jamais la commande. La commande
  fermée du cadrage est complétée par la coupure des outils (`--disable` × 21, `web_search="disabled"`) et un
  environnement réduit.
- `CODEX_HOME` reste le vrai : lier `auth.json` dans un dossier temporaire risquait de perdre un jeton renouvelé et de
  déconnecter Codex chez le responsable.
- La barrière est la coupure des outils. Le journal `--json` n'est qu'un second filet : l'essai adverse a montré
  qu'une tentative échouée n'y laisse pas de trace. Il en découle `--mode controle`, à rejouer à chaque nouvelle
  version du binaire.
- L'avis de Codex se joint à la ligne de question dans un champ `avis_codex`, texte ou objet. La page de suivi de la
  file D (v7) l'affiche sous les faits, avec « un avis, pas une décision ».

## Fichiers modifiés

- `docs/decisions/D-505.md` (nouveau) ; `scripts/wn-codex-avis.mjs` et `scripts/wn-codex-avis.test.mjs` (nouveaux) ;
  `web/package.json` (banc branché dans `bancs-outillage-check`).
- `CLAUDE.md` (§ Modèle, effort, exécution) ; `docs/claude/POLITIQUE_REVUE.md` (en-tête, barème, ligne BIO-PARCOURS,
  invocation) ; `docs/ROLES_MACHINES.md` (liste commune : « Avis de Codex », « Autorité »).
- `changelog.d/2026-11-12-d505-codex-appele-par-la-session.md` ;
  `docs/claude/plan-journal/H89/2026-11-12-03-codex-appele-par-la-session.md` ; ce handoff.
- Hors dépôt : mémoire `codex-revue-skill-personnel.md` révisée, avec son index ; page de suivi de la file D v7 (rendu
  de `avis_codex`, syntaxe vérifiée avant publication).

## Validations exécutées

- Banc `node --test scripts/wn-codex-avis.test.mjs` : 17/17. T1 (`check:rapide`) vert ; `npm run check` avant commit.
- Essai à blanc avec `codex-cli 0.167.0-alpha.4.1` et `gpt-6.1-sol`, sans aucune donnée sensible :
  1. Question de nommage : avis conforme en 14 s (raisonnement et message seuls, dossier vide intact).
  2. Inventaire des outils, avant puis après coupures : shell, fichiers, web, navigateur et image absents ; `goals`
     et `sleep` retirés ensuite. Restent `exec` (échec fermé), la collaboration (aucun drapeau ne la coupe) et la
     demande de saisie.
  3. Lecture adverse de `/etc/hosts` sans consigne : rien d'obtenu. Le sous-agent échoue sous `--ephemeral`.
     `--mode controle` → `0`.
  4. Filtre : paquet piégé (e-mail réel, recommandation) refusé en `2`, rien n'est parti.
- Premier appel bloqué par la limite d'usage de l'abonnement (jusqu'à 21 h 08) : classé `4`, indisponible.

## Problèmes ouverts

- La collaboration (sous-agents) reste exposée. Elle échoue sous `--ephemeral`, mais une version future pourrait la
  rendre utilisable : c'est l'objet de `--mode controle`.
- `gate-codex-p0` lit toujours le mot « codex » dans un fragment ou un commit, inchangé (hors périmètre de `D-505`).
- La question `20261112-1702-g` passe à `close` au merge (intégrateur).

## Prochaine action exacte

1. CI de la tête, revue PR-Agent prouvée (`wn-revue-pr-agent.mjs` = 0), sinon `wn-reviewer`.
2. Relire la boîte `autonomie des sessions` du registre, écrire la ligne `prete` à l'intégrateur, puis le commentaire
   « prête @<sha> — question 20261112-1702-g ».
3. Lot suivant à rappeler au responsable : le carnet de lots (points 1 et 2 du cadrage).

## Interdits encore actifs

- Aucun appel de Codex hors de `wn-codex-avis.mjs`. Jamais sans `--ignore-user-config`. Jamais de donnée patient, de
  secret, de contenu de production ni de pièce privée dans un paquet.
- Un avis de Codex n'est jamais une réponse clinique ou de migration.
- Pas d'appel de Codex sans session (répondeur de nuit) : hors `D-505`.
- Ni migration, ni schéma, ni clinique dans ce lot.
