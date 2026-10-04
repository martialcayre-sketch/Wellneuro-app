# Cadrage — BIO-PARCOURS, la biologie comme aide à la décision à chaque échelon du parcours (2026-10-04)

> **Proposition de cadrage, non arbitrée.** Elle répond à la ligne « Ré-alimentation
> du moteur par le mesuré » de `FILE_ATTENTE.md` (frontière [[D-122]]). Aucune
> décision n'est prise ici : la campagne ne s'ouvre qu'après vos réponses au §7,
> et BP-00 en porte la décision.

*Document de synthèse pour le responsable, issu d'un audit en largeur (lecteurs, conceptions, contre-revues adverses, synthèse). Lecture seule du dépôt au 2026-10-04 (`main` à `6588bda5`). Aucune valeur chiffrée n'y figure : partout où une borne serait nécessaire, elle est notée « valeur sourcée à poser (claim certifié) ». Les seuls nombres sont des comptes et des constantes produit.*

---

## 1. État des lieux

### Ce que la biologie fait aujourd'hui

- **Elle se saisit et s'importe.** `resultats_biologiques` (modèle `ResultatBiologique`, `web/prisma/schema.prisma`) : valeur `DECIMAL` transportée en texte, unité du vocabulaire fermé, date et heure de prélèvement, source, auteur, correction chaînée en ajout seul (`supersedes_resultat_id`, D-124). Écrivains : route de saisie unitaire, route bilan (LOT-01), validation d'import ligne à ligne (`biology-library/import/decisions.ts`, D-256). Catalogue à 85 analytes saisissables après D-261, resolver signé à 145 entrées (D-263). Les dérogations d'unité (D-264, migration `20261003230000`) sont **en préparation, non mergées** : elles ne comptent pas comme acquis tant que leur migration n'est pas appliquée et constatée. Le drapeau `WN_BIO_INGEST_ENABLED` est **posé en production depuis le 2026-10-03** (`LOT-02-staging-et-pdf.md:118`, `FEATURE_FLAGS.md`) ; la première extraction réelle a eu lieu le même jour (D-260).
- **Elle s'affiche, sans verdict.** Panneau « Estimé ↔ mesuré » (`EstimeMesurePanel.tsx`) : mesures par analyte, correction tracée, plage fonctionnelle juxtaposée seulement si publiée et à unité identique (D-157 §4). Portes biologiques de cinq assiettes (`portesBiologiquesAssiettesV1.ts`, `portesBiologiquesService.ts`, D-245/D-246/D-247) : claims cités entiers, dernier résultat, aucun nombre dans le module.
- **Elle entre dans le protocole par un geste humain, par deux véhicules distincts.** (a) L'action de protocole : statut `conditionnelle_biologie` avec `waitFor {type:'biologie', cible: texte libre, echeance?}` (`clinical-engine/types.ts`, `protocolDraft.ts:84`, `normalizeWaitFor`). (b) La règle de complément C4 : type `WaitForBiologie` et lecteur unique `lireConditionBiologique` (`supplement-library/decisionAvantBiologie.ts:153`), réutilisé à l'écriture par l'atelier (`gouvernance.ts:30,455`, D-142) ; là aussi `cible` est un texte libre. Dans les deux cas, l'arbitrage est à trois verdicts sans valeur (`biology-library/arbitrage.ts`, D-059 §4, contrat SQL négatif `cb_arbitrage_biologique_v1_negatif.sql`), et la révision versionnée rend l'approbation caduque (`biology-library/revision.ts` pour la résolution ; `isApprovalStale` vit dans `protocol/diffusion.ts:74`, qui compare l'empreinte du brouillon à la version active).

### Ce qu'elle ne fait pas, échelon par échelon

| Échelon | Lecture d'un résultat ? | Fichiers |
|---|---|---|
| T0, épisode, snapshot | Non. `sourceType` est le littéral `'questionnaire'` (`types.ts:202`) ; `evaluerPreconditionsT0` ignore la biologie | `assessmentEpisode.ts`, `clinicalSnapshot.ts`, `preconditionsT0.ts` |
| Orientation, indications de bilan | Non. `indicationsBiologieV1` (15 règles, 29 claims, D-069) dit quel bilan proposer depuis les questionnaires ; `statuts.ts` calcule `a_repeter` sur une **déclaration** de panel, jamais sur un résultat | `orientationRulesV1.ts`, `indicationsBiologieV1.ts`, `statuts.ts` |
| 12 besoins | Non. `BESOIN_SOURCES` ne connaît que des questionnaires ; besoins 2, 6, 7, 11 sans source ; grade C « biologie fonctionnelle » réservé dans `NIVEAU_PREUVE_PAR_SOURCE` et porté par aucune source | `equilibre/constants.ts`, `score.ts`, `evidence.ts` |
| Priorités, carte | Non. Quatre règles publiées sur Q_MOD_03 ; `PRIO-FAT` écartée avec une condition de retour qui réclame « une MESURE d'un instrument spécifique » (`priorityRulesV1.ts:430`) ; `counterfactuals` jamais alimenté | `priorityRulesV1.ts`, `chaineC1.ts`, `decisionCard.ts` |
| Moteurs de proposition | Non. Trois mécanismes d'assistance existent et aucun ne lit un résultat : `suggererDepuisLignes` sur table signée (`baremeChargePur.ts:147`, D-198), le protocole tiré du corpus (`catalogueConduitesV1.ts`, D-206, cadrage du 2026-09-16), le producteur d'intentions suspendues (D-190, LOT-05 du protocole assisté). `indicationsAssiettesV1.ts` indique une assiette sur questionnaires, anamnèse et âge seulement | `baremeChargePur.ts`, `catalogueConduitesV1.ts`, `indicationsAssiettesV1.ts` |
| Protocole | Attente nommée seulement ; `cible` n'est pas un code du catalogue, dans aucun des deux véhicules | `protocolDraft.ts`, `decisionAvantBiologie.ts` |
| Compléments | Rien. `deciderIntentionsAvantBiologie` (plurielle, `:394-408`) rend `catalogue_decision_vide` tant que le catalogue de décision C4 est vide ; la singulière (`:189`) refuse règle par règle (non validée, source absente, claim invalide, alerte, seuil). D-133 constate un moteur « sans personne pour l'appeler », pas un catalogue vide | `supplement-library/decisionAvantBiologie.ts` |
| Diffusion, check-ins, J21 | Rien. Jour 0 = première diffusion (D-255) ; résumé J21 = momentum + check-ins | `calendrierSuivi.ts`, `resumeJ21.ts`, `adhesion.ts` |
| Patient | Rien, et c'est voulu : la phrase d'attente de `contenuPatientProtocole.ts` n'est jamais déduite de `waitFor.cible` | |

C'est la frontière posée par D-122 §2 et confirmée par D-256 : « faire parler un résultat réel au moteur est une règle clinique neuve, avec sa décision et ses claims ».

### Ce qui manque pour aller plus loin

- **Plages sourcées** : deux seulement en production (ferritine, vitamine D ; D-068, migration `20260817090000`), niveau de preuve C. Aucune sur les 36 analytes de D-261, et le contrat `cb_catalogue_niveau_1_donnees.sql` l'interdit explicitement. Les bornes sont stockées en `Float` (`schema.prisma:2118-2147`) face à une valeur `Decimal` ; aucune inclusivité de borne ; aucune version ni chaîne de remplacement.
- **Liens marqueur ↔ besoin** : `biology_analyte_links` existe au schéma avec la **bonne forme déjà contrainte** (`cible_type` ∈ besoin/axe/nutriment, `cible_code` de 1 à 12 pour un besoin, `direction`, `claim_id` et `version_claim` obligatoires, `niveau_preuve` ; migration `20260725160000:406-415`). Aucune migration n'y insère, aucun lecteur hors `src/generated` ; l'effectif réel se constate au conteneur, pas au dépôt. Le cadrage « Curation signée » (rang 4, `CADRAGE_CURATION_SIGNEE_2026-09-16.md:132`) range ces liens « à zéro ligne » dans son périmètre, à cadence praticien.
- **Contexte DC-46** : rien ne porte le contexte **par prélèvement**. Le catalogue, lui, porte déjà un vocabulaire préanalytique fermé : `biology_preanalytics.type_condition` ∈ {jeûne, moment de la journée, délai après prise, arrêt de supplémentation, cycle menstruel, contenant, transport} (`20260725160000:301-304`), jamais peuplé ni lié à une ligne de résultat. DC-46 nomme explicitement l'âge en années, les traitements et l'état inflammatoire comme manquants, et désigne son porteur, **CB-09**. Le sexe n'est pas une colonne du dossier ; la date de naissance manque sur une partie des dossiers.
- **Séries** : `derniersResultatsParAnalyte` élit une ligne et ne compare rien. Aucune fonction de série n'existe.
- **Claims** : huit claims signés pour les portes (D-246), 29 pour les indications de bilan (D-069), deux pour les plages. Trois marqueurs ont des bornes discordantes entre claims VALIDE (CRP-us, homocystéine, index oméga 3 ; D-245 §4). Un conflit de sources est déclaré sur la répétition annuelle (CS-BIO-01, `conflitsSourcesV1.ts`). Côté besoins, la source `fondements-12-besoins` compte 20 claims validés et le corpus `biologie-fonctionnelle` 6 sources (relevé du cadrage Curation signée) : nul n'a vérifié qu'ils nomment des marqueurs.
- **Bandes de bruit** : `BANDES_DE_BRUIT` vaut `publiee:false, bandes:[]` (`momentumParBesoin.ts:57-69`) : **même le momentum déclaratif par besoin n'est pas qualifiable**. Son delta, lui, est servi comme fait (D-058 §1, `qualification: null`) : ce qui manque est la **qualification** d'une évolution, pas la mesure. L'attribution au protocole demanderait encore autre chose (DC-39, DC-48 ; §3.6).
- **Doctrine** : DC-46 est écrite « sans objet tant que le verrou HDS tient » (`CONSTITUTION_CLINIQUE.md:802`) alors que `WN_CB_RESULTS_ENABLED` est posé depuis le 2026-09-09. Elle n'est pas périmée : elle se déclare exigible dès cette pose. C'est une **dette actuelle**, pas une question future. DC-39 et DC-48 (une modification à la fois, temporalité avant/pendant/après) sont orphelines : aucun modèle de traitement au schéma.
- **Usage réel** : zéro ligne sur 28 dossiers actifs au 2026-09-30 (campagne BIO-INGEST), première extraction le 2026-10-03 (D-260). Une seule approbation de diffusion de protocole constatée fin septembre (`SESSION_LOG.md`), aucun check-in constaté. Ce constat est à recompter au conteneur avant tout cadrage.
- **Gardes** : le hook DC-17 (`.claude/hooks/protect-wellneuro-files.mjs`) ne couvre que huit fichiers, pas les tables signées récentes (portes, indications d'assiettes, barème, repli, conflits, conduites, resolver).
- **Écart mémoire/code** : `MAX_ACTIONS_PROTOCOLE_21J = 3` (`types.ts:63`). Le « plafond 7 » de la mémoire relève du cadrage Phase 5 Actions, hors de cette campagne.
- **File d'attente** : trois lignes touchent ce sujet (`FILE_ATTENTE.md`) : « Ré-alimentation du moteur par le mesuré » (à cadrer, frontière D-122), « Curation signée » (rang 4, liens biomarqueur↔besoin, nature du seuil DC-20) et « Biologie exploitée » (rang 4 bis, cadrée le 2026-09-04, quatre lots documentaires). Leur articulation n'est pas arbitrée : c'est l'objet du §6.

---

## 2. Principes non négociables, et ce qui est refusé

### Principes

1. **Aucune règle sans claim certifié, aucun seuil inventé** (DC-01, DC-19, DC-26). Les fenêtres temporelles et les intervalles biologiques sont nommément des chiffres cliniques (DC-19) : un délai de répétition, une fenêtre de rapprochement à un jalon ne deviennent pas « techniques » par déclaration (DC-20).
2. **Une valeur ne s'interprète pas isolément** (DC-46, exigible depuis le 2026-09-09, porteur CB-09). Un contexte inconnu rend une règle non évaluable, jamais négative (DC-24).
3. **Le rapprochement est le geste du praticien** (D-157 §2) : aucun écart calculé, aucune couleur, aucun tri, aucun mot de verdict (§3), aucune conversion (§4), toutes les plages actives et jamais une seule (§5).
4. **Un score n'est pas un diagnostic, une réponse n'est pas une validation** (DC-27). Aucun effet attribué au protocole tant que DC-39 et DC-48 n'ont pas de véhicule, et aucune tendance qualifiée tant que les bandes ne sont pas publiées (D-058).
5. **Une discordance se signale et ne se résout pas** (DC-30, DC-54, DC-55). Un marqueur à bornes discordantes reste documentaire sans arbitrage signé.
6. **Aucune condition évaluée par un LLM** (D-003, DC-26). Aucune donnée biologique ni dérivé n'entre dans un prompt hors l'extraction D-256.
7. **Table signée à cinq termes, module séparé** (D-063, D-067, D-245 §3) : on ne touche ni `indicationsAssiettesV1`, ni `priorityRulesV1`, ni `orientationRulesV1`, ni `indicationsBiologieV1`, ni `catalogueConduitesV1`. Le périmètre haché inclut tout ce dont le comportement dépend (leçon D-180).
8. **Pas de rétroaction** (D-052, D-113, D-255) : rien ne recalcule une carte confirmée ni un protocole diffusé. Le parcours change par un geste (arbitrage, révision, pivot) ou au jalon suivant.
9. **Un drapeau fail-closed par marche**, empilé sur `isCbResultsEnabled`, posé avec le code qui le lit (D-081). Signer ne vaut pas allumer.
10. **Migration seule dans sa PR, release-db, constat, puis code** (D-087). Rien sur `schema.prisma` sans demande explicite.
11. **Rien de biologique vers le patient** (D-122 §1, D-157, D-251, contrat `contenuPatientProtocole.ts`). Dépôt public : aucun texte clinique nouveau dans le code.
12. **Une fixture prouve un mécanisme** (D-125). L'usage se lit au conteneur, par identifiant, en agrégats, jamais dans le dépôt.
13. **Un seul lecteur par véhicule d'attente** (D-142) : toute typage d'une attente biologique vaut pour `ProtocolWaitFor` **et** pour `WaitForBiologie`, sinon l'écriture et la lecture divergent à nouveau.

### Refusé, même si c'est tentant

| Refus | Motif |
|---|---|
| Convertir une valeur en couverture d'un besoin, ou faire jouer le plafond des fondations critiques sur une mesure | Projection et pondération sans source de méthode (DC-19, DC-21, DC-29, D-106). Le score sort au patient par `api/patient/equilibre` qui ne lit aucun épisode : un bilan saisi ferait tomber son indice, sans geste. « Carence objectivée » est un mot interdit (D-157 §3, DC-31). |
| Éteindre une proposition de bilan parce qu'un résultat existe | D-122 : règle « résultat → statut de panel ». Le claim de répétition est sous conflit déclaré CS-BIO-01, l'autre conditionne la répétition à la **valeur**. Fail-open que D-072 avait justement retiré. `statuts.ts` alimente le document patient et le courrier médecin. |
| Écart brut entre deux prélèvements | C'est le geste de D-157 §2. Une même unité ne garantit ni même laboratoire ni même contexte (DC-46). |
| Étiqueter un prélèvement « J42 » ou « base » par une fenêtre réemployée | `TOLERANCE_JOURS_JALON` est calibrée pour des questionnaires, « ajustable », sans source biologique (DC-19). Seul « jour n depuis le jour 0 » est un fait. |
| Faire entrer les résultats dans le snapshot et l'empreinte de la carte | Toute carte diffusée dériverait au déploiement (`rejeuCarteDecision.ts`, « le défaut déplacé ») ; une correction D-124 retirerait au patient son protocole (`portailProtocol.ts:113`). |
| Brancher une discordance biologique sur `contradictionsV1` ou une feuille biologique sur `OrientationDeclencheur` | Ces sorties sont injectées dans le prompt de synthèse (`synthese/generation.ts:1078,1106`), dont le narratif va au patient. Flux Anthropic non déclaré au registre. De plus, la grammaire `OrientationDeclencheur` est partagée par cinq tables signées : une variante neuve re-signe orientation, priorités, contradictions, indications de bilan et d'assiettes (leçon D-231 : huit fichiers touchés). |
| Un signalement biologique de sécurité dans la chaîne C1 | La levée D-257 ne couvre que les constats d'anamnèse (`safetyFindingSource.ts`) : dossier bloqué sans sortie, ou attestation libre que D-257 a écartée. |
| Verdict d'arbitrage pré-rempli ; porte automatique d'assiette ; condition C4 typée évaluée | D-059 §4, D-245 §1, DC-24 (ne pas pré-poser le plus engageant), catalogue C4 vide, DC-42 et DC-43 non armées, aucune plage sur les marqueurs des portes. |
| Une ligne biologique dans `catalogueConduitesV1` ou une « case biologie » évaluée dans une conduite | Toute ligne périme la signature entière (D-206, D-224) ; le claim fonde l'indication et une case évaluée serait une condition sans grammaire signée. |
| Choisir une plage par population, ou une borne parmi des claims discordants | D-157 §5, DC-14, DC-54. Sexe absent du dossier. |
| Grade C affiché sur un besoin dès qu'une mesure existe | `NIVEAU_PREUVE_PAR_SOURCE` est « non validé cliniquement » ; homonymie avec DC-45. |
| Réutiliser le journal d'accès comme journal d'usage | Finalité d'audit (G-TRUST-04), purge à 12 mois, aucune donnée clinique admise. |
| Un « faisceau d'évidences » ou un « indicateur de performance » par priorité | La mise en page est attributive par structure (DC-27, DC-39). |

---

## 3. Architecture cible par échelon

Principe d'ensemble : **la présence, la date et l'unité d'abord ; la valeur jamais sans règle signée**. Le moteur range, signale, met en attente. Le praticien décide par les gestes qui existent.

### 3.1 T0 — épisode et confirmation

- **Il voit** : sous la proposition d'épisode, un encart « mesures au dossier à la date de confirmation » (analyte, date et heure, provenance), calculé par rejeu sur `saisi_le`, hors empreinte. Un échec de lecture s'affiche « lecture impossible », jamais « aucune mesure ».
- **Il décide** : confirmer T0 comme aujourd'hui. Aucune case pré-cochée, aucune précondition ajoutée — même souple, elle coûterait un motif à chaque contournement (leçon D-156) et modifierait de fait la table de D-052.
- **Règles à signer** : aucune. Décision de régime : afficher présence et date n'est pas une interprétation (BP-00).
- **Données** : aucune migration. Pas de `lecture_biologique_ancre` : la base d'un cycle se dérive de `joursZeroParCycle`, pas de l'ancre T0 (D-255 les sépare).
- **Garde-fous** : banc d'égalité **des empreintes** (pas seulement des sorties) avec et sans résultats ; `includedResponseIds` et `inputHash` inchangés.

### 3.2 Douze besoins — calcul et suivi

- **Il voit** : rien de nouveau dans le calcul. Dans la fiche-trajectoire, une colonne « mesuré » séparée : liste tabulaire de valeurs datées par analyte, sans courbe, sans grade, jamais fusionnée (A6-R2). Pour un besoin non évalué par questionnaire : « non évalué », avec un lien neutre vers le panneau Estimé ↔ mesuré, sans inventaire de mesures sous le besoin.
- **Il décide** : re-passation ciblée ou bilan, par les files existantes.
- **Le chemin concret vers le calcul, nommé pour être refusé maintenant et préparé plus tard.** Le besoin 2 (micronutriments) est une fondation critique sans source depuis la v4 : la note de `constants.ts:22-23` dit que la fatigue est un motif d'**explorer** le fer, la B12, les folates et la vitamine D, pas leur mesure ; `PRIO-FAT` est écartée avec une condition de retour qui exige une mesure d'un instrument spécifique et un claim restreignant l'axe. Le véhicule SQL existe (`biology_analyte_links`, cible `besoin` 1-12, direction, claim). Le grade C est réservé. La marche la plus courte vers « calcul des 12 besoins » est donc : BP-07 (quels claims nomment un analyte du catalogue **et** un besoin) → `LIENS_ANALYTE_BESOIN_V1` sans direction (annotation « mesures liées », grade C visible, zéro effet sur le score) → **seulement ensuite**, et sous décision propre, un peuplement de `biology_analyte_links` avec direction, qui est déjà une interprétation (DC-19, DC-20). Faire peser une mesure sur la couverture ou sur le plafond des fondations critiques (D-106) exigerait un `SourceBiologie` à côté de `SourceQuestionnaire`, une projection valeur → [0,1] sourcée, un bump de `VERSION_SCORE_EQUILIBRE` (D-107/D-108, garde `bumpVersionScore.guard.test.ts`) : horizon non daté.
- **Règles à signer** : plus tard seulement, `LIENS_ANALYTE_BESOIN_V1` sans direction ni borne, fondée sur des claims qui nomment à la fois un analyte du catalogue et un besoin. Le décompte de ces claims n'est pas fait (BP-07 le fait, en coordination avec la campagne Curation signée qui porte déjà la ligne « liens biomarqueur↔besoin »).
- **Données** : aucune. `biology_analyte_links` reste vide tant qu'une direction n'est pas sourcée.
- **Garde-fous** : couvertures, score, plafond, momentum, `VERSION_SCORE_EQUILIBRE` strictement identiques (banc). Aucune mesure ne « couvre » un besoin.

### 3.3 Orientation et priorités

- **Il voit** : sur une proposition de bilan, l'annotation « un résultat de [analyte] du [date] est au dossier », statut par analyte, jamais par panel par contagion. Le statut servi, le courrier et le document patient ne changent pas. Sur un candidat de priorité : rien de biologique dans la carte.
- **Il décide** : déclarer un panel « déjà exploré » par le geste existant (`PanelBiologieDocumente`) ; sélectionner la priorité comme aujourd'hui.
- **Règles à signer** : aucune à ce stade. L'extinction automatique d'une proposition exige d'abord l'arbitrage de CS-BIO-01 (DC-55) et une règle de complétude de panel tranchée par vous.
- **Écarté** : `counterfactuals` biologiques (second moteur de proposition de bilan, DC-26 ; champ compris dans `inputHash`, `decisionCard.ts:169`) ; candidat de priorité d'origine biologique (classement hors SHA, DC-33 ; aucun claim reliant une position à un axe ; la condition de retour de `PRIO-FAT` reste la seule porte nommée, et elle exige un claim que BP-07 cherchera).

### 3.4 Protocole — actions, assiettes, compléments

**Où un moteur de proposition biologique se brancherait.** Le dépôt a trois mécanismes d'assistance, tous fondés sur des tables signées, et un quatrième pour les assiettes :

| Mécanisme | Ce qu'il lit | Point de branchement d'une règle biologique signée | Décision requise |
|---|---|---|---|
| `suggererDepuisLignes` (`baremeChargePur.ts:147`, D-198) | lignes du barème de charge (convention ratifiée, sans claim) | aucun : il suggère un niveau de charge, pas une action | — |
| Protocole tiré du corpus (`catalogueConduitesV1.ts`, D-206/D-224/D-227) | tableaux cliniques signés, claims d'indication et de sécurité | une ligne de conduite dont `claimsIndication` nomme un marqueur, **sous régime documentaire** ; jamais une case évaluée | re-signature complète de la table ; arbitrage A3/A4/A5 encore ouvert |
| Producteur d'intentions suspendues (D-190, LOT-05 protocole assisté) | la carte, la priorité sélectionnée | c'est le véhicule naturel : une action naît `conditionnelle_biologie` avec `analyteCodes` typés (BP-04), et c'est son **réveil** que la saisie alimente | D-xxx de contrat (BP-04) |
| `indicationsAssiettesV1.ts` + portes (D-237, D-245/246) | déclencheurs questionnaires/anamnèse/âge ; portes documentaires | **module séparé** `PORTES_AUTOMATIQUES_ASSIETTES_V1`, jamais une ligne dans la table des indications (sa signature éteindrait les sept assiettes servies, D-245 §3) ; sortie « proposée sur mesure », distincte de « indiquée » | bilan d'usage D-245 §2, amendement nommé de D-157, plages sourcées, DC-42/43 armées |

Aucun de ces branchements n'est dans la campagne : ils sont nommés pour que la file d'attente conditionnelle sache où chacun entre.

- **Il voit** : sur une action `conditionnelle_biologie` dont les analytes sont typés, un état dérivé qui distingue **trois dates** (§4) :
  - « prélevé le [date], après la pose de l'attente — à arbitrer » quand `preleve_le` est postérieur à la pose ;
  - « pièce reçue le [date], prélevée **avant** la pose — à examiner » quand seul `saisi_le` est postérieur. Un ancien prélèvement importé aujourd'hui est une pièce nouvelle, pas la preuve qu'un contrôle demandé a été fait ;
  - « résultat corrigé le [date] » quand la tête de chaîne remplace une ligne déjà vue.

  L'écran d'arbitrage juxtapose la mesure (texte, unité, date, provenance) et les claims entiers de l'action, **sans verdict pré-sélectionné**. Sur les portes d'assiettes : date et nombre de prélèvements, sans position de jalon.
- **Il décide** : confirme / infirme / sans objet, puis « Appliquer les arbitrages » (révision, approbation caduque, re-revue).
- **Règles à signer** : aucune règle clinique. Une décision de contrat : champ optionnel `analyteCodes` ajouté **aux deux véhicules** — `ProtocolWaitFor` (`protocolDraft.ts:84`, extension additive de V4, patron D-240) et `WaitForBiologie` (`decisionAvantBiologie.ts:66`), via un type partagé lu par `normalizeWaitFor` et `lireConditionBiologique` ; `cible` conservé. Un ancien `waitFor` sans codes reste « attente non typée : réveil impossible », nommé. Sans cela, une attente née d'une règle C4 ne se réveillerait jamais (D-142 refermée puis rouverte).
- **Données** : aucune migration (`ProtocolDraft.payload` est JSON ; les règles C4 vivent dans `clinical_rules`, JSON aussi). Aucune colonne `resultat_id` sur l'arbitrage : le contrat négatif la refuse (`cb_arbitrage_biologique_v1_negatif.sql:68`). Le lien arbitrage ↔ résultat n'est **pas** reconstruit par proximité de dates.
- **Compléments — l'état exact et les préalables.** La campagne C4 (`2026-07-11-complements-clean-label-v1/`) n'a jamais été ouverte et a été retournée en file le 2026-09-16 ; le relevé du 2026-08-13 donnait `clinical_rules`, `intent_tags`, `safety_alerts` et `thresholds` à zéro, non revérifié depuis (à constater au conteneur, avec `WN_C4_ENABLED`). Les seuils de dose sont déjà modélisés (`SeuilFonctionnelSource`, `supplement-library/types.ts:154`) et la sentinelle compare des doses cibles de règles entre elles, jamais des mesures. Pour qu'une condition biologique typée soit **évaluée** dans l'atelier, il faudrait, dans l'ordre : catalogue de décision publié (règles validées, claim fondateur D-140, alertes publiées, seuil fonctionnel par ingrédient), grammaire `conditionBiologie {analyteCode, position, plageRef}` signée, plage sourcée par population pour l'analyte, contexte DC-46 renseigné, et la règle que `lireConditionBiologique` ne peut que maintenir l'attente ou proposer à l'examen, jamais activer ni lever une alerte. Dans cette campagne : juxtaposition seule à l'arbitrage, aucune dose modulée.
- **Garde-fous** : `normalizeWaitFor` et `lireConditionBiologique` rejettent toute clé inconnue — omission stricte quand le champ est absent, banc de hash sur toutes les formes persistées (brouillons V4 et règles C4), déploiement lecteur tolérant puis écrivain. Aucun statut ne change sans arbitrage lié. Plafond de 3 actions inchangé.

### 3.5 Diffusion et suivi (check-ins, jalons)

- **Il voit** : au panneau de diffusion, « attentes biologiques ouvertes : n », sans blocage. Dans la série, chaque prélèvement porte « jour n depuis la diffusion du [date] » ou « antérieur à la diffusion », fait arithmétique, sans rôle « pendant » (DC-48 orpheline). Les check-ins ne changent pas ; l'observance déclarée reste dans le suivi, hors du panneau d'arbitrage.
- **Il décide** : approuver, poser lui-même une échéance de contrôle (`waitFor.echeance`), prescrire par le courrier existant.
- **Règles à signer** : aucune. Un délai de contrôle proposé par l'outil exige un délai de réponse sourcé par analyte — valeur sourcée à poser (claim certifié) ; sans claim, aucune date proposée.
- **Garde-fous** : un seul calendrier (D-255) ; l'inputHash de la version diffusée n'inclut aucun résultat ; aucune relance patient sur la biologie.

### 3.6 Évaluation J21/J42/J90

- **Il voit** : le résumé de jalon existant, inchangé. **Dans un panneau distinct**, par analyte et sur l'axe du temps : la série datée, l'unité, le nombre de points, la liste de **toutes** les interventions actives sur la période, et un avertissement fixe « aucune attribution possible : traitements et facteurs hors protocole non enregistrés ». Pas de colonne « mesuré » par priorité, pas de delta, pas de flèche.
- **Il décide** : maintenir, alléger, densifier, pivoter, explorer, stopper — par versionnement.
- **Trois niveaux à ne pas confondre, même sans biologie** :
  1. **Mesure descriptive** : le delta déclaratif par besoin **existe déjà**. D-058 §1 l'autorise comme fait, et `momentumParBesoin.ts` le sert avec `qualification: null`. Il est exploitable par le praticien tel quel.
  2. **Qualification de l'évolution** (« au-dessus du bruit ») : elle exige une bande publiée par besoin (D-058), c'est-à-dire une fidélité test-retest publiée ou un paramètre technique assumé et signé (DC-19/DC-20) — valeur sourcée à poser (claim certifié). Question d'arbitrage à part entière (§7, Q11 bis).
  3. **Attribution au protocole** : une bande publiée **ne suffit pas**. Elle exige des véhicules pour DC-39 (une modification à la fois) et DC-48 (temporalité avant/pendant/après), qui n'existent pas.
- **Règles à signer** : un écart brut biologique n'est possible qu'après une décision amendant D-157 §2-3, à laboratoire et unité identiques, contexte DC-46 renseigné, et une bande de variabilité sourcée pour qualifier (patron `BANDES_DE_BRUIT`, `publiee:false`). Rien de cela n'est dans la campagne.
- **Garde-fous** : sentinelle de vocabulaire étendue (« amélioré », « aggravé », « effet », « performance », « évocateur ») en `innerText`. Analytes à `validation_medicale_requise` : liste datée et mention seule.

### 3.7 Re-saisie et modification du parcours

> **Hors de la première campagne.** Les cartes du Fil exigent un accusé de lecture, donc une migration qu'aucun lot ne porte encore. Elles restent en file d'attente conditionnelle (§6). Dans la campagne, l'état « à arbitrer » ou « à examiner » vit sur l'action elle-même (BP-04) et s'éteint par l'arbitrage, sans carte à clore.

- **Il voit** : dans le **Fil praticien uniquement** (`/api/praticien/fil`, jamais `lib/portail/filDuJour.ts`), des cartes sans analyte ni valeur : « résultat biologique reçu » (date, nombre), « résultat reçu pour une action en attente » (quel que soit le véhicule, action ou règle C4), « résultat corrigé le [date] : objets datés postérieurs à relire ». Le détail s'ouvre dans la fiche, derrière `garderResultats`, qui journalise.
- **Il décide** : arbitrer, réviser, ré-assigner, confirmer le jalon suivant, pivoter. Clore une carte est un geste tracé (accusé de lecture, auteur et date côté serveur), jamais une clôture automatique : la validation d'import vérifie une transcription, pas une lecture clinique.
- **Règles à signer** : décision de régime (signaler, jamais recalculer). Ordre des cartes par date seulement.
- **Données** : événements dérivés de `saisi_le` et `supersedes_resultat_id`, non persistés. Table d'accusé de lecture en ajout seul (migration, demande explicite) plutôt que le journal d'accès.
- **Garde-fous** : une correction ne rejoue rien ; la surface dit qu'elle n'est pas un filet de sécurité (aucun lien vers `safetySignalsV1`). Préalable à nommer : `preleve_le` et `analyte_code` ne sont pas corrigeables (D-124 §3) et aucune annulation n'existe — toute logique d'état fondée sur la date doit attendre une décision d'annulation en ajout seul (patron D-257 §6).

---

## 4. Modèle de données et de preuve

**Séries par analyte.** Fonction pure `serieParAnalyte` dans `biology-library/`, voisine de `derniersResultats.ts`, réutilisant `correctionsParLigne` (`filCorrection.ts`). Têtes de chaîne ordonnées par `preleve_le`, départagées par `saisi_le` puis `id`. Elle rend les points (valeur en texte, unité, provenance, correction), le nombre de points, la position « jour n » via `joursZeroParCycle`, et « non comparable : motif » (unités mêlées, point unique, laboratoire inconnu, contexte non renseigné). Elle ne rend jamais « comparable » — seulement l'absence de motif connu. Aucun delta.

**Trois dates, jamais confondues.** Le **prélèvement** (`preleve_le`), la **réception** dans l'application (`saisi_le` de la ligne racine de la chaîne) et la **correction** (`saisi_le` de la ligne qui en remplace une autre). Seul le prélèvement dit qu'une mesure a été faite après un geste ; la réception dit qu'une pièce est arrivée ; la correction dit que ce qui a été vu a changé. Un critère « contrôle fait » ou « résultat à arbitrer » se juge sur `preleve_le`, jamais sur `saisi_le` (BP-04, BP-08).

**Provenance.** Lue par la relation `ligneCandidate`, jamais par la colonne `source` : une ligne d'import validée est écrite `saisie_praticien` (`import/decisions.ts`). Toute sortie cite l'identifiant de ligne, la règle et ses claims en couples `(claim_id, version_claim)` (`rag/claims/validite.ts`).

**Contexte DC-46.** Table `contexte_prelevement_biologique` : `id_patient` NOT NULL avec FK (sinon elle échappe à la garde d'effacement `effacement.test.ts:222`), rattachement explicite à la ligne racine de la chaîne de résultat (pas par horodatage), chaîne de correction propre avec index unique partiel (patron D-124), aucun texte libre (minimisation, logs `Failing row contains`). **Vocabulaire aligné sur `biology_preanalytics.type_condition`** (jeûne, moment de la journée, délai après prise, arrêt de supplémentation, cycle menstruel) pour qu'un contexte saisi se compare un jour aux consignes du catalogue sans second vocabulaire, plus les champs que DC-46 nomme et que le catalogue ne porte pas. Chaque champ a **le type de ce qu'il porte** — un oui/non ne porte ni une durée ni un code, et ne décrit pas une conformité tant qu'aucune consigne de référence n'est définie :

| Forme | Champs | Représentation |
|---|---|---|
| Déclaration | à jeun, supplémentation arrêtée, traitement susceptible d'interférer, épisode inflammatoire déclaré, grossesse déclarée | tri-état `oui` / `non` / `inconnu` sous CHECK |
| Catégorie fermée | moment de la journée, phase du cycle | liste fermée arrêtée en BP-00, avec une valeur `inconnu` explicite |
| Durée | délai depuis la dernière prise | entier positif et unité fermée, accompagné d'un état `renseigne` / `inconnu` |
| Identifiant | laboratoire | code opaque d'une liste fermée, accompagné d'un état `renseigne` / `inconnu` |

L'inconnu est **toujours explicite** et vaut par défaut : jamais un NULL qui confondrait « inconnu » et « pas encore saisi ». Une durée déclarée est un fait, pas une borne : aucune comparaison à un délai de consigne sans claim certifié. L'âge en années se dérive de la date de naissance quand elle existe (`lib/patient/age.ts`) et n'est pas recopié. Déclaration au registre RGPD et note patient **avant** création. Elle sert à afficher ce qui manque au regard de toute la liste de DC-46 (laboratoire et sexe compris) et jamais à déclarer un contexte « complet ».

**Plages par population** (file d'attente). Avant toute règle : colonnes `NUMERIC` ajoutées (pas d'`ALTER TYPE` en place), inclusivité de borne lue dans le texte du claim (claim muet = non citable par une règle), type de référence DC-47 et nature DC-20 portés par la table TS signée, version et chaîne de remplacement, `contenu_sha256` recalculé à la lecture et comparé au littéral signé (fail-closed, leçon D-180). `biology_reference_ranges` ne fusionne jamais. Une plage de type laboratoire n'est citable par aucune règle. Comparaison en décimal exact, jamais `Number()`.

**Liens claim ↔ marqueur ↔ besoin ↔ intervention** (file d'attente). Une seule source de vérité, tranchée par écrit : `biology_analyte_links` (déjà contrainte : cible, code 1-12, direction, claim, niveau de preuve) gardée par contrat SQL avec empreinte littérale, ou module TS signé `LIENS_ANALYTE_BESOIN_V1` qui en hache le contenu. La première impose une direction dès la première ligne ; la seconde permet une étape sans direction. Marqueur → intervention vit uniquement dans des modules TS signés séparés (patron D-246).

**Invalidation et rejeu.** État biologique « tel que vu à t » : filtrer `saisi_le ≤ t`, élire les têtes de chaîne. Rien n'est figé avant une décision d'architecture distincte. Le rejeu ne vaut que pour les données en base : un objet produit sous un SHA de table différent est « non comparable », il ne se rejoue pas. Péremption : indicateur praticien dérivé, jamais une empreinte des objets diffusés.

**Signatures.** Cinq termes, `shaPerimetre` littéral, enrôlement le jour de la première signature dans `shaPerimetreLitteral.guard.test.ts`, dans le contrat de fraîcheur des claims (positif et négatif) et dans le hook DC-17. Niveau d'exécution (DC-13) à poser sur chaque claim cité avant toute sortie automatique.

---

## 5. Indicateurs de suivi du parcours

Ils sont des indicateurs de **processus**, affichés par patient, sans pourcentage, sans classement, sans agrégat inter-patients hors Observatoire. Le mot « performance » ne s'écrit pas. Côté **résultat**, trois niveaux (§3.6) : la mesure descriptive existe déjà pour le déclaratif (delta factuel par besoin, D-058 §1) ; la **qualification** d'une évolution attend une bande de bruit publiée (D-058), préalable commun à la biologie et aux questionnaires ; l'**attribution** au protocole attend en plus des véhicules pour DC-39 et DC-48. Un delta biologique reste en outre le geste du praticien (D-157 §2).

| Indicateur | Définition opératoire | Source | Ce qu'il ne dit pas |
|---|---|---|---|
| Attentes biologiques ouvertes et arbitrées | Par action `conditionnelle_biologie` typée (action ou règle C4) : date de pose, date du premier résultat validé d'un analyte lié **prélevé** après la pose (`preleve_le`), et à part les pièces reçues après la pose mais prélevées avant, existence d'un arbitrage et son verdict, date de la révision. Délais en jours, sans seuil. | brouillons V4, règles C4, `resultats_biologiques.preleve_le` et `saisi_le`, `ArbitrageBiologique`, `supersedesDraftId` | Un délai long n'est pas un défaut ; « infirme » n'est pas un échec ; ne dit pas quel résultat a fondé l'arbitrage (lien non persisté, D-059 §4). |
| Retour de bilan proposé | Par proposition consignée : premier prélèvement de chaque analyte de la demande, ou « pas encore au dossier », analyte par analyte. | propositions consignées, `resultats_biologiques.preleve_le` | Ni l'observance du patient, ni la pertinence du bilan ; un bilan fait hors outil non déclaré apparaît « pas encore ». |
| Contrôles posés par le praticien | Pour chaque échéance posée par vous : « fait » (`preleve_le` postérieur à la pose de l'échéance) ou « pas encore au dossier ». | `waitFor.echeance`, séries | Ne dit pas que le contrôle était dû ; un ancien prélèvement importé après la pose ne compte pas comme « fait » ; aucun « non re-mesuré » sans échéance posée. |
| Adhésion déclarée | Météo existante, réutilisée telle quelle. | `adhesion.ts`, `checkinDomain.ts` | Pas de score, pas d'explication d'une mesure par l'adhésion. |
| Série datée par analyte | Points, dates, jour n, unité, nombre, motifs de non-comparabilité, interventions actives sur la période. | `serieParAnalyte` | Ni amélioration, ni aggravation, ni effet, ni position par rapport à une plage. |
| Objets datés postérieurs à une correction | Nombre de gestes datés (arbitrage, approbation, jalon) postérieurs au `saisi_le` d'une ligne depuis remplacée. | dates seules | Ne dit pas que la décision était fausse. |
| Usage du rayon (gouvernance, D-245 §2) | Au conteneur, agrégats : dossiers avec résultat validé, lignes importées validées et écartées, arbitrages, corrections, lignes de `biology_analyte_links` et de `clinical_rules`. Cellules à faible effectif masquées (seuil fixé par vous). | tables métier, jamais le journal d'accès | Ni qualité clinique ni efficacité ; aucun identifiant ni date dans le dépôt. |

---

## 6. Campagne proposée : BIO-PARCOURS

Ce qui se livre maintenant ne lit **ni valeur ni plage**. Tout le reste est une file d'attente à prérequis datés.

**Articulation avec la file d'attente existante.** BIO-PARCOURS **prépare** la ligne « Ré-alimentation du moteur par le mesuré » (frontière D-122) **sans l'absorber** : ses lots livrent de la consultation, de l'arbitrage et du suivi documentaire, pas une proposition clinique. L'entrée reste dans la file, renommée à BP-00 en « Résultats biologiques → proposition clinique signée », avec ses prérequis (plages sourcées, contexte DC-46, liens signés, amendement de D-157, évaluateur signé) : l'absorber ferait perdre de vue ce qui reste à construire. Elle **prolonge** « Biologie exploitée » (rang 4 bis) : BP-03 est la suite naturelle de son affichage juxtaposé (D-157), sans en rouvrir les lots. Elle **dépend de** « Curation signée » (rang 4) pour tout lien analyte ↔ besoin : BP-07 n'est qu'un inventaire qui alimente cette campagne, laquelle garde la signature claim par claim ; aucun lien n'est signé dans BIO-PARCOURS. Elle **ne touche pas** C4 (campagne retournée en file le 2026-09-16) ni « Phase 5 Actions ».

| Id | Titre | Migration | Décision préalable | Dépend de | Done observable | Taille |
|---|---|---|---|---|---|---|
| BP-00 | Doctrine : constat de dette DC-46 (porteur CB-09), régime « présence, date, unité », ce qu'une saisie périme, vocabulaire interdit | non | D-xxx du responsable : DC-46 exigible depuis le 2026-09-09, liste fermée du contexte alignée sur `biology_preanalytics.type_condition` et régime transitoire D-245 §1 ; amendement de portée de D-122 §2 limité à la présence et la date | — | Constitution amendée, fragment `changelog.d/`, entrée de file renommée « Résultats biologiques → proposition clinique signée » avec ses prérequis et renvoi à Curation signée ; listes fermées du contexte (catégories) arrêtées | S |
| BP-01 | Gardes avant surface | non | aucune | — | Bancs verts en T2 : égalité des empreintes (snapshot, carte, versions) avec et sans résultats ; import interdit de `biology-library` depuis `clinical-engine`, `scoring`, `equilibre`, `synthese`, `app/api/patient`, `lib/portail`, ainsi que depuis `clinical` et `supplement-library` **hors liste blanche nominative** : `clinical/portesBiologiquesService.ts` (juxtaposition D-245, qui importe déjà le drapeau et `derniersResultatsParAnalyte`) et, le jour venu, le lecteur d'attente C4. La liste blanche est un littéral du banc : tout ajout est un diff relu. Le banc est vert sur le code actuel avant tout autre changement ; sentinelle `innerText` étendue ; `signature(err)` imposé sur les routes biologie ; hook DC-17 étendu aux tables signées récentes ; drapeau `WN_BIO_LECTURE` créé éteint et inscrit à `FEATURE_FLAGS.md` | M |
| BP-02 | Constat d'usage au conteneur | non | aucune (lecture agrégée déjà autorisée) | — | Note datée en agrégats sans identifiant : résultats par source (saisie, import validé), dossiers, corrections, diffusions, check-ins, attentes `conditionnelle_biologie` des deux véhicules, lignes de `biology_analyte_links` et de `clinical_rules`, état de `WN_C4_ENABLED` ; mémoire « aucun protocole 21 j » rafraîchie | S |
| BP-03 | Série par analyte et jour n | non | BP-00 (régime documentaire) | BP-01 | `serieParAnalyte` et `positionDansCycle` testés en fixtures ; colonne « mesuré » tabulaire dans `TrajectoirePanel` ; encart « mesures au dossier » à la revue T0 ; « attentes ouvertes » à la diffusion ; aucun delta ; drapeau posé et constaté | M |
| BP-04 | **Premier parcours concret** : attente typée sur les deux véhicules → résultat disponible → consultation des pièces → arbitrage → révision | non | D-xxx de contrat : `analyteCodes` additif sur `ProtocolWaitFor` **et** `WaitForBiologie`, type partagé, un lecteur par véhicule (D-142) | BP-00, BP-01, **BP-09** | Choix d'analytes du catalogue à la suspension et dans l'atelier C4 ; état dérivé sur l'action, jugé sur `preleve_le` : « prélevé après la pose — à arbitrer » distinct de « pièce reçue après la pose, prélevée avant — à examiner » (§4, trois dates), et un résultat annulé ne réveille rien ; arbitrage juxtaposé sans verdict pré-rempli ; banc : aucun statut ne change sans arbitrage, hash des versions et des règles existantes identique. Pas de carte au Fil (§3.7) | M |
| BP-05 | Migration : contexte de prélèvement | **oui** | Demande explicite ; liste fermée issue de BP-00 ; registre RGPD et note patient mis à jour avant | BP-00 | Migration seule, release-db approuvée, table constatée vide, RLS deny-all, contrat négatif par forme de champ (tri-état, liste fermée avec `inconnu`, durée positive à unité fermée, code de laboratoire d'une liste fermée, état `renseigne`/`inconnu` obligatoire ; CHECK sans `btrim/1`), ligne `deleteMany` prête | M |
| BP-06 | Code : saisie du contexte, affichage des manques | non | BP-05 constatée ; conjonction de drapeaux écrite (import sous `isBioIngestEnabled`) | BP-05, BP-03 | Bloc contexte dans `SaisieBilan` et à la validation d'import, « inconnu » par défaut, manques listés dans Estimé ↔ mesuré (âge dérivé, sexe et laboratoire compris) ; effacement IDP2 couvert et testé | M |
| BP-07 | Inventaire des claims biologiques, remis à Curation signée | non | aucune (lecture seule) | BP-02 | Liste d'identifiants de claims VALIDE actifs nommant un analyte du catalogue, croisés besoin (dont les 20 de `fondements-12-besoins` et le corpus `biologie-fonctionnelle`), unité et condition de retour de `PRIO-FAT` ; discordances relevées ; sans texte clinique dans le dépôt ; remis comme intrant à la campagne Curation signée | S |
| BP-09 | Annulation d'un résultat en ajout seul (mauvais dossier, mauvaise date, mauvais analyte) | **oui** | Demande explicite ; D-xxx d'annulation (patron D-257 §6) : motif en liste fermée, auteur et date côté serveur, jamais d'effacement | — | Migration seule puis code (deux PR) : release-db approuvée, contrat négatif ; un résultat annulé sort de toute élection de tête de chaîne, de toute série et de tout réveil d'attente ; l'annulation est visible et tracée dans la fiche | M |
| BP-08 | Indicateurs de processus | non | D-xxx listant les indicateurs et leurs interdits ; au moins un cycle réel arrivé à J21 constaté par BP-02 | BP-04, BP-06 | Panneau de série par analyte avec interventions actives et avertissement fixe ; indicateurs par patient, « contrôle fait » jugé sur `preleve_le` (un ancien prélèvement importé après la pose n'en est pas un) ; filtre praticien dès la requête, garde `isCbResultsEnabled` | M |

**File d'attente conditionnelle** (hors campagne, chacun avec sa décision propre) : cartes biologiques du Fil praticien et leur accusé de lecture en ajout seul (§3.7 ; migration, demande explicite ; après BP-04 et BP-09) ; arbitrage de CS-BIO-01 ; publication des `BANDES_DE_BRUIT` par besoin (préalable à toute **qualification** d'une évolution, biologique ou non — pas à la mesure descriptive, ni suffisante pour une attribution) ; plages `NUMERIC` versionnées et inclusivité (après une date de séance de curation) ; `LIENS_ANALYTE_BESOIN_V1` sans direction, dans Curation signée (après BP-07 non nul) ; évaluateur signé et discordances (après plages, contexte, amendement de D-157, exclusion du prompt LLM) ; porte automatique d'assiette en module séparé (après bilan d'usage tranché, amendement nommé de D-245 §1, DC-42 et DC-43 armées) ; ligne de conduite citant un marqueur dans `catalogueConduitesV1` (après arbitrage A3/A5 et re-signature) ; condition C4 typée (après catalogue publié) ; biologie dans le score (horizon non daté, DC-45 et D-106 à amender d'abord, bump de version).

**Premier lot recommandé : BP-01, « Gardes avant surface »**, avec BP-00 et BP-02 en parallèle (le premier est votre décision, le second une lecture). BP-01 n'exige aucune décision clinique, aucune migration, aucun claim. Il pose les bancs que les douze contre-revues ont tous réclamés avant la première surface : empreintes invariantes, import interdit (liste blanche comprise), prompt LLM étanche, sentinelle, hook. Il est prêt à être cadré en mode Plan.

**Ensuite, un parcours concret avant les surfaces** : BP-09 (annulation) puis BP-04 (attente → résultat → pièces → arbitrage → révision) apportent une utilité observable de bout en bout avant de multiplier les surfaces de BP-03 (T0, trajectoire, diffusion) et les indicateurs de BP-08.

---

## 7. Questions à votre arbitrage

**A. Ambition et rythme**
1. *Mettre en évidence ou modifier le calcul ?* Options : (a) BP-00 à BP-08, sans amender D-157 §2-3 ; (b) viser dès maintenant l'évaluateur signé. **Recommandation : (a).** Aucune plage, aucun lien, aucun contexte, aucun cycle réel n'existe pour (b).
2. *Rang dans la file d'attente* face à BIO-INGEST (LOT-06 en clôture avec D-264, LOT-03 à LOT-05 à faire) et au temps praticien (D-112). `WN_BIO_INGEST_ENABLED` est posé depuis le 2026-10-03 : la matière grossit désormais par la saisie **et** par l'import validé ; le levier restant est l'usage, que BP-02 mesure. **Recommandation :** BP-00/01/02 tout de suite ; puis le parcours concret BP-09 → BP-04 ; BP-03 ensuite ; BP-08 seulement après un cycle réel arrivé à J21.

**B. Doctrine**
3. *DC-46 :* acceptez-vous une décision qui la constate exigible (porteur CB-09), fixe la liste fermée du contexte alignée sur le vocabulaire préanalytique du catalogue, et le régime transitoire (« contexte non recueilli » affiché sur chaque surface) ? **Recommandation : oui**, c'est le préalable de tout.
4. *Ce qu'une saisie périme :* carte au Fil seulement (recommandé), ou aussi la synthèse et la priorité (exige une décision de rejeu non écrite) ?
5. *Hook DC-17 :* étendre aux tables signées récentes et futures. **Recommandation : oui**, dans BP-01.

**C. Données**
6. *Contexte de prélèvement :* demandez-vous explicitement la migration BP-05 ? Champs proposés : jeûne, moment de la journée, délai après prise, arrêt ou poursuite de supplémentation, cycle menstruel (vocabulaire du catalogue) ; traitement susceptible d'interférer, épisode inflammatoire déclaré, grossesse déclarée, laboratoire (code opaque). Âge dérivé de la date de naissance, non recopié. **Recommandation :** chaque champ typé selon ce qu'il porte (§4) — tri-état pour les déclarations, liste fermée pour le moment de la journée et la phase du cycle, durée à unité fermée pour le délai après prise, code d'une liste fermée pour le laboratoire —, l'inconnu toujours explicite, aucun texte libre.
7. *Sexe :* colonne du dossier ou champ de contexte ? Les plages par population sont inappariables sans lui. **Recommandation :** colonne du dossier, décision séparée.
8. *Annulation d'un résultat* (mauvais dossier, mauvaise date) : ouvrir une décision d'annulation en ajout seul avant toute logique d'état. **Recommandation : oui**, portée par le lot BP-09 (migration, demande explicite), préalable à BP-04.

**D. Attentes et compléments**
9. *Lien attente ↔ analyte :* champ additif `analyteCodes` sur les deux véhicules (`ProtocolWaitFor` et `WaitForBiologie`, recommandé) ou table signée de correspondance de libellés (fragile, à re-signer à chaque formulation) ?
10. *Compléments :* juxtaposition seule à l'arbitrage (recommandé). Les préalables d'un moteur de proposition sont nommés (§3.4 : catalogue C4 publié, grammaire `conditionBiologie` signée, plage par population, contexte DC-46, règle « proposer à l'examen, jamais activer »). Confirmez-vous que BP-02 relève l'état réel de `clinical_rules`, `safety_alerts`, `thresholds` et de `WN_C4_ENABLED`, et que la campagne C4 reste en file tant que ce relevé n'est pas fait ?

**E. Suivi et indicateurs**
11. *Acceptez-vous que la « performance du protocole » se lise uniquement en processus* (attentes, retours, contrôles posés, adhésion, séries datées) tant que DC-39 et DC-48 n'ont pas de véhicule ? **Recommandation : oui.**
11 bis. *Bandes de bruit déclaratives :* le delta déclaratif par besoin est déjà servi comme fait (D-058 §1) ; ce qui manque est sa **qualification**, qui attend `BANDES_DE_BRUIT`. Une bande ne suffirait pas pour autant à attribuer une évolution au protocole (DC-39, DC-48). Souhaitez-vous ouvrir une décision propre sur leur sourçage par besoin (fidélité test-retest publiée, valeur sourcée à poser — claim certifié — ou paramètre technique assumé et signé, DC-20) ? C'est le préalable commun à toute qualification d'une évolution.
12. *Fenêtre de rapprochement à un jalon :* (a) aucune, « jour n » seul (recommandé) ; (b) délai sourcé par analyte, valeur à poser (claim certifié). Jamais le réemploi de la tolérance des jalons.
13. *Écart brut :* le refuser jusqu'à une décision amendant D-157 §2-3 avec laboratoire identique et contexte renseigné (recommandé), ou l'ouvrir sans bande ?

**F. Curation et règles futures**
14. *Premier périmètre de curation :* huit marqueurs des portes, marqueurs que le guide des 12 besoins nomme pour le besoin 2 (chemin le plus court vers une fondation critique aujourd'hui aveugle, avec la condition de retour de `PRIO-FAT`), ou les deux plages existantes comme pilote ? **Recommandation :** BP-07 d'abord, remis à Curation signée, puis un seul marqueur sans discordance connue, avec une date de séance.
15. *Discordances CRP-us, homocystéine, index oméga 3 :* documentaires (recommandé) ou arbitrage signé par question nommée ?
16. *CS-BIO-01 :* trancher par décision avant toute extinction de proposition de bilan ? Sans cela, l'annotation reste informative.
17. *Critère d'ouverture du bilan d'usage (D-245 §2) :* nombre de dossiers, durée, seuil d'effectif pour masquer les agrégats. Ces valeurs ne sont pas chiffrées ici : elles sont les vôtres.
18. *Plafond d'actions :* le « 7 » relève du cadrage Phase 5 Actions ; cette campagne garde 3. À confirmer hors campagne.
19. *Point de branchement d'un futur moteur de proposition :* parmi les quatre mécanismes du §3.4, lequel ouvrir en premier le jour venu — le réveil des intentions suspendues (D-190, le moins engageant), la porte automatique d'assiette en module séparé (D-245 §2), ou une ligne de conduite citant un marqueur (D-206) ? **Recommandation :** le réveil, parce qu'il ne lit aucune valeur et que BP-04 le prépare.
