---
id: "2026-08-23-alliance-objectif-trois-voix"
titre: "Alliance 6.0-B — l'objectif à trois voix"
statut: "en_cours"
créée_le: "2026-08-23"
mise_à_jour: "2026-08-27"
lot_courant: "LOT-06"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Alliance 6.0-B — l'objectif à trois voix

*La machine cite, le praticien reformule, le patient tranche.*

## Objectif

Wellneuro devient **force de proposition** sur l'objectif négocié — sans
jamais parler à la place du patient. Principe fondateur : **la machine cite,
elle n'invente pas.** Une proposition d'objectif est un assemblage de
fragments qui portent chacun leur provenance : les mots écrits du patient
(anamnèse, verbatim), la restitution d'instrument certifié (plainte
dominante `Q_MOD_03`), les candidats signés de la chaîne C1 avec leurs
textes `LIMITATION_*`. Le praticien reprend, amende ou écarte (avec motif).
Le patient ratifie, conteste — ou **« le dit autrement »** (contre-proposition
dans ses mots, événement append-only entrant dans la chaîne de versions).

Suite directe de la campagne 6.0-A (dossier à deux voix) et de [[D-093]].

## Résultat observable

1. Après confirmation d'épisode T0, le cockpit affiche des **propositions
   d'objectif citées** — chaque fragment cliquable vers sa source ; aucune
   n'atteint jamais le patient sans reprise praticien.
2. La reprise d'une proposition crée un `ObjectifNegocie` par la route
   existante, enrichie du seul champ `sourcePropositionId` ; l'écart se
   motive ; la trajectoire proposé→négocié est lisible (diff).
3. Au portail, le patient dispose d'un troisième verbe — « le dire
   autrement » — dont le texte entre dans la chaîne de versions sans rien
   effacer.
4. Aux jalons J21/J42/J90, le patient est invité à dire où il en est par
   rapport à la **version exacte** de son objectif (mots + EVA restituée
   brute, sans seuil).
5. L'adhésion se **constate** (récit de trajectoire), ne se calcule jamais ;
   le bilan de campagne (LOT-06) transforme écarts motivés et amendements en
   **provenance** pour signer le classement et lever [[D-093]].

## Application immédiate — tous les patients actuels

Arbitrage du praticien (2026-08-23) : tous les patients actuels sont des
bêta-testeurs réels et informés. La surface de cette campagne s'ouvre donc
**à tous les dossiers courants dès la livraison** (propositions côté
praticien seul ; « dire autrement » et jalons côté patient — de la parole
append-only, jamais une recommandation automatique). Un **interrupteur de
repli** (`WN_OBJECTIF_PROPOSE_PATIENTS`, liste d'identifiants ; vide = tous)
permet de restreindre si l'observation l'exige. Le périmètre restreint de
[[D-093]] (recommandations élargies, trois dossiers) reste **inchangé** : sa
raison est clinique — classement non couvert par une ligne signée — pas liée
au statut de testeur ; sa levée est une décision propre, préparée au LOT-06.

## Contraintes non négociables

- Aucun secret en dur ; tous les textes UI en français ; changements
  minimaux.
- Aucun patient réel dans le dépôt ; exemples limités à Sophie Nicola,
  Jennifer Martin et Michel Dogné ; aucun seed ni E2E visant un dossier réel
  ([[D-075]]).
- Aucune migration Prisma/SQL sans lot séparé **à confirmation obligatoire**
  (LOT-01), seule dans sa PR, appliquée par `release-db` après approbation
  et **constatée par conteneur** ([[D-087]], [[D-092]]).
- Append-only par référence ; deux dates partout (événement ≠
  enregistrement) ; jamais un score sur une parole ; silence ≠ réponse
  (`DC-24`) ; portail en pull intégral.
- `enoncePatient` inviolable : pré-rempli uniquement par **citation
  verbatim** de ce que le patient a écrit, marquée avec sa source ; jamais
  paraphrasé par la machine.
- Un LLM éventuel ne produit qu'un brouillon praticien (`Brouillon_Moteur`,
  modèle de la synthèse) — invisible du patient avant reprise et validation.
- La **relecture praticien reste le point de passage obligé** : la
  proposition prépare la négociation, elle ne remet jamais rien au patient.
- Gardes G1-G6 de 6.0-A intactes ; garde neuve **G7** : le module de
  proposition n'écrit jamais `objectifs_negocies` — seule la route praticien
  existante le fait, sur geste.
- Aucune règle clinique sans provenance certifiée (`DC-19`) : le moteur ne
  classe que ce que la table signée couvre ; la campagne **fabrique la
  provenance**, elle n'invente aucun chiffre.
- Chaque garde neuve est **vue rouge** par mutation réelle avant merge.
- Drapeau neuf `WN_OBJECTIF_PROPOSE`, éteint à la livraison ; rien
  d'accumulé ne déferle à l'allumage (leçon [[D-070]]).

## Frontière avec `doctrine-executable` (parallèle, primaire)

- 6.0-B **ne touche jamais `web/src/lib/clinical-engine/`** : ses LOT-04/05/06
  en sont propriétaires (objet de sécurité, gates de population, conflit de
  sources). Le moteur de proposition consomme les sorties de la chaîne ; la
  caducité par hash absorbe leurs évolutions (un candidat inhibé rend la
  proposition caduque).
- La garde G6 interdit au module objectif d'importer le moteur clinique : le
  module de proposition est un module **distinct**, avec son propre régime de
  gardes, alimenté par la sortie du cockpit — point de conception au LOT-00.
- **Clôture de [[D-093]] possédée par 6.0-B** (LOT-06) ; doctrine-executable
  LOT-05 couvre les gates de population sans refermer ni élargir le
  périmètre.
- **Plus aucune contention `release-db` avec doctrine-executable** : depuis
  [[D-096]] (2026-08-23), cette campagne n'a **plus de migration** — celle des
  axes du claim est transférée à « Curation signée ». La contrainte
  d'ordonnancement écrite à l'ouverture de 6.0-B est donc **caduque**, et
  notre migration est passée seule (appliquée et constatée le 2026-08-23).
- Deux sessions sur la copie principale : vérifier la branche avant chaque
  commit ; les `D-xxx` se réservent dans `main`, séquentiellement.

## Décisions prises

- Proposition = assemblage de fragments sourcés (anamnèse verbatim /
  instrument certifié / règle signée + SHA) ; inconstructible si un fragment
  perd sa source.
- États par événements, jamais par update : `proposée` → `reprise` /
  `écartée` (motif obligatoire) / `caduque` (hash des données sources, même
  mécanique que le `proposalHash` du cockpit).
- Périmètre : tous les patients actuels ; interrupteur de repli par liste
  d'identifiants ; [[D-093]] inchangée.
- **[[D-094]] (2026-08-23, LOT-00)** fonde le régime : sources admissibles
  en liste fermée à trois entrées ; « le dire autrement » en **table
  d'événement propre** (le LOT-01 porte donc les deux tables, pas de CHECK
  élargi) ; au plus **trois** propositions, affichées sans numérotation ni
  mise en avant ; moteur **déterministe d'abord** (aucun LLM au LOT-02) ;
  module de proposition distinct (G6 intacte, G7 neuve).
- **[[D-110]] (2026-08-25, LOT-04)** — trois points de forme dépassaient
  [[D-094]] : le geste est gardé par `WN_DOSSIER_DEUX_VOIX` (donc **ouvert dès
  le merge**, le drapeau étant posé depuis le 2026-08-23 — application immédiate
  prévue par la campagne, et rien ne s'accumule) ; l'état dérivé gagne une
  QUATRIÈME valeur `dit_autrement`, qui n'est ni un accord ni un refus, les deux
  tables se lisant ensemble ; un amendement devient source admissible de
  citation pour une reprise praticien **sans élargir la liste fermée de
  [[D-094]] §1**, qui ferme les sources d'un fragment de proposition — ce que la
  MACHINE assemble — et non ce que le patient a écrit lui-même.
- **[[D-111]] (2026-08-25, LOT-05)** — la réponse d'étape a sa propre table :
  `protocol_checkins` est ancrée à un PROTOCOLE et parle en J7/J14/J21, la
  fusionner l'aurait rendue bilingue sur ses deux axes. `T0` est REFUSÉ comme
  jalon (c'est l'ancre des fenêtres, pas une étape) et la taxonomie est lue dans
  la DÉFINITION de la contrainte, sans quoi un CHECK élargi passerait inaperçu.
  L'EVA est bornée 0-10 par une borne purement TECHNIQUE, facultative, et ne
  conclut rien (régime [[D-088]], sans élargissement). Aucune contrainte
  d'unicité : se raviser fait une ligne de plus. **Aucune décision GAS n'a été
  prise** — si un instrument publié doit un jour structurer cette mesure, ce sera
  une décision de provenance dédiée, hors campagne.
- Décisions `D-xxx` restant à réserver : instrument d'évaluation si GAS
  (toujours ouverte, non tranchée par [[D-111]]).

## Questions ouvertes

- L'évaluation aux jalons : question libre + EVA brute suffisent-elles, ou
  adoption d'un instrument publié (Goal Attainment Scaling) ? Si GAS :
  décision de provenance dédiée, hors de cette campagne si non tranchée.

Tranchées par [[D-094]] (2026-08-23) : plafond et ordre d'affichage (trois,
sans numérotation), LLM (déterministe d'abord), forme du « dire autrement »
(table d'événement propre — conséquence portée au LOT-01).

## Dépendances

- Campagne 6.0-A livrée (tables, gardes, portail — acquis, six lots mergés).
- [[D-093]] ouverte (fenêtre close le 2026-10-04) — les premiers objectifs
  rédigés à la main sont les cas de référence du moteur ; la campagne ne les
  attend pas pour démarrer, mais le LOT-06 ne se ferme pas sans eux.
- ~~`doctrine-executable` LOT-02 devant nous dans `release-db`~~ — **levée
  par [[D-096]]** : cette campagne n'a plus de migration.
- LOT-01 **appliqué en production et constaté par conteneur** le 2026-08-23
  (trois tables vides, RLS deny-all, FK RESTRICT, six CHECK, taxonomie
  `geste` à deux valeurs, `source_proposition_id` nullable sans DEFAULT et
  nulle sur toutes les lignes).

## Artefacts de préparation

- BRIEF_COMPILED.md : synthèse structurée des sources.
- CAMPAIGN_DRAFT.md : canevas R0→R6.
- sources/brief-alliance-6b-objectif-trois-voix.md : brief d'origine.

## Lots

| Lot | Objet | Statut | Dépend de |
| --- | --- | --- | --- |
| LOT-00 | Doctrine : régime de la proposition citée, « dire autrement », sources admissibles, interrupteur de repli — [[D-094]] | terminé (2026-08-23) | — |
| LOT-01 | Migration : `propositions_objectif`, `dispositions_proposition`, `amendements_objectif` + `source_proposition_id` | terminé (2026-08-23, application `release-db` en attente) | LOT-00 ✓ |
| LOT-02 | Moteur déterministe + gardes G7 + drapeaux + **garde de forme des fragments** (dette du LOT-01) | terminé (2026-08-23) | LOT-01 (releasée et constatée) |
| LOT-03 | Cockpit : reprendre / amender / écarter avec motif, diff proposé↔négocié | terminé (2026-08-25) | LOT-02 ✓ |
| LOT-04 | Portail : « le dire autrement » — [[D-110]] geste patient, quatrième état, citation d'amendement | terminé (2026-08-25) | LOT-00 ✓ ; LOT-01 ✓ |
| LOT-05 | Jalons : évaluation ancrée à la version, EVA brute — [[D-111]] | terminé (2026-08-26) — **trois** PR et non deux : #799 migration, #800 code, **#801 correctifs de revue** | LOT-04 ✓ |
| LOT-06 | Bilan : écarts + amendements → provenance pour signer le classement ; **gate de consolidation** | terminé (2026-08-26, PR #802) — le bilan **refuse de signer** et ne ferme PAS [[D-093]] ([[D-112]]) | tous |

### État au 2026-08-27 — livrée, NON close

**Les sept lots sont terminés ; la campagne ne l'est pas.** Le tableau
ci-dessus ne vaut pas clôture, et `statut` reste `en_cours` pour cette raison
exacte : deux gestes du responsable restent à jouer, tous deux **avant** la
clôture et jamais après ([[D-112]] §4).

`lot_courant` reste `LOT-06` — le lot qui porte le gate de consolidation — et
non `aucun` : l'audit des campagnes refuse qu'une campagne en cours ne nomme
aucun lot (`inflight_without_active_lot`, code bloquant en CI). Le champ dit
« le lot dont dépend la suite », pas « le lot en cours d'écriture ».

1. **Passe Codex du LOT-05** (classe P0, surface patient).
2. **Contre-revue adverse à l'échelle de la campagne**, sous forme
   d'affirmations à réfuter — le régime éprouvé par [[D-108]], qui avait réfuté
   sept affirmations sur treize dont un texte servi au patient depuis cinq
   semaines.

**Les deux passes sont fusionnées en un seul énoncé**, versionné à côté de ce
fichier : `PROMPT_CONTRE_REVUE_CODEX_2026-08-27.md`. Vingt-cinq affirmations
hiérarchisées en trois niveaux — donnée patient perdue ou garde franchie,
provenance rompue, dette structurelle — avec une règle d'arrêt qui préfère un
niveau 1 complet à trois niveaux survolés. Le périmètre y inclut `D-113`, livré
depuis et **hors campagne**, parce qu'il a rouvert la série des ancres : une
garde du LOT-05 écrite contre le seul littéral `T0` ne couvre plus rien à
partir du deuxième cycle. Le prompt est **rédigé, pas encore joué** ; son
résultat viendra dans un `REVUE_CODEX_ADVERSE_<date>.md` distinct.

**Ce que le bilan a constaté, et qui commande le reste** : les neuf tables de
la campagne portent **zéro ligne** en production, et **zéro épisode `T0`** n'est
confirmé sur 21 dossiers. L'appareil est complet et n'a jamais servi. [[D-093]]
n'est donc pas levé — sa condition (b) n'est pas « non atteinte » mais **non
productible** — et le dossier de signature du classement n'est pas préparé, ce
refus étant motivé ([[DC-19]] : rien à certifier). La borne du **2026-10-04**
court. Détail : `BILAN.md`.

**Un arbitrage en suspens du LOT-05 a été tranché depuis, hors campagne.** Le
`BILAN.md` listait en suite n° 4 : « confirmer un nouveau `T0` ferme une fenêtre
d'étape ouverte — un patient à J85 perdrait sa question J90. Non tranché. »
C'est l'objet de [[D-113]] (2026-08-26) : les cycles sont nommés `T0`, `T1`,
`T2`, une ancre posée ne se déplace plus, et la fermeture des fenêtres restées
ouvertes devient une **règle énoncée** au lieu d'un effet de bord. Livré en deux
PR : #803 (structure), mergée, et #805 (comportement), ouverte au 2026-08-27 —
ce document ne préjuge pas de son sort. Ce chantier est de l'ingénierie
hors file, pas un lot de cette campagne ; il est nommé ici parce qu'il **retire
un point de la liste des suites**.

## Gates

- **LOT-01 gaté par confirmation explicite** dans la conversation ; la
  migration ne consomme rien et n'est consommée par rien dans sa PR ;
  application constatée par conteneur avant le LOT-02.
- **Aucune proposition sans source** : un fragment non sourcé rend l'objet
  inconstructible — c'est un invariant de type, pas une validation.
- Toute décision clinique = `D-xxx` + fragment `changelog.d/` (`DC-17`,
  `DC-18`) ; l'écriture d'un fichier clinique passe par le niveau
  « demande » du hook.
- Classe P0 (portail/patient) : revue `wn-reviewer` + passe Codex avant PR
  (LOT-04, LOT-05 au minimum).
- **Gate de consolidation** (LOT-06) : conditions de sortie de [[D-093]]
  (une réponse patient réelle + bilan écrit sur le classement) et bilan de
  campagne — non pour élargir la population, déjà entière, mais pour élargir
  le **corpus signé** et lever [[D-093]].

## Hors périmètre

- Toute écriture dans `web/src/lib/clinical-engine/` (propriété
  doctrine-executable).
- Toute modification du classement, des textes `LIMITATION_*` ou de la table
  `priorityRulesV1` — le LOT-06 en prépare la provenance, il ne signe rien.
- La génération du texte d'un objectif par la machine (seule la citation
  sourcée est admise).
- Toute notification/poussée vers le patient (le portail reste en pull ; la
  transmission relève d'un lot ultérieur type LOT-05 de la chaîne
  protocole).
- Toute activation, tout drapeau posé en production : gestes du responsable.
