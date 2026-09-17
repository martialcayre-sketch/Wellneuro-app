### Playwright monte en 1.63.0 pour le correctif WebKit 2352 — mesuré, pas supposé (2026-09-17)

`D-049` avait écarté la montée en 1.62.1 : « rien ne relie ce blocage à un
correctif amont ; monter sur une supposition ne se distingue pas d'un tirage au
sort ». **Le refus était juste** — 1.62.1 embarque WebKit 2336, encore avant le
correctif, bissecté en amont à **2352**.

Nous étions sur **2311**. La 1.63.0 embarque **2359**.

**CONSTATÉ SUR LA MACHINE, EN TROIS BRAS** — banc hors dépôt, serveur HTTP de
trois lignes, ni application ni base ni suite E2E :

| Bras | Contexte | Page | WebKit 2311 | WebKit 2359 |
|---|---|---|---|---|
| A (témoin) | 1 | 1 | **0 / 200** | — |
| B | neuf | neuve | rang 64 | — |
| C | 1 | **neuve** | **rang 64** | **0 / 250** |

Le bras C isole ce que le bras B confondait : **le compteur porte sur la
création de page**. Il n'existe que parce qu'une revue a refusé la conclusion
tirée du seul bras B, qui changeait deux variables à la fois.

**Le déclencheur est la mise en veille de l'écran** — ce que `D-155` prenait
pour de la charge machine, et ce qui explique que la panne ne frappe que les
runs autonomes de nuit.

**QUATRE BASELINES SUR HUIT CHANGENT, ET CE SONT LES QUATRE WEBKIT.** Les quatre
Desktop Chromium sont identiques à l'octet. Régénérées par
`visual-baselines.yml` dans cette PR même — sur Ubuntu, jamais sur un Mac —, et
**regardées une par une** avant promotion.

**CE QUE CETTE PR NE FAIT PAS : fermer `D-049`.** Sa condition de sortie est
désormais remplie et mesurée, mais la fermeture rétablirait l'exigence de T3
local pour les PR migration/scoring/clinique — c'est un arbitrage du
responsable, et le précédent (« amender, ne pas fermer ») avait été rendu sur la
prémisse, depuis démentie, qu'aucun correctif n'existait.

**Réserve** : 2359 porte un défaut signalé le 2026-09-17, de **signature
différente**. Et `retries: 1`, que l'amont recommande, **reste interdit**.
