---
id: "2026-08-23-alliance-objectif-trois-voix"
titre: "Alliance 6.0-B — l'objectif à trois voix"
statut: "à_faire"
créée_le: "2026-08-23"
mise_à_jour: "2026-08-23"
lot_courant: "LOT-02"
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
- Deux migrations `release-db` en vol : celle de doctrine (schéma de claim,
  chemin critique) passe **devant** ; `propositions_objectif` ensuite.
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
- Décisions `D-xxx` restant à réserver : geste patient à l'implémentation si
  un point de forme dépasse [[D-094]] (LOT-04), instrument d'évaluation si
  GAS (LOT-05).

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
- `doctrine-executable` LOT-02 (migration claim) devant nous dans
  `release-db`.

## Artefacts de préparation

- BRIEF_COMPILED.md : synthèse structurée des sources.
- CAMPAIGN_DRAFT.md : canevas R0→R6.
- sources/brief-alliance-6b-objectif-trois-voix.md : brief d'origine.

## Lots

| Lot | Objet | Statut | Dépend de |
| --- | --- | --- | --- |
| LOT-00 | Doctrine : régime de la proposition citée, « dire autrement », sources admissibles, interrupteur de repli — [[D-094]] | terminé (2026-08-23) | — |
| LOT-01 | Migration : `propositions_objectif`, `dispositions_proposition`, `amendements_objectif` + `source_proposition_id` | terminé (2026-08-23, application `release-db` en attente) | LOT-00 ✓ |
| LOT-02 | Moteur déterministe + gardes G7 + drapeaux + **garde de forme des fragments** (dette du LOT-01) | à_faire | LOT-01 (releasée et constatée) |
| LOT-03 | Cockpit : reprendre / amender / écarter avec motif, diff proposé↔négocié | à_faire | LOT-02 |
| LOT-04 | Portail : « le dire autrement » — `D-xxx` geste patient | à_faire | LOT-00 ; LOT-01 si migration du CHECK |
| LOT-05 | Jalons : évaluation ancrée à la version, EVA brute | à_faire | LOT-04 |
| LOT-06 | Bilan : écarts + amendements → provenance pour signer le classement ; **gate de consolidation**, ferme la boucle [[D-093]] | à_faire | tous |

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
