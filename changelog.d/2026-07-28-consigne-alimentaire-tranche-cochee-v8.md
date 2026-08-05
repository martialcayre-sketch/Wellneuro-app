### Clinique

- **La consigne alimentaire généralisait à tous les `Q_ALI` une prémisse vraie
  d'un seul.** `synthese-v7` affirmait que « la valeur enregistrée EST la
  quantité dans l'unité de la question » et autorisait le modèle à la rapporter
  telle quelle. Aucun item alimentaire n'est en saisie libre — ce sont des
  listes — et **ce que la valeur signifie dépend du moteur** :
  - `seuils_points` (Enquête SIIN) : c'est bien une quantité, mais celle qui
    **représente la tranche**. Le patient a coché « 5 à 8 verres », pas « 6 ».
    Le rapporter tel quel est une **précision fausse**.
  - `sum` / `subscore` (forme courte, `Q_ALI_02`, `Q_ALI_03`) : c'est un **poids
    de points**, sans rapport avec une quantité, et **inversé** sur plusieurs
    items. `AL5: 3` vaut « Rarement ou jamais » de viande rouge ; `AL10: 3`,
    « Jamais » de boissons sucrées ; `AL6: 3`, « Huile d'olive vierge extra » —
    qui n'est pas une quantité du tout. C'est un **contresens**.
- Dans les deux cas, le modèle recevait un entier sous une consigne l'invitant à
  en faire une déclaration que personne n'a faite. Même classe que le bloc
  `monnier` à zéro : la donnée livrée contredit la consigne qui l'encadre. Défaut
  **vivant en production** depuis #430, indépendant du drapeau
  `WN_ALI_01_SIIN57`. Une première rédaction de ce lot a pris la prémisse en sens
  inverse — « tout est un poids de points » — et la revue adversariale l'a
  refusée : la corriger par une autre erreur n'aurait rien réglé.

### Le correctif : livrer la tranche cochée

- La route de synthèse traduit désormais `rawAnswers` des `Q_ALI` en
  `{ question, reponse }`, où `reponse` est le **libellé exact de l'option
  cochée** (`reponsesLisiblesPourPrompt`). Sans le libellé de la question,
  « 5 à 8 verres » ne dit pas de quoi — et l'autorisation de la consigne restait
  inatteignable, exactement comme avec le code nu.
- **Deux étapes distinctes, dans cet ordre.** `scoresPourPrompt` reste un filtre
  pur qui retire ; la traduction réécrit ce qui reste. L'ordre inverse traduirait
  des blocs destinés à disparaître. Verrouillé par `conduite.guard.test.ts`.
- **Rien n'est deviné, et le moteur décide du sens.** Une valeur sans option
  correspondante — ou avec plusieurs — n'est jamais rattachée à l'option la plus
  proche. Ce qu'elle devient dépend du moteur, et c'est le cœur du lot :
  - sur `seuils_points`, et pour un item **gradué** dont la valeur est un nombre
    fini, elle reste une `quantiteDeclaree`, **exploitable**. Les
    tranches sont une construction WellNeuro révisable, et ce moteur existe
    précisément pour qu'un barème révisé se rejoue sur les réponses déjà
    recueillies. La déclarer illisible détruirait cette propriété : après ajout
    d'une tranche, une passation parfaitement scorée serait annoncée non
    exploitable au modèle, en silence ;
  - partout ailleurs, elle est `valeurNonResolue`. La forme SIIN mêle 33 items
    quantitatifs et **24 items Oui/Non** : décider sur le seul moteur aurait fait
    de « Choisissez-vous du pain complet ? » une quantité déclarée — la faute
    corrigée par ce lot, replacée à l'autre bout. La revue l'a refusée. Trois
    conditions, donc, et pas une : moteur à quantités, valeur numérique finie,
    item à plus de deux options toutes numériques.
- **Un item étranger à la forme servie ne repart jamais nu.** Une passation `AL*`
  relue drapeau allumé donnait `AL5: 0` au modèle, sous une consigne affirmant
  que les réponses portent leur libellé : le défaut corrigé, rouvert pour huit
  passations de production au prochain basculement. Ces items partent désormais
  en `valeurNonResolue`, sans libellé de question — on ignore de quelle forme ils
  viennent.

### Les équivalences en grammes ne partent plus au modèle

Dix questions définissent la portion pour aider le **patient** à répondre :
« une portion = 12 g », « (1 portion = 100-120 g) », « (sardine, maquereau… —
100 g) ». Deux d'entre elles sont sur `Q_ALI_03`, **servi aujourd'hui, drapeau
éteint**. Transmises avec le libellé, elles offrent au modèle une multiplication
— « 3 portions × 100 g = 300 g » — soit une masse que personne n'a déclarée.

Une interdiction en langue naturelle aurait été la parade que ce lot reproche
lui-même à `synthese-v7`. La parenthèse portant une masse est donc **retirée du
libellé transmis** ; celui que lit le patient est intact. Un garde refuse toute
masse résiduelle dans un libellé transmis — **délibérément plus large que le
nettoyeur** (« 80g » collé, « 80 grammes », « 30 GR ») : un garde calé sur la même
classe que ce qu'il vérifie bouge avec lui et ne prouve rien. Il compte aussi les
dix libellés nettoyés, sans quoi une fonction identité passerait, et refuse toute
masse dans un libellé d'**option**, que le nettoyeur ne traite pas. Retrait de la **parenthèse entière**
et non de la seule mention chiffrée : mesuré, un retrait chirurgical laisse
« (environ », « (1 portion = », « 80 à ».

**Périmètre `Q_ALI` volontaire**, pour la traduction comme pour le nettoyage :
c'est exactement celui de la clause « unité de la question » de la consigne.
L'étendre au catalogue serait un autre lot.

### La consigne, recadrée en `synthese-v8`

Chaque règle est adossée à un geste de code, jamais seule :

- **Ne jamais convertir une tranche en compte exact** — « 5 à 8 verres » ne
  devient pas « 6 verres ». Le milieu d'une tranche est une invention. Adossée au
  fait que le modèle ne reçoit plus que le libellé.
- **Ne calculer aucune masse consommée** — adossée au retrait des équivalences,
  ci-dessus. La consigne n'a plus à interdire ce qu'elle ne reçoit pas.
- **`quantiteDeclaree` est exploitable, `valeurNonResolue` ne l'est pas**, et
  cette dernière peut arriver sans même le libellé de sa question. La consigne
  dit aussi qu'aucun code de barème n'est transmis : un entier nu n'est jamais
  une quantité.

Les interdictions d'apport étalonné (g, mg, µg, kcal), de carence, de statut
biologique et de supplémentation sont **conservées telles quelles**.
`VERSION_PROMPT_SYNTHESE` passe en `synthese-v8`, empreinte reportée — c'est le
couple qui est verrouillé, jamais l'un des deux seul.

### Ce que les gardes ont trouvé

- **Une garde de forme, à la place de la liste blanche envisagée.** Le cadrage
  prévoyait une liste blanche des identifiants d'items sous `rawAnswers`. Elle
  aurait été **tautologique** : la fixture du garde est construite depuis le
  catalogue même que l'assertion aurait consulté — verte quoi qu'il arrive, même
  si la route cessait d'envoyer `rawAnswers`. Et aveugle à la seule instance
  connue de la classe visée : `monnier` vivait à la **racine** de la sortie
  moteur, pas sous `rawAnswers`. La garde posée vérifie donc que **toute clé**
  de la charge appartient à un ensemble écrit à la main — la seule qui attrape un
  apport étalonné reposé sous un nom neutre, ce qu'aucune règle de nom ne fera.
- **La passe drapeau allumé a servi immédiatement.** Elle a fait apparaître six
  clés que la position éteinte ne montre pas (`dimensions`, `missing`,
  `missingIds`, `raisonNonScore`, puis `repondus` et `items` sur chaque
  catégorie). Chacune a été lue dans `questions.ts` avant d'être admise :
  découpage descriptif et comptes d'items, aucune unité physiologique.
- **Un garde annonçait couvrir les deux positions et n'en couvrait aucune.** Il
  passait par le catalogue : drapeau éteint, aucun des 57 identifiants SIIN n'y
  existe, rien n'était traduit et l'assertion était trivialement vraie sur un
  objet intact. Il passe désormais par la **définition**, avec une anti-vacuité
  sur la **sortie** (57 items traduits) — c'est le détour par l'entrée qui avait
  déjà laissé passer la version cassée du 2026-07-27.
- **Le balayage ne couvrait qu'une imbrication.** `subScores` était parcouru,
  `dimensions` non — l'autre endroit où un bloc au nom neutre peut se loger.
- **La preuve comportementale est sur la charge réelle**, pas sur le module : un
  module de traduction parfait que la route n'appellerait jamais passerait tous
  les autres tests. C'est « l'interdiction dont le critère n'arrive jamais »
  (#408). Fixture sur `Q_ALI_03`, indépendante du drapeau : ce test observe le
  branchement, qui ne doit dépendre d'aucune position.

### Réserves

- **Deux commentaires périmés corrigés**, dans `alimentaire.ts` et dans le garde
  lui-même : ils répétaient la prémisse de v7 (« saisie chiffrée », « la valeur
  enregistrée EST la quantité »). Une consigne future les aurait relus comme des
  faits — c'est exactement ainsi que v7 s'est écrite.
- **Une passation `AL*` relue drapeau allumé perd son détail item** : ses
  réponses partent en `valeurNonResolue` sans libellé, alors que son total /42 et
  sa bande continuent d'arriver. Résoudre les `AL*` contre la forme courte serait
  possible — les deux jeux d'identifiants sont disjoints — mais rattacherait ce
  module générique à un instrument nommé. Réserve assumée : huit passations,
  toutes antérieures à l'allumage.
- **Aucune synthèse déjà enregistrée n'est réécrite.** Les synthèses rédigées
  sous `v5` à `v7` restent en base avec leur étiquette de version ; celles
  portant une quantité fabriquée à partir d'un code de barème ne sont pas
  reprises. Leur version les rend identifiables.
- Ce lot **n'allume pas** `WN_ALI_01_SIIN57` et ne touche à aucun barème, aucun
  seuil, aucune bande. Aucune migration, aucune écriture en base.
