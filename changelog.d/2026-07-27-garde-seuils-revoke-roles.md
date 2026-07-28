### `REVOKE ... FROM PUBLIC` ne révoquait rien (2026-07-27)

Constat fait **en base de production**, juste après le déploiement du garde de
seuils, en appliquant l'exception migration de `CLAUDE.md` — vérifier qu'une
migration a fait ce qu'elle annonçait. Elle ne l'avait pas fait.

Supabase pose des `ALTER DEFAULT PRIVILEGES` qui accordent `EXECUTE`
**nominativement** à `anon`, `authenticated` et `service_role` au moment du
`CREATE FUNCTION`. Le droit de `PUBLIC` est donc doublé par des grants
explicites, que révoquer `PUBLIC` ne touche pas. ACL constatée sur
`rag_claim_porte_seuil` :

```
postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres
```

là où le précédent du 2026-07-21 affiche `postgres | service_role`. La
différence : `20260721090000` révoquait **nommément** anon et authenticated ; la
migration du garde s'était arrêtée à `PUBLIC`, en affirmant tenir la règle.

**L'exposition est nulle en substance** — `rag_claim_porte_seuil` est une
fonction pure d'un argument texte, elle ne lit aucune table et rend un booléen.
Un appel anonyme ne dit rien d'autre que « cette chaîne ressemble-t-elle à une
borne ». Ce qui se corrige n'est pas une fuite : c'est l'écart entre ce qu'une
migration déclare et ce qu'elle fait, et une exception au principe de fermeture
par défaut qui se serait installée en silence.

Les deux `REVOKE` sont conditionnés à l'existence du rôle, comme
`20260721090000` : la base éphémère du CI n'a ni `anon` ni `authenticated`, la
migration y est inerte.

**Le banc reçoit l'assertion qui manquait** : aucun de ces deux rôles ne doit
pouvoir exécuter le garde. Conditionnelle elle aussi, donc vide en CI — mais
éprouvée : sur un PostgreSQL local où l'on crée `anon` et où on lui accorde
`EXECUTE`, le banc tombe avec « le rôle anon peut exécuter le garde », et
redevient vert une fois la migration de suivi rejouée.

La migration `20260727140000` n'est **pas** retouchée : elle est appliquée en
production, et Prisma valide le checksum de chaque migration appliquée — la
réécrire ferait échouer `migrate deploy` au prochain build.
