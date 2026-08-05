### Campagne de clôture des dettes Wellneuro 5.0, cadrée sur un audit challengé (2026-08-05)

Cadrage d'une campagne en huit lots pour fermer les dettes qui empêchent de déclarer
5.0 achevé. Aucun code applicatif : documents de campagne seuls.

L'audit d'entrée a été confronté au dépôt avant d'être transformé en lots, et trois
de ses points ont bougé. Le plus lourd inverse une priorité : le workflow
`release-db` est **déjà sur `main`** depuis #517 ; la PR #435 ne le crée pas, elle
retire les écritures de `web/scripts/vercel-build.sh`. Deux chemins d'écriture vers
la base de production coexistent donc aujourd'hui, dont un non gaté — attendre pour
merger #435 n'est pas prudent, c'est maintenir le défaut. Le blocage est ops
(environnement GitHub `production`, secrets, reviewers distincts), pas du code.

Deux autres corrections : le gate HDS G-TRUST-04 n'est pas en attente mais
**arbitré** le 2026-07-22 (phase de test bornée au 2026-10-21), ce qui en fait une
échéance datée plutôt qu'une dette de 5.0 ; et l'écart certification-du-calcul /
validation-psychométrique est déjà nommé par #560, il reste à le solder. Angle mort
de l'audit : la PR #372, ouverte depuis le 2026-07-25 et non mentionnée.

Ordre retenu : fermer le chemin d'écriture faible (LOT-00), puis rendre l'état réel
généré depuis le code plutôt que maintenu à la main (LOT-01) — sans quoi chaque lot
suivant rouvre le débat sur ce qui est vrai.
