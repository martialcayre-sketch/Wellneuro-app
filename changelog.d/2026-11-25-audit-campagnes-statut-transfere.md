### L'audit des campagnes ferme un lot « transféré » (2026-11-25)

`isClosedStatus` de `scripts/wn-campaign-audit.mjs` ne reconnaissait que
quatre préfixes (`termine`, `livre`, `abandon`, `fait`). Un lot parti dans une
autre campagne ou au plan, au statut « transféré », comptait donc comme
ouvert : `closed_campaign_with_open_lots`, bloquant en T1 et en CI, empêchait
de clôturer sa campagne. On le contournait en écrivant « abandonné dans cette
campagne — TRANSFÉRÉ » (vu à la clôture de « Doctrine exécutable », `D-109`).

Sur arbitrage du responsable (2026-11-25), le mot « transféré » en tête du
statut, avec ses accords (« transférée », « transférés », « transférées »),
ferme désormais un lot comme une campagne, accents et casse ignorés. Un
statut voisin reste ouvert : « transférer plus tard », « transfert prévu »,
« non transféré », « à transférer ». Le mot en tête suffit à fermer : une
réserve s'écrit après la date, jamais en tête. Le sélecteur de
`scripts/wn-campaign.mjs` (`activate` sans `--lot`, `next`) lit le statut de
la même façon : il ne propose plus un lot que l'audit tient pour fermé. Les
statuts déjà posés ne changent pas, et le rapport JSON de l'audit sur le dépôt
est identique, octet pour octet, avant et après.

Nouveau banc `scripts/wn-campaign-audit.test.mjs` : six tests sur un dépôt
fabriqué, dont deux témoins des autres usages du prédicat (ordinal dupliqué,
campagne active fermée), et quatre mutations qui le font rougir. Il est joué
par `bancs-outillage-check` et par le CI. Un test s'ajoute à
`scripts/wn-campaign.test.mjs`. La règle est mise à jour dans
`docs/claude/PLAN_WELLNEURO.md` §9.
