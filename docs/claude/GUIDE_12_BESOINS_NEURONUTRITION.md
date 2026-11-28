# Guide de Neuro-Nutrition — Matrice des 12 Besoins Fondamentaux
# Document de référence clinique — WellNeuro NNPP2

> Document source fourni par Martial, utilisé comme référence clinique pour
> le mapping nutriment → besoin de `docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md`
> et pour la méthodologie de `docs/claude/MON_EQUILIBRE_CONTEXTE.md` (R9).
> À citer comme `source_ref` dans les entrées de `nutrient_axis_weight` qui
> s'appuient sur les seuils ou variables listés ici.

## Objectif du document

Fournir une matrice algorithmique et didactique des 12 besoins fondamentaux
du cerveau et du psychisme, répartis en 4 classes (Nutritionnels, Somatiques,
Sensoriels, Psychiques), qui coexistent en permanence. Principe directeur :
toujours prioriser le diagnostic et la correction des besoins « matériels »
(classes 1 et 2) avant d'optimiser les besoins « immatériels » (classes 3 et 4).

---

## Classe 1 — Besoins nutritionnels (le carburant)

### 1. Le choix des aliments bénéfiques (équilibre de l'assiette)

Le cerveau a besoin d'une alimentation optimale et antioxydante (modèle
méditerranéen ou MIND), riche en légumes, baies, noix, et pauvre en produits
ultra-transformés.

- **Section réécrite sur le dossier de preuve signé** (`D-516`, 2026-11-13,
  `D-312` §3). Les claims, valeurs et sources sont au dossier privé du
  besoin 1 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : la mesure dérivée de l'Enquête alimentaire SIIN,
  forme complète — le total hors items du sous-score du rythme, qui restent au
  besoin 3, maximum dérivé du barème servi ; deux biomarqueurs, lus chacun à
  part. Le troisième biomarqueur de la version précédente de cette section est
  « non évalué ». Sous la forme courte de l'enquête, le besoin est non évalué.
- **Règle de décision** : un constat descriptif, item par item, sans tranche ;
  chaque biomarqueur rapporté avec sa valeur de référence signée et sa source,
  sans diagnostic ; trois constats séparés, sans règle « ou ». La règle
  précédente (tranche sur le total, « ou » entre deux variables) est retirée.
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat ou un conseil, la liste de
  provenance seule est au `D-516` §5.4.
- **Population visée et « non évalué »** : `D-516` §4.
- **Motif de la part de pondération** : parts retirées, égalité entre
  besoins par convention de modèle (`D-547` §2, réponse à `D-516` §6.3).
- **Application** : appliqué par `D-548` (vague 1).

### 2. Les micronutriments essentiels

Le fonctionnement neuronal, la neurogenèse et la synthèse des
neurotransmetteurs exigent des cofacteurs précis (minéraux, vitamines,
polyphénols, acides aminés).

- **Variables d'entrée** : biomarqueurs, les « 5 majeurs + 3 » : ferritine
  (fer), zinc sérique, magnésium érythrocytaire, iode, sélénium, vitamine D,
  B9, B12 active.
- **Aucune source questionnaire depuis la v4 du score** (2026-07-27).
  L'échelle de fatigue de Pichot y figurait ; elle en a été retirée, la fatigue
  étant un motif d'*explorer* le fer, la B12, les folates ou la vitamine D, et
  non leur *mesure*. Ce besoin étant une fondation critique, l'assimilation
  plafonnait le score global à 50 sur une carence jamais mesurée. Le besoin
  reste donc **non évalué** (couverture `null`, jamais 0) tant qu'aucune source
  pertinente n'existe — voir
  `docs/claude/propositions/2026-07-26-audit-accompagnement-alimentaire/`.
- **Règle de décision** : si carence détectée (ex. vitamine D < 45 ng/ml ou
  ferritine basse), générer un protocole de supplémentation
  micronutritionnelle individualisée.

### 3. Le rythme alimentaire (chronobiologie)

L'efficacité des fonctions cérébrales et la synthèse des neurotransmetteurs
dépendent des horloges biologiques et de la répartition des nutriments dans
la journée.

- **Section réécrite sur le dossier de preuve signé** (`D-564`, 2026-11-25, `D-312` §3). Les claims, valeurs et sources sont au dossier privé du besoin 3 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : le sous-score `RYTHME_CHRONO` de l'Enquête
  alimentaire SIIN (`Q_ALI_01`), quatre items, distinct de la catégorie
  d'affichage `RYTHME_ALIMENTAIRE`, niveau B, référentiel interne sans
  publication primaire ; servi seulement quand les quatre items sont répondus —
  partiel vaut « pas de mesure », jamais une mesure basse. Les instruments
  publiés décrits au dossier restent hors score.
- **Règle de décision** : aucune. La règle précédente (composition des repas
  selon l'heure, rattachée à des neurotransmetteurs, et jeûne nocturne) est
  **non signable**, retirée et non appliquée ; son constat documentaire est
  signé à part (`D-564` §1).
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat (`D-564` §5.4).
- **Population visée et « non évalué »** : `D-564` §4.
- **Maintenus, plus ouverts** : la règle de priorité `PRIO-PON-01`
  (rattachement gardé, aucun claim ne nomme le rythme alimentaire) et la
  lecture « discordance » de `D-040` (seuils gardés, « non évalués », à
  réviser à la première clôture réelle de 21 jours) (`D-564` amendée le
  2026-11-28, §6.2).
- **Application** : aucun changement de calcul ni de version (`D-548` §4, amendée le 2026-11-25) ; mentions « non évalué » à l'affichage avec le prochain lot de code.

---

## Classe 2 — Besoins somatiques (le corps)

### 4. La perception et les sensations corporelles

Le cerveau a besoin de se percevoir (schéma corporel) pour s'ancrer et
ressentir une sécurité fondamentale archaïque. Englobe le confort digestif
(axe intestin-cerveau).

- **Section réécrite sur le dossier de preuve signé** (`D-526`, 2026-11-15,
  `D-312` §3). Les claims, valeurs et sources sont au dossier privé du
  besoin 4 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : deux questionnaires internes SIIN, sur symptômes
  déclarés — troubles fonctionnels digestifs et intestinaux (`Q_GAS_01`) et
  hyperexcitabilité (`Q_INF_01`) — qui repèrent et suivent, sans diagnostic.
  La douleur et la conscience intéroceptive sont des variables du besoin,
  sans instrument servi. Les deux biomarqueurs de perméabilité de la version
  précédente de cette section sont « non évalués ».
- **Règle de décision** : un constat par questionnaire. Les barèmes de la
  pièce pro sont transcrits mot pour mot, et les valeurs frontières suivent
  une convention signée comme arbitrage. Les bandes affichent le constat ;
  les claims du dossier ne fondent aucun déclenchement, et les lignes
  existantes restent régies par leurs décisions. Aucune règle d'ordre entre
  les constats du besoin ; la routine et la hiérarchie de ce guide n'en sont
  pas modifiées. Un score ne qualifie jamais à lui seul une
  plainte de fonctionnelle. La règle précédente (réparation sur trouble
  digestif ou hyperperméabilité, avant la sphère psychique) est retirée.
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat, dans le rôle qu'elle leur
  donne. La liste des claims de provenance ou de limite seulement est au
  `D-526` §5.5.
- **Population visée et « non évalué »** : `D-526` §4.
- **Motif de la part de pondération** : parts égales entre les deux
  questionnaires, aucune pondération sourcée (`D-526` §6.3).
- **Application** : appliqué par `D-548` (vague 1).

### 5. Les mouvements, les fonctions corporelles et le repos

Alternance indispensable entre l'activité corporelle (qui nourrit le
cerveau) et les phases de repos (qui restaurent).

- **Section réécrite sur le dossier de preuve signé** (`D-529`, 2026-11-16,
  `D-312` §3). Les claims, valeurs et sources sont au dossier privé du
  besoin 5 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : le mouvement, par le sous-score d'activité
  physique du questionnaire de mode de vie SIIN (`Q_MOD_01`), support sans
  référence publiée ; le GPAQ en est la référence publiée, non servie, qui ne
  le valide pas. Le repos, par le PSQI (`Q_SOM_01`), l'agenda du sommeil
  (`Q_SOM_09`, niveau D, `D-424`), l'Epworth (`Q_SOM_02`) et la seule fatigue
  générale du MFI-20 (`Q_SOM_07`). Le rythme biologique, par le questionnaire
  de Horne (`Q_SOM_05`), hors score. La mobilité est « non évaluée ».
- **Règle de décision** : un constat par instrument. Les seuils affichent le
  constat ; les claims du dossier ne fondent aucun déclenchement, et les deux
  lignes existantes qui lisent la bande du PSQI restent régies par leurs
  décisions. Le PSQI et l'Epworth s'affichent en deux lectures : la lecture
  publiée en référence, la grille servie comme lecture sans source publiée.
  À l'application de J3-12f, deux bornes servies suivront la grille publiée,
  et le questionnaire de Horne gardera la grille d'origine avec une note qui
  renvoie à sa validation française (`D-538`). La clé servie du MFI-20 reste, et sa note
  reçoit une mention de l'écart avec la validation publiée de la traduction
  servie (`D-542`). Les indicateurs du GPAQ restent de population. Les options (activité,
  hygiène du sommeil, sieste) sont à la main du praticien, aucun score ne les
  déclenche ; un doute d'apnée appelle un adressage médical. La règle
  précédente (remise en mouvement et hygiène du sommeil au socle, sur une
  sédentarité ou un seuil du PSQI) est retirée.
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat, dans le rôle qu'elle leur
  donne. La liste des claims de provenance ou de limite seulement est au
  `D-529` §5.5.
- **Population visée et « non évalué »** : `D-529` §4.
- **Motif de la part de pondération** : mouvement et repos à parts égales,
  aucune pondération sourcée ; poids du repos selon `D-438` (`D-529` §6.3,
  motif confirmé par le responsable).
- **Application** : appliqué par `D-548` (vague 1).

### 6. Le besoin de respirer (oxygénation)

La respiration est le carrefour physiologique et émotionnel pour équilibrer
le système nerveux autonome.

- **Section réécrite sur le dossier de preuve signé** (`D-566`, 2026-11-25, `D-312` §3). Les claims, valeurs et sources sont au dossier privé du besoin 6 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : aucune source de score ; le besoin reste
  « non mesuré », jamais un zéro. Aucune fréquence cardiaque n'est saisie ; le
  stress perçu et un item de soupir sont servis au besoin 9. Les mesures
  décrites au dossier (plaintes respiratoires fonctionnelles, dyspnée, schéma
  respiratoire, variabilité cardiaque, oxymétrie) sont des instruments
  décrits, hors score.
- **Règle de décision** : aucune. La règle précédente (recommandations de
  mécanique ventilatoire) est **non signable**, retirée et non appliquée ; son
  constat documentaire est signé à part (`D-566` §1). Les signaux d'adressage
  (essoufflement inhabituel, douleur thoracique) sont inchangés (`DC-12`).
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat (`D-566` §5.4).
- **Population visée et « non évalué »** : `D-566` §4.
- **Ouverts** : le recouvrement avec les items servis aux besoins 4 et 9 ; la
  recherche des précautions et contre-indications (`D-566` §6).
- **Application** : aucune source gagnée, donc aucun changement de version (`D-548` §4, amendée le 2026-11-25).

---

## Classe 3 — Besoins sensoriels et émotionnels (la zone de risque)

### 7. Se nourrir de sensations favorables

Le cerveau exige des stimulations via les cinq sens (lumière, sons, toucher,
odeurs) pour assurer la croissance et la maintenance du système nerveux.

- **Section réécrite sur le dossier de preuve signé** (`D-569`, 2026-11-25, `D-312` §3). Les claims, valeurs et sources sont au dossier privé du besoin 7 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : aucune source de score ; le besoin reste
  « non mesuré », jamais un zéro. L'exposition à la lumière du jour et les
  « contacts sensoriels » ne sont pas définis au guide. Les instruments décrits
  au dossier (exposition lumineuse, odorat) sont hors score.
- **Règle de décision** : aucune. La règle précédente (actions sensorielles
  compensatrices) est **non signable**, retirée et non appliquée ; son constat
  documentaire est signé à part (`D-569` §1).
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat (`D-569` §5.3).
- **Population visée et « non évalué »** : `D-569` §4.
- **Ouvert** : la définition des « contacts sensoriels » (`D-569` §6).
- **Application** : aucune source gagnée, donc aucun changement de version (`D-548` §4, amendée le 2026-11-25).

### 8. Se nourrir de sensations plaisantes

Nécessité d'activer les boucles dopaminergiques et de récompense par le
plaisir sensoriel et la satisfaction, pour contrer l'anhédonie.

- **Section réécrite sur le dossier de preuve signé** (`D-567`, 2026-11-25, `D-312` §3). Les claims, valeurs et sources sont au dossier privé du besoin 8 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : la sous-échelle Dépression de la HAD (`Q_NEU_11`,
  sous-score `D`), niveau A, seule source ; elle n'est pas une mesure de
  l'anhédonie au sens large. Les échelles de plaisir et d'anhédonie décrites au
  dossier sont hors score.
- **Règle de décision** : aucune. La règle précédente (seuil sur la HAD-D,
  réintégration de petits plaisirs quotidiens en pleine conscience) est
  **non signable**, retirée et non appliquée ; le seuil du guide est
  « non évalué pour cet usage » ; son constat documentaire est signé à part
  (`D-567` §1).
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat (`D-567` §5.4).
- **Population visée et « non évalué »** : `D-567` §4.
- **Ouverts** : la position du responsable sur l'affect positif (lecture
  directe, à sa signature) ; les cinq règles d'orientation qui lisent la HAD-D
  (`D-567` §6).
- **Application** : aucun changement de calcul ni de version (`D-548` §4, amendée le 2026-11-25).

### 9. Les sensations-émotions fondamentales (gestion du stress)

Besoin de repères émotionnels clairs. L'accumulation de stresseurs
déséquilibre le système nerveux autonome (sympathique/parasympathique).

- **Section réécrite sur le dossier de preuve signé** (`D-541`, acceptée le
  2026-11-18, `D-312` §3). Les claims, valeurs et
  sources sont au dossier privé du besoin 9 ; ici, les mécanismes seulement
  (`D-251` §4).
- **Variables d'entrée** : le stress perçu, par la PSS-10 (`Q_STR_02`), seule
  source du score (cible du 2026-10-18, niveau A). Le SIIN (`Q_STR_01`) et le
  Cungi (`Q_STR_03`) sont des repères du cabinet, hors score, sans référence
  publiée. Le DASS-21, le BMS-10, le questionnaire de Karasek et le WART sont
  lus au praticien, hors score, un constat chacun. La régulation émotionnelle
  est documentée, non servie. Biologie : le cortisol au réveil et le ratio
  cortisol/DHEA sont documentés et hors score ; le ratio est « non évalué ».
  Le système nerveux autonome est « non évalué ».
- **Règle de décision** : un constat par instrument. Aucun claim du dossier ne
  fonde un déclenchement sur un seuil ou une grille ; la grille servie du
  total de la PSS-10 est une lecture du cabinet, sans source publiée, et les
  quatre lignes existantes qui lisent une bande de la PSS-10, du BMS-10 ou du
  DASS-21 sont à suspendre pour relecture une à une, par décision et lot de
  code distincts (`D-541` §6.1) ; la décision n'en éteint aucune. Les options (prise en
  charge selon la HAS, rhodiole en usage traditionnel, magnésium, régulation
  émotionnelle) sont à la main du praticien, aucun score ne les déclenche. La
  règle précédente (« protocole d'urgence » sur un cortisol au réveil altéré
  ou un score de stress élevé) est retirée : aucun claim ne fonde son
  déclencheur ni la notion de protocole d'urgence.
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat, dans le rôle qu'elle leur
  donne. Les claims de provenance ou de limite seulement sont au `D-541` §5.5.
- **Population visée et « non évalué »** : `D-541` §4.
- **Application** : appliqué par `D-548` (vague 1).

---

## Classe 4 — Besoins psychiques (le sommet)

### 10. Les pensées fonctionnelles, positives et stables

Besoin cognitif de schémas de pensée constructifs (dopamine/vitalité) et
d'un esprit apaisé, capable de prendre du recul sans agitation mentale
(sérotonine/sérénité).

- **Section réécrite sur le dossier de preuve signé** (`D-568`, 2026-11-25, `D-312` §3). Les claims, valeurs et sources sont au dossier privé du besoin 10 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : le questionnaire du cabinet (`Q_INF_03`), sous-scores
  dopamine, noradrénaline et sérotonine, niveau B, sans validation
  psychométrique indépendante ; le sous-score mélatonine n'alimente plus aucun
  besoin depuis `D-565` (il était lu au besoin 12).
  Aucune mesure publiée n'est servie ; aucun biomarqueur n'entre au score.
- **Règle de décision** : aucune. La règle précédente (seuil sur un axe,
  compensation par précurseurs en acides aminés et exercices mentaux) est
  **non signable**, retirée et non appliquée ; le seuil du guide est
  « non évalué pour cet usage » ; son constat documentaire est signé à part
  (`D-568` §1).
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat (`D-568` §5.5).
- **Population visée et « non évalué »** : `D-568` §4.
- **Ouvert** : le code qui lit ces sous-scores reste sous ses décisions
  propres (`D-568` §6).
- **Application** : aucun changement de calcul ni de version (`D-548` §4, amendée le 2026-11-25).

### 11. Les besoins de sens et de valeurs

Besoin d'accomplissement (Maslow). L'esprit a besoin d'un engagement
fluide, d'altruisme et de bienveillance pour atteindre l'état de flow et le
bonheur.

- **Section réécrite sur le dossier de preuve signé** (`D-570`, 2026-11-25, `D-312` §3). Les claims, valeurs et sources sont au dossier privé du besoin 11 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : aucune source de score ; le besoin reste
  « non mesuré », jamais un zéro. Les instruments décrits au dossier (sens de
  la vie, engagement, pleine conscience) sont hors score ; le BDNF
  périphérique est « non évalué » pour un usage clinique individuel.
- **Règle de décision** : aucune. La règle précédente (pratiques de pleine
  conscience) et la condition « stabilisé » sont **non signables**, retirées et
  non appliquées ; leurs constats documentaires sont signés à part
  (`D-570` §1). Aucune règle d'orientation n'est modifiée.
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat (`D-570` §5.3).
- **Population visée et « non évalué »** : `D-570` §4.
- **Ouvert** : l'issue du besoin (score, constat après entretien, ou les
  deux) (`D-570` §6).
- **Application** : aucune source gagnée, donc aucun changement de version (`D-548` §4, amendée le 2026-11-25).

### 12. Les besoins de reliance

Besoin d'être connecté sainement à soi-même (congruence), aux autres
(couple, amis, société) et à son écosystème (nature, transcendance).

- **Section réécrite sur le dossier de preuve signé** (`D-565`, 2026-11-25, `D-312` §3). Les claims, valeurs et sources sont au dossier privé du besoin 12 ; ici, les mécanismes seulement (`D-251` §4).
- **Variables d'entrée** : la sous-échelle « Relation aux autres » du
  questionnaire de mode de vie (`Q_MOD_01`), niveau B, cible de la décision du
  2026-10-18 appliquée par `D-565` ; le sous-score `ME` de `Q_INF_03` quitte
  le besoin. Les mesures publiées décrites au dossier (solitude, soutien
  social, connexion à la nature) sont hors score ; aucun biomarqueur n'entre
  au score.
- **Règle de décision** : aucune. La règle précédente (éducation
  thérapeutique si « déconnexion ») est **non signable**, retirée et non
  appliquée ; son constat documentaire est signé à part (`D-565` §1).
- **Références citées** : identifiants au dossier privé ; seuls les claims
  cités par une position signée fondent un constat (`D-565` §5.3).
- **Population visée et « non évalué »** : `D-565` §4.
- **Application** : lot de code distinct (2026-11-25), un seul changement de version, v20/v21 (`D-565` §5.2, `D-548` §4 amendée le 2026-11-25) ; le besoin 12 lit la sous-échelle « Relation aux autres » de `Q_MOD_01` dès le déploiement, et `ME` ne l'alimente plus.

---

## Routine d'aide décisionnelle (logique de traitement)

1. **Phase d'acquisition** — consolider les données du patient issues des
   explorations contextuelles (mode de vie), dimensionnelles (échelles HAD,
   DNSM, stress) et biologiques.
2. **Phase d'évaluation** — mapper les déficits sur les 12 besoins en
   pourcentage d'accomplissement. Croiser obligatoirement la plainte
   clinique (ex. fatigue) avec sa base matérielle (ex. indice HOMA,
   ferritine).
3. **Phase de hiérarchisation** — appliquer la pyramide d'urgence : si un
   besoin des classes 1 ou 2 est en déficit, bloquer toute tentative de
   résoudre les besoins de classe 4 uniquement par la psychologie. Générer
   d'abord un protocole de correction physiologique (assiette, sommeil,
   intestin).

## Hiérarchie décisionnelle — l'iceberg de l'esprit

- **Classes 1 et 2** (60 % de la pondération) — fondations matérielles,
  base immergée. Priorité absolue : bloquer toute intervention
  psychologique complexe si des alertes rouges sont détectées ici.
- **Classe 3** (20 %) — ligne de flottaison, zone tampon corps/esprit.
  Une fois le métabolisme de base relancé, évaluer la charge allostatique
  avant de traiter les pensées dysfonctionnelles.
- **Classe 4** (20 %) — sommet émergé, expression de la pleine santé
  mentale. Ne se traite isolément que si les classes 1, 2 et 3 sont solides.

**Principe pour l'agent** : ce guide fonctionne comme un diagnostic de
bâtiment — scanner d'abord les fondations (classes 1 et 2), ne déployer les
outils d'optimisation mentale (classe 4) qu'une fois la physiologie réparée
et le système nerveux apaisé (classe 3).
