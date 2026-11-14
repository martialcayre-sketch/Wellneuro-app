# Surface de relecture — `SAF-QUEST-02` (D-515, D-522, H59)

Cette surface est produite le 2026-11-14, **avant** la demande de signature
([[D-195]] §2). Elle sert à la PR 4 du lot de code de [[D-515]] §6.2.

- **Table** : `web/src/lib/clinical/safetyQuestionnaireCabinetV1.ts`, version
  `safety-questionnaire-cabinet-nnpp2-v1`, livrée **non signée** par #2112.
- **Textes** : `web/src/lib/clinical/safetyQuestionnaireCabinetTextes.ts`, plus
  trois textes importés de `SAF-QUEST-01`, déjà signés.
- **SHA du périmètre** à la production de cette surface, calculé sur
  `main` @`eb454046` :
  `6c0d224fcc47dc115ecb2097ffbbd6a0956ff2f3491337ac5895b9b4c0b4a604`.
  Il couvre les sections 1 à 3. La signature porte sur ce SHA : retoucher un
  seul des textes ci-dessous en change la valeur, et la déclaration serait à
  redonner.
- **Ce qui ne bouge pas** : la table `SAF-QUEST-01` reste identique à
  l'octet, avec son SHA `eb350485…` et sa signature du 2026-10-10.

## 1. Le mécanisme — ce que la signature active

Il s'agit de [[D-515]] §1, §2, §4 et §7, sans rien y ajouter. Le fichier signé
ne porte que des codes ([[D-251]]).

| Code | Clause | Ce qu'il dit |
|---|---|---|
| `source: assignation.question_suicide_copie` | §4 | La règle lit la **copie** prise sur l'assignation à l'envoi, jamais l'instrument, qui reste modifiable. |
| `lecture: question-designee-contre-valeur-non` | §1 | Seule la question désignée par le praticien est lue, et comparée à la valeur « non » copiée. Les autres questions de l'instrument ne sont pas lues. |
| `constat: toute-valeur-autre-que-non` | §2 | Toute valeur autre que la valeur « non » produit un constat de rang `adressage`, la plus légère comprise. Une valeur absente des options copiées en produit un aussi (fail-closed). |
| `passations: a1-toutes-sauf-invalid` | §2, A1 | Toute passation non invalidée compte. Seul le statut `INVALID` en retire une. |
| `illisible: a2-limitation` | §2, A2 | Une question sans réponse lisible produit une limitation, sans constat ni blocage. |
| `designationAbsente: d515-7-limitation` | §7 | Un instrument déclaré « oui » dont l'assignation ne porte pas de désignation lisible produit une limitation, sans constat ni blocage. L'absence n'est jamais lue comme « non » ni reconstituée depuis l'instrument. |

Ce que la règle lit, et rien d'autre : une passation d'un instrument du
cabinet (`CAB_`) dont l'assignation porte la copie de déclaration « oui ». Ne
sont pas lus : le catalogue (déjà couvert par `SAF-QUEST-01`), un `CAB_`
déclaré « non » et un `CAB_` non déclaré.

Il n'y a aucune gradation, aucun seuil, aucun score (`DC-19`, `DC-23`).

**Les effets d'un constat** sont ceux d'un constat `SAF-QUEST-01`
([[D-515]] §5, amendé par [[D-522]] §1) :

- **inhibition totale** : la priorité et le protocole restent suspendus
  jusqu'à une lettre d'adressage qui couvre le constat ([[D-257]]). Un « non »
  ultérieur ne lève rien ;
- **carte du Fil** « Signal de sécurité à évaluer » ;
- **lettre d'adressage** qui cite la réponse depuis la copie (section 4) ;
- **courriel au praticien** de [[D-277]] §2, texte signé inchangé ;
- **message au patient** de [[D-277]] §1, texte signé inchangé, sous la
  question désignée et sur le récapitulatif.

Les deux textes de [[D-277]] et l'encart de [[D-275]] sont déjà signés : ils
sont repris mot pour mot et ne sont pas relus ici.

## 2. Ce que le praticien lit sur un constat (cockpit, phase Décision)

La conduite est **recopiée** du rang `adressage` de la table d'anamnèse,
signée le 2026-08-23. Aucun texte de conduite neuf :

> Signal d'alerte signalé par le patient : avis médical à évaluer en priorité,
> avant toute proposition de priorité ou de protocole.

Exemple de `rationale`. L'instrument, l'énoncé et le libellé sont des exemples
neutres :

> Signal d'alerte signalé par le patient : avis médical à évaluer en priorité,
> avant toute proposition de priorité ou de protocole. Réponse au questionnaire
> « Suivi du moral » du 2026-11-20, à la question « Avez-vous eu des idées
> noires ces derniers jours ? » : « Parfois ». Passation : REP-A.

Une valeur hors options s'écrit « … : valeur hors des options de la
question. » La valeur brute n'est jamais recopiée. Un énoncé vide dans la copie
se cite par l'identifiant de la question.

## 3. Les textes fixes (dans le SHA)

### 3.1 Textes neufs, rédigés par l'assistant, à relire

- **La mention « écrit par le praticien »**. Elle s'ajoute à chaque constat
  dans le dossier, et figure en pied de la lettre derrière le signe (§) :

  > L'instrument, l'énoncé de la question et le libellé de la réponse sont ceux
  > d'un questionnaire écrit par le praticien du cabinet, cités tels qu'ils ont
  > été envoyés au patient : ils n'ont pas fait l'objet d'une relecture
  > clinique.

- **Réponse illisible (A2)**. Une limitation par instrument, sans constat :

  > {n} passation(s) de {instrument} ne portent aucune réponse lisible à la
  > question que le praticien a désignée comme portant sur le suicide : rien
  > n'est conclu, et la question reste à poser au patient.

- **Désignation inconnue ([[D-515]] §7)**. Une limitation par instrument, sans
  constat :

  > {n} passation(s) de {instrument} n'ont pas pu être lues : l'instrument est
  > déclaré poser une question sur le suicide, mais la question désignée n'a pas
  > pu être relue dans la copie prise à l'envoi. Rien n'est conclu, ni « non »
  > ni constat, et la question reste à poser au patient.

`{n}` et `{instrument}` sont les seules substitutions. Le nom de l'instrument
s'y écrit entre guillemets « ».

### 3.2 Textes repris de `SAF-QUEST-01`, déjà signés, inchangés

Ils entrent dans ce SHA pour que leur retouche referme aussi ce verrou :

- la conduite (section 2) ;
- **provenance**, sur chaque constat : « Ce constat provient d'une réponse de
  questionnaire. Toute passation non invalidée compte, même hors de l'épisode
  confirmé : une réponse « non » ultérieure ne le lève pas, seule une lettre
  d'adressage qui le couvre, ou l'invalidation de la passation, le fait. » ;
- **hors options**, ajouté au constat : « La valeur enregistrée ne correspond à
  aucune option de la question : faute de savoir ce qu'elle dit, elle est
  traitée comme une réponse autre que « non » plutôt qu'ignorée. » Voir le
  point 5.4 pour une option écartée hors int4.

## 4. La lettre d'adressage (textes hors SHA, comme pour `SAF-QUEST-01`)

**Une lettre sans réponse d'un `CAB_` ne change pas d'un caractère**, avec la
même version d'ancrage. Un banc le vérifie sur une empreinte figée.

Une lettre qui cite au moins une réponse d'un `CAB_` porte la version
`safety-signals-questionnaire-cabinet-v1`. Elle est ancrée sur le SHA des
**trois** tables (anamnèse, `SAF-QUEST-01`, `SAF-QUEST-02`). Que l'une bouge,
et la lettre se lit périmée. Les libellés du praticien n'entrent pas dans
l'ancrage.

Ce qui change dans le texte :

- **la ligne de la réponse**, sous l'intitulé existant « Réponses du patient à
  la question sur les idées de mort ou de suicide : » :

  > — questionnaire « Suivi du moral » (§), passation du 2026-11-20, question
  > « Avez-vous eu des idées noires ces derniers jours ? » : « Parfois »

- **le pied** : « (§) » suivi de la mention de la section 3.1.

Une valeur hors options s'écrit, sur la même ligne, « … question « … » :
valeur hors des options de la question (‡) ». Le paragraphe que signale le
signe (‡) est celui de la lettre de `SAF-QUEST-01`, repris sans changement et
sans variante pour les `CAB_` :

> Pour une ou plusieurs des réponses ci-dessus (‡), la valeur enregistrée ne
> correspond à aucune option de la question : faute de savoir ce qu'elle dit,
> elle est traitée comme un adressage plutôt qu'ignorée.

Les autres paragraphes sont ceux de la lettre de `SAF-QUEST-01`, déjà relus le
2026-10-10 : ouverture, conduite, provenance, abstention, information et
signature. Si la question `20261114-2146-a` reçoit la réponse B, une variante
de ce paragraphe propre aux `CAB_` le remplace pour leurs seules réponses.

La garde non prescriptive de la lettre (`terme_prescriptif`) **reste active**.
Depuis #2130 (réponse `20261114-1217-a`), le même jugement s'applique en amont :
à la publication, à la déclaration et à la modification des métadonnées d'un
instrument déclaré « oui », drapeau allumé. Un libellé qui ferait refuser la
lettre est donc refusé dès sa saisie, avec le champ fautif nommé. La garde de
la lettre demeure le dernier filet (point 5.6).

## 5. À lire avant de signer

### 5.1 Ce que la signature ne couvre pas ([[D-515]] §3)

Elle ne couvre **pas les libellés du praticien** : le nom de l'instrument,
l'énoncé de la question désignée et les libellés des options. Ils changent
d'un instrument à l'autre et ne sont pas relus par le responsable. Ils sont
cités tels qu'ils ont été envoyés, sous la mention de la section 3.1. Le seul
contrôle automatique est le vocabulaire non prescriptif de #2130.

Elle ne juge pas davantage **le choix de la question**. C'est le praticien qui
déclare qu'un instrument pose une question sur le suicide, puis désigne
laquelle et sa réponse « non » ([[D-303]], [[D-493]]). Une désignation
erronée (mauvaise question, mauvaise valeur « non ») produit des constats à
tort ou en manque. L'encart permanent de [[D-275]] reste le filet.

### 5.2 Après une extinction du drapeau : la carte disparaît, le courriel continue ([[D-522]] §3)

Le courriel d'un `CAB_` **ne relit pas le drapeau courant**. Il part quand
trois conditions sont réunies :

- l'assignation porte une copie « oui » et une désignation lisible ;
- la valeur transmise est autre que « non », ou hors options ;
- la table est signée.

Après une extinction volontaire, une réponse positive à un `CAB_` déjà envoyé
fait donc encore partir le courriel. Mais son texte signé dit « Elle figure en
tête de votre Fil du jour », et le Fil, qui suit le drapeau, n'en montre plus
la carte. Il ne reste au praticien que la ligne de journal du dossier. Dans le
même temps, l'extinction lève tout constat `SAF-QUEST-02` ouvert : priorité et
protocole se débloquent. **Éteindre n'est pas le geste prudent.** Une
extinction complète (cartes, messages, courriels) passe par un lot dédié,
préparé avant l'`env-set` ([[D-522]] §4).

### 5.3 Le seul cas restant d'un message sans courriel ([[D-522]] §5)

Le message au patient se décide à l'ouverture de la page. Le courriel se
décide à la transmission. Les deux lisent la même copie et la même signature,
et le banc navigateur ↔ serveur les confronte option par option, sur les
quatre combinaisons du drapeau à l'ouverture et à la transmission.

Un seul cas peut encore laisser « votre praticien sera prévenu » sans
courriel : un **retrait de la signature** déployé entre l'ouverture de la page
et la transmission, c'est-à-dire une PR qui annulerait celle-ci. Un échec
d'envoi, lui, n'est pas un silence : il se trace au journal ([[D-277]] §3).

### 5.4 Une option écartée hors int4 et le texte « hors options »

C'est la réponse `20261114-1112-a`, option 1, qui n'est pas reposée ici. La
colonne de la valeur « non » est un `INTEGER`, mais la validation des options
admet tout entier (`web/src/lib/instruments.ts`). Une option hors de
±2 147 483 647 n'est ni proposée à la désignation ni copiée. Une réponse qui la
porte est donc « hors options », d'où un constat (fail-closed) sans libellé
cité.

Le texte signé repris de `SAF-QUEST-01` dit alors « La valeur enregistrée ne
correspond à aucune option de la question ». **C'est inexact dans ce
cas** : le patient a vu cette option, puisque la définition servie est celle
de l'instrument (point 5.5). Le constat est juste, seule l'explication est
fausse. Le même écart se produit dans le résidu du point 5.5, quand une
option ajoutée après l'envoi est choisie. Le paragraphe (‡) de la lettre
(section 4), hors SHA, dit la même chose. Retoucher ce texte changerait aussi le SHA de `SAF-QUEST-01`, ce qui
est interdit. Le cas n'existe pas en production : 0 instrument du cabinet
actif (point 6). La question est posée au responsable (section 7).

### 5.5 La définition servie est vivante, la copie est figée

Le patient répond sur la définition **courante** de l'instrument
(`resolveDefinition(…, { pourPassation: true })`). La règle, le message et le
courriel lisent la **copie** prise à l'envoi. Tant que les deux concordent, il
n'y a pas d'écart. Elles concordent dans les cas suivants :

- **Contenu gelé pendant un envoi en cours.** Une modification des questions
  ou de la grille est refusée (409 `envoi_en_cours`) tant qu'une assignation
  de l'instrument n'est pas `verrouille`. Drapeau allumé, ce comptage se fait
  sous verrou `FOR UPDATE`, en conflit avec le `FOR SHARE` de l'envoi.
- **Modification ⇒ redéclaration.** Une modification du contenu efface la
  déclaration et repasse l'instrument en brouillon. Les envois suivants
  copient la désignation nouvelle.

**Le résidu** passe par le **déverrouillage**. Le scénario :

1. une assignation est `verrouille` (réponse transmise) ;
2. le praticien modifie ensuite l'instrument, ce qui est permis puisque plus
   rien n'est en cours ;
3. il déverrouille l'assignation (`statutReponses: 'deverrouille'`) ;
4. le patient répond de nouveau, sur la définition nouvelle, et la règle lit
   l'ancienne copie.

Selon la modification, l'écart va dans les deux sens :

- **constat de trop** : la valeur choisie n'existe pas dans la copie, ce qui
  donne « hors options », donc un constat ;
- **constat manqué** : les options ont été renumérotées et une réponse
  positive porte désormais la valeur « non » copiée, ou bien la question sur
  le suicide a changé d'identifiant, et la règle lit une autre question.

Le message et le courriel restent d'accord entre eux, puisqu'ils lisent la
même copie. L'encart permanent reste affiché. Le cas n'existe pas en
production (point 6). La question est posée au responsable (section 7).

### 5.6 Le résidu de bascule du drapeau (`wn-reviewer` de #2130, P3-4)

Prenons un instrument déclaré « oui » drapeau allumé, puis modifié drapeau
éteint. Drapeau éteint, une modification n'efface pas la déclaration et
échappe à la garde des libellés de #2130. Au rallumage, l'envoi copierait des
questions et des libellés que personne n'a jugés. La reprise déjà prescrite
avant tout rallumage le couvre (`docs/FEATURE_FLAGS.md`) : repasser en
`grille_a_relire` les instruments `valide`, par migration relue puis
release-db, jamais par SQL manuel. Chacun repasse alors par la publication,
donc par la déclaration et par la garde. Ce point ne concerne pas le premier
allumage, puisque le drapeau n'a jamais été allumé en production.

### 5.7 Une passation `CAB_` sans assignation retrouvée (`DC-24`)

C'est la question de `wn-reviewer` sur #2112. La jointure ne lit pas une
passation `CAB_` dont l'assignation est introuvable ([[D-515]] §1 : seule une
copie « oui » est lue). Faut-il une limitation au titre de `DC-24` ?

Le cas est **vide par construction**, vérifié dans le code :

- la seule route qui écrit une passation `CAB_` est `api/patient/submit`. Elle
  exige l'identifiant d'assignation, relit l'assignation et écrit cet
  identifiant sur la passation ;
- les deux autres écrivains de passations (agenda du sommeil, agenda
  alimentaire) n'écrivent pas de `CAB_` ;
- la seule suppression d'assignation est l'effacement d'un dossier
  (`lib/patient/effacement.ts`). Il supprime les passations dans la même
  transaction.

Aucune limitation n'est proposée : elle viserait un état que l'application ne
produit pas. Si un écrivain nouveau rendait ce cas possible, il faudrait le
rouvrir.

### 5.8 Le sens du verrou

Comme pour `SAF-QUEST-01`, le verrou a le **sens inverse** des autres : tant que
la table n'est pas signée, aucun constat n'est produit, et la revue dit
« Règle candidate inactive : SAF-QUEST-02. » sur les seuls dossiers qu'une
réponse ou une limitation concerne. Signer **active** l'inhibition. Le drapeau
`WN_ENABLE_DECLARATION_SUICIDE_CAB` reste éteint après la signature :
l'allumage est un geste distinct du responsable, après le recomptage de
[[D-515]] §6, étape 3.

### 5.9 Effet sur les cartes déjà diffusées

Une carte de décision ne change d'empreinte que si une réponse ou une
limitation `SAF-QUEST-02` concerne le dossier. Un dossier sans `CAB_` déclaré
« oui » garde l'empreinte d'avant, au caractère près (banc). Comme pour
`SAF-QUEST-01`, une réponse positive ou une limitation ajoutée après une
diffusion rend la carte dérivée, et l'écran du protocole s'interrompt jusqu'à
une nouvelle décision.

## 6. Constat de production

Lecture seule par conteneur, en agrégats, le 2026-11-14, faite pendant le lot
de #2130 :

- 0 instrument du cabinet actif, donc 0 publié et 0 déclaré « oui » ;
- 0 assignation `CAB_` envoyée.

À la signature, **aucun dossier existant ne change d'empreinte** et aucun
n'est bloqué. La signature seule ne produit rien en production : le drapeau
est éteint, et aucune copie « oui » n'existe. Le recomptage des `CAB_` à copie
NULL ([[D-515]] §6, étape 3) se refait juste avant l'allumage.

## 7. Questions au responsable, avant la signature

Elles sont posées dans la liste commune (`docs/ROLES_MACHINES.md`), avec leurs
faits, leurs options et l'avis de Codex joint ([[D-505]]) :

- **`20261114-2145-a`**, le résidu du déverrouillage (point 5.5). Options :
  - A, l'accepter sans lot ;
  - B, un lot qui refuse le déverrouillage quand la copie ne concorde plus.
    Il passe **avant l'allumage**, et la signature ne l'attend pas ;
  - C, le même lot, avant la signature.

  L'assistant recommande B. Codex retient B, avec une confiance forte.
- **`20261114-2146-a`**, le texte « hors options » (point 5.4). Options :
  - A, garder le texte signé de `SAF-QUEST-01` ;
  - B, un texte propre à `SAF-QUEST-02`, « … aucune option de la question
    telle qu'elle a été copiée à l'envoi … », avec sa variante dans la lettre.

  L'assistant recommande B. Codex retient B, avec une confiance forte. Sous
  B, le SHA change avant la signature, et cette surface est amendée.

La signature attend leurs réponses, puis la **déclaration écrite du
responsable** sur le SHA de la page de tête, ou sur le SHA neuf si une réponse
change un texte. Après elle, la PR de signature :

- pose `validationExterne`, `dateValidation`, `sourceReference` et le SHA en
  littéral ;
- inscrit la table dans `shaPerimetreLitteral.guard.test.ts` ;
- inverse l'E2E `portail-cabinet-designation-suicide.spec.ts`, pour que la
  désignation soit servie et que le message paraisse ;
- corrige le commentaire de `alerteSecuritePraticien.ts` vers [[D-522]].
