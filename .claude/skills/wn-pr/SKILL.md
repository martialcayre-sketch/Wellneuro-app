---
description: Prépare une branche, un commit et une description de PR WellNeuro à partir du diff. Aucun push ni création de PR sans argument `apply`.
argument-hint: "[apply] [titre]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — préparation de PR

!`cd "$(git rev-parse --show-toplevel)" && git status --short --untracked-files=all`
!`git diff --stat`
!`git log -n 5 --oneline`
!`cd "$(git rev-parse --show-toplevel)" && node scripts/wn-cycle.mjs 2>&1 || true`

Arguments : `$ARGUMENTS`

Toujours :

- vérifier que le diff appartient à une seule finalité ;
- rappeler les tests déjà exécutés sur le diff courant plutôt que les
  rejouer ; n'exécuter que ce qui n'a pas tourné depuis la dernière
  modification du diff ;
- proposer un titre conventionnel ;
- rédiger résumé, périmètre, validations, risques et test manuel ;
- exclure secrets et données patient réelles.

Sans `apply` : ne créer ni branche, ni commit, ni push, ni PR.

Avec `apply` : branche et commit locaux autorisés. Le push, la création ou le merge d’une PR nécessitent encore une demande explicite claire.

**La clôture est opposable, dès l'ouverture.** Le verdict de cycle chargé
ci-dessus (`fait ✓/✗`) dit si `docs/claude/SESSION_LOG.md` et un fragment
`docs/claude/handoffs/` sont dans le diff. L'un des deux manque → ne pas ouvrir
la PR : `/wn-finish` puis `/wn-handoff write` d'abord, la PR ensuite. Ouvrir <!-- mention-seule: wn-finish, wn-handoff -->
sans la clôture, c'est fabriquer la « fenêtre ratée » que `/wn-merge` refusera — <!-- mention-seule: wn-merge -->
le squash fermera la fenêtre et coûtera une seconde PR de doc depuis `main`.
(La PR de rattrapage d'une fenêtre déjà ratée porte la clôture par construction
et passe donc ce contrôle.)

**Modèle selon le diff.** Si les fichiers du diff relèvent d'une classe à
risque (scoring/clinique, Prisma/migration, auth), la section « risques » se
rédige au niveau d'effort de la revue — mais **sans relancer un agent quand la
revue a déjà eu lieu** : des constats `wn-reviewer` du diff courant présents
dans la conversation se distillent (la PR #659 l'a fait — sa section
« Risques » reprend les trois passes, aucun agent relancé). Ne lancer
`Agent(subagent_type: "wn-reviewer")` — agent épinglé Opus/high — que si
aucune revue du diff courant n'existe : la description d'une PR de migration
mérite le même effort que sa revue, pas une seconde revue.

## L'attente CI appartient à `/wn-merge`, pas à ce skill <!-- mention-seule: wn-merge -->

Ce skill **ouvre** la PR et s'arrête là. Ne pas lancer `wn-attendre-ci` ici :
la lecture du CI, le régime de merge courant, l'exception migration/auth, le
merge et le nettoyage sont du ressort de `/wn-merge` — qui fait cette attente <!-- mention-seule: wn-merge -->
en un seul appel (`node scripts/wn-attendre-ci.mjs <N>`) et dont **le code `0`
est le seul qui autorise à annoncer une PR prête**. Lancer l'attente deux fois
(ici puis dans le merge) coûtait ~4 appels `gh` pour rien.

Ne jamais enchaîner `gh pr checks` / `gh pr view` manuellement (81 appels de
sondage le 2026-07-20), ni revenir à la boucle `until … bucket=="pending"`
qu'un code `2` du script a remplacée (PR #550 : deux checks Vercel verts,
`verify` jamais créé). Codes et périmètre : `docs/claude/REGLES_PR_MERGE.md`.
Ne jamais annoncer une PR « prête » sur une suite Vitest verte : seul le CI
fait foi, et sa lecture appartient à `/wn-merge`. <!-- mention-seule: wn-merge -->

## Corps de PR

Rédiger le corps dans un fichier et le passer par `--body-file`. Le garde-fou
Bash inspecte la commande brute pour les motifs destructifs ; un corps de PR
long, cité en ligne, est une source inutile de collisions.
