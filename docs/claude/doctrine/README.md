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

## Ancrage des citations

Une citation de ce corpus — et du registre `docs/DECISIONS.md`, qui suit la
même règle — **s'ancre sur du texte, jamais sur un numéro de ligne**.

Le motif est mesuré, pas théorique. Le 2026-08-23, le LOT-09 a décalé un
fichier de onze lignes et faussé **huit** citations d'un coup. Le contrôle
qu'on écrirait spontanément — le fichier existe, la ligne est dans les
bornes — n'en aurait attrapé **aucune** : les huit étaient dans les bornes. Un
numéro de ligne ne survit pas à une édition ; un texte, si.

**La forme.** L'ancre et ce qu'elle ancre sont liés dans un **seul** lien
markdown, jamais posés côte à côte :

```markdown
[« le texte exact, recopié »](web/src/lib/clinical/orientationEngine.ts)
[`nomDuSymbole`](web/src/lib/clinical/priorityRulesV1.ts)
```

Le numéro de ligne devient une **commodité** : il s'écrit hors du lien si
quelqu'un le veut, et rien ne le vérifie.

**Pourquoi un lien, et pas un verbatim posé à côté de l'ancre.** Parce que
l'attribution par proximité invente des morts. La première mesure de ce lot
imputait chaque verbatim à l'ancre la plus proche à sa gauche : elle a déclaré
morte `drapeauxAnamnese.ts:28` en lui attribuant un libellé qui appartenait à
l'ancre **voisine**, où il figure toujours. Le lien rend l'attribution
syntaxique — il n'y a plus rien à deviner.

**Ce qui n'est pas une ancre** : un lien dont le texte **est** le chemin
(`[web/src/…](web/src/…)`). C'est une référence de fichier, le corpus en
compte quarante-huit, et les contrôler reviendrait à chercher le chemin dans
le fichier.

**Ce que le contrôle refuse de vérifier, et le dit** : un verbatim **élidé**
(`[…]`) ou plus court que trois caractères. Une citation coupée ne se vérifie
pas littéralement ; l'écrire quand même serait se donner une ancre qui ne
tient rien.

**Une ancre cite ce qui EST, jamais ce qui FUT.** Le registre des décisions
raconte aussi des états révolus — « `chaineC1.ts:315` **posait**
`safetyFindings: 0` en dur », écrit la veille du jour où ce code a disparu.
Ancrer une phrase pareille la ferait rougir pour toujours, ou forcerait à
réécrire l'histoire pour faire taire un contrôle. Une citation historique
**garde l'ancienne forme** : elle date un fait, elle ne prétend pas décrire le
dépôt d'aujourd'hui. Le contrôle ne les distingue pas tout seul — c'est
l'auteur qui choisit d'ancrer, et il n'ancre que le présent.

**Les citations antérieures sont grandfathered.** L'ancienne forme
(`chemin.ts:769` en code span) n'est pas fautive : elle n'est pas ancrée. Le
contrôle les **compte** — deux cent cinquante au 2026-08-23 — et ne les juge
pas. La convention s'applique au neuf et à ce qu'un lot touche ; réécrire les
deux cent cinquante coûterait plus que le trou et noierait le contrôle sous du
diff de documentation.

Le contrôle : `node scripts/wn-ancres-doctrine.mjs`, joué par `npm run check`.

## Numérotation

`DC-nn` — doctrine clinique. Le préfixe est distinct des trois séries en `R`
(technique, produit, réserves d'audit) et des `D-nnn` du registre de
décisions : un `DC-14` ne se confond avec rien.

Les identifiants sont **stables et append-only**. Une règle abandonnée est
marquée « retirée le … » et garde son numéro.
