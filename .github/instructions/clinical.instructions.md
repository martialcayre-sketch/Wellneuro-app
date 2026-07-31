---
applyTo: "web/src/lib/questions*,web/src/lib/questions/**,web/src/lib/equilibre/**,web/src/lib/consultation/**,prompts/**"
---

# Logique clinique et IA

- Ne jamais changer une question, une cotation, un seuil ou une interprétation sans demande explicite.
- La couche déterministe décide ; le LLM formule et explique seulement.
- Les vigilances déterministes ne doivent pas pouvoir être supprimées par une sortie LLM.
- Conserver les niveaux de preuve et l’audit trail.
- Ne pas extrapoler depuis une seule source ou un questionnaire isolé.
- Documenter toute modification clinique dans un fragment `changelog.d/`
  (replié dans `CHANGELOG.md` à la consolidation — voir `changelog.d/README.md`).
- Utiliser uniquement des données fictives autorisées dans les tests.

## Gouvernance d'un questionnaire ou d'un score

- Respecter `docs/gouvernance-questionnaires-scoring.md`, et mettre à jour
  `docs/questionnaires-drive-mapping.md` à toute modification de questionnaire
  ou de scoring.
- Un questionnaire marqué `certifié` dans la matrice doit avoir une fixture
  dans `scripts/check_questionnaire_certification.js`.
- Un score Drive certifié ou ambigu expose la métadonnée `certification` dans
  `scoresJson`.
- Une absence de réponse rend **non scoré**, jamais `0` : un zéro implicite
  déplace le score sans que rien ne le signale.
