### La preuve visuelle du cockpit voit enfin la page entière (2026-09-04)

La baseline `fiche-cockpit` était capturée **en fenêtre visible** : elle ne
photographiait que les 1440×900 du haut. La campagne cockpit des 2-4 septembre a
restructuré le rail, les phases et l'intérieur des panneaux sans jamais faire
bouger cette image, et le CI est resté vert d'un bout à l'autre. Une preuve
visuelle qui ne voit que le premier écran ne prouve rien du cockpit. Elle passe
en page entière ; les deux baselines correspondantes sont retirées, périmées par
le changement de cadrage — le spec conditionne la comparaison à l'existence du
fichier, donc leur absence n'a jamais cassé `verify`, elle éteint seulement la
comparaison jusqu'à la prochaine génération.

Le tiroir des 12 besoins **reste** en fenêtre visible : c'est un `dialog` ancré
au viewport, dont la page entière ne dirait rien de plus.

`visual-baselines.yml` générait sous **Node 20** ce que `verify` relit sous
**Node 22**, depuis le 2026-08-05. Ce workflow n'existe pourtant que pour
produire les images « dans l'environnement de référence, celui du job verify » —
c'est écrit dans son en-tête, et c'était faux. Aligné, et l'invariant est
désormais gardé par `scripts/ci-invariants.test.mjs`, vu rouge par mutation.

**Faux positif corrigé dans la sentinelle posée le matin même.** Le cas « aucun
`changelog.d` hors de la racine » descendait dans `.claude/worktrees/`, où
chaque worktree est une copie complète du dépôt et porte donc légitimement le
sien. Il rougissait dès qu'une session parallèle ouvrait un worktree, bloquant
T1 pour une session qui n'y était pour rien. Le balayage s'arrête maintenant à
tout dépôt imbriqué, reconnu à son `.git`.

**Relevé, non corrigé, et ce sont des décisions d'affichage :** seuls **deux**
écrans sur neuf sont comparés au pixel, et `portail-connexion` est déclaré
comparable sans qu'aucune baseline n'existe — il n'est donc jamais comparé, en
silence. Les six autres portent `pixel: false` pour un motif vrai de certains
(textes dépendant du calendrier) et à revoir pour les autres.
