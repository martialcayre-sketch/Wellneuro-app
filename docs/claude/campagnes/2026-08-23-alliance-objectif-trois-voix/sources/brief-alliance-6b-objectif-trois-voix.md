# Brief de campagne — Alliance 6.0-B : l'objectif à trois voix

> Brief source pour `/wn-campaign`. Suite directe de la campagne 6.0-A
> (dossier à deux voix) et de la décision `D-093` (périmètre restreint
> PAT006/PAT007/PAT017, fenêtre close le 2026-10-04).

## Intention

Wellneuro devient **force de proposition** sur l'objectif négocié — sans
jamais parler à la place du patient. Principe fondateur : **la machine cite,
elle n'invente pas.** Une proposition d'objectif est un assemblage de
fragments qui portent chacun leur provenance :

- les mots écrits du patient (`motif_principal`, `objectif_prioritaire`,
  `attentes` de l'anamnèse — verbatim, jamais paraphrasés) ;
- la restitution d'instrument certifié (plainte dominante `Q_MOD_03`,
  bande restituée) ;
- les candidats signés de la chaîne C1 (`PRIO-DIG-01`, `PRIO-PON-01`),
  avec leurs textes `LIMITATION_*`.

Le praticien reprend, amende ou écarte (avec motif). Le patient ratifie,
conteste — ou **« le dit autrement »** (geste nouveau : contre-proposition
dans ses mots, événement append-only entrant dans la chaîne de versions).
L'adhésion se **constate** (trajectoire affichée comme récit, jamais
agrégée) ; l'évaluation se **mesure aux jalons** J21/J42/J90 (réponse en
mots + EVA restituée brute, ancrée à la version exacte de l'objectif).

## Application immédiate : tous les patients actuels, D-093 inchangée

**Arbitrage du praticien (2026-08-23)** : tous les patients actuels sont des
bêta-testeurs réels et informés (Wellneuro leur a été présenté comme en
phase de test). La campagne s'applique donc **dès la livraison à tous les
dossiers courants** — pas de périmètre par identifiant.

- **Distinction tenue** : ce qui s'ouvre à tous, c'est la surface de cette
  campagne (propositions côté praticien seul ; « dire autrement » et
  évaluation aux jalons côté patient — de la parole append-only, jamais une
  recommandation automatique). Le périmètre restreint de `D-093`
  (recommandations élargies, PAT006/PAT007/PAT017) reste inchangé : sa
  raison est clinique (classement non couvert par une ligne signée), pas
  liée au statut de testeur. Sa levée reste une décision `D-xxx` propre.
- Un **interrupteur de repli** demeure : une liste d'identifiants en
  configuration (`WN_OBJECTIF_PROPOSE_PATIENTS`) peut restreindre la surface
  si l'observation l'exige — vide = tous. Le mécanisme vaut par sa
  réversibilité, pas comme périmètre par défaut.
- **Gate de généralisation → gate de consolidation** : les conditions de
  `D-093` (une réponse patient réelle + bilan écrit sur le classement) et le
  bilan de campagne (LOT-07 : écarts praticien motivés + amendements
  patient) restent le passage obligé — non plus pour élargir la population,
  déjà entière, mais pour élargir le **corpus signé** (classement, domaines
  hors table) et lever `D-093`.

## Contraintes doctrinales (héritées de 6.0-A, non négociables)

- Append-only par référence ; deux dates partout ; jamais un score sur une
  parole ; silence ≠ réponse (`DC-24`) ; portail en pull intégral.
- Le champ `enoncePatient` reste inviolable : pré-rempli uniquement par
  **citation verbatim** de ce que le patient a écrit, marquée avec sa source.
- Un LLM éventuel ne produit qu'un brouillon praticien (`Brouillon_Moteur`,
  modèle de la synthèse) — invisible du patient avant reprise et validation.
- La **relecture praticien reste le point de passage obligé** : la
  proposition prépare la négociation, elle ne remet jamais rien au patient.
- Les six gardes G1-G6 de LOT-02/06 restent intactes ; garde nouvelle
  **G7** : le module de proposition n'écrit jamais `objectifs_negocies` —
  seule la route praticien existante le fait, sur geste, enrichie du seul
  champ `sourcePropositionId`.
- Aucune règle clinique sans provenance certifiée : le moteur ne classe que
  ce que la table signée couvre. La campagne **fabrique la provenance**
  (écarts motivés, amendements) qui justifiera d'élargir le corpus signé.

## Objet nouveau

Table `propositions_objectif` (append-only, RLS, contrat SQL) : fragments
sourcés `{texte, source}` (source ∈ anamnèse / instrument / règle signée +
SHA), inconstructible si un fragment perd sa source ; états par événements
(`proposée` → `reprise` / `écartée` avec motif / `caduque` par hash des
données sources — même mécanique que le `proposalHash` du cockpit).

## Découpage pressenti (à recompiler par la machinerie)

| Lot | Contenu | Décision |
| --- | --- | --- |
| LOT-01 | Doctrine : régime de la proposition citée, verbe « dire autrement », sources admissibles, interrupteur de repli | `D-xxx` fondatrice |
| LOT-02 | Migration `propositions_objectif` — seule, drapeau éteint | — |
| LOT-03 | Moteur de proposition déterministe + gardes G7 + interrupteur de repli | — |
| LOT-04 | Cockpit : reprendre / amender / écarter avec motif, diff proposé↔négocié | — |
| LOT-05 | Portail : « le dire autrement » (extension du geste LOT-06 de 6.0-A) | `D-xxx` (geste patient nouveau) |
| LOT-06 | Jalons : question d'évaluation ancrée à la version, EVA brute | `D-xxx` si instrument GAS |
| LOT-07 | Bilan : écarts + amendements → provenance pour signer le classement ; **gate de consolidation** | ferme la boucle `D-093` |

## Frontière avec la campagne `doctrine-executable` (parallèle, primaire)

- 6.0-B **ne touche jamais `web/src/lib/clinical-engine/`** : les LOT-04/05/06
  de doctrine-executable en sont propriétaires (objet de sécurité, gates de
  population, conflit de sources). Le moteur de proposition consomme les
  sorties de la chaîne, il ne la modifie pas ; la caducité par hash absorbe
  leurs évolutions (un candidat inhibé rend la proposition caduque).
- Point de conception LOT-01 : la garde G6 interdit au module objectif
  d'importer le moteur clinique — le module de proposition est donc un module
  **distinct**, avec son propre régime de gardes, alimenté par la sortie du
  cockpit, pas par import direct.
- **Clôture de `D-093` possédée par 6.0-B** (LOT-07) ; doctrine-executable
  LOT-05 couvre les gates de population sans refermer ni élargir le périmètre.
- Deux migrations `release-db` en vol : celle de doctrine (schéma de claim,
  chemin critique) passe **devant** ; `propositions_objectif` ensuite.
- Deux sessions sur la copie principale : vérifier la branche avant chaque
  commit ; les `D-xxx` se réservent dans `main` séquentiellement.

## Lucidités

- `D-093` n'attend pas la campagne : la fenêtre exige un objectif rédigé à
  la main dès maintenant (l'écran existe). Les premiers objectifs manuels
  deviennent les cas de référence du moteur.
- Drapeau neuf `WN_OBJECTIF_PROPOSE` (+ interrupteur de repli) ; rien
  d'accumulé ne déferle à l'allumage (leçon `D-070`).
- Campagne parallèle : `doctrine-executable` est l'activité primaire
  courante — l'arbitrage de priorité appartient au responsable.
