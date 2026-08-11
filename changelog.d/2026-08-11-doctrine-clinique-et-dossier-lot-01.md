### Documentation

- **Constitution clinique d'exécution** (`docs/claude/doctrine/`) : 58 règles
  `DC-nn` en neuf domaines — provenance, claims, scoring, interprétation,
  questionnaires, interventions, biologie, longitudinal, gouvernance. Chaque
  règle porte son statut, **acté** (reprise d'une décision ou d'un invariant
  déjà opposable, référence donnée) ou **proposition** (en attente d'un
  `D-xxx`). Aucune décision clinique n'est prise par ce document.
- **Audit de la doctrine face à la chaîne codée**
  (`AUDIT_DOCTRINE_CHAINE_T0.md`) : les 58 règles confrontées au dépôt à
  `13cdc259`. 11 acquises, 18 partielles, 13 portées par un lot de la campagne
  chaîne T0, 16 sans ancrage — dix-huit au constat, dont deux inscrites par le
  véhicule V4 dans ce même commit. Aucune règle n'est contredite par le code —
  l'écart est un manque, pas une divergence. Trois écarts structurels ne sont
  couverts par aucun lot : le schéma de claim (§A), le typage de l'objet de
  sécurité (§B), les gates de population (§C) ; un quatrième relève de
  l'outillage de session (§D, le hook d'écriture ignore les fichiers
  cliniques) ; un cinquième n'est visible que parce qu'un commentaire de code
  affirme le contraire (§E, `orientationRulesV1.ts` se déclare régénéré par
  `tools/corpus/orientation/`, répertoire qui n'a jamais existé).
- **Plan de fermeture des 18 règles sans ancrage** (section « Refermer les
  18 ») : quatre restent écrites et non armées faute de sujet ; quatorze se
  regroupent en cinq véhicules, ordonnés par coût du report et non par
  importance. L'acte d'intégration est défini — décision `D-xxx`, banc qui
  fait mordre, bascule du statut dans la constitution.
- **Extrait permanent dans `CLAUDE.md`** : quatorze règles constitutionnelles,
  chacune pointant son `DC-nn`. Le détail n'est pas chargé en permanence ; il
  arrive par `.claude/rules/clinique-scoring.md` sur les chemins cliniques.
- **Dossier de règles candidates du LOT-01**
  (`campagnes/2026-08-10-chaine-t0-.../DOSSIER_REGLES_LOT-01.md`) : les trois
  règles de discordance descendues prédicat par prédicat. C-STR recevable
  (bandes publiées des deux instruments) ; C-SOM à retirer de la V1 (l'axe
  `ME` du DNST porte six items de sociabilité sur dix — la règle
  sélectionnerait des patients introvertis qui dorment bien) ; C-ALI reportée
  (le drapeau d'anamnèse « restriction déclarée » n'existe pas). Les quatre
  livrables d'architecture du lot sont inchangés. Propositions tranchées par
  `D-042` le jour même.
- **Fiche LOT-01 et table de campagne alignées sur `D-041` et `D-042`** :
  résultat observable et périmètre ramenés à une règle, contrat de fraîcheur des
  claims versé au périmètre et aux étapes, sous-score de rythme du DNST et
  drapeau de restriction déclarée nommés hors périmètre, écart assumé sur la
  régression 57 de la spec (elle attend une contradiction de sommeil que la
  règle retirée aurait produite faussement — le banc retient ce qui reste vrai
  plutôt que de faire passer le reste par une population fausse).

### Décisions

- **D-041 — Discordance, convergence et conflit de sources sont un seul objet
  à trois formes.** Décision utilisateur du 2026-08-11 : le moteur du LOT-01
  produit un objet unique discriminé par une `forme`, plutôt que trois objets
  voisins qui auraient donné trois vocabulaires de vigilance sur le même écran
  et, à terme, trois moteurs. Seule `DISCORDANCE` est peuplée par le lot.
  Garde non négociable de cette fusion : l'objet ne porte aucun champ de
  certitude, de probabilité, de score ou de confiance — la convergence
  augmente la priorité, jamais la certitude (`DC-29`), et un banc assère
  l'absence d'un tel champ.
- **D-042 — La table de discordances V1 part avec une seule règle, et un banc
  de fraîcheur garde les claims épinglés.** Décision utilisateur du 2026-08-11,
  trois arbitrages tranchés ensemble. **C-STR retenue** au seuil `≤ 8` : aucun
  des trois chiffres n'est arbitré — `≤ 8` est la bande « Adaptation perturbée »
  de l'axe, `D ≤ 4` et `S ≤ 7` les bandes publiées du DASS-21. Le **trou à 9**
  des bandes est laissé ouvert délibérément : le fermer aurait coûté un point
  sans source, et `R2-STR-01` couvre déjà ce patient. **C-SOM retirée** de la
  V1, motif inscrit dans la table ; le sous-score de rythme qui la rendrait
  juste est un score nouveau, donc un autre geste. **C-ALI reportée**, faute du
  drapeau d'anamnèse qu'elle suppose. Conséquence : la table V1 porte **une**
  règle, `validationExterne: false` à la livraison ; les quatre livrables
  d'architecture du lot sont inchangés.
  - **Banc de fraîcheur des claims épinglés, dans ce lot** : chaque claim cité
    par une table signée existe, est `VALIDE` et n'est pas `superseded` — sur
    les deux tables d'un coup. Il prend la forme d'un contrat rejoué en lecture
    seule sur la production (patron `web/prisma/checks/`) et **jamais** celle
    d'un test unitaire : la base CI est vide, le banc y serait vacué — le piège
    déjà nommé par `D-012` et `D-015`.
- **D-043 — L'extrait permanent de `CLAUDE.md` est opposable ; neuf règles
  basculent à « acté », la dette de bancs est nommée.** L'extrait déclarait
  « ces règles valent » alors qu'onze des `DC-nn` cités portaient le statut
  *proposition* — le lot court-circuitait le mécanisme de statut qu'il venait de
  créer. `DC-12`, `DC-14`, `DC-17`, `DC-20`, `DC-23`, `DC-27`, `DC-30`, `DC-34`
  et `DC-35` sont désormais **opposables en revue et à tout agent** ; aucune
  n'est gardée par un banc, et chaque statut le dit sur place (« banc dû »).
  Écarté : restreindre l'extrait aux règles actées (il perdait `DC-27`, `DC-30`,
  `DC-20`, celles qu'un agent enfreint sans s'en apercevoir) ; retirer l'extrait
  (plus aucun rappel hors des chemins cliniques, où il arrive trop tard).
- **D-044 — Trois conséquences de la revue de clôture du LOT-01.** (1) Le moteur
  porte **son propre type** : `DiscordanceFinding` hérite de
  `ClinicalFindingBase`, qui porte `confidence` — le garde non négociable de
  D-041 était déjà violé par le type que la spec désignait, et le banc aurait
  échoué le premier jour. Écarté : retirer `confidence` du socle partagé (son
  propre `D-xxx`) ; amender le garde (la nuance « qualifie la donnée, pas la
  conclusion » est la confusion que `DC-29` vise). (2) Les critères de sortie du
  lot sont **réduits et l'écart nommé** — le critère 2 du Lot B exigeait les
  deux vigilances, D-042 le rend inatteignable ; la spec de `sources/` reste
  intacte. (3) Le contrat de fraîcheur part sur un **déclencheur CI étendu**
  (`release-db.yml`, `paths` += `web/src/lib/clinical/**`) : sans migration dans
  le lot, il n'aurait jamais démarré seul — le précédent D-015 avait déjà promis
  un rejeu production jamais câblé. Cette ligne de workflow élargit ce qui ouvre
  un accès à la production : elle voyage avec le code, pas ici.
- Véhicule V4 du plan de fermeture appliqué : `DC-39` (une modification à la
  fois) inscrit au LOT-05, `DC-41` (efficacité ≠ tolérance) inscrit au LOT-07.
  Deux paragraphes dans deux fiches existantes, aucun lot nouveau.

`DC-29`, `DC-54` et `DC-55` restent au statut **proposition** : D-041 les
réserve jusqu'au banc qui les fait mordre, et D-043 ne défait pas cette réserve
— la puce correspondante de `CLAUDE.md` est signalée comme non encore
opposable.

### Corrigé

Une revue de clôture (`wn-reviewer`) a démenti six affirmations de la première
rédaction, toutes vérifiées ensuite dans le code :

- l'audit annonçait la table d'orientation **non signée** (`validationExterne:
  false`, « aucune règle signée ») : elle est signée depuis le 2026-08-06, 23
  claims (`orientationRulesV1.ts:1401`). Ce qui tient la route fermée est le
  drapeau, pas la signature — l'audit avait lu l'en-tête périmé du fichier au
  lieu de la table ;
- `DC-26` était marquée **acté** sur la foi du compilateur
  `tools/corpus/orientation/`, dont le §E du même document établit qu'il n'a
  jamais existé : passée à **partiel** ;
- `D-042` décrivait `DrapeauxAnamnese` avec huit clés : il y en a **dix** depuis
  `367688ad`, dont `intolerancesAlimentaires` — traité explicitement (une
  intolérance déclare une cause, pas une éviction : C-ALI reste reportée) ;
- le seuil `≥ 7` de la plainte surpoids était accusé d'être **sans provenance** :
  c'est la bande « Intensité élevée » de `Q_MOD_03`, déjà utilisée au même seuil
  par `R2-NEU-01` dans la table signée. La descente avait cherché la provenance
  dans `plaintes.ts`, qui se déclare « affichage uniquement » ;
- l'énoncé de C-SOM était **tronqué** : la spec ajoute `∧ plainte sommeil ≤ 2`,
  et c'est **ce** seuil qui n'a pas de provenance (il coupe à l'intérieur de la
  bande 1-3). Le constat `DC-19` du dossier était inversé ;
- la répartition comptait six lignes en `absent` alors qu'elles nommaient un
  porteur. Requalifiées, plus `DC-39`/`DC-41` que ce commit inscrit : 13 portées
  et 16 sans ancrage, motif écrit dans l'audit.

Plus : `signaux_alerte` compte **12** items et non 13 ; le §B disait « aucun
type » alors que `SafetyFinding` existe (type **sans producteur**) ; le §C
ignorait « Grossesse / post-partum » présent en facteur déclenchant ; le README
annonçait 50 règles en huit domaines.

Aucun code, aucune migration, aucun seuil clinique modifié.
