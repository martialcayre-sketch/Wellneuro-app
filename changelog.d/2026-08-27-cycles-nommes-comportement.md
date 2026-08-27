### Les cycles nommés se comportent comme tels, et un `T1` peut s'ouvrir (`D-113`)

Seconde des deux PR. La première posait la structure sans changer aucun
comportement ; celle-ci relit **les sites qui testaient `milestone === 'T0'`**,
un par un, et ouvre le chemin par lequel un deuxième cycle existe réellement.

**Ce que le littéral disait de deux choses à la fois.** `'T0'` voulait dire
« l'ancre du cycle courant » à certains endroits et « la toute première mesure »
à d'autres. C'était la même chose ; depuis `D-113`, ce ne l'est plus. Chaque
site a été tranché dans un sens ou dans l'autre :

- **l'ancre du cycle lu** — trajectoire, jalon dû, médianes de cabinet, résumé,
  bandeau d'épisode, fenêtre serveur d'un jalon de mesure : ils lisent
  désormais `cycle.ancre`, servie par la trajectoire ;
- **le point d'entrée d'un suivi** — le rideau `D-052` : il vaut pour **toute
  ancre**, et plus seulement pour `T0`. Ouvrir un deuxième cycle est le même
  acte qu'ouvrir le premier ; restreindre la porte au rang 0 aurait ouvert un
  chemin d'ancrage **sans rideau**. Aucun seuil ne bouge, la clé s'élargit ;
- **la toute première mesure** — le repli de `resoudreDateT0` sur la première
  réponse du dossier, inchangé.

**Trois défauts que les types ne signalaient pas**, tous de la même famille que
celui nommé par la PR 1 :

- `Record<JalonMomentum, string>` **dégénérait en signature d'index** dans deux
  tables de libellés (`SpiraleEpisodes`, `TrajectoirePanel`) :
  `LABEL_JALON['T1']` valait `undefined` sous un type `string`, soit « Jalon
  undefined du 12/03/2026 » à l'écran, sans erreur de compilation. Un jalon est
  son propre libellé : les deux tables disparaissent ;
- **six modules portaient chacun `['T0', 'J21', 'J42', 'J90']`** pour filtrer
  les lignes d'`assessment_episodes`. Recopiée, la liste ne pouvait qu'être
  fermée : un `T1` confirmé en base y était rejeté par un `continue`, et le
  cycle disparaissait de la lecture sans un mot. Un prédicat unique,
  `estJalonMomentum`, les remplace ;
- **cinq routes lisaient l'ancre par `where: { milestone: 'T0' }` + « la plus
  récente »**. Les deux moitiés sont fausses : le filtre ignore `T1`, et la
  date départage ce que le **rang** identifie. Une seule lecture,
  `lireAncresPersistees`, avec un filtre SQL large et la forme tranchée en
  mémoire — `estAncreDeCycle` reste la seule définition de « ancre ».

**L'ouverture d'un cycle est un geste, et ce qu'il coûte est écrit.** Le cockpit
propose « Ouvrir un nouveau cycle (T1) » en le **nommant**, y compris pendant
qu'un jalon est encore dû — c'est le cas clinique qui a motivé la décision. La
fermeture des fenêtres restées ouvertes du cycle précédent, jusqu'ici effet de
bord silencieux, est **annoncée avant le geste** et découle d'une règle
énonçable : le cycle courant est celui du rang le plus haut (`D-113` §8). Rien
n'est écrit tant que l'épisode n'est pas confirmé, et le panneau le dit.

**L'identifiant d'un épisode porte désormais son cycle.** Il valait
`runtime-episode-<patient>-<jalon>`. Cette forme était unique tant qu'un
dossier n'avait qu'un cycle ; elle a cessé de l'être au moment même où ouvrir
un `T1` est devenu un geste offert. Le `J21` du deuxième cycle prenait le
**même identifiant** que celui du premier, donc la même **clé primaire** — et
les deux points de persistance écrivent par `upsert(..., update: {})`. La
confirmation du second n'écrivait **rien**, sous une réponse `ok: true`, et le
`protocol_drafts` du cycle 2 référençait l'épisode du cycle 1 : le cycle que
cette PR permet d'ouvrir aurait été un cycle dont aucune mesure n'aurait jamais
pu être confirmée. Un jalon de mesure prend le nom de l'ancre de son cycle
(`…-T1-J21`) ; une **ancre** n'a pas besoin du préfixe, son nom EST son cycle.
L'identifiant n'entre pas dans `proposalHash` : aucune proposition en vol n'est
périmée. `assessment_episodes` étant **vide en production**, aucun identifiant
existant n'est renommé.

**Trois gardes d'écriture neuves, aux deux points de persistance** — la colonne
`milestone` n'a **aucun CHECK** en base (dette nommée par `D-113`, migration à
part) :

- **la forme** : ce qui n'est ni une ancre ni un jalon de mesure est refusé.
  `TA`, `T01` ou `J7` s'écrivaient sans un mot et n'étaient relus par personne —
  l'épisode aurait existé en base et nulle part à l'écran ;
- **le rang** : seules l'ancre déjà posée (re-confirmation, `upsert` idempotent)
  et celle qui suit immédiatement le rang le plus haut sont recevables. Un `T7`
  posté sur un dossier qui n'a que `T0` laisserait six rangs à jamais vides, et
  `ancreSuivante` proposerait ensuite `T8` : le trou ne se refermerait pas, il
  se propagerait ;
- **la cohérence interne** : un épisode dont l'identifiant et le jalon déclaré
  se contredisent est refusé, au lieu d'être départagé. Le suffixe de
  l'identifiant primait sur le champ, ce qui fermait un sens de l'écart —
  déclarer `J21` sur l'identifiant d'une ancre ne désactive pas la porte — et
  laissait l'autre ouvert : poster l'identifiant d'un `J21` en déclarant `T1`
  faisait rendre `J21`, donc le rideau `D-052` **ne s'évaluait pas**, alors que
  c'est `milestone: 'T1'` qui partait en base et s'y relisait comme une ancre.
  Les deux champs viennent du même corps de requête ; aucun ne mérite plus de
  crédit que l'autre, et une chaîne de provenance ne se construit pas sur un
  arbitrage muet (`DC-30`).

Les trois refus passent **avant** le rideau clinique : répondre « il manque
Q_MOD_03 » à un client qui a posté « T7 » désignerait le mauvais défaut.

**Ce qui change à l'écran**, tout en français : les libellés qui affirmaient
`T0` nomment l'ancre du cycle lu (« Cycle T1 depuis le … », « Momentum T1 →
dernier jalon mesuré », « T1 + 14 j · vous êtes ici », « Écart vs T1 »). Le
comparateur multi-cycles porte une ligne **« Ancre du cycle »** au lieu d'une
ligne `T0` : deux cycles côte à côte n'ont plus la même ancre, et une ligne
`T0` aurait affiché « jalon non mesuré » sur toute la colonne du second.

**Nommé, pas corrigé.** L'ordre des cycles vient du rang, la chronologie de la
date ; quand les deux divergent, la fiche-trajectoire **l'affiche au praticien**
(« Ordre des cycles à vérifier ») sans départager (`DC-30`) — un booléen que
personne ne rend ne signale rien. Aucune comparaison entre
cycles n'est introduite (`D-113` §9). Et les deux routes « Mon équilibre »
(patient et praticien) restent **cycle-aveugles** : elles ne lisent aucun
épisode, leur référence est la première réponse exploitable du dossier. Sur un
dossier rouvert, leur momentum part donc de l'historique et non du cycle
courant — limite pré-existante, désormais écrite dans les deux fichiers plutôt
que déduite d'un littéral.

**Aucune modification clinique** au sens de `DC-17`/`DC-18` : 21, 42, 90 et la
tolérance de ±8 sont inchangés, aucun seuil, dose ni borne n'est touché. Ce qui
change est une clé et un chemin d'accès. `assessment_episodes` reste **vide en
production** — aucune donnée à migrer, aucun cycle existant à renommer.

**Dette reconduite** : `assessment_episodes.milestone` demeure une colonne
`String` sans CHECK. Les gardes ci-dessus la couvrent au bord applicatif ; la
contrainte en base reste une migration à part, avec sa confirmation distincte.
