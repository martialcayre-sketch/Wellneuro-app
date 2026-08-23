# Constitution clinique d'exécution

> **Ce document n'est pas encore opposable dans son entier.** Chaque règle
> porte son statut : **acté** (elle reprend une décision ou un invariant déjà
> opposable, dont la référence est donnée) ou **proposition** (elle attend une
> entrée `docs/DECISIONS.md`). Une règle « proposition » informe une revue,
> elle ne la tranche pas.
>
> **Quatre marqueurs qualifient un statut, et se cherchent au grep :**
> **Banc dû** — la règle est opposable mais ne mord pas encore à l'exécution ;
> **Producteur dû** — un banc la garde, mais rien ne l'alimente en production,
> donc elle est inerte ; **Décision due** — le code la tient et un banc la
> garde, mais aucune entrée du registre ne la prononce ; **Orpheline** — son
> lot porteur est livré sans l'avoir refermée, et aucun lot ne la reprend.
> Ce dernier s'écrit **exactement** `**Orpheline**`, capitale comprise : il
> est fait pour être compté au grep, et une casse flottante l'aurait rendu
> invisible à moitié.
> Un cinquième, **écrite, non armée**, dit qu'une règle n'a pas de sujet au
> dépôt, que son déclencheur est nommé, et que c'est un état légitime.
>
> **Statuts confrontés au code le 2026-08-23** ([[D-095]], LOT-01 de la
> campagne « Doctrine exécutable ») : les 58 règles ont été re-vérifiées une
> par une contre le dépôt, jamais contre la documentation qui le décrit. Une
> bascule n'a été prononcée que sur ses **trois preuves** — décision, banc qui
> tourne, statut.
>
> **Limite du LOT-01, dite plutôt que masquée** : la grille à quatre colonnes
> de l'audit (acquis / partiel / porté / absent) **n'a pas été recomputée**
> règle par règle. Elle mesure l'état du code, quand ce document mesure l'acte
> d'intégration, et les deux ne coïncident pas — `DC-33` en est l'exemple : le
> code la tenait avant que la moindre décision ne la tranche. Les comptes que
> ce lot établit sont ceux qui se vérifient au grep, énumérés par `D-095`.
>
> Portée : tout ce qui produit, transforme ou restitue du savoir clinique —
> moteurs déterministes, prompts, agents de développement, tables de règles,
> scoring, registres.
>
> Les 50 propositions d'origine se déplient en **58 règles** : plusieurs
> portaient deux obligations distinctes qu'un même numéro aurait rendues
> inapplicables (une règle à deux obligations est une règle qu'on peut
> respecter à moitié en croyant l'avoir tenue).

---

## I — Provenance : la règle suprême

**DC-01 — Aucun comportement clinique sans provenance.** Toute décision
produite par WellNeuro ou par un agent doit pouvoir remonter la chaîne :
observation patient → instrument ou donnée → claim(s) certifié(s) → règle
interprétative → orientation → validation praticien si requise. Un maillon
absent invalide la sortie, il ne l'affaiblit pas.
*Acté — [[D-003]], [[D-012]].*

**DC-02 — Un LLM ne crée jamais une règle clinique.** Il applique, combine,
hiérarchise ou explique des règles dont la provenance est connue.
*Acté — [[D-003]].*

**DC-03 — Une proposition peut être générative ; sa justification, jamais.**
Le texte qui explique pourquoi peut être rédigé par un modèle ; ce qu'il
invoque doit préexister.
*Proposition — l'interdit n'est écrit que pour le bloc d'orientation
(`anthropic.ts:494`, `:432`) ; le reste de la synthèse (hypothèses, points de
vigilance) est en prose libre sans provenance. [[D-011]] a délibérément choisi
de ne pas la faire mordre : `verifierRestitutionOrientation.ts` journalise, il
ne censure pas, et ses angles morts sont nommés (`:23-32`). **Orpheline** : le
LOT-01 de la chaîne T0 la portait « partiellement » et il est livré.*

**DC-04 — Pas de claim sans citation exploitable.** Source, chunk ou section,
notebook, version. Un claim qui cite un verbatim absent est refusé à
l'ingestion, pas dégradé.
*Acté — non par `CHUNK_INTROUVABLE` (`rag/claims/store.ts:136-140`), qu'aucune
suite ne joue, mais par trois pièces : le contrat de charge « ≥ 1 chunk
source » (`validation.ts:156-158`, banc `validation.test.ts:38`), la FK
`rag_corpus_claim_sources_chunk_fk` `ON DELETE RESTRICT`, et la fixture E du
contrat `D-003` (`rag_claim_barriere_d003_v1.sql:139-143`, `ci.yml:543`).
**Décision due** : aucune entrée du registre ne nomme la barrière
d'ingestion. La FK n'est assérée par aucun contrat de `web/prisma/checks/`.*

**DC-05 — Un claim de synthèse ne masque pas ses claims parents.** Si `C` naît
de `A + B + D`, le système conserve et restitue `A`, `B`, `D`. Sans quoi naît
une doctrine dérivée dont plus personne ne connaît l'origine.
*Proposition — **écrite, non armée** : aucun claim dérivé n'existe, la règle
n'a pas de sujet. Déclencheur : le premier claim dérivé. État légitime, pas
une dette (vérifié le 2026-08-23).*

**DC-06 — La hiérarchie des sources est ordonnée, et une génération LLM ne
contredit jamais un niveau supérieur.** Ordre décroissant : sécurité et
réglementation → consensus ou recommandation certifiée → instrument validé et
ses règles propres → claim NNPP2 de référence → autre source certifiée du
corpus → données observationnelles internes → inférence du moteur →
génération LLM. Plus on descend, moins on a le droit de transformer une
information en règle automatique.
*Proposition — les champs `classe_autorite` et `niveau_preuve` existent déjà
par claim ; l'ordre de résolution, lui, n'est écrit nulle part.*

---

## II — Claims : taxonomie, cycle de vie, niveau d'exécution

**DC-07 — Cinq catégories canoniques de claims.** `A` descriptif · `B`
associatif ou interprétatif · `C` orientation ou exploration · `D`
intervention · `E` sécurité, contre-indication, red flag. La catégorie
commande le traitement ; elle n'est pas une étiquette documentaire.
*Proposition — porté par la campagne **Curation signée** ([[D-096]] : la
colonne catégorie `A-E` sur `rag_corpus_claims` y a été transférée depuis
« Doctrine exécutable », faute de consommateur). Aucune catégorie `A-E`
n'existe au dépôt ; `typologie_lecture` est un axe de **lecture**
(déclaré/observé/vécu/interprété, `CHECK rag_corpus_claims_typologie`), sans
rapport avec celui-ci.*

**DC-08 — Un claim descriptif peut s'exécuter automatiquement** s'il est
parfaitement certifié (correspondance score ↔ catégorie d'un questionnaire,
par exemple).
*Proposition — **écrite, non armée** : rien ne s'exécute automatiquement, tout
passe par le praticien ([[D-003]]). Déclencheur : la première exécution
`AUTO`, qui suppose `DC-13`. État légitime, pas une dette (vérifié le
2026-08-23).*

**DC-09 — Un claim associatif ne devient jamais une preuve.** « X peut être
associé à Y » ne se restitue jamais en « X prouve Y », ni en « X explique Y ».
*Acté [[D-097]] — LOT-09 de « Doctrine exécutable », sur le patron qui a
refermé `DC-27`. Le prompt de synthèse porte l'interdit dans son **cadre
déontologique**, entré en `synthese-v29` : `anthropic.ts:347` « Une association
n'est pas une preuve […] Ne l'écris jamais sous la forme "X prouve Y",
"X explique Y", "X démontre Y" ni "X atteste Y" ». Banc :
`promptAssociationPreuve.guard.test.ts:46` (la formule) et `:82` (la
**position** — la clause reste au-dessus des sections topiques, hors de portée
de la primauté que s'accorde la section orientation, `anthropic.ts:514`).
Côté déterministe, rien n'avait à être posé : `ContradictionFinding.description`
impose déjà la formulation neutre (`contradictionFinding.ts:130-136`, appliquée
`contradictionsV1.ts:50-53`) et aucune table signée ne conclut.
**Limite** : comme pour `DC-27`, le banc garde la consigne, pas la sortie du
modèle. **Second point de passage examiné et écarté** : le détecteur de
restitution ne peut pas porter ce marqueur — le glissement probatoire n'a pas
de vocabulaire fermé, et l'y forcer demanderait un arbitrage chiffré neuf
(motif écrit, `verifierRestitutionOrientation.ts:43`). Le régime de [[D-011]]
— journaliser, ne pas censurer — n'est pas touché.*

**DC-10 — Un claim d'orientation produit une orientation suggérée, jamais un
diagnostic.** « En présence de X + Y, explorer éventuellement Z » alimente le
deuxième rideau ; il ne conclut rien.
*Acté — [[D-003]], [[D-007]].*

**DC-11 — Un claim d'intervention porte ses métadonnées ou n'est pas
exécutable :** indication, conditions d'entrée, dose éventuelle, durée,
population, contre-indications, interactions, niveau de preuve, source, rôle du
praticien.
*Proposition — **Orpheline**. Le LOT-05 de la chaîne T0 la portait, ce lot est
livré ; le registre d'interventions compte 95 entrées et ne porte **aucun** des
neuf champs exigés, sa facette `interactions` est inerte depuis le 2026-08-01.
Seules les **exclusions** (`neCouvrePas`, `null` sur les 95) ont un véhicule :
le LOT-05 de « Doctrine exécutable ». Indication, conditions d'entrée, dose,
durée, population, contre-indications, interactions, rôle du praticien :
sans porteur.*

**DC-12 — Un claim de sécurité prime sur tous les autres et peut inhiber une
proposition** issue de plusieurs claims favorables. Red flag médical,
contre-indication, interaction, grossesse, pathologie, médicament, symptôme
appelant une orientation médicale.
*Acté [[D-043]] — opposable en revue et pour tout agent. Le consommateur est
câblé et bancé : `decisionCard.ts:112` bloque dès `safetyFindings.length > 0`,
`chaineC1.ts:263-270` sélectionne `ABST-SEC-01`, joués à `safetyFindings: 1`
par `priorityRulesV1.test.ts:471` (table permutée, anti-vacuité),
`c1Flow.test.ts:121` et `decisionCard.test.ts`. **Producteur dû** :
`chaineC1.ts:315` pose `safetyFindings: 0` en dur, aucun constat de sécurité
déterministe n'existe, la règle est **inerte en production** — la réserve
« Banc dû » qu'elle portait était mal nommée, le banc existe. Porté par le
LOT-04 de « Doctrine exécutable ».*

**DC-13 — Chaque claim porte son niveau d'exécution.** `AUTO` ·
`AUTO_WITH_EXPLANATION` · `SUGGEST_ONLY` · `PRACTITIONER_REQUIRED` ·
`PROHIBITED_AUTOMATION`. En l'absence de niveau explicite, le plus restrictif
s'applique.
*Proposition — aujourd'hui l'axe est binaire (`prescriptif`, `statut`). Porté
par la campagne **Curation signée** ([[D-096]]).*

**DC-14 — Aucune extrapolation hors de la population du claim.** Un claim
établi chez l'adulte ne vaut pas chez l'enfant, la femme enceinte, la personne
âgée, l'insuffisant rénal ou hépatique. L'absence de population déclarée se
lit comme une restriction, jamais comme une généralité.
*Acté [[D-043]] — opposable en revue et pour tout agent. Deux précédents
mordent déjà, **hors du claim** : le mode `clinicien` imposé à l'AQ et au QDRS
au motif nommé `DC-14` ([[D-066]], `questionnaires/gerontologie.ts:7-11`, banc
`droitsAssignabilite.guard.test.ts:363-390`) et `population` `NOT NULL` à
`CHECK` fermé sur les bornes biologiques ([[D-068]], [[D-069]], contrat
`cb_biologie_structure_v1.sql:115-118`, `ci.yml:606-609`). **Banc dû sur
l'objet de la règle** : rien n'empêche d'appliquer un claim hors de sa
population. **Portée ([[D-095]])** : la règle gouverne l'**extrapolation** d'un
claim, elle ne commande pas le défaut d'une colonne — une population générale
**déclarée** (`adulte_tout_venant`) n'est pas le silence qu'elle interdit de
lire comme une généralité. La population appartient à l'intervention
(`DC-11`), pas au claim.*

**DC-15 — Un claim a une date et une politique d'obsolescence.**
`validatedAt`, `reviewDueAt`, `sourceDate`, `supersededBy`, et un statut parmi
`VALIDATED` · `REVIEW_REQUIRED` · `OBSOLETE` · `CONFLICTED`. Un claim clinique
n'est pas éternel.
*Proposition — `superseded_at`, `valide_at` et `version_claim` existent ;
l'échéance de revue et les statuts `REVIEW_REQUIRED` / `CONFLICTED`, non. Le
vieillissement silencieux n'est plus vrai **pour les 40 claims épinglés par
les tables signées** : le contrat de fraîcheur les contrôle en CI et au
préflight `release-db` ([[D-042]], [[D-046]],
`rag_claim_fraicheur_tables_signees_v1.sql`). Il reste vrai pour le reste du
corpus.*

**DC-16 — Un claim généré automatiquement reste non certifié.** Extraction LLM
⇒ `draft`. Certification ⇒ acte humain distinct. Jamais le même statut, jamais
le même chemin.
*Acté — [[D-003]], [[D-004]], [[D-012]] ; `EN_ATTENTE_VALIDATION` vs `VALIDE`.*

**DC-17 — Un agent de développement ne modifie pas implicitement un claim
certifié.** Toucher au texte, à un seuil, à un poids, à une relation, à une
intervention ou à une contre-indication est une **modification clinique** —
même si techniquement ce n'est qu'une ligne de JSON ou de TypeScript.
*Acté [[D-043]], garde posée par [[D-083]] §3 — le hook d'écriture
`.claude/hooks/protect-wellneuro-files.mjs:82-91` place **huit fichiers
cliniques** au niveau « demande » (six tables signées — `orientationRulesV1`,
`stopRulesV1`, `priorityRulesV1`, `contradictionsV1`, `corpusSyntheseV1`,
`indicationsBiologieV1` — et deux fichiers de constantes,
`equilibre/constants.ts` et `questions.ts`), avec un motif qui exige une
décision `D-xxx` et un fragment `changelog.d/` (`:130-137`) ;
`gate-codex-p0.mjs:89` réutilise la liste. Banc :
`protect-wellneuro-files.test.mjs`, étape CI « Hooks de garde-fous »
(`ci.yml:134-135`), délibérément sans filtre `docs_only`. **Portée** :
Edit/Write seulement — une écriture par Bash et les scripts
`tools/corpus/claims/*.mjs` restent hors couverture.*

**DC-18 — Toute modification clinique exige une décision explicite.** Une
entrée `D-xxx` portant objet, source, raison, ancienne règle, nouvelle règle,
impact attendu, validation. Plus un fragment `changelog.d/`.
*Acté — invariant `REGISTRE_FRONTIERES.md` §1 ; registre `docs/DECISIONS.md`.*

---

## III — Scoring, seuils, pondérations

**DC-19 — Aucun seuil inventé.** Tout chiffre porteur de sens clinique a une
provenance : bornes, cut-offs, pondérations, doses, durées, fenêtres
temporelles, nombre minimal de jours, intervalles biologiques, objectifs. Un
chiffre purement technique peut être choisi par l'ingénierie, à condition
d'être identifié comme tel (DC-20).
*Acté — `.claude/rules/clinique-scoring.md`, [[D-013]].*

**DC-20 — Seuil clinique et seuil technique ne partagent pas le même statut.**
Chaque seuil déclare sa nature : `clinical` · `instrument` · `data_quality` ·
`technical` · `regulatory`. « 85 % » n'est pas la même chose selon qu'il borne
une interprétation clinique ou une qualité de recueil.
*Acté [[D-043]] — opposable en revue et pour tout agent. **Banc dû** : aucun
`thresholdKind` n'existe au dépôt, les seuils de qualité de recueil et les
cut-offs cliniques y ont le même statut. Une morsure partielle existe et
mérite d'être nommée — la liste blanche de colonnes de
`alli_dossier_deux_voix_v1_negatif.sql:11,173` (`ci.yml:685`) **interdit** tout
seuil sur les tables de l'alliance ; c'est un interdit, pas une déclaration de
nature. Porté par la campagne **Curation signée** ([[D-096]]).*

**DC-21 — Aucune pondération clinique tacite.** Un poids égal entre axes n'est
pas neutre : c'est déjà une décision de modèle. Toute pondération est
explicitement décidée et motivée sur place.
*Acté en pratique — `web/src/lib/equilibre/constants.ts:292-303` motive son
regroupement et refuse les poids plats sur place, valeurs épinglées par
`equilibre/score.test.ts:214-260` (rapport 2:1 dans le repos, renormalisation
d'une source absente). **Décision due** : aucune entrée du registre ne tranche
la pondération, et aucune garde n'interdit d'introduire un poids nouveau sans
motivation ni `D-xxx` — le banc épingle les valeurs actuelles, pas la règle.
Périmètre vérifié : « Mon équilibre » seulement.*

**DC-22 — Pas de score global si les dimensions n'ont pas de sens commun.** La
question précède le calcul : existe-t-il une interprétation clinique du total ?
Sinon, afficher les axes et les signaux, ne pas produire de total.
*Proposition — porté par le LOT-07 de la campagne « Doctrine exécutable », qui
pose la question au praticien et la tranche dans un sens ou dans l'autre.*

**DC-23 — Les red flags sont orthogonaux au score.** Un red flag n'ajoute ni ne
retire de points. Un score global favorable et un red flag majeur coexistent
sans se compenser, et le red flag reste prioritaire.
*Acté [[D-043]], [[D-062]] — la doctrine est portée comme **donnée signée** :
`ABSTENTION_PROCEDURE_V1.motifsRequired[0].doctrine = ['DC-12','DC-23']`
(`priorityRulesV1.ts:448`), couverte par `PRIORITY_RULES_SHA256`. Deux bancs la
font mordre : `priorityRulesV1.test.ts:465-478` (`safetyFindings: 1` ⇒
`status: 'required'`, table permutée) et `c1Flow.test.ts:114-140`
(`buildDecisionCard` jette sur bloqueurs malgré un candidat valide).
**Producteur dû** : branche inatteignable en production,
`chaineC1.ts:311-315` pose `safetyFindings: 0` en dur — la réserve « Banc dû »
qu'elle portait était mal nommée, les bancs existent, mais ils prouvent la
priorité et le blocage, pas l'énoncé arithmétique « n'ajoute ni ne retire de
points ». Porté par le LOT-04 de « Doctrine exécutable ».*

**DC-24 — Une donnée absente n'est jamais zéro ni normale.** `missing ≠ 0` ·
`missing ≠ normal` · `non réalisé ≠ négatif` · `non renseigné ≠ absence de
symptôme`. Un zéro implicite déplace un score sans que rien ne le signale.
*Acté — `.claude/rules/clinique-scoring.md`, [[D-009]], [[D-014]], [[D-016]].*

**DC-25 — Toute couverture insuffisante est visible.** Score éventuellement
indisponible, couverture explicite, motif explicite. Jamais de données
incomplètes rendues en score artificiellement complet.
*Acté — [[D-009]], [[D-014]] ; registre des passations non interprétables.*

**DC-26 — Le code ne duplique pas silencieusement la doctrine.** Un seuil déjà
porté par un claim ou une table de règles ne se réécrit pas en littéral dans
une condition. Chemin canonique : registre de claims → compilation → table
versionnée et signée → runtime.
*Partiel — le patron existe (table versionnée, signée, claims épinglés dans
`orientationRulesV1.ts`), mais **le chemin de compilation n'existe pas** :
`tools/corpus/orientation/`, que le commentaire du fichier annonce, n'a jamais
été écrit — ni sur le disque, ni dans l'historique Git. Voir §E de l'audit. La
règle ne peut pas être actée sur la foi d'un compilateur absent.*

---

## IV — Interprétation : ce qu'on a le droit de conclure

**DC-27 — Association n'est pas causalité.** `association ≠ causalité` ·
`score ≠ diagnostic` · `profil ≠ pathologie` · `symptôme ≠ mécanisme démontré` ·
`réponse à une intervention ≠ validation étiologique`. En neuronutrition, où
plusieurs axes se chevauchent, c'est la règle la plus facile à enfreindre sans
s'en apercevoir.
*Acté [[D-043]] — le prompt de synthèse interdit désormais **la causalité**,
entré en v20 : `anthropic.ts:469` « ne qualifie pas cet écart de progrès,
d'aggravation ni d'effet d'une prise en charge […] Association n'est pas
causalité ». Banc : `promptPassationCourante.guard.test.ts:70-78`, qui épingle
les deux formules dans `SYSTEM_PROMPT_GOUVERNANCE` (suite Vitest complète,
`ci.yml:798`, `npm run test:siin57` `:801`). Côté déterministe,
`ContradictionFinding.description` impose la formulation neutre
(`contradictionFinding.ts:130-136`, appliquée `contradictionsV1.ts:50-53`).
**Limite** : le banc garde la consigne, pas la sortie du modèle — le détecteur
de restitution journalise sans bloquer ([[D-011]]).*

**DC-28 — Un questionnaire isolé ne suffit jamais à conclure.** Une conclusion
clinique distingue quatre situations : signal isolé · convergence ·
discordance · absence de données.
*Acté côté règles [[D-014]], [[D-016]] — `limitations` est un champ
**obligatoire** du constat (`contradictionFinding.ts:155-160`, épinglé
`contradictionFinding.guard.test.ts:62`), C-STR porte l'énoncé mot pour mot
(`contradictionsV1.ts:158`) et les limites atteignent l'écran. **Pas côté
synthèse** : la consigne ne porte pas `DC-28`. **Mitigation assumée sous
signature, à connaître** : les deux règles publiées de `PRIORITY_RULES_V1`
reposent sur un item unique auto-déclaré de `Q_MOD_03`
(`priorityRulesV1.ts:335-343`, `validationExterne: true`) — arbitrage praticien
rattaché à aucun `D-xxx` nommant `DC-28`.*

**DC-29 — La convergence augmente la priorité, pas la certitude.** Quatre
niveaux : `SIGNAL` · `CONVERGENCE_FAIBLE` · `CONVERGENCE_MODEREE` ·
`CONVERGENCE_FORTE`. Chaque convergence nomme les sources indépendantes qui la
soutiennent. On n'écrit pas « le patient a manifestement un déficit
dopaminergique » mais « plusieurs éléments convergent vers une perturbation
fonctionnelle de cet axe, sans valeur diagnostique en soi ».
*Acté [[D-041]], [[D-043]] — les quatre niveaux (`SIGNAL` ·
`CONVERGENCE_FAIBLE` · `CONVERGENCE_MODEREE` · `CONVERGENCE_FORTE`) sont typés
mot pour mot sur la seule forme `CONVERGENCE` (`contradictionFinding.ts:57-61`,
`:202`), et l'interdit de `D-041` mord **sur le type** :
`contradictionFinding.guard.test.ts:71-163` refuse à la compilation tout champ
de certitude, de probabilité, de score ou de confiance sous quelque nom que ce
soit, doublé sur l'instance par `contradictionsEngine.test.ts:325-345`.
Bascule prononcée par [[D-095]] au titre de la condition écrite par `D-041`
(« elles ne basculent à acté qu'à ce moment »), levant pour cette règle la
réserve de [[D-043]]. **Portée** : la règle est gardée sur son **interdit**,
pas sur son obligation — aucune règle de forme `CONVERGENCE` n'existe et le
moteur les refuse (`contradictionsEngine.ts:188-192`).*

**DC-30 — Une discordance ne se moyenne ni ne se supprime en silence.** Elle
est détectée par le déterministe et imposée à la restitution. Objet minimal :
sources, description, importance, hypothèses, action suggérée, résolue ou non.
*Acté [[D-043]], [[D-041]], [[D-042]], [[D-048]] — le moteur existe et mord :
`contradictionsEngine.ts` sur la table `CONTRADICTIONS_RULES_V1` signée le
2026-08-15 (`contradictionsV1.ts:206-225`), objet minimal (sources,
description, importance, hypothèses, action, résolution) porté jusqu'au
cockpit, et `contradictionEstOuverte` interdit d'éteindre une discordance
ouverte (`orientationEngine.ts:1085-1090`, `stopRulesV1.ts:170-175`). Quatre
bancs en CI : `contradictionsService.test.ts:257`,
`MissingDataPanel.test.tsx:114-121`, `promptPassationCourante.guard.test.ts:79-85`
(« ne moyenne jamais deux passations »), `stopRulesV1.test.ts:485`. L'affichage
est gaté par `WN_ENABLE_CONTRADICTIONS_NNPP2` ; les bancs mordent
indépendamment du drapeau.*

**DC-31 — Diagnostic, hypothèse fonctionnelle et orientation sont trois objets
distincts.** Diagnostic : réservé aux données médicales établies, hors
périmètre. Hypothèse fonctionnelle : issue d'une convergence de données.
Orientation : la prochaine action utile. Les termes ne s'échangent pas.
*Acté partiellement — l'interdit « diagnostic » de `REGISTRE_FRONTIERES.md`
mord à l'exécution (`comprehensionAppendOnly.guard.test.ts:163-181`,
`objectifNegocie.guard.test.ts:312-330` — racines `cim|icd|dsm|classification|diagnos`
et imports cliniques interdits), et la distinction **est outillée en trois
tables séparées** : explorations (`orientationRulesV1.ts`), hypothèses
(`hypotheses: string[]`, champ obligatoire du constat,
`contradictionFinding.ts:138-143`, rendu au cockpit
`MissingDataPanel.tsx:108-113`), axes de travail (`priorityRulesV1.ts:6-20`).
**Manquent** : toute décision `D-xxx` et un banc de frontière hypothèse /
orientation. **Réserve** : les hypothèses livrées naissent d'une DISCORDANCE,
quand `DC-31` définit l'hypothèse fonctionnelle comme issue d'une
convergence.*

**DC-32 — Le corpus NNPP2 ne produit jamais une conclusion diagnostique
médicale.** Il explique, contextualise, fait émerger des hypothèses, suggère
des explorations, propose des interventions dans le périmètre autorisé.
*Acté — `REGISTRE_FRONTIERES.md` §1 (vocabulaire réglementaire), **tenu à
l'exécution et pas seulement en revue** : deux gardes structurels interdisent
aux modules compréhension et objectif négocié d'importer `@/lib/clinical`,
`@/lib/clinical-engine`, `@/lib/scoring`, `@/lib/instruments`,
`@/lib/equilibre`, ou de porter une racine diagnostique
(`comprehensionAppendOnly.guard.test.ts:163-181`,
`objectifNegocie.guard.test.ts:312-330`, CI) ; le prompt le porte aussi
(`anthropic.ts:334`, `:522`) et les tables le déclarent
(`priorityRulesV1.ts:16-17`). **Portée** : modules nommés, pas le dépôt
entier — une surface neuve n'est attrapée par aucun de ces bancs.*

**DC-33 — La hiérarchisation prime sur l'exhaustivité.** Explorer tout n'est
pas une bonne consultation. La sortie est une priorité 1, 2, 3 — pas une liste
d'anomalies.
*Acté [[D-095]] — la sortie EST une priorité rangée : `PRIORITY_RULES_V1`
signée le 2026-08-16 (`priorityRulesV1.ts:369-372`), classement à trois termes
puis numérotation séquentielle (`chaineC1.ts:382-395`, `:413` « Rang
SÉQUENTIEL, jamais la priorité de la table »), rang épinglé sur la sortie
réelle par `chaineC1.test.ts:164` (`[1, 2]` sur la carte de décision servie) et
rendu au cockpit. **Régularisation** : [[D-048]] `:3366` avait renvoyé la règle
au LOT-04 et [[D-054]] ne l'a jamais reprise — `D-095` prononce l'arbitrage
omis. **Réserves nommées** : deux règles publiées seulement, donc un rang d'au
plus 2 ; et le classement lui-même vit hors du périmètre haché
(`priorityRulesV1.ts:328-333`, « CE QUI RESTE HORS DU SHA »).*

**DC-34 — L'IA explique pourquoi une règle s'applique.** Pour toute suggestion
importante : pourquoi, quelles données patient, quels claims, quelle
incertitude, quelle alternative. Le patient n'a pas à le voir ; le praticien
doit pouvoir l'ouvrir.
*Acté [[D-043]], [[D-048]], [[D-050]] — la justification remonte jusqu'à
l'écran : passations nommées et datées (`contradictionFinding.ts:75-105`, bancs
`MissingDataPanel.test.tsx:61-70` et `contradictionsService.test.ts:187-200`,
écrit pour fermer un trou trouvé en revue — la conversion jetait `sources`),
claims fondateurs et règle rendus (`MissingDataPanel.test.tsx:105-112`), motif
du moteur affiché tel quel et jamais reformulé
(`PropositionBilanPanel.test.tsx:252-255`, `TrajectoirePanel.test.tsx:439-470`).
**Manque, sur les cinq éléments exigés** : « quelle alternative » n'a aucun
champ, ni sur `ContradictionFinding`, ni sur `DecisionPriorityCandidate`.*

**DC-35 — L'IA explique aussi pourquoi elle n'applique pas une règle.**
Intervention pertinente mais non proposée parce que : traitement incompatible,
données insuffisantes, population non couverte, red flag, claim insuffisamment
certifié. Le silence est le mode de défaillance le plus coûteux d'un moteur de
sécurité.
*Acté [[D-043]], [[D-054]], [[D-062]] — le motif de non-application est une
**donnée signée** : `ABSTENTION_PROCEDURE_V1` (`priorityRulesV1.ts:439-471`,
motifs `ABST-SEC-01` / `ABST-CAN-01` / `ABST-NR-01`, `doctrine` jamais vide,
`limitation` servie telle quelle), entrée dans le périmètre haché ;
`chaineC1.ts:225-229` **jette** si un motif est introuvable — fail-closed,
jamais de motif vide. Quatre bancs épinglent le motif jusqu'à l'écran
(`ClinicalRuntimeSection.test.tsx:401-413`,
`PropositionBilanPanel.test.tsx:251-261`, `TrajectoirePanel.test.tsx:439-470`,
`biology-library/statuts.test.ts:269`). **Couverture partielle des cinq
causes** : « traitement incompatible » et « population non couverte » n'ont
aucun motif — portés par le LOT-05 de « Doctrine exécutable » ; `ABST-SEC-01`
reste inatteignable faute de producteur (LOT-04).*

---

## V — Questionnaires et deuxième rideau

**DC-36 — Un questionnaire sert à réduire l'incertitude.** Le choix du suivant
pèse : pertinence clinique × information nouvelle attendue × capacité à
départager les hypothèses × impact sur la prise en charge ÷ charge patient.
Jamais « même thème donc on l'envoie », mais « cela changera-t-il ce que nous
ferons ensuite ? ».
*Proposition — **Orpheline**. Les LOT-01 et LOT-03 de la chaîne T0 la
portaient, les deux sont livrés ; aucune pondération « information nouvelle
attendue ÷ charge patient » n'existe au dépôt (zéro occurrence du
vocabulaire). Seule la moitié négative — ne pas re-proposer — est livrée, et
elle relève de `DC-37`. Aucune des trois preuves, aucun véhicule.*

**DC-37 — Un questionnaire redondant ne s'assigne pas.** Si deux instruments
mesurent pratiquement le même signal, le moteur justifie l'utilité du second
ou s'abstient.
*Proposition — trois formes de redondance mordent déjà, gardées en CI :
**temporelle** (`exclureDejaRepondu` / `cibleDejaCouverte`,
`orientationEngine.ts:910`, sous le verrou `tableArretExploitable()`
`orientationService.ts:154-156`, fail-closed sur passation vide, recueil
partiel et score annulé — bancs `orientationEngine.test.ts:779-880`,
`stopRulesV1.test.ts:388-470`) ; **d'instrument** (absorption pack/membre,
`orientationEngine.ts:1015-1050`, banc `orientationRulesV1.test.ts:1236-1410`) ;
**de règle** (`orientationRulesV1.test.ts:339`). La facette littérale — deux
instruments qui mesurent le même signal — n'a **aucun producteur** : seul
`recoupementJustifie`, facultatif, porté par la seule règle C-STR. [[D-048]]
écrit explicitement que cela ne rend pas `DC-37` opposable.*

---

## VI — Interventions : séquencement, suivi, sécurité

**DC-38 — Une intervention est séquencée.** Elle précise pourquoi maintenant,
son objectif, sa durée, son critère de réponse, son critère d'arrêt, et ce qui
vient ensuite.
*Proposition — le LOT-05 de la chaîne T0 (livré) a posé `ProtocolPhase`
= { `phaseId`, `duree`, `objectifs`, `actionIds`, `mesures`, `prerequis`,
`reviewAt` } (`clinical-engine/types.ts:412-420`) et sa normalisation stricte
(`protocolDraft.ts:158-196` : refus d'un champ inconnu, d'une phase sans
action, d'un `phaseId` dupliqué, d'un `reviewAt` non canonique), avec
`purpose` et `followUpCriterion` obligatoires sur tout draft ; banc
`protocolV4.test.ts:165-229` (CI). **Sur les six composantes** : « pourquoi
maintenant » et « critère d'arrêt » n'ont aucun champ, « ce qui vient ensuite »
se réduit à `reviewAt`, et les phases restent facultatives même en V4
(`protocolDraft.ts:167`). **Orpheline** : le LOT-05 de la chaîne T0 la portait
et il est livré.*

**DC-39 — Une modification à la fois lorsque l'interprétation l'exige.** Le
moteur distingue les interventions compatibles simultanément de celles à
tester séquentiellement. Dix changements simultanés rendent inattribuables
l'amélioration comme l'intolérance.
*Proposition — **Orpheline**. Le véhicule V4 de l'audit (« deux paragraphes
dans deux fiches de lot ») est **périmé** : ses fiches d'accueil, LOT-05 et
LOT-07 de la chaîne T0, sont livrées depuis le 2026-08-18. Rien dans
`web/src/lib` ne distingue les interventions compatibles simultanément de
celles à tester séquentiellement. Dette nommée sans véhicule.*

**DC-40 — Toute intervention a un critère de suivi.** Pas « prendre X », mais
intervention → variable(s) suivie(s) → moment de réévaluation → maintenir,
ajuster ou arrêter.
*Proposition — acquis partiels, livrés par les LOT-05 et LOT-07 de la chaîne
T0 (clos) : `followUpCriterion` obligatoire et non vide sur tout draft
(`protocolDraft.ts:260`), phases V4 reliant `actionIds` → `mesures` →
`reviewAt`, jalons J7/J14/J21 à quatre axes gelés
(`protocol/checkinDomain.ts:57-95`) et point de jonction J21
(`resumeJ21.ts:40-64`) ; bancs `protocolV4.test.ts`, `resumeJ21.test.ts:25-56`,
`checkins.test.ts` (CI). **Manquent** : le lien par intervention (les phases
sont facultatives, `mesures` est un tableau de chaînes libres) et « maintenir /
ajuster / arrêter » comme objet — les six labels du J21 sont un affichage
guidé explicitement non persisté (`J21DecisionPanel.tsx:7-11`). **Orpheline** :
les LOT-05 et LOT-07 de la chaîne T0 la portaient et ils sont livrés.*

**DC-41 — Efficacité et tolérance sont deux axes distincts.** Une intervention
efficace et mal tolérée n'est pas un succès.
*Proposition — **fait manqué par l'audit** : l'axe `tolerance` est l'une des
quatre questions du catalogue gelé de check-in depuis le **2026-07-18**
(`protocol/checkinDomain.ts:68-76`), soit trois semaines avant le constat qui
écrivait « aucun axe de tolérance ». Ce qui manque n'est pas l'axe mais sa
**séparation opposable** de l'efficacité dans une décision d'intervention.
**Orpheline** : véhicule V4 périmé, comme `DC-39`.*

**DC-42 — Un effet indésirable interrompt la logique automatique.** Un nouveau
symptôme temporellement associé à une intervention interdit d'augmenter ou de
poursuivre automatiquement : requalification, puis validation.
*Proposition — **fait manqué par l'audit** : la capture existe depuis le
**2026-07-16** — `TrustAdverseEffectReport` (`schema.prisma:838-866`), route
`POST /api/portail/trust/signalement`, règle versionnée
`orienterEffetIndesirable` (`trust/securite.ts:37-55`, sévérité déclarée,
action prise, produits concomitants). Le constat juste n'est donc pas
« aucune capture » mais **capture complète, aucune interruption**. Porté par le
LOT-05 de « Doctrine exécutable » (second producteur de l'objet de sécurité).*

**DC-43 — Les populations particulières filtrent avant le classement, pas
après.** Grossesse, allaitement, enfant, personne âgée, pathologie rénale ou
hépatique, polymédication, chirurgie digestive, allergie ou intolérance,
végétalisme. Un candidat écarté par une gate ne doit jamais avoir été classé.
*Proposition — aucun filtre d'intervention n'existe : `grossesse` et
`allaitement` n'apparaissent que dans `trust/contenus/registre.ts` (contenus
d'information), et `anamnese.ts:101` porte « Grossesse / post-partum » comme
**facteur déclenchant** — un antécédent, pas un état courant qualifiant une
population. Porté par le LOT-05 de « Doctrine exécutable », sur le modèle
**général déclaré + exclusions déclarées** arrêté par [[D-095]] : la gate
croise les exclusions de l'**intervention** (`neCouvrePas`, 95 entrées, `null`
sur les 95) avec l'état du patient, et une intervention non curée se propose
**en le disant** (`DC-35`).*

**DC-44 — Médicament et complément : contrôle obligatoire.** Toute
supplémentation proposée vérifie, dans la mesure du connu : médicaments,
pathologies, contre-indications, interactions, duplication d'actifs, dose
totale cumulée.
*Acté partiellement — duplication d'actifs et dépassement de seuil,
fail-closed ([[D-056]] arbitrages 2 et 3) : `detecterCumulSubstance` et
`detecterDepassementsSeuils` (`sentinelle.ts:46-77`), câblés en production par
`evaluerSentinelle` (`catalogue.ts:961`) et lus par
`construireTableauCompatibilite` ; bancs `sentinelle.test.ts:95-196`,
`compatibilite.test.ts` (CI). **Ne sont pas tenus, et il faut le dire** : la
dose totale cumulée est refusée **par choix** (« jamais de somme ni de maximum
automatique des doses », `sentinelle.ts:3-5`) ; les médicaments du patient ne
sont collectés qu'en prose (`consultation/contexteClinique.ts:196-201`) et
`ContexteDecision` n'a aucun champ médicament ;
`deciderIntentionAvantBiologie` (`decisionAvantBiologie.ts:149`) **n'a aucun
appelant** alors que `D-056` le décrivait branché. **Décision due** : `DC-44`
ne figure pas parmi les neuf bascules de [[D-043]] et aucune entrée ne
prononce ce « acté partiellement ». **Orpheline** pour ce qui reste dû : le
LOT-05 de la chaîne T0 la portait et il est livré.*

---

## VII — Biologie

**DC-45 — Trois niveaux de mesure, jamais présentés au même degré de
certitude.** `A` mesure standard ou conventionnelle · `B` exploration
fonctionnelle · `C` marqueur expérimental ou débattu.
*Proposition — **Orpheline**. Le LOT-06 de la chaîne T0 la portait et il est
livré : le catalogue est peuplé (47 analytes, 15 panels) et ses surfaces sont
branchées, mais la taxonomie A/B/C de **niveaux de mesure** n'existe nulle
part. **Homonymie à ne pas confondre** : les lettres A/B/C de cette règle
désignent des types de mesure, quand `biology_functional_ranges.niveau_preuve`
porte un `CHECK` A-D de **niveau de preuve** — deux vocabulaires différents.*

**DC-46 — Une valeur de laboratoire ne s'interprète pas isolément.** Unités,
référence du laboratoire, sexe et âge lorsque pertinent, contexte, traitements,
état inflammatoire, jeûne, temporalité.
*Proposition — **sans objet tant que le verrou HDS tient**, et le verrou n'est
plus une intention de conception : aucune valeur de laboratoire n'entre dans
l'application ([[D-059]] §4), tenu par deux contrats exécutés en CI —
`cb_biologie_structure_v1.sql:29-95` (noms de colonnes interdits sur les douze
tables `biology_*`, aucune FK vers patients/assignations/consultations, RLS
deny-all ; `ci.yml:609`) et `cb_arbitrage_biologique_v1_negatif.sql:61-73`
(`ci.yml:653`) ; `isCbResultsEnabled` n'a aucun appelant. Le contexte
d'interprétation préexiste côté documentaire (`unite` `NOT NULL` sur liste
fermée, `population` à `CHECK` fermé, `biology_preanalytics.type_condition`) ;
manquent l'âge en années, les traitements en cours, l'état inflammatoire.
**Exigible dès l'ouverture de `WN_CB_RESULTS_ENABLED` — porteur CB-09**, hors
campagne.*

**DC-47 — Toute « valeur optimale » est identifiée comme telle.** Une
fourchette fonctionnelle ne se présente jamais comme une norme médicale. Chaque
référence déclare son type : `laboratory` · `guideline` · `functional_target` ·
`study` · `expert_consensus`.
*Proposition — **la moitié structurelle est tenue et gardée** :
`biology_reference_ranges` (valeurs laboratoire, source en texte libre, aucun
claim exigé) et `biology_functional_ranges` (`claim_id` + `version_claim`
`NOT NULL`) sont deux référentiels qui ne fusionnent jamais, et une plage
fonctionnelle active sans claim `VALIDE` est refusée en CI
(`cb_biologie_structure_v1.sql:147-154` `ci.yml:609` ;
`cb_biologie_catalogue_v1.sql:93-116` `ci.yml:617` ;
`cb_catalogue_niveau_1_donnees.sql:97-114` `ci.yml:626`). **Manquent** : le
vocabulaire à cinq valeurs (zéro occurrence au dépôt) et **tout
consommateur** — aucune plage fonctionnelle n'est lue par `web/src`, et ni la
proposition de bilan (`statuts.ts:67-88`) ni le courrier médecin
(`courrier.ts:76-107`) ne citent de borne. L'audit affirmait le contraire.
**Orpheline** : le LOT-06 de la chaîne T0 la portait et il est livré.*

---

## VIII — Données longitudinales

**DC-48 — La temporalité fait partie du raisonnement.** Avant, pendant, après —
pour les symptômes, médicaments, compléments, alimentation, sommeil et
événements de vie. Sans temporalité, un moteur fabrique des causalités
artificielles.
*Acté partiellement — [[D-010]], [[D-023]] ; pas de modèle temporel général.
**Orpheline** : le LOT-07 de la chaîne T0 la portait et il est livré — il a
posé les jalons T0/J21/J42/J90, pas le modèle avant/pendant/après. Aucun
modèle temporel sur les médicaments et les compléments (aucun modèle
`Traitement` au schéma).*

**DC-49 — Un agenda est une donnée longitudinale, pas un questionnaire.** Il ne
se réduit pas à un score instantané : tendances, répétitions, variabilité,
associations temporelles, adhésion, évolution.
*Acté — [[D-009]], [[D-010]], [[D-039]].*

**DC-50 — Fréquence et gravité ne se confondent pas.** Un événement fréquent et
modéré ne signifie pas la même chose qu'un événement rare et majeur ; les
claims conservent les deux dimensions quand le corpus les porte.
*Proposition — renvoyée à la campagne `2026-08-10-chaine-alimentaire`. Le
manque réel est **au schéma du claim**, pas dans les agendas :
`rag_corpus_claims` ne porte ni fréquence ni gravité, et aucune `ALTER`
ultérieure ne les ajoute. Un axe de gravité **déclarée** existe hors corpus
(`SeveriteDeclaree`, signalement d'effet indésirable).*

**DC-51 — Qualité de l'assiette et réponse individuelle sont deux niveaux.**
Une assiette conforme aux recommandations générales peut ne pas répondre aux
besoins spécifiques d'un patient.
*Proposition — renvoyée à la campagne `2026-08-10-chaine-alimentaire`.
**Formulation de l'audit à corriger** : « la compatibilité au contexte patient
n'est pas un second niveau » nie une couche qui existe —
`ContextualFoodReading` / `buildContextualFoodReading`
(`food-compass/contextual.ts:52`) depuis le 2026-07-18. Le fond tient
néanmoins : ce niveau n'évalue aucune réponse individuelle.*

**DC-52 — Les recommandations populationnelles restent le socle.** Les
recommandations nationales et internationales servent de référence de base ;
les adaptations NNPP2 s'y ajoutent, elles ne la remplacent pas.
*Proposition — **écrite, non armée** : aucun socle de recommandation nationale
n'est référencé comme tel au dépôt. Déclencheur : l'entrée d'un premier socle.
État légitime, pas une dette (vérifié le 2026-08-23).*

**DC-53 — Toute divergence par rapport au socle est justifiée.**
Recommandation générale → adaptation patient → raison → claim source.
*Proposition — **écrite, non armée**, corollaire de `DC-52`. Même déclencheur.
État légitime, pas une dette (vérifié le 2026-08-23).*

---

## IX — Conflits de sources, gouvernance, vérification

**DC-54 — Une contradiction entre sources suit une politique de résolution.**
Identifier la contradiction · ne pas fusionner arbitrairement · comparer niveau
de preuve, contexte, date, population · produire la position la plus prudente.
*Proposition — porté par le **LOT-06 de « Doctrine exécutable »**. La forme
`CONFLIT_SOURCES` existe dans le type ([[D-041]], [[D-044]]) et n'a **aucun
producteur** ; la politique de résolution n'est écrite nulle part. Limite
structurelle à déclarer par le lot : trois des quatre axes de comparaison sont
mécanisables (`niveau_preuve`, `classe_autorite`, `valide_at`) — **la
population ne l'est pas**, elle n'est pas portée par le claim ([[D-095]]).*

**DC-55 — Un conflit non résolu à impact clinique significatif s'escalade vers
le praticien.** L'arbitrage humain est une issue de la politique, pas son
échec.
*Proposition — **l'issue est typée et sa sémantique est tenue** :
`ResolutionContradiction = ouverte | escaladee_praticien | resolue`
(`contradictionFinding.ts:117-120`) et le prédicat unique
`contradictionEstOuverte` ([[D-055]]) font qu'un constat escaladé **reste
ouvert** et continue d'interdire l'extinction — gardé par
`orientationEngine.test.ts:717` (boucle sur `['ouverte','escaladee_praticien']`)
et `contradictionsService.test.ts:584-594` (CI). **Manque le déclencheur** :
`contradictionsEngine.ts:227` pose `resolution: {statut:'ouverte'}` en dur,
`escaladee_praticien` n'a aucun producteur en code de production. Porté par le
LOT-06 de « Doctrine exécutable ».*

**DC-56 — Toute fonctionnalité clinique annonce les claims qu'elle consomme.**
Par module : claims consommés, claims ignorés volontairement, niveau
d'utilisation, date de validation, tests.
*Acté à la maille « source de savoir » — `docs/claude/MATRICE_CONSOMMATION.md`,
générée depuis le code (`scripts/wn-matrice-consommation.mjs` : racine et
surface dérivées des imports ; **21 sources dont 6 dormantes**, et non 19),
gardée par un banc nommé en CI (`ci.yml:298-299`,
`node --test scripts/wn-matrice-consommation.test.mjs`), avec garde de
fraîcheur du Markdown livré (`:638`) et `--strict` rendant 2 sur une dormante
non arbitrée (`:651`). **Décision due** : aucune entrée du registre ne
prononce cet acte, `DC-56` ne figure pas parmi les neuf bascules de [[D-043]].
**Pas à la maille du claim** : les colonnes livrées ne portent aucun des cinq
items exigés — claims consommés, claims ignorés volontairement, niveau
d'utilisation, date de validation, tests.*

**DC-57 — Les tests testent la doctrine, pas seulement le code.** Pour chaque
règle importante : cas positif, cas négatif, cas limite, donnée absente,
contre-indication, discordance. Le test porte l'identifiant du claim.
*Proposition — l'épinglage du claim **existe pour les tables signées** :
`claimsEpinglesFraicheur.guard.test.ts` découvre automatiquement les tables
signées de `web/src/lib/clinical/`, en dérive les paires (`claim_id`,
`version_claim`) au motif `WN-CL-\d{4}-\d{3}` et exige qu'elles figurent à
l'identique dans `rag_claim_fraicheur_tables_signees_v1.sql` et son négatif
(`ci.yml:584`, positif au préflight `release-db-scalingo.sh:65`) — **40
identifiants distincts** ; une vingtaine de fichiers de test citent un
`WN-CL-…`. **Ce qui manque est le cœur de la règle** : aucun outil du dépôt ne
lit `CONSTITUTION_CLINIQUE.md`, aucun test n'est rattaché à une règle `DC-nn`
(10 des 63 `*.guard.test.ts` en citent une), et les six cas exigés — positif,
négatif, limite, donnée absente, contre-indication, discordance — ne sont
réclamés nulle part.*

**DC-58 — Un test n'est jamais la source de vérité clinique.** Une valeur qui
n'existe que dans un test n'est pas une justification. Le test dérive de la
règle ; jamais l'inverse.
*Proposition — porté par le **LOT-03 de « Doctrine exécutable »** (banc de
doctrine). Aucun outil ne détecte aujourd'hui une valeur cliniquement
signifiante qui n'existerait que dans un test.*

---

## Ce que cette constitution ne dit pas

Elle est la **grille**, pas son application. Tant que l'ensemble des claims
certifiés du corpus n'a pas été passé mécaniquement dans cette grille, on ne
peut pas parler de dérivation exhaustive des notebooks NNPP2. Cette descente
produit une table par claim (notebook, domaine, catégorie DC-07, règle dérivée,
niveau d'exécution, validation praticien, red flag, consommateurs WellNeuro)
et reste à faire.

État de l'application au code existant : `AUDIT_DOCTRINE_CHAINE_T0.md`.
