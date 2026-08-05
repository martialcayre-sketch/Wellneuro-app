# Quatre démarches auprès des ayants droit — dossier d'instruction

Arbitrage du 2026-07-29. Ce document sert à **engager** les démarches ; il ne
décide de rien de plus que ce qui a été tranché, et n'affirme rien qui ne soit au
registre.

## Ce qui a été décidé, et ce qui ne l'a pas été

**Cinq instruments fermés à l'assignation** — `Q_PED_02`, `Q_PED_03` (Conners),
`Q_GEO_04` (MMSE/GRECO), `Q_CAN_01`, `Q_CAN_02` (EORTC). Mécanisme : `actif:
false` au catalogue, `statutCertification: suspendu` au registre. Fermeture, pas
effacement : les définitions restent, les passations enregistrées restent
lisibles et scorables, et la réactivation ne demande qu'une ligne dans chaque
fichier.

**Trois sont laissés hors suspension** — `Q_SOM_02` (Epworth), `Q_INF_04`
(HIT-6), `Q_NEU_11` (HAD). Ils portent une réponse chacun, vérifié en base ; la
seule assignation existante (Epworth) est au statut « Complété ».

**Quatre démarches engagées.** Trois portent sur un instrument fermé, une sur un
instrument encore servi (Epworth). Ce n'est pas une incohérence : fermer et
instruire sont deux gestes indépendants, et l'ordre entre eux relève de l'usage,
pas du droit.

## Le point à ne pas perdre de vue

**`Q_NEU_11` (HAD) est le seul des huit à rester hors suspension sans qu'aucune
démarche soit engagée**, et deux faits s'y ajoutent, trouvés en revue.

Sa mention au registre est « GL Assessment (copyright déclaré, à vérifier) », sans
DOI ni PMID vérifié, et son contenu n'a jamais été audité (1 divergence critique
au banc). Position tenable — elle n'est pas documentée. Trois candidats du même
domaine existent au catalogue (`Q_NEU_01` BDI-13, `Q_NEU_02` MADRS, `Q_STR_04`
DASS-21), **tous `a_verifier`** : les substituer n'améliorerait pas la position.

**Il n'est servable par aucun chemin d'interface**, contrairement à ce qu'une
première rédaction affirmait. L'alias `Q_STR_07` figure au catalogue mais n'a
**pas de définition de scoring** : la bibliothèque le badge « alias historique »
et la route d'assignation le refuse. `Q_NEU_11` lui-même n'a aucune entrée de
rayon — il n'est atteignable que par appel direct, c'est-à-dire dans la position
même que ce lot ferme sur le MMSE. Sa réponse enregistrée est bien sur
`Q_NEU_11` : elle reste lisible et rescorable.

**Deux décisions opposées restent donc ouvertes sur lui**, et aucune n'est prise
ici : le fermer comme les cinq autres, ou lui donner une entrée de rayon pour le
rendre réellement servable — et, du même coup, fermable par le mécanisme
ordinaire. Une cinquième démarche auprès de GL Assessment est le préalable
commun aux deux.

À savoir aussi, pour ne pas rouvrir un sujet clos : la 4ᵉ bande servie par
l'application n'est pas dans Zigmond & Snaith 1983 — Snaith l'écrit lui-même en
2003, elle vient du manuel éditeur. Sur ce point précis, **l'application a raison
et le corpus a tort** ; c'est déjà arbitré.

---

## 1. EORTC — `Q_CAN_01` (QLQ-C30) et `Q_CAN_02` (QLQ-BR23)

**Ce que le registre dit** : « © EORTC — enregistrement/autorisation requis, à
vérifier ». Aaronson et al. 1993 ; Sprangers et al. 1996 pour le module sein.

**Pourquoi c'est la démarche la plus légère des quatre** : l'EORTC pratique un
**enregistrement**, pas une licence payante, pour l'usage clinique et académique.
La mention au dossier dit « enregistrement/autorisation », pas « licence » — la
distinction est du registre, pas une interprétation.

**Ce qu'il faut demander** :
1. L'autorisation d'usage pour une application de consultation en neuronutrition,
   en France, à destination de patients suivis individuellement.
2. La confirmation du périmètre : les deux questionnaires, en français, version
   servie et items exacts.
3. Les conditions d'affichage exigées (mention de copyright, logo, formulation).

**À préparer avant d'écrire** : le nombre d'items servis (30 et 23), la langue,
le contexte d'usage (non commercial ? — à trancher, l'application est un outil de
consultation payante), et le fait qu'aucune passation n'a encore eu lieu.

**Enjeu** : ce sont les **deux seuls instruments de cancérologie du catalogue**.
Les suspendre suspend le domaine — c'est assumé, et un test le verrouille pour
qu'on ne le redécouvre pas en production.

**Réserve technique à traiter à la réactivation** : leurs bandes portent des
libellés que le catalogue déclare déjà douteux — « Aucun problème signalé (seuil
source < 28 **incohérent**) » et « < 14 incohérent ». Et leur total global est une
**moyenne des axes mesurés** : deux items répondus sur trente rendent un « 0/100 »
de qualité de vie oncologique, mathématiquement honnête et non représentatif.
Réserve nommée au lot moteur du 2026-07-29, non traitée.

---

## 2. M. W. Johns — `Q_SOM_02` (Epworth Sleepiness Scale)

**Ce que le registre dit** : « © M. W. Johns (licence requise **pour certains
usages**, à vérifier) », 1991.

**La question à poser, et elle est précise** : *lesquels* ? La mention distingue
des usages sans les écrire. La réponse peut être « l'usage clinique individuel
est libre » — auquel cas il n'y a rien à obtenir, seulement à documenter.

**Ce qu'il faut demander** :
1. Le périmètre exact des usages soumis à licence, et ceux qui ne le sont pas.
2. Si l'usage clinique individuel en est exempt, une confirmation écrite à verser
   au registre — c'est elle qui ferait passer `droits.statut` de
   `licence_requise` à `libre` ou `permission_obtenue`.
3. Les conditions d'affichage, le cas échéant.

**Pourquoi cet instrument reste servi pendant la démarche** : c'est **le banc le
plus propre des huit — 0 divergence critique**, et **aucun substitut du catalogue
ne mesure la somnolence diurne**. Le PSQI mesure la qualité du sommeil, le Berlin
un risque d'apnée, le Pichot la fatigue. Le fermer laisserait un trou sans
contrepartie.

**À savoir** : sa grille portait deux trous (6 et 15) corrigés en #450. Un patient
à 6, donc sans somnolence, recevait auparavant « Somnolence diurne excessive ;
syndrome d'apnées du sommeil possible ».

---

## 3. PAR (Psychological Assessment Resources) — `Q_GEO_04` (MMSE / GRECO)

**Ce que le registre dit** : « © PAR — licence requise, à vérifier ». Folstein,
Folstein & McHugh 1975 ; version consensuelle GRECO, Derouesné et al.

**Deux questions distinctes, et la seconde ne dépend pas de la première.**

**Question de droit** : PAR licencie le MMSE. La version GRECO ajoute une couche —
c'est une adaptation consensuelle française, dont le statut par rapport au
copyright PAR mérite d'être établi plutôt que supposé.

**Question d'usage, indépendante** : le MMSE est un test **administré par un
clinicien**, avec consignes de passation, matériel et cotation à l'observation.
Sa place dans un portail patient se pose que la licence soit obtenue ou non. Trois
instruments de dépistage cognitif restent au catalogue — `Q_GEO_03` (AQ Sabbagh),
`Q_GEO_05` (QDRS), `Q_GEO_06` (5 mots de Dubois) —, tous `a_verifier`, mais c'est
**le seul des cinq fermés où le catalogue offre de vraies alternatives
fonctionnelles**.

**Ce qu'il faut demander** : le périmètre de licence pour un usage clinique
individuel en France, et le statut de la version GRECO.

**Recommandation** : trancher la question d'usage **avant** d'engager la dépense
de licence. Si le MMSE n'a pas sa place dans ce produit, la démarche n'a pas lieu
d'être.

---

## 4. QualityMetric — `Q_INF_04` (HIT-6)

**Ce que le registre dit** : « © QualityMetric (licence requise, à vérifier) »,
Kosinski et al. 2003.

**Le dossier le plus net des quatre, et l'issue la moins incertaine** :
QualityMetric est un éditeur dont le modèle économique repose sur la licence
d'instruments (famille SF-36). « Licence requise » y est probablement la réponse,
pas une hypothèse à lever.

**Ce qu'il faut demander** : les conditions et le tarif d'une licence d'usage
clinique individuel, pour une application de consultation, en France.

**Ce qu'il faut décider ensuite** : le HIT-6 porte **une passation et aucune
assignation**. Aucun substitut du catalogue ne mesure l'impact des céphalées —
`Q_INF_01` et `Q_INF_02` sont des questionnaires SIIN qui mesurent autre chose
(hyperexcitabilité neurosensorielle, dépistage magnésium). Le choix se pose donc
en ces termes : **payer une licence pour un instrument jamais assigné**, ou
renoncer au domaine.

**Pourquoi il reste servi en attendant** : décision prise le 2026-07-29 — la
fermeture a porté sur les cinq sans usage, et le HIT-6 porte une passation.

---

## Ce que ce document ne fait pas

- Il ne rédige pas les courriers : les coordonnées et le canal exact de chaque
  ayant droit restent à établir.
- Il ne donne aucun avis juridique.
- Il ne rouvre pas la question de la reformulation des items : une paraphrase
  reste une œuvre dérivée, et surtout elle **détruit l'instrument** — sa validité,
  ses normes et ses seuils appartiennent à la version validée. Ce dépôt en a déjà
  payé le prix deux fois, avec `Q_SOM_07` (« ce n'est pas un défaut de scoring,
  c'est un autre instrument ») et avec la forme courte de `Q_ALI_01`.
- Il ne fait monter aucun instrument d'un barreau de certification : le passage à
  `droits_verifies` demande une réponse écrite au dossier et une date de
  vérification, que le vérificateur du CI exige toutes les deux.
