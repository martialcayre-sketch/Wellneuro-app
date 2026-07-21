# Rôles des machines et des sessions

Notice de coordination entre les deux postes de développement **et entre les
sessions d'assistant qui travaillent en parallèle**. À lire une fois sur chaque
machine ; les règles « dures » sont non négociables car leur violation produit
des échecs de test **erratiques et non reproductibles**, ou des pertes de
travail silencieuses.

## Une session = un worktree

**Deux sessions ne partagent jamais la même copie de travail.** Le 2026-07-20,
deux sessions travaillant dans le checkout principal ont produit, en une heure :

- un commit qui a happé le travail en cours de l'autre session, d'où une PR à
  deux périmètres (#154), fermée et refaite (#156) ;
- une branche créée par une session pendant que l'autre committait : le commit
  a atterri sur la mauvaise branche et le `push` a envoyé une branche vide
  (SP-TT, récupéré par cherry-pick en #158).

Rien n'a été perdu ces fois-là. La règle existe pour qu'il n'y ait pas de fois
suivante.

- Chaque session ouvre **son propre worktree** avant d'écrire quoi que ce soit.
  Sous Claude Code : l'outil `EnterWorktree` (worktrees créés dans
  `.claude/worktrees/`). En manuel : `git worktree add`.
- **Ne jamais faire `git checkout` ou `git switch` dans un worktree qu'une autre
  session utilise** — cela déplace son `HEAD` sous ses pieds.
- La validation est déjà prévue pour ce mode : `npm run test:worktree` dérive
  son port PostgreSQL et son port applicatif **du chemin du worktree**, avec
  sondage en cas d'occupation. Plusieurs worktrees valident donc en parallèle
  sans se contaminer (cf. l'en-tête de `scripts/wn-test-worktree.sh`).
- Le checkout principal reste sur `main`, à jour, et ne sert pas de plan de
  travail.

## Le risque concret, en une phrase

Les tests E2E lancés via `npm run test:e2e` réinitialisent le patient fictif
Michel Dogné (`PAT_SEED_03`) dans la base pointée par `DATABASE_URL`. Si les
deux machines partagent cette base — ce que suggère `docs/TRANSFERT_ENV_MAC.md`,
qui liste `DATABASE_URL` parmi les valeurs à transférer — **deux runs simultanés
s'effacent mutuellement leurs fixtures en plein vol**. Les échecs qui en
résultent ressemblent à de vraies régressions, mais n'en sont pas : on perd
alors du temps à chasser un bug qui n'existe pas.

## Répartition des rôles

| | **Mac** | **PC (Windows)** |
| --- | --- | --- |
| Statut | Poste principal | Appoint / secours |
| Rôle | **Validation et intégration** | **Édition et rédaction** |
| E2E Playwright **local** | **Exclusivité** | Interdit |
| Merge vers `main` | Oui | Oui, **via PR au CI vert** |

Cette répartition n'est pas une hiérarchie : c'est une **spécialisation**. Le PC
reste pleinement utile pour écrire du code, de la documentation, relire un diff
ou préparer une branche. Il ne porte simplement pas la responsabilité de dire
« c'est validé ».

## Ce que chaque machine peut lancer

| Commande | Mac | PC | Pourquoi |
| --- | --- | --- | --- |
| `npm test` (Vitest) | ✅ | ✅ | **Aucune base requise** — vérifié : 596 tests passent sans `DATABASE_URL` |
| `npm run type-check` | ✅ | ✅ | Analyse statique pure |
| `npm run lint` | ✅ | ✅ | Analyse statique pure |
| `bash scripts/check_no_secrets.sh` | ✅ | ✅ | Lecture de fichiers seule |
| `npm run test:worktree` | ✅ | ❌ | PostgreSQL **éphémère local** ; le script exige `/usr/lib/postgresql` + `apt-get` (Linux) ou Homebrew (macOS) — indisponible sur Windows natif |
| `npm run test:e2e` | ⚠️ | 🚫 | Utilise la **base partagée** — un seul run à la fois, toutes machines confondues |

Le 🚫 est la seule interdiction stricte de ce document.

## Garde-fous

1. **Les E2E sont l'exclusivité du Mac.** Ne jamais lancer `npm run test:e2e`
   depuis le PC tant qu'il partage la `DATABASE_URL` du Mac.
2. **Jamais deux runs E2E simultanés**, quelles que soient les machines et les
   copies du dépôt. Sur le Mac, `npm run test:worktree` fait exception : sa base
   est éphémère et ses ports sont dérivés du chemin du worktree, donc plusieurs
   worktrees peuvent valider **en parallèle** sans se contaminer.
3. **Le gardien de `main`, c'est le CI — pas la machine.** Le check `verify`
   (E2E compris) tourne sur les runners GitHub à chaque PR, avec sa propre base
   éphémère, quelle que soit la machine qui a poussé. Le PC peut donc merger une
   PR dont `verify` est vert. En revanche, **ne jamais pousser directement sur
   `main`** : `enforce_admins` étant désactivé, un push direct contourne le
   check et court-circuite les E2E. Toujours passer par une PR.
4. **`git pull` avant de commencer**, sur les deux machines. Un dépôt local en
   retard produit des conflits ou des merges parasites au moment de pousser.
5. **Ne jamais annoncer qu'une PR est prête sans avoir lu son CI**
   (`gh pr checks`) : une suite Vitest verte ne prouve rien sur les parcours.

## Protocole d'équipe

Le mode de travail nominal, quand les deux machines servent :

1. **PC** — écrire, corriger, documenter. Valider localement avec les trois
   commandes sûres : `type-check`, `npm test`, `lint`.
2. **PC** — committer et pousser la branche. Ouvrir la PR si besoin.
3. **Mac** — `git pull`, puis validation complète : `npm run test:worktree`
   (séquence rapide `-- --fast` : ~1 min 20 s, 26 tests E2E source inclus).
4. **Mac** — lire le CI (`gh pr checks`), puis merger.

Un seul principe à retenir : **le PC propose, le Mac valide vite.**

### Si le Mac n'est pas disponible

Le PC n'est jamais bloqué. La validation locale du Mac est un **accélérateur**
(~1 min 20 s au lieu d'un aller-retour CI de ~5 min), pas une autorisation.

1. **PC** — `type-check`, `npm test`, `lint`, puis pousser la branche.
2. **PC** — ouvrir la PR. Le CI GitHub lance `verify`, **E2E compris**, sur sa
   propre base éphémère : aucune interaction avec la base partagée, donc aucun
   risque de contamination.
3. **PC** — attendre le vert (`gh pr checks 〈n°〉 --watch`), puis merger.

C'est plus lent, pas moins sûr : la PR franchit exactement le même contrôle.
Le seul interdit reste le push direct sur `main`, qui contournerait ce contrôle.

## Lever la restriction du PC

Deux voies, si tu veux que le PC participe aussi aux E2E :

- **WSL2 + Debian** (recommandé) — `npm run test:worktree` y fonctionne
  nativement, avec sa base éphémère isolée. Le PC rejoint alors le pool de
  validation sans aucun risque de contamination, et le parallélisme redevient
  sûr.
- **Une `DATABASE_URL` distincte** pour le PC (base de dev séparée) — lève le
  conflit sur `npm run test:e2e`, mais ne donne pas l'isolation par worktree.

Vérifier si le conflit existe réellement, sur chaque machine :

```bash
grep DATABASE_URL web/.env.local
```

Même hôte des deux côtés ⇒ la règle 1 s'applique. Hôtes différents ⇒ le risque
de contamination disparaît.

## Pour référence

- Prérequis et options des tests E2E : `web/e2e/README.md`
- Séquence de validation locale : en-tête de `scripts/wn-test-worktree.sh`
- Setup des postes : `docs/CONTEXTE_VSCODE_PC_PARITE_CODESPACES.md`
- Transfert des variables d'environnement : `docs/TRANSFERT_ENV_MAC.md`
