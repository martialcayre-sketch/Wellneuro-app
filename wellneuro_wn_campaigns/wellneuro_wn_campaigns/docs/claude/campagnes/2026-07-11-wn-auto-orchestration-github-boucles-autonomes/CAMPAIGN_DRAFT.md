# Draft de campagne — WN-AUTO : Orchestration GitHub et boucles autonomes

## Séquence recommandée

## LOT-00 — Cadrage gouvernance et frontières

**Objectif :** fixer ce qui peut être autonome et ce qui reste obligatoirement humain.

**Résultat :** matrice vert/orange/rouge, interdits et critères d’arrêt.

**Dépend de :** aucun

---

## LOT-01 — Contrat opérationnel et état machine

**Objectif :** définir les états d’une tâche, les entrées/sorties et les artefacts durables.

**Résultat :** state machine lisible par les agents et les workflows GitHub.

**Dépend de :** LOT-00

---

## LOT-02 — Orchestrateur GitHub de base

**Objectif :** transformer une demande `/wn-auto` en issue, labels, branche et PR préparée.

**Résultat :** pipeline de triage reproductible, sans écriture sensible.

**Dépend de :** LOT-01

---

## LOT-03 — Boucle tests et réparation bornées

**Objectif :** exécuter les validations minimales, puis réparer avec limite stricte de tentatives.

**Résultat :** boucle test → réparation → retest, arrêt après trois échecs.

**Dépend de :** LOT-02

---

## LOT-04 — Revue indépendante et preview protégée

**Objectif :** imposer une seconde lecture IA et un gate de validation humaine.

**Résultat :** diff relu par un agent distinct, preview Vercel protégée, go/no-go explicite.

**Dépend de :** LOT-03

---

## LOT-05 — Observabilité et maintenance continue

**Objectif :** brancher la surveillance, la maintenance hebdomadaire et les incidents expurgés.

**Résultat :** boucle de maintenance et création automatique d’incidents non sensibles.

**Dépend de :** LOT-04
