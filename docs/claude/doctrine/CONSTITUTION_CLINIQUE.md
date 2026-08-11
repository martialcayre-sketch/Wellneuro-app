# Constitution clinique d'exécution

> **Ce document n'est pas encore opposable dans son entier.** Chaque règle
> porte son statut : **acté** (elle reprend une décision ou un invariant déjà
> opposable, dont la référence est donnée) ou **proposition** (elle attend une
> entrée `docs/DECISIONS.md`). Une règle « proposition » informe une revue,
> elle ne la tranche pas.
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
*Proposition.*

**DC-04 — Pas de claim sans citation exploitable.** Source, chunk ou section,
notebook, version. Un claim qui cite un verbatim absent est refusé à
l'ingestion, pas dégradé.
*Acté — barrière d'ingestion `rag_corpus_claims` (`CHUNK_INTROUVABLE`).*

**DC-05 — Un claim de synthèse ne masque pas ses claims parents.** Si `C` naît
de `A + B + D`, le système conserve et restitue `A`, `B`, `D`. Sans quoi naît
une doctrine dérivée dont plus personne ne connaît l'origine.
*Proposition.*

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
*Proposition.*

**DC-08 — Un claim descriptif peut s'exécuter automatiquement** s'il est
parfaitement certifié (correspondance score ↔ catégorie d'un questionnaire,
par exemple).
*Proposition.*

**DC-09 — Un claim associatif ne devient jamais une preuve.** « X peut être
associé à Y » ne se restitue jamais en « X prouve Y », ni en « X explique Y ».
*Proposition — garde-fou le plus exposé de la chaîne.*

**DC-10 — Un claim d'orientation produit une orientation suggérée, jamais un
diagnostic.** « En présence de X + Y, explorer éventuellement Z » alimente le
deuxième rideau ; il ne conclut rien.
*Acté — [[D-003]], [[D-007]].*

**DC-11 — Un claim d'intervention porte ses métadonnées ou n'est pas
exécutable :** indication, conditions d'entrée, dose éventuelle, durée,
population, contre-indications, interactions, niveau de preuve, source, rôle du
praticien.
*Proposition.*

**DC-12 — Un claim de sécurité prime sur tous les autres et peut inhiber une
proposition** issue de plusieurs claims favorables. Red flag médical,
contre-indication, interaction, grossesse, pathologie, médicament, symptôme
appelant une orientation médicale.
*Acté [[D-043]] — opposable en revue et pour tout agent. **Banc dû** : la règle ne mord pas encore à l'exécution.*

**DC-13 — Chaque claim porte son niveau d'exécution.** `AUTO` ·
`AUTO_WITH_EXPLANATION` · `SUGGEST_ONLY` · `PRACTITIONER_REQUIRED` ·
`PROHIBITED_AUTOMATION`. En l'absence de niveau explicite, le plus restrictif
s'applique.
*Proposition — aujourd'hui l'axe est binaire (`prescriptif`, `statut`).*

**DC-14 — Aucune extrapolation hors de la population du claim.** Un claim
établi chez l'adulte ne vaut pas chez l'enfant, la femme enceinte, la personne
âgée, l'insuffisant rénal ou hépatique. L'absence de population déclarée se
lit comme une restriction, jamais comme une généralité.
*Acté [[D-043]] — opposable en revue et pour tout agent. **Banc dû** : la règle ne mord pas encore à l'exécution.*

**DC-15 — Un claim a une date et une politique d'obsolescence.**
`validatedAt`, `reviewDueAt`, `sourceDate`, `supersededBy`, et un statut parmi
`VALIDATED` · `REVIEW_REQUIRED` · `OBSOLETE` · `CONFLICTED`. Un claim clinique
n'est pas éternel.
*Proposition — `superseded_at`, `valide_at` et `version_claim` existent ;
l'échéance de revue et les statuts `REVIEW_REQUIRED` / `CONFLICTED`, non.*

**DC-16 — Un claim généré automatiquement reste non certifié.** Extraction LLM
⇒ `draft`. Certification ⇒ acte humain distinct. Jamais le même statut, jamais
le même chemin.
*Acté — [[D-003]], [[D-004]], [[D-012]] ; `EN_ATTENTE_VALIDATION` vs `VALIDE`.*

**DC-17 — Un agent de développement ne modifie pas implicitement un claim
certifié.** Toucher au texte, à un seuil, à un poids, à une relation, à une
intervention ou à une contre-indication est une **modification clinique** —
même si techniquement ce n'est qu'une ligne de JSON ou de TypeScript.
*Acté [[D-043]] — opposable en revue et pour tout agent ; la règle existe côté humain ; aucun garde-fou ne la tient. **Banc dû** : la règle ne mord pas encore à l'exécution.*

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
*Acté [[D-043]] — opposable en revue et pour tout agent. **Banc dû** : la règle ne mord pas encore à l'exécution.*

**DC-21 — Aucune pondération clinique tacite.** Un poids égal entre axes n'est
pas neutre : c'est déjà une décision de modèle. Toute pondération est
explicitement décidée et motivée sur place.
*Acté en pratique — `web/src/lib/equilibre/constants.ts` motive ses groupes et
ses poids ; la règle générale, elle, n'était pas écrite.*

**DC-22 — Pas de score global si les dimensions n'ont pas de sens commun.** La
question précède le calcul : existe-t-il une interprétation clinique du total ?
Sinon, afficher les axes et les signaux, ne pas produire de total.
*Proposition.*

**DC-23 — Les red flags sont orthogonaux au score.** Un red flag n'ajoute ni ne
retire de points. Un score global favorable et un red flag majeur coexistent
sans se compenser, et le red flag reste prioritaire.
*Acté [[D-043]] — opposable en revue et pour tout agent. **Banc dû** : la règle ne mord pas encore à l'exécution.*

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
*Acté [[D-043]] — opposable en revue et pour tout agent ; le prompt de synthèse interdit le diagnostic ferme, pas la causalité.
**Banc dû** : la règle ne mord pas encore à l'exécution.*

**DC-28 — Un questionnaire isolé ne suffit jamais à conclure.** Une conclusion
clinique distingue quatre situations : signal isolé · convergence ·
discordance · absence de données.
*Acté côté règles ([[D-014]], [[D-016]]) — pas côté synthèse.*

**DC-29 — La convergence augmente la priorité, pas la certitude.** Quatre
niveaux : `SIGNAL` · `CONVERGENCE_FAIBLE` · `CONVERGENCE_MODEREE` ·
`CONVERGENCE_FORTE`. Chaque convergence nomme les sources indépendantes qui la
soutiennent. On n'écrit pas « le patient a manifestement un déficit
dopaminergique » mais « plusieurs éléments convergent vers une perturbation
fonctionnelle de cet axe, sans valeur diagnostique en soi ».
*Proposition.*

**DC-30 — Une discordance ne se moyenne ni ne se supprime en silence.** Elle
est détectée par le déterministe et imposée à la restitution. Objet minimal :
sources, description, importance, hypothèses, action suggérée, résolue ou non.
*Acté [[D-043]] — opposable en revue et pour tout agent ; portée par le LOT-01 de la campagne chaîne T0. **Banc dû** : la règle ne mord pas encore à l'exécution.*

**DC-31 — Diagnostic, hypothèse fonctionnelle et orientation sont trois objets
distincts.** Diagnostic : réservé aux données médicales établies, hors
périmètre. Hypothèse fonctionnelle : issue d'une convergence de données.
Orientation : la prochaine action utile. Les termes ne s'échangent pas.
*Acté partiellement — `REGISTRE_FRONTIERES.md` interdit « diagnostic » ; la
distinction hypothèse / orientation n'est pas outillée.*

**DC-32 — Le corpus NNPP2 ne produit jamais une conclusion diagnostique
médicale.** Il explique, contextualise, fait émerger des hypothèses, suggère
des explorations, propose des interventions dans le périmètre autorisé.
*Acté — `REGISTRE_FRONTIERES.md` §1 (vocabulaire réglementaire).*

**DC-33 — La hiérarchisation prime sur l'exhaustivité.** Explorer tout n'est
pas une bonne consultation. La sortie est une priorité 1, 2, 3 — pas une liste
d'anomalies.
*Proposition.*

**DC-34 — L'IA explique pourquoi une règle s'applique.** Pour toute suggestion
importante : pourquoi, quelles données patient, quels claims, quelle
incertitude, quelle alternative. Le patient n'a pas à le voir ; le praticien
doit pouvoir l'ouvrir.
*Acté [[D-043]] — opposable en revue et pour tout agent. **Banc dû** : la règle ne mord pas encore à l'exécution.*

**DC-35 — L'IA explique aussi pourquoi elle n'applique pas une règle.**
Intervention pertinente mais non proposée parce que : traitement incompatible,
données insuffisantes, population non couverte, red flag, claim insuffisamment
certifié. Le silence est le mode de défaillance le plus coûteux d'un moteur de
sécurité.
*Acté [[D-043]] — opposable en revue et pour tout agent. **Banc dû** : la règle ne mord pas encore à l'exécution.*

---

## V — Questionnaires et deuxième rideau

**DC-36 — Un questionnaire sert à réduire l'incertitude.** Le choix du suivant
pèse : pertinence clinique × information nouvelle attendue × capacité à
départager les hypothèses × impact sur la prise en charge ÷ charge patient.
Jamais « même thème donc on l'envoie », mais « cela changera-t-il ce que nous
ferons ensuite ? ».
*Proposition — porté par les LOT-01 et LOT-03 de la campagne chaîne T0.*

**DC-37 — Un questionnaire redondant ne s'assigne pas.** Si deux instruments
mesurent pratiquement le même signal, le moteur justifie l'utilité du second
ou s'abstient.
*Proposition.*

---

## VI — Interventions : séquencement, suivi, sécurité

**DC-38 — Une intervention est séquencée.** Elle précise pourquoi maintenant,
son objectif, sa durée, son critère de réponse, son critère d'arrêt, et ce qui
vient ensuite.
*Proposition — porté par le LOT-05.*

**DC-39 — Une modification à la fois lorsque l'interprétation l'exige.** Le
moteur distingue les interventions compatibles simultanément de celles à
tester séquentiellement. Dix changements simultanés rendent inattribuables
l'amélioration comme l'intolérance.
*Proposition.*

**DC-40 — Toute intervention a un critère de suivi.** Pas « prendre X », mais
intervention → variable(s) suivie(s) → moment de réévaluation → maintenir,
ajuster ou arrêter.
*Proposition — porté par les LOT-05 et LOT-07.*

**DC-41 — Efficacité et tolérance sont deux axes distincts.** Une intervention
efficace et mal tolérée n'est pas un succès.
*Proposition.*

**DC-42 — Un effet indésirable interrompt la logique automatique.** Un nouveau
symptôme temporellement associé à une intervention interdit d'augmenter ou de
poursuivre automatiquement : requalification, puis validation.
*Proposition.*

**DC-43 — Les populations particulières filtrent avant le classement, pas
après.** Grossesse, allaitement, enfant, personne âgée, pathologie rénale ou
hépatique, polymédication, chirurgie digestive, allergie ou intolérance,
végétalisme. Un candidat écarté par une gate ne doit jamais avoir été classé.
*Proposition.*

**DC-44 — Médicament et complément : contrôle obligatoire.** Toute
supplémentation proposée vérifie, dans la mesure du connu : médicaments,
pathologies, contre-indications, interactions, duplication d'actifs, dose
totale cumulée.
*Acté partiellement — cumuls et compatibilités du catalogue C4 ; le
croisement avec les médicaments du patient ne l'est pas.*

---

## VII — Biologie

**DC-45 — Trois niveaux de mesure, jamais présentés au même degré de
certitude.** `A` mesure standard ou conventionnelle · `B` exploration
fonctionnelle · `C` marqueur expérimental ou débattu.
*Proposition — porté par le LOT-06.*

**DC-46 — Une valeur de laboratoire ne s'interprète pas isolément.** Unités,
référence du laboratoire, sexe et âge lorsque pertinent, contexte, traitements,
état inflammatoire, jeûne, temporalité.
*Proposition.*

**DC-47 — Toute « valeur optimale » est identifiée comme telle.** Une
fourchette fonctionnelle ne se présente jamais comme une norme médicale. Chaque
référence déclare son type : `laboratory` · `guideline` · `functional_target` ·
`study` · `expert_consensus`.
*Proposition.*

---

## VIII — Données longitudinales

**DC-48 — La temporalité fait partie du raisonnement.** Avant, pendant, après —
pour les symptômes, médicaments, compléments, alimentation, sommeil et
événements de vie. Sans temporalité, un moteur fabrique des causalités
artificielles.
*Acté partiellement — [[D-010]], [[D-023]] ; pas de modèle temporel général.*

**DC-49 — Un agenda est une donnée longitudinale, pas un questionnaire.** Il ne
se réduit pas à un score instantané : tendances, répétitions, variabilité,
associations temporelles, adhésion, évolution.
*Acté — [[D-009]], [[D-010]], [[D-039]].*

**DC-50 — Fréquence et gravité ne se confondent pas.** Un événement fréquent et
modéré ne signifie pas la même chose qu'un événement rare et majeur ; les
claims conservent les deux dimensions quand le corpus les porte.
*Proposition.*

**DC-51 — Qualité de l'assiette et réponse individuelle sont deux niveaux.**
Une assiette conforme aux recommandations générales peut ne pas répondre aux
besoins spécifiques d'un patient.
*Proposition.*

**DC-52 — Les recommandations populationnelles restent le socle.** Les
recommandations nationales et internationales servent de référence de base ;
les adaptations NNPP2 s'y ajoutent, elles ne la remplacent pas.
*Proposition.*

**DC-53 — Toute divergence par rapport au socle est justifiée.**
Recommandation générale → adaptation patient → raison → claim source.
*Proposition.*

---

## IX — Conflits de sources, gouvernance, vérification

**DC-54 — Une contradiction entre sources suit une politique de résolution.**
Identifier la contradiction · ne pas fusionner arbitrairement · comparer niveau
de preuve, contexte, date, population · produire la position la plus prudente.
*Proposition.*

**DC-55 — Un conflit non résolu à impact clinique significatif s'escalade vers
le praticien.** L'arbitrage humain est une issue de la politique, pas son
échec.
*Proposition.*

**DC-56 — Toute fonctionnalité clinique annonce les claims qu'elle consomme.**
Par module : claims consommés, claims ignorés volontairement, niveau
d'utilisation, date de validation, tests.
*Acté à la maille « source de savoir » — `docs/claude/MATRICE_CONSOMMATION.md`,
générée depuis le code. Pas à la maille du claim.*

**DC-57 — Les tests testent la doctrine, pas seulement le code.** Pour chaque
règle importante : cas positif, cas négatif, cas limite, donnée absente,
contre-indication, discordance. Le test porte l'identifiant du claim.
*Proposition — la discipline des bancs `*.guard.test.ts` existe, l'épinglage
du claim non.*

**DC-58 — Un test n'est jamais la source de vérité clinique.** Une valeur qui
n'existe que dans un test n'est pas une justification. Le test dérive de la
règle ; jamais l'inverse.
*Proposition.*

---

## Ce que cette constitution ne dit pas

Elle est la **grille**, pas son application. Tant que l'ensemble des claims
certifiés du corpus n'a pas été passé mécaniquement dans cette grille, on ne
peut pas parler de dérivation exhaustive des notebooks NNPP2. Cette descente
produit une table par claim (notebook, domaine, catégorie DC-07, règle dérivée,
niveau d'exécution, validation praticien, red flag, consommateurs WellNeuro)
et reste à faire.

État de l'application au code existant : `AUDIT_DOCTRINE_CHAINE_T0.md`.
