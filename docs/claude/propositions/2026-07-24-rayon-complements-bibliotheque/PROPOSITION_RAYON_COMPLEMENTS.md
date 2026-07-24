# Proposition — Rayon « Compléments alimentaires » dans la Bibliothèque

> **Nature** : alignement additif à la campagne C4 « Compléments clean label »
> (`docs/claude/campagnes/2026-07-11-complements-clean-label-v1/CAMPAGNE.md`).
> Ce document alimente les « lots à compiler N+1 » de C4 ; il ne crée pas de
> campagne concurrente et ne modifie aucun contrat figé du registre.
>
> **Date** : 2026-07-24 · **Statut** : proposition à relire par le praticien.

## 1. Contexte et existant vérifié

Le « rayon compléments alimentaires » n'est pas un chantier à inventer : il existe
déjà **en germe sur trois plans distincts, non encore reliés**. Toute la valeur de
cette proposition tient dans leur convergence.

### Plan A — La campagne C4, cadrée et dormante

Le module R2 produit (« Bibliothèque de compléments clean »,
`docs/ROADMAP_PRODUIT.md:136-144`) correspond à la campagne **C4** (correspondance
actée, `docs/claude/REGISTRE_FRONTIERES.md`), cadrée le 2026-07-12 et jamais
démarrée (`lot_courant: "aucun"`). Sa scission est actée :

- **C4A — catalogue de qualité intrinsèque** : data-first, aucune donnée patient.
  Composition, actifs, formes, excipients, allergènes, labels, sources officielles
  (DGCCRF / Compl'Alim), date de dernière vérification, pays/marché, version de
  formulation, statut actif/inactif, réviseur, niveau de complétude, incertitudes.
  **Provenance et fraîcheur obligatoires par produit.**
- **C4B — compatibilité avec le protocole actif** : objectif, contraintes patient,
  doublons, dose cumulée, points de vigilance, tolérance antérieure, durée et
  réévaluation, alternatives. **Signalement — jamais décision automatique — des
  interactions connues.**

Trois décisions y sont **figées** : pas de score global dominant (le « clean label
score » unique est écarté ; présentation multi-dimensions), justification toujours
visible (badge + fiche justificative — une liste ordonnée sans justification serait
perçue comme une recommandation commerciale), et contrat de domaine neutre C4/C5
(qualité intrinsèque indépendante du patient + lecture contextuelle ; aucune des
deux campagnes n'est propriétaire technique de l'autre).

### Plan B — Le moteur d'intention clinique, en base et jamais câblé

La migration `20260706215330_moteur_intention_clinique_v1` a posé un schéma complet
(`web/prisma/schema.prisma:404-584`) : `SupplementIngredient`,
`SupplementIngredientForme`, `SupplementSourceReference`, `SupplementSafetyAlert`,
`ClinicalIntentTag`, `ClinicalCriterion`, `FunctionalCategory`, `ClinicalRule`
(intention → ingrédient, doses cibles, forme préférée, grade de preuve, versioning
append-only), `IngredientFunctionalThreshold` (seuils + bascule de risque),
`ProtocolReviewFlag` (drapeaux de revue tracés). **Aucune de ces tables n'est
seedée ; aucune n'est requêtée nulle part dans le code applicatif.** C'est le socle
le plus abouti du rayon — et il dort.

Sa doctrine (`docs/claude/MOTEUR_INTENTION_CLINIQUE_CONTEXTE.md`) est le fil rouge
de toute cette proposition : **le LLM comprend l'intention, un moteur de règles
déterministe signale, le praticien décide**. Et sa décision actée n°11 contraint
l'alimentation des référentiels : jamais de synchronisation API live, jamais
d'écriture directe en base active depuis une source externe — une source externe
produit au mieux des **brouillons de candidats** soumis à validation.

### Plan C — Le corpus de preuve, mature et prêt à accueillir un rayon

La chaîne corpus/claims est opérationnelle : verbatim immuable
(`rag_corpus_chunks`), claims versionnés à statut
`EN_ATTENTE_VALIDATION`/`VALIDE`/`REJETE`, et **barrière D-003 en dur dans le SQL
de récupération** (`match_wellneuro_rag_claims` n'expose qu'un claim validé et
signé par le praticien, rattaché à au moins un chunk source). L'Atelier corpus
(`dashboard/corpus`) est en production. Le notebook **« 10 — Micronutrition et
compléments »** est déjà nommé dans `docs/RAG_PGVECTOR_PRODUCTION.md`, et le champ
`metadata` (jsonb) des chunks et claims permet de taguer un « rayon » **sans
aucune migration**.

### Points d'appui côté protocole et observance

- Le protocole 21 jours (`ProtocolDraft`, append-only, hashé) connaît déjà l'action
  `supplement_exploration` (« Complément à explorer »), volontairement bridée :
  `FORBIDDEN_SUPPLEMENT_FIELDS = [product, produit, form, forme, dose, brand,
  marque]` (`web/src/lib/clinical-engine/protocolDraft.ts:16`) rejette toute
  action nommant un produit, une forme, une dose ou une marque. Le prompt de la
  synthèse IA interdit tout dosage (`web/src/lib/anthropic.ts`). Le protocole
  parle d'**intentions**, jamais de produits.
- Le précédent architectural existe pour lever ce verrou proprement : la référence
  `foodCompassRef` est rejetée en V1 du contrat et « exige un payload protocole V2
  explicite » (`protocolDraft.ts:57-59`). `VERSION_PROTOCOL_DRAFT_V2` est déjà
  déclarée (`types.ts:10`).
- L'observance a un rail : `ProtocolCheckin` J7/J14/J21 (question `adhesion` à
  options fermées non culpabilisantes) → **météo d'adhésion** dérivée à la lecture
  (`web/src/lib/protocol/adhesion.ts`), trois états + indéterminé, praticien
  uniquement, jamais persistée, jamais convertie en pourcentage.
- La trajectoire a ses jalons : `AssessmentEpisode` T0/J21/J42/J90, momentum,
  `TrajectoirePanel`.
- Enfin, la **Boussole alimentaire (C5) livrée en production** fournit le miroir
  architectural complet : domaine `web/src/lib/food-compass/` découpé en
  `intrinsic` / `contextual` / `protocol` / `patientSafe` / `featureFlag`
  (fail-closed, `WN_C5_ENABLED`), référentiel officiel ingéré (Ciqual, 55 744
  lignes), et déjà la métaphore du rayon : « qu'est-ce qui soutient mon sommeil au
  rayon frais ? », filtré par le protocole
  (`docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md`).

## 2. Écarts et nuances relevés

Quatre points factuels à garder en tête avant tout lot :

1. **Un chantier bibliothèque est déjà en vol.** Le worktree
   `.claude/worktrees/ux-5-0-v15-bibliotheque` (branche `feat/instruments-cabinet`)
   porte une version différente de `web/src/app/dashboard/bibliotheque/page.tsx`.
   Sur `main`, la page reste la coquille statique (« Bibliothèque d'interventions »,
   bannière différée). Tout lot d'implémentation devra se coordonner avec cette
   branche pour ne pas concevoir contre un état déjà dépassé.
2. **Le catalogue de questions de check-in est un contrat gelé.**
   `web/src/lib/protocol/checkinDomain.ts` : « Catalogue des questions (gelé,
   français, non culpabilisant) ». Ajouter une question d'observance compléments
   n'est pas une addition anodine : c'est une évolution de contrat gelé, qui exige
   un versionnage explicite (décision 3, §3).
3. **La décision n°11 du moteur d'intention s'applique à toute source externe** :
   DGCCRF/Compl'Alim ne peut qu'engendrer des brouillons ; aucune alerte de
   sécurité active, aucune règle clinique active ne s'écrit depuis un flux externe.
4. **Deux échelles de preuve coexistent et ne doivent jamais se confondre** (dans
   le code comme dans l'UI) : `grade_preuve_scientifique`
   (fort / modéré / faible / usage_traditionnel, type GRADE, côté ingrédients et
   règles) et l'échelle **A/B/C/D** du moteur d'équilibre (provenance d'une donnée
   patient). Les libellés d'interface devront les étiqueter distinctement.

Écart connu à ne pas aggraver : l'audit UX (P1.3) relève des codes de chantier
(« C4 », « différé ») visibles en production — l'ouverture du rayon devra les
retirer, pas en ajouter.

## 3. Décisions

### Tranchées le 2026-07-24 (praticien)

1. **Périmètre V1 du catalogue : DGCCRF/Compl'Alim complet** — pas de pilote
   restreint. Ingestion large en **brouillons**, dimensions qualité calculées
   automatiquement, revue praticien pour activation des liens cliniques. Chaque
   fiche porte un statut honnête (`importée` / `vérifiée`) rendu visible par les
   dimensions « Données manquantes » et « Dernière revue ». Conséquences : le
   LOT-00 (audit des sources : volumes, formats, licence, qualité réelle des
   données Compl'Alim) devient décisif, et la **veille de fraîcheur** (outil n°6)
   passe d'accessoire à centrale.
2. **Question d'observance compléments au check-in : oui, par évolution versionnée
   du catalogue gelé.** Conditionnelle (présente uniquement si le protocole actif
   porte une recommandation compléments matérialisée), options fermées non
   culpabilisantes, alimente la météo d'adhésion comme fait observé. Jamais de
   pourcentage, jamais montrée au patient comme mesure, jamais de relance.
3. **Livrable de la réflexion : ce document committé + une synthèse visuelle**
   (artifact privé).

### Laissée ouverte : le protocole doit-il référencer le catalogue ?

C'est la décision structurante restante. Deux options, à trancher après lecture :

**Option 1 — Contrat protocole V3 avec `supplementCatalogRef` gouverné
(recommandée).** La garde `FORBIDDEN_SUPPLEMENT_FIELDS` **reste intégralement en
place** : ni l'IA ni une saisie libre ne peuvent nommer produit, forme, dose ou
marque dans un draft. S'y ajoute, dans un contrat V3 explicite (même mécanique que
`foodCompassRef` → V2), un champ structuré `supplementCatalogRef` : une référence
**opaque et gouvernée** vers une sélection du catalogue (produit + règle clinique
versionnée + justification), posée **uniquement par le praticien via l'instrument
bibliothèque**, jamais générée. La diffusion patient reste protégée par la chaîne
existante Relu → Validé pour diffusion → Envoyé et par l'adaptateur patient-safe.

- *Pour* : c'est ce qui relie réellement le rayon à l'accompagnement — sentinelle
  de cumul, compatibilité C4B, observance conditionnelle et vue trajectoire ont
  besoin d'une matérialisation dans le protocole pour exister.
- *Contre* : c'est une évolution de contrat clinique versionné (acte lourd, revue
  adversariale) et un déplacement de frontière symbolique : l'application cesse de
  ne connaître que des intentions.

**Option 2 — Rester au niveau intention.** Le protocole garde uniquement
`supplement_exploration` ; la sélection de produit se fait en consultation, hors
application. Le rayon est un instrument de consultation (recherche multicritères,
fiches justificatives, corpus), pas un maillon du protocole.

- *Pour* : zéro évolution de contrat clinique ; frontière actuelle intacte.
- *Contre* : sentinelle de cumul impossible (l'app ne sait pas ce qui est
  recommandé), observance compléments non conditionnable, pas de trace
  longitudinale des recommandations — le rayon reste une encyclopédie.

La question d'observance (décision 2) n'a de sens plein qu'avec l'option 1 ; en
option 2, elle se rabat sur la question d'adhésion générale existante.

## 4. Architecture de convergence — huit couches

Principe directeur hérité du moteur d'intention et de C5 : **qualité intrinsèque
indépendante du patient + lecture contextuelle**, le LLM comprend et cite, le
moteur déterministe signale, le praticien décide. Le futur domaine
`web/src/lib/supplement-library/` reprend le découpage éprouvé de
`food-compass/` : `intrinsic` (C4A) / `contextual` (C4B) / `protocol` /
`patientSafe` / `featureFlag` (`WN_C4_ENABLED`, fail-closed).

| # | Couche | Ce qui existe | Ce qui manque | Lot |
|---|--------|---------------|---------------|-----|
| 1 | **Sources** (DGCCRF/Compl'Alim, corpus SIIN, OFF différé) | Pipeline `tools/corpus/` (extract 2 IA A/B/C, chunk, claims, ingest) ; précédent d'ingestion Ciqual | Audit des sources open data (formats, licence, fraîcheur, volumétrie), modèle de fiche produit | LOT-00 |
| 2 | **Référentiel qualité C4A** | Squelette `SupplementIngredient`/formes/sources/alertes (dormant) | Entité `SupplementProduct` + composition multi-ingrédients, attributs qualité, chaîne import → brouillon → revue → activation, seed | LOT-01/02a |
| 3 | **Corpus de preuve** | `rag_corpus_claims` + barrière D-003, Atelier corpus en prod | Extraction/validation du notebook 10, tag `rayon: micronutrition` dans `metadata` (aucune migration) | LOT-02b |
| 4 | **Moteur d'intention C4B** | `ClinicalIntentTag`/`ClinicalRule`/seuils/`ProtocolReviewFlag` en base, versioning spécifié | Seed des règles (gouvernance praticien), moteur runtime de résolution, lecture du protocole actif | LOT-03 |
| 5 | **Protocole C1/C2** | `supplement_exploration`, garde des champs libres, précédent `foodCompassRef`→V2 | Contrat V3 `supplementCatalogRef` **si option 1 retenue** | LOT-04 |
| 6 | **Portail patient / documents C3** | `patientProtocolView`, C3 consommant les blocs publiés, chaîne Relu→Validé→Envoyé | Bloc « fiche complément » publiable, adaptateur `patientSafe` | LOT-04 |
| 7 | **Observance** | Check-ins J7/J14/J21, météo d'adhésion dérivée | Question compléments conditionnelle **versionnée**, fait observé supplémentaire | LOT-05 |
| 8 | **Trajectoire** | Épisodes T0/J21/J42/J90, momentum, `TrajectoirePanel` | Vue juxtaposée intentions × épisodes × météo (faits, jamais de causalité) | LOT-05/06 |

### L'entité produit et le pivot ingrédient

Le référentiel V1 (un ingrédient par règle) **suffit au moteur C4B mais pas au
catalogue C4A**, dont le cadrage exige composition multi-ingrédients, excipients,
labels, version de formulation, statut — inexprimables au niveau ingrédient. D'où :

- `SupplementProduct` : marque, marché, version de formulation, provenance,
  fraîcheur (date de dernière vérification), statut (`importée` / `vérifiée` /
  `inactive`), niveau de complétude, incertitudes.
- `SupplementProductComposition` : produit → ingrédient + forme + dose par unité
  de prise.

**L'ingrédient reste le pivot clinique** : règles, seuils et alertes demeurent au
niveau ingrédient (schéma V1 intact) ; le produit est une matérialisation
commerciale qui s'y projette par sa composition. Cela prépare la V2 du moteur
(`clinical_rule_ingredient_options`, `intent_conflicts`) sans la déclencher.

### Flux d'ingestion de masse (choix « catalogue complet »)

```text
DGCCRF / Compl'Alim (open data)
        │  import brut (script hors runtime, façon tools/corpus/)
        ▼
Staging brouillon (statut: importée — non activable cliniquement)
        │  calcul automatique des dimensions qualité (déterministe, sourcé)
        ▼
File de revue praticien (façon Atelier corpus)
        │  vérification / complétion / activation
        ▼
Fiche vérifiée — liens cliniques activables (règles, alertes, corpus)
```

Aucune alerte de sécurité, aucune règle clinique n'est jamais écrite par le flux
externe (décision n°11) ; seules les fiches produit brutes entrent en brouillon,
et leur statut est affiché sans fard dans les dimensions de la fiche.

## 5. Choix multicritères — sans score global

Conforme à la décision figée de C4 : des dimensions **qualitatives nommées, jamais
agrégées en un chiffre**, chacune sourcée, la justification toujours à un clic.

### Les huit dimensions

| Dimension | Source de vérité | Valeurs (exemples) |
|-----------|------------------|--------------------|
| Qualité de formulation | C4A (formes, excipients, additifs) | Bien documentée / Partielle / Lacunaire |
| Biodisponibilité de la forme | `SupplementIngredientForme` + `formePreferee` des règles | Forme préférée / Acceptable / Non préférée |
| Grade de preuve par intention | `ClinicalRule.gradePreuveScientifique` (GRADE) | Fort / Modéré / Faible / Usage traditionnel |
| Compatibilité protocole | C4B (si protocole actif ouvert) | Compatible / Compatible avec vigilance / Vigilance requise / Non évaluée |
| Interactions signalées | `SupplementSafetyAlert` | Libellé du signalement, « à discuter avec le médecin traitant » |
| Cumul vs seuils | `IngredientFunctionalThreshold` | Flag `cumul_substance` — jamais de somme automatique |
| Données manquantes | Complétude C4A | Liste explicite (abstention honnête) |
| Fraîcheur / provenance | C4A | Source, date de dernière revue, version de formulation, statut |

La dimension **coût** est différée : aucune source de prix gouvernée, et une
colonne prix accentuerait le risque de perception commerciale que la fiche
justificative combat.

### La mécanique

- **Facettes indépendantes** : chaque dimension filtre ; aucune ne pondère les
  autres.
- **Tri mono-dimension, explicite** : le praticien choisit sa clé de tri ; aucun
  tri par défaut « meilleur produit » (ordre neutre : alphabétique ou par
  intention). Un compteur factuel — « N règles cliniques correspondantes » — n'est
  pas un score.
- **Entrée par l'intention clinique** (`ClinicalIntentTag`), atteinte depuis un
  creux des 12 besoins ou un axe neuro via une **table de mapping gouvernée**
  besoin/axe → intentions (de la donnée, pas du code — même motif que
  `FunctionalCategory`).
- **Rendu 5.0** : instrument **à tiroir** ouvert depuis la zone focale du
  protocole (direction UX actée de C4) — jamais un écran de classement autonome.
  Un « radar de compatibilité » a été écarté : un radar suggère visuellement un
  score agrégé ; on lui préfère le **tableau de compatibilité** aux quatre lignes
  actées (qualité / compatibilité / manquant / dernière revue).

## 6. Observance et trajectoire

Trois interdits inviolables, repris de la météo d'adhésion : jamais un score ou un
pourcentage, jamais exposé au patient, jamais d'interprétation automatique. Et,
doctrine transverse : jamais de relance ni de notification patient.

1. **Question de check-in versionnée et conditionnelle** (décision 2) : ajoutée
   par évolution versionnée du catalogue gelé ; n'apparaît que si le protocole
   actif porte une recommandation compléments matérialisée. Options fermées
   calquées sur la question `adhesion` : « Pas encore commencé / Quelques prises /
   La plupart des jours / Tous les jours », plus un motif facultatif fermé
   (« oubli / gêne digestive / doute / autre »). On **rapporte**, on n'infère pas.
2. **Météo d'adhésion inchangée dans sa structure** : un seul agrégat qualitatif.
   La réponse compléments y entre comme **fait observé** supplémentaire (verbatim
   sourcé, point d'étape et date) — pas de deuxième météo, pas de pondération.
3. **Signaux par intention, côté praticien** : la fiche protocole montre, par
   intention active, la dernière réponse rapportée (verbatim), la tolérance, et
   les `ProtocolReviewFlag` ouverts.
4. **Corrélation trajectoire par juxtaposition** : bandeau des intentions et
   matérialisations actives par période, épisodes T0/J21/J42/J90 dessous, météo
   par point d'étape. Aucune flèche causale, aucun coefficient — « pendant cette
   période, l'intention X était active ; adhésion rapportée : régulière ». Le
   praticien conclut. Dérivée à la lecture, jamais persistée, jamais montrée au
   patient.

## 7. Catalogue d'outils (11)

| # | Outil | Ce qu'il fait | S'appuie sur | Effort | Garde-fou |
|---|-------|---------------|--------------|--------|-----------|
| 1 | **Rayon corpus micronutrition** | Sert dans chaque fiche les claims validés du notebook 10, filtrés par `metadata.rayon` | `match_wellneuro_rag_claims`, Atelier corpus, `tools/corpus/` | M | Barrière D-003 : seuls les claims validés praticien sortent |
| 2 | **Fiche justificative sourcée** | Badge multi-dimensions + fiche détaillée avec citations (claims D-003, `SupplementSourceReference`) | C4A, corpus, patron des fiches C5 | M | Justification toujours visible ; validation praticien avant diffusion |
| 3 | **Sentinelle de cumul** | Détecte doublons d'ingrédient et cumul de dose multi-produits contre les seuils ; lève `cumul_substance` | Seuils fonctionnels, `ProtocolReviewFlag`, composition produit | M | Alerte systématique, jamais de somme automatique ; résolution tracée |
| 4 | **Tableau de compatibilité protocole** | Lecture contextuelle C4B du protocole actif — les quatre lignes actées | C4B, protocole actif, contrat neutre C4/C5 | M | Pas de score global (décision figée) |
| 5 | **Passerelle « l'assiette d'abord »** | Pour chaque intention, montre les réponses alimentaires C5 **avant** les produits | `food-compass/contextual`, mapping des axes | S/M | Hiérarchie alimentation > supplémentation ; aucune dépendance technique C4↔C5 |
| 6 | **Veille de fraîcheur DGCCRF** | Recontrôle périodique (produit retiré / reformulé / à revérifier) → brouillons en file de revue | Source open data, C4A (version de formulation, date de revue) | M | Décision n°11 : jamais d'écriture directe en base active |
| 7 | **Copilote « pourquoi ce complément maintenant »** | Carte de consultation citant l'intention validée, la règle (version, grade), les sources | Copilote 5.0, `ClinicalRule` versionnée, claims | M/L | L'IA cite, ne décide pas ; jamais de dosage généré |
| 8 | **Vue trajectoire intentions → épisodes** | Juxtaposition intentions / épisodes T0-J90 / météo, praticien seul | `AssessmentEpisode`, momentum, `adhesion.ts` | M | Faits juxtaposés, jamais de causalité ni de persistance |
| 9 | **Check-in compléments versionné** | Question d'observance conditionnelle (cf. §6) | `checkinDomain.ts` + versionnage | S | Contrat gelé → évolution versionnée ; pas de %, pas de relance |
| 10 | **Carnet patient non gamifié** | Côté Jardin : le « pourquoi » en langage patient, note libre facultative reprise au check-in | `patientProtocolView`, adaptateur patient-safe | M | Aucun streak, score, badge ni notification ; vocabulaire « recommandation » |
| 11 | **Atelier de règles cliniques** | UI de gouvernance des `ClinicalRule` (création versionnée, sources obligatoires, validation) — le pendant de l'Atelier corpus | Patron `AtelierCorpusPanel`, versioning append-only | M | `versionRegle` append-only, signature obligatoire, vocabulaire contrôlé (`clinical_criteria`) |

**Différés actés** (frontières C4) : scan code-barres patient Open Food Facts
(avec le scanner C5), interactions médicamenteuses exhaustives (signalement simple
d'abord), dimension coût.

## 8. Séquencement — LOT-00 → LOT-06

Raffinement de l'esquisse C4 existante (LOT-00 → LOT-04), en tenant compte du
choix « catalogue complet » :

- **LOT-00 — Audit sources + modèle de fiche + décision protocole.** Audit
  approfondi DGCCRF/Compl'Alim (volumétrie, formats, licence, qualité réelle,
  fréquence de mise à jour), modèle de fiche produit, tranche l'option 1/2 du §3.
  Aucune migration. *Livrable : contrat de données.*
- **LOT-01 — Schéma catalogue C4A.** Migration `SupplementProduct` + composition +
  attributs qualité. **Acte gaté** : `bloqué_confirmation`, revue adversariale
  `wn-reviewer` avant, vérification de la base de production après (convention du
  dépôt pour toute migration).
- **LOT-02a — Import de masse + fiches.** Import DGCCRF complet en brouillons,
  calcul des dimensions, file de revue praticien, fiches servies dans la
  bibliothèque derrière `WN_C4_ENABLED` (fail-closed, modèle `WN_C5_ENABLED`).
  Retire la bannière différée et les codes de chantier visibles (audit UX P1.3).
  **Coordination obligatoire avec la branche `feat/instruments-cabinet`.**
- **LOT-02b — Corpus notebook 10** *(parallélisable dès maintenant, indépendant de
  LOT-01)*. Extraction / chunk / claims du notebook « 10 — Micronutrition et
  compléments », validation à l'Atelier, tag `rayon`. **Ingestion prod = acte
  gaté.** Prérequis des outils 1, 2 et 7.
- **LOT-03 — Moteur C4B + sentinelle + atelier de règles.** Seed des règles
  (gouvernance praticien), moteur de résolution, `ProtocolReviewFlag` runtime,
  tableau de compatibilité, passerelle « l'assiette d'abord ». Aucune migration
  nouvelle attendue (tables déjà en place).
- **LOT-04 — Intégration protocole/documents** *(si option 1 retenue)*. Contrat
  V3 `supplementCatalogRef`, adaptateur patient-safe, bloc publiable pour C3,
  chaîne Relu → Validé inchangée.
- **LOT-05 — Observance + trajectoire.** Check-in versionné, fait observé météo,
  vue intentions → épisodes. Dépend de LOT-04 (il faut des matérialisations pour
  conditionner la question).
- **LOT-06 — Outils corpus/copilote/veille.** Rayon corpus (dépend LOT-02b),
  fiche justificative enrichie, copilote « pourquoi », veille de fraîcheur.

Dépendances critiques : seed du référentiel **avant** le moteur ; notebook 10
validé **avant** le rayon corpus ; C4B **avant** toute matérialisation ;
matérialisation **avant** la question d'observance.

## 9. Invariants réglementaires appliqués

- **Vocabulaire** : « recommandation », « point de vigilance », « à discuter avec
  le médecin traitant » — jamais « prescription », « ordonnance », « diagnostic ».
- **Barrière D-003** : aucune sortie du corpus n'atteint un patient sans
  validation praticien signée ; la barrière est dans le SQL, pas dans l'UI.
- **Chaîne de diffusion** : Relu → Validé pour diffusion → Envoyé ; jamais d'envoi
  automatique, jamais de relance.
- **Pas de score global, pas de gamification, pas de score de risque chiffré** ;
  l'observance reste qualitative, praticien seul.
- **Interactions** : signalement, jamais décision — et « à discuter avec le
  médecin traitant » systématique.
- **HDS** : non requis pour le catalogue (données documentaires, aucune donnée de
  santé) ; la contrainte HDS (échéance de dérogation 2026-10-21) ne concerne que
  la biologie réelle et n'entre pas dans ce périmètre.
- **Éviter la qualification dispositif médical** : le moteur signale et cite, le
  praticien décide ; aucune décision automatique n'est prise par le système.

## 10. Questions ouvertes

1. **Option 1 ou 2 pour le protocole** (§3) — la décision conditionne LOT-04 et
   LOT-05.
2. **Licence et qualité réelles de l'open data Compl'Alim/DGCCRF** — à établir en
   LOT-00 (le choix « catalogue complet » en dépend opérationnellement).
3. **Gouvernance du seed des règles cliniques** : qui rédige les premières
   `ClinicalRule` (brouillons IA depuis le corpus validé, puis validation
   praticien à l'atelier de règles ?) — cohérent avec le pipeline claims.
4. **Le mapping besoins/axes → intentions** : périmètre initial (les 12 besoins ?
   les axes DNST ?) et son propriétaire.
5. **Articulation avec la branche `feat/instruments-cabinet`** : la page
   bibliothèque cible doit-elle absorber le rayon dès son ouverture ou dans un
   second temps ?

### Annexe — correspondances

| Ce document | Référence |
|-------------|-----------|
| Campagne | C4 « Compléments clean label » (`docs/claude/campagnes/2026-07-11-complements-clean-label-v1/`) |
| Module roadmap | R2 produit (`docs/ROADMAP_PRODUIT.md:136-144`) ; E1 « squelette bibliothèque compléments » |
| Registre | `docs/claude/REGISTRE_FRONTIERES.md` (entrée C4 ; correspondance R2 → C4) |
| Schéma dormant | `web/prisma/schema.prisma:404-584` + `docs/claude/MOTEUR_INTENTION_CLINIQUE_CONTEXTE.md` |
| Corpus | `docs/RAG_PGVECTOR_PRODUCTION.md` (notebook 10) ; Atelier corpus (D-004) ; barrière D-003 |
| Miroir architectural | Boussole alimentaire C5 (`web/src/lib/food-compass/`, `WN_C5_ENABLED`) |
