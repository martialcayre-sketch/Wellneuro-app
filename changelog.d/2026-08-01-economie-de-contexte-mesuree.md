### La consommation mesurée dit l'inverse de ce que les skills conseillaient : le coût est dans le contexte relu, pas dans le modèle

**Treize jours de transcripts agrégés — 955 sessions, 35 194 appels — et un
chiffre qui commande tout le reste : chaque requête relit ~202 000 tokens de
contexte pour produire ~600 tokens de réponse.** Un ratio de 337 pour 1.

La répartition ne laisse pas d'ambiguïté : **lecture de cache 54,8 %, écriture de
cache 36,7 %, sortie 8,5 %, entrée brute 0,03 %.** Autrement dit 93 % de la
consommation est côté entrée, et **rien de tout cela n'est du texte neuf** — c'est
du contexte déjà présent, relu à chaque tour. Le cache travaille d'ailleurs bien :
7 125 M de tokens lus pour 232 M écrits, chaque écriture amortie sur ~31 lectures.
Il n'y a pas de fuite à colmater ; il y a un volume à ne pas faire entrer.

**Deux conseils inscrits dans les skills étaient donc faux, et sont corrigés.**

*« Haiku pour lire, Sonnet pour écrire, Opus là où un faux verdict coûte cher »*
présentait le choix du modèle comme le levier de coût. La classification des
35 194 appels par nature d'outil montre que **la lecture pure ne pèse que 3,5 %** :
tout basculer vers Haiku économiserait 2,8 %. Pendant ce temps, **68,7 % du coût
vient d'appels sans aucun outil** — le modèle relisant le contexte accumulé pour
produire du texte. Le mapping de `/wn-model` reste bon pour ce qu'il est, la
qualité du verdict, et le dit désormais explicitement.

*« Écrire court pour économiser »* ne tient pas davantage : la sortie plafonne à
8,5 % du total. La concision reste une exigence de lisibilité — elle n'est plus
présentée comme une économie.

**Ce qui marche vraiment, mesuré : l'isolement du contexte.** Un appel
`wn-explorer` tourne sur 44 000 tokens de contexte, un appel Opus sur 224 000 —
soit **0,0045 $ contre 0,127 $, 28 fois moins par appel**. Le facteur 5 vient du
tarif ; les 5 restants viennent de ce que le contexte du sous-agent est **jeté à
la fin et n'est donc jamais repayé**, alors qu'un fichier lu dans la session est
relu à chacun des ~37 tours qui suivent.

D'où la règle unique désormais écrite dans `CLAUDE.md`, le seul fichier chargé à
chaque session : **un token entré dans le contexte est repayé à chaque tour
suivant.** Un fichier de 50 000 tokens lu au tour 3 coûte 34 relectures, pas une
lecture. Trois gestes en découlent — ne pas faire entrer le volume (`Grep` avant
`Read`, `offset`/`limit`, redirection des grosses sorties), déléguer
l'investigation volumineuse, `/clear` entre deux sujets sans rapport — et un
**parcours type** qui nomme l'étape décisive : le cadrage, parce que ce qu'il fait
entrer dans le contexte est relu jusqu'à la fin de la session.

**Le piège symétrique est fermé dans la foulée.** Un sous-agent qui recopie ce
qu'il a lu réimporte dans la session appelante exactement le volume que sa
délégation devait éviter — et peut coûter plus cher que si l'appelant avait lu
lui-même. `wn-explorer` a désormais l'interdiction explicite de rendre un fichier,
un diff complet ou une sortie entière : des conclusions avec leurs coordonnées
`fichier:ligne`, et un extrait seulement quand la formulation exacte décide de
quelque chose.

`/wn-test` gagne la seconde moitié de son idiome de redirection : elle n'évite pas
seulement de réexécuter une suite, elle empêche surtout sa sortie complète
d'entrer dans le contexte, où elle serait relue trente fois.

Enfin, `/wn-lot` cesse d'annoncer une économie qu'il ne pouvait pas prouver. Sa
proposition rend maintenant **ce qui n'entrera pas dans le contexte** — fichiers
lus par un sous-agent, sorties redirigées, paliers non élargis — et le fichier
consigne où se mesure la consommation réelle : les compteurs des transcripts
`~/.claude/projects/**/*.jsonl`, hors session, qui ont produit tous les chiffres
ci-dessus.
