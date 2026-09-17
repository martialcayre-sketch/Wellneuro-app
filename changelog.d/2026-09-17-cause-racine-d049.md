### D-049 a une cause racine : WebKit se bloque au 64ᵉ contexte, pas à la 65ᵉ navigation (2026-09-17)

Ouverte depuis le 2026-08-12, la panne était étiquetée « cause dans le processus
navigateur, hors de ce dépôt, non identifiée ». Elle est identifiée, mesurée, et
elle **ne ferme pas** la décision — arbitrage du responsable.

**L'AMONT** : `microsoft/playwright#42385`, macOS arm64, **close en « not
planned »**. Aucun correctif à attendre.

**LA MESURE, en deux bras, hors du dépôt** — un serveur HTTP de trois lignes,
WebKit, ni application ni base ni suite E2E :

| Bras | Montage | Requêtes émises | Blocages |
|---|---|---|---|
| Témoin | 200 `goto` sur **une seule page** | 200 / 200 | **0** |
| Essai | **contexte iPhone 13 neuf** à chaque tour | 0 aux rangs 64-65 | **rangs 64, 65** |

**Le témoin est ce qui donne sa valeur au résultat** : même machine, même minute.
Il écarte la navigation, le serveur, le réseau, l'application, la base — et la
charge machine.

**DEUX CORRECTIONS.** L'issue amont dit « toutes les 65 **navigations** » : le
bras témoin le réfute, le compteur porte sur la **création de contexte**. Et
`D-155` attribuait la panne à la **charge machine** : chargée ou non, elle arrive
au 64ᵉ contexte.

Un test = un contexte. C'est pourquoi la panne se lit « un seul test par run,
jamais le même » : le rang fatidique tombe sur le test qui l'occupe.

**UN FAIT NON PRÉVU PAR L'AMONT** : passé le rang 64, même `context.close()` se
bloque, sans délai de garde. Dans un navigateur unique, le blocage est terminal.

**TROIS RÉSERVES** : mesuré **une** fois, donc la période reste non établie ; le
contournement que l'amont recommande (`retries: 1`) est **celui que `D-049`
interdit** et le reste ; et cela **n'explique pas** le rouge WebKit du CI, dont
le symptôme est distinct.
