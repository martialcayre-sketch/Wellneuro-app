### Le routeur payait sa grille pour découvrir qu'il n'en avait pas besoin ; un pilote de lot cesse de recharger sept fois le même contexte

**Deux dépenses mesurées, pas supposées.**

**`/wn-route` chargeait 2 700 tokens avant de savoir s'il servait à quelque chose.**
Il obtenait ses trois grilles en `cat`-ant `/wn`, `/wn-model` et `/wn-ultra` en entier
— 11 095 octets injectés à **chaque** démarrage de session et après chaque `/clear`,
alors que sa propre règle d'économie, deux paragraphes plus bas, dit que la majorité
des demandes tombent sur le défaut et qu'il ne faut alors rien afficher. On payait la
grille complète pour conclure qu'on n'en avait pas besoin.

Les trois grilles sont désormais **condensées dans le fichier** : la route en un
tableau de treize lignes, le modèle en trois lignes plus les overrides, le mode en
trois situations. Les grilles complètes restent invocables — et la règle qui décide
quand les charger est écrite : **dès qu'une demande ne tombe dans aucune ligne**,
invoquer `/wn`, `/wn-model` ou `/wn-ultra` plutôt que de trancher au jugé. C'est le
seul cas qui justifie le coût.

| | Avant | Après |
|---|---|---|
| Fichier | 3 303 o | 5 348 o |
| Injecté par `cat` | 11 095 o | 0 |
| **Total par démarrage** | **14 398 o (~3 600 tokens)** | **5 348 o (~1 340 tokens)** |

**~2 260 tokens économisés à chaque démarrage de session.**

**`/wn-lot` — le vrai coût d'une campagne n'était pas le choix des agents.** Une
campagne s'exécutait en sept invocations (`/wn-campaign-run`, mode Plan, `/wn-review`,
`/wn-finish`, `/wn-pr`, `/wn-merge`), dont **chacune rechargeait le même contexte** —
`git status`, queue de `SESSION_LOG`, `ACTIVE_CAMPAIGN`, parfois le pack complet — sans
rien transmettre à la suivante. La session servait de mémoire, et elle était refacturée
à chaque tour. Choisir Haiku plutôt qu'Opus gagne sur un appel ; supprimer six
rechargements gagne sur toute la campagne.

Le pilote charge le contexte **une fois**, en tête — pack compris, 89 lignes — et
l'interdit explicitement aux étapes suivantes. Il **classe le lot une seule fois** sur
ses « fichiers probables », et cette classe décide de tout : modèle, palier de test,
revue nécessaire, garde-fous. Six classes, de *docs* (Sonnet, T1) à *migration* et
*auth* (Opus, T3, revue adversariale **avant** de passer la main, vérification de la
base **après** merge).

La politique de coût est appliquée au lieu d'être rappelée : **Haiku pour localiser et
lire, Sonnet pour écrire, Opus seulement là où un faux verdict coûte cher.** Monter en
modèle sur une étape de lecture est le gaspillage le plus courant du dépôt.

**Il s'arrête sur une proposition, et c'est le point de conception, pas une limitation.**
Lecture seule par défaut : il classe, décide, propose la séquence complète, et rend la
main. `go` n'est valide qu'après une proposition **lue et acceptée** — un `go` isolé se
refuse par la proposition. Même sous `go`, le mode Plan reste obligatoire avant toute
édition, migration et clinique exigent une confirmation distincte au moment de l'étape,
et un `verify` absent bloque. Un pilote qui optimiserait en contournant un garde-fou
n'optimiserait rien.

**Et il ne prétend pas mesurer ce qu'il ne peut pas mesurer.** Aucun compteur de tokens
n'est accessible depuis un skill. Il lui est donc interdit d'afficher un « coût
estimé » chiffré, qui serait un nombre sans source — la classe de défaut du
`selfcheck` tiers qui annonçait « all checks passed » sans rien exécuter. Ce qu'il
rend est vérifiable : nombre d'étapes, délégations prévues, palier retenu, et ce qui a
été **évité**.
