### D-049 a une cause racine : WebKit se bloque au 64ᵉ contexte, pas à la 65ᵉ navigation (2026-09-17)

Ouverte depuis le 2026-08-12, la panne était étiquetée « cause dans le processus
navigateur, hors de ce dépôt, non identifiée ». Elle est identifiée, mesurée, et
elle **ne ferme pas** la décision — arbitrage du responsable.

**L'AMONT** : `microsoft/playwright#42385`, macOS arm64. **Le correctif existe**
— bissecté à **WebKit 2352**. Nous étions sur **2311** ; la 1.63.0 embarque
**2359**. Le déclencheur est la **mise en veille de l'écran**, ce qui explique
pourquoi la panne ne frappe que les runs autonomes de nuit.

⚠️ La première rédaction de ce fragment disait « aucun correctif à attendre » :
**faux**. Elle lisait le statut « not planned » de l'issue sans lire ses
commentaires — où vivent la bissection, le correctif et le déclencheur.

**LA MESURE, en deux bras, hors du dépôt** — un serveur HTTP de trois lignes,
WebKit, ni application ni base ni suite E2E :

| Bras | Montage | Requêtes émises | Blocages |
|---|---|---|---|
| Témoin | 200 `goto` sur **une seule page** | 200 / 200 | **0** |
| Essai (B) | **contexte ET page neufs** à chaque tour | 0 aux rangs 64-65 | **rangs 64, 65** |
| Essai (C) | **contexte unique**, **page neuve** | 0 au rang 64 | **rang 64** |
| Après montée | bras C sur **WebKit 2359** | 250 / 250 | **0** |

**Le témoin est ce qui donne sa valeur au résultat** : même machine, même minute.
Il écarte la navigation, le serveur, le réseau, l'application, la base — et la
charge machine.

**LE COMPTEUR PORTE SUR LA CRÉATION DE PAGE.** Le bras B changeait deux
variables à la fois et ne pouvait rien isoler — constat de la revue, et il était
juste. Le bras C tranche. Un test = une page, d'où « un seul test par run,
jamais le même ».

Et `D-155` attribuait la panne à la **charge machine** : c'est la **veille de
l'écran**.

**UN FAIT NON PRÉVU PAR L'AMONT** : passé le rang 64, même `context.close()` se
bloque, sans délai de garde. Dans un navigateur unique, le blocage est terminal.

**RÉSERVES** : le contournement que l'amont recommande (`retries: 1`) reste
**celui que `D-049` interdit** ; cela **n'explique pas** le rouge WebKit du CI,
dont le symptôme est distinct ; et 2359 porte un défaut signalé le 2026-09-17,
lui aussi de signature différente.
