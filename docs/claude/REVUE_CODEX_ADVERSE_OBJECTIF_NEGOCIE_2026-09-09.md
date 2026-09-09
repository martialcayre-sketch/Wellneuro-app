# Contre-revue adverse — construction de l’objectif négocié

Date : 2026-09-09. Cible exclusive : `e67743dc`. Énoncé : `PROMPT_CONTRE_REVUE_CODEX_OBJECTIF_NEGOCIE_2026-09-08.md`, et copie fournie par le responsable.

**Verdict : le compte rendu ne peut pas commander les lots en l’état.** Son principal blocage fonctionnel résiste : une reprise peut ajouter une deuxième tête sans concurrence et interdire les gestes patient. En revanche, son affirmation sur l’absence d’exécution locale des contrats SQL est fausse ; son inventaire mélange consommation applicative, consommation documentaire et données d’épreuve ; plusieurs absences sont des arbitrages explicites.

Aucun défaut P0 établi. Deux scénarios P1 supplémentaires sont retenus : restitution d’instrument fournie par le navigateur puis présentée comme publiée ; contestation acceptée après une révision concurrente et devenue invisible dans les deux lectures. Il s’agit de chemins de code établis, pas d’incidents observés en production.

## 1. Tableau des verdicts

| ID | Énoncé court | Verdict | Motif |
|---|---|---|---|
| N1.1 | Deux têtes, aucun départage | **ÉLARGIE** | Le blocage concerne les trois gestes du dossier ; un POST ordinaire direct ajoute aussi une racine, et reformuler les deux chaînes ne les fusionne pas. |
| N1.2 | Notification malgré surface fermée | **AFFAIBLIE** | Le couplage manque, mais l’e-mail mène à la connexion ; le 404 est ultérieur et le drapeau est documenté ouvert, sans vérification actuelle. |
| N1.3 | Aucun retour vers le praticien | **AFFAIBLIE** | L’absence d’alerte entrante est décidée ; D-154 choisit explicitement le journal Correspondance pour les échecs d’envoi. |
| N1.4 | Toute version remet en attente et renvoie un e-mail | **AFFAIBLIE** | Toute version déclenche une tentative ; absence d’adresse ou de SMTP peut empêcher l’envoi, et D-154 accepte cette même porte pour les révisions. |
| N1.5 | Rail Compréhension sans objectif | **RÉSISTE** | Ni le rail ni ses reprises « phase due » et « prochaine étape » ne consomment les états de l’alliance ; dette déjà relevée le 05/09. |
| N1.6 | Assemblage navigateur, sans rejeu ni erreur visible | **ÉLARGIE** | Tout échec HTTP est absorbé et peut survivre aux rechargements ; l’assemblée ancienne peut rester courante sans échéance. |
| N2.1 | Append-only applicatif | **RÉSISTE** | Pas de contrainte d’immutabilité ni d’unicité métier dans ces neuf tables ; les gardes ne prouvent pas un écrivain unique d’objectif. |
| N2.2 | Le serveur recopie la référence désignée | **RÉSISTE** | L’énoncé surnuméraire est ignoré, pas refusé ; la quatrième proposition est explicitement admissible au POST direct. |
| N2.3 | Quatre dates sans écrivain | **RÉFUTÉE** | Trois de ces colonnes sont écrites par les contrats SQL ; l’absence de producteur applicatif demeure vraie. |
| N2.4 | Fenêtre sur ancre de rang maximal | **RÉSISTE** | Le code utilise le rang, pas la date maximale ; la fermeture de J90 à J85 est déjà nommée dans le bilan. |
| N2.5 | EVA brute sans agrégation | **RÉSISTE** | Stockage et rendu bruts conformes à D-111 ; les deux composants sont couverts par la garde, dans les limites de son analyse lexicale. |
| N2.6 | Aucun ancien geste visible au praticien | **AFFAIBLIE** | Deux familles restent visibles : amendements et réponses d’étape ; l’absence concerne les ratifications/contestations anciennes. |
| N2.7 | Date négociée perdue en révision | **ÉLARGIE** | L’intégration d’un amendement oublie aussi cette date ; une date déjà présente dans le formulaire peut être réutilisée sans lien avec la version choisie. |
| N3.1 | Chronologie entièrement exacte | **AFFAIBLIE** | Gate le 22/08, pas le 23 ; la première confirmation du 28/08 n’est pas une preuve de première persistance réussie. |
| N3.2 | Trois contradictions documentaires | **AFFAIBLIE** | Écarts réels, mais validation ultérieure et commentaires de comportement par défaut ne prouvent pas quatre déclarations fausses sur la production. |
| N3.3 | Couverture segmentée | **RÉSISTE** | Aucun parcours complet praticien → notification → patient ; le producteur de fixture hors garde ne constitue pas un contournement applicatif observé. |
| N3.4 | Dix silences et classement sans client | **RÉFUTÉE** | Deux faux positifs dans l’échantillon de six, et un gate effectivement consommé par une décision humaine. |
| N3.5 | Arbitrages code/commentaire corrects | **RÉSISTE** | Les quatre contradictions citées échantillonnées donnent le bon comportement ; leur qualification exige les réserves de N3.2. |
| N3.6 | Contrat des index exécuté seulement en CI | **RÉFUTÉE** | `test:worktree` extrait puis exécute ces contrats, y compris en mode `--fast` ; le contrat vérifie bien les deux index. |

## 2. Preuves et corrections du compte rendu

Les références de lignes ci-dessous désignent **le contenu à `e67743dc`**. Les chemins abrégés `api/…` et `lib/…` sont sous `web/src/` ; les campagnes sont sous `docs/claude/campagnes/`. Les composants sont ceux du tableau de périmètre de l’énoncé. Le checkout était à `78998b90` au départ et a avancé pendant cette lecture jusqu’à `f8fc09b8`, par une activité extérieure. Aucun checkout ni modification de ces changements n’a été effectué. Les fichiers différents ont été lus par `git show e67743dc:chemin` ; la stabilité des routes et modules centraux de l’alliance a été vérifiée par diff. En particulier, ne pas appliquer les numéros de `docs/DECISIONS.md` au document actuel sans rechercher D-xxx.

### N1.1 — ÉLARGIE : blocage durable, trois gestes fermés

Chemin ordinaire : `ObjectifNegociePanel.tsx:765` propose « reprendre » alors qu’un objectif existe → le corps porte `idProposition`, sans `supersedesObjectifId` → `api/praticien/objectifs/route.ts:755` refuse précisément l’association reprise + révision → `verifierReprise`, lignes 504–555, vérifie proposition, assemblée et disposition, **pas le nombre d’objectifs** → la transaction des lignes 890–907 crée un objectif racine et sa disposition → notification ligne 912.

Le contrepoids de la révision, `route.ts:771` puis `:795`, ne s’applique pas à une nouvelle racine. L’édition ordinaire est cachée quand un objectif existe (`ObjectifNegociePanel.tsx:591`), mais un POST ordinaire direct est aussi accepté et crée une racine (`route.ts:873`). L’appartenance reste vérifiée ; ce n’est pas un accès anonyme.

Déroulé de `objectifNegocie.ts:320` et `:345` :

| Lignes présentes | Références remplacées | Têtes |
|---|---|---|
| A ; B | aucune | A, B |
| A ; B ; A′ → A | A | A′, B |
| A ; B ; A′ → A ; B′ → B | A, B | A′, B′ |

Une ligne possède un seul prédécesseur : elle remplace au plus une tête. Réviser chaque chaîne conserve donc deux têtes ; choisir B′ comme successeur de A′ laisserait encore B. Aucun verbe applicatif lu ne fusionne deux lignées ni ne retire une racine.

Effet : `api/portail/dossier/route.ts:490` rend `ratifiable:false` ; la garde commune `verifierVersionVisee`, lignes 603–634, rejette **ratification, amendement et réponse d’étape** en 409. Le message promet que le praticien départagera ; le cockpit attribue la situation aux reformulations simultanées (`ObjectifNegociePanel.tsx:924`), alors que la reprise séquentielle suffit.

La recherche de contrepoids dans les routes, modules, scripts et fixtures n’a trouvé aucun outil de réparation conservant le dossier et son histoire. L’effacement applicatif détruit le dossier entier ; les nettoyeurs E2E ne sont pas une fonction praticien. Un SQL de maintenance pourrait changer les données, mais ce n’est pas un recours produit autorisé. **L’effacement RGPD ne doit pas devenir une solution fonctionnelle à ce blocage.**

Qualification : la course entre deux révisions est déjà nommée dans `campagnes/2026-08-21-alliance-dossier-deux-voix/lots/LOT-02-objectif-negocie-v1.md:130`. La reprise ajoute un déclencheur sans course. Le défaut n’est donc pas la découverte d’une absence d’UNIQUE ; c’est l’extension de la dette à un geste proposé par l’écran, aggravée par deux messages inexacts.

### N1.2 — AFFAIBLIE : promesse sans vérification de disponibilité

Les deux branches atteignent `notifierObjectifPropose` : création ordinaire ligne 877, reprise après transaction ligne 912 de `api/praticien/objectifs/route.ts`. Le helper des lignes 434–446 ne lit aucun drapeau ; seuls les chemins de proposition sont gardés par `WN_OBJECTIF_PROPOSE`. La route de rédaction manuelle reste ouverte si la surface patient est fermée.

Le gabarit réel, `lib/correspondance/registreGabarits.ts:437`, dit « le contester ou de proposer une autre formulation ». `lib/consultation/email.ts:214` construit cependant une URL de **connexion**, `/portail/connexion`, pas l’URL directe du dossier. Le 404 décrit bien `app/portail/[token]/dossier/page.tsx:19` ; le GET dossier rend 503 si le drapeau manque (`api/portail/dossier/route.ts:321`), et `LienDossierDeuxVoix.tsx:46` cache le lien après son probe.

La chaîne exacte est donc : enregistrement → tentative d’e-mail → connexion → surface dossier absente, et non « cliquer le lien reçu rend immédiatement 404 ». D-110 (`docs/DECISIONS.md:3739`) documente le drapeau ouvert depuis le 23/08 ; D-154 (`:80`) le documente encore ouvert le 08/09. **Le scénario drapeau éteint est théorique dans les pièces disponibles**, pas un incident de production démontré.

Avec les drapeaux ouverts, N1.1 fournit en revanche un chemin applicatif complet : seconde reprise → second appel à l’envoyeur → deux têtes → aucun des gestes promis disponible.

### N1.3 — AFFAIBLIE : deux décisions, une observabilité imparfaite

Chemin entrant : `api/portail/dossier/route.ts:791`, `:822` et `:845` créent respectivement étape, amendement et ratification, puis rendent 201. Aucune notification praticien n’en part. Les lectures du fil, nouveaux patients, Météo, Momentum et des reprises de `statutPhase` n’ont pas révélé de compteur de réponse à l’alliance. Les mots `objectif`/`objectifs`, `ratification`/`ratifications`, `amendement` et les symboles Prisma ont été croisés avec les imports et appelants. Le contrepoids est la relecture du panneau, pas une alerte ailleurs.

Cette absence est explicitement bornée dans `api/portail/dossier/route.ts:76` et par D-111 (`docs/DECISIONS.md:3618`). Elle ne justifie pas un lot de notification entrante.

Chemin sortant : `notifierObjectifPropose` → `envoyerAccesTrace` (`lib/consultation/email.ts:31`) → journal de correspondance → 201 ne contenant que l’objectif → le panneau ne lit que `ok/error` et recharge (`ObjectifNegociePanel.tsx:519`). `Non_envoye` est produit sans SMTP, `Erreur` en cas d’exception SMTP, `Envoye` après acceptation par le relais. Le statut se lit dans Correspondance (`FichePatientPanel.tsx:1774`), sans `erreurCourte` : champ journalisé dans **`lib/correspondance/patient.ts:53`**, omis par `api/praticien/correspondance-medecin/route.ts:241`.

Le chemin `lib/patient/patient.ts` cité dans la question n’est pas le fichier de cette fonction ; c’est une correction de référence, pas une réfutation du comportement.

Contrairement à « jamais décidé nulle part », **D-154 §5 choisit explicitement le journal Correspondance et le caractère non bloquant de l’envoi** (`docs/DECISIONS.md:105`). Cela ne prescrit pas positivement le silence du panneau, mais empêche de présenter son absence de retour comme un arbitrage entièrement oublié.

Limite supplémentaire : absence d’adresse → retour dès `objectifs/route.ts:440`, avant journalisation ; échec du journal → exception absorbée par `lib/correspondance/patient.ts:55`. « L’échec se lit dans Correspondance » n’est donc pas garanti pour toutes les branches. Ce point est intégré au correctif R2, pas compté deux fois comme trouvaille neuve.

### N1.4 — AFFAIBLIE : nouvelle version, nouvel état, nouvelle tentative

`etatRatification` (`objectifNegocie.ts:417`) filtre sur l’identifiant exact avant de choisir le dernier geste. Une nouvelle version sans geste reste `en_attente` ; le consentement précédent n’est pas transféré. Cette séparation est conforme au modèle de version.

La reprise atteint réellement l’appel : garde de session/appartenance → cycle ouvert → drapeaux de propositions → proposition de l’assemblée courante sans disposition → fragment anamnèse → préparation → transaction objectif + disposition → ligne 912. Le mock des tests n’établit pas la réception : dans les cas sans adresse, le helper retourne avant l’envoyeur. Les assertions explicites de notification commencent à `objectifs/route.test.ts:1053` pour la rédaction ordinaire ; aucune assertion équivalente trouvée pour la reprise.

Trois corrections après une première rédaction produisent **quatre appels au helper**, dont trois dus aux corrections. Si adresse et SMTP sont disponibles, cela peut produire quatre envois en dix minutes. Ni middleware applicable à ces API, ni route, ni envoyeur ne pose de cadence ou de dédoublonnage. Cette dette est déjà nommée (LOT-02, ligne 138 ; `SESSION_LOG.md:4566`).

D-154 §7 (`docs/DECISIONS.md:122`) exclut une autre porte pour les révisions, pas leur passage par la même notification. D-110 (`:3813`) nomme l’absence de marque « intégré » et de limitation à une citation. Il n’y a pas contradiction code/décision à réparer.

Conséquence de portée : la nouvelle version en attente masque aussi l’invitation à répondre à une étape, puisque `DossierDeuxVoixView.tsx:551` exige un état ratifié ou « dit autrement ». Le serveur accepte volontairement d’autres états si version et fenêtre sont valides (D-111, `:3677`). La fenêtre et la ratification ne sont pas la même précondition.

### N1.6 — ÉLARGIE : échec durable et fraîcheur non garantie

Seul appelant navigateur de l’assemblage : `ClinicalRuntimeSection.tsx:928`. Le panneau objectif fait GET et écart, puis POST objectifs pour la reprise ; les occurrences de tests ne sont pas des appelants de production. Le POST cockpit persiste la confirmation puis rend `ready` ; le composant lance ensuite `void assemblerPropositions(payload)` (`:894`). Le GET cockpit rejoue la donnée persistée (`api/praticien/cockpit/route.ts:438`, `:474`), sans assemblage.

L’échec réseau est absorbé ; **tous les statuts non OK**, pas seulement 503, sont silencieux (`ClinicalRuntimeSection.tsx:956`). L’épisode peut ainsi être confirmé alors que les propositions manquent. Recharger rejoue l’épisode sans retenter : le défaut peut durer jusqu’à un nouveau déclenchement effectif ou une intervention explicite. « Après confirmation » ne signifie pas livraison garantie.

La précondition de l’interface n’est pas inconnue : `ObjectifNegociePanel.tsx:743` dit déjà que les propositions arrivent après un épisode confirmé. En revanche, **le POST assembler ne vérifie pas lui-même l’existence d’un épisode** : il vérifie session, appartenance, état du dossier, drapeaux et sources. Le POST direct d’un praticien autorisé peut donc assembler sans cycle. « La machine ne peut proposer qu’aux dossiers avec cycle » est vrai du parcours livré, pas une impossibilité d’API.

Enfin, `propositions-objectif/route.ts:693` rend l’ancienne vue quand le résultat nouveau est vide. `assembleeCourante` (`propositionObjectif.ts:473`) utilise la date d’assemblage stockée ; aucune durée de validité ne vient faire expirer l’ancienne assemblée. Elle reste courante jusqu’à une nouvelle assemblée non vide différente ; ses propositions peuvent aussi cesser d’être vivantes par disposition. Il n’existe pas de délai maximum calculable. Le hash sert réellement à l’idempotence, sans détecter spontanément un changement de source entre deux assemblages.

### N2.3 — RÉFUTÉE : trois écrivains SQL, zéro écrivain applicatif

Recherche distincte des quatre noms SQL et Prisma, dans `web/src`, `web/prisma` et `web/e2e`, puis lecture des préparateurs et des insertions :

| Colonne précisément visée | Application | Contre-exemple dans le dépôt |
|---|---|---|
| `ratifications_objectif.geste_le` | Omise, donc NULL | Aucun écrivain trouvé ; déclarations et listes de forme ne sont pas des écritures. |
| `amendements_objectif.exprime_le` | Omise, donc NULL | `prisma/checks/alli_objectif_trois_voix_v1_negatif.sql:152` insère une date non nulle. |
| `reponses_jalon_objectif.repondu_le` | Omise, donc NULL | `prisma/checks/alli_jalons_objectif_v1_negatif.sql:115` insère une date non nulle. |
| `dispositions_proposition.dispose_le` | Omise, donc NULL | `prisma/checks/alli_objectif_trois_voix_v1_negatif.sql:136` insère une date non nulle. |

Ces cas positifs vivent dans des contrats annulés par `ROLLBACK`. Ils ne démontrent ni une date persistante ni un usage patient. Ils suffisent en revanche à réfuter le quantificateur **« écrites par personne » sur le dépôt**, puisque la question exigeait expressément d’inclure `web/prisma`.

Ne pas confondre l’amendement avec `desaccords_comprehension.exprime_le` : cette autre colonne possède un vrai producteur applicatif, `api/portail/comprehension/route.ts:301` puis `:346`, et des rendus datés dans `ComprehensionView` et `ComprehensionPanel`.

### N2.6 — AFFAIBLIE : deux familles visibles, une famille effacée de la lecture

`api/praticien/objectifs/route.ts:365` ne calcule les états que pour les têtes, mais ses DTO servent **tous** les amendements et réponses d’étape (`:161`, `:170`). `ObjectifNegociePanel.tsx:952` les rattache aux identifiants de chaque chaîne, et `:1026` fait de même pour les étapes. Textes, dates, jalon et EVA sont effectivement rendus. Dire qu’aucun ancien geste n’a de surface praticien est faux pour ces deux familles.

Le portail les range à part (`DossierDeuxVoixView.tsx:681` et `:706`). Son omission des anciennes valeurs EVA et du jalon est **explicitement commentée** lignes 717–720. Le cockpit, lui, promet de conserver le récit et affiche ces données (`:1050`). Le dossier contient bien deux traitements délibérés, pas une perte de stockage.

Les anciennes ratifications et contestations n’ont pas ce parcours de relecture : elles sont réduites à l’état de la tête courante, sans historique servi. Le pied « Aucune réponse du patient enregistrée » (`ObjectifNegociePanel.tsx:255`) peut ainsi accompagner une chaîne contenant une parole ancienne. Le scénario concurrent F2 rend cette absence particulièrement trompeuse.

### N2.7 — ÉLARGIE : deux entrées de formulaire et une date résiduelle

« Reformuler » recopie les champs du courant mais ne fait pas `setNegocieLe` (`ObjectifNegociePanel.tsx:1073`). « Intégrer cet amendement » fait le même oubli (`:994`). L’état date n’est changé que par l’initialisation, la remise à zéro après succès (`:528`) et le champ (`:1252`).

Avec un formulaire vierge : clic révision → date vide → POST sans déclaration → `preparerObjectif` rend `negocieLe:null` → nouvelle tête → `DossierDeuxVoixView.tsx:345` n’affiche plus « Convenu le ». L’ancienne date reste en base : perte de reprise dans l’interface, pas suppression de l’histoire.

Avec une date déjà saisie dans le formulaire : choisir ensuite une autre version ou intégrer un amendement ne la remplace pas ; le POST peut porter cette date résiduelle. Ce second scénario est plus large que la seule disparition.

Aucune justification correspondante n’a été trouvée dans les commentaires ni D-110/D-111/D-154. Cela ne permet pas de décréter qu’un accord ancien vaut pour une formulation nouvelle : le correctif doit expliciter s’il reprend la date à confirmer ou demande une nouvelle déclaration, sans l’inventer.

### N3.1 — AFFAIBLIE : archives, dates et preuve de persistance

| Événement allégué | Pièce à la cible | Conclusion |
|---|---|---|
| Gate 6.0-A le 23/08 ; cinq tables vides | D-092, `docs/DECISIONS.md:5657` et `:5693` ; `2026-08-21-alliance-dossier-deux-voix/CAMPAGNE.md:101` | Gate le **22/08**. Le 23 correspond à l’ouverture/documentation suivante. |
| 26/08 : neuf tables vides, 21 dossiers, zéro T0, drapeau absent | D-112, `:3485` ; `2026-08-23-alliance-objectif-trois-voix/BILAN.md:18` | Chiffres effectivement consignés, pour cette observation datée. |
| 28/08 : drapeau posé | `GRILLE_CONSTATS_2026-10-04.md:25` | Constat documentaire explicite. |
| 28/08 : premier T0 réel | `SESSION_LOG.md:4985` et `:5001` ; D-118 | Le journal raconte une confirmation perdue au rechargement, puis demande de **reconfirmer** après le correctif de persistance. Il n’établit pas que la première ligne persistée a ensuite été écrite. |
| 06/09 : quatre propositions, un objectif, zéro retour | D-154, `docs/DECISIONS.md:76` | État daté repris dans la décision du 08/09 ; pas une nouvelle lecture de base par cette revue. |
| 08/09 : D-154 | `docs/DECISIONS.md:69` | Décision et chronologie du canal présentes. |

Commande exécutée :

```sh
git grep -n -i -E '25 dossiers|vingt.cinq dossiers|25 patients|vingt.cinq patients' e67743dc -- '*.md' ':!archive/*'
```

Sortie : **aucune ligne**, code de sortie 1 lors de la recherche isolée. Des recherches complémentaires avec l’ordre mots/nombre inversé n’ont pas fourni de source pertinente. Conclusion bornée : « 25 dossiers » n’est pas sourcé dans les documents versionnés recherchés ; ce n’est pas un dénombrement de production.

L’inférence « absence de parole = absence de sujet » ne suit pas de ces chiffres : absence d’objectif, confirmation non persistée, assemblage non déclenché ou échoué, surface/authentification et fenêtre fermée sont des branches différentes. Le bilan (`BILAN.md:135`) rapproche rédaction d’objectif et ouverture des propositions ; le code montre que rédiger un objectif seul ne déclenche pas l’assemblage.

### N3.2 — AFFAIBLIE : écarts à qualifier, et autres contradictions

(a) D-154 et le changelog initial gardent `valideLe:null` ; le registre contient `2026-09-08` (`registreGabarits.ts:467`). Mais le commit de validation `5b455f9b` appartient déjà à l’ascendance de la cible. L’écart documentaire existe ; il ne prouve pas une approbation inventée ni une validation manquante.

(b) `playwright.config.ts:208` affirme encore une situation de production ancienne. En revanche, les commentaires du panneau et de l’assemblage décrivent aussi le défaut fail-closed et une éventuelle activation future. Un comportement par défaut reste vrai quand un déploiement particulier pose le drapeau. On ne peut donc pas compter les quatre occurrences comme quatre mesures fausses de la production.

(c) Cinq, sept et neuf sont bien présents. L’utilitaire E2E cible nettoie **sept** tables (`web/e2e/helpers/db.ts:90`), omettant propositions et dispositions ; `lib/patient/effacement.ts:177` efface les **neuf** dans sa transaction. Un reliquat de fixture n’est pas un effacement patient incomplet.

Autres contradictions identifiées :

- `schema.prisma:2431` dit que `motif` n’est pas nullable ; le champ est `String?` ligne 2441 et une reprise écrit légitimement NULL. Le caractère obligatoire est **conditionnel à l’écart**.
- `schema.prisma:2395` dit que la forme des fragments n’est gardée nulle part, en annonçant un module futur ; les constructeurs et gardes de 6.0-B existent. Ils ne prouvent toutefois pas l’authenticité de toute source : F1.
- `jalonObjectifDu.ts:39` annonce des bornes « affichées telles quelles » ; le dossier n’utilise pas les quatre champs de dates/étape future.
- Les deux commentaires périmés des ancres signalés par la question sont versés ici sans rejouer la vérification de la migration.
- « Caducité dérivée du hash » (`schema.prisma:2434`) omet l’étape effective : la vue choisit la dernière date d’assemblage persistée ; sans nouvel assemblage, un changement de source ne retire rien.

### N3.4 — RÉFUTÉE : le classement mélange les niveaux de consommation

Le §4 du présent rapport fournit le balayage et l’échantillon. Les deux colonnes tirées possèdent un écrivain SQL ; le gate a un consommateur humain nommé dans D-092/D-093 ; les colonnes non servies au patient peuvent vivre côté praticien. Une donnée absente d’un écran, une donnée jamais consommée par l’application et une donnée sans aucun client ne sont pas trois formulations interchangeables.

Cela réfute le classement global non qualifié, pas chacune des dix observations d’absence de rendu.

### N3.6 — RÉFUTÉE : le contrat SQL a un appelant local

Sans rejouer la preuve de la migration : `web/prisma/checks/episodes_identite_cycle_v1.sql:26` inspecte **les deux** index `assessment_episodes_ancre_unique_idx` et `assessment_episodes_mesure_cycle_unique_idx` dans `pg_index`, leur unicité et leur caractère partiel. Les lignes 41–45 inspectent les colonnes. Les cas des lignes 94, 110 et 127 éprouvent doublon d’ancre, doublon de jalon dans un cycle et autorisation d’un autre cycle ; les NULL de cycle sont délibérément traités séparément. Le fichier ne se limite pas au CHECK.

`web/package.json:41` appelle `scripts/wn-test-worktree.sh`. À la cible, ce script possède un palier « Contrats SQL » ligne 475, **hors du saut des contrôles longs en mode fast**. Il extrait les chemins depuis CI, refuse une liste vide, exécute chacun et compare le nombre joué au nombre attendu (lignes 489–509). `npm run check` seul ne fait pas cette exécution ; `npm run test:worktree -- --fast` la fait.

Commande de lecture exécutée :

```sh
git show e67743dc:.github/workflows/ci.yml |
  sed -n 's|.*--file \(prisma/checks/[A-Za-z0-9_./-]*\.sql\).*|\1|p' |
  sort -u |
  rg 'episodes_identite|alli_|assignations_unicite'
```

Sortie :

```text
prisma/checks/alli_dossier_deux_voix_v1_negatif.sql
prisma/checks/alli_jalons_objectif_v1_negatif.sql
prisma/checks/alli_objectif_trois_voix_v1_negatif.sql
prisma/checks/assignations_unicite_ouverte_v1.sql
prisma/checks/episodes_identite_cycle_v1.sql
```

Extrait lu dans le script cible :

```sh
npx prisma db execute --file "$contrat" > /dev/null < /dev/null \
  || die "contrat SQL en échec : $contrat"
```

Cette ligne a été **lue, pas exécutée** pendant la revue.

Autres familles d’index partiels rencontrées : assignation ouverte (migration `20260805140000`, ligne 211), composition sans forme (`20260724133000`, ligne 121), brouillon/validation actifs de règle clinique (`20260724133100`, lignes 30 et 36), plusieurs couples conditionnels de références biologiques (`20260725160000`, ligne 472 et suivantes), décision RAG sur issue (`20260725100000`, ligne 46), résultat biologique renseigné (`20260905074500`, ligne 61), racine de sélection C1 (`20260906143000`, ligne 60). Le contrat C1 inspecte notamment la racine unique partielle (`c1_selection_priorite_v1_negatif.sql:263`). Ne pas transformer cette liste de familles en certification de tous leurs cas SQL.

L’hypothèse « une migration supprime l’index et toute la suite locale reste verte » est donc fausse si ce palier est joué. Un `check` seul ne suffit pas ; une altération faite uniquement sur une base distante ne serait pas prouvée absente par une suite sur base neuve. Aucun tel incident n’a été observé. **Aucun lot de garde supplémentaire des ancres ne découle de N3.6.**

### Appui aux sept affirmations qui résistent

| ID | Vérification et borne |
|---|---|
| N1.5 | `FichePatientPanel.tsx:735` : Compréhension dépend des couvertures ; `:877` retourne avant le rail lorsque les données manquent. `phaseDue`, l’eyebrow et « Prochaine étape » réutilisent ces états. Le panneau objectif constitue une lecture locale, pas un signal sur le rail. Dette déjà décrite dans `REVUE_CODEX_ADVERSE_AUDIT_PARCOURS_2026-09-05.md:222`. |
| N2.1 | Les huit routes de l’alliance exposent GET/POST selon leur rôle, sans PATCH/PUT/DELETE. Les neuf tables ont chacune une **clé primaire**, donc une unicité d’identité ; « aucune UNIQUE » doit se lire « aucune unicité métier supplémentaire ». Ni FK patient ni CHECK ni RLS ne rendent les lignes immuables. `objectifNegocie.guard.test.ts:410` exclut les mutations destructives, pas les créations ; `propositionObjectif.guard.test.ts:360` cite l’écrivain objectif sans exiger que la liste soit exactement réduite à lui. Les mutations E2E sont des fixtures hors application. |
| N2.2 | `objectifNegocie.ts:228` prend `cible.enoncePatient` pour une révision même si le corps fournit autre chose ; `objectifs/route.ts:566` exige l’anamnèse pour une reprise. `:494` annonce expressément qu’une quatrième proposition courante peut être reprise directement : plafond de service, pas autorisation limitée aux trois cartes affichées. |
| N2.4 | `ancresPersistees.ts:58` trie par rang ; `api/portail/dossier/route.ts:507` passe son `confirmedAt`. L’ouverture d’un cycle écrit évidemment une **ancre**, mais pas une clôture de réponse d’étape : la fermeture est dérivée. `BILAN.md:166` nomme déjà J85/J90 comme question non tranchée. |
| N2.5 | `objectifNegocie.guard.test.ts:221` nomme les deux composants ; `:285` contrôle les usages de `reduce/sort`. Les rendus conservent 0 distinct de NULL. Recherche des usages EVA, des collections et de leurs imports : aucun agrégat applicatif trouvé. Une garde lexicale n’est pas une preuve contre tout futur calcul écrit autrement. |
| N3.3 | `portail-dossier-deux-voix.spec.ts` et `e2e/helpers/db.ts:122` démarrent sur objectif injecté ; `:611` injecte une ratification. La garde scanne seulement `src/app`, `src/components`, `src/lib` (`objectifNegocie.guard.test.ts:400`). Un futur module de production dans une autre racine, ou une écriture lexicalement différente, échapperait à ce contrôle ; aucun tel écrivain actif n’a été trouvé. `WN_OBJECTIF_PROPOSE` n’est pas épinglé dans la configuration E2E ; il pourrait être hérité de l’environnement. Des tests unitaires activent les mocks : « aucun banc » serait trop large hors contexte E2E. |
| N3.5 | Échantillon de quatre contradictions effectivement citées : appel d’assemblage, statut des drapeaux E2E, décompte du nettoyeur et validation du gabarit. Respectivement : `ClinicalRuntimeSection.tsx:928` fait le POST ; le commentaire E2E ne constate pas les drapeaux actuels ; le nettoyeur cible efface sept tables ; le registre porte une date. Les comportements choisis par le compte rendu sont corrects. La validation ultérieure et la distinction fixture/effacement corrigent la qualification, pas ces comportements. Aucun mauvais arbitrage de comportement trouvé dans ces quatre cas. |

## 3. Ce que le compte rendu a manqué

### F1 — CONFIRMÉE · P1 · Une restitution libre devient une citation d’instrument « publiée »

**Scénario :** un praticien authentifié et autorisé sur le dossier modifie le POST d’assemblage. Il garde un candidat réellement publié et le SHA courant, mais remplace `plainte.restitution` par un texte synthétique non publié, avec des identifiants syntaxiquement valides d’instrument et de domaine.

Chemin complet :

1. `api/praticien/propositions-objectif/route.ts:232` vérifie session, drapeaux et appartenance ; cela authentifie le praticien, pas le contenu scientifique du fragment.
2. `lirePlainte`, lignes 441–458, vérifie forme, identifiants et longueur. Il ne relit ni une restitution publiée ni un épisode.
3. La résolution des candidats, lignes 660–663, recopie le registre signé ; **elle sécurise la règle**, sans sécuriser la plainte instrumentale transmise séparément.
4. `assemblageProposition.ts:124` passe celle-ci à `depuisInstrument` ; `propositionObjectif.ts:142` marque directement le texte comme fragment d’instrument.
5. Le hash inclut ce texte (`assemblageProposition.ts:154`) ; l’empreinte d’un contenu fourni ne prouve pas sa provenance.
6. La route écrit le JSON à `:739`, puis le relit. `exposerFragments`, ligne 283, accepte texte non vide et objet source.
7. `ObjectifNegociePanel.tsx:193` affiche le texte ; `:126` le présente comme « Restitution publiée par … ».

**Effet établi :** un texte choisi par l’appelant est présenté au praticien comme citation publiée d’un instrument. Ce n’est ni une preuve de franchissement inter-dossiers ni une modification du moteur. La reprise ne le transforme pas directement en `enoncePatient` : la garde anamnèse de N2.2 tient.

D-094 (`docs/DECISIONS.md:5529`) ferme pourtant les sources à une restitution certifiée. D-115 (`:3312`) sécurise la recopie du registre des règles ; elle ne certifie pas ce second transport. Le commentaire général « l’appelant fournit » ne constitue pas un contrepoids à cette promesse de provenance.

P1 proposé pour l’intégrité de la citation présentée dans la préparation de l’objectif. **Aucune exploitation ni occurrence en base n’a été observée.**

### F2 — CONFIRMÉE · P1 · Contestation acceptée après une reformulation concurrente, puis invisible

**Scénario intercalé :**

| Ordre | Opération |
|---|---|
| 1 | Le patient voit v1 et envoie `conteste` sur v1. |
| 2 | `api/portail/dossier/route.ts:750` vérifie qu’il existe exactement une tête et qu’il s’agit de v1. |
| 3 | Le praticien crée v2 → v1 par `api/praticien/objectifs/route.ts:873`. |
| 4 | Le POST patient, après sa vérification, crée la ratification de v1 (`dossier/route.ts:845`) et rend 201. |
| 5 | Le patient reçoit « C’est transmis. Votre praticien le verra… » (`DossierDeuxVoixView.tsx:749`), puis recharge. |
| 6 | Les GET choisissent v2 ; `etatRatification(v2, …)` ne trouve rien. Aucune liste de ratifications anciennes n’est servie au patient ou au praticien. |

Aucune transaction commune ne relie la vérification de tête et l’insertion patient ; aucune contrainte ne coordonne ces deux routes. La version souple est bien vérifiée, mais cette vérification précède l’écriture. Le contrôle refuse une révision **déjà visible avant la vérification** ; il ne refuse pas ce scénario intercalé.

**Effet :** ligne conservée, succès annoncé, mais geste absent des deux lectures de l’alliance. Ce n’est pas une écriture physiquement perdue, donc pas un P0 démontré. C’est une ramification concurrente nouvelle de l’asymétrie de N2.6, et non un deuxième comptage du même besoin d’historique.

Afficher le geste sous sa version d’origine suffit à tenir la promesse de relecture. Interdire en plus toute écriture devenue ancienne nécessiterait un choix de sérialisation partagé avec l’écriture praticien ; déplacer simplement le `findMany` dans une transaction ordinaire ne prouve pas cette exclusion.

### F3 — CONFIRMÉE · P2 · Une clôture entre la garde et la notification échappe au raisonnement de D-154

**Scénario :** la création d’objectif lit un dossier ouvert (`api/praticien/objectifs/route.ts:658`) ; une autre requête clôt le suivi (`api/praticien/patients/cycle-de-vie/route.ts:115`) ; la première poursuit sa création et appelle le helper.

`notifierObjectifPropose` ne relit que adresse et prénom (`objectifs/route.ts:436`). La clôture intervenue depuis la garde n’empêche donc pas la tentative d’envoi. D-154 §6 (`docs/DECISIONS.md:112`) a supprimé cette seconde vérification en déclarant la branche inatteignable : ce raisonnement est vrai en exécution séquentielle seulement.

P2 : invitation possible après clôture, sans fuite inter-dossiers établie. Une relecture juste avant l’envoi couvre le scénario où la clôture est déjà enregistrée à cet instant ; elle ne peut annuler un message déjà remis au SMTP. Une promesse plus forte demanderait un autre contrat de concurrence, pas un simple test supplémentaire.

### F4 — PLAUSIBLE · P2 · Le volume peut amplifier les lectures et le calcul d’historique

Le GET dossier lance huit lectures de collections lorsque toutes les surfaces sont ouvertes (`api/portail/dossier/route.ts:357`). Les requêtes sont bornées **par dossier**, pas par nombre de lignes. Les GET praticien relisent aussi les historiques.

En compréhension, `etatDesaccord` parcourt les synthèses et appelle `chaineDeSynthese` (`syntheseComprehension.ts:363`), lequel reconstruit un index de toutes les synthèses à chaque appel (`:313`). Avec D désaccords et S versions, la borne pessimiste de cette composition peut atteindre **O(D × S²)**. Elle suppose suffisamment de publications postérieures qui obligent à poursuivre la recherche ; ce n’est pas le coût de chaque dossier réel.

La phrase « aucune pagination nulle part » est néanmoins excessive : propositions vivantes et caduques sont limitées à trois dans la vue (`propositions-objectif/route.ts:317`). Cette borne de réponse ne borne pas les lectures SQL précédentes, ni toutes les dispositions courantes.

**Maillon manquant :** distribution réelle des volumes, temps SQL, taille des réponses et temps de rendu. Aucune latence mesurée, saturation ou indisponibilité n’est affirmée. La première action serait une mesure sur données synthétiques ; aucune pagination générale n’est justifiée à ce stade.

### Autres ramifications parcourues, sans nouveau P0 établi

| Branche | Résultat et preuve |
|---|---|
| Ratifier et contester simultanément | Deux lignes peuvent être créées ; l’état prend le dernier `creeLe` puis l’identifiant (`objectifNegocie.ts:417`). C’est un ordre d’enregistrement, pas une preuve de l’ordre des intentions. Le modèle autorise le changement d’avis. |
| Patient répond pendant/après clôture | Le portail l’autorise expressément (`api/portail/dossier/route.ts:651` ; D-110, `docs/DECISIONS.md:3819`) ; la rédaction praticien renvoie 409. Asymétrie décidée, différente du défaut d’envoi F3. |
| Session expirée entre GET et POST | `portailAuth.ts:16` puis validation du cookie refusent le POST. Les formulaires conservent leur texte sur l’échec (`DossierDeuxVoixView.tsx:174`, `:219`). Le POST n’effectue pas la redirection de reconnexion du GET (`:109`). Un rechargement complet perdrait l’état local, mais une perte inévitable du brouillon n’est pas établie. |
| Effacement pendant un geste | Les neuf suppressions et la suppression patient sont dans la transaction `lib/patient/effacement.ts:177` puis `:212` ; les FK patient sont RESTRICT. Une insertion concurrente peut échouer ou faire échouer/annuler l’effacement, pas prouver un effacement réussi laissant l’une des neuf tables intacte. |
| Effacement pendant l’envoi | Après lecture de l’adresse, un message générique peut déjà être en vol. Aucune garantie d’annulation SMTP ; la journalisation ultérieure peut échouer si le patient a disparu. Aucun mécanisme de recréation du dossier trouvé. |
| Second cycle pendant une fenêtre | `ancreCourante` change la date de référence ; le POST étape la revérifie (`dossier/route.ts:780`). La fermeture dérivée est la dette J85/J90 déjà nommée, pas une suppression du récit. |
| Rejeu réseau de « Envoyer où j’en suis » | Pas de nonce d’idempotence ; si le premier POST a réussi mais sa réponse a été perdue, un second peut écrire une seconde ligne. D-111 exige aussi de conserver deux gestes réels : un UNIQUE patient/objectif/jalon violerait cette règle. La distinction entre réessai de transport et nouveau geste n’est pas représentée. |
| Appartenance et identité | Les routes praticien appellent `verifierAppartenancePatient` (`lib/praticien/appartenance.ts:46`), les lectures et références sont filtrées sur `idPatient`. Au portail, l’identité vient de la session validée, jamais du corps (`lib/consultation/portail.ts:35`). Aucun chemin servi d’un autre dossier établi. |
| Secret exposé | Aucun fichier d’environnement ni valeur de secret lu. Les mécanismes de signature/expiration ont été lus ; aucun secret en dur constaté dans ce périmètre. Cela ne vaut pas scan exhaustif du dépôt. |

## 4. Code sans client : inventaire adverse

### Convention de comptage et recherches

**V** = vivant ; **SP** = sans producteur applicatif ; **SC** = sans consommateur applicatif trouvé ; **I** = inatteignable dans les chemins applicatifs lus. Une écriture SQL de fixture est notée séparément. Un champ lu pour trier, rattacher, filtrer, autoriser ou servir de clé React est consommé, même sans libellé à l’écran. En revanche, recopier le champ dans un DTO sans lecture ultérieure ne suffit pas.

Les colonnes ont été cherchées sous leur nom Prisma et `@map` SQL, puis reliées aux symboles Prisma, sélections, sérialiseurs et composants importés. Pour les DTO sans orthographe SQL réelle, la recherche a croisé camelCase, décomposition des mots/snake_case et nom de type ou fonction : une orthographe inexistante n’est pas utilisée comme preuve indépendante à elle seule.

Les classements sont ceux des **clients présents dans le dépôt à la cible**, pas ceux d’éventuels clients externes inconnus. Aucun objet n’est classé « derrière un drapeau éteint en production » faute d’état actuel vérifié ; une branche gardée est décrite conditionnellement.

### 4.1 Les 65 colonnes scalaires des neuf tables

Chaque colonne figure une fois dans la colonne « inventaire ». Les noms sont ceux de Prisma ; les noms SQL suivent les `@map` du schéma. Les relations Prisma `patient` ne sont pas des colonnes supplémentaires.

| Table et schéma | Inventaire complet ; classement | Producteur | Consommateur réel et preuve |
|---|---|---|---|
| `objectifs_negocies`, `schema.prisma:2264` — 12 | **V** : `id, idPatient, enoncePatient, reformulationPraticien, priorite, nonTraiteMotif, nonTraiteDepuisLe, supersedesObjectifId, sourcePropositionId, negocieLe, creeLe`. **SC** : `praticienEmail`. | `praticien/objectifs/route.ts:873` et `:905` ; identité auteur issue de session, date d’enregistrement par défaut DB. | GET `:313` → chaînes/états → `ObjectifNegociePanel.tsx:303` et `:317` ; portail `dossier/route.ts:472` → `DossierDeuxVoixView.tsx:327`. Les deux `nonTraite*` vivent au cockpit ; les références vivent dans les calculs serveur. Auteur omis des deux sélections exposées. |
| `ce_qui_compte_entrees`, `:2299` — 5 | **V** : `id, idPatient, texte, saisiLe, creeLe`. | `portail/ce-qui-compte/route.ts:249` ; le patient peut déclarer `saisiLe`. | `praticien/ce-qui-compte/route.ts:89` → `CeQuiComptePanel.tsx:112` affiche les dates ; dossier patient rend le texte et la date déclarée, mais pas la copie de `creeLe` (J20). |
| `syntheses_comprehension`, `:2318` — 8 | **V** : `id, idPatient, texte, redigeeLe, publieeLe, supersedesSyntheseId, creeLe`. **SC** : `praticienEmail`. | `praticien/comprehension/route.ts:430`, nouvelle ligne y compris publication/révision. | GET `:232` → chaînes → `ComprehensionPanel.tsx:46` ; `syntheseServieAuPatient` → deux vues patient. Auteur absent des sélections. |
| `desaccords_comprehension`, `:2349` — 6 | **V** : `id, idPatient, idSynthese, texte, exprimeLe, creeLe`. | `portail/comprehension/route.ts:301` puis `:346` ; `exprimeLe` accepté par API, sans champ de date dans le formulaire livré. | `etatDesaccord` consomme référence/date ; `ComprehensionPanel.tsx:241` et `ComprehensionView.tsx:257` rendent texte/date. Les copies du dossier sont partiellement inutilisées. |
| `ratifications_objectif`, `:2371` — 6 | **V** : `id, idPatient, idObjectif, sens, creeLe`. **SP + SC** : `gesteLe`. | `portail/dossier/route.ts:845` ; date déclarée omise. | `etatRatification`, `objectifNegocie.ts:417` → état de tête dans les deux écrans. Pas d’historique de gestes exposé. |
| `propositions_objectif`, `:2409` — 6 | **V** : `id, idPatient, fragments, hashSources, assembleeLe, creeLe`. | `praticien/propositions-objectif/route.ts:702` puis `:739`, et fixtures SQL. | Hash : comparaison d’idempotence `:686`. Dates : ordre serveur `:347` et assemblée courante. Fragments : source/reprise et rendu `ObjectifNegociePanel.tsx:154`, `:193`. Une copie DTO inutilisée de date ne rend pas la colonne morte. |
| `dispositions_proposition`, `:2435` — 8 | **V** : `id, idPatient, idProposition, geste, creeLe`. **SC** : `praticienEmail, motif`. **SP + SC** : `disposeLe`. | Écart `propositions-objectif/route.ts:797` ; reprise transactionnelle `objectifs/route.ts:905` ; date déclarée seulement par SQL d’épreuve. | Dernière disposition `propositionObjectif.ts:420` → regroupement et libellé du panneau `:881`. Motif omis du GET, mais consommateur documentaire futur nommé dans la grille, ligne 170. |
| `amendements_objectif`, `:2463` — 6 | **V** : `id, idPatient, idObjectif, texte, creeLe`. **SP + SC** : `exprimeLe`. | `portail/dossier/route.ts:822` ; date déclarée seulement par SQL d’épreuve. | État exact de version, citation serveur `objectifs/route.ts:808`, affichage de chaîne `ObjectifNegociePanel.tsx:952` et lecture patient `:681`. |
| `reponses_jalon_objectif`, `:2501` — 8 | **V** : `id, idPatient, idObjectif, jalon, texte, eva, creeLe`. **SP + SC** : `reponduLe`. | `portail/dossier/route.ts:791` ; date déclarée seulement par SQL d’épreuve. | GET `:497` et GET praticien → `ObjectifNegociePanel.tsx:1026` ; patient `DossierDeuxVoixView.tsx:493`, historique partiel `:706`. |

**Liste complète des colonnes sans lecteur applicatif identifié : huit.** Les quatre dates déclarées précisément nommées ci-dessus, les trois `praticien_email` d’objectif/synthèse/disposition, et `dispositions_proposition.motif`. **Aucune colonne supplémentaire de cette classe n’a été trouvée au-delà du tableau initial.** Pour trois dates, « sans producteur » doit être restreint à l’application ; pour le motif, le client de bilan est nommé. Les identifiants patient et techniques ont des usages de périmètre, de référence ou d’ordre : leur absence à l’écran n’est pas un orphelin.

### 4.2 Échantillon de six, tiré pendant la passe

Tirage contraint demandé : deux colonnes, deux familles DTO et deux autres objets. Résultat conservé de l’outil : `amendements.exprime_le`, `dispositions.dispose_le`, `jalonDu.dates_et_prochaine_etape`, `dossier.desaccords[].exprimeLe`, `rank_confidence`, `motif_sur_reprise`.

| Objet tiré | Classement adverse | Producteur recherché | Consommateur recherché | Conclusion |
|---|---|---|---|---|
| `amendements_objectif.exprime_le / exprimeLe` | SP/SC **applicatifs** | Préparateur `objectifNegocie.ts:584` et POST omettent ; SQL `alli_objectif_trois_voix_v1_negatif.sql:152` écrit. | Sélections/DTO de l’amendement l’omettent. | **Faux positif** de « sans producteur » absolu. |
| `dispositions_proposition.dispose_le / disposeLe` | SP/SC **applicatifs** | `propositionObjectif.ts:315` omet ; même contrat SQL `:136` écrit. | GET dispositions `propositions-objectif/route.ts:374` ne sélectionne pas la date. | **Faux positif** de « sans producteur » absolu. |
| `jalonDu.ouvertLe/fermeLe/prochainJalon/prochaineOuverture` | SC du DTO | `jalonObjectifDu.ts:90`, `:104` → `dossier/route.ts:507`. | `DossierDeuxVoixView.tsx:545` lit motif ; `:551` statut ; `:652` jalon, aucun des quatre champs. | Résiste pour ces quatre champs. **Le DTO complet est vivant** par statut/jalon/motif. |
| `dossier.comprehension.desaccords[].exprimeLe` | SC de cette projection | `dossier/route.ts:532`. | `DossierDeuxVoixView.tsx:858` filtre l’identifiant et rend le texte, pas la date. La page Compréhension est un autre client de la colonne. | Résiste à l’échelle de cette projection. |
| `rank/confidence` | Exclus délibérément de l’alliance | Carte de décision en amont ; projection `ClinicalRuntimeSection.tsx:949` ne transmet que référence et libellé. | `propositionObjectif.ts:195` les cite dans une liste **d’interdiction**, pas dans un calcul. | Fait exact ; frontière décidée par D-094, pas objet clinique à réanimer. |
| `motif_sur_reprise` | I sur les deux routes courantes | `preparerDisposition`, `propositionObjectif.ts:380` peut le produire pour un appel construit avec motif de reprise. | Écart force `ecartee` (route `:765`), reprise force motif NULL (`objectifs/route.ts:890`). Tests seuls peuvent atteindre ce refus. | Résiste pour l’application ; invariant défensif du module, pas preuve de branche atteignable par HTTP. |

Sortie probante de la recherche SQL, exécutée avec les deux orthographes :

```text
web/prisma/checks/alli_objectif_trois_voix_v1_negatif.sql:136:    INSERT INTO dispositions_proposition (id, id_patient, id_proposition, praticien_email, geste, dispose_le)
web/prisma/checks/alli_objectif_trois_voix_v1_negatif.sql:152:    INSERT INTO amendements_objectif (id, id_patient, id_objectif, texte, exprime_le)
```

**Un seul faux positif sur six condamne la colonne entière de classement annoncé ; il y en a deux ici.** Cela condamne son emploi sans préciser le périmètre de consommation, pas chaque absence de rendu ni l’intégrité des données. Ce petit tirage n’est pas un estimateur statistique des 404 faits.

### 4.3 Vérification des autres objets déjà annoncés

| Objet | Classement exact | Producteur → consommateur ; preuve | Prématuré, orphelin ou choix |
|---|---|---|---|
| `dispositions.motif` | SC applicatif ; consommateur de bilan nommé | Écart → DB, omis du GET ; `GRILLE_CONSTATS_2026-10-04.md:170` prévoit `COUNT(motif)` et la grille demande les motifs ligne 120. | **Prématuré pour l’écran**, matériau prévu pour LOT-06/D-093 ; ne pas supprimer. |
| `hash_sources` | V | `assemblageProposition.ts:154` → comparaison `propositions-objectif/route.ts:686`. | Idempotence est un vrai client. Aucun besoin de l’exposer. |
| Trois `praticien_email` | SC applicatif | Session → préparateurs → DB ; sélections épinglées les omettent. | Trace d’attribution conservée ; futur lecteur applicatif non nommé. Absence de lecteur n’autorise pas la suppression de cette preuve. |
| Deux `non_traite_*` | V côté praticien | POST → ligne → `ObjectifNegociePanel.tsx:303`. | Absence patient exacte, pas absence de consommateur. |
| `caduques[].disposition` et `PropositionExposee.creeLe` | SC du DTO | `propositions-objectif/route.ts:294` → `ObjectifNegociePanel.tsx:903` ; date affichée = `assembleeLe`. | Projections orphelines à cette cible ; pas de futur client nommé. |
| `ObjectifExpose.supersedesObjectifId` | SC du DTO, colonne V | Sérialiseur `objectifs/route.ts:200` → composant reçoit des chaînes déjà calculées. | Pas de futur lecteur de cette copie nommé. |
| POST `{ok:true, objectif}` | SC du sous-objet | `objectifs/route.ts:878`/`:913` → panneau `:519` lit `ok/error`, puis recharge. | Projection sans client actuel ; statut de succès vivant. |
| Gate « ratification avant élargissement » | **V documentaire/humain** | Schéma `:2368` → D-092/D-093 (`docs/DECISIONS.md:5578`, `:5632`). | D-093 dit que le gate **n’est jamais un drapeau**. « Sans consommateur » est une erreur de catégorie. |
| « Provenance illisible » | Défense atteignable sur une forme DB admise ; chemin nominal non établi | `exposerFragments` accepte tout objet `source` ; `lireSource` retourne NULL pour nature inconnue → branche `ObjectifNegociePanel.tsx:110`. Le contrat SQL `:129` utilise même `source.type` au lieu de `source.nature`. | Le fixture est annulé, donc pas une occurrence UI prouvée. Classer « inatteignable en toutes circonstances » est trop fort ; ne pas supprimer la défense. |
| `ANCRE_JALON='T0'` | SC runtime, tests seuls | `objectifNegocie.ts:653`, trois fichiers d’épreuve. | Héritage de D-113, ancien client remplacé ; orphelin runtime connu. |
| `PRIO-STR/FAT/MOB` | Aucune proposition possible par ce registre publié | `priorityRulesV1.ts:423`, `:430`, `:437` → résolution publiée `sourceSigneeVerifiee.ts:83`. | Périmètre signé ; aucune recommandation d’activation. |
| `corps.idPatient` au portail | Ignoré à dessein | Type `dossier/route.ts:553` ; identité issue de `authentifierPortail`. | Frontière de confiance, pas paramètre à rendre vivant. |

### 4.4 Routes, DTO et branches : balayage complet des familles servies

Le tableau suivant couvre les routes qui écrivent ou servent les neuf tables. `equilibre` et `cockpit` sont des sources adjacentes, pas des routes de lecture de ces neuf tables.

| Route et méthodes | Appelant(s) trouvé(s) | Champs/familles effectivement consommés | Exceptions sans client |
|---|---|---|---|
| `praticien/objectifs` GET/POST | `ObjectifNegociePanel`, GET `:414`, POST `:514` | `trajectoires`, leurs identifiants et lignes ; `ancrage` ; états `ratifications` ; amendements et étapes ; `ok/error`. | POST objectif déjà connu ; copie `objectifs[*]` seulement utilisée en longueur (J09) ; référence de prédécesseur exposée déjà connue ; codes `reason` sans lecture dans ce panneau (J23). |
| `praticien/propositions-objectif` GET, POST assembler/écarter | Panneau GET/écart ; `ClinicalRuntimeSection` assemble | Listes, identifiants, texte/source des cartes courantes ; état des disposées ; date d’assemblage des caduques. | J07/J08/J14/J16/J17/J22 ; date `creeLe` et disposition des caduques déjà connues ; `reason` (J23). |
| `praticien/comprehension` GET/POST | `ComprehensionPanel.tsx:80`, `:108` | Chaînes ; texte/trois dates ; désaccords, texte/date/état ; `surfacePatientOuverte` ; `reason=REGISTRE_ANXIOGENE` pilote la confirmation, donc vivant. | J06/J10/J11/J12. |
| `praticien/ce-qui-compte` GET | `CeQuiComptePanel.tsx:41` | Identifiant, texte, deux dates, succès/erreur. | Code `reason` sans lecture (J23). |
| `portail/dossier` GET/probe, POST trois gestes | `LienDossierDeuxVoix.tsx:32` ; `DossierDeuxVoixView.tsx:104`, `:132`, `:174`, `:219` | `ouvert` ; objectifs/identifiants/texte/priorité/date déclarée/état ; `ratifiable` ; amendements ; étapes ; statut/jalon/motif de fenêtre ; ce qui compte ; synthèse et désaccords courants. | J01–J03/J19–J21 ; quatre champs de fenêtre et date de désaccord connus ; jalon/EVA historiques omis délibérément ; `reason` (J23). |
| `portail/comprehension` GET/probe/POST | `PatientCompanionHome.tsx:84`, `ComprehensionView.tsx:50`/`:80` | Ouverture ; synthèse id/texte/dates ; désaccord id/texte/dates ; `ok/error`. | J04/J13 ; `reason` (J23). |
| `portail/ce-qui-compte` GET/probe/POST | `PatientCompanionHome.tsx:67` ; `CeQuiCompteForm.tsx:46` | Ouverture et succès/erreur ; texte/date sont envoyés par le formulaire. Le GET autonome est un probe, pas une route de liste abandonnée. | J05 ; `reason` (J23). |

Aucune route entière de ce périmètre n’a été trouvée sans appelant. Les cinq modules purs nommés dans la question ont des imports applicatifs. Un import peut toutefois être inutilisé : J18 le montre.

Les états chargement/erreur/vide/chargé et les branches de drapeaux ont des transitions dans les composants lus. L’état « indéterminée » du rail est masqué par le retour anticipé, déjà décrit en N1.5. Le refus `motif_sur_reprise` est déjà répertorié ; les autres libellés de refus lus correspondent à une préparation ou garde capable de les produire. Cela ne transforme pas cette analyse de branches en couverture exécutée.

### 4.5 Les 23 objets/familles sans client non répertoriés

**Unité :** un sous-objet de réponse entièrement ignoré, un chemin de champ, ou une famille explicitement regroupée. Pas un décompte atomique de chaque clé JSON ; pas de double comptage avec les huit colonnes ni avec les objets déjà cités dans l’énoncé. « SC » signifie ici sans consommateur applicatif de **cette projection**. Un client de test n’est pas un écran.

| ID | Objet | Classement | Producteur / preuve | Consommateur recherché / effet |
|---|---|---|---|---|
| J01 | POST dossier `ratification` | SC | `portail/dossier/route.ts:854` | `DossierDeuxVoixView.tsx:150` lit seulement succès/erreur puis GET. |
| J02 | POST dossier `amendement` | SC | Même route `:831` | Même vue `:188` ; sous-objet ignoré. |
| J03 | POST dossier `reponseJalon` | SC | Même route `:805` | Même vue `:239` ; sous-objet ignoré. |
| J04 | POST compréhension patient `desaccord` | SC | `portail/comprehension/route.ts:356` | `ComprehensionView.tsx:91` lit succès/erreur puis recharge. |
| J05 | POST ce qui compte `entree` | SC | `portail/ce-qui-compte/route.ts:258` | `CeQuiCompteForm.tsx:54` ne lit pas id/dates renvoyés. |
| J06 | POST compréhension praticien `synthese` | SC | `praticien/comprehension/route.ts:435` | `ComprehensionPanel.tsx:120` lit ok/reason/error puis recharge. |
| J07 | POST écarter `disposition` | SC | `praticien/propositions-objectif/route.ts:805` | `ObjectifNegociePanel.tsx:572` ne lit pas id/geste/date renvoyés. |
| J08 | Corps JSON du succès POST assembler | SC | Même route `:694` et `:744` servent la vue complète | `ClinicalRuntimeSection.tsx:956` ne lit que `response.ok`, émet le signal, puis le panneau refait GET. |
| J09 | GET objectifs `objectifs[*]`, copie des lignes de tête | SC des éléments ; longueur V | `praticien/objectifs/route.ts:348` | `ObjectifNegociePanel.tsx:423` stocke ; `:600`, `:924` lisent longueur. Les champs rendus viennent de `trajectoires`. |
| J10 | GET compréhension `syntheses[*]`, copie des têtes | SC des éléments ; longueur V | `praticien/comprehension/route.ts:252` | `ComprehensionPanel.tsx:85` stocke ; `:153`, `:182`, `:192` lisent longueur ; lignes rendues depuis trajectoires. |
| J11 | `trajectoires.lignes[].supersedesSyntheseId` | SC du DTO | `praticien/comprehension/route.ts:180` | `ComprehensionPanel.tsx:201` reçoit déjà les chaînes ; son POST utilise l’id choisi, pas ce champ. |
| J12 | GET praticien compréhension `desaccords[].idSynthese` | SC du DTO | Même route `:262` | `ComprehensionPanel.tsx:241` rend id/texte/date/état, pas cette référence. Colonne consommée au serveur. |
| J13 | GET portail compréhension `desaccords[].idSynthese` | SC du DTO | `portail/comprehension/route.ts:227` | `ComprehensionView.tsx:257` affiche la liste sans cette référence. Le dossier distinct la consomme pour son filtre. |
| J14 | `fragments[].source.restitution` dans le lecteur UI | SC de la copie | Constructeur instrument → `ObjectifNegociePanel.tsx:79` | `Provenance` utilise instrument/domaine ; le texte affiché vient de `fragment.texte`, pas de `SourceLue.restitution`. |
| J15 | `RegleSigneeResolue.shaPerimetre` | SC du résultat de fonction | `sourceSigneeVerifiee.ts:95` | `propositions-objectif/route.ts:663` ne conserve que règle/texte. Le SHA utilisé par l’assemblage provient d’un autre appel serveur vivant. |
| J16 | `assembleeLe` des propositions courantes et disposées | SC de ces deux projections | `propositions-objectif/route.ts:298` | Panneau : rendu courant et `ResumeProposition` ne lisent pas cette date ; seules les caduques la lisent ligne 907. |
| J17 | `disposees/caduques[].fragments[1…]` | SC dans ces branches | La route sert les fragments complets | `ResumeProposition`, `ObjectifNegociePanel.tsx:161`, ne rend que le premier. Les cartes courantes rendent tous les fragments. |
| J18 | Fonction `desaccordsDeLaSynthese` | SC runtime malgré import | `syntheseComprehension.ts:383` exporte ; import `praticien/comprehension/route.ts:12` | Aucune invocation applicative ; invocations seulement dans `syntheseComprehension.test.ts:275` et `:287`. |
| J19 | Dossier `comprehension.desaccords[].creeLe` | SC du DTO | `portail/dossier/route.ts:533` | `DossierDeuxVoixView.tsx:858` ne rend aucune des deux dates ; la date déclarée était déjà répertoriée, celle-ci non. |
| J20 | Dossier `ceQuiCompte[].creeLe` | SC du DTO | Même route `:513` | Vue `:789` rend seulement `saisiLe` et texte. Le commentaire `:791` refuse explicitement de substituer la date d’écriture. |
| J21 | Dossier `objectifs[].creeLe` | SC du DTO | Même route `:478` | Vue `:345` affiche `negocieLe` uniquement ; les lectures `creeLe` du composant portent sur amendements/étapes. |
| J22 | `propositions[].disposition` des cartes vivantes | SC du DTO, toujours NULL par définition | `propositions-objectif/route.ts:317` puis sérialiseur | Carte courante sans lecteur de ce champ ; le même champ est vivant dans `disposees`, déjà sans lecteur dans `caduques`. |
| J23 | Codes `reason` des erreurs des six routes hors compréhension praticien | SC dans leurs clients UI | Unions de réponses et helpers `echec` des routes ci-dessus | Les composants lisent `ok/error` et certains statuts HTTP. L’assemblage ignore le corps. **Exception vivante exclue du compte :** `ComprehensionPanel.tsx:134` lit `REGISTRE_ANXIOGENE`. Famille regroupée, pas six nouveaux « défauts ». |

Ces 23 familles n’autorisent **aucun lot de purge**. Pour J01–J17 et J19–J23, aucun futur consommateur de cette projection exacte n’a été trouvé nommé dans une décision. Ce sont des projections sans client actuel, parfois produites par un type partagé ; un coût ou un défaut de contrat doit être établi avant de les retirer. J18 est un utilitaire sans appel runtime, pas un module entier abandonné. J20 exprime en outre une omission de rendu volontaire : l’absence de client de la copie DTO ne rend pas l’interface fautive.

## 5. Perspectives : correctif minimal, excès tentant, preuve

Les estimations ci-dessous sont des **ordres de grandeur de modifications**, hors attente de décision et revue indépendante. Elles ne sont pas des patches préparés ni des validations exécutées. Les lignes indiquent la logique/interface à modifier ; une épreuve ciblée peut ajouter environ 15–40 lignes. Les défauts partageant un même correctif sont regroupés pour ne pas fabriquer plusieurs lots.

Une dette documentée n’est pas remise en chantier par sa seule présence ici. Les arbitrages conformes — tirage, EVA brute, références souples, deuxième calendrier refusé, absence de rang — ne figurent pas comme défauts à corriger.

| Défaut retenu / correctif minimal | Correctif tentant et dépassement | Gate avant / preuve après |
|---|---|---|
| **R1 · Blocage séquentiel à deux têtes, N1.1, P1.** Prévenir une nouvelle racine lorsqu’une tête existe, côté route, et rendre le refus intelligible à la reprise : **15–30 lignes, 1–2 h**, `api/praticien/objectifs/route.ts`, `ObjectifNegociePanel.tsx`. Corriger l’attribution exclusive aux écritures simultanées. **Ne répare pas une discordance déjà présente et ne ferme pas la course entre deux premiers POST.** | Une interface de fusion, une nouvelle table de résolution ou un UNIQUE improvisé. Une ligne à un prédécesseur ne peut pas fusionner deux histoires ; choisir implicitement la plus récente changerait le sens des gestes. Une sérialisation partagée des créations/révisions est un problème séparé, déjà nommé. | **Avant :** décider explicitement ce que signifie une reprise quand un objectif existe ; établir si l’un des dossiers concernés a déjà deux têtes. **Après :** fixture avec une tête + reprise et POST ordinaire direct ne créent pas de seconde racine ; les trois gestes patient restent possibles sur l’objectif courant. Si deux têtes préexistent, ce gate ne peut pas être déclaré satisfait par la seule prévention. |
| **R2 · Invitation non conditionnée et résultat d’envoi invisible, N1.2/N1.3/F3, P2 hors blocage R1.** Faire remonter un résultat explicite du helper ; traiter adresse absente ; relire disponibilité de la surface et clôture juste avant la tentative ; afficher le statut au lieu de l’assimiler à l’enregistrement : **30–60 lignes, 3–5 h**, `objectifs/route.ts`, `ObjectifNegociePanel.tsx`, éventuellement type de résultat dans `lib/consultation/email.ts`. | Queue, relances, suivi d’ouverture et nouveau centre de notifications. Ils ne sont pas nécessaires pour distinguer « objectif enregistré » et « notification non envoyée ». Un pixel d’ouverture ne prouve pas la lecture ni l’accès au dossier. | **Avant :** préciser le contrat d’envoi dans D-154, notamment le cas déjà fermé avant le helper ; disposer des états synthétiques adresse absente/SMTP absent/erreur/succès. **Après :** résultat honnête dans les deux branches, aucune tentative si indisponibilité déjà constatée avant l’envoi ; succès d’enregistrement conservé en cas d’échec SMTP. Aucune promesse d’annuler un SMTP en vol. |
| **R3 · Ancienne ratification illisible et succès trompeur, N2.6/F2, P1.** Servir les ratifications avec leur version et les rendre dans l’historique sans transférer leur état au courant : **40–80 lignes, 4–6 h**, deux routes `objectifs/dossier` et deux panneaux. | Nouvel état mutable « lu/intégré », déplacement du geste vers v2, transfert automatique de consentement, ou migration de toutes les références. Aucun n’est requis pour relire ce qui a été écrit sur v1. | **Avant :** acter qu’un geste sur une ancienne version reste lisible à sa place ; si son insertion doit être interdite, décider en plus une coordination commune des deux écrivains. **Après :** épreuve avec barrière entre vérification patient et insertion, révision v2 intercalée ; le geste accepté reste visible sous v1, et v2 reste en attente. |
| **R4 · Assemblage échoué sans reprise visible, N1.6, P2.** Afficher l’échec distinctement d’une assemblée vide, proposer un réessai **explicite** depuis les données de confirmation disponibles : **25–50 lignes, 2–4 h**, `ClinicalRuntimeSection.tsx` et sa transmission de signal. | Recalculer automatiquement au GET, lancer un ordonnanceur ou recréer un épisode pour retrouver des propositions. Cela change le contrat de rejeu D-118 et ajoute des écritures à une lecture. | **Avant :** conserver une source serveur encore valide pour le réessai ; le contrôle de fraîcheur doit rester effectif. **Après :** échec HTTP puis réessai volontaire réussi sans seconde confirmation d’épisode ; recharger seul n’écrit rien. Une source devenue obsolète doit être refusée et expliquée. |
| **R5 · Assemblée devenue vide conservant l’ancienne vue, N1.6, P2.** Première correction honnête : distinguer dans le résultat « aucune nouvelle assemblée » et signaler que l’ancienne n’a pas été remplacée : **15–30 lignes, 1–2 h**, `propositions-objectif/route.ts` et panneau. **Cela corrige le silence, pas une exigence de retrait des anciennes cartes.** | Inventer une proposition vide, effacer les anciennes, ou ajouter d’emblée une table d’assemblées. Retirer durablement une assemblée en append-only nécessite un événement qui représente le vide ; cette sémantique manque aujourd’hui. | **Avant :** trancher si vide signifie garder, rendre caduque ou masquer l’ancienne. **Après :** test assemblée A → sources sans candidat ; la vue et l’autorisation de reprise correspondent exactement au choix, y compris après rechargement. Sans décision de retrait, ne pas annoncer une correction complète de fraîcheur. |
| **R6 · Date de négociation oubliée/résiduelle, N2.7, P2.** Initialiser explicitement la date aux **deux** entrées de révision et éviter l’état résiduel : **6–12 lignes, 0,5–1 h**, `ObjectifNegociePanel.tsx`. | Migration de dates, remplissage depuis `creeLe` ou refonte de formulaires. Ces solutions attribueraient une déclaration non faite. | **Avant :** décider reprise à confirmer ou nouvelle déclaration obligatoire ; jamais dater automatiquement un nouvel accord. **Après :** révision simple et citation d’amendement, depuis formulaire vierge puis déjà rempli : seule la date explicitement retenue apparaît côté patient. |
| **R7 · Citation instrumentale non authentifiée, F1, P1.** Relier le fragment à une restitution effectivement émise par le serveur, avec référence vérifiée ou preuve de transport liée au dossier et au contenu : **40–80 lignes, 4–8 h si cette source est réutilisable**, `api/praticien/cockpit/route.ts`, `ClinicalRuntimeSection.tsx`, `propositions-objectif/route.ts` et adaptateur de source. **Estimation conditionnelle :** la forme réutilisable doit être établie avant engagement. | Recalculer l’instrument dans la route d’assemblage, importer le moteur, ou créer une infrastructure générale de signature. D-115 interdit justement ce couplage. Changer seulement le libellé ne rétablit pas la source admissible de D-094. | **Avant :** identifier la preuve serveur disponible et valider son usage sans recalcul clinique ; sinon re-chiffrer et décider explicitement l’omission de ce fragment optionnel. **Après :** restitution authentique acceptée ; changement d’un caractère, de dossier ou de référence refusé, sans nouvelle proposition persistée ; la règle signée reste vérifiée séparément. |
| **R8 · Trou de preuve sur reprise + notification, N1.4/N3.3, P2 de validation.** Ajouter l’assertion d’envoi dans le succès de reprise avec adresse, puis un scénario reliant une écriture praticien et une lecture/réponse patient sur fixture : **10–20 lignes pour l’assertion, 40–80 pour le scénario ; 2–4 h**, tests de route et E2E existants. | Automatiser livraison réelle d’e-mail, Google et tous les 14 gestes. Une preuve ciblée de la couture ne nécessite pas ce banc externe fragile. | **Avant :** fixture isolée, drapeaux épinglés et envoyeur capturable ; aucune identité réelle. **Après :** casser l’appel ligne 912 fait échouer l’assertion ; la réponse patient vise l’objectif créé dans le scénario, pas un second objectif injecté à sa place. |
| **R9 · Nettoyeur E2E limité à sept tables, N3.2, P2 conditionnel à l’extension des fixtures.** Ajouter les deux suppressions manquantes au nettoyeur : **2 lignes, moins de 0,5 h**, `e2e/helpers/db.ts`, en respectant l’ordre. | Réécrire l’effacement produit, qui couvre déjà neuf tables, ou construire un nettoyage universel. Le défaut observé est celui d’une fixture. | **Avant :** scénario E2E qui crée propositions/dispositions. **Après :** deux exécutions successives sur le même patient synthétique ne récupèrent aucun reliquat de ces tables. |
| **R10 · Documentation et classement erronés, N2.3/N3.1/N3.2/N3.4/N3.6, dette de méthode.** Corriger les seules affirmations et commentaires vérifiés, avec portée app/SQL/UI et dates : **20–50 lignes documentaires, 1–2 h**, compte rendu, commentaires locaux concernés. | Refaire la doctrine, compter tout le dépôt ou ouvrir un lot de purge des 23 familles DTO. Aucun bénéfice patient établi à ces nettoyages. | **Avant :** conserver la cible et les sources datées. **Après :** chaque absence est qualifiée ; la chronologie ne transforme plus un récit de confirmation en preuve de persistance ; le script local SQL figure dans le chemin de garde. |
| **R11 · Risque de volume, F4, P2 plausible.** Mesurer avant de corriger : fixture synthétique de profondeur/volume contrôlés et mesure des réponses, **10–30 lignes de banc, 1–2 h** ; aucune modification produit à ce stade. | Pagination générale et caches des neuf tables. Ils risquent de couper des chaînes ou de masquer une parole ancienne sans goulot mesuré. | **Avant :** volumes plausibles et budget de latence définis. **Après :** courbe temps/taille par D et S ; seulement si dépassement, chiffrer la correction du calcul ou de la lecture précisément responsable. |

**Dettes confirmées mais non remises en chantier :** rail fondé sur couverture (N1.5), cadence des notifications, arbitrage J85/J90 et marque d’amendement intégré. Leur constat est exact et déjà attribué. Le seul passage du temps ne leur donne pas une priorité nouvelle. La duplication par rejeu réseau reste une question de contrat de geste : ne pas la « corriger » par l’unicité que D-111 refuse.

Les estimations R1/R5 sont volontairement scindées : un petit correctif préventif ou informatif ne doit pas être vendu comme une résolution des états historiques ou comme une nouvelle sémantique d’assemblage.

### Les deux priorités avant le 4 octobre

**1. Obtenir une première réponse patient réelle, sur un objectif unique et relisible dans le périmètre D-093.** Le préalable est un objectif effectivement rédigé sur au moins un des trois dossiers `PAT006`, `PAT007`, `PAT017` ; D-093 le dit déjà (`docs/DECISIONS.md:5624`). Puis il faut vérifier le chemin concret : une tête, accès effectif, geste proposé et retour visible. Une rédaction manuelle peut ouvrir cette observation sans attendre des propositions machine. Si un blocage technique apparaît, R1 et R2 sont les premiers correctifs à mobiliser, précisément sur le blocage observé. Cela ne justifie ni une campagne automatique d’envoi ni la fabrication d’une réponse pour passer le gate.

**2. Produire le bilan écrit du classement réellement présenté sur ces dossiers.** Observer les candidats, les paroles citées, les reprises/écarts et les motifs ; consigner ce que le praticien a maintenu ou changé. Vérifier les sources avant d’attribuer à un instrument ce qu’il aurait dit : F1 borne la fiabilité du matériau. Une requête de comptage seule ne constitue pas ce bilan. Ce second résultat est obligatoire au même titre que la réponse ; construire une meilleure mécanique d’envoi et oublier le bilan manquerait D-093.

Ce sont deux résultats bornés, pas l’autorisation de lancer les onze lignes du tableau. **D-093 exige au moins une réponse réelle sur un objectif dans le périmètre des trois dossiers, pas une réponse sur chacun des trois.** Le texte source accepte ratification ou contestation (`:5632`) ; la grille ultérieure mentionne aussi l’amendement. Tant qu’une équivalence n’est pas formellement retenue, ne pas élargir silencieusement la preuve de sortie.

Si la contrainte portait uniquement sur **deux correctifs de code**, je choisirais la prévention de la deuxième racine (R1) et le résultat observable de l’invitation (R2) : ils rendent le premier geste possible sans attendre un dispositif nouveau. Ils ne dispensent ni du bilan ni du traitement des risques P1 avant un élargissement.

### Ce qu’il ne faut pas construire maintenant

- **Une notification patient → praticien.** L’absence est décidée. Une relecture organisée suffit à l’observation D-093 ; changer le régime en tirage ne répare ni la deuxième tête ni une invitation non remise.
- **Un instrument ou tableau de bord d’EVA.** D-111 en exclut l’agrégation ; aucune des défaillances établies ne demande une moyenne, une courbe ou un seuil.
- **Une interface complète de départage.** Le blocage est mûr comme problème ; la sémantique de fusion ne l’est pas. Prévenir la racine supplémentaire est plus petit. Si un dossier observé est déjà discordant, la décision de résolution devient préalable, et ne peut être remplacée par une sélection automatique de la dernière ligne.
- **Une refonte globale des DTO, du rail ou des index partiels.** Les projections sans client ne justifient pas un chantier ; la garde SQL locale existe ; le rail est une dette connue. Aucun de ces trois chantiers ne produit la réponse réelle attendue.

### Connexion ou porte à usage unique : pas un premier lot démontré

Le chemin actuel est établi : `envoyerObjectifPropose` → `buildGoogleConnexionUrl` → `/portail/connexion`. En revanche, les rapports **69/71** et **4/21** de l’énoncé n’ont pas été retrouvés avec leur définition, période et cohorte dans les pièces versionnées lues. D-154 documente des volumes `Envoye` par canal, pas des ouvertures ni des entrées (`docs/DECISIONS.md:85` ; `email.ts:22`). Ces données ne prouvent pas que le mécanisme de lien explique à lui seul l’écart.

Je n’en ferais donc pas le premier lot sans une observation de l’accès du patient concerné. Je changerais d’avis si un objectif unique est disponible, la notification remise, et que l’échec se situe précisément à la connexion, avec une porte à usage unique déjà utilisable dans le même régime d’identité/révocation. Dans ce cas, adapter cette porte existante devient une correction courte de l’accès ; il faut vérifier expiration, révocation et destination dossier. Même une excellente porte d’entrée ne rend pas les gestes disponibles face à deux têtes.

## 6. Angles morts

### 6.1 Ceux de la méthode du compte rendu

**Les coutures.** F1 vit entre le résultat cockpit, le corps HTTP, le constructeur « instrument » et le libellé de provenance. F2 vit entre la garde patient, la révision praticien, le calcul d’état et le message de succès. F3 vit entre la clôture et un envoyeur appelé plus tard. Aucune lecture isolée d’un de ces modules ne suffit à établir ces trois scénarios.

La couture modèle/effacement a été examinée en sens inverse : les neuf suppressions applicatives et les FK fournissent un contrepoids réel. La différence avec le nettoyeur de fixture ne permet pas d’inventer un P0 RGPD.

**La corrélation des lectures.** Chercher surtout append-only et silence favorise le constat « la ligne est conservée ». Cela ne prouve ni qu’elle reste lisible après une autre écriture, ni qu’une source citée est authentique, ni que l’historique se charge à coût acceptable. F4 ouvre le volet volume sans transformer une borne algorithmique en panne constatée.

**La seconde contradiction de fusion.** Le compte rendu décrit à la fois « aucun ancien geste n’a de surface praticien » et les amendements de v1 rendus sous la chaîne de v2. La fusion aurait dû restreindre la première phrase à la ratification/contestation. Autre contradiction : une mécanique de propositions décrite comme ouverte, mais dont le seul déclencheur livré attend une confirmation d’épisode, puis peut échouer sans reprise. Les compteurs de lignes ne départagent pas ces causes.

**La qualification.** Un gate humain, une réserve de date explicitement non déclarée, une liste d’interdiction de champs et une copie de DTO ignorée ne se jugent pas avec une seule colonne « sans client ». Le défaut de méthode est cette perte de distinction ; le nombre 404 ne la compense pas.

### 6.2 Ceux du produit

- **Réception et entrée.** `Envoye` signifie acceptation par le relais. Le journal ne relie pas de manière démontrée l’ouverture d’un message à une visite puis à un geste ; la notification ne porte pas de référence précise à la version d’objectif. Lire les compteurs comme un taux d’engagement serait une inférence non fondée.
- **Blocage.** Le système **sait localement** qu’il y a plusieurs têtes : la route calcule `ratifiable:false` et les écrans affichent la discordance. Il ne fournit pas de signal de portefeuille ni de recours praticien pour la résoudre. « Il ne sait pas que le patient est bloqué » est trop absolu ; « il ne fait pas remonter ce blocage hors de la surface » est exact.
- **Fenêtre d’étape côté praticien.** Le portail calcule la fenêtre de parole ; le cockpit rend les réponses déjà écrites, sans servir ce même `jalonDu` comme invitation en attente. Les jalons de confirmation du cockpit sont une question distincte : leur présence ne constitue pas ce retour.
- **Conservation sans relecture.** F2 montre une donnée durable sans surface. La base ne peut pas, à elle seule, garantir la promesse « votre praticien le verra ».
- **Absence de taux.** Pas de taux de reprise/écart/ratification rendu dans le panneau, conformément aux arbitrages. Cela **n’empêche pas de produire D-093(b)** : cette condition demande un bilan écrit du comportement du classement, pas un score d’adhésion. La grille prévoit des lectures et comptages documentaires, dont `COUNT(motif)`, comme matériaux. Il faut conserver exemples, contexte et motifs et leur donner une interprétation humaine ; compter les gestes ne mesure pas la qualité de la parole.

La limite plus sérieuse pour D-093(b) est la fidélité du matériau : F1 compromet l’attribution d’un fragment ; les archives de propositions ne montrent que le premier fragment et aucun motif d’écart ; l’assemblage serveur ne persiste pas un rang à relire. D-094 demande de respecter l’ordre reçu de C1 sans le présenter comme un score. L’ordre effectivement vu doit donc être documenté pendant l’observation, avec la source consultée ; on ne peut pas reconstruire a posteriori une expérience d’écran à partir de quelques totaux.

La lecture ne démontre pas une inversion effective de cet ordre : l’assemblage conserve l’ordre d’entrée, puis la relecture SQL départage notamment par identifiant. Sans preuve sur l’ordre réellement produit et affiché, il s’agit d’une limite de reconstitution, pas d’un nouveau bug confirmé.

## 7. Limites de couverture

- **Cible historique, pas état actuel du service.** Les conclusions portent sur `e67743dc`. Aucun accès production, aucun `scalingo run`, aucune lecture de base ni journal d’exploitation actuel. Les nombres du 26/08 et du 06/09 ne prouvent ni disponibilité actuelle ni comportement d’un patient le 09/09.
- **Preuve statique.** Aucun test, serveur, E2E, requête HTTP ni contrat SQL exécuté. Les tests ont été lus. « CONFIRMÉE » signifie ici chemin de code lu de bout en bout, conformément au seuil de l’énoncé ; cela ne signifie pas incident reproduit. En particulier, les trois scénarios de concurrence sont des intercalages permis par le code.
- **Commandes de preuve.** Les sorties déterminantes sont retranscrites dans N3.1, N3.6 et l’échantillon SQL. Les recherches de symboles ont servi à atteindre les producteurs et leurs lecteurs ; leurs absences ne sont pas utilisées seules comme preuve. Les extraits de scripts SQL sont du texte lu, sans exécution.
- **Historique mouvant.** L’activité extérieure a fait avancer le checkout pendant la passe. Les citations doctrinales et fichiers changés ont été relus à la cible ; aucune modification applicative de cette activité n’est attribuée à la présente revue.
- **Page complète non fournie.** Les 19 affirmations et exemples de l’énoncé constituent le compte rendu attaqué. « Neuf lecteurs » et « 404 faits » ne donnent pas accès aux 404 entrées ; « neuf lecteurs ont manqué F1 » signifie absent des extraits autoportants, pas comparaison exhaustive avec une page inaccessible.
- **Échantillonnage distinct de l’inventaire.** Les 65 colonnes ont été balayées ; les six objets et quatre contradictions ont été échantillonnés. Les 23 objets nouveaux sont des familles de projection/export définies au §4.5, pas un résultat comparable sans normalisation aux 590 objets du précédent audit.
- **Sécurité bornée.** Garde d’appartenance, sessions, références de version et transaction d’effacement ont été suivies. Pas d’audit exhaustif de sécurité, d’authentification externe ou d’ordonnancement PostgreSQL en charge. Aucun P0 établi ne signifie pas absence garantie de P0.
- **Périmètre clinique respecté.** Aucun jugement de seuil, score ou arbitrage clinique ; pas d’analyse des internes du moteur. Le contrat des ancres et son appelant local ont été lus uniquement pour N3.6.
- **Livrable seul.** Aucune correction applicative, migration, PR, commit, envoi ou déploiement. Seul ce rapport distinct est ajouté, conformément à la restitution demandée.

**3 réfutées (dont 0 au niveau 1), 6 affaiblies, 3 élargies, 7 résistent, 0 non vérifiables, plus 4 trouvailles neuves et 23 objets/familles sans client non répertoriés.**
