---
applyTo: "web/src/lib/questions/**,web/src/lib/equilibre/**,web/src/lib/consultation/**,prompts/**"
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
