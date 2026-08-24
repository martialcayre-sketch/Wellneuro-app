# Audit — la doctrine clinique face à la chaîne réellement codée

> **AMENDÉ LE 2026-08-23** ([[D-095]], LOT-01 de la campagne « Doctrine
> exécutable »). Le constat d'origine est conservé intégralement ci-dessous :
> il reste la photographie du 2026-08-11 et se lit comme telle. Ce qu'il dit
> de faux au 2026-08-23 est recensé, ligne par ligne, dans la section
> **« Amendement du 2026-08-23 »** placée avant « Ce que l'audit ne dit pas ».
> Trois choses ont bougé sous cet audit : la campagne chaîne T0 est **close**
> (10/10 lots, 2026-08-18), ce qui périme tous ses porteurs ; le Socle a
> refermé §D ; et le LOT-01 de la chaîne T0 a livré un objet de contradiction
> que l'audit ne pouvait pas connaître. **Onze règles se sont révélées
> orphelines** au LOT-01 ; **dix le restent** depuis que [[D-096]] a donné un
> lot à `DC-09` — orphelines au sens strict : leur lot porteur est livré sans
> les avoir refermées. La répartition à
> quatre colonnes ci-dessous n'a **pas** été recomputée : voir §D de
> l'amendement, qui dit pourquoi et ce qui la remplace.
>
> Constat daté du **2026-08-11**, établi contre le dépôt à `13cdc259`
> (LOT-00 de la campagne chaîne T0 mergé). Chaque ligne est vérifiée dans le
> code, pas dans la documentation qui le décrit.
>
> Périmètre confronté : la chaîne T0 (`docs/claude/campagnes/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/`,
> LOT-00 à LOT-07), les moteurs `web/src/lib/clinical/`, `scoring/`,
> `equilibre/`, la couche claims `web/src/lib/rag/claims/` et
> `tools/corpus/`, le prompt de synthèse `web/src/lib/anthropic.ts`.

---

## Ce que l'audit trouve

**La chaîne est solide en amont et molle en aval.** Tout ce qui va de la source
au claim certifié est verrouillé — épinglage du verbatim par SHA, refus
d'ingestion d'un claim citant un chunk absent, barrière `D-003` éprouvée par un
contrat SQL sur la seule voie de restitution, statut de validation humaine
distinct du statut d'extraction. C'est la partie la plus difficile de la
doctrine, et elle est faite.

Tout ce qui va du claim à la phrase servie au praticien l'est beaucoup moins.
Le prompt de synthèse `synthese-v19` interdit le diagnostic ferme mais **pas la
causalité** ; il n'existe aucune taxonomie facteur de risque / symptôme /
dépistage ; aucun objet ne porte la convergence ni la discordance ; et la
validation de sortie **coerce au lieu de rejeter**. Les quatre règles les plus
exposées de la constitution — DC-09, DC-27, DC-29, DC-30 — n'ont aujourd'hui
aucun ancrage exécutable.

**Trois écarts ne sont couverts par aucun lot de la campagne** et ne se
refermeront donc pas tout seuls : le schéma de claim (§A), le typage de
l'objet de sécurité (§B), les gates de population (§C). Ils sont détaillés
après le tableau.

Sur ces trois, §B est le plus mal nommé par la doctrine d'origine : elle
suppose l'objet absent alors qu'il tourne en production sous un autre nom. Ce
qui manque n'est pas la détection, c'est le type et le pouvoir d'inhibition.

**Un écart est du ressort de l'outillage de session**, pas du produit : le hook
d'écriture ne demande rien sur les fichiers cliniques (§D).

**Et un écart n'est visible que parce qu'un commentaire de code affirme le
contraire** : `orientationRulesV1.ts` déclare être régénéré par
`tools/corpus/orientation/`, répertoire qui n'a jamais existé dans
l'historique Git (§E). C'est le seul endroit où le dépôt se décrit autrement
qu'il n'est — et c'est le patron que le LOT-01 s'apprête à copier.

### Répartition

| Statut | Nombre | Lecture |
|---|---:|---|
| **acquis** — règle tenue et gardée par un banc ou un contrat | 11 | Le socle de provenance et de données manquantes. |
| **partiel** — règle tenue sur un chemin, absente sur un autre | 18 | Presque toujours : tenue côté déterministe, absente côté restitution. |
| **porté** — absent aujourd'hui, inscrit à un lot de la campagne | 13 | Se refermera si les lots vont au bout. |
| **absent** — aucun ancrage, aucun lot | 16 | Dont les écarts structurels §A et §C. Voir « Refermer les 18 ». |

**Pourquoi 13 et 16 alors que la section de fermeture parle de dix-huit.** Le
constat d'origine comptait 11 portés et 18 sans ancrage. Deux corrections l'ont
déplacé, dans ce même commit :

- six lignes portaient le statut `absent` tout en nommant un porteur — ce qui
  est la définition de `porté` donnée ci-dessus. Elles sont requalifiées
  (`DC-03`, `DC-09`, `DC-27`, `DC-30`, `DC-33`, `DC-36`) ; les totaux d'origine
  étaient donc les bons et c'était la colonne qui était fausse ;
- puis le **véhicule V4 a été appliqué** : `DC-39` est inscrite au LOT-05 et
  `DC-41` au LOT-07, ce qui les fait sortir des « sans ancrage » — les deux
  premières des dix-huit à se refermer.

La section « Refermer les 18 » garde son titre : elle décrit les dix-huit
telles qu'elles étaient au constat, dont deux sont désormais inscrites.

Aucune règle n'est **contredite** par le code : le dépôt ne fait nulle part
l'inverse de la doctrine. L'écart est un manque, pas une divergence — c'est la
bonne nouvelle de cet audit.

---

## Tableau — 58 règles contre le dépôt

### I — Provenance

| Règle | État réel | Statut | Porteur |
|---|---|---|---|
| DC-01 chaîne de provenance | Complète pour l'orientation (règles épinglant `claimId + version`), absente pour la synthèse rédigée. La table d'orientation **est signée** (`orientationRulesV1.ts:1401` — `validationExterne: true`, `dateValidation: '2026-08-06'`, 23 claims) ; ce qui tient la route fermée est le drapeau `WN_ENABLE_ORIENTATION_NNPP2`, mécanisme distinct de la signature ([[D-018]], `docs/FEATURE_FLAGS.md:54`). Attention : l'en-tête du fichier porte encore des paragraphes antérieurs annonçant `false` (lignes 20, 29) — la valeur de la table fait foi. | partiel | — |
| DC-02 le LLM n'invente pas de règle | `D-003`, `D-012` ; contrat SQL `rag_claim_barriere_d003_v1.sql`. | acquis | — |
| DC-03 justification non générative | La synthèse rédige aujourd'hui sa propre justification. | porté | LOT-01 (partiellement) |
| DC-04 pas de claim sans citation | Refus d'ingestion `CHUNK_INTROUVABLE`, SHA du chunk épinglé (`rag/claims/store.ts:130-146`). | acquis | — |
| DC-05 claim de synthèse conserve ses parents | Aucun claim dérivé aujourd'hui — la règle n'a pas encore de sujet. À poser avant le premier. | absent | — |
| DC-06 hiérarchie des sources | `classe_autorite` et `niveau_preuve` existent par claim ; aucun ordre de résolution nulle part. | partiel | — |

### II — Claims

| Règle | État réel | Statut | Porteur |
|---|---|---|---|
| DC-07 taxonomie A-E | Le claim porte `typologie_lecture`, `classe_autorite`, `prescriptif` — un autre axe. Voir **§A**. | absent | — |
| DC-08 descriptif auto-exécutable | Sans DC-07, pas de critère. | absent | — |
| DC-09 associatif ≠ preuve | **Aucun garde-fou.** Ni dans le prompt v19, ni dans la validation de sortie. | porté | LOT-01 |
| DC-10 orientation ≠ diagnostic | `D-003`, `D-007` ; rien n'est jamais auto-assigné. | acquis | — |
| DC-11 métadonnées d'intervention | Registre d'interventions NNPP2 existant ; population, interactions et contre-indications n'y sont pas structurées. | partiel | LOT-05 |
| DC-12 le claim de sécurité prime | Un objet de sécurité existe **sans être nommé comme tel** : `signaux_alerte` (12 items dont idées suicidaires, sang dans les selles, perte de poids involontaire) et `extraireVigilanceDeterministe`. Il remonte du texte au praticien ; il n'inhibe rien. Voir **§B**. | partiel | — |
| DC-13 niveau d'exécution | Axe binaire (`prescriptif`, `statut`) + `D-003` (validation individuelle). Les cinq niveaux, non. Voir **§A**. | partiel | — |
| DC-14 pas d'extrapolation hors population | Aucun champ de population sur le claim. Voir **§A** et **§C**. | absent | — |
| DC-15 date et obsolescence | `valide_at`, `validateur`, `version_claim`, `superseded_at` existent. `reviewDueAt`, `REVIEW_REQUIRED`, `CONFLICTED` : absents. Un corpus vieillit en silence. | partiel | — |
| DC-16 généré ⇒ non certifié | `EN_ATTENTE_VALIDATION` / `VALIDE`, deux chemins distincts, barrière testée. | acquis | — |
| DC-17 pas de modification implicite | Discipline humaine tenue (40 décisions, registre append-only) ; **aucun garde-fou mécanique**. Voir **§D**. | partiel | — |
| DC-18 toute modification clinique ⇒ D-xxx | Invariant `REGISTRE_FRONTIERES.md` §1 ; `docs/DECISIONS.md`. | acquis | — |

### III — Scoring, seuils, pondérations

| Règle | État réel | Statut | Porteur |
|---|---|---|---|
| DC-19 aucun seuil inventé | `.claude/rules/clinique-scoring.md`, `D-013`. Tenu sur les instruments (bandes publiées) et sur l'orientation (claims épinglés, seuils motivés sur place). Le point sensible du LOT-01 est d'abord un **choix de bande** (le trou à 9, tranché par [[D-042]]) ; la descente y a aussi trouvé **un** seuil réellement sans provenance, le `plainte sommeil ≤ 2` de C-SOM, qui coupe à l'intérieur d'une bande — règle retirée de la V1, arbitrage reporté avec elle. Voir le dossier de règles candidates. | acquis | — |
| DC-20 seuil clinique ≠ technique | Aucun `thresholdKind` nulle part. Les seuils de qualité de recueil et les cut-offs cliniques ont le même statut dans le code. | absent | **amendé 2026-08-25** ([[D-109]]) : nature déclarée EN PROSE par le banc de `DC-19`, jamais portée par la donnée — reste **absent** au sens de la règle, chez **Curation signée** |
| DC-21 pondération explicite | `equilibre/constants.ts` motive ses groupes et ses poids sur place, y compris le refus des poids plats. La règle générale n'était pas écrite ; la pratique la précédait. | acquis | — |
| DC-22 pas de score global sans sens | « Mon équilibre » agrège douze besoins en groupes pondérés. La question « le total a-t-il une interprétation clinique ? » n'a jamais été posée dans le registre de décisions. | absent | **ACTÉ 2026-08-24** ([[D-106]], [[D-108]]) — question posée, réponse NON ; total identifié et non retiré, banc `natureIndiceGlobal.guard.test.ts` |
| DC-23 red flags orthogonaux | Aucun objet red flag. Le patron existe pourtant en esprit — `D-021` (une sévérité acquise sert de **plancher**, jamais de mesure) et `D-024` (plancher d'orientation) refusent déjà qu'une sévérité se fasse moyenner. Voir **§B**. | absent | **ACTÉ 2026-08-24** ([[D-099]]) — énoncé arithmétique prouvé, banc `safetyFindings.guard.test.ts` |
| DC-24 absence ≠ zéro | `.claude/rules/clinique-scoring.md`, `D-009`, `D-014`, `D-016` ; `scoring/validite.ts`, `passationsNonInterpretables.ts` ; LOT-00 mergé. **La règle la mieux tenue du dépôt.** | acquis | — |
| DC-25 couverture visible | `MissingDataPanel`, registre des passations non interprétables, `D-009`. | acquis | — |
| DC-26 registre → compilation → runtime | La table épingle bien ses claims (`claimId` + `versionClaim` immuables) — mais **le compilateur n'existe pas**. Voir **§E**. | partiel | — |

### IV — Interprétation

| Règle | État réel | Statut | Porteur |
|---|---|---|---|
| DC-27 association ≠ causalité | `anthropic.ts:216-217, 367-368` interdit le diagnostic ferme et impose « hypothèse » ; **rien n'interdit la causalité**. | porté | LOT-01 |
| DC-28 pas de conclusion sur un instrument isolé | `D-014`, `D-016` le tiennent côté règles (mesure complète, forme servie). Côté synthèse, aucune contrainte de convergence. | partiel | — |
| DC-29 quatre niveaux de convergence | Aucun objet, aucun vocabulaire. | absent | — |
| DC-30 discordance conservée | Aucun moteur de contradictions (`web/src/lib/clinical/` ne porte que la chaîne orientation). | porté | LOT-01 |
| DC-31 diagnostic / hypothèse / orientation | « Diagnostic » lexicalement interdit ; l'orientation est un objet ; **l'hypothèse fonctionnelle n'en est pas un** — elle vit dans la prose du modèle. | partiel | — |
| DC-32 pas de diagnostic depuis NNPP2 | `REGISTRE_FRONTIERES.md` §1, vocabulaire réglementaire. | acquis | — |
| DC-33 hiérarchisation > exhaustivité | Le cockpit affiche ; il ne classe pas en priorité 1/2/3. | porté | LOT-04 |
| DC-34 expliquer pourquoi une règle s'applique | Les règles d'orientation portent leurs claims justificatifs ; ils ne remontent pas jusqu'à l'écran. | partiel | LOT-04 |
| DC-35 expliquer pourquoi une règle **ne** s'applique **pas** | Le motif d'extinction est inscrit au LOT-03 ; le motif de non-proposition (traitement incompatible, population non couverte, claim insuffisant) ne l'est nulle part. | partiel | LOT-03 |

### V — Questionnaires

| Règle | État réel | Statut | Porteur |
|---|---|---|---|
| DC-36 réduire l'incertitude | La table d'orientation propose sur déclencheurs ; aucune pondération par information attendue ni par charge patient. | porté | LOT-01, LOT-03 |
| DC-37 pas de redondance | Le LOT-03 inscrit « instruments déjà renseignés non re-proposés » — c'est la redondance temporelle, pas la redondance de signal entre deux instruments distincts. | partiel | LOT-03 |

### VI — Interventions

| Règle | État réel | Statut | Porteur |
|---|---|---|---|
| DC-38 intervention séquencée | Phases inscrites au LOT-05 (« pourquoi maintenant », critère d'arrêt : à confirmer dans la spec du lot). | porté | LOT-05 |
| DC-39 une modification à la fois | Aucune notion de compatibilité simultanée vs séquentielle. | porté | LOT-05 (véhicule V4, inscrit) |
| DC-40 critère de suivi | Momentum et jalons J21/J42/J90 inscrits au LOT-07 ; le lien intervention → variable suivie → réévaluation n'est pas encore un objet. | porté | LOT-05, LOT-07 |
| DC-41 efficacité ≠ tolérance | Aucun axe de tolérance. | porté | LOT-07 (véhicule V4, inscrit) |
| DC-42 effet indésirable interrompt l'automatique | Aucune capture d'effet indésirable. | absent | **amendé 2026-08-24** ([[D-101]], [[D-107]]) : la capture EXISTE, le mécanisme est complet — **signature reportée au 2026-08-30**, donc non armé |
| DC-43 gates de population avant classement | `anamnese.ts:101` porte bien « Grossesse / post-partum », mais comme **facteur déclenchant** — un antécédent, pas un état courant, et remonté dans `DrapeauxAnamnese.facteursDeclenchants` sans qualifier une population. Sinon `grossesse`/`allaitement` n'apparaissent que dans `trust/contenus/registre.ts` (contenus d'information) : **jamais dans un filtre d'intervention**. Voir **§C**. | absent | **amendé 2026-08-24** ([[D-101]], [[D-107]]) : mécanisme complet et relu, **sans sujet** (`neCouvrePas` null sur les 95) ; porteur = curation des exclusions rouverte |
| DC-44 médicament + complément | Cumuls et compatibilités entre compléments : faits (`supplement-library/compatibilite.ts`). Croisement avec les **médicaments du patient** : `contexteClinique.ts` collecte le contexte, aucun moteur ne l'oppose à une proposition. | partiel | LOT-05 |

### VII — Biologie

| Règle | État réel | Statut | Porteur |
|---|---|---|---|
| DC-45 trois niveaux de mesure | La bibliothèque de biologie fonctionnelle (987 actes NABM) est **dormante** — aucune surface ne la consomme. | porté | LOT-06 |
| DC-46 valeur ≠ interprétation isolée | Sans objet aujourd'hui : le LOT-06 est explicitement conçu **sans stocker de valeurs** (verrou HDS). La règle devient exigible seulement si ce verrou tombe. | porté | LOT-06 |
| DC-47 valeur optimale identifiée | Idem — mais le `referenceType` est exigible **dès maintenant** sur les propositions de bilan, qui citent des cibles fonctionnelles sans les nommer comme telles. | porté | LOT-06 |

### VIII — Longitudinal

| Règle | État réel | Statut | Porteur |
|---|---|---|---|
| DC-48 temporalité | `D-010` (écart déclaré/observé), `D-023` (ancrage sur ce qui est enregistré), `D-040` (discordance de rythme). Pas de modèle temporel général avant/pendant/après. | partiel | LOT-07 |
| DC-49 agenda ≠ questionnaire | `D-009`, `D-010`, `D-039` ; agrégats transmis sans poids ni seuil. | acquis | — |
| DC-50 fréquence ≠ gravité | Les agendas comptent ; ils ne graduent pas. | absent | — |
| DC-51 assiette ≠ réponse individuelle | Boussole alimentaire C5 : qualité intrinsèque (PRAL, densité). La compatibilité au contexte patient n'est pas un second niveau. | absent | — |
| DC-52 socle populationnel | Aucun socle de recommandation nationale n'est référencé comme tel. | absent | — |
| DC-53 divergence justifiée | Corollaire du précédent. | absent | — |

### IX — Conflits, gouvernance, vérification

| Règle | État réel | Statut | Porteur |
|---|---|---|---|
| DC-54 politique de résolution | Aucune. La contradiction **entre sources** est un sujet distinct de la discordance **entre instruments** du LOT-01 — et personne ne le porte. | absent | **ACTÉ 2026-08-24** ([[D-103]], [[D-104]]) — registre signé, `CS-BIO-01` mord ; banc `conflitsSourcesV1.guard.test.ts` |
| DC-55 escalade praticien | `D-003` impose la validation praticien en sortie ; ce n'est pas la même chose qu'une escalade **déclenchée par un conflit identifié**. | partiel | **ACTÉ 2026-08-24** ([[D-103]], [[D-104]]) — escalade déclenchée par conflit identifié ; reste **curatoriale** par arbitrage ([[D-107]]) |
| DC-56 modules annoncent leurs claims | `MATRICE_CONSOMMATION.md`, générée depuis les imports — 19 sources, dont 6 dormantes. À la maille « source de savoir », pas du claim. Les claims **ignorés volontairement** n'y figurent pas. | partiel | — |
| DC-57 tests de doctrine, épinglés au claim | Discipline `*.guard.test.ts` établie et sérieuse ; l'identifiant du claim n'est pas dans le test. | partiel | — |
| DC-58 le test n'est pas la vérité clinique | Aucun outil ne détecte une valeur clinique qui n'existerait que dans un test. | absent | **amendé 2026-08-24** ([[D-105]]) : mesurée **sans sujet** (zéro valeur orpheline sur 476 fichiers de test), méthode prescrite montrée VACUE — reste proposition, avec sa mesure |

---

## §A — Le schéma de claim ne porte pas ce que la doctrine exige

Cinq règles (DC-07, DC-13, DC-14, DC-15, DC-20) demandent au claim des champs
qu'il n'a pas. Le claim réel porte : `claim_id`, `version_claim`,
`texte_normalise`, `content_sha256`, `classe_autorite`, `niveau_preuve`,
`typologie_lecture`, `prescriptif`, `statut`, `superseded_at`, plus les
sources épinglées par SHA.

Manquent : la catégorie A-E, le niveau d'exécution, la population, l'échéance
de revue, la nature du seuil.

**Conséquence de séquencement.** `rag_corpus_claims` est en production. Ajouter
ces champs est une **migration**, donc une PR séparée du code qui les
consomme — et le code qui les consomme est réparti sur les LOT-01, LOT-04,
LOT-05 et LOT-06. Si la migration n'est pas posée tôt, chaque lot invente son
équivalent local et la doctrine se fragmente exactement là où elle prétendait
unifier.

**Ce qui n'est pas tranché** : `typologie_lecture` recouvre-t-elle déjà
partiellement la taxonomie A-E ? Si oui, la migration est un enrichissement ;
sinon, c'est un axe nouveau. La réponse est dans les valeurs réellement
présentes en base, qui se lisent en une requête.

## §B — L'objet de sécurité existe, mais il n'est ni typé ni inhibant

`redFlag`, `drapeau rouge`, `alerte médicale` : aucune occurrence dans
`web/src/lib/`. Mais chercher le mot était la mauvaise recherche — **la chose
existe sous un autre nom**.

`web/src/lib/consultation/anamnese.ts:131-144` définit `signaux_alerte`, douze
items qui sont des red flags au sens strict : idées noires ou suicidaires,
sang dans les selles ou les urines, perte de poids involontaire importante,
douleur thoracique, malaise, perte de force brutale.
`extraireVigilanceDeterministe` (`contexteClinique.ts:155-161`) les remonte au
praticien en clair — « avis médical à évaluer en priorité » — et le code le
désigne explicitement comme « la garantie de sécurité ». Il **ne filtre pas**,
délibérément, là où `DrapeauxAnamnese.signauxAlerte` filtre contre l'énuméré
courant.

Trois manques subsistent, et ce sont eux l'écart réel :

1. **Un type sans producteur.** `SafetyFinding` existe bel et bien
   (`clinical-engine/types.ts:209-215` — `disposition:
   'requires_practitioner_review'`, porté par `ClinicalReview.safetyFindings` et
   normalisé par `clinicalReview.ts:233`). Mais **rien ne le produit** : ce que
   le praticien voit vient de `signaux_alerte`, c'est-à-dire d'une liste de
   chaînes de caractères où rien ne distingue « idées suicidaires » de
   « constipation récente » — ni gravité, ni domaine, ni conduite à tenir. Le
   type est écrit, le chemin qui l'alimente n'existe pas.
2. **Aucun pouvoir d'inhibition** (DC-12). Le signal s'affiche à côté des
   propositions ; il n'en retire aucune. Un red flag et une suggestion de
   complément coexistent sans que le premier morde sur la seconde.
3. **Une seule porte d'entrée.** Un red flag ne peut naître que de l'anamnèse
   déclarée. Un score d'instrument ne peut pas en produire — ce qui est
   précisément ce que le LOT-01 interdit en négatif (« ni promotion d'un
   facteur de risque en alerte médicale ») sans dire ce qui serait, lui,
   légitime.

**La contrainte réglementaire n'est pas l'obstacle qu'on croit.** Nommer une
« alerte médicale » dans une surface **patient** est ce que
`REGISTRE_FRONTIERES.md` proscrit ; un objet de sécurité **interne au
praticien** ne tombe pas sous cet interdit — `extraireVigilanceDeterministe`
en fait déjà la démonstration en production. Ce qui manque est un typage, pas
une dérogation.

Le patron d'inhibition existe lui aussi sous un autre nom : `D-021` refuse
qu'une sévérité acquise se fasse moyenner et l'utilise comme **plancher**.
C'est structurellement « red flag ≠ points » (DC-23). Typer les signaux
d'alerte et leur donner un pouvoir de plancher généraliserait deux précédents
du dépôt, sans rien inventer.

## §C — Les gates de population n'existent pas, et leur place est contrainte

DC-43 exige un filtrage **avant** classement. Or les deux lots qui produiront
des candidats — LOT-04 (candidats déterministes) et LOT-05 (compléments sur
claims) — n'inscrivent aucune gate.

C'est le seul écart de cet audit qui **coûte plus cher plus tard** : filtrer
après classement produit un classement dont on retire des lignes, ce qui est
observable et rattrapable ; mais un scoring de candidats calibré sur une
population non filtrée est faux dans ses poids, et le rattrapage exige de
recalibrer. La contrainte est donc à poser dans le LOT-04, pas après.

## §D — Le garde-fou d'écriture ignore les fichiers cliniques

`.claude/hooks/protect-wellneuro-files.mjs:49-53` — le niveau « demande » ne
contient que trois motifs : `prisma/schema.prisma`, `prisma/migrations/`,
`supabase/migrations/`.

Modifier `web/src/lib/clinical/orientationRulesV1.ts` (vingt règles cliniques
signées), `web/src/lib/equilibre/constants.ts` (les poids des douze besoins) ou
`web/src/lib/questions.ts` (les cut-offs des instruments) passe donc **en
silence**. `.claude/rules/clinique-scoring.md` charge bien la règle sur ces
chemins — mais une règle de contexte informe, elle n'interrompt pas.

DC-17 pose que ces fichiers sont du **clinique**, pas du code. L'écart entre ce
statut et le silence du hook est le plus facile à refermer de tout cet audit :
trois motifs à ajouter à une liste. C'est aussi celui qui protège la doctrine
elle-même — sans lui, rien n'oblige une session future à passer par un `D-xxx`.

## §E — Le compilateur de règles n'existe pas, et le code affirme le contraire

`web/src/lib/clinical/orientationRulesV1.ts:11-13` déclare :

> « Elle est régénérée par `tools/corpus/orientation/` (lot 9) à partir des
> seuls claims VALIDÉS par le praticien dans l'Atelier corpus (barrière
> D-003). »

**`tools/corpus/orientation/` n'existe pas** — ni dans le répertoire de
travail, ni dans l'historique Git : aucun commit ne l'a jamais introduit ni
supprimé. Rien dans `tools/` ni dans `scripts/` ne référence
`orientationRulesV1`. La table est du TypeScript écrit à la main, dont les
`claimId` et `versionClaim` sont épinglés à la main.

**Ce que cela ne remet pas en cause.** DC-01 tient : chaque règle nomme ses
claims justificatifs, et la traçabilité est réelle et vérifiable à la lecture.
La barrière `D-003` tient aussi — elle est éprouvée par un contrat SQL, pas
par ce pipeline.

**Ce que cela remet en cause.** Rien ne garantit mécaniquement qu'un `claimId`
épinglé existe encore, soit toujours au statut `VALIDE`, ou n'ait pas été
`superseded`. Un claim retiré du corpus laisse derrière lui une règle
d'orientation qui continue de le citer — et la citation, elle, restera exacte
et rassurante. C'est le mode de défaillance que DC-15 (obsolescence) et DC-26
(compilation) existent pour empêcher, et il est ouvert.

**Le coût de fermeture est faible et le bénéfice immédiat** : un banc qui lit
les `justificationClaims` de la table et vérifie en base que chacun existe, est
`VALIDE` et n'est pas `superseded`, ferme l'essentiel sans écrire de
compilateur. Le compilateur reste souhaitable ; il n'est pas le préalable.

**Et c'est le patron que le LOT-01 s'apprête à copier.** Le moteur de
contradictions doit épingler ses claims de la même façon — donc hériterait du
même trou. Poser le banc avant, ou en même temps, évite de le dupliquer.

---

## Refermer les 18 règles sans ancrage

Les dix-huit ne sont pas dix-huit chantiers. Elles se regroupent par **le
mécanisme qui les débloque** : cinq véhicules couvrent quatorze d'entre elles,
et les quatre dernières ne doivent pas être intégrées du tout aujourd'hui.

### Quatre règles à ne pas intégrer maintenant

Une règle dont le sujet n'existe pas ne s'intègre pas : on écrirait un garde
pour un comportement qui n'a pas lieu, et le garde passerait au vert en
permanence sans rien prouver.

| Règle | Pourquoi elle n'a pas de sujet | Ce qui l'arme |
|---|---|---|
| DC-05 claim de synthèse conserve ses parents | Aucun claim dérivé n'existe. | Le premier claim dérivé. |
| DC-08 descriptif auto-exécutable | Rien ne s'exécute automatiquement — tout passe par le praticien (`D-003`). | La première exécution `AUTO`, qui suppose DC-13. |
| DC-52 socle populationnel | Aucune recommandation nationale n'est référencée dans le dépôt. | L'entrée d'un premier socle. |
| DC-53 divergence au socle justifiée | Corollaire de DC-52. | Idem. |

Elles restent **écrites, non armées** : le déclencheur est nommé, il n'y a
aucun travail aujourd'hui. C'est un état légitime, pas une dette.

### Cinq véhicules pour les quatorze autres

**V1 — Étendre l'objet de discordance du LOT-01** → DC-29, DC-54 (2 règles)

Le LOT-01 crée un `DiscordanceFinding`. La convergence (DC-29) en est le
miroir exact, et la contradiction entre **sources** (DC-54) en est le frère —
même forme, autre matière. Trois objets ou un objet à trois formes est une
décision d'architecture, et elle se prend **avant** le premier, pas après.

*Coût si différé : un second moteur, et deux vocabulaires de vigilance qui
cohabitent à l'écran.*

**V2 — Une migration du schéma de claim (§A)** → DC-07, DC-14, DC-20 (3 règles)

Catégorie A-E, population, nature du seuil. Trois champs, une migration, et
`DC-13` passe de partiel à acquis dans la foulée. `rag_corpus_claims` est en
production : la migration voyage **seule**, et son délai d'approbation
`release-db` est le vrai chemin critique.

*Coût si différé : LOT-04, LOT-05 et LOT-06 inventent chacun leur équivalent
local, et la doctrine se fragmente là où elle prétendait unifier.*

**V3 — Typer l'objet de sécurité (§B)** → DC-23, DC-42, DC-43 (3 règles)

Donner un type et un pouvoir d'inhibition aux `signaux_alerte` existants
apporte l'orthogonalité au score (DC-23, sur le patron `D-021`), les gates de
population (DC-43) et l'interruption sur effet indésirable (DC-42) — un effet
indésirable étant un événement de sécurité, pas un événement de suivi. Fait
passer DC-12, DC-35 et DC-55 de partiel à acquis.

*Coût si différé : le plus élevé de tout l'audit. Un classement de candidats
calibré sur une population non filtrée est faux dans ses poids ; filtrer après
coup impose de recalibrer (§C). À poser dans le LOT-04, pas après.*

**V4 — Amender deux fiches de lot** → DC-39, DC-41 (2 règles)

Compatibilité simultanée vs séquentielle (DC-39) et l'axe tolérance distinct
de l'efficacité (DC-41) appartiennent au cycle de vie de l'intervention, déjà
porté par LOT-05 et LOT-07. Ils n'y sont simplement pas inscrits. **Aucun lot
nouveau, aucun code** : deux paragraphes dans deux fiches existantes.

*Coût si différé : nul aujourd'hui, élevé dès que LOT-05 est écrit sans eux.*

**V5 — Un banc de doctrine** → DC-58 (1 règle)

Détecter une valeur cliniquement signifiante qui n'existerait que dans un
test. Même famille que §D (le hook qui ignore les fichiers cliniques) et §E
(la fraîcheur des claims épinglés) : de l'outillage de session, aucune
décision clinique requise, aucune dépendance.

**Reste isolées** → DC-22, DC-50, DC-51 (3 règles)

- **DC-22** (pas de score global sans interprétation clinique du total) vise
  « Mon équilibre » et ses douze besoins. C'est une question clinique franche,
  qui mérite son propre `D-xxx` : le total a-t-il un sens, ou faut-il n'afficher
  que les axes ? Elle ne dépend d'aucun véhicule.
- **DC-50** (fréquence ≠ gravité) et **DC-51** (qualité de l'assiette ≠
  réponse individuelle) relèvent de la boussole alimentaire et de la campagne
  `2026-08-10-chaine-alimentaire`, pas de la chaîne T0. À y renvoyer
  explicitement plutôt qu'à traîner ici.

### Ordre recommandé

Il ne suit pas l'importance des règles mais le **coût du report** :

1. **V1** — LOT-01 est en cours d'écriture ; la fenêtre se ferme cette semaine.
2. **V2** — délai d'approbation `release-db` incompressible, et V3 comme LOT-04
   en dépendent.
3. **V3** — avant que le LOT-04 ne calibre un classement.
4. **V4** et **V5** — sans dépendance, à prendre quand la place se libère.
5. **DC-22**, puis renvoi de DC-50/DC-51 à la campagne alimentaire.

### L'acte d'intégration lui-même

Une règle est intégrée quand **trois choses** ont eu lieu, jamais moins :

1. une entrée `docs/DECISIONS.md` qui la tranche (`DC-18`) ;
2. un banc ou un contrat qui la fait mordre — sans quoi elle informe une revue
   sans jamais l'interrompre ;
3. son statut basculé de **proposition** à **acté** dans
   `CONSTITUTION_CLINIQUE.md`, avec la référence `D-xxx`.

Ce troisième point est ce qui empêche la constitution de devenir un document
d'intention : le champ de statut **est** le registre d'avancement. Une règle
qui reste « proposition » pendant six mois est une règle que personne n'a
voulue, et c'est une information.

---

## Amendement du 2026-08-23 — ce que ce constat dit de faux aujourd'hui

> Établi par la descente des 58 règles du LOT-01 de « Doctrine exécutable »
> ([[D-095]]), contre le dépôt à `f9290b37`. Rien n'est retiré ci-dessus ;
> cette section dit ce qui a bougé.

### A — Les porteurs sont périmés, tous, et pour une seule raison

La campagne chaîne T0 est **close depuis le 2026-08-18** (10/10 lots). Toute
mention d'un de ses lots renvoie donc à du **livré**. Le tableau en compte
dix-neuf : **13 lignes « porté »** (`DC-03`, `DC-09`, `DC-27`, `DC-30`,
`DC-33`, `DC-36`, `DC-38`, `DC-39`, `DC-40`, `DC-41`, `DC-45`, `DC-46`,
`DC-47`) et **6 lignes « partiel » nommant un lot** (`DC-11`, `DC-34`,
`DC-35`, `DC-37`, `DC-44`, `DC-48`).

Trois sorts, qui n'ont rien à voir entre eux :

- **le lot a refermé la règle** — `DC-27`, `DC-30`, `DC-33`, `DC-34` (4) ;
- **la règle a changé de porteur** — `DC-37` (livrée en trois formes de
  redondance), `DC-46` (CB-09, hors campagne), `DC-35` et la part
  « exclusions » de `DC-11` (LOT-05 de « Doctrine exécutable ») ;
- **le lot est livré sans l'avoir refermée, et personne ne la reprend** —
  `DC-03`, `DC-36`, `DC-38`, `DC-39`, `DC-40`, `DC-41`, `DC-44`, `DC-45`,
  `DC-47`, `DC-48`, plus la part de `DC-11` qui excède les exclusions. **Dix
  règles orphelines**, onze statuts marqués avec `DC-11`. Le compte se vérifie
  par `grep -c '\*\*Orpheline\*\*' docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`,
  qui doit rendre **13** — onze statuts, plus deux occurrences dans l'en-tête
  qui définit le marqueur. Ce ne sont pas des régressions de code, ce sont des
  **promesses de lot évaporées**, et c'est le principal produit de cette
  descente.

**`DC-09` faisait partie de cette liste et n'y est plus** : arbitrage du
2026-08-23 ([[D-096]]), elle a reçu le **LOT-09** de « Doctrine exécutable »,
**livré le jour même** ([[D-097]]). Elle était la dernière des quatre règles
que cet audit désignait comme les plus exposées à rester sans ancrage ; sa
fermeture a repris le patron exact qui a refermé `DC-27` — clause de prompt
plus garde qui épingle la formule, ici doublée d'une garde de **position** et
d'une garde de l'**opérateur** d'interdiction.
Reste **`DC-36`**, sans preuve, sans banc et sans véhicule.

### B — Trois faits étaient déjà vrais le 2026-08-11, et l'audit les a manqués

- **`DC-41`** — « Aucun axe de tolérance » : l'axe `tolerance` est l'une des
  quatre questions du catalogue gelé de check-in depuis le **2026-07-18**
  (`protocol/checkinDomain.ts:68-76`), trois semaines avant le constat.
- **`DC-42`** — « Aucune capture d'effet indésirable » : `TrustAdverseEffectReport`
  (`schema.prisma:838-866`), la route `POST /api/portail/trust/signalement` et
  la règle versionnée `orienterEffetIndesirable` (`trust/securite.ts:37-55`)
  datent du **2026-07-16**. Le constat juste est « capture complète, aucune
  interruption ».
- **`DC-51`** — « La compatibilité au contexte patient n'est pas un second
  niveau » : `buildContextualFoodReading` (`food-compass/contextual.ts:52`)
  existe depuis le **2026-07-18**. Le fond tient — ce niveau n'évalue aucune
  réponse individuelle — mais la formulation nie une couche qui existe.

### C — Constats de fond devenus faux

- **Ligne 28** — « les quatre règles les plus exposées, `DC-09`, `DC-27`,
  `DC-29`, `DC-30`, n'ont aucun ancrage exécutable » : **faux pour les
  quatre** depuis le 2026-08-23. `DC-09`, dernière des quatre, a été refermée
  par le LOT-09 de « Doctrine exécutable » ([[D-097]]) : clause du cadre
  déontologique en `synthese-v29`, banc de prompt qui épingle la formule **et
  sa position**. Le constat d'origine était juste au 2026-08-11 ; il n'a plus
  de portée courante.
- **§D en entier (l. 269-284)** — **CLOS**. Le Socle LOT-02 ([[D-083]] §3) a
  porté le niveau « demande » du hook de trois motifs à **huit fichiers
  cliniques**, avec banc en CI sans filtre `docs_only`.
- **§E (l. 305-320)** — le banc de fraîcheur **a été posé** ([[D-042]],
  [[D-044]], [[D-046]]) et découvre automatiquement les tables signées : **40
  identifiants distincts** contrôlés en CI et au préflight `release-db`. Le
  mode de défaillance est fermé. Le compilateur, lui, n'existe toujours pas —
  `DC-26` reste partiel.
- **§A (l. 197-207)** — la question ouverte est **tranchée** :
  `typologie_lecture` ferme un axe de *lecture*
  (déclaré/observé/vécu/interprété), sans rapport avec `A-E` ; la taxonomie
  serait un axe **nouveau**. Deux corrections en découlent : la **population
  sort** de la liste des champs manquants au claim — elle appartient à
  l'intervention ([[D-095]]) — et l'argument « si la migration n'est pas posée
  tôt, chaque lot invente son équivalent local » ne tient plus, aucun lot de la
  campagne courante ne consomme ces axes.
- **§B point 3 (l. 238-242)** — « une seule porte d'entrée : un red flag ne
  peut naître que de l'anamnèse déclarée » : périmé, le portail capture un
  signalement d'effet indésirable. Et le **consommateur** de l'inhibition est
  désormais éprouvé (`decisionCard.ts:112`) ; c'est le **producteur** qui
  manque (`chaineC1.ts:315`, `safetyFindings: 0` en dur).
- **Véhicule V1 (l. 347-352)** — « le LOT-01 crée un `DiscordanceFinding` » :
  faux. [[D-044]] a **refusé** de le réutiliser (il hérite de `confidence`) ;
  un type propre a été créé, et le garde l'assère sur le type.
- **Véhicule V3 (l. 367-377)** — périmé pour `DC-23` (fait en partie par
  [[D-062]]) et pour `DC-35` (actée par `D-043`, motifs dans une table signée
  du LOT-04). Ce qui reste dû est le **producteur** de constats de sécurité.
- **Véhicule V4 (l. 379-386)** — **PÉRIMÉ DANS SA FORME**. « Deux paragraphes
  dans deux fiches de lot existantes » : ces fiches sont livrées. `DC-39` et
  `DC-41` sont désormais des dettes **sans véhicule**.
- **Lignes du tableau démenties une à une** : `DC-01` (le drapeau ne ferme plus
  la route depuis [[D-074]]), `DC-04` (l'acquis ne vient pas de
  `CHUNK_INTROUVABLE`, qu'aucune suite ne joue), `DC-15` (le corpus ne vieillit
  plus en silence pour les claims épinglés), `DC-19` (C-SOM vit dans les règles
  écartées, avec motif et condition de retour), `DC-20` (« absent » était déjà
  faux le jour même, `D-043` l'a actée), `DC-22` (porteur : LOT-07 de
  « Doctrine exécutable »), `DC-23` (`SafetyFinding` est typé), `DC-29`
  (les quatre niveaux sont typés et bancés — manque le producteur), `DC-30`
  (le moteur existe, quatre fichiers, quatre bancs), `DC-31` (l'hypothèse est un
  objet, rendu au cockpit), `DC-33` (le cockpit classe et numérote,
  `chaineC1.ts:382-413`), `DC-34` (les claims remontent à l'écran), `DC-35`
  (`ABSTENTION_PROCEDURE_V1` est signée et fail-closed), `DC-37` (trois formes
  de redondance mordent, pas une), `DC-45` (la bibliothèque n'est plus
  dormante ; ce qui reste vide est l'appariement `biology_analyte_nabm`),
  `DC-47` (**faux** : aucune proposition ni courrier ne cite de borne),
  `DC-50` (la règle vise les *claims*, pas les agendas), `DC-54` (la forme
  `CONFLIT_SOURCES` existe et le LOT-06 la porte), `DC-55` (l'issue est typée
  depuis [[D-055]]), `DC-56` (**21** sources dont 6 dormantes, pas 19),
  `DC-57` (l'épinglage existe pour les tables signées), `DC-58` (porteur :
  LOT-03).

### D — Ce que la répartition devient, et pourquoi elle n'est pas recomputée

**La grille à quatre colonnes n'a pas été refaite règle par règle, et c'est
une limite assumée du LOT-01.** Elle mesure l'état du **code** ; la
constitution mesure l'**acte d'intégration**. Les deux ne coïncident pas —
`DC-33` en est la démonstration : le code la tenait, et la bancait, avant
qu'aucune décision ne la tranche. Un total global non reconstituable depuis
les listes ci-dessus vaudrait moins que pas de total.

Ce que le lot établit se vérifie, en revanche, au grep de
`CONSTITUTION_CLINIQUE.md` :

| Mesure | Compte |
|---|---|
| règles re-vérifiées contre le dépôt | 58 |
| bascules proposition → acté, sur trois preuves | **2** (`DC-29`, `DC-33`) — compte **du LOT-01** ; le grep en rend 3 depuis la bascule de `DC-09` par [[D-097]] |
| réserves « Banc dû » retirées | **7** — dont 2 requalifiées **Producteur dû** (`DC-12`, `DC-23`) |
| réserves « Banc dû » maintenues | 2 (`DC-14`, `DC-20`) |
| marqueurs **Décision due** | 4 (`DC-04`, `DC-21`, `DC-44`, `DC-56`) |
| marqueurs **écrite, non armée** | 4 (`DC-05`, `DC-08`, `DC-52`, `DC-53`) |
| règles **orphelines** | **10**, plus la part de `DC-11` hors exclusions (11 marqueurs) |
| règles sans preuve, sans banc, sans véhicule | 1 (`DC-36`) — `DC-09` en est sortie : LOT-09 attribué ([[D-096]]) puis **livré** ([[D-097]]) |

Portées vivantes après requalification et après les arbitrages du 2026-08-23
([[D-096]]), toutes par « Doctrine exécutable » sauf mention : ~~`DC-09`
(LOT-09)~~ **livrée le 2026-08-23, [[D-097]]** · `DC-12`, `DC-23` (LOT-04) · `DC-11`-exclusions, `DC-35`, `DC-42`,
`DC-43` (LOT-05) · `DC-54`, `DC-55` (LOT-06) · `DC-22` (LOT-07) · `DC-58`
(LOT-03) · **`DC-07`, `DC-13`, `DC-20` (Curation signée** — le LOT-02 y a été
transféré, faute de consommateur**)** · `DC-46` (CB-09, hors campagne) ·
`DC-50`, `DC-51` (campagne chaîne alimentaire).

---

## Ce que l'audit ne dit pas

Il confronte la doctrine au **code**. Il ne l'a pas confrontée aux **claims** :
tant que l'ensemble des claims certifiés du corpus n'a pas été passé
mécaniquement dans la grille DC-07 (catégorie) et DC-13 (niveau d'exécution),
on ne sait pas combien de claims tomberaient en `PRACTITIONER_REQUIRED`, ni
combien seraient inexécutables faute de population déclarée. Cette descente
produit la matrice claim par claim annoncée en fin de constitution, et elle
reste à faire.

**Elle est ROUTÉE depuis le 2026-08-25** ([[D-109]]) — chez **Curation signée**,
entièrement : sa structure y a suivi le LOT-02 transféré ([[D-096]]), sa cadence
y était déjà. Elle était annoncée **ici et en fin de constitution** sans
destinataire ; c'est cette double annonce sans routage que la clôture ferme.
Fait qui rend le routage exact plutôt que dilatoire : les **8 224 claims** de
production (mesurés le 2026-08-23, conteneur en lecture seule) sont tous
`VALIDE`, et leur `metadata` ne porte que `section`/`source_chunk`/`page`/
`usage` — la grille **n'a aucune colonne où s'écrire** tant que Curation signée
n'a pas ouvert les axes.

---

## Répartition finale — clôture de « Doctrine exécutable » (2026-08-25)

*Écrite par le LOT-08 ([[D-109]]). Les lignes du 2026-08-11 restent lisibles
ci-dessus : elles sont amendées et datées, jamais remplacées.*

L'audit d'origine comptait **11 acquises, 18 partielles, 13 portées, 16 sans
ancrage**, et ordonnait **cinq véhicules** de fermeture. Ce que la campagne en a
fait, véhicule par véhicule :

| Véhicule | Sort |
|---|---|
| **V1** — étendre l'objet de discordance → `DC-29`, `DC-54` | **livré** (LOT-04, LOT-06) — `DC-54` et `DC-55` actées et signées ([[D-103]], [[D-104]]) |
| **V2** — axe population | **déplacé par arbitrage** ([[D-101]]) : la population sort du claim et vit sur l'INTERVENTION. `DC-43` a son mécanisme, **pas son sujet** |
| **V3** — typer l'objet de sécurité → `DC-23`, `DC-42`, `DC-43` | **partiellement livré** — `DC-23` actée ([[D-099]]) ; `DC-42` attend sa **signature**, revue au 2026-08-30 |
| **V4** — deux paragraphes dans deux fiches → `DC-39`, `DC-41` | **périmé** : les fiches sont livrées depuis le 2026-08-18 et le code ne porte ni l'un ni l'autre ⇒ **sans véhicule**, nommées et non effacées ; rejoignent la **campagne dédiée aux orphelines** ([[D-107]]) |
| **V5** — un banc de doctrine → `DC-58` | **instruit, non basculé** ([[D-105]]) : mesurée sans sujet, méthode prescrite montrée vacue. Le versant décidable est gardé, mais il relève de `DC-19`/`DC-20` |
| **Isolées** — `DC-22`, `DC-50`, `DC-51` | `DC-22` **actée** ([[D-106]], [[D-108]]) ; `DC-50`/`DC-51` **renvoyées** à la campagne chaîne alimentaire |

**Six règles franchissent leurs trois preuves** — décision datée, banc qui
tourne, statut basculé : `DC-09`, `DC-19`, `DC-22`, `DC-23`, `DC-54`, `DC-55`.
Chacune est vérifiée dans la constitution, banc nommé.

**Ce que la clôture refuse d'écrire comme fermé**, et c'est le point : `DC-20`
(nature en prose, pas dans la donnée), `DC-26` (compilateur inexistant),
`DC-42` (signature reportée), `DC-43` (sans sujet), `DC-58` (sans méthode), les
**quatre non armées** dont le déclencheur a été revérifié **structurellement** le
2026-08-25, et les **onze statuts orphelins** recomptés au grep le même jour —
routés vers une **campagne dédiée** ([[D-107]]), pas laissés en dettes.

**Une contre-revue adverse a précédé cette clôture** ([[D-108]]) et a réfuté
**sept** des treize affirmations qu'elle s'apprêtait à graver — dont un texte
servi au patient depuis cinq semaines, qu'aucun lot de la campagne n'avait vu.
C'est la raison pour laquelle cette répartition dit d'abord ce qui n'est pas
fermé.
