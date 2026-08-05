### HAD — une entrée de rayon, pour le rendre servable ET gouvernable

Arbitrage praticien du 2026-07-29, sur le point resté ouvert à la clôture de #460.

**La position d'avant était la pire des trois possibles.** `Q_NEU_11` portait une
définition de scoring **sans aucune entrée au catalogue d'affichage** : il n'était
donc proposé par aucun écran — son ancien identifiant `Q_STR_07` y figure bien,
mais en **alias sans grille**, que la route d'assignation refuse en 404. Et
pourtant un appel direct à `api/praticien/assignations` l'acceptait, cette route
n'exigeant qu'une définition une fois passé le filtre `IDS_SUSPENDUS`. Invisible
et assignable : la combinaison que `questionnaires-catalog.ts` désigne lui-même
comme la pire, et que #460 a fermée sur le MMSE pour cette raison exacte.

**Ce que l'entrée change vraiment, c'est la gouvernabilité.** `actif: false`
atteint désormais HAD, ce qui n'était pas le cas : le fermer demandait du code, il
demande maintenant une édition de données. **Pas une ligne pour autant** — la
première rédaction de ce fragment le prétendait, la revue l'a corrigé : il en faut
quatre. Le catalogue, le `statutCertification` du registre (sinon le vérificateur
du CI rougit), le test qui verrouille l'ouverture, et **l'alias `Q_STR_07`**, qui
resterait sinon au rayon avec son aperçu — c'est-à-dire le verbatim des 14 items,
sur un instrument fermé pour motif de droits. C'est exactement l'argument qui a
sorti le MMSE de `PASSATION_PRATICIEN` dans #460. Un test neuf exige désormais
qu'un alias suive sa cible dans la suspension ; il est vert à vide aujourd'hui et
mordra ce jour-là.

C'est ce qui a décidé l'arbitrage, parce que les deux autres options coûtaient
chacune quelque chose :

- **le fermer** — HAD est la source **unique** du besoin 8 de « Mon équilibre »,
  en grade A, `inverser: true`. Le fermer fait tomber ce besoin à `NON_MESURE`
  sans substitut : les trois candidats du domaine (`Q_NEU_01` BDI-13, `Q_NEU_02`
  MADRS, `Q_STR_04` DASS-21) sont eux-mêmes à instruire ;
- **le laisser tel quel** — hors de portée du mécanisme ordinaire, et dans une
  position que le dépôt condamne par écrit.

**À assumer** : HAD devient réellement proposable, là où il ne l'était pas. Sur un
instrument sous licence tierce non instruite — « GL Assessment, copyright déclaré,
à vérifier » —, l'exposition pratique augmente. C'est le prix de la maîtrise.

**Et l'ouverture précède la démarche, ce que le dossier d'instruction voulait dans
l'autre ordre.** `demarches-ayants-droit.md` écrit qu'une cinquième démarche
auprès de GL Assessment est « le préalable commun aux deux » branches — fermer, ou
donner une entrée de rayon. Ce lot prend la seconde sans le préalable : écart
assumé, dit ici plutôt que découvert plus tard. HAD est le seul des huit à rester
**hors suspension** sans démarche engagée — les deux Conners n'en ont pas non
plus, mais ils sont fermés.

**Son alias `Q_STR_07` reste au catalogue**, pointant vers la grille et toujours
refusé à l'assignation — c'est ce qu'un alias doit faire, et c'est ce qui rendait
HAD inservable par l'interface.

**Mais son titre a dû être désambiguïsé, et c'est un défaut que ce lot a créé.**
Les deux entrées portaient le même libellé au caractère près. Le rayon les
distingue par son badge « Alias historique » — le **sélecteur d'assignation**, lui,
ne filtre que sur `actif` et n'affiche que « titre (catégorie) » : le praticien y
voyait deux « HAD », dont celui qui échoue en 404 faute de grille, et un praticien
filtrant sur la catégorie « Stress » ne voyait **que le cassé**. Un échec devenu
aléatoire coûte plus cher en confiance qu'un échec total. Relevé en revue
adversariale, avec le même défaut au compositeur de packs.

**La classe est recensée, et elle perd un membre.** Le test d'invariant écrit en
#462 — « les définitions sans entrée de rayon sont recensées, jamais
découvertes » — a mordu sur ce lot, comme prévu. Elle passe de deux membres à un :
**`Q_NEU_12` (IDTAS-AE) reste exactement dans la position que HAD vient de
quitter** — cible de l'alias `Q_SOM_08`, invisible à l'écran, accepté par appel
direct. Son sort n'a pas été arbitré.

**Quatre tests neufs.** HAD est servable par l'interface et son alias reste
refusé ; **aucun titre n'est partagé par deux entrées** — la garde d'identifiant
existante ne voyait pas ce défaut, puisqu'il porte sur ce que le sélecteur affiche
et non sur ce qu'il indexe ; un alias suit sa cible dans la suspension ; et
l'invariant de classe est resserré à `['Q_NEU_12']`, de sorte qu'un troisième
membre fera rougir le CI.

**Ce qui n'est PAS couvert** : rien, dans le code, ne relie `droits.statut:
licence_requise` à l'assignabilité. Ce lot a pu ouvrir un instrument sous licence
non instruite sans qu'aucun garde ne rougisse — c'est un constat, pas un
correctif, et la garde manquante serait une liste nommée des `licence_requise`
laissés assignables, adossée au registre.
