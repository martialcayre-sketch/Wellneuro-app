### Ajouté

- **Le domaine de l'agenda alimentaire 21 jours** (`Q_ALI_09`, lot 1 sur 7).
  `web/src/lib/agenda-alimentaire/` : contrat de recueil, validation d'une
  journée, fenêtre de 21 emplacements, agrégats. **Domaine pur** — aucun import
  Prisma, aucune route, aucune surface, aucun branchement au score. Rien de ce
  lot n'est atteignable par un utilisateur : c'est délibéré, et c'est ce qui
  rend le reste vérifiable pièce par pièce.

  Transposition du patron `agenda-sommeil/`, qui a déjà fait la preuve du
  chemin : fenêtre ancrée sur le **premier jour saisi** et non sur la date
  d'assignation (un démarrage tardif n'ampute pas le recueil), correction par
  **chaînage** et jamais par écrasement, emplacement vide = trou visible.

  Ce qui diffère du sommeil, et pourquoi :

  - **Ancre de journée à 04:00.** Une prise à 00:30 appartient à la veille.
    Sans elle, l'ordre des prises casse et un écart-type calculé depuis minuit
    ferait passer 23:45 et 00:15 pour douze heures d'écart.
  - **Saisie bornée à aujourd'hui et la veille**, plus strict que le sommeil.
    Au-delà de 24 h, un rappel alimentaire est une reconstruction de mémoire ;
    le remplir ferait passer du souvenir pour de l'observation, dans un
    instrument dont tout le régime de preuve tient au mot « observé ».
  - **Le jeûne nocturne se compte en PAIRES de jours consécutifs**, jamais en
    jours : un recueil de quatorze jours en pointillé, un jour sur deux, porte
    quatorze jours et **zéro paire**. Une journée déclarée sans prise invalide
    les deux paires qui la touchent — un intervalle de plus de vingt-quatre
    heures n'est pas un jeûne *nocturne*.

  **Ce que le domaine mesure** : quand le patient mange (heures réelles au pas
  de 15 min), comment les prises se structurent (repas vs hors-repas), et la
  présence de trois catégories que le guide des besoins nomme pour le besoin 1.

  **Ce qu'il refuse** : aucune quantité, aucune kcal, aucun gramme, aucun
  aliment identifié au-delà de ces présences. Les trois présences observées ne
  sont **pas** un MEDAS abrégé — l'adhérence méditerranéenne appartient à
  `Q_ALI_02`, et la reproduire ici tomberait sous l'interdit écrit « aucune
  projection vers `Q_ALI_01`/`Q_ALI_02` ».

### Le non-mesuré, à chaque étage

Sous sept jours, `calculerAgregatsAli` rend **`null`** plutôt qu'un objet de
zéros. Une série vide rend `null` et jamais 0 — ici, un 0 se lirait comme
« zéro repas », pas comme « inconnu ». Et chaque grandeur porte **sa propre
couverture** : un patient qui a renseigné les protéines mais pas le contenu voit
l'une mesurée et l'autre non, au lieu d'un contenu déclaré pauvre là où
personne ne lui a rien demandé.

Les trois présences sont exigées **ensemble** en écriture, pour la même raison :
en renseigner deux ferait lire la troisième comme une absence. Et une journée
« sans aucune prise » est une **réponse** — elle compte dans la couverture —
là où un emplacement non renseigné reste un trou.

### Tests

57 tests, dont la démonstration qu'ils mordent : muter `null` en `0` sur les
fréquences fait tomber deux tests ; apparier les jeûnes **par position** dans la
liste au lieu de la **date** en fait tomber un — c'est le défaut qu'un recueil
en pointillé produirait silencieusement.

### Ce que ce lot ne fait pas

Aucune migration, aucune table, aucune route, aucune surface patient ou
praticien, **aucun branchement à `BESOIN_SOURCES`** et donc aucun bump de
`VERSION_SCORE_EQUILIBRE`. Le scorer, la persistance, le portail et le
branchement clinique sont les lots 2 à 5, et le branchement reste suspendu à
trois arbitrages praticien : les poids dans les groupes, le barème des cinq
axes, et l'amendement de la frontière C5.

### Corrigé après revue adversariale (même lot)

Une passe `wn-reviewer` a rendu un GO conditionnel. Sept constats corrigés ici,
dont trois qui auraient été lus comme des mesures par le lot suivant :

- **Une fenêtre hors bornes n'exclut plus la journée entière.** Elle rendait
  inconnue cette seule grandeur en apparence, mais retirait en réalité la
  journée du recueil — avec son week-end, ses présences et ses jeûnes. Un
  patient grignotant de 05:00 à 00:30 les samedis et dimanches perdait **tous**
  ses jours de week-end, devenait inéligible à l'indice sans qu'aucun champ ne
  l'explique, et rendait une fenêtre moyenne de patient régulier. La journée
  reste désormais comptée ; seule sa fenêtre devient `null`.
- **Un jeûne « nocturne » de 39 heures était servi comme tel.** Deux journées
  porteuses de prises suffisent : dernière prise à 05:00, première du lendemain
  à 03:45. Le commentaire justifiait déjà l'exclusion des jours sans prise par
  « plus de 24 h n'est pas un jeûne nocturne » — le code ne couvrait pas sa
  propre justification. Borne haute ajoutée.
- **Vingt et une journées « aucune prise » étaient déclarées exploitables.** Le
  compte et le week-end étaient atteints, et les quinze grandeurs valaient
  `null`. `couvertureSuffisante` exige désormais aussi des journées **porteuses
  de prises**.
- **La fenêtre alimentaire n'avait pas de dénominateur** : une moyenne bâtie sur
  une journée était indiscernable d'une moyenne bâtie sur sept.
  `nbJoursFenetreConnue` et `nbJoursAvecPrises` le publient.
- **L'ordre des prises, le plafond et le panachage s'appliquaient en LECTURE.**
  Une seule ligne bancale en base aurait rendu tout l'agenda du patient
  illisible — la leçon est écrite dans le patron sommeil. En lecture, on trie
  plutôt que de lever ; en écriture, les contrôles restent stricts.
- **`resolveJoursActifs` perdait trois gardes du patron** : un cycle A↔B faisait
  disparaître la date entière (soit « rien saisi ce jour-là », une absence
  fabriquée par une anomalie de chaînage), un `supersedesJourId` croisé effaçait
  une **autre** date, et deux lignes de même horodatage rendaient un résultat
  dépendant de l'ordre de la requête.
- **`estDateSaisissable('pouet', 'pouet')` valait `true`** : le garde ne validait
  pas ses arguments.

Deux mutations survivaient à la suite de tests : remplacer `null` par `0` dans
`moyenneOuNull`/`medianeOuNull`, et transformer le ET des trois présences en OU
— la doctrine écrite dans le type, inversée, passait le CI. Les deux tuent
désormais un test. La suite passe de 57 à 72 tests.

Reste hors de ce lot, par nature : la valeur de la borne des 18 h relève d'une
décision clinique, non d'un correctif.
