### `/wn-reprompt` — l'étape qui manquait entre aiguiller une demande et la cadrer

La suite `wn` savait router (`/wn-route`) puis planifier (`/wn-plan`). Entre les deux,
rien : aucune passe ne transformait une demande d'une ligne en demande exécutable —
objectif, résultat observable, hors périmètre — **avant** que le routage décide du
modèle, du palier et de la revue. Ce qui en tenait lieu, `docs/claude/TEMPLATES_PROMPTS.md`,
est un jeu de gabarits à copier-coller : il ne peut ni vérifier une hypothèse contre le
dépôt, ni voir qu'un terme est ambigu ici. Il avait d'ailleurs dérivé — deux de ses
gabarits interdisaient encore « un `SHEET_ID` en dur », variable retirée du runtime le
2026-07-07.

**Le skill est adossé à la mesure, pas à l'idée qu'un beau prompt vaut mieux.** Une
requête relit ~202 000 tokens pour en produire ~600 (mesure du 2026-08-01, 35 194
appels) : une demande mal cadrée ne coûte pas une réponse à côté, elle coûte les tours
qu'il faut pour la rattraper, chacun repayant tout le contexte. La valeur se compte
donc en **tours évités**, jamais en qualité rédactionnelle.

D'où la règle principale, qui est une règle d'abstention : **un reformulage inutile
coûte exactement ce qu'il prétend économiser — un tour complet.** Sur une demande déjà
exécutable, le skill rend `PASSE` et rien d'autre. Le seuil est falsifiable plutôt que
subjectif : *si deux lectures de la demande mènent au même diff, il n'y a rien à lever.*
Les deux autres déclencheurs sont l'absence de résultat observable et le terme ambigu
dans ce dépôt — un `R6` nu en désigne trois sans rapport, et « valider » peut être un
palier de test, un statut de claim ou un geste clinique.

Trois contraintes structurelles font converger le skill avec la doctrine d'économie au
lieu de s'y ajouter : **contexte isolé** (`context: fork` — ce qu'il lit meurt avec lui
et n'est jamais repayé par la session, 28 fois moins cher par appel), **sortie plafonnée
à ~180 mots** (elle, entre dans la session et sera relue à chaque tour), et **une seule
passe par demande** — si une passe ne suffit pas, la sortie est une question, pas un
deuxième tour. Plafond de lecture assorti : `Grep`/`Glob` avant tout `Read`, trois `Read`
ciblés au maximum ; devoir lire davantage **est** la conclusion, et se rend comme telle.

Interdit central : **ne jamais élargir le périmètre.** Une reformulation qui ajoute du
travail est une réécriture, pas une clarification.

Cinq skills gagnent le branchement, chacun à l'endroit où l'ambiguïté leur coûte le plus
cher :

- **`/wn-route`** et **`/wn`** — la route existe, assortie du test du même diff ; le
  défaut reste « pas de reformulation ».
- **`/wn-plan`** — une tâche non exécutable telle qu'écrite rend la reformulation au
  lieu d'un plan bâti sur une hypothèse : l'erreur se paierait sur le lot entier.
- **`/wn-lot`** — un `## But` qui ne dit pas ce qui aura changé se reformule pour un
  appel isolé ; l'exécuter à côté coûte les sept étapes.
- **`/wn-campaign`** — c'est là que le gain est le plus fort : les lots héritent de
  l'ambiguïté du brief, et une campagne mal cadrée la répète sur chacun de ses trois à
  huit lots.
- **`/wn-debug`** — « ça ne marche pas » n'est pas une entrée de débogage : sans
  observable, les trois hypothèses portent sur trois bugs différents.

`CLAUDE.md` n'est délibérément pas touché : y inscrire le reprompting le ferait payer à
**toutes** les sessions, y compris celles dont la demande est claire. C'est `/wn-route`,
déjà invoqué une fois par session, qui porte la décision.
