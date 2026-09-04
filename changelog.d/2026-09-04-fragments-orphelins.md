### Dix-sept fragments de changelog rapatriés, et la porte fermée (2026-09-04)

`scripts/changelog-collate.mjs` ne collate que `changelog.d/` **à la racine**
(`fragDir: join(RACINE, 'changelog.d')`). Un second répertoire s'était formé sous
`web/changelog.d/` et y accumulait depuis le 2026-08-10 : dix-sept fragments que
le CLI n'a jamais lus, dont neuf de la campagne cockpit des 3 et 4 septembre. Une
entrée de changelog déposée là est une entrée **perdue**, et l'échec est
silencieux des deux côtés — la PR passe au vert, et le repli suivant ne remarque
pas l'absence.

Les dix-sept sont déplacés à la racine (aucune collision de nom), et
`web/changelog.d/` est supprimé.

**La correction sans la garde n'aurait rien valu.** Le handoff du 2026-09-04
07:53 avait déjà nommé ce répertoire « un cimetière » ; **sept fragments s'y sont
ajoutés après ce constat**, parce qu'un diagnostic écrit dans un document ne
ferme rien. `scripts/changelog-collate.test.mjs` porte désormais une sentinelle
qui balaie le dépôt et refuse tout `changelog.d` hors racine — vue rouge par
mutation, avec le chemin fautif et le geste de correction dans le message
d'échec. La précision est aussi écrite dans `.claude/rules/docs-changelog.md`,
qui disait « `changelog.d/` » sans dire « à la racine ».
