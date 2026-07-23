---
id: "LOT-06"
titre: "Preuve visuelle et clôture"
statut: "à ouvrir"
dépend_de: "LOT-05"
---

# LOT-06 — Preuve visuelle et clôture

Périmètre détaillé : `CAMPAGNE.md` (tableau des lots) et plan approuvé du
2026-07-23. Spécifié au moment de l'ouverture du lot, jamais avant.

## Dette héritée du LOT-01 (revue adversariale du 2026-07-23)

- **E2E de la Spirale peuplée** : les specs du LOT-01 n'exercent que
  PAT_SEED_01 (aucun épisode confirmé) — arcs, clavier et suture asOf pilotée
  par un arc ne sont prouvés qu'en jsdom. Ce lot doit seeder un
  `AssessmentEpisode` dédié (patient fictif autorisé) et jouer en navigateur :
  clic d'arc → bannière datée, arc ≡ bouton texte, aucune collision de
  sélecteurs en mode strict.
