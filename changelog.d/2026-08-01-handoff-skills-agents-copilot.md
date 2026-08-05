### Deux skills de reprise cessent d'écrire le même fichier ; les agents Copilot apprennent les paliers, et Fable 5 devient atteignable

**Un doublon n'est pas deux noms pour la même chose — c'est deux chemins vers la
même écriture.** `/wn-context` et `/wn-handoff` lançaient la même commande et
écrivaient tous deux `docs/claude/HANDOFF_CURRENT.md` : leur seule différence
tenait dans la consigne de sortie, que rien ne rendait opposable. Le dernier
appelé gagnait. Ils sont désormais distincts par ce qu'ils produisent :
`/wn-context` **affiche** l'état factuel et n'écrit plus rien ; `/wn-handoff`
est **seul** à écrire le document de reprise, et sa valeur est précisément ce
qu'aucun script ne sait produire — les décisions et leur raison, les interdits
encore actifs, la prochaine action exacte. Les deux tables qui les citaient de
front (`/wn-route`, `/wn`) le disent maintenant.

**Cinq agents Copilot posés en un commit d'installation, jamais relus depuis.**
Ils étaient cohérents, mais ignoraient trois règles que le dépôt paie cher
quand elles manquent : `Implementer` disait « exécute les tests minimaux » là où
le dépôt a trois paliers nommés — T1 après chaque édition, T2 avant toute UI ou
API, T3 sur migration ou clinique ; aucun ne connaissait le fragment
`changelog.d/`, dont l'absence a fait échouer cinq merges le 2026-07-21 ; et
`Reviewer`, à qui la doctrine confie la revue, ne cherchait que des lignes
fautives. Il cherche désormais aussi **ce que le diff ne fait pas** — la classe
de défaut de la PR #202, où un backfill absent défaisait silencieusement une
révocation d'accès sans qu'aucune ligne ne soit à pointer — et vérifie que le
check `verify` a réellement tourné, les checks Vercel au vert ne valant pas
vérification. `Debugger` et `Planner` sont inchangés : rien à leur reprocher.

**Un modèle décrit n'est pas un modèle routable.** Claude Fable 5 figurait dans
`/wn-model`, `/wn-route` et l'agent `wn-fable`, mais aucune grille de classement
ne pouvait le choisir : il ne s'atteignait que si l'utilisateur le nommait. Il
entre dans la grille contexte→modèle de `/wn-route` et dans le tableau des
classes de `/wn-lot`, avec le seul critère qui le justifie — la durée et
l'étendue de la tâche, pas le type de fichiers — et son prix affiché, $10/$50
par MTok, deux fois Opus. `CLAUDE.md` n'en dit rien volontairement : sa propre
règle d'économie s'applique à lui-même, un token posé là étant relu à chaque
tour de chaque session, alors qu'une grille se charge à la demande.

Deux hypothèses de départ étaient fausses et n'ont donné lieu à aucune édition :
`AGENTS.md` n'est pas orphelin — réparé en #502 — et le tarif Fable 5 affiché
était exact, vérifié à la source plutôt que recopié une troisième fois.
