# Arbitrages Journal alimentaire 5.0 — décisions D1–D12

> Session du 2026-07-16. Ce document clôt les douze décisions posées par
> `docs/07_DECISIONS_A_ARBITRER.md`, revues une par une à la lumière du cap
> produit retenu dans `BRAINSTORM_JA_5_0.md` (noyau expérience/friction,
> vocabulaire patient « essai », panorama optionnel, durée cible adaptative).
> Décisions utilisateur recueillies le 2026-07-16 ; actées au registre
> (`REGISTRE_FRONTIERES.md`, A7). Les décisions « différées » portent leur
> gate de réouverture.

## D1 — Nom patient

**Décision (brainstorm) : « Ma spirale alimentaire »** ; praticien :
« Trajectoire alimentaire » ; objet technique `FoodObservationEpisode`.
Le mot « journal » reste un terme de domaine et de migration. La tension de
métaphore avec la Spirale globale (doc 09 §4.10) est assumée : le nom prend
son sens par le mécanisme (chaque tour de spirale est un essai qui améliore
la conception du tour suivant).

## D2 — Politique d'observation par défaut

**La question.** Le pack recommandait l'hybride 21 jours (panorama J1–J3,
focus, consolidation) ; le cap acté rend le panorama optionnel et la durée
adaptative.

| Option | Pour | Contre |
|---|---|---|
| Focalisée par défaut | Cohérente avec le noyau friction ; charge minimale | Pas d'aperçu observé du quotidien sans prescription |
| Hybride 21 j | Reco pack d'origine | Contredit le « panorama optionnel » acté |
| Choix praticien sans défaut | Souplesse maximale | Charge de décision à chaque activation |

**Décision : politique focalisée par défaut.** En régime B, on n'observe
que les occasions liées à l'action validée. Le panorama léger relève du
**régime A** (évaluation observationnelle avant protocole — voir la section
« Doc 11 » ci-dessous), prescrit explicitement par le praticien quand le
schéma alimentaire est peu documenté, jamais par défaut. La durée reste une
cible adaptative (21 jours par défaut, clôture anticipée quand la couverture
est exploitable, prolongation/suspension humaine).

## D3 — Définition de l'observation suffisante

**Décision : règles par type de question (`observationQuestionType`),
versionnées.** Ce sont des règles d'observabilité, jamais des seuils
cliniques implicites ; vocabulaire retenu : « couverture exploitable pour la
revue » plutôt que « haute confiance » (doc 09 §4.3). Elles pilotent la
clôture anticipée adaptative et le droit au silence utile.

## D4 — Photo

**Décision : capture différée, politique actée.** La photo est hors noyau
(doc 09 §4.9 : ambition technique prématurée). Sa politique est actée dès
maintenant pour le lot qui l'activera : facultative, jamais préactivée,
traitement transitoire, suppression de l'original après confirmation,
vignette conservée uniquement sur choix explicite, politique TRUST dédiée.
**Gate de réouverture** : validation de la boucle simple + choix TRUST +
lot capture assistée (JA5-07 de la roadmap du pack).

## D5 — Voix

**Décision : capture différée, politique actée.** Même cadre que la photo :
audio supprimé après transcription, texte brut supprimé après extraction
sauf choix explicite. La première expérimentation, quand elle viendra, sera
ciblée sur la **description d'une friction** (doc 10 §14), si elle apporte
un gain mesurable par rapport aux choix structurés (expérimentation E2 du
doc 09). **Gate de réouverture** : identique à D4.

## D6 — Signatures entre épisodes (bibliothèque de solutions)

**Décision : reco actée avec gate IDP.** Les signatures — reconceptualisées
en « solutions qui fonctionnent pour moi », liées à un contexte — sont
durables, liées à l'identité patient, modifiables et supprimables. Le
concept et la restitution intra-épisode sont au noyau ; **la persistance
inter-épisodes est gatée par la campagne IDP**. La provenance distingue
repas reconfirmé, copie simplifiée, souvenir et observation au moment du
repas (doc 09 §4.5). Une ancienne solution n'est jamais transformée
automatiquement en recommandation active.

## D7 — Plan minimal

**Décision : reco actée.** Activation libre par le patient pour 1, 3 ou
7 jours, sans justification obligatoire ; le praticien voit uniquement le
statut et la période. Données marquées « observation minimale », aucun
rattrapage demandé, aucun message négatif. Pilier de la sécurité
relationnelle du noyau, avec le budget d'attention et la charge perçue en
clôture.

## D8 — Météo d'adhésion

**La question.** La synthèse critique (doc 09 §4.6) juge les trois états
(régulière/fragile/interrompue) réducteurs : ils agrègent des causes très
différentes.

**Décision : constats directs au noyau ; agrégation différée à SP-MET.**
Le noyau restitue des constats observables non agrégés : « aucune trace
depuis 5 jours, plan minimal non activé », « action déclarée impossible »,
« synchronisation en attente ». L'agrégation en trois états est différée à
la campagne **SP-MET** (programme 5.0, campagne 11, dépend de C2A + JA),
avec les exigences de la reco pack maintenues : praticien seul, causes
observables citées, jamais de score interne affichable, jamais côté patient.

## D9 — Notifications

**Décision : reco actée + trace depuis la notification.** Notifications
contextuelles limitées, paramétrables, désactivables, toujours accompagnées
de « pourquoi maintenant », plafonnées par le budget d'attention de
l'épisode, jamais culpabilisantes (« Vous avez oublié votre journal » est
interdit). La **réponse directe depuis la notification**
(occasion → praticable → friction en deux gestes, sans ouvrir l'application)
est actée comme cible, livrée quand le canal notifications existera.

## D10 — Comparaison multi-épisodes

**Décision : règle de compatibilité actée, activation différée.** Deux
épisodes ne sont comparés automatiquement que si instruments, mappings et
politiques sont compatibles (versions du doc 04 §10) ; sinon comparaison
qualitative avec avertissement explicite. L'activation attend un lot
ultérieur — elle suppose plusieurs épisodes clos persistés, donc C2A + IDP.
**Gate de réouverture** : time-travel/SP-SPI + épisodes persistés.

## D11 — « Jumeau alimentaire »

**Décision : reco actée.** Le nom de production est **« simulateur
d'action »** ; « jumeau » est réservé au brainstorming et interdit dans
l'UI (aucune promesse prédictive). Le simulateur lui-même reste différé
(Nutrition Lab avancé, hors noyau).

## D12 — Questionnaire J21

**Décision : assignation explicite dans le protocole, jamais automatique.**
La répétition de `Q_ALI_01`/`Q_ALI_02` en clôture d'épisode est décidée par
le praticien, assignée explicitement dans le protocole. Cohérent avec
l'invariant « aucun envoi automatique » et l'arbitrage A6-5 (pack
pré-composé jamais auto-assigné). La comparaison déclaré/observé n'est
proposée que si la couverture est suffisante (doc 03 §8).

## Doc 11 — Architecture à deux régimes (synthèse finale)

**La question.** Le doc `11_SYNTHESE_FINALE_INSTRUMENT_A_DEUX_REGIMES.md`,
ajouté au pack en cours de session, propose que le journal soit un
instrument longitudinal à deux régimes : évaluation observationnelle avant
protocole (régime A, sortie `DietaryObservationProfile`) et expérimentation
d'action après protocole (régime B, le noyau acté).

| Option | Pour | Contre |
|---|---|---|
| Acter les deux régimes, A7 amendé | Le panorama gagne un statut, une sortie canonique et une gouvernance d'instrument ; réconcilie doc 11 et registre | Réécriture partielle de l'A7 déjà consigné |
| Garder A7 tel quel | Aucune réécriture | Doc 11 resterait en tension avec le registre |
| Reporter au gate JA-00 | Décision prise avec l'audit | La PR partirait avec une ambiguïté connue |

**Décision (utilisateur, 2026-07-16) : architecture à deux régimes actée,
A7 amendé (A7-11).** Quatre lectures jamais fusionnées :
déclaré / observé / vécu / interprété.

**Modélisation : objet unique.** `FoodObservationEpisode` porte un régime
`assessment | experiment` ; les sorties diffèrent par régime (profil
observationnel vs cartographie de faisabilité). Pas de
`DietaryAssessmentEpisode` ni de `DietaryActionExperiment` séparés — la
fusion actée au brainstorm est préservée.

**Restent à arbitrer au gate JA-00** (doc 11 §12) : questions du bilan
observationnel, marqueurs suffisamment gouvernés pour un pilote, place du
profil dans le `ClinicalSnapshot`, comparaison autorisée avec
`Q_ALI_01`/`Q_ALI_02`, conditions de prudence/suspension/retrait.

**Amendement (adaptation du 2026-07-16)** : la gouvernance métrologique
complète du régime A (doc 11 §9 — fixtures de certification, tests de
reproductibilité) n'est plus exigée à la conception ; elle devient un **lot
ultérieur conditionnel**, déclenché si le profil observationnel commence à
peser dans les décisions cliniques. Voir la section suivante.

## Adaptation du 2026-07-16 (contrepoint critique)

**La question.** Après l'actation A7, l'utilisateur a demandé une vision
critique indépendante du produit (au-delà des docs 00–11), puis son
intégration au plan de campagne — en gardant un outil de mesure/calibrage
pré-protocole et en raccordant les notes Ciqual et assiettes de la Boussole.
Détail complet : `12_CONTREPOINT_ET_ADAPTATION.md`.

**Décisions (utilisateur, 2026-07-16), actées A7-11 amendé + A7-12 à
A7-14 :**

- **Régime A → « bilan de calibrage »** borné (3–5 jours), double calibrage
  clinique (structure/heure des prises, empreintes, variabilité → profil
  minimal) et produit (charge supportable, moments réalistes → calibre le
  budget et la politique du régime B). Affichage d'abord, aucun moteur.
  Options écartées : métrologie complète dès la conception (coût fixe
  d'instrument-grade disproportionné pour un cabinet) ; simple trame
  d'entretien (perdrait l'heure des prises et le calibrage produit).
- **Ciqual — codes aliments moyens** : registre de marqueurs JA adossé aux
  codes des 191 aliments moyens Ciqual (Etalab 2.0) dès JA-00 ; aucune
  valeur nutritionnelle ni score dans le JA ; valeurs consommées via C5A
  quand livré ; **12 aliments vedettes du slice C5 ⊂ marqueurs JA**.
  Options écartées : dépendance dure à C5A (couple deux campagnes
  indépendantes) ; marqueurs propres sans Ciqual (deux vocabulaires à
  réconcilier ensuite).
- **Boucle assiettes ↔ essais actée** : l'action d'un essai peut référencer
  une assiette recommandée (C5B) ; les solutions confirmées documentent la
  version réelle ; vocabulaire « recommandation », jamais « prescription »
  (R4). Sans dépendance à la table `assiette_type` (candidate).
- **Briques du contrepoint, toutes retenues** : lot JA-0T validation terrain
  (5 entretiens patients E1/E5 + test carte papier) avant le domaine ;
  carrière d'action (objet longitudinal à travers les tours) ; régime
  « silence » (protocole d'abstention) ; parité papier ; question du jour ;
  friction-agenda (« 3 moments à explorer ») ; revue = décision pré-remplie ;
  delta de décision instrumenté dès le premier lot ;
  affichage-avant-moteurs ; budget de charge global au protocole (contrainte
  à acter côté C2A).
- **Articulation C5** : fiche C5 complétée (consomme la faisabilité publiée
  par JA ; note chronobiologie débloquée par le calibrage) ; C5A signalée
  comme candidat naturel de prochaine campagne data, sans séquencement
  imposé.

**Conséquence structurelle** : l'épisode passe à **trois régimes** —
`calibrage | essai | silence`.

## Récapitulatif des conséquences sur les lots

Le tableau des lots fait foi dans
`campagnes/2026-07-13-journal-alimentaire-21j-v1/CAMPAGNE.md`
(JA-00, JA-0T, JA5-01 → JA5-05). En synthèse :

- **JA-00** (audit clinique/RGPD) reste premier et absorbe la sélection du
  registre de marqueurs adossé aux aliments moyens Ciqual (12 vedettes du
  slice C5 incluses) et les arbitrages calibrage restants (doc 11 §12
  allégé).
- **JA-0T** (validation terrain, parallèle à JA-00) : 5 entretiens patients
  E1/E5 + test de la carte papier ; go/no-go du noyau avant toute ligne de
  domaine.
- Le lot domaine (**JA5-01**) porte : épisode à trois régimes
  (calibrage/essai/silence), carrière d'action, question du jour compilée,
  capture occasion/praticabilité/friction, registre de frictions versionné,
  budget d'attention, droit au silence, plan minimal (D7), constats directs
  (D8), quatre lectures, delta de décision, solutions intra-épisode (D6) —
  **restitution simple, aucun moteur**.
- Retour de décision, tour suivant préparé et charge perçue arrivent avec
  les parcours (JA5-02/03) et l'activation (JA5-05, avec le budget de
  charge global protocole).
- Restent différés avec gate : photo (D4), voix (D5), persistance des
  solutions (D6/IDP), météo agrégée (D8/SP-MET), trace depuis notification
  (D9/canal notifications), comparaison multi-épisodes (D10/C2A+IDP),
  simulateur d'action (D11/Nutrition Lab), gouvernance métrologique
  complète du calibrage (lot conditionnel).
- Invariants inchangés : persistance gatée par C2A + confirmation explicite
  de migration ; aucune projection automatique vers `Q_ALI_01`/`Q_ALI_02` ;
  aucun score SIIN officiel ; aucune valeur nutritionnelle dans le JA.
