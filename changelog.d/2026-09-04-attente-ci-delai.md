### L'attente du CI ne rend plus « délai dépassé » une fois sur deux (2026-09-04)

`wn-attendre-ci.mjs` attendait 900 s — quinze minutes. Les sept runs de PR du
2026-09-04 ont duré **8, 10, 12, 15, 16, 16 et 17 minutes** : le défaut tombait
pile sur la médiane, et trois PR de la journée ont demandé deux appels au lieu
d'un.

Ce n'est pas une gêne bénigne. `CLAUDE.md` pose que `0` est le seul code de
sortie qui autorise à annoncer une PR prête ; un `3` — délai dépassé — se lit
vite comme un rouge alors qu'il ne dit **rien** du CI. Attendre 25 minutes d'un
coup coûte le même temps d'horloge que quinze puis relancer, sans l'occasion de
se tromper de verdict. Défaut porté à 1500 s, au-dessus du run le plus long
mesuré.

**Deux constantes séparées au passage.** Le défaut d'attente servait aussi de
seuil de « CI long » à la cadence de sondage (`intervalleMaxPourDelai`) — deux
décisions sans rapport qui partageaient un nombre par coïncidence. Les relever
ensemble aurait déplacé la cadence en silence. Le seuil reste à 900 s, et le
banc fige désormais que le défaut passe *au-dessus* de lui : une attente
ordinaire sonde toutes les 120 s. Vu rouge par mutation — reconfondre les deux
constantes fait tomber le cas de cadence.
