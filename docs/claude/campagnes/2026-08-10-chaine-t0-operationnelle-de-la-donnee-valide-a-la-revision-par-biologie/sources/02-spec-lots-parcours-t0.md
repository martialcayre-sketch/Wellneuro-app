# SPÉCIFICATION DE LOTS — Parcours T0, intervention assistée, révision par biologie

Issue de l'audit golden case de référence (2026-08-10) et du cadrage validé. Document de
planification : aucun code, aucune migration dans cette mission. Les références
`chemin:ligne` pointent sous `web/`.

**Décision produit intégrée** : une proposition de compléments alimentaires est
possible **avant le retour de biologie**, si et seulement si elle s'appuie sur des
claims valides du corpus ; la biologie vient ensuite **confirmer ou infirmer**, et
déclenche une **révision de protocole** (nouvelle version, re-validation praticien).

## Principes transverses (s'appliquent à tous les lots)

- La couche déterministe décide les candidats et les interdits ; le LLM formule et
  explique ; le praticien valide — les trois portes existantes (sélection
  `practitioner`, revue, approbation de diffusion caduque à chaque révision) sont
  intouchables.
- Jamais de supplémentation déclenchée par un score fonctionnel seul (DNST inclus).
  Toute intention de complément référence le catalogue C4/C5 (`ruleId`,
  `ruleVersion`, `ingredientId`, justification — champs libres interdits,
  `protocolDraft.ts:17-18`), jamais du texte libre.
- Append-only partout ; correction = nouvelle version, jamais réécriture.
- Chaque migration voyage dans sa propre PR (ou code derrière drapeau éteint),
  chemin release-db habituel. UI en français. Patients fictifs uniquement dans les
  tests (Sophie Nicola, Jennifer Martin, Michel Dogné).
- Toute nouvelle table fille de `patients` entre dans la transaction d'effacement
  IDP2 (`lib/patient/effacement.ts`).

## Vue d'ensemble et dépendances

```
A (validité des données)  ──►  B (garde-fous synthèse/contradictions)
        │                              │
        ▼                              ▼
C (préconditions T0)  ──►  D (candidats déterministes)  ──►  E (protocole structuré,
        │                                                     compléments sur claims)
        ▼                                                             │
H (jalons & momentum)                                                 ▼
        │                                        F (biologie : catalogue + arbitrage)
        ▼                                                             │
I (multi-cycle T1/T2)                            G (révision de protocole) ◄────────┘
J (stop rules / extinction) — parallélisable dès B
```

Ordre recommandé : **A → B → C → D → E → F → G**, avec H, I, J insérables en
parallèle à partir de C. A et B sont le P0 de l'audit ; C→G portent la valeur
clinique du cadrage ; H–J complètent le suivi.

---

## Lot A — Statut de validité des données (P0, taille M)

**Objectif** : une donnée invalidée ne peut plus alimenter aucun raisonnement ;
l'invalidation devient un geste praticien, pas un déploiement.

**Périmètre**
- Migration : `QuestionnaireReponse` + `statutValidite`
  (`VALID` défaut | `AMBIGUOUS` | `INVALID` | `SUPERSEDED` | `HISTORICAL_ONLY`),
  `invalideLe`, `invalidePar`, `motifInvalidation`, `supersedesReponseId`.
- Reprise du registre en dur (`lib/scoring/passationsNonInterpretables.ts`) comme
  *source d'initialisation* : les passations concernées (Q_ALI_03, Q_SOM_07
  antérieures au `reconstruitLe`) sont marquées `INVALID` par script de reprise.
- Filtre unifié : synthèse (`api/praticien/synthese/route.ts:627-630`), orientation,
  équilibre/momentum et cockpit excluent `INVALID`/`SUPERSEDED` — même prédicat,
  un seul module.
- Déduplication à la génération de synthèse : dernière passation `VALID` par
  instrument (aligner sur `orientationEngine.ts:611`) ; une re-passation marque la
  précédente `SUPERSEDED` (même instrument, même patient).
- `donneesEntree` : n'enregistrer que les données réellement transmises au prompt,
  ou porter le marqueur d'exclusion par passation.
- UI praticien minimale : action « invalider cette passation » (motif obligatoire)
  depuis l'inbox — append-only, réversible par contre-marque, tout tracé.

**Hors périmètre** : régénération automatique des synthèses passées (la mention de
lecture existante suffit) ; suppression physique.

**Critères d'acceptation**
1. Test section 56 : `Q_ALI_03.statutValidite = INVALID` ⇒ aucune influence sur
   prompt, `donneesEntree`, orientation, équilibre, momentum, protocole.
2. Deux passations Q_ALI_01 (cas de référence) ⇒ seule celle du 29/07 part au prompt ;
   celle du 24/07 est `SUPERSEDED` et visible comme telle dans l'inbox.
3. Invalider une passation depuis l'UI ne demande aucun déploiement et apparaît
   dans le journal d'accès.
4. Le registre en dur peut être supprimé sans changement de comportement (test
   d'équivalence avant/après reprise).

---

## Lot B — Garde-fous de synthèse et moteur de contradictions (P0, taille M)

**Objectif** : plus aucune causalité affirmée ni faux niveau de certitude en
sortie LLM ; les discordances entre instruments sont détectées par le
déterministe et imposées à la synthèse.

**Périmètre**
- Prompt `synthese-v20` (`lib/anthropic.ts`) : interdit général de causalité
  (aujourd'hui limité à l'alimentaire, `:243-254`) ; taxonomie imposée
  facteur de risque ≠ symptôme ≠ dépistage positif ≠ risque global (cas Berlin
  C3) ; consigne de restitution neutre des discordances (formulation type
  « signal fonctionnel non confirmé par les instruments spécifiques ») ; section
  « axes rassurants » obligatoire dans `resume_praticien`.
- Validation de sortie **stricte** (rejet + une relance, pas coercion) :
  `validateSyntheseSchema` (`anthropic.ts:446-461`) remplacé par un schéma fermé
  (énumérations contrôlées, `axes_prioritaires` typé).
- Moteur de contradictions déterministe, patron orientation (table versionnée +
  claims + signature + SHA) produisant des `DiscordanceFinding`
  (`clinical-engine/types.ts:199-207` — le type existe, zéro producteur) :
  - C-STR : `ADAPTATION_STRESS ≤ 8` ∧ DASS stress/dépression normaux ;
  - C-SOM : DNST mélatonine perturbé ∧ PSQI ≤ 5 ∧ Epworth < 10 ∧ Berlin faible
    ∧ plainte sommeil ≤ 2 ;
  - C-ALI : restriction déclarée (drapeau anamnèse) ∧ plainte surpoids ≥ 7.
  Injection : (a) vigilances déterministes de la synthèse (fusion en tête
  existante, non censurable, `route.ts:276-286`) ; (b) panneau discordances du
  cockpit (`MissingDataPanel`, aujourd'hui toujours vide).
- Persistance : SHA-256 du prompt système + `inputHash` sur `SyntheseIA`.

**Critères d'acceptation**
1. Tests sections 57 et 58 verts (mélatonine non suggérée, alexithymie absente,
   contradiction produite, question d'entretien générée).
2. Rejouer les entrées de `SYN_mnMp0PYHYKnrK6ftqIbcOSQS` ⇒ la sortie ne contient
   ni « peut contribuer à la prise de poids » (causalité DNST) ni « SIGNAL
   D'ALERTE MÉDICAL » pour un Berlin à risque global faible, et porte les deux
   vigilances C-STR et C-SOM.
3. Une sortie LLM hors schéma est rejetée et retentée ; l'échec double est une
   erreur auditée, jamais une synthèse dégradée silencieuse.
4. Test de non-fuite : `narratif_patient` sans score, sans axe DNST nommé, sans
   vocabulaire anxiogène (`documents/vocabulaire.ts` réutilisé).

---

## Lot C — Préconditions de confirmation T0 (taille S)

**Objectif** : T0 = point de décision outillé ; fini le T0 confirmable sur dossier
vide, sans bloquer le geste clinique.

**Périmètre**
- Conditions **dures** côté API (`api/praticien/cockpit/route.ts` POST, et les deux
  points de persistance `protocoles/route.ts`, `protocoles/versions/route.ts`) :
  1er rideau complet et `VALID` dans la fenêtre (Q_MOD_03, Q_MOD_01, Q_INF_03,
  Q_ALI_01) ; anamnèse consignée ; une synthèse `Validee_Praticien` ou
  `Corrigee_Praticien` postérieure à la dernière passation du rideau de base.
- Conditions **souples** (avertissement contournable, justification obligatoire,
  tracée dans le payload d'épisode) : suggestions d'orientation ni renseignées ni
  écartées ; contradictions ouvertes (Lot B) ; passations `AMBIGUOUS` dans la
  fenêtre.
- `EpisodeConfirmationPanel.tsx` : checklist affichée (dures cochées ou bloquées,
  souples avec case « je confirme malgré » + motif).
- Biologie, agendas, journal : explicitement non requis (affichés « phase 1 »).

**Critères d'acceptation**
1. Un T0 sans 1er rideau valide est refusé par l'API (pas seulement par l'UI).
2. Un T0 avec avertissement contourné porte la justification dans le `payload`
   persisté et elle est relisible.
3. Le parcours du cas de référence (rideau complet, synthèse validée) passe les
   conditions dures sans friction.

---

## Lot D — Candidats d'intervention déterministes (taille L)

**Objectif** : rebrancher la chaîne C1 — le cockpit propose des priorités
justifiées au lieu d'une décision éternellement « suspendue ».

**Périmètre**
- Producteur de `ClinicalRuleRef` validées (aujourd'hui aucun en production ⇒
  `abstention: not_evaluated` systématique, `cockpit/route.ts:196-206`) : table de
  règles de priorité, patron orientation (claims, signature, SHA), reliant besoins
  dégradés + plainte patient + contradictions ouvertes → candidats
  `DecisionPriorityCandidate` (`origin: 'engine'`).
- Canal plainte/priorité patient : `Q_PLAINTES` et `patientContext.priorityGoal`
  (transportés, lus par personne — `runtimeFromPrisma.ts:83-90`) entrent dans le
  classement des candidats ; la plainte dominante est toujours affichée en tête du
  cockpit, jamais écrasée par l'agrégat.
- Évaluation de l'abstention : règle explicite (signaux d'alerte actifs ⇒
  `required` ; sinon `not_required` motivé) — plus jamais `not_evaluated` par
  défaut.
- Intégrité : recalcul serveur de snapshot → review → decisionCard dans
  `POST /protocoles/versions` (aujourd'hui acceptés du client,
  `versions/route.ts:54-58,101-104`).
- La sélection reste praticien (`selectedBy: 'practitioner'`) — inchangé.

**Critères d'acceptation**
1. Sur la fixture golden case : ≥ 2 candidats produits (digestif, poids/
   métabolique), chacun avec claims, la plainte surpoids 10/10 visible en tête ;
   stress proposé au mieux en rang mineur si C-STR ouvert.
2. Aucun protocole persistable avec une decision card dont les hashes ne
   correspondent pas au recalcul serveur (test d'intrusion : carte fabriquée ⇒ 409).
3. L'abstention n'est plus jamais `not_evaluated` après confirmation T0.

---

## Lot E — Protocole structuré et compléments sur claims avant biologie (taille L)

**Objectif** : représenter le protocole réel (phases, observation, interventions
conditionnelles) et permettre la **prescription-conseil de compléments fondée sur
claims valides sans attendre la biologie**, en la marquant comme provisoire.

**Périmètre**
- Extension du contrat d'action (`clinical-engine/types.ts:284-292`) :
  - nouveau type `observation` (agenda sommeil, journal alimentaire — moitié du
    protocole du cas de référence) et `medical_referral` (courrier médecin, relié
    à `CorrespondanceMedecin`) ;
  - statut d'intervention :
    `active` | `conditionnelle_biologie` | `differee` | `contre_indiquee` |
    `non_indiquee_actuellement` ;
  - `waitFor?: { type: 'biologie', cible: string, echeance?: date }`.
- Phases : `ProtocolPhase { duree, objectifs[], actions[], mesures[],
  prerequis[], reviewAt }` — V1 : deux phases suffisent (observation/mise en
  mouvement ; ajustement post-biologie).
- **Compléments avant biologie** — règle de décision :
  1. l'intention référence une `ClinicalRule` C4 **validée** (`validePar`/`valideLe`
     non nuls) portant `gradePreuveScientifique` et une source
     (`schema.prisma:594-624`) ; les claims cités sont `valides` au corpus ;
  2. aucune `SupplementSafetyAlert` active sur l'ingrédient, contre-indications et
     seuils fonctionnels du catalogue respectés (`IngredientFunctionalThreshold`) ;
  3. le déclencheur est un tableau clinique (besoin dégradé + plainte + anamnèse),
     **jamais un score DNST seul** — les axes DNST ne sont pas un déclencheur
     recevable, garde testée ;
  4. l'intention naît en `active` si la règle est inconditionnelle, ou en
     `conditionnelle_biologie` avec `waitFor` si la règle C4 porte une
     `conditionSupplementaire` biologique (ex. fer ⇒ ferritine requise) ;
  5. validation praticien inchangée (sélection, revue, approbation) ; le rendu
     patient d'une intention `conditionnelle_biologie` dit explicitement « en
     attente de confirmation par votre bilan » (formulation non anxiogène).
- Garde de restitution étendue : le LLM ne peut nommer un complément absent des
  intentions déterministes (patron `verifierRestitutionOrientation`).

**Hors périmètre** : dosages libres (interdits par le contrat), automatisation de
l'envoi.

**Critères d'acceptation**
1. Cas de référence rejouable : phase 1 sans complément *ou* avec une intention sourcée
   claims (ex. oméga-3 si une règle C4 validée le fonde) marquée
   `conditionnelle_biologie` ; tyrosine/mélatonine **improposables** depuis les
   scores DNST (test négatif dédié).
2. Une intention `conditionnelle_biologie` est visible praticien et patient avec
   son statut ; elle n'apparaît jamais comme recommandation ferme.
3. Une intention sans `ruleId`/`ruleVersion`/`justification` est rejetée
   (garde existante `protocolDraft.ts:17-18` étendue aux nouveaux statuts).
4. `check_no_secrets` et T2 verts ; textes UI en français.

---

## Lot F — Biologie : catalogue actif et arbitrage sans valeurs (taille M)

**Objectif** : rendre la biologie opérante pour la boucle de révision **sans
stocker de valeurs d'analyses** (le gate HDS reste fermé — `featureFlag.ts:18-38`).

**Périmètre**
- Peuplement du catalogue niveau 1 (migration de données, claims obligatoires
  déjà imposés par le schéma) : socle NFS/iono/hépatique, glucidique (glycémie,
  HbA1c, insulinémie *validation médicale requise*), lipides, TSH ± T4L,
  ferritine/B12/folates/D/zinc/Mg érythrocytaire, CRPus ; panels conditionnels
  cœliaque (IgA + anti-TG, sur symptômes digestifs persistants) et SOPK (sur
  signes cliniques) avec `TriggerConditions`/`ExclusionConditions`.
- Moteur de statuts : `recommandé | optionnel | conditionnel |
  non_indiqué_actuellement | déjà_documenté | à_répéter`, dérivé du tableau
  clinique (besoins, plaintes, drapeaux) — patron orientation, claims cités,
  `RequiresMedicalValidation` par analyte.
- Sortie praticien : proposition de bilan hiérarchisée + **courrier médecin
  généré** (gabarit non prescriptif — garde `assertRenduMedecinNonPrescriptif`
  réutilisée), consigné dans `CorrespondanceMedecin`.
- **Arbitrage sans valeurs** (contournement HDS assumé, V1) : nouvel objet
  `ArbitrageBiologique { protocolDraftId, intentionId, verdict: confirme |
  infirme | sans_objet, noteCourte, arbitreLe, arbitrePar }` — le praticien
  consigne sa lecture du bilan reçu hors outil ; **aucune valeur d'analyse
  stockée**. La saisie de résultats reste un lot ultérieur conditionné à la
  décision HDS.

**Critères d'acceptation**
1. Pour le tableau du golden case, le moteur produit : socle + glucidique +
   thyroïde + martial/micronutriments `recommandé`, cœliaque `conditionnel`
   (déclencheur digestif rempli), SOPK `conditionnel` (déclencheur non rempli ⇒
   affiché avec sa condition), cortisol isolé `non_indiqué_actuellement`.
2. Chaque ligne porte claim + niveau + remboursement (module existant
   `remboursable.ts`) + `RequiresMedicalValidation` correct.
3. Un arbitrage `infirme` sur une intention `conditionnelle_biologie` est
   impossible à enregistrer sans note.
4. Aucune table ne contient de valeur biologique patient (contrat SQL négatif,
   patron `cb_biologie_catalogue_v1_negatif.sql`).

---

## Lot G — Révision de protocole au retour de biologie (taille M)

**Objectif** : fermer la boucle « proposer sur claims → confirmer/infirmer par la
biologie → réviser ».

**Périmètre**
- L'enregistrement d'un `ArbitrageBiologique` (Lot F) ouvre une **révision** :
  nouvelle version de `ProtocolDraft` (`supersedesDraftId` — mécanisme existant),
  résolution des intentions `conditionnelle_biologie` :
  `confirme` ⇒ `active` ; `infirme` ⇒ `non_indiquee_actuellement` (conservée,
  motif visible) ; `waitFor` levé.
- La caducité d'approbation existante (`diffusion.ts:75-81`) fait le reste :
  re-revue + re-approbation obligatoires avant que le patient voie la version
  révisée ; le portail sert l'ancienne version approuvée entre-temps.
- Carte de Fil « biologie arbitrée — protocole à réviser » (patron `jalon_j21` :
  différence entre deux artefacts persistés — arbitrage présent, révision absente).
- Notification patient : aucune automatique ; le praticien diffuse.

**Critères d'acceptation**
1. Scénario bout-en-bout sur fixture : intention fer `conditionnelle_biologie` →
   arbitrage `infirme` → carte de Fil → nouvelle version sans fer actif, motif
   « non indiqué après bilan » → re-approbation → portail à jour.
2. Impossible de résoudre une intention conditionnelle sans arbitrage lié.
3. L'historique des versions montre la chaîne complète (claims → intention →
   arbitrage → révision) sans trou.

---

## Lot H — Jalons J21/J42/J90 et momentum vectoriel (taille M)

**Périmètre** : UI de confirmation des jalons non-T0 (le back accepte déjà tout
jalon, seul `milestone:'T0'` est câblé — `ClinicalRuntimeSection.tsx:198,234`) ;
re-passation ciblée proposée au jalon (instruments visés par le protocole, pas le
pack entier) ; momentum **par domaine** {digestif, alimentaire, mouvement,
sommeil, adaptation} + poids/tour de taille déclaratifs (nouvelle saisie simple),
avec bande de bruit par variable (fini le « hausse » à +0,01,
`momentum.ts:42-43`) ; le scalaire global reste en repère ; check-ins juxtaposés,
jamais fusionnés (doctrine conservée).
**Critères** : la carte `jalon_j21` devient soluble depuis l'UI ; un J21 avec
re-passation TFD seule produit un momentum digestif sans prétendre mesurer le
reste ; poids affiché comme trajectoire, jamais scoré.

## Lot I — Multi-cycle : T1 = T0 du cycle suivant (taille M)

**Périmètre** : lever le verrou d'unicité (id d'épisode déterministe
`runtime-episode-{patient}-{milestone}` + `upsert(update:{})`,
`runtimeFromPrisma.ts:102`, `versions/route.ts:300-304`) — id par cycle,
ouverture d'un nouveau cycle sur geste praticien explicite (conditions : dernier
jalon du cycle précédent mesuré ou clôture motivée) ; le comparateur
multi-cycles, `deltaTourPrecedent` et la cohorte cabinet (code déjà écrit,
aujourd'hui inatteignable) deviennent vivants ; pas de correction destructive de
T0 — un T0 erroné se clôt et se rouvre en cycle 2, motif tracé.
**Critères** : deux cycles créables sur fixture ; comparaison inter-cycles servie
seulement à `versionScore` identique (garde existante) ; aucun chemin de
modification d'un épisode confirmé.

## Lot J — Stop rules et extinction d'orientation (taille S, parallélisable dès B)

**Périmètre** : table `ClinicalStopRule` (patron orientation, claims) — V1 : trois
règles du cas (STOP-STR, STOP-SOM, STOP-APN « surveillance simple ») ; effet :
extinction de règles d'orientation nommées + mention « information suffisante —
pas d'exploration supplémentaire actuellement » dans cockpit et synthèse ;
`dejaRepondu` devient excluant (aujourd'hui décoratif,
`orientationEngine.ts:675-686`) ; SCOFF ajouté à la table d'orientation avec
claim (restriction déclarée + plainte poids ⇒ proposé — il est aujourd'hui cible
d'aucune règle).
**Critères** : test section 58 étendu — DASS+Cungi rassurants ⇒ HAD et PSS-10
éteints avec motif visible ; PSQI 5 + agenda satisfaisant ⇒ axe sommeil clos ;
l'extinction est réversible si une donnée nouvelle rallume le déclencheur.

---

## Ce que cette spécification ne couvre pas (volontairement)

- Saisie et stockage des **valeurs** biologiques (décision HDS préalable).
- Hypothèses cliniques persistées et evidence graph (P2 du rapport — s'appuient
  sur A, B, J une fois livrés).
- Information gain / charge patient chiffrée (P2 ; le Lot J en donne la moitié de
  la valeur pour un dixième du coût).
- Régénération des synthèses historiques.

## Jeu de tests transverse (entre en CI avec les lots)

- Fixture `clinical-fixtures/obesity-restriction-digestive-young-adult.json`
  (patient fictif autorisé, jamais l'identité réelle) — propriétés de la
  section 55 du rapport ; rejouée par les lots B, D, E, F, G, H, J.
- Tests de régression sections 56 (invalidation), 57 (mélatonine), 58 (stress).
- Test négatif permanent : aucune intention de complément déclenchable par un
  score DNST seul ; aucun champ libre produit/dose ; aucune valeur biologique en
  base.
