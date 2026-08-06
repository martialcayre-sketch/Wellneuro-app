### Import des skills tiers frontend-design et theme-factory (anthropics/skills) (2026-08-06)

`frontend-design` (direction visuelle délibérée — palette, typographie, mise en
page — pour une UI qui ne ressemble pas à un gabarit d'IA) et `theme-factory`
(10 thèmes prêts pour styler artifacts et maquettes) entrent dans
`.claude/skills/`, copiés depuis `anthropics/skills` épinglé au commit audité
`b29e7cf65e5cb78a5ac33d582270551bc74a14eb` (audit `/wn-tiers` du 2026-08-06,
verdict ACTIVER). Zéro code exécutable, zéro outil déclaré ; licences
Apache 2.0 conservées dans chaque dossier. Les deux réserves du verdict sont
appliquées : import par copie des deux répertoires seulement — jamais par le
plugin `example-skills` de la marketplace, qui embarquerait dix skills non
audités — et re-contrôle de `theme-showcase.pdf` à toute mise à jour (le
SKILL.md ordonne d'afficher ce binaire ; couche texte et clés d'action
vérifiées saines à ce commit). La grille `wn-route` gagne deux lignes vers ces
skills.
