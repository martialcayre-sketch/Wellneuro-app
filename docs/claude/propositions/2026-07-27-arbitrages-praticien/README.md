# Arbitrages praticien du 2026-07-27

Onze décisions prises en une passe, à cheval sur trois campagnes : certification
des questionnaires, rayon compléments C4, rayon biologie fonctionnelle CB.
Elles répondent à des questions restées ouvertes dans les documents de cadrage
respectifs ; chacun de ces documents pointe désormais ici à l'endroit où la
question était posée.

> **Ce document ne corrige rien.** Il enregistre ce qui a été tranché, ce que
> chaque décision implique, et ce qu'elle coûte. Les correctifs eux-mêmes
> viendront par lots datés au `CHANGELOG.md`, chacun avec sa revue.

## Ce qui a rendu la passe possible, et ce qui a failli la fausser

Plusieurs arbitrages de certification encore ouverts posaient **la même
question** : le PDF du cabinet et la publication d'origine divergent, laquelle
fait foi ? Trancher la hiérarchie de source (décision 1) en décide **trois** —
ceux que le dossier d'instruction déclare conditionnés par elle.

**Une première rédaction en revendiquait sept**, et une revue adversariale
indépendante a rendu **NO-GO** dessus. Elle avait raison : quatre de ces lignes
étaient décidées par autre chose, ou pas décidées du tout. L'erreur n'était pas
d'ordre rédactionnel — créditer une doctrine de décisions qu'elle ne prend pas
fait passer pour arbitré un correctif clinique que personne n'a arbitré. La même
revue a trouvé un douzième instrument absent de la liste `protocol`, une fuite
qui survivait au correctif censé la fermer, et deux « preuves » techniques qui
n'étaient que des contraintes `NOT NULL`. Tout cela est corrigé ci-dessous, et
signalé à chaque endroit plutôt que réécrit en silence.

Ce document porte donc **deux couches** : les décisions du praticien, et ce que
la revue a obligé à rectifier avant de les graver.

---

## 1. Hiérarchie de source : la publication primaire fait foi

**Décision.** Quand le PDF du cabinet et la publication d'origine d'un
instrument divergent, la **publication primaire** est la référence de
certification.

Ce n'était pas une nouveauté en fait : l'audit de la chaîne alimentaire du
2026-07-26 avait déjà constaté que, sur `Q_ALI_02`, l'application était plus
fidèle au MEDAS publié qu'au PDF qu'on lui opposait. Ce qui manquait, c'était
la règle — et donc la réponse au cas suivant.

**Ce que la doctrine décide réellement, et rien de plus.** Une première rédaction
de ce document lui attribuait sept instruments ; la revue adversariale a montré
que **trois seulement** relèvent d'elle — ceux du §3 de
[ARBITRAGES-2026-07-26.md](../2026-07-25-certification-corpus-questionnaires/ARBITRAGES-2026-07-26.md),
que le dossier d'instruction déclare explicitement conditionnés par la question
de hiérarchie de source. Les autres sont décidés par autre chose, ou ne sont pas
décidés du tout. La distinction n'est pas cosmétique : créditer la doctrine
d'une décision qu'elle ne prend pas fait passer pour acquis un correctif que
personne n'a arbitré.

| Instrument | Divergence | Ce que la doctrine impose |
|---|---|---|
| **Tinetti** `Q_GEO_01` | 20 lignes servies pour 16 items source, même total /28 | revenir au découpage source en 16 items |
| **Q_FIB_03** (ELFE) | 12 items servis pour 7 source, section « symptômes associés » ajoutée | la section ajoutée sort du score ELFE ; elle peut rester en observation hors score |
| **Q_NEU_12** (IDTAS-AE) | 48 items servis pour 36 source, 3A/3B dupliquent une liste | dédoublonner vers les 36 items de la source |

### Ce que la doctrine ne décide pas, et qui relève d'autre chose

- **IPSS `Q_URO_01` — corrigé, mais pas au titre de la doctrine.** Le dossier
  d'instruction le qualifie de « deux défauts nets, **sans ambiguïté clinique** »
  et « sans choix clinique à faire ». Ce n'est pas un conflit de source, c'est
  un défaut de scoring : `U2` est coté `0/2/3/4/5/6` quand les six autres items
  vont de 0 à 5, et la qualité de vie est sommée au total. **Le `total` rendu
  vaut 42** (36 de symptômes + 6 de qualité de vie) ; le score de symptômes
  atteint 36 pour un maximum publié de 35, et retombe à 35 exactement une fois
  `U2` ramené à 0–5. Les deux correctifs restent à faire — ils sont simplement
  motivés par le défaut, pas par la hiérarchie de source.
- **QLQ-BR23 `Q_CAN_02` — reste OUVERT.** Le dossier d'instruction pose deux
  options à arbitrer. Dire « la règle EORTC fait foi » sans avoir lu cette règle
  ne tranche rien : c'est reporter la décision en la déguisant en décision.
  **À rouvrir** une fois le manuel EORTC lu. Le registre des instruments pose
  déjà le principe — renseigner une `formePubliee` de mémoire ferait disparaître
  les divergences que la campagne cherche à révéler ; la même prudence vaut pour
  un algorithme de scoring.
- **`Q_GEO_04` (MMSE) — même arbitrage que `Q_CAR_01`.** Les deux relèvent du §5
  « dimensions non calculées ». Les traiter par deux régimes différents était une
  incohérence de ma rédaction. Ils sont désormais tranchés ensemble à la
  **décision 4**.
- **Berlin `Q_SOM_03` — RETIRÉ de cette passe.** Le constat « 9 items pour 10 »
  ne figure pas au dossier d'instruction : il date du 2026-07-25, **avant** la
  correction des trois défauts du comparateur et le rejeu du banc qui a blanchi
  trois instruments et en a révélé un quatrième. Il porte en outre la réserve
  « version et droits à contrôler ». **Rejouer le banc avant tout correctif** —
  il s'agit d'un dépistage d'apnée du sommeil, et la campagne existe précisément
  pour ne pas corriger sur une liste de conformité produite par un outil non
  éprouvé.

**MFI-20** `Q_SOM_07` relève de la doctrine mais **son arbitrage est traité dans
une autre session** ; il n'est pas repris ici. Conséquence à noter : la question
(c) du cadrage certification est close *comme doctrine*, alors que le cas qui
l'avait motivée reste pendant ailleurs.

**PSQI** `Q_SOM_01` n'est pas concerné : ses six items « manquants » sont
renseignés par le conjoint et non cotés — artefact de comptage, pas divergence.
Reste à **prouver par tests de référence** la fidélité du `type: 'psqi'` aux
sept composantes publiées. C'est une tâche de vérification, pas un arbitrage.

**Coût assumé.** Plusieurs scores changent. C'est l'objet de la décision 2.

---

## 2. Passations antérieures : rescorage rétroactif

**Décision.** Les passations antérieures sont **recalculées** avec le barème
corrigé, pour que la série reste homogène.

**Option écartée** : estampiller la version du barème sur les passations à venir
et geler les anciennes. Le praticien a préféré l'homogénéité de la série à la
préservation de l'historique de calcul.

**Ce que cette décision engage — à lire avant d'exécuter.**

Le rescorage modifie des **données patient en production**, dont des scores
déjà restitués. Il ne peut donc emprunter aucun raccourci.

**Le dispositif d'écriture est nommé, parce qu'une migration SQL ne peut pas
faire le travail.** Recalculer `scores_json` exige `calculateScore`, qui est du
TypeScript (`web/src/lib/questions.ts`) : une migration SQL ne peut pas
l'appeler, et le réécrire en SQL dupliquerait la logique clinique — exactement
ce qu'on refuse. Le dépôt a déjà le bon chemin, celui de l'**écriture armée
depuis `web/scripts/vercel-build.sh`** (CIQUAL C5, import NABM CB-02a) :

- un **jeton de confirmation** constant, en code relu, sans lequel rien ne
  s'exécute ;
- une variable qui **nomme l'hôte visé**, pour qu'un armement ne puisse pas
  frapper la mauvaise base ;
- les **advisors Supabase** joués avant l'écriture, en échec bloquant ;
- une écriture **transactionnelle et idempotente**, et le retrait des variables
  d'armement après usage ;
- la nuance déjà documentée : un contrat en échec *après* le commit de
  l'écriture laisse l'écriture faite — un build rouge à cette étape ne veut pas
  dire « rien n'a été écrit ».

S'y ajoutent, inchangés : **revue adversariale indépendante** avant, **contrôle
de la base par `execute_sql`** après, et un **go explicite et séparé** sur ce
lot. La présente décision fixe la direction, elle ne vaut pas autorisation
d'écrire.

**Précondition, et non recommandation : conserver le score antérieur.** Écrire
sans garder la valeur communiquée fait disparaître ce qui a été dit au patient ;
sur une donnée de santé, c'est un affaiblissement du dossier, pas une préférence
de conception. La conservation est donc une **condition de l'écriture**, au même
titre que le jeton. Ce n'est pas l'estampillage écarté — qui versionnait chaque
passation à venir — mais une trace d'audit sur les seules passations touchées.

**Ce que le rescorage désaccorde, et qu'il faut traiter dans le même lot.**
Deux tables conservent les scores tels qu'ils ont été utilisés :
`SyntheseIA.donneesEntree` (`web/prisma/schema.prisma:323`), qui porte ce qui a
été envoyé au modèle, et `BookletEnvoi` (`schema.prisma:353`), qui trace ce qui
est parti au patient. Après rescorage, `questionnaire_reponses.scores_json` les
contredira sans clé pour l'expliquer. Le dossier ne « garde » pas son historique
par défaut : il devient incohérent. À traiter explicitement.

**Questions ouvertes du lot, à trancher avant le go** — elles ne sont pas
tranchées par la présente décision :

1. Un patient dont l'**interprétation change de bande** après rescorage est-il
   recontacté ? Le message clinique déjà restitué change avec le score.
2. Le lot doit-il **interdire tout re-déclenchement** côté patient pendant
   l'opération (régénération de synthèse, notification, recalcul de trajectoire) ?
3. Quel **dénombrement avant/après** — dry-run, lignes touchées par instrument —
   conditionne le go ?

**Périmètre.** Les instruments dont le barème change réellement sont à établir
un par un au moment du correctif, pas déduits d'avance : Tinetti (même total) et
`Q_GEO_04` (dimensions ajoutées) ne changent probablement aucun score.

---

## 3. `Q_ALI_01` : restaurer les 57 items

**Décision.** Le questionnaire alimentaire SIIN est restauré dans sa forme
complète à **57 items**, contre 14 servis aujourd'hui.

**Ce qui a été écarté** : assumer la forme courte et la renommer pour qu'elle
cesse de revendiquer le questionnaire SIIN complet.

**Réserve de l'audit, conservée telle quelle.** L'audit du 2026-07-26 avait
écarté cette option pour deux raisons : les 57 items ne sont pas validés, et la
passation patient s'allonge considérablement. Le praticien passe outre — c'est
son instrument et son cabinet, et un référentiel interne SIIN n'a de toute façon
pas de validation externe à opposer. La réserve est inscrite ici pour que le
prochain lecteur sache que l'écart était connu et assumé, non ignoré.

**À vérifier avant le correctif** : que les 57 items du document source sont
bien tous administrables, et ce qu'ils deviennent dans le scoring (14 items
notés aujourd'hui — les 43 autres entrent-ils au score, ou en observation ?).
Cette question n'est pas tranchée par la présente décision.

### Réserve — affiner le score après passation réelle (2026-07-27)

**Posé en réserve par le praticien, à ne pas exécuter avant l'implantation des
57 items.**

Le nouveau questionnaire sera d'abord **soumis aux patients test**, et c'est de
ces passations que viendra l'affinage du score — pas d'une décision prise
d'avance sur document. Le barème des 57 items n'est donc **pas à figer** dans le
lot d'implantation : il faut le poser dans une forme qui accepte d'être révisée,
et prévoir que la révision arrive.

**L'occasion identifiée** : produire des **sous-scores catégoriels**, en lien
avec les travaux de la boussole alimentaire
([BOUSSOLE_ALIMENTAIRE_CONTEXTE.md](../../BOUSSOLE_ALIMENTAIRE_CONTEXTE.md),
campagne C5). Un questionnaire alimentaire à 57 items porte assez de matière
pour distinguer des catégories là où 14 items n'en portaient pas — c'est le même
raisonnement que la décision 4 sur `Q_CAR_01` : un score global masque un profil.

**Ordre imposé, dans les mots du praticien** : implantation d'abord, affinage
et sous-scores ensuite. Ouvrir les deux chantiers ensemble ferait porter à la
passation test un barème qui bouge pendant qu'on le mesure.

**Ce qu'il faudra vérifier au moment venu** : que les catégories retenues
existent bien dans la source SIIN et ne sont pas inventées pour l'occasion, et
que les sous-scores n'entrent pas en collision avec les 12 besoins ni avec
`NIVEAU_PREUVE_PAR_SOURCE` — deux référentiels que la campagne C5 et la
certification tiennent déjà chacun de leur côté.

---

## 4. `Q_CAR_01` et `Q_GEO_04` : déclarer les dimensions

**Décision.** Les dimensions sont déclarées dans le scoring, pour le
questionnaire cardio-métabolique SIIN (`Q_CAR_01`) **comme pour le MMSE**
(`Q_GEO_04`). Le total ne change pas ; aucune passation n'est invalidée.

Motif : un score global masque un profil — deux patients au même total peuvent
avoir des dimensions opposées.

Les deux relèvent du même constat du dossier d'instruction (§5, « dimensions non
calculées »). Une première rédaction les séparait — `Q_CAR_01` par arbitrage,
`Q_GEO_04` par la doctrine de source — au motif que les dimensions du MMSE sont
publiées et pas celles de `Q_CAR_01`. La revue a montré que c'était deux régimes
pour une seule question : la doctrine de source ne dit rien sur l'opportunité de
**calculer** une dimension, elle dit seulement laquelle fait foi si deux sources
divergent. Ils sont donc tranchés ensemble, ici.

---

## 5. Le champ `protocol` sort des bandes de scoring

**Décision.** Les conduites cliniques logées dans le champ `protocol` des bandes
d'interprétation (« urgence », « danger ») migrent vers un **champ distinct,
praticien**, et **cessent d'être envoyées au modèle** de synthèse.

**Instruments concernés : 12, pas 11.** `Q_ALI_01`, `Q_ALI_02`, `Q_CAR_01`,
`Q_GEO_01`, `Q_GEO_02`, `Q_GEO_03`, `Q_GEO_04`, `Q_NEU_02`, **`Q_NEU_06`**,
`Q_SOM_04` (IRLS), `Q_STR_01`, `Q_TAB_04`. Le douzième — `Q_NEU_06`,
questionnaire cognitif SIIN — manquait aux deux listes antérieures alors qu'il
porte quatre `protocol`, dont
`'Orientation neurologue ou gériatre — bilan approfondi urgent'`
(`web/src/lib/questionnaires/neuropsychologie.ts:524-527`). Un correctif fondé
sur la liste de 11 l'aurait laissé en place.

**Deux `protocol` ne sont pas dans des bandes** et échapperaient à un correctif
qui ne viserait que le catalogue : Berlin les produit dynamiquement dans
`calculateScore` (`web/src/lib/questions.ts:2113` et `:2115`), et `Q_STR_01` en
injecte un au vol (`questions.ts:1782`).

### Le correctif de catalogue ne suffit pas — il faut un filtre en lecture

**Le fait, vérifié.** Le score complet est figé à la soumission dans
`scores_json` (`web/src/app/api/patient/submit/route.ts`), objet
`interpretation.protocol` compris. La synthèse repasse ensuite l'objet entier au
modèle : `buildUserMessage` sérialise `scores: r.scores`
(`web/src/app/api/praticien/synthese/route.ts:55-68`). Déplacer le champ dans le
catalogue ne change **rien** pour les passations déjà enregistrées : elles
continueraient d'envoyer `protocol` au modèle, indéfiniment.

**Décision complémentaire du praticien (2026-07-27)** : un **filtre en lecture**,
qui retire `protocol` de `scoresJson` avant construction du message. Aucune
écriture en base, aucune donnée patient touchée, effet immédiat sur tout
l'historique. L'option « filtre + nettoyage des données enregistrées » a été
écartée : elle imposerait une écriture sur données patient en production pour un
gain nul si le filtre fait son travail.

**Une précision de vocabulaire qui compte.** « Non transmis au prompt patient »
était ambigu : le seul prompt qui consomme les scores est celui de la **synthèse
praticien** — dont la sortie est ce qui parvient au patient. C'est donc bien
celui-là qu'il faut filtrer.

**Aucun score ne change.** Ce qui change, c'est qu'une conduite qui ne vient pas
de l'instrument cesse de voyager avec son barème — et donc d'atteindre le
patient sous l'autorité apparente de l'échelle.

---

## 6. `LOT_006` / notebook 13 : pilote de 10 sources avant d'engager les 106

**Le lot n'était pas orphelin, il était à moitié exécuté.** Les 140 chunks du
`LOT_006_2026-07-26` sont les **106 instruments du cabinet** (notebook
« 13 — Instruments du cabinet »), et la **décision A du 2026-07-26** de la
campagne certification écrit que « les claims entrent en
`EN_ATTENTE_VALIDATION`, comme tout le reste du corpus ». Le verbatim est passé,
les claims jamais.

**Décision.** Un **pilote de 10 sources** d'abord, dont on mesure le taux
d'exclusion. Si le pilote confirme l'inquiétude ci-dessous, c'est la décision A
qu'il faudra amender, pas le pilote qu'il faudra forcer.

**Le dénominateur, puisqu'il y en a deux.** Le registre compte **116 sources**
sous le notebook 13 ; **106** sont ingérées dans `LOT_006`. Le pilote porte sur
10 des 106 ingérées — les 10 restantes du registre sont un écart distinct, à
constater avant de conclure quoi que ce soit sur la couverture.

**Ce que le pilote doit rendre pour être concluant** : un **critère d'arrêt
chiffré**, fixé *avant* de le lancer. Sans seuil annoncé d'avance, un taux
d'exclusion quelconque se relira comme un succès.

**Le fait qui motive la prudence.** Sur le `LOT_007` (notebook 08), les deux
seuls chunks de nature *questionnaire* — `WN-CH-0049-002` et `WN-CH-0049-006`,
exploration dimensionnelle des neurotransmetteurs — ont produit 7 claims chacun,
**14 sur 14 exclus pour infidélité** : le rédacteur transformait des intitulés
de sections (« SÉROTONINE », « DOPAMINE ») en énoncés de causalité absents de la
source. Le contre-vérificateur les a tous arrêtés. Un instrument n'est
peut-être pas une source de connaissance : c'est ce que le pilote doit dire.

**Ordre d'exécution rappelé** : chunks avant claims (déjà fait ici), et
`--lot 16` contre la production — 64 dépasse le timeout de transaction Prisma.

---

## 7. Rayon corpus C4 : filtrer par notebook, pas par `metadata.rayon`

**Décision.** `servirRayonCorpus` filtre sur le **notebook** de la source, via
`sourcesDuNotebook()`
([notebooks.ts](../../../../web/src/lib/rag/claims/notebooks.ts)), et non plus
sur `metadata.rayon`
([rayonCorpus.ts:69](../../../../web/src/lib/supplement-library/rayonCorpus.ts#L69)).

**Le défaut, mesuré.** `rayonCorpus.ts` sélectionne les claims sur
`metadata.rayon` — un champ qu'**aucun des 2 993 claims du corpus ne porte**
(0 sur 2 993, vérifié en production). Le rayon filtre donc à zéro **en
permanence, pour tous les rayons**, et affiche « corpus en cours de
constitution » : honnête en apparence, faux en fait.

Le commentaire en tête du fichier dit « le corpus reste VIDE tant que le
notebook 10 — Micronutrition et compléments n'est pas ingéré ». **Il l'est
depuis le 2026-07-24** (`LOT_003` et `LOT_004`, 25 sources). Et **305 des 618
claims validés du corpus en proviennent** : du travail de validation déjà fait,
signé, qui n'arrive pas à l'étagère.

**Pourquoi le notebook plutôt que le champ.** Le notebook est déjà l'unité
d'organisation du corpus — le registre des sources le porte, `notebooks.ts`
expose déjà la primitive, la file de revue s'en sert. Le brancher dessus ne
demande **ni migration, ni backfill**. Produire `metadata.rayon` dans la chaîne
aurait imposé les deux, plus la maintenance du champ.

**Les deux vérifications qui comptent** (2026-07-27) :

- `match_wellneuro_rag_claims` **retourne déjà `source_id`** dans son
  `RETURNS TABLE` — `rayonCorpus.ts` ne le sélectionne simplement pas. Aucune
  modification de la fonction SQL n'est donc nécessaire, et la barrière D-003
  n'est pas approchée.
- **La jointure registre ↔ base est établie** : les `source_id` des claims
  validés ont été rapprochés de `source_registry.json`, et **305 des 618 claims
  validés** relèvent de sources dont le `primaryNotebook` vaut exactement
  « 10 — Micronutrition et compléments » (les 313 autres relèvent du notebook
  09). C'est cette jointure, et elle seule, qui décide du résultat du correctif.

**Deux « preuves » écartées, parce qu'elles n'en sont pas.** Une première
rédaction s'appuyait sur « les 2 993 claims portent tous un `source_id` » et
« les 658 chunks portent tous un `notebook` ». Ce sont des **invariants de
schéma** (`NOT NULL` en migration), pas des constats de production : ils
n'auraient pas pu être faux. Pire, le second ne porte pas sur le chemin
emprunté — `sourcesDuNotebook()` lit le **JSON du registre importé
statiquement** (`notebooks.ts:1`), jamais la colonne `rag_corpus_chunks.notebook`.

**Ce que le correctif crée, et qu'il faut garder à l'œil.** Après bascule, le
notebook d'une source est porté à deux endroits : la colonne
`rag_corpus_chunks.notebook` en base, et `primaryNotebook` dans le JSON bundlé.
Deux porteurs du même fait, sans réconciliation. Le lot doit donc apporter **un
garde de divergence** — test ou contrat SQL qui échoue si un `source_id` présent
dans `rag_corpus_claims` est absent du registre, ou si son `primaryNotebook`
diverge du `notebook` du chunk correspondant. Sans lui, la phrase « aucune
seconde source de vérité » serait fausse.

### Ce que le lot doit trancher, et qui n'est pas un simple ajout de colonne

Le rayon rend zéro depuis sa livraison : **rien de son comportement sur un
résultat non vide n'a jamais été exercé**. La bascule allume donc une surface
clinique pour la première fois.

- **Le filtre passe d'un tag par claim à un tag par notebook entier** (30
  sources pour le notebook 10). La pertinence ne repose plus que sur
  `minSimilarity = 0.5` et `matchCount = 24` (`rayonCorpus.ts:94-95`), jamais
  éprouvés. Prévoir de mesurer avant de s'y fier.
- **`rayonCorpus.ts` ne filtre pas `prescriptif`.** Aujourd'hui zéro claim
  masque ce fait ; après bascule, des claims prescriptifs du notebook 10
  s'afficheront à côté d'une fiche complément. À décider explicitement.
- **La modalité de validation n'est pas affichée.** Le panneau montre chaque
  claim avec « validé par &lt;praticien&gt; », sans distinguer un claim relu pièce à
  pièce d'un claim signé par lot au titre d'un échantillon de 20 % — alors que
  `VALIDATION_CLAIMS_DEUX_VITESSES.md` impose que la modalité reste
  distinguable en audit.
- **Un seul test casse** : `rayonCorpus.test.ts` (« ne restitue que les claims
  du rayon demandé »), plus sa fixture à doter d'un `source_id`. Les tests de la
  route et du panneau mockent la couche du dessous et ne bougent pas.
- **Cas limites à couvrir** : source absente du registre (exclusion silencieuse
  ou anomalie remontée ?), notebook sans aucune source (liste vide ⇒ résultat
  vide, **jamais** filtre ignoré), et bump de `contractVersion` si la sémantique
  du champ `rayon` change.

**La barrière D-003 n'est pas touchée.** La seule voie de récupération reste
`match_wellneuro_rag_claims`, qui n'expose qu'un claim validé, actif, non
patient, adossé à un verbatim. Le changement porte sur le filtre appliqué **en
aval** de cette fonction, jamais sur la fonction. La surface reste praticien
seule, derrière `WN_C4_ENABLED` fail-closed.

**La barrière D-003 n'est pas touchée.** La seule voie de récupération reste
`match_wellneuro_rag_claims`, qui n'expose qu'un claim validé, actif, non
patient, adossé à un verbatim. Le changement porte sur le filtre appliqué **en
aval** de cette fonction, jamais sur la fonction.

**Correspondance rayon → notebook** à figer au moment du lot : `micronutrition`
→ « 10 — Micronutrition et compléments ». Les autres rayons se déclareront de
même.

---

## 8. Voie lente biologie : c'était une intention, elle sort du cadrage

**Décision.** Les claims de biologie suivent le **même régime de validation** que
le reste du corpus. La « voie lente **par notebook** » disparaît du cadrage CB.

**Requalification après revue — la voie lente existe, et ma première rédaction
la disait inexistante.** C'était faux, et l'erreur affaiblissait un garde
clinique en le décrivant comme absent. Le garde est bien là, seulement **clé sur
la typologie du claim** et non sur le notebook : `revue.ts:418-435` pose une
allowlist stricte — seuls `déclaré` et `observé` **non prescriptifs** passent en
voie rapide, `interprété` et `vécu` tombent en voie lente, « une typologie
nouvelle ou oubliée tombe du côté prudent ». Elle est redondée par un trigger
d'insertion, et l'échantillonnage (30 % en rodage, 20 % ensuite) disqualifie le
lot entier au premier défaut.

**Ce qui a réellement été infirmé, c'est la prémisse du cadrage CB.** Il
annonçait que les claims biologiques (plages, interprétations) *seraient*
prescriptifs ou interprétés, donc automatiquement en voie lente. La
classification obtenue dit autre chose : **563 des 758 claims (74 %) sont
étiquetés `déclaré` ou `observé` non prescriptifs**, donc éligibles à la voie
rapide. Le cadrage ne promettait pas un garde inexistant — il pariait sur une
nature de claims que la mesure ne confirme pas.

**Et ce constat a deux lectures, toutes deux ouvertes.** Soit les claims de
biologie ne sont effectivement pas prescriptifs ; soit **le rédacteur les
sous-étiquette**. La typologie et le champ `prescriptif` sont produits par le
LLM rédacteur lui-même (`tools/corpus/claims/draft.mjs:55, 185-186`) et repris
tels quels. Retenir la première lecture sans preuve reviendrait à faire de
l'auto-étiquetage d'un modèle le seul gate avant une signature de lot
échantillonnée à 20 % — pour des claims qui alimenteront les seuils de
`orientationBiologieRulesV1.ts`.

**Décision complémentaire du praticien (2026-07-27) : auditer un échantillon
avant d'y toucher.** Une trentaine des 563 claims étiquetés non prescriptifs
sont relus pour vérifier qu'aucune plage de référence ni seuil clinique ne s'y
cache. C'est cet audit qui dira laquelle des deux lectures est la bonne — et
donc s'il faut, ou non, un garde par **destination** (tout claim compilé en
règle d'orientation passe en revue individuelle) plutôt que par typologie.

Option écartée pour l'instant : outiller un garde par notebook, qui aurait
demandé un lot avant CB-04 sans qu'on sache encore s'il répond au bon problème.

---

## 9. Correspondance signée dont l'acte NABM disparaît

**Décision.** Statut « **signature orpheline** » et **file de reprise**. À poser
avant CB-02c.

Motif : sans cela, une analyse que vous avez signée comme remboursée devient
silencieusement non remboursée, et le patient s'entend dire qu'elle est
couverte alors qu'elle ne l'est plus. Le silence de `hors_nomenclature` fait
porter votre signature sur autre chose que ce qui est servi, sans vous le
signaler.

---

## 10. Régime documentaire entre `signee` et `courrier_medecin_genere`

**Décision.** Le régime est **figé à la signature**, et la génération
**s'interrompt** si le pointeur NABM a bougé dans l'intervalle : la proposition
revient au praticien au lieu de se matérialiser sur un état périmé.

Les deux options écartées avaient chacune leur angle mort : figer sans contrôle
produit un document annonçant un remboursement qui n'existe plus ; recalculer à
la génération produit un document qui diffère de ce qui a été signé, sans que le
signataire le sache.

---

## 11. `biology_source_snapshots` : le CHECK reste fermé

**Décision.** La contrainte reste restreinte à `nabm_smt_ans`. L'élargir à une
source `labo` restera une **migration relue**.

Motif : `contenu` est du texte libre, et le verrou HDS raisonne sur des **noms
de colonnes** — il ne peut pas inspecter ce qu'on y déposerait. Fermer par
défaut est ce qui empêche une donnée patient d'y entrer par inadvertance avant
l'attestation d'hébergement (échéance 2026-10-21).

---

## Ce qui reste ouvert après cette passe

Cette liste a doublé après la revue adversariale : quatre points y sont entrés
parce que le document les présentait à tort comme réglés.

- **QLQ-BR23 `Q_CAN_02` — rouvert.** Compté à tort parmi les décisions de la
  doctrine alors que la règle EORTC reste à lire. À trancher ensuite.
- **Berlin `Q_SOM_03` — à rejouer au banc avant tout correctif.** Le constat
  disponible est antérieur à la correction du comparateur, et la version de
  l'instrument n'est pas établie.
- **Audit d'une trentaine des 563 claims biologie** étiquetés non prescriptifs
  (décision 8) — c'est lui qui dira si l'étiquetage LLM peut servir de gate.
- **Garde de divergence registre ↔ base** pour la décision 7, sans lequel le
  notebook aurait deux porteurs sans réconciliation.
- **MFI-20** `Q_SOM_07` — arbitrage traité dans une autre session. À noter : la
  question (c) du cadrage certification est close *comme doctrine*, mais le cas
  qui l'avait motivée reste pendant.
- **Fidélité de l'algorithme PSQI** aux sept composantes publiées — tâche de
  test de référence, à programmer.
- **Les trois questions du lot de rescorage** (décision 2) : recontact en cas de
  changement de bande, gel des déclenchements côté patient, dénombrement
  avant/après comme condition de go.
- **Sort des 43 items non notés de `Q_ALI_01`** — score ou observation
  (décision 3).
- **Affinage du score `Q_ALI_01` après passation test, et sous-scores
  catégoriels adossés à la boussole alimentaire** — posé en réserve le
  2026-07-27, **après** l'implantation des 57 items (décision 3, réserve).
- Les **15 sources sans mention de droits** et les **7 sources SIIN + tiers**
  restées à `a_verifier` au registre (décision B du 2026-07-26).
- Le CI ne lance jamais `npm ci` dans `tools/corpus` : une régression de
  verrouillage y repasserait sans bruit (constat de la revue du `LOT_007`).
