# Bilan — Alliance 6.0-B, « l'objectif à trois voix »

*Constaté le 2026-08-26. Chaque affirmation chiffrée vient d'une lecture de
production par conteneur one-off, par identifiants seuls.*

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
