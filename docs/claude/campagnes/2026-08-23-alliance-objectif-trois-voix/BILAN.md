# Bilan — Alliance 6.0-B, « l'objectif à trois voix »

*Constaté le 2026-08-26. Chaque affirmation chiffrée vient d'une lecture de
production par conteneur one-off, par identifiants seuls.*

> **Ce bilan a été relu en production le 2026-09-12** — voir la section
> « Relecture du 2026-09-12 » en fin de document. Les chiffres qui suivent sont
> ceux du 2026-08-26 et **ne décrivent plus la production** : les neuf tables
> n'y sont plus vides, et les zéro `T0` confirmés sont devenus sept. Le texte
> d'août n'est pas corrigé — il était exact à sa date, et c'est l'écart entre
> les deux lectures qui instruit.

## Ce que le bilan doit dire avant tout le reste

**L'appareil est complet et n'a jamais servi.** Les six lots sont livrés,
déployés, appliqués en base. Les neuf tables de la campagne portent **zéro
ligne**. Aucun praticien n'a rédigé d'objectif négocié, aucun patient n'a
ratifié, contesté, reformulé ni dit où il en était.

Ce n'est pas un échec de la campagne : c'est le fait qui commande tout ce qui
suit, et notamment l'impossibilité de signer le classement.

## Les constats

### Volumes de production (conteneur one-off, 2026-08-26)

| Table | Lignes | Dossiers distincts |
|---|---:|---:|
| `objectifs_negocies` | 0 | 0 |
| `propositions_objectif` | 0 | 0 |
| `dispositions_proposition` | 0 | — |
| `ratifications_objectif` | 0 | 0 |
| `amendements_objectif` | 0 | 0 |
| `reponses_jalon_objectif` | 0 | 0 |
| `ce_qui_compte_entrees` | 0 | 0 |
| `syntheses_comprehension` | 0 | 0 |
| `desaccords_comprehension` | 0 | 0 |

### Contexte du dossier patient

| Mesure | Valeur |
|---|---:|
| Dossiers patients | 21 |
| Consultations validées | 15 |
| Épisodes `T0` **confirmés** | **0** |
| Dossiers portant un `T0` | 0 |

Le second tableau est le plus instructif. **Aucun cycle n'est ancré en
production** : ni la trajectoire, ni le momentum, ni les jalons n'ont de point
de départ. Ce fait dépasse le périmètre de cette campagne.

### État des drapeaux (2026-08-26)

| Drapeau | Valeur | Effet |
|---|---|---|
| `WN_DOSSIER_DEUX_VOIX` | `true` | portail patient ouvert (ratification, amendement, réponse d'étape) |
| `WN_CE_QUI_COMPTE` | `true` | bloc ouvert |
| `WN_COMPREHENSION` | `true` | bloc ouvert |
| `WN_OBJECTIF_PROPOSE` | **absent** | **moteur de proposition ÉTEINT** (fail-closed) |
| `WN_OBJECTIF_PROPOSE_PATIENTS` | absent | sans objet, le moteur étant éteint |

*Note de lecture : `scalingo env-get` rend `An error occurred:` aussi bien pour
une variable absente que pour un incident d'API — les deux se ressemblent
exactement. L'absence a été confirmée par un contrôle sur un nom de variable
inexistant. C'est cette ambiguïté qui avait fait accuser à tort le drapeau
`WN_MIGRATIONS_PAR_RELEASE_DB` lors du premier run `release-db` du LOT-05.*

## Ce que la campagne a livré

| Lot | Objet | État |
|---|---|---|
| LOT-00 | Doctrine de la proposition citée | livré |
| LOT-01 | Migration `propositions_objectif` / `dispositions_proposition` | livré, appliqué |
| LOT-02 | Moteur de proposition (assemblage de fragments cités) | livré, **drapeau éteint** |
| LOT-03 | Cockpit : reprise, écart motivé, amendement cité | livré |
| LOT-04 | Portail : « le dire autrement » (`D-110`) | livré, **ouvert en production** |
| LOT-05 | Jalons : la réponse d'étape (`D-111`) | livré, **ouvert en production** |
| LOT-06 | Ce bilan | en cours |

Trois PR pour le seul LOT-05 (#799 migration, #800 code, #801 correctifs de
revue) — la revue `wn-reviewer` y a trouvé quatre défauts réels, dont deux dont
le remède était déjà écrit dans les fichiers modifiés.

## Reprises, amendements, écarts : rien à compter

La section que ce lot devait remplir — *« quelles propositions ont été reprises
telles quelles, amendées et sur quoi, écartées et pourquoi »* — **est vide, et
elle l'est pour une raison structurelle** : le moteur qui produit les
propositions est éteint en production, et aucun objectif négocié n'existe pour
en accueillir une.

Aucun agrégat n'est donc produit, ce qui est cohérent avec l'interdit du lot :
le bilan compte des événements techniques, jamais la qualité d'une parole.

## `D-093` — les conditions de sortie, constatées honnêtement

`D-093` (2026-08-23) ouvre un périmètre **restreint et observé** de trois
dossiers, désignés par identifiants : `PAT006`, `PAT007`, `PAT017`. Sa sortie
exige **deux conditions cumulatives** :

**(a) Au moins une réponse patient réelle sur un objectif.**
→ **NON CONSTATÉE.** `ratifications_objectif` et `amendements_objectif` sont
vides. Et la cause est en amont : `objectifs_negocies` est vide, donc il n'y a
rien à ratifier.

`D-093` avait nommé cette précondition elle-même : *« le praticien doit rédiger
un objectif sur au moins un des trois pour que la fenêtre de six semaines ait un
sens »*. **Trois jours après la décision, elle n'est pas levée.**

**(b) Un bilan écrit sur le comportement du classement des candidats.**
→ **IMPOSSIBLE À PRODUIRE EN L'ÉTAT.** Un bilan sur la façon dont le classement
s'est comporté suppose qu'il se soit comporté. Le moteur de proposition est
éteint, aucun candidat n'a été présenté par les surfaces de la campagne, et
aucune recommandation élargie n'a été remise sur les trois dossiers du
périmètre. Écrire un bilan de comportement à partir de zéro observation serait
fabriquer la provenance que ce lot avait pour but de **recueillir** — exactement
ce que `DC-19` interdit.

**Conséquence.** Les deux conditions sont non constatées. La borne du
**2026-10-04** court toujours ; il reste **cinq semaines et trois jours**. Passé
ce délai sans les deux conditions, `D-093` prévoit que **le périmètre se
referme** — il ne s'étend pas par défaut. Une absence de constat n'est pas un
feu vert (`DC-24`, appliqué à la gouvernance).

## Dossier de signature du classement : NON PRÉPARÉ, et c'est motivé

Le lot prévoyait de préparer, *« si le matériau le justifie »*, la proposition
d'extension du périmètre haché de `priorityRulesV1` au classement.

**Le matériau n'existe pas.** Signer un classement, c'est certifier la
provenance de l'ordre dans lequel des candidats sont présentés. Zéro
présentation, zéro reprise, zéro écart motivé : il n'y a rien à certifier. Un
dossier de signature rédigé sur cette base ne documenterait pas un comportement
observé, il en supposerait un.

Le dossier reste donc à faire, et sa condition d'existence est la même que celle
de `D-093` (a) : **qu'un objectif soit rédigé, puis qu'un patient y réponde.**

## Le geste unique qui débloquerait tout

Un seul geste manque, et il n'est pas technique : **qu'un objectif négocié soit
rédigé sur l'un des trois dossiers du périmètre**.

Il ouvre, dans l'ordre :

1. la ratification / la contestation / « le dire autrement » au portail — les
   trois surfaces sont **déjà ouvertes en production** (`WN_DOSSIER_DEUX_VOIX`
   posé) ;
2. la condition (a) de `D-093` dès la première réponse ;
3. et, si `WN_OBJECTIF_PROPOSE` est posé, la production de propositions citées —
   donc le matériau de la condition (b).

La réponse d'étape du LOT-05 demande **en plus** un `T0` confirmé : aucun
n'existe aujourd'hui. Sans lui, aucune fenêtre de jalon ne s'ouvre, quelle que
soit l'ancienneté du dossier.

## Ce que ce bilan ne conclut pas

- Il ne lève pas `D-093`, et ne propose pas de le lever.
- Il ne signe rien, et ne propose aucune règle clinique.
- Il ne juge pas l'absence d'usage : trois jours séparent `D-093` de ce constat,
  et la fenêtre court jusqu'au 2026-10-04.
- Il ne conclut pas que la campagne est close : la contre-revue adverse à
  l'échelle de la campagne, et la passe Codex du LOT-05, restent à jouer.

## Suites, par ordre

1. **Passe Codex du LOT-05** (classe P0) — geste du responsable.
2. **Contre-revue adverse de campagne**, sous forme d'affirmations à réfuter —
   avant la clôture, jamais après.
3. **Arbitrage** : rédiger un objectif sur un dossier du périmètre `D-093`, et
   décider si `WN_OBJECTIF_PROPOSE` est posé.
4. **Arbitrage LOT-05 en suspens** : confirmer un nouveau `T0` ferme une fenêtre
   d'étape ouverte — un patient à J85 perdrait sa question J90. Non tranché.
5. **Avant le 2026-10-04** : reprendre ce bilan avec les constats de la fenêtre,
   et conclure `D-093` dans un sens ou dans l'autre.

---

## Relecture du 2026-09-12 — dix-sept jours plus tard

*Lue en production par conteneurs one-off `5534` et `6707`, par identifiants
seuls, le 2026-09-12. Cette section n'amende pas ce qui précède : le tableau
d'août était exact au 2026-08-26. Elle mesure l'écart.*

**Deux des « Suites » ci-dessus sont périmées, et il faut le dire avant les
chiffres.** La n° 3 (« rédiger un objectif sur un dossier du périmètre, et
décider si `WN_OBJECTIF_PROPOSE` est posé ») et la n° 5 (« avant le
2026-10-04 »). [[D-162]] a abrogé la borne du 2026-10-04 le 2026-09-09 ;
[[D-163]] a **ouvert le périmètre à tous les dossiers** le 2026-09-10. `PAT006`, `PAT007`
et `PAT017` ne constituent plus un périmètre, et les deux conditions cumulatives
du point 3 de `D-093` ne commandent plus rien — il n'y a plus de périmètre à
quitter. Ce qui les remplace est une **interdiction** : rien ne se réclame d'une
provenance certifiée tant que le classement n'est pas signé.

Ce qui suit est donc un **constat**, et non la vérification d'une condition. Il
importe quand même, et pour une raison précise : `D-093` fondait sa retenue sur
un fait qui a cessé d'être vrai.

### Volumes de production (conteneur one-off, 2026-09-12)

| Table | 2026-08-26 | 2026-09-12 | Dossiers | Dernière écriture |
|---|---:|---:|---:|---|
| `objectifs_negocies` | 0 | **2** | 2 | 09-11 18:09 |
| `propositions_objectif` | 0 | **4** | 3 | **09-04 22:02** |
| `dispositions_proposition` | 0 | **1** | 1 | **08-28 11:32** |
| `ratifications_objectif` | 0 | **2** | 1 | 09-11 18:14 |
| `amendements_objectif` | 0 | 0 | 0 | — |
| `reponses_jalon_objectif` | 0 | 0 | 0 | — |
| `ce_qui_compte_entrees` | 0 | **2** | 2 | 09-10 10:56 |
| `syntheses_comprehension` | 0 | **5** | 4 | 09-12 07:26 |
| `desaccords_comprehension` | 0 | **1** | 1 | 09-12 06:49 |

Quatre tables sont nées depuis le bilan et n'y figuraient pas :
`propositions_priorite_ia` **1**, `propositions_comprehension_ia` **3**,
`accords_attestes_objectif` **2**, `fins_objectif` **0**.

| Mesure | 2026-08-26 | 2026-09-12 |
|---|---:|---:|
| Dossiers patients | 21 | **28** |
| Consultations validées | 15 | **20** |
| Épisodes `T0` **confirmés** | **0** | **7** |
| Dossiers portant un `T0` | 0 | **7** |

### Le fait qui dépassait la campagne est levé

Le bilan d'août tenait pour son constat le plus lourd que **zéro cycle n'était
ancré en production** : ni trajectoire, ni momentum, ni jalon n'avaient de point
de départ. Ils sont sept, sur sept dossiers — `PAT017` (08-29), `PAT006` et
`PAT019` (08-30), `PAT007` (09-04), puis **trois confirmés le matin même de
cette lecture** : `PAT012` (07:04), `PAT013` (07:16), `PAT011` (07:21). Le geste
qui manquait est posé, et il se pose encore pendant qu'on lit.

**Ce qui fait sortir de sa dormance la « Suite » n° 4.** Août la notait « non
tranchée » sur un dépôt où aucun `T0` n'existait : confirmer un nouveau `T0`
ferme une fenêtre d'étape ouverte, et un patient à J85 perdrait sa question J90.
L'arbitrage restait théorique. Il ne l'est plus — sept `T0` sont ancrés, trois du
matin même. Le risque **n'est pas encore réalisé** : les sept portent sur sept
dossiers **distincts**, aucun n'a reçu de second `T0`. Il le sera au premier
dossier qui en reçoit un deuxième, et la question sera alors posée trop tard.

### La dateline, par identifiant

**`PAT017` — le dossier du constat d'août, et il n'a pas bougé.** Proposition le
08-28 à 06:24, `reprise` et objectif négocié à 11:32 — la seule disposition de
toute la production —, synthèse publiée à 11:40, `T0` le 08-29. **Aucune
ratification, jamais.** C'est exactement ce que [[D-162]] §3 avait établi : cet
objectif est **muet par construction**, l'expéditeur ne se déclenchant qu'à
l'écriture, et aucune relance n'existant.

**`PAT006` — la boucle entière, en six minutes.** « Ce qui compte » le 09-10 ;
puis le 09-11 : objectif négocié à 18:09 dont la **priorité vient d'un appel**
(`priorite_source = proposition_ia`, le mécanisme de [[D-167]]), tirage de
compréhension à 18:10, synthèse publiée à 18:11 **avec sa provenance**,
**ratification à 18:14**, accord attesté à 18:15 ; un second accord attesté le
09-12 à 07:11. Cette chaîne est la première qui aille de bout en bout.

**`PAT007` — le désaccord.** Deux propositions d'objectif le 09-04 à 22:02, `T0`
la même minute, aucun objectif négocié. Tirage le 09-11 à 21:03, deux synthèses
à 21:04 — une publiée, une laissée en brouillon —, toutes deux issues d'un
tirage. Puis, **le lendemain matin à 06:49, un désaccord de compréhension**
portant un texte non vide. Dix heures et une nuit séparent la publication de la
réponse.

**`PAT011`, `PAT012`, `PAT013` — le matin du 09-12.** Trois `T0` confirmés entre
07:04 et 07:21 ; sur `PAT011`, tirage à 07:22 et synthèse publiée à 07:26.

### La prémisse de `D-093` est renversée — la capacité de contredire est exercée

`D-093` fondait sa retenue sur deux faits. Le premier — le classement n'est
couvert par aucune ligne signée — **tient toujours**. Le second ne tient plus :

> « **Aucun patient n'a encore répondu.** Les cinq tables de l'alliance sont
> vides. La capacité de contredire existe et est ouverte en production ; elle
> n'est pas exercée. Le gate demandait qu'elle existe — son intention était
> qu'elle **pèse**. »

Elle est exercée. Deux ratifications de sens `ratifie` sur `PAT006`, et **un
désaccord de compréhension** sur `PAT007` — la première fois qu'une surface de
l'alliance reçoit autre chose qu'un silence.

**Ce que la base ne dit pas, et qu'aucun compte ne dira.** Sur `PAT006`,
l'objectif est écrit à 18:09 et ratifié à **18:14** : cinq minutes. Une
ratification ne s'écrit que depuis la surface patient — mais les dossiers de test
sont réels et vivent en production ([[D-075]]), et un lien magique ouvre ce
portail à qui le détient. Une lecture de production ne distingue pas un patient
qui répond vite d'un parcours joué de bout en bout sur un dossier réel. **Le
constat s'arrête donc ici, et ne se complète pas par déduction** : la qualifi­cation
appartient à qui a posé les gestes.

Le désaccord de `PAT007` a une autre forme — publié à 21:04, exprimé à 06:49 le
lendemain. L'écart et la nuit qui le séparent ne prouvent rien non plus, mais ils
ne ressemblent pas à un aller-retour.

### Le bilan comportemental ne viendra pas de l'usage — et ce n'est plus un manque

Le bilan d'août jugeait la condition (b) « impossible à produire en l'état », et
imputait cette impossibilité au **moteur éteint**. **Cette imputation était
fausse**, et [[D-154]] §1 l'a corrigée dès le 2026-09-08 : le drapeau était posé,
« ce n'est pas un drapeau qui manquait ». Le moteur est ouvert, son périmètre
vaut tous les dossiers, et il l'était déjà quand août concluait le contraire.

Ce qui reste vrai, sur deux plans, et aucun n'est un délai :

1. **L'ordre servi n'est persisté nulle part** — ni rang, ni score, ni numéro
   d'ordre. Établi par [[D-162]] §2, qui y voyait une contradiction entre `D-093`
   et l'interdit de `D-094` §3. [[D-163]] §3 a tranché autrement : cette absence
   de trace est désormais **l'un des contrepoids nommés** qui rendent tenable de
   servir sans se réclamer de rien. Ce n'est plus un défaut à combler ; attendre
   ne la produira pas.
2. **L'écart motivé, matériau nommé du LOT-06, n'existe toujours pas.** Sur
   **quatre propositions** présentées, **une seule disposition** — `reprise`, le
   08-28 — et **zéro `ecartee`**. Les trois autres (`PAT007` ×2, `PAT019`) n'ont
   reçu **aucun geste**. Le seul objectif négocié récent, celui de `PAT006`,
   **n'est pas issu d'une proposition** : il a été écrit sans passer par la
   machine. Et aucune proposition n'a été assemblée depuis le **2026-09-04**,
   huit jours avant cette lecture.

**Conséquence pour le travail de signature.** Il reste dû ([[D-163]] §6), mais il
n'attend **rien que l'usage puisse apporter** : sa voie est descriptive, et sa
première pièce existe déjà — `BILAN_CLASSEMENT_DESCRIPTIF_2026-09-09.md`, qui
documente dix objets là où le fichier signé en nommait quatre. Le « dossier de
signature » que le LOT-06 avait refusé de préparer faute de matériau reste donc
non préparé, mais la raison a changé de nature : elle n'est plus un manque
d'observation, elle est que **l'observation n'est pas la route**.

### Ce que cette relecture ne conclut pas

- Elle **ne propose aucun arbitrage, et n'en appelle aucun**. `D-162` et `D-163`
  ont déjà réglé la borne et le périmètre ; rien dans ces chiffres ne rouvre
  l'un ou l'autre.
- Elle **ne qualifie aucune parole** : elle compte des événements techniques et
  des horodatages, jamais la qualité d'une réponse.
- Elle **ne conclut pas qu'un patient a répondu** sur `PAT006` — ni le
  contraire. Voir plus haut.
- Elle ne clôt pas la campagne : la passe Codex du LOT-05 et la contre-revue
  adverse restent à jouer, avant la clôture.
