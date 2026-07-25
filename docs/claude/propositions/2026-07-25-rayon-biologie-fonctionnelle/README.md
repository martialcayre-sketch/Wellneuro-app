# Rayon « Biologie fonctionnelle » de la bibliothèque — cadrage CB-00

Date : 2026-07-25. Statut : **proposition à relire par le praticien**. Aucun
code, aucune migration, aucune ingestion dans cette campagne de cadrage : le
présent document est le seul livrable (même nature que le LOT-00 de la
certification, PR #359, et que la proposition du rayon compléments C4).

## §0 — Nature de la campagne

Campagne **additive**, pendant biologie du rayon compléments C4. Code retenu
(décision 0, actée le 2026-07-25) : **CB** (« Catalogue Biologie »), scindé
comme C4 en **CB-A** (catalogue intrinsèque, data-first, aucune donnée patient)
et **CB-B** (lecture contextuelle du dossier), flag `WN_CB_ENABLED`. Le code C4
étant déjà pris (flag `WN_C4_ENABLED`, migration
`20260724133000_c4_supplement_product_catalogue` en base) et C5 occupé par
`food-compass`, CB évite toute collision.

La campagne est **subordonnée à la campagne de certification du corpus des
questionnaires** en cours (`docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/`) :
elle n'en réordonne aucun lot, et son moteur (§5) ne touche pas à la table de
règles NNPP2 tant que les lots 8-9 de la certification ne l'ont pas établie et
signée.

Déclaration liminaire, qui structure tout le document : le rayon a **deux
étages** séparés par le mur HDS (§2). L'étage documentaire est constructible
dès maintenant ; l'étage « résultats patient réels » est derrière un gate dur.

## §1 — Existant vérifié (2026-07-25)

Le terrain est déjà largement préparé ; le rayon biologie n'invente presque
aucune frontière, il en réplique.

### La doctrine s'applique intégralement

« Le RAG certifie, source et explique. Le moteur déterministe calcule. Le
graphe clinique (règles signées) choisit les explorations possibles. L'IA
rédige la synthèse. » L'IA n'est **jamais décisionnaire en runtime** ; elle
rédige en aval, bornée aux candidats produits par le moteur.

### Le point d'ancrage protocole existe déjà

- `ProtocolActionType` contient **`biological_exploration`**
  (`web/src/lib/clinical-engine/types.ts:277`), affiché « Exploration
  biologique à discuter » dans `ProtocolMiniBuilder.tsx`.
- Le contrat protocole V3 (`SupplementCatalogRef`, PR #340) fournit le patron
  exact d'une référence catalogue **opaque et gouvernée**, contrainte à un seul
  type d'action, posée uniquement par le praticien — jamais par l'IA, jamais en
  texte libre. Un futur `BiologyCatalogRef` (V4) en serait le miroir.

### Le moteur d'orientation est prêt à étendre

- `web/src/lib/clinical/orientationEngine.ts` : fonction pure
  `evaluerOrientation` ; l'union `CibleExploration` (l.43) vaut aujourd'hui
  `questionnaire | pack` — extensible.
- `web/src/lib/clinical/orientationRulesV1.ts` : table de règles **vide**,
  sha-256, `justificationClaims` jamais vide, niveaux
  `socle | approfondissement | specialise`, statuts
  `brouillon | publiee | suspendue`.
- Route `GET /api/praticien/orientation` : **double verrou fail-closed**
  (`WN_ENABLE_ORIENTATION_NNPP2` **et** table signée
  `validationExterne + dateValidation + claimsSource`). Réponse neutre
  « en cours de constitution » tant qu'inactif, avant toute lecture du dossier.
- Jamais d'auto-assignation ; filtre dur d'administrabilité ; exclusions A-009.

### Le patron de rayon C4 est implémenté et réutilisable

Domaine `web/src/lib/supplement-library/` (PR #337→#353) : `featureFlag`
fail-closed / `config` (vocabulaires fermés, secret d'ingestion ≥ 32 car.) /
`auth` Bearer à temps constant / `types` (contrats versionnés, refus des
échelles étrangères) / moteur déterministe / sentinelle (candidats de flags,
jamais écrits) / `catalogue` (dimensions nommées, **jamais de score global**,
facettes indépendantes, tri neutre) / `ingest` (**brouillons seulement**,
décision C4 n°11, idempotence sha-256, pointeur de version courante) /
`gouvernance` (règles append-only, statuts dérivés, signature praticien).
Barrière **D-003 dans le SQL** (`match_wellneuro_rag_claims`), tables pgvector
hors Prisma (`tables.external`).

### Le dossier patient exploitable par le moteur

- ~60 instruments dans `QUESTIONNAIRE_CATALOGUE` (`web/src/lib/questions.ts`),
  scores stockés dans `QuestionnaireReponse.scoresJson` (total, sous-scores,
  interprétation warning/danger).
- 12 besoins × 3 strates (`web/src/lib/equilibre/`), fondations critiques
  [1, 2, 4, 5, 9] ; le niveau de preuve **C = « biologie fonctionnelle
  interprétative » figure déjà dans la taxonomie** (`equilibre/types.ts`).
- Référentiels sans donnée patient : `NeuroAxis` (axes ↔ besoins,
  `niveauPreuve`), `NutrientAxisWeight` (axe ↔ nutriment, direction, poids,
  `seuilReference`), `CiqualNutrientValue`.
- Protocole = chaîne versionnée append-only (`ClinicalSnapshot →
  ClinicalReview → DecisionCard → ProtocolDraft → diffusion`), check-ins
  J7/J14/J21, momentum T0/J21/J42/J90 (`web/src/lib/fil/momentumJ21.ts`).
- Fil de correspondance médecin C3 (`CorrespondanceMedecin`) : **texte
  uniquement, « jamais de pièce biologique »** (commentaire du schéma).

### La chaîne corpus est réutilisable telle quelle

`tools/corpus/` (extract triple lecture A/B/C avec invariants sur les nombres,
chunk par unités de sens, claims rédigés par une IA et contre-vérifiés par une
seconde, ingest par routes internes, push NotebookLM/Drive) servira sans
modification au notebook « analyses biologiques ». Les claims biologiques
(plages, interprétations) sont prescriptifs/interprétés : **voie lente
obligatoire** (revue individuelle, `VALIDATION_CLAIMS_DEUX_VITESSES.md`).

## §2 — Le verrou HDS et le modèle à deux étages (section pivot)

État vérifié : `web/src/app/dashboard/biologie/page.tsx` est un placeholder
100 % statique (« le stockage de résultats biologiques réels attend un
hébergement HDS ») ; `EstimeMesurePanel.tsx` est marqué « SECOND TEMPS — HDS
requis » ; le concept affiché est « **du présumé au mesuré** » — l'estimé
(questionnaires) et le mesuré (biologie) se confrontent, **jamais fusionnés**.
La migration HDS (Scalingo) est en préparation, échéance de dérogation
2026-10-21.

Conséquence structurante :

- **Étage 1 — documentaire (CB, constructible maintenant).** Catalogue
  d'analyses, claims du corpus, moteur d'exploration, génération de
  propositions. **Aucune valeur biologique patient n'est stockée.** Les entrées
  du moteur sont les scores questionnaires et le protocole (déjà en base,
  non-HDS) ; la sortie est un document (proposition, courrier) — jamais une
  valeur de laboratoire.
- **Étage 2 — résultats réels (gate dur HDS).** Saisie/import de résultats,
  interprétation par plages fonctionnelles, boucle estimé ↔ mesuré,
  ré-alimentation du moteur et du momentum. **Chaque table qui stockerait une
  valeur biologique patient est un acte gaté HDS.**

Deux flags distincts, pas un : `WN_CB_ENABLED` gouverne l'étage 1 ;
`WN_CB_RESULTS_ENABLED` (fail-closed, jamais activé avant attestation HDS)
gouverne l'étage 2. Aucune bascule accidentelle ne doit pouvoir ouvrir le
stockage de données de santé (décision A).

## §3 — Catalogue d'analyses CB-A (étage documentaire)

Modèle conceptuel — les noms sont indicatifs, le schéma réel relève du lot
CB-01 (migration = acte gaté). Aucune de ces tables ne porte de donnée patient.

### L'analyte (pivot clinique)

`BiologyAnalyte` : `code` interne stable (ex. `BIO_FERRITINE`, forme imposée
par contrainte), libellé, `unite` (vocabulaire **fermé**),
`typePrelevement` (sang, urine, selles, salive… — fermé),
`delaiRenduIndicatif?`, `sourceProvenance` (fermé :
`nabm_smt_ans | labo | saisie_praticien`), `statutFiche`
(`importee | verifiee | inactive`, défaut `importee`), `contenuSha256`
(idempotence, patron C4), `niveauCompletude`, `donneesManquantes[]`
(abstention honnête), `verifiePar?/verifieLe?`. Le coût indicatif est différé
(comme la dimension coût de C4) — l'audit confirme qu'aucun montant en euros
n'est disponible dans la source.

**Il n'existe volontairement aucune colonne `remboursable` ni
`codeRemboursement`.** Un booléen stocké est une inférence figée : il diverge
de la correspondance qui le fonde dès que la nomenclature bouge, alors que le
cadrage exige qu'il ne soit *jamais* inféré. Le caractère remboursable se
**dérive** donc à la lecture, et cette dérivation est écrite une seule fois
(`web/src/lib/biology-library/remboursable.ts`) pour que CB-02a, CB-05, CB-06
et CB-08 ne s'en donnent pas quatre définitions divergentes — elles décideraient
du document que le patient reçoit.

Elle ne rend pas un booléen mais **quatre états** : `non_evalue` (aucune
correspondance signée — ce n'est pas « non remboursé », et cela doit se dire),
`hors_nomenclature`, `remboursable`, et `remboursable_si_groupe` (l'analyte
n'est coté qu'au sein d'un groupe imposé : le proposer seul ne le rend pas
remboursable). Entente préalable, acte réservé et remboursement partiel sont
des **conditions à afficher**, jamais des motifs de basculer en « non
remboursé ».

`BiologyAnalyteNabm` : correspondance **plusieurs-à-plusieurs** entre analyte et
acte de la nomenclature (`analyteCode`, `codeActe`,
`nature : isole | groupe_et | groupe_ou`, `verifiePar/verifieLe`). Un analyte a
plusieurs cotations possibles selon le groupage (TSH seule, TSH + T4L,
TSH + T4L + T3L) et un acte couvre parfois deux analytes : un champ
`nomenclatureNabm` unique ne tiendrait pas. Voir
[l'audit de la source](AUDIT-SOURCE-NABM.md), §7.

Deux précisions issues de la revue du lot CB-01. **`groupe` valait pour deux
situations opposées** : un acte qui cote un ensemble imposé (1211 = TSH + T4
libre — proposer un seul membre ne le rend pas cotable) et un acte qui laisse
un choix (1387 = folates sériques *ou* érythrocytaires — chacun est couvert).
D'où trois natures et non deux. Et la correspondance est ancrée sur le **code
d'acte**, jamais sur la ligne d'un millésime : sans cela la signature du
praticien se périmait à chaque nouvelle version de nomenclature, faisant
basculer tout le catalogue en « non remboursé » — donc changer le document
remis au patient.

### Deux référentiels de valeurs, jamais fusionnés

- `BiologyReferenceRange` — valeurs de référence **laboratoire** (bornes,
  population, source officielle labo/HAS).
- `BiologyFunctionalRange` — plages **fonctionnelles optimales**, chacune
  portant `claimId + versionClaim` (claim **VALIDÉ**, D-003) et un niveau de
  preuve WellNeuro (A/B/C/D — C étant précisément « biologie fonctionnelle
  interprétative »).

**Invariant miroir de l'orientation : une plage fonctionnelle sans claim validé
n'est jamais servie.** L'UI présente toujours les deux référentiels côte à
côte, jamais une colonne « normes » unique.

### Panels, ratios, préanalytique, liens

- `BiologyPanel` + `BiologyPanelItem` : regroupements hiérarchisés (bilans),
  `niveau socle | approfondissement | specialise`, besoins ciblés (1-12).
- `BiologyRatio` : ratios calculés déterministes (HOMA, ω6/ω3, Cu/Zn,
  saturation de la transferrine…) — **spécification structurée d'opérandes,
  jamais d'expression libre exécutable** (patron `ScoringSpecification` de la
  certification) ; mêmes deux référentiels de valeurs séparés.
- `BiologyPreanalytic` : conditions de prélèvement (jeûne, moment, délai après
  prise), sourcées par claim quand elles viennent du corpus.
- `BiologyAnalyteLink` : biomarqueur ↔ besoin (1-12) / axe `NeuroAxis` /
  nutriment (`NutrientAxisWeight`), avec direction d'interprétation et
  **provenance claim obligatoire**.
- `BiologyCatalogVersionCourante` : pointeur de version courante par source
  (patron C4 — jamais servir toutes les versions).

### Alimentation

Deux voies, comme C4 : import de la nomenclature (NABM — **source auditée**, voir
[AUDIT-SOURCE-NABM.md](AUDIT-SOURCE-NABM.md) : Serveur Multi-Terminologies de
l'ANS, LOv2, 988 actes, six appels d'API anonymes) en **brouillons** `importee`
avec file de revue praticien, et corpus (notebook « analyses biologiques »)
pour les plages
fonctionnelles, le préanalytique interprétatif et les liens cliniques. Une
source externe ne produit que des brouillons (décision C4 n°11, reprise ici).

## §4 — La proposition d'exploration (le « pendant prescription »)

Le praticien WellNeuro n'est pas médecin : le module ne produit **jamais une
prescription**, il produit une **proposition d'exploration**. La distinction
est portée par le modèle, le vocabulaire et la machine à états.

### Deux régimes strictement séparés

- **Remboursé** (acte à la NABM) : la réalisation exige une prescription
  médicale. Matérialisation : **courrier au médecin traitant** via le fil C3
  existant — texte seul, mur HDS respecté ; le médecin seul prescrit.
- **Non remboursé** (biologie fonctionnelle spécialisée : acides organiques
  urinaires, zonuline, profils d'acides gras, microbiote…) : conseil direct,
  payé par le patient ; **document remis au patient systématiquement**
  (décision F) — y compris quand le laboratoire n'exige rien, pour que le
  patient reparte toujours avec la trace écrite de ce qui lui a été proposé et
  pourquoi. Le document signale le cas échéant qu'une ordonnance reste requise
  par le laboratoire choisi.

### Machine à états (append-only, patron de la chaîne clinique)

`BiologyExplorationProposal` : `brouillon_moteur` (candidats produits par le
moteur, rien de diffusé) → `en_edition_praticien` (le praticien retient, écarte,
reformule) → `signee` (figée, signature praticien) → selon le régime :
`courrier_medecin_genere → transmise_medecin` **ou**
`document_patient_genere → remise_patient` → `retour_consigne` → états
terminaux `realisee | declinee | expiree`.

Chaque item (`BiologyExplorationItem` : analyte, panel ou ratio) porte sa
priorité, son niveau, son objectif clinique, ses besoins visés et ses `motifs[]`
`{ regleId, conditions, claims }` — **`claims` jamais vide**. La proposition
porte la *demande*, jamais le *résultat* : aucune valeur biologique n'y entre,
à l'étage 1 comme à l'étage 2 (le résultat sera une entité distincte, §7).

### Vocabulaire imposé

Jamais « prescription », « ordonnance », « diagnostic » en surface praticien ou
patient. Formules sanctionnées : « proposition d'exploration », « explorations
à discuter avec le médecin traitant ». La chaîne de diffusion reprend
Relu → Validé → Envoyé.

## §5 — Le moteur d'exploration biologique hiérarchisé (« module intelligent »)

### Architecture : extension, pas moteur frère

Le moteur d'orientation existant est étendu (décision B) : l'union
`CibleExploration` gagne deux variantes —

```ts
| { type: 'analyse'; analyteCode: string }
| { type: 'panel_bio'; panelCode: string }
```

— et `OrientationSuggestion` les champs correspondants. Tout le reste est
hérité tel quel : déclencheurs zone/comparaison sur les scores stockés,
`justificationClaims` jamais vide, niveau le plus fondamental gagnant, tri
déterministe, filtre dur, jamais d'auto-assignation.

### Table de règles biologie séparée

Fichier propre (ex. `orientationBiologieRulesV1.ts`), sha-256 propre,
métadonnées et **signature praticien indépendantes** de la table NNPP2 de la
certification (décision C). Compilée hors-ligne par un outil dédié
(`tools/corpus/biologie/compile.mjs`, miroir du lot 9 certification) à partir
des seuls claims **VALIDÉS** en voie lente, régénérée par PR revue. Double
verrou fail-closed propre : `WN_CB_ENABLED` **et** table signée.

### Hiérarchisation et priorisation (le cœur « intelligent » — et déterministe)

- **Niveaux** : `socle` (biologie courante de première intention, largement
  NABM) → `approfondissement` (deuxième intention, ratios, explorations
  ciblées) → `specialise` (biologie fonctionnelle de laboratoire spécialisé).
  À cible partagée, le niveau le plus fondamental l'emporte — on ne propose pas
  un profil d'acides gras avant une ferritine.
- **Entrées** : scores et sous-scores questionnaires (`scoresJson`), protocole
  actif (les actions `biological_exploration` déjà posées par le praticien),
  jalon de momentum (T0/J21/J42/J90) et fondations critiques.
- **Priorisation contextuelle** : les besoins en fondation critique remontent ;
  un jalon J21/J42 sans amélioration du momentum sur un besoin renforce la
  priorité d'objectiver ce besoin par la biologie (« du présumé au mesuré ») ;
  le régime (remboursé d'abord quand un équivalent existe) départage à priorité
  égale.
- **Sorties** : candidats hiérarchisés, chacun traçable réponse patient → score
  → règle → claims → chunk → PDF source.

### La place de l'IA

En **aval uniquement** : rédaction de l'argumentaire du courrier médecin et du
document patient, **bornée aux candidats retenus et signés par le praticien**
(patron du lot 11 certification — le LLM ne reçoit que les candidats du moteur,
jamais l'inverse). L'IA ne choisit aucune analyse, ne fixe aucune priorité, ne
génère jamais un artefact ressemblant à une ordonnance.

## §6 — Parcours et UI

- Remplacement **progressif** du placeholder `dashboard/biologie` : d'abord le
  rayon documentaire (catalogue consultable, fiches d'analytes avec les deux
  référentiels et leurs sources), le bandeau HDS restant sur tout ce qui touche
  aux résultats.
- Encart « explorations biologiques suggérées » sur la fiche patient, pendant
  de l'encart questionnaires du lot 10 certification — instrument à tiroir
  ouvert depuis la zone focale du protocole, jamais écran de classement
  autonome ; **aucun score global, justification à un clic**.
- Fil du jour : cartes de suivi des propositions (signée, transmise, retour à
  consigner) — projection recalculée, comme les cartes existantes.
- `EstimeMesurePanel` reste en « second temps » jusqu'à l'étage 2.

## §7 — Étage 2 post-HDS (esquisse de contrat, hors périmètre)

Posé ici uniquement pour ne pas peindre le catalogue dans un coin :

- `BiologyResult` (⚠️ donnée de santé) : `idPatient`, `analyteId`, valeur,
  unité, date de prélèvement, source (`saisie_praticien | import_labo`).
  **Entité distincte, jamais un champ de la proposition.** N'existe que
  derrière `WN_CB_RESULTS_ENABLED` + attestation HDS.
- Interprétation fonctionnelle : confrontation estimé ↔ mesuré (jamais
  fusionnés en un chiffre), ré-alimentation du moteur d'orientation et du
  momentum (« le mesuré confirme ou infirme le présumé »).
- Le courrier C3 ne transporte toujours pas de pièce biologique tant que la
  frontière n'est pas rouverte explicitement, HDS acquis.

Rien de ce paragraphe n'est planifié : il borne le contrat, il ne l'ouvre pas.

## §8 — Lots, dépendances, gates

Conventions du dépôt : migration = **acte gaté** (revue adversariale
`wn-reviewer` avant, vérification base après merge) ; ingestion prod = acte
gaté ; HDS = **gate dur** ; tout l'aval applicatif derrière `WN_CB_ENABLED`
fail-closed ; un fragment `changelog.d/` et un worktree par lot.

| Lot | Contenu | Dépendances | Gates |
| --- | --- | --- | --- |
| CB-00 | Ce cadrage + décisions 0/A→G actées + **audit de la source NABM fait** ([AUDIT-SOURCE-NABM.md](AUDIT-SOURCE-NABM.md)) | — | aucun |
| CB-01 | **Fait** — migration catalogue CB-A : onze tables (analytes, `biology_nabm_actes`, correspondance `BiologyAnalyteNabm`, deux référentiels de plages, préanalytique, panels, ratios, liens, pointeur de version) + vocabulaires fermés + les **deux flags** déclarés fail-closed | CB-00 | **migration** |
| CB-02a | Domaine `web/src/lib/biology-library/` cloné de `supplement-library/` + import **NABM complet** (988 actes, six appels anonymes) en brouillons `importee` + file de revue | CB-01 | ingestion |
| CB-02b | Corpus notebook « analyses biologiques » : extract → chunk → claims (`metadata.rayon:'biologie'`) → Atelier, **voie lente** | **après stabilisation de la certification** (décision G) | **ingestion prod** ; coût API |
| CB-03 | Extension moteur : variantes de cible `analyse`/`panel_bio` + table biologie **séparée**, vide, signée-sha + double verrou + route | CB-02b ; après les lots 8-9 certification | flag ; table signée |
| CB-04 | Compilateur `tools/corpus/biologie/compile.mjs` → table régénérée par PR revue | CB-03 + claims validés | **signature praticien** |
| CB-05 | Migration + machine à états `BiologyExplorationProposal`/`Item`, génération depuis les candidats | CB-01, CB-03 | **migration** |
| CB-06 | Régimes : courrier médecin (fil C3, texte) / **document patient systématique** ; IA en aval bornée ; Relu→Validé→Envoyé | CB-05 | validation praticien avant diffusion |
| CB-07 | Contrat protocole **V4 `BiologyCatalogRef`** sur `biological_exploration` (décision D actée) | CB-05 | revue adversariale (contrat clinique) |
| CB-08 | UI : rayon dans la bibliothèque, fiche analyte, encart fiche patient, cartes du fil | CB-05/06 | flag |
| CB-09 | Étage 2 : `BiologyResult`, saisie/import, estimé↔mesuré, ré-alimentation | **HDS obtenu** | **GATE DUR HDS** + `WN_CB_RESULTS_ENABLED` |

Ordre après arbitrage : **CB-00 → CB-01 → CB-02a** est le chemin démarrable
immédiatement — il ne dépend ni du notebook ni de la certification, puisque le
catalogue NABM se remplit par import et non par claims. **CB-02b n'ouvre
qu'après la certification** (décision G), et CB-03/04 en découlent : pas de
table de règles biologie avant que la table NNPP2 soit stabilisée et signée.
Puis CB-05 → 06 → 07/08. CB-09 seulement après HDS.

Conséquence pratique : les plages fonctionnelles (`BiologyFunctionalRange`) et
les liens cliniques restent **vides** jusqu'à CB-02b. Le catalogue servi entre
CB-02a et CB-02b n'expose que les valeurs de référence laboratoire et les
métadonnées d'analyse — ce qui est cohérent avec l'invariant : une plage
fonctionnelle sans claim validé n'est jamais servie.

L'audit de la source ajoute une nuance de poids : **le cœur de la biologie
fonctionnelle est absent de la nomenclature** (sélénium, homocystéine,
coenzyme Q10, acides gras érythrocytaires, glutathion peroxydase, mélatonine…).
CB-02a livre donc le socle remboursable et la matière administrative ; ce qui
distingue le rayon d'un bilan de routine arrive en CB-02b, par le corpus. Le
lot d'import n'est pas le lot qui donne sa valeur au rayon.

## §9 — Invariants réglementaires

- **MDCG 2019-11** (qualification logiciel dispositif médical) : mitigation par
  conception — le moteur **signale des candidats sourcés**, le praticien
  décide, l'IA rédige en aval avec validation systématique avant diffusion.
  La finalité revendiquée reste l'aide à la préparation d'une discussion
  praticien/médecin, pas le diagnostic. Une analyse dédiée est due si ce
  périmètre bouge.
- **Exercice illégal de la médecine** : vocabulaire contrôlé (§4), jamais
  d'artefact ressemblant à une ordonnance, le remboursé passe toujours par le
  médecin. Les diplômes de l'opérateur ne changent pas la finalité revendiquée
  du logiciel.
- **Mur HDS** : aucune valeur biologique patient à l'étage 1 ; fil C3 texte
  seul ; deux flags distincts ; chaque table de l'étage 2 = acte gaté HDS.
- **D-003** : plages fonctionnelles, liens cliniques et règles du moteur ne
  sortent que de claims VALIDÉS signés ; la barrière vit dans le SQL, pas dans
  l'UI.
- **Pas de score global, pas de score de risque chiffré** : dimensions nommées,
  justification toujours visible, tri neutre.

## §10 — Décisions actées (praticien, 2026-07-25)

Les huit décisions structurantes ont été tranchées le 2026-07-25. Elles sont
**fermées** : toute réouverture passe par une entrée datée sous ce tableau.

| # | Question | Décision actée |
| --- | --- | --- |
| 0 | Nommage du rayon | **CB** (« Catalogue Biologie »), flag `WN_CB_ENABLED`, scission CB-A / CB-B. Évite C4 (compléments) et C5 (food-compass). |
| A | Séparation documentaire / résultats patient | **Deux flags distincts** : `WN_CB_ENABLED` (étage 1) et `WN_CB_RESULTS_ENABLED` (étage 2, fail-closed, jamais activé avant attestation HDS). |
| B | Construction du moteur | **Étendre** le moteur d'orientation existant (variantes de cible `analyse` / `panel_bio`), pas de moteur frère. |
| C | Table de règles | **Séparée** de la table NNPP2 : sha-256 et signature praticien propres, campagnes indépendantes. |
| D | Lien au protocole | **Contrat V4 `BiologyCatalogRef`** sur l'action `biological_exploration`, miroir de `SupplementCatalogRef` V3. |
| E | Périmètre catalogue V1 | **NABM complet** en brouillons `importee`, vérification praticien au fil de l'eau (précédent C4/DGCCRF). |
| F | Matérialisation des régimes | Remboursé : **courrier texte au médecin traitant via le fil C3**. Non remboursé : **document patient systématique**, même sans exigence du laboratoire. |
| G | Calendrier du notebook biologie | **Après stabilisation de la campagne certification** — ne pas empiler deux files de validation en voie lente. |

Conséquences directes : CB-07 (contrat V4) n'est plus conditionnel ; CB-02b
attend la certification au lieu d'être seulement « parallélisable » ; le second
flag est nommé et gelé dès CB-01.

## §11 — Risques et points de vigilance

Les décisions du §10 en ont refermé deux (charge de validation, télescopage
avec la certification, tous deux traités par le séquencement de la décision G).
Restent :

- ~~**Licence et format NABM/AMELI**~~ — **refermé le 2026-07-25** par
  [l'audit de la source](AUDIT-SOURCE-NABM.md) : LOv2, API FHIR anonyme,
  988 actes en six appels. Le risque résiduel a changé de nature : la source est
  **pauvre en clinique** (ni unité, ni préanalytique, ni valeur de référence) et
  ignore le cœur de la biologie fonctionnelle. L'import remplit la moitié
  administrative d'une fiche — ce que `donneesManquantes[]` doit rendre visible
  plutôt que masquer.
- **Rapprochement analyte ↔ acte NABM** : ni automatisable par libellé (le
  filtre du serveur produit des faux négatifs silencieux), ni bijectif (TSH se
  cote de trois façons). C'est une table de correspondance revue à la main,
  charge à ne pas sous-estimer dans CB-02a.
- **Fusion accidentelle des deux référentiels de valeurs** : le risque de
  conception n°1 — deux tables, deux affichages, jamais une colonne « normes ».
  Le garde naturel est l'invariant « pas de plage fonctionnelle sans claim » :
  entre CB-02a et CB-02b, la colonne fonctionnelle est vide, et cela doit se
  voir plutôt que se combler par défaut avec les bornes labo.
- **Séquencement à tenir** : CB-02b et CB-03 sont désormais suspendus à la
  stabilisation de la certification. Le risque n'est plus le télescopage mais
  l'oubli — le rayon peut rester longtemps à l'état « catalogue sans plages
  fonctionnelles », utile mais muet côté moteur.
- **Collision de nommage** : `web/src/lib/protocol/` (suivi patient) et
  l'atelier de règles C4 (`api/praticien/regles`) sont des homonymes à éviter —
  le domaine s'appellera `biology-library`, le concept « exploration
  biologique ».
- **Périmètre réglementaire** : la décision D (contrat V4) fait entrer une
  référence catalogue biologie dans le protocole. C'est le point où une analyse
  MDCG 2019-11 dédiée devra être refaite si la finalité revendiquée évolue vers
  l'aide au diagnostic.

## Annexe — correspondances

- Rayon modèle : `docs/claude/propositions/2026-07-24-rayon-complements-bibliotheque/PROPOSITION_RAYON_COMPLEMENTS.md`
- Campagne certification (prioritaire, moteur d'orientation) : `docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/README.md`
- Corpus 5.0 (chaîne d'ingestion, deux couches verbatim/claims) : `docs/claude/propositions/2026-07-21-corpus-wellneuro-5-0/README.md`
- Validation à deux vitesses : `docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md`
- Audit HDS et échéance : `docs/claude/propositions/2026-07-24-audit-migration-hds/`
- Code : `web/src/lib/clinical/orientationEngine.ts` (l.43, `CibleExploration`),
  `web/src/lib/clinical/orientationRulesV1.ts`,
  `web/src/lib/clinical-engine/types.ts` (l.277, `biological_exploration`),
  `web/src/lib/supplement-library/`, `web/src/app/dashboard/biologie/page.tsx`,
  `web/src/components/patient-cockpit/EstimeMesurePanel.tsx`
