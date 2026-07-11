# Draft de campagne — Alignement documentaire et état réel du dépôt

## Objectif général

Vérifier puis aligner `docs/roadmap.md`, `docs/claude/SESSION_LOG.md`, `docs/claude/PROJET_CONTEXTE.md` et l’état réel du code, sans modifier le comportement applicatif.

## Séquence recommandée

## LOT-00 — Audit des sources de vérité

**Objectif :** Lire les documents canoniques et identifier les affirmations susceptibles d’être obsolètes.

**Résultat :** Une matrice `affirmation → source → date → confiance → vérification requise`, sans modification.

**Dépend de :** aucun

---

## LOT-01 — Vérification read-only des routes Sheets et OAuth

**Objectif :** Confirmer dans le code l’état réel de la décommission Google Sheets/OAuth.

**Résultat :** Un inventaire exact des références restantes, avec impact et recommandation, sans modification.

**Dépend de :** LOT-00

---

## LOT-02 — Corrections documentaires minimales

**Objectif :** Aligner uniquement les documents contradictoires avec l’état vérifié.

**Résultat :** Documentation cohérente et minimale, sans changement fonctionnel.

**Dépend de :** LOT-01

---

## LOT-03 — Validation et handoff

**Objectif :** Clôturer l’alignement et transmettre un état de départ fiable.

**Résultat :** Un handoff court : état confirmé, dettes actives, fichiers canoniques et autorisation de lancer la campagne suivante.

**Dépend de :** LOT-02
