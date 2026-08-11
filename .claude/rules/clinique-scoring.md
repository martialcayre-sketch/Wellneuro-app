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
  une source ou un questionnaire isolé.
- **Une absence de réponse rend non scoré, jamais `0`** : un zéro implicite
  déplace le score sans que rien ne le signale.
- Gouvernance : respecter `docs/gouvernance-questionnaires-scoring.md` et
  mettre à jour `docs/questionnaires-drive-mapping.md` à toute modification de
  questionnaire ou de scoring. Un questionnaire `certifié` a une fixture dans
  `scripts/check_questionnaire_certification.js` ; un score Drive certifié ou
  ambigu expose la métadonnée `certification` dans `scoresJson`.
- Tests : uniquement les patients fictifs autorisés (voir CLAUDE.md).
