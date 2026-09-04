### `.next/types` périmé ne fait plus échouer le type-check (2026-09-04)

Next.js génère un fichier de types par route sous `.next/types`, mais ne retire
jamais celui d'une route **disparue**. Or `npm run type-check` tourne avant le
build — dans `npm run check` (T1) comme dans `wn-test-worktree.sh` (T2) : il
lisait donc les types d'un build antérieur, et `tsc` échouait sur un fichier
source qui n'existe plus.

Trois fois le 2026-09-04, dont deux sur une route appartenant à une session
parallèle. Chaque fois lu d'abord comme une régression du travail en cours, avec
les minutes que ça coûte.

Un crochet `pretype-check` purge désormais `.next/types` avant chaque
type-check. Il vit dans `web/package.json` pour couvrir T1 et T2 d'un seul
point, et le motif est écrit à l'étape correspondante de `wn-test-worktree.sh` —
un `package.json` ne porte pas de commentaire.

**Rien n'est perdu.** `next.config.mjs` ne désactive pas le type-check du build :
les types de routes restent vérifiés à l'étape « Build », plus bas dans la même
séquence. Vérifié en posant un fichier délibérément faux dans `.next/types` — il
aurait fait échouer `tsc`, le crochet l'a purgé.
