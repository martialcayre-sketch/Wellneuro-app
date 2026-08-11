# Dossier de règles candidates — LOT-03 (moteur de propositions de parcours)

**Statut : artefact de préparation, candidats seulement.** Ce document nourrit
l'arbitrage praticien nommé à l'ouverture de LOT-03 (« liste des règles
candidates et leurs claims »). Il **n'engage aucune décision** : aucun `D-xxx`,
aucun code, aucune migration, aucune règle publiée. Chaque claim cité est
`statut='VALIDE' AND active=true` en base (`rag_corpus_claims`, projet
`ohnbmypinamzzfhqymlt`) et re-requêtable. Rien n'est inventé : les propositions
et leurs conditions sont **verbatim** du corpus.

Date : 2026-08-11. Périmètre décidé : forme conditionnelle exhaustive (une
proposition alimentaire énoncée sous une condition), 46 claims-charnières
retenus sur 2 650 claims prescriptifs balayés.

---

## 1. Ce que LOT-03 ajoute, et pourquoi il lui faut sa propre table

Le précédent d'architecture est le **moteur d'orientation**
(`web/src/lib/clinical/orientationRulesV1.ts`, `orientationEngine.ts`) :
règles `publiee` seulement, claims tracés (`justificationClaims` jamais vide),
recalcul depuis `rawAnswers`, filtre d'administrabilité fail-closed, jamais
d'auto-assignation (le praticien lit, valide ou amende).

Mais ce moteur ne sait proposer **qu'un questionnaire ou un pack**
(`OrientationSuggestion = { questionnaireId?, packId? }`,
`orientationRulesV1.ts:118-120`). Il **ne sait pas proposer un parcours
alimentaire**. Et c'est déjà un manque *observé*, pas théorique : la règle
publiée `R2-ALI-01` cite `WN-CL-0287-009`, dont le texte propose « l'assiette
de détoxication », mais la règle a dû **abandonner** cette partie —

> « L'assiette de détoxication que `WN-CL-0287-009` indique n'est PAS un
> questionnaire : elle relève de la prise en charge, et l'objectif ne la
> promet donc plus. » (`orientationRulesV1.ts:1082-1084`)

**Le vide que LOT-03 comble, c'est exactement cette proposition perdue.** D'où
le découpage du lot : une table de règles versionnée + un objet « proposition
de parcours » persisté (**migration en PR séparée**, code derrière drapeau
éteint), une cible d'un type nouveau que `OrientationSuggestion` ne porte pas.

---

## 2. Le gabarit d'une règle de parcours (transposé du moteur d'orientation)

Chaque règle candidate se lit sur la forme éprouvée d'`OrientationRule`
(`orientationRulesV1.ts:127-144`), la cible en moins, un type de cible neuf en
plus :

| Champ | Ce qu'il porte | Contrainte |
|---|---|---|
| `id` | `R-PARC-ALI-xx` (candidat) | — |
| `statut` | `brouillon` \| `publiee` \| `suspendue` | **seules `publiee` évaluées** |
| `declencheurs[]` | ET logique de signaux **disponibles** (§3) | un signal absent = règle muette, jamais 0 |
| **cible** | **parcours alimentaire** (assiette / régime / éviction / complément) | **type neuf** — l'objet à migrer |
| `justificationClaims[]` | claims `VALIDE` à l'appui | **jamais vide** (invariant de doctrine) |
| `niveau` | `socle` \| `approfondissement` \| `specialise` | — |

Invariants repris du précédent, non négociables : **publiee-only**, **recalcul
depuis `rawAnswers`** (pas d'état), **fail-closed** (signal indisponible →
aucune proposition, jamais une proposition par défaut), **jamais
d'auto-assignation**. Le double verrou du panneau Orientation
(`WN_ENABLE_ORIENTATION_NNPP2` + table signée) est le gabarit d'activation.

**La leçon `R2-ALI-01` sur le drapeau `WN_ALI_01_SIIN57`
(`orientationRulesV1.ts:1021-1043`) vaut ici à l'identique** : `Q_ALI_01`
désigne deux instruments (SIIN57 /90 vs COURT14 /42) selon le drapeau ; un
déclencheur aveugle à la bascule « ne garde rien ». Toute règle lisant
`Q_ALI_01` devra citer ses **bandes verbatim** de la forme couverte par le
claim, pas une couleur.

---

## 3. Les signaux disponibles au déclenchement (la ligne de partage)

Le moteur se déclenche sur ce qui existe au tour 1 et après la première
synthèse : **`PACK_BASE`** (dont `Q_ALI_01` — interprétation globale /90 en
SIIN57), **`Q_ALI_02`/`Q_ALI_03`** (assignés post-synthèse), l'**agenda
alimentaire clôturé** (agrégats `AGA_*`, axes candidats A1–A6 du dossier de
calibration LOT-02), et les **drapeaux d'anamnèse déclarés**
(`extraireDrapeauxAnamnese` — intolérances, antécédents, déglutition…).

**Ce que le moteur n'a PAS au déclenchement : la biologie.** Or une grande
partie des claims-charnières du corpus sont conditionnés à une valeur
biologique (« déficit confirmé par la biologie », « CRP ultrasensible élevée »,
« HOMA élevé », « valeur biologique < 10 ng/mL », prise d'IPP…). Ces
propositions sont **réelles et sourcées**, mais **non déclenchables** depuis un
questionnaire ou l'agenda : elles appartiennent au **versant biologie-révision**
(cf. la campagne chaîne-T0, `LOT-06-biologie-revision`). Les mélanger aux
signaux du tour 1 serait inventer un déclencheur que le claim ne donne pas.

D'où les **deux groupes** de la matrice : **A — déclenchable au tour 1** ;
**B — déclencheur biologique, hors tour 1** (pont vers la révision biologie,
pas une règle de ce moteur).

---

## 4. Matrice des parcours candidats

Regroupée **par parcours proposé** (plusieurs sources énoncent le même parcours
sous des conditions voisines — à dédupliquer à l'arbitrage). Colonnes :
parcours (verbatim) · claim(s) fondateur(s) `VALIDE` · condition (verbatim) ·
signal disponible ? · typologie · porte-seuil (borne chiffrée → **revue
individuelle**).

### 4.A — Déclenchables depuis les signaux du tour 1 (questionnaires / agenda / anamnèse)

| Parcours proposé (verbatim) | Claim(s) | Condition (verbatim) | Signal candidat | Typo | Seuil |
|---|---|---|---|---|---|
| **Assiette de détoxication** « peut être proposée » | `WN-CL-0287-009` | « lorsque le score global de l'enquête alimentaire SiiN détaillée est défavorable » | `Q_ALI_01` interprétation globale /90 (SIIN57), bandes défavorables verbatim | interprété | non |
| **Assiette de détoxication** « est indiquée » | `WN-CL-0287-008` | « chez les patients gros consommateurs de médicaments… troubles fonctionnels ou maladies inflammatoires de l'intestin » | drapeau anamnèse / Q_GAS si assigné | interprété | non |
| **Assiette psychobiotique** « est indiquée » | `WN-CL-0291-014` | « lorsque les scores globaux sont défavorables ou lorsque la consommation de denrées végétales est insuffisante » | `Q_ALI_01` défavorable **ou** agenda A5 (densité végétale) | interprété | non |
| **Assiette sérotoninergique** | `WN-CL-0341-025`, `WN-CL-0245-014` | « en cas de troubles de l'humeur, de stress intense, d'anxiété » / « stress chronique, intense et très invalidant » | instruments stress/humeur de `PACK_BASE` | interprété | 0245-014 : **oui** |
| **Régime à faible teneur en histamine** | `WN-CL-0250-001`, `WN-CL-0251-011`, `WN-CL-0250-004` | « chez les sujets présentant des symptômes d'intolérance à l'histamine » / « sensibilité passagère » | drapeau anamnèse (intolérance déclarée) | déclaré / interprété | non |
| **Éviction de certaines céréales / du pain** ; **régime méditerranéen adapté** (riz, quinoa, sarrasin) | `WN-CL-0072-031`, `WN-CL-0076-018` | « en cas d'intolérance au gluten » | drapeau anamnèse (intolérance déclarée) | interprété | non |
| **Régime / assiette d'épargne digestive** | `WN-CL-0231-009`, `WN-CL-0297-004`, `WN-CL-0376-022` | « en cas d'intolérance alimentaire » / « troubles associés » | drapeau anamnèse / Q_GAS si assigné | interprété | 0297-004 : **oui** (6–8 sem.) |
| **Alimentation mixée** | `WN-CL-0389-024`, `WN-CL-0386-008`, `WN-CL-0387-016` | « en cas de troubles de la déglutition » | drapeau anamnèse (déglutition déclarée) | interprété | non |

### 4.B — Déclencheur biologique (hors tour 1 — versant biologie-révision, pas une règle de ce moteur)

Réels et sourcés, mais leur condition est une valeur biologique : à router vers
la révision biologie, **non déclenchables** depuis questionnaire/agenda.

| Parcours proposé (verbatim) | Claim(s) | Condition biologique (verbatim) | Seuil |
|---|---|---|---|
| **Alimentation anti-inflammatoire** | `WN-CL-0233-010`, `WN-CL-0245-011`, `WN-CL-0341-022` | « en cas de CRP ultrasensible élevée » | non |
| **Alimentation à index glycémique faible** | `WN-CL-0233-011`, `WN-CL-0245-012`, `WN-CL-0341-023` | « en cas de HOMA élevé » | 0233-011 : **oui** |
| **Assiette anti-inflammatoire et antioxydante** (oméga 3, polyphénols) | `WN-CL-0388-012` | « en cas de neuroinflammation » | non |
| **Alimentation antioxydante** | `WN-CL-0239-007` | « en cas d'exposition solaire intense » | **oui** |
| **Complémentation fer** (biglycinate, formes végétales) | `WN-CL-0044-002`, `WN-CL-0166-041`, `WN-CL-0235-012`, `WN-CL-0318-020`, `WN-CL-0335-010`, `WN-CL-0361-013` | « en cas de déficit confirmé par la biologie » | plusieurs : **oui** |
| **Complémentation vitamine D** | `WN-CL-0076-017`, `WN-CL-0239-010`, `WN-CL-0239-011` | « faible ensoleillement » / « déficit < 10 ou < 30 ng/mL » | **oui** |
| **Complémentation B12 (méthylcobalamine)** | `WN-CL-0161-065` | « insuffisance, prise d'IPP, ou déficit en B12 active » | non |
| **Supplémentation potassium** | `WN-CL-0333-032`, `WN-CL-0335-011` | « en cas d'apport très faible » | **oui** (1 g) |
| **Oméga 3 EPA/DHA (modèle végétal)** | `WN-CL-0330-029` | « chez les patients végétariens/végétaliens/vegan réguliers » | non |
| **Acides aminés tyrosine/tryptophane, tryptophane, L-tyrosine, probiotiques, lithium** | `WN-CL-0313-013`, `WN-CL-0327-003`, `WN-CL-0344-029`, `WN-CL-0233-012`, `WN-CL-0233-013`, `WN-CL-0235-013`, `WN-CL-0318-019`, `WN-CL-0171-049` | stress chronique / CAR / hyperexcitabilité / dopaminergique / épilepsie | majorité : **oui** |

> Note de moisson (sous-agent, lecture seule) : 46 claims retenus sur 59
> inspectés un à un ; 13 écartés (recommandations négatives, mesures non
> alimentaires, mises en garde sans condition déclenchante). **16 claims
> porte-seuil** au total. Doublons de forme à dédupliquer à l'arbitrage
> (anti-inflammatoire ×3, IG bas ×3, sérotoninergique ×2, histamine ×2,
> alimentation mixée ×3, potassium 1 g ×2).

---

## 5. L'ancre — la branche perdue de `R2-ALI-01`

La règle candidate la plus solide n'introduit **aucun claim neuf** : elle
reprend la **seconde branche de `WN-CL-0287-009`** que `R2-ALI-01` a dû laisser
tomber faute de cible parcours. Le claim câble déjà, verbatim, un signal
disponible (`Q_ALI_01` défavorable) à un parcours nommé (assiette de
détoxication). C'est le point d'entrée naturel du moteur, et le seul dont
l'appariement signal→parcours est **déjà porté par un claim publié**, pas
proposé ici. Toutes les autres lignes du §4.A supposent un arbitrage
d'appariement (quel drapeau, quelle bande) que le claim seul ne tranche pas.

---

## 6. Réserves de gouvernance (à porter au futur `D-xxx`)

1. **Usage nouveau des sources.** Ces claims sont validés pour la lecture du
   corpus ; les mobiliser comme **fondation d'une proposition de parcours** est
   un *usage* qui n'est marqué nulle part (il n'existe pas de champ
   `usage='parcours'` ni même `usage='orientation'` en base — vérifié). Cet
   usage est donc à **trancher** avec le `D-xxx`, source par source, comme la
   calibration LOT-02 réserve son propre usage-barème.
2. **Claims porte-seuil (16).** Tout claim portant une borne chiffrée (dose,
   durée, seuil biologique) part en **revue individuelle** (garde
   `rag_claim_porte_seuil`). Un moteur de propositions ne doit pas véhiculer un
   dosage sans cette revue.
3. **Typologie.** Les 46 retenus sont `prescriptif` et très majoritairement
   `interprété` (quelques `déclaré`). Un claim `interprété` **documente** l'axe
   mais n'est pas forcément le **porteur** d'une décision de règle sans
   arbitrage — même contrainte qu'au dossier de calibration.
4. **Frontière biologique (§4.B).** Aucune règle de ce moteur ne doit déduire
   une valeur biologique d'un questionnaire ou de l'agenda. Le §4.B est un
   inventaire de **pont** vers la révision biologie, pas une réserve de
   déclencheurs pour le tour 1.
5. **Découpage du lot inchangé.** Table de règles versionnée, **objet
   proposition de parcours en migration séparée** du code (règle du dépôt),
   bloc de synthèse dédié (bump `VERSION_PROMPT_SYNTHESE` v19→v20, garde de
   prompt), surface praticien en lecture/validation/amendement. Le **dégel de
   `JA5-05`** (aval adhésion au carnet) reste un arbitrage utilisateur **hors
   lot**.

---

## 7. Ce qui reste à l'arbitrage praticien (les questions du lot)

- **Quelles règles retenir**, et sous quel `id` — en commençant par l'ancre §5.
- **Où commence le déclencheur** pour chaque règle lisant un score (comme
  `R2-ALI-01` a dû trancher « où commence défavorable » sur les bandes /90).
- **Quel appariement signal→parcours** pour les lignes §4.A dont le claim ne
  fixe pas le drapeau exact (intolérance déclarée vs mesurée, A5 vs Q_ALI_01).
- **Le type de cible parcours** à persister (l'objet à migrer) et sa surface de
  lecture praticien.
- **Le sort du §4.B** : nourrit-il la révision biologie plutôt que ce moteur ?

Chaque réponse est une **décision clinique** ; ce dossier n'en prend aucune. Il
fournit la matière tracée pour qu'elle se prenne « sans rien inventer ».
