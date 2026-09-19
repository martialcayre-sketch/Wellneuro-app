### Le corps de revue entre dans le résumé lu à chaque merge, et relancer un vieux run devient une faute nommée (2026-09-18)

Deux lignes en suspens depuis le 2026-09-17, posées sur arbitrage du responsable
du 2026-09-18. Toutes deux dans `docs/claude/REGLES_PR_MERGE.md`, qui porte
« Attendre le CI » et le renvoi vers les règles de revue.

**Le troisième emplacement d'un constat de revue était hors du résumé.** Le
détail est écrit depuis le 2026-09-16 dans `.claude/rules/pr-revue-et-release-db.md`
§1.1, et ce fichier n'est pas hors de portée : il est armé par chemin sur
`.github/**` et `web/prisma/**`, **et `/wn-merge` le lit en entier** (`SKILL.md:13`),
quels que soient les fichiers de la PR. Ce qui manquait est plus étroit et se
voyait au résumé : le bloc « à lire avec ce document » ne nommait que les
commentaires **en ligne**. Un lecteur qui s'arrêtait là apprenait à chercher dans
`pulls/<N>/comments` — et concluait « aucun constat » quand l'endpoint rend `[]`
alors que le constat est dans le **corps** de la revue, bloc « Suppressed
comments ». Le résumé nomme désormais les trois emplacements, `.reviews[].body`
compris.

**Relancer un run qui n'est pas celui de la tête peut annuler celui qui garde le
merge.** Hors `main`, `ci.yml` range tous les runs d'une branche dans un seul
groupe de concurrence avec `cancel-in-progress` (lignes 21-23) : la condition
`github.ref == 'refs/heads/main'` n'ajoute `run_id` au groupe que sur `main`,
donc une branche de PR n'en a qu'un pour toute sa vie. Relancer un run périmé y
fait entrer un run neuf, qui évince celui du commit de tête **s'il est encore en
attente ou en cours** ; la PR n'a plus de vert, `wn-attendre-ci` sort en `2`, et
l'attente recommence. La condition a été relevée en revue et elle est exacte —
un run déjà conclu ne s'annule pas —, mais elle ne protège de rien : la fenêtre
où le run de tête est encore en cours est exactement celle où l'on est tenté de
relancer autre chose pour occuper l'attente. Constaté le 2026-09-17. La section
« Attendre le CI » décrivait déjà le run `CANCELLED` comme une conséquence à
subir ; elle dit maintenant le geste qui la provoque, sous quelle condition, et
que le bras témoin se lance **avant** de pousser la suite.

Aucun banc ajouté : ces deux règles portent sur un geste d'opérateur, pas sur du
code. Le pendant plus strict des rouges WebKit du CI, qui ne se relancent jamais
du tout, reste celui de `D-155`.
