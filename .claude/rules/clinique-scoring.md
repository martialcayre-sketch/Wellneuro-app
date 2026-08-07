---
paths:
  - "web/src/lib/questions*"
  - "web/src/lib/questions/**"
  - "web/src/lib/equilibre/**"
  - "web/src/lib/consultation/**"
  - "prompts/**"
globs:
  - "web/src/lib/questions*"
  - "web/src/lib/questions/**"
  - "web/src/lib/equilibre/**"
  - "web/src/lib/consultation/**"
  - "prompts/**"
---

# Logique clinique et scoring

- Ne jamais changer une question, une cotation, un seuil ou une interprétation
  sans demande explicite ; documenter toute modification clinique dans un
  fragment `changelog.d/`.
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
