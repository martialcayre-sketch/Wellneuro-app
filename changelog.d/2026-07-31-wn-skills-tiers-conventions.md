### Deux skills pour ce que la suite `wn` ne savait pas faire : contrôler un contenu tiers, et s'auditer elle-même

Un audit du dépôt `ecosystem-brain` a servi de banc d'essai : sur ses quatorze
agents et son catalogue de 154, presque rien n'était transposable — mais deux
manques du côté WellNeuro, eux, étaient réels.

**`/wn-tiers` contrôle un contenu d'instructions IA avant activation** — skill,
agent, commande, hook, serveur MCP, prompt collé. Le dépôt en importe désormais
(skills Supabase liés, agents, contenus tiers évalués) sans qu'aucune passe ne
soit prévue pour ça.

Il reprend la liste de motifs qui marche vraiment — caractères de largeur nulle,
directive cachée dans un commentaire HTML, `curl … | bash`, lecture de `.env`,
`rm -rf` sur une racine — et corrige le défaut de l'outil dont il s'inspire :
**un fichier qui *nomme* un danger n'est pas un fichier qui l'*exécute***. Le
scanner d'origine, appliqué à ce dépôt, classe en critique `CLAUDE.md` (qui cite
`rm -rf /` en exemple) et `block-risky-commands.mjs` (qui contient les motifs
qu'il refuse) : un contrôle qui décide sur la seule présence du motif épingle en
premier les fichiers qui protègent. La position du motif tranche, pas sa
présence — et un motif écarté se dit, un faux positif tu étant indiscernable
d'un motif non cherché.

Il pose aussi la frontière que l'audit lui-même a franchie : **lire n'est pas
exécuter**. Le `selfcheck.py` d'un dépôt cloné trois minutes plus tôt a tourné
sur une machine qui porte `secrets/` et `web/.env.local`, au cours d'un audit
annoncé « en lecture seule ». Aucun script d'installation tiers ne se lance
avant qu'on ait lu ce qu'il écrit et où — une écriture dans `~/.claude/` touche
**toutes** les sessions, celle-ci comprise.

**`/wn-conventions` audite les fichiers de règles et les définitions d'agents.**
Son premier contrôle est celui qui rapporte : *qui lit ce fichier ?* `AGENTS.md`
n'était lu par personne — dernière modification le 2026-07-14, aucune mention
dans `CLAUDE.md`, une architecture d'avant le corpus RAG, la migration HDS et la
règle du worktree. Il portait pourtant **seul** trois règles de gouvernance du
scoring, désormais rapatriées dans `/wn-review` : mise à jour du mapping Drive,
fixture obligatoire pour un questionnaire `certifié`, métadonnée `certification`
dans `scoresJson`. Une règle vraie dans un fichier mort ne protège de rien.

Quatre skills existants gagnent une pièce manquante :

- **`/wn-debug`** — le test de non-régression doit **échouer avant** le
  correctif. Vert du premier coup, il ne prouve rien ; s'il passe avant, c'est
  l'hypothèse qui est fausse.
- **`/wn-test`** — un palier sauté se dit, il ne se compte pas comme vert. Le
  `selfcheck` tiers a rendu « all checks passed » sans exécuter un seul test,
  l'outil qui les lance étant absent : le succès annoncé mesurait l'absence de
  vérification.
- **`/wn-review`** — la passe sécurité liste ce qui se cherche dans les lignes
  ajoutées plutôt que de s'en remettre à la lecture, et la valeur d'un secret
  trouvé ne se recopie jamais.
- **`/wn-finish`** — deux promotions à chaque clôture : une règle oubliée deux
  fois devient un hook, une permission ou un test (le lint l'a montré) ; une
  décision structurante rejoint `docs/DECISIONS.md`, que l'on relit six mois
  plus tard, et non le journal de session.

Rien d'`ecosystem-brain` n'est copié : ni son bootstrap, qui remplace en bloc
les clés `hooks` et `permissions` du fichier global, ni son catalogue, ni sa
mémoire — qui porte encore les chemins Windows de la machine d'origine.
