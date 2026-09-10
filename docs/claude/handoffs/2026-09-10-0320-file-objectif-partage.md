# Handoff — la file de l'objectif partagé, une nuit de travail délégué

## Branche et état Git

`main` à `f09d3aff`. **Aucune PR ouverte.** Sept PR fusionnées dans l'ordre :
#975 (schéma de la fin d'objectif), #976 (départage de deux têtes), #977 (date
d'accord qui voyageait), #978 (textes `LIMITATION_*` figés), #979 (relance),
#980 (égalité de plainte), #981 (constats de sécurité lisibles).

Travail mené sous délégation explicite du 2026-09-10 (« prend la main sur github
pour la semaine »), consignée en mémoire jusqu'au 2026-09-17, **production
exclue**.

## Ce qui a changé, et pourquoi c'était bloquant

**Le parcours à deux voix était fermé.** Deux têtes de chaîne refusaient les
TROIS gestes du patient en 409 sans qu'aucun geste ne puisse les ramener à une :
`supersedes_objectif_id` est à **parent unique**, donc ajouter une ligne retire
une tête et en ajoute une — aucune suite d'ajouts ne fait décroître leur nombre.
Ce n'était pas une lacune d'implémentation mais une propriété du modèle, et
l'estimation « 15-30 lignes sans migration » qui figurait en file était fausse.

Le verbe manquant est le motif `remplace` de `D-161`, appliqué en production le
2026-09-10 (run `34414718699`, constaté par conteneur : table présente, douze
colonnes, dix CHECK, zéro unicité, RLS deny-all, zéro ligne).

**Ce que cela lève au passage, et que personne n'avait nommé** : une chaîne close
sort du compte des actives, donc un dossier peut désormais porter un objectif
atteint l'an dernier ET un objectif courant. Avant, le modèle ne supportait
qu'**une** chaîne par patient, pour toujours.

**Une date fausse pouvait atteindre un patient.** Le formulaire n'est jamais
démonté : une date d'accord saisie puis abandonnée survivait dans l'état React et
repartait avec la version choisie ensuite. Mesuré, pas supposé — sans le vidage,
« APRÈS RÉOUVERTURE = 2026-09-03 ».

## Deux arbitrages laissés ouverts, et ils vous appartiennent

### 1. Le rail de la phase 3 — d'où viennent les données

Le statut ne lit que les couvertures des douze besoins : un dossier sans le
moindre objectif s'affiche « Compréhension — renseignée » (`D-161` §10). Le
corriger demande de décider **d'où le rail apprend l'état de la phase**, et les
deux voies coûtent quelque chose de réel :

- **Un second appel** depuis `FichePatientPanel` — mais le GET des objectifs
  JOURNALISE l'accès au dossier (`G-TRUST-04`), et le code nomme déjà cette
  cicatrice : « le journal se remplirait de lignes que personne n'a demandées ».
- **Étendre `/api/praticien/equilibre`**, que la fiche appelle déjà — pas de
  journal supplémentaire, mais une route clinique qui se met à lire les tables
  d'alliance.

Une troisième voie existe et je la crois mauvaise : faire remonter l'état par les
panneaux enfants. Ils ne sont montés qu'à l'entrée en phase 3 — le rail
mentirait donc encore au premier chargement, c'est-à-dire exactement quand on le
lit.

### 2. Séparer signé et non signé à l'écran — la forme

Le principe est validé (arbitrage du 2026-09-10). Ce qui reste est une décision
de **présentation clinique** : les limitations arrivent de TROIS sources
fusionnées puis dédoublonnées — celles de la règle relue, les quatre textes du
moteur, le motif de la gate de population (`chaineC1.ts:513-534`,
`DecisionSummaryCard.tsx:58-62`).

Le piège : grouper sous un titre comme « ce que la règle relue dit » **est** une
forme de tampon. Vous aviez demandé de ne pas badger le signé, précisément pour
ne pas sur-promettre une certification que le SHA ne couvre pas. Ma proposition,
à valider ou à corriger : deux groupes aux intitulés **factuels sur la
provenance**, dont le second dit l'essentiel —

> « Limitations de la règle » / « Ajoutées par le moteur (hors périmètre signé) »

Le second intitulé est la vérité que le bilan descriptif a établie ; le premier ne
promet rien de plus que l'origine.

## Ce que la nuit a appris sur les bancs

Trois gardes du dépôt m'ont attrapé, tous sur des choses que je n'avais pas pensé
à vérifier : la **déclaration RGPD** d'une table fille de `Patient` — la liste
d'échappement est un instantané daté, y ranger une table créée après serait une
falsification —, l'**anti-vacuité** du décompte rendu au praticien, et la
**matrice de consommation du savoir**, qu'une route sans rapport apparent avec le
corpus élargit tout de même par ses imports transitifs.

Et une leçon sur mes propres mutations : **muter UNE ligne ne prouve rien quand
plusieurs chemins se couvrent mutuellement.** Sur le vidage du formulaire, retirer
un seul des six appels laissait les trois bancs verts ; il fallait les retirer
tous pour les voir rougir. Un banc qu'on n'a pas vu tomber n'est pas un banc.

## Ce qui reste en file, hors les deux arbitrages

Rien de l'objectif partagé. Le reste de `FILE_ATTENTE.md` est inchangé.
