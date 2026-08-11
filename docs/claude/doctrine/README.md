# Doctrine clinique d'exécution

Ce dossier porte la **doctrine** : ce qu'un moteur, un prompt ou un agent a le
droit de faire d'un savoir clinique. Il ne porte ni spécification, ni état
courant, ni historique.

## Les trois pièces

| Fichier | Rôle | Statut |
|---|---|---|
| `CONSTITUTION_CLINIQUE.md` | Les 58 règles `DC-01` … `DC-58`, groupées en neuf domaines. | Reprises actées + propositions non décidées, marquées comme telles. |
| `AUDIT_DOCTRINE_CHAINE_T0.md` | Chaque règle confrontée au dépôt réel et à la campagne chaîne T0. | Constat daté, révisable. |

## Ce que ce dossier n'est pas

- **Pas une source de savoir clinique.** Le savoir vit dans
  `rag_corpus_claims` (claims certifiés, chunks épinglés par SHA) et dans les
  tables de règles versionnées (`web/src/lib/clinical/`). La doctrine dit
  comment on s'en sert, jamais ce qu'il dit.
- **Pas un registre de décisions.** Une règle de doctrine ne devient
  opposable que par une entrée `docs/DECISIONS.md`. Tant qu'elle porte
  « proposition », elle informe une revue, elle ne la tranche pas.
- **Pas un document chargé en permanence.** Une douzaine de règles seulement
  vivent dans `CLAUDE.md` ; le détail se lit ici, à la demande, ou arrive par
  `.claude/rules/clinique-scoring.md` quand un chemin clinique est touché.

## Pourquoi un seul fichier de constitution

La proposition d'origine découpait la doctrine en huit fichiers de politique
(claims, scoring, questionnaires, interventions, biologie, longitudinal,
conflits, preuve). Le découpage sert à **ne pas payer** ce qu'on ne lit pas —
or ce fichier n'est jamais chargé automatiquement : il se lit sur décision.
Le coût qu'un découpage éviterait n'existe donc pas encore.

Le critère de découpe est posé d'avance, pour ne pas être arbitré sous
pression : **une section sort en fichier propre le jour où elle porte du détail
opérationnel** — table de valeurs, procédure, schéma de données. Une section
qui n'est qu'un jeu de principes reste ici.

## Numérotation

`DC-nn` — doctrine clinique. Le préfixe est distinct des trois séries en `R`
(technique, produit, réserves d'audit) et des `D-nnn` du registre de
décisions : un `DC-14` ne se confond avec rien.

Les identifiants sont **stables et append-only**. Une règle abandonnée est
marquée « retirée le … » et garde son numéro.
