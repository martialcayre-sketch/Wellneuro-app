### Cockpit : le nom s'écrit « Wellneuro » au menu (R:Graphie, H03, 2026-10-14)

Lot de file A du plan unique (fiche H03, rang 0), arbitrage du responsable du
2026-10-12 : seul le menu du cockpit change, le patient ne voit rien changer.
Une ligne du rail (`components/ui/SidebarRail.tsx`) : « WellNeuro » devient
« Wellneuro ». Aucune décision, aucune migration, aucun drapeau, aucune
règle clinique. Les commentaires qui citent le nom de la maquette
« WellNeuro 5.0 — La Spirale » restent tels quels : c'est le titre d'une
pièce, pas le menu.

Instantanés visuels (Linux, CI) : la tolérance est de 100 pixels ; si la
comparaison rougit, les bases se régénèrent par le workflow manuel
`visual-baselines` et se committent dans ce lot.
