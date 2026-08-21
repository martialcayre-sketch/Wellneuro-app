---
paths:
  - "web/src/lib/questions*"
  - "web/src/lib/questionnaires/**"
  - "web/src/lib/scoring/**"
  - "web/src/lib/clinical/**"
  - "web/src/lib/clinical-engine/**"
  - "web/src/lib/equilibre/**"
  - "web/src/lib/consultation/**"
  - "web/src/lib/instruments.ts"
  - "web/src/lib/bibliotheque.ts"
  - "web/src/lib/echelles-cabinet.ts"
  - "web/src/lib/questionnaires-catalog.ts"
  - "web/src/lib/plaintes.ts"
  - "web/src/lib/*.guard.test.ts"
  - "prompts/**"
---

# Logique clinique et scoring

> Doctrine complète : `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md` (58
> règles `DC-nn`) et son audit face au code
> (`docs/claude/doctrine/AUDIT_DOCTRINE_CHAINE_T0.md`). La lire avant de poser
> un seuil, une catégorie de claim, une vigilance ou une pondération. Les
> règles ci-dessous en sont l'extrait opposable **aujourd'hui**.

## Invariants de la constitution clinique

Valables pour tout ce qui produit, transforme ou restitue du savoir clinique —
moteurs, prompts, tables de règles, scoring. **Opposables en revue**
(`D-043`) ; aucun n'est encore gardé par un banc, et la constitution nomme
cette dette règle par règle.

- **Aucune règle clinique sans provenance certifiée** — un LLM applique,
  combine, hiérarchise ou explique ; il n'invente jamais (`DC-01`, `DC-02`).
- **Aucun seuil, dose, poids ou borne clinique inventé** ; un chiffre purement
  technique doit être identifié comme tel (`DC-19`, `DC-20`).
- **Association ≠ causalité ; score ≠ diagnostic** (`DC-27`).
- **Une donnée absente n'est jamais zéro ni normale** (`DC-24`).
- **Un questionnaire isolé ne suffit pas à conclure** (`DC-28`).
- **Une discordance se signale, jamais ne se moyenne ni ne se supprime**
  (`DC-30`).
- **Un signal de sécurité prime sur tout score** et n'ajoute pas de points
  (`DC-12`, `DC-23`).
- **Diagnostic, hypothèse et orientation sont trois objets distincts** ; le
  diagnostic reste hors périmètre (`DC-31`, `DC-32`).
- **Respecter la population et les limites d'un claim** ; l'absence de
  population déclarée est une restriction (`DC-14`).
- **Les règles cliniques vivent dans le registre, jamais seulement dans le
  code** (`DC-26`).
- **Toute sortie clinique importante est explicable par données + claims**, y
  compris quand elle s'abstient (`DC-34`, `DC-35`).
- **Données insuffisantes ⇒ réduire la conclusion, jamais l'inventer**
  (`DC-25`).
- Conflit non résolu entre sources ⇒ escalade praticien (`DC-54`, `DC-55`) —
  *proposition, pas encore opposable* : `D-041` la réserve jusqu'au banc.
- **Toute modification clinique exige une décision explicite `D-xxx` et un
  fragment `changelog.d/`** — y compris une seule ligne de TypeScript dans une
  table signée, des poids ou un cut-off (`DC-17`, `DC-18`).

## Règles de travail sur ces fichiers

- Ne jamais changer une question, une cotation, un seuil ou une interprétation
  sans demande explicite ; documenter toute modification clinique dans un
  fragment `changelog.d/`.
- **Ces fichiers sont du clinique, pas du code** (`DC-17`) : une table de
  règles signée, les poids des douze besoins, les cut-offs d'un instrument.
  Une ligne de TypeScript qui les touche est une modification clinique et
  appelle une décision `D-xxx`, même si le diff tient sur un caractère.
- La couche déterministe décide ; le LLM formule et explique seulement. Les
  vigilances déterministes ne doivent pas pouvoir être supprimées par une
  sortie LLM.
- Conserver les niveaux de preuve et l'audit trail ; ne pas extrapoler depuis
  une source ou un questionnaire isolé — toute modification s'appuie sur une
  source, pas sur une déduction.
- **Une absence de réponse rend non scoré, jamais `0`** : un zéro implicite
  déplace le score sans que rien ne le signale.
- Gouvernance : respecter `docs/gouvernance-questionnaires-scoring.md` et
  mettre à jour `docs/questionnaires-drive-mapping.md` à toute modification de
  questionnaire ou de scoring. Un questionnaire `certifié` a une fixture dans
  `scripts/check_questionnaire_certification.js` ; un score Drive certifié ou
  ambigu expose la métadonnée `certification` dans `scoresJson`.
- Tests : uniquement les patients fictifs autorisés (voir CLAUDE.md).

## En revue d'un diff questionnaire ou scoring

Vérifier chacun des points ci-dessus **contre le dépôt** — fragment
`changelog.d/` posé, mapping Drive à jour, fixture de certification présente,
métadonnée `certification` exposée, absence de réponse non scorée — jamais les
déduire du diff seul.
