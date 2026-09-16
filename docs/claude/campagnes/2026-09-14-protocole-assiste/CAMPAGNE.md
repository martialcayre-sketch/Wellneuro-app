---
id: "2026-09-14-protocole-assiste"
titre: "5. Actions — le protocole assisté"
statut: "terminée (2026-09-16 — neuf lots livrés, contre-revue adverse faite AVANT la clôture (6 réfutations sur 26), et usage MESURÉ au conteneur : zéro version de protocole C1 en production. Le créneau primaire s'ouvre ; son attribution reste un geste du responsable.)"
créée_le: "2026-09-14"
mise_à_jour: "2026-09-16"
lot_courant: "LOT-08"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# 5. Actions — le protocole assisté

*Le formulaire est vide, et le corpus est plein.*

## Objectif

Rendre le protocole 21 jours **constructible**. Pas en le rédigeant à la place du
praticien : en lui remettant sous les yeux ce qu'il vient de décider, en laissant
l'écran **désigner** une source que le serveur **recopie**, et en lui rendant le
seul geste qui relie son protocole à la biologie — suspendre une action en
attendant un bilan.

Trois étages, dans cet ordre, parce que chacun rend le suivant utile :
**restituer → citer → suspendre.** Les deux étages suivants — cataloguer une table
d'interventions signée, puis formuler ce qu'une ligne signée a déjà décidé — sont
nommés hors périmètre et ne s'ouvrent pas ici.

## Ce qui a causé cette campagne

Mesuré en production le 2026-09-13, one-off `scalingo run -d`, dé-identifié :
**28 patients, 7 épisodes T0 confirmés, 1 seule sélection de priorité, zéro
version de protocole C1.** L'unique ligne de `protocol_drafts` date du 2026-07-31
et porte un contrat d'observation alimentaire — ce n'est pas un protocole.

`D-179` (2026-09-13) a levé le premier obstacle : le rail marquait « Décision 21 j :
renseignée » sur une phase qui attendait encore son geste. Ce qui reste est
derrière cette porte, et un brainstorm du 2026-09-14 en a dressé la carte —
22 agents, six inventaires, quatre conceptions sous angles imposés, douze critiques
adverses, puis une lecture propre des pièces maîtresses.

**Ce que ce brainstorm a écarté compte autant que ce qu'il a retenu.** La voie
générative — un modèle qui choisit le type d'une action, son intitulé et ses trois
plans — ne tient sur aucune des trois lentilles : un claim prescriptif validé
atteste sa fidélité à un verbatim, pas son applicabilité ; et `servirRayonCorpus`
est une recherche vectorielle, un instrument de lecture, jamais une matière fermée
pour un modèle.

## Résultat observable

1. Le praticien qui ouvre le constructeur **voit la priorité qu'il vient de retenir**,
   ses limitations et son statut, à côté des champs qu'il remplit — au lieu de saisir
   trois plans en aveugle.
2. Aucun champ ne se pose plus en silence : ni le type d'une action (aujourd'hui
   `'food'` par défaut, servi au patient comme « Alimentation » même sur une
   orientation médicale), ni la charge thérapeutique.
3. **Le patient reçoit les trois actions**, et non la première seule ; il lit sur
   quel axe on travaille ; une intervention suspendue se lit comme suspendue.
4. La raison d'être du protocole peut **citer** deux sources et deux seulement, et
   tout ce qui part au patient passe une garde de registre — que le praticien peut
   lever, par un geste explicite et distinct.
5. Le praticien peut **mettre une action en attente d'un bilan**, ce qui déclenche
   enfin la boucle arbitrage → révision, livrée et indéclenchable depuis des semaines.
6. Les quatre rayons de corpus dormants sont ouverts : 986 claims de conduite
   validés cessent d'être hors d'atteinte pendant qu'on compose.

## Ce qui est mesuré, et ce qui ne l'est pas

**La campagne se clôt sur ses livrables verts en CI.** L'usage se mesure ailleurs,
dans un bilan séparé, sur dossiers réels lus par identifiant au conteneur.

Cette séparation est délibérée et vient d'un échec consigné : le bilan `D-112` a
constaté **zéro usage** de tout ce que les campagnes 6.0-A et 6.0-B avaient
construit, et la file d'attente en a tiré la leçon — « le goulot constaté n'est pas
l'ingénierie, c'est le temps praticien ». Une campagne qui attendrait une
consultation pour se clore resterait ouverte des semaines ; une campagne qui
confondrait « livré » et « utilisé » mentirait.

## Les douze arbitrages du 2026-09-14

| # | Question | Tranché |
|---|---|---|
| 1 | Périmètre | Étages 0, 1 et 2 — jusqu'au geste biologie |
| 2 | Rayons dormants | Ouvrir les quatre : sommeil, stress, humeur, nutrition |
| 3 | Sources citables | Libellé d'axe signé + tête d'objectif négocié |
| 4 | Une action ou trois | Corriger le portail dans la même campagne |
| 5 | Garde de registre | Tout ce qui part au patient, en refus **confirmable** |
| 6 | Place en file | Nouvelle campagne au créneau primaire |
| 7 | Clôture | Les étages livrés et verts en CI |
| 8 | Charge thérapeutique | Écrire un barème signé |
| 9 | Geste V4 | Le praticien pose, et **seulement pour suspendre** |
| 10 | Portail | Brancher le contrat patient qui existe déjà |
| 11 | Barème | Mécanisme livré, première ligne écrite par le praticien |
| 12 | Fiche conseil | Renommer le bouton vers ce qu'il fait vraiment |

## Trois corrections établies au cadrage

1. **Aucun arbitrage du 2026-09-11 ne confie le geste V4 au praticien.** Il n'existe
   ni au registre, ni aux fragments, ni à la file. Ce qui existe : `D-130` qui dit
   « le geste d'écran reste dû », l'entrée de file qui pose **deux chemins sans les
   départager**, et une contradiction ouverte dans le code —
   `ProtocolMiniBuilder.tsx:255-260` interdit la saisie manuelle au nom de `D-056`,
   quand l'en-tête de `biologie-arbitrage-revision.spec.ts:17-24` affirme l'inverse.
   **Le LOT-05 le tranche par décision, et réécrit le commentaire.**
2. **`purpose` est la raison d'être du protocole entier**, pas d'une action :
   `ProtocolAction` ne porte aucun sous-titre. C'est `purpose` que le patient lit,
   en `subtitle` de son écran d'accueil.
3. **Le chemin sortant du protocole est absent de la carte de `vocabulaire.ts`** —
   ce que ce fichier qualifie lui-même de « chemin sans garde, [qui] n'a pas le
   droit d'exister ; c'est le gate des campagnes 6.0 ». La garde du LOT-00 n'est pas
   une amélioration : c'est une infraction en cours.

## Ce qui rend la campagne plus petite qu'attendu

- **`buildPatientProtocolView` existe, est testé, projette les trois actions** avec
  libellé d'axe, phrases d'attente et limitations — et **n'a aucun appelant de
  production**. La route du portail réécrit à la main une projection plus pauvre,
  recopiée une seconde fois dans `praticien/ja/cycle/route.ts`.
- **Le libellé d'axe se re-dérive au serveur sans que l'écran désigne quoi que ce
  soit** : `protocol_drafts.selected_priority_id` est persisté, et
  `resoudreRegleSignee` — l'adaptateur borné de `D-115` — recopie déjà
  `PRIORITY_RULES_V1[id].libelle` depuis le registre signé, fail-closed.
- **Tout est livré jusqu'au corps de la requête HTTP** pour l'étage 2 : contrat V4,
  moteur de validation, route, table d'arbitrage, boucle de révision, garde
  `refusResolutionSansArbitrage`. Ce qui manque tient dans un écran.
- **Aucune migration Prisma n'est due.** `interventionStatus`, `waitFor` et `phases`
  vivent dans le `payload` JSON versionné (`D-056` arbitrage 6) ; le barème de charge
  est une table TypeScript signée, comme `INDICATIONS_BIOLOGIE_V1`.

## Les lots

| Lot | Titre | Décision requise | Dépend de |
|---|---|---|---|
| LOT-00 | La frontière patient du protocole 21 jours | **oui**, avant tout code | — |
| LOT-01 | Ouvrir les quatre rayons dormants | oui (décision praticien datée) | — |
| LOT-02 | Restituer, et refuser le silence | non | — |
| LOT-03 | Ce que le patient lit vraiment | non (portée par LOT-00) | LOT-00 |
| LOT-04 | Citer | non (portée par LOT-00) | LOT-00, LOT-02 |
| LOT-05 | Suspendre | **oui** (amendement `D-056`) | LOT-02 |
| LOT-06 | Le barème de charge | **oui** + première ligne signée | LOT-02 |
| LOT-07 | Bilan | non | tous |

## Contraintes non négociables

- **Aucune règle clinique n'est proposée par cette campagne** : ni intervention, ni
  conduite, ni seuil. Le barème du LOT-06 reçoit son contenu du praticien, jamais
  de la machine (`DC-19`, `DC-20`).
- **Aucune migration Prisma**, aucune modification de `schema.prisma`.
- Aucune identité réelle au dépôt ; fixtures limitées à Sophie Nicola,
  Jennifer Martin et Michel Dogné ; aucun seed ni E2E visant un dossier réel
  (`D-075`). Une fixture prouve un mécanisme, elle ne décrit pas un parcours
  (`D-125`).
- Textes UI en français ; aucun secret en dur ; changements minimaux.
- Décisions `D-xxx` : **numéro pris au merge**, jamais réservé d'avance, et
  `gh pr merge --squash --subject` porte le bon numéro.
- Clôture (`SESSION_LOG` + fragment de handoff) **avant** la PR, pas après le merge.

## Hors périmètre, nommé

**Étage 3 — cataloguer** : une table d'interventions signée reliant un axe à une
conduite. Aucune table du dépôt ne fait ce lien aujourd'hui ; la table des priorités
dit d'elle-même qu'« elle désigne des axes, elle ne prescrit rien ». Elle demande
une curation praticien en voie lente, et ne se livre jamais vide.

**Étage 4 — formuler** : le modèle met en mots les trois plans d'une action dont le
type, l'intitulé et le fondement viennent déjà d'une ligne signée. Ne s'ouvre pas
avant l'étage 3, et demande sa propre décision, que `D-094` §4 a écrite d'avance.

Restent également hors périmètre, nommées : l'hydratation du constructeur depuis la
version active, la caducité silencieuse de la diffusion, `versionsLues` non remonté
au rail, et `adviceSheetRef` — mort de bout en bout, dette consignée au LOT-03.

---

## ÉTAT AU 2026-09-15 — sept lots sur huit

| Lot | État |
|---|---|
| LOT-00 | livré — `D-189` |
| LOT-01 | livré — `D-188` |
| LOT-02 | livré |
| LOT-03 | livré en deux PR — `D-191`, `D-192` |
| LOT-04 | livré en deux PR — la garde de registre, puis `D-193` |
| LOT-05 | livré — `D-190` |
| LOT-06 | livré en deux PR — `D-196` (l'échelle, hors service), puis `D-198` (déclarée conforme, en service) |
| LOT-07 | bilan écrit — **mesure faite le 2026-09-16 : zéro usage** |
| LOT-08 | **contre-revue adverse de campagne** — hors cadrage, né d'elle (`D-200`) |

**Neuf décisions** rendues : `D-188` à `D-193`, puis `D-196`, `D-198` et `D-200`.
**Zéro migration, zéro drapeau neuf, zéro identité patient** — et ces trois affirmations
se bornent aux huit lots : la contre-revue a montré qu'elles deviennent fausses dès qu'on
les reprend sans les borner à la fenêtre de la campagne (`D-200`).

## CE QUE LA CONTRE-REVUE A RÉFUTÉ (2026-09-16), et que ce dossier affirmait

Vingt-six affirmations soumises, **six réfutées**. Les corrections tiennent en six lignes,
et elles remplacent ce que les sections ci-dessus disaient :

1. **Deux descriptions de la vue patient subsistent**, pas une : `ProtocolConsultationPanel`
   en écrit une à la main et ignore `interventionStatus` ; elle est inerte en production.
2. **Le refus ne se voyait des deux côtés que sur un motif sur cinq** — corrigé au LOT-08.
3. **`purpose` traverse toujours en texte libre** : c'est `D-193` qui a déplacé le constat
   à la lecture. Le dossier décrivait le plan d'origine.
4. **La garde de registre porte quatre champs** quand la route patient en servait six —
   `priorityLabel` vient d'un registre signé, `adviceSheetRef` est fermé depuis `D-200`.
5. **Le constructeur pose encore `active` en silence** sur les actions non suspendues.
6. **`adviceSheetRef` n'était pas « mort »** mais non alimenté : écriture et service
   étaient ouverts. Fermés depuis.


**Les huit lots sont livrés, et le barème est en service** : la déclaration de
conformité a été rendue le 2026-09-15 après relecture — qui a d'ailleurs corrigé le
motif de `CHARGE-01`, lequel affirmait faux à zéro action engagée (`D-198`).

## LA CAMPAGNE EST CLOSE LE 2026-09-16, ET SON USAGE EST MESURÉ À ZÉRO

La mesure a été faite au conteneur, comptages seuls, sans champ nominatif — le
praticien a ouvert une session **hors mode auto** pour lever le refus du classifieur,
qui portait sur la forme de la commande et non sur son contenu.

| Mesure | Valeur |
|---|---|
| Versions de protocole en base | **1** — contrat `ja-food-observation-v1`, du 2026-07-31 |
| Versions écrites depuis le 2026-09-14 | **0** |
| Versions relues, approbations de diffusion, points d'étape | **0**, **0**, **0** |
| Sélections de priorité | **3** (1 au 2026-09-13) |
| Épisodes T0 | **8** (7 au 2026-09-13) |

**Aucune version de protocole C1 n'existe en production.** L'entonnoir a bougé d'un
cran — la phase Décision se franchit, c'est ce que `D-179` a débloqué — et il
s'arrête à la phase Actions, exactement là où cette campagne a travaillé.

**Ce zéro mesure un jour, pas une adoption** : la campagne est déployée depuis le
2026-09-15 au soir. C'est la **ligne de base** contre laquelle la prochaine lecture
se comparera, pas un verdict sur les livrables. La requête est conservée au dossier
du LOT-07, telle quelle, pour qu'aucune reformulation ne déplace la question entre
deux lectures.

**Ce qu'il confirme** : `D-112` avait raison sur le goulot — « le goulot n'est pas
l'ingénierie, c'est le temps praticien ». Trois campagnes de suite l'ont désormais
mesuré. Le créneau primaire s'ouvre ; **son attribution reste un geste du
responsable**, et l'ouvrir sans peser ce constat serait ouvrir à l'aveugle.

