### Ajouté — priorités candidates déterministes et chaîne C1 rebranchée (LOT-04, `D-054`)

- **Une table de règles de priorité** (`web/src/lib/clinical/priorityRulesV1.ts`),
  sur le patron de la table d'orientation : statut par règle, déclencheurs en ET
  logique, claims épinglés jamais vides, métadonnées, SHA-256 et littéral de
  banc. Deux règles en V1 — axe **digestif** et axe **pondéral/métabolique** —
  déclenchées par les bandes hautes de `Q_MOD_03` (« Plaintes actuelles »), les
  mêmes que la table d'orientation signée cite déjà. **Aucun seuil nouveau
  n'entre dans le dépôt** : les déclencheurs citent une bande publiée, jamais un
  nombre écrit à cet endroit.
- **L'abstention clinique est enfin ÉVALUÉE.** Table signée, la chaîne rend
  `required` motivé quand un constat de sécurité est présent ou quand le canal de
  plainte n'est pas mesurable sur l'épisode confirmé — une donnée absente n'est
  ni nulle ni normale —, `not_required` motivé sinon. Le cockpit cesse d'afficher
  « Décision suspendue : l'abstention clinique n'est pas encore évaluée » comme
  un état permanent : il affiche l'état réel, y compris quand il reste bloqué.
- **La plainte du patient devient visible.** Le domaine de plainte le plus
  intense de `Q_MOD_03` et l'objectif prioritaire déclaré à l'anamnèse
  (`patientContext.priorityGoal`, qui traversait toute la chaîne sans être
  affiché nulle part) sont servis en tête du cockpit, avant la décision, et ne
  sont jamais écrasés par l'agrégat. La plainte dominante fait remonter la règle
  de son axe en tête du classement des candidats.
- **Le serveur vérifie la carte avant d'écrire.** `POST
  /api/praticien/protocoles/versions` et `POST /api/praticien/protocoles`
  acceptaient la carte de décision du corps de requête telle quelle — la fixture
  du banc était elle-même une carte forgée qui passait. Sur les **deux** routes,
  la carte soumise est désormais **recoupée contre sa propre empreinte**, puis
  confrontée à une reconstruction complète de `snapshot → review → decisionCard`
  **depuis la base**, aux horodatages soumis : trois empreintes comparées, puis
  les deux JSON canoniques de la carte. Toute divergence ⇒ **409
  `chaine_c1_divergente`**. Le premier temps n'est pas décoratif : sans lui, une
  carte au contenu clinique entièrement réécrit mais portant les trois empreintes
  honnêtes passait les comparaisons — le serveur confrontait le recalcul à des
  nombres que le fraudeur n'avait aucune raison de toucher. Aucune migration.
- **Une abstention requise fait taire la table.** Un seul domaine manquant à
  `Q_MOD_03` suffit à rendre le canal de plainte non mesurable ; les autres
  domaines, eux, déclenchaient encore. La carte servait alors une liste
  hiérarchisée sous un bandeau de suspension. Données insuffisantes : on réduit
  la conclusion, on ne l'habille pas.
- **Un seul chemin de construction** (`chaineC1.ts`), appelé par le cockpit ET
  par le vérificateur : deux constructions divergentes auraient rendu 409 sur une
  carte honnête.

### Ce qui n'est pas livré, et pourquoi c'est écrit dans la table

- **Cinq domaines de plainte sur sept** (fatigue, douleurs, sommeil, moral,
  mobilité) n'ont pas de règle : aucun claim relu ne fonde une priorité
  d'intervention sur ces axes en V1. Ils vivent dans
  `PRIORITY_RULES_ECARTEES_V1` avec leur motif et leur condition de retour,
  plutôt que dans un ticket que personne ne rouvre.
- **Aucun pont entre les règles d'arrêt et les priorités.** Une extinction dit
  qu'une exploration n'a plus d'objet ; elle ne dit rien de ce qu'il faut
  entreprendre. Conséquence : le critère « stress au mieux mineur » est tenu par
  construction — la V1 ne porte aucune règle d'axe stress — et non par un
  mécanisme. Le banc le vérifie et le dit.
- **La sélection d'une priorité reste hors périmètre** : elle appartient au
  praticien, et le lot ne pose aucun geste pour la faire. Le recalcul serveur
  réinjecte `selectedMainPriority` telle quelle et la re-valide entièrement ; le
  lot qui la posera devra la faire transiter par une route serveur, jamais par un
  enrichissement de carte côté navigateur.
- **Le 409 garde la carte, pas le protocole** — dette préexistante, écrite plutôt
  que masquée. Sur `POST /api/praticien/protocoles`, le `ProtocolDraft` arrive
  construit du navigateur : la route en vérifie l'ancrage et la structure, mais
  ne le re-dérive pas de la carte, à la différence de la route sœur qui le
  reconstruit serveur. Le trou est antérieur à ce lot et appelle son propre
  arbitrage.
- **Signer la table ne suffira pas.** La procédure d'abstention vit dans le
  producteur de chaîne, hors de la table et hors de son SHA — qui ne couvre que
  les règles elles-mêmes. La signer en l'état ouvrirait un verdict clinique
  qu'aucune ligne signée ne décrit : la procédure doit d'abord entrer dans le
  périmètre signé. Le rappel est écrit à côté du verrou, pas seulement ici.

### Rien ne change en production

La table est **livrée non signée** (`validationExterne: false`), comme les tables
de contradictions et d'arrêt avant elle. Le verrou `tablePrioritesSignee()`
commande tout depuis un seul endroit : tant que le praticien n'a pas signé,
aucune règle n'atteint la revue clinique, l'abstention reste `not_evaluated` et
aucun candidat n'est produit. Deux effets ne sont pas derrière ce verrou, et
c'est voulu : l'affichage de la plainte (une bande déjà publiée par un instrument
certifié, un texte déjà saisi) et le recalcul serveur, qui est un contrôle
d'intégrité — le subordonner à une signature clinique laisserait passer une carte
forgée tant que la table n'est pas signée.
