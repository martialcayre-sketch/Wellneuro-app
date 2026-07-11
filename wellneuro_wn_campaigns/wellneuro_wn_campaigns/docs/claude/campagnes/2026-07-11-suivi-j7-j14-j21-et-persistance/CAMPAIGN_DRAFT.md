# Draft de campagne — Persistance du protocole et suivi J7/J14/J21

## Objectif général

Persister et versionner le protocole 21 jours validé, ajouter un suivi minimal J7/J14/J21 et exposer un compagnon patient calme.

## Séquence recommandée

## LOT-00 — Audit des flux et besoins de persistance

**Objectif :** Identifier exactement ce qui doit être stocké et les contraintes d’accès.

**Résultat :** Contrat de persistance minimal et matrice des droits.

**Dépend de :** aucun

---

## LOT-01 — Spécification du modèle et gate migration

**Objectif :** Formaliser le schéma cible, API et stratégie de migration sans l’exécuter.

**Résultat :** ADR/modèle validé et checklist de confirmation.

**Dépend de :** LOT-00

---

## LOT-02 — Migration Prisma et API minimale — confirmation obligatoire

**Objectif :** Créer la persistance minimale validée.

**Résultat :** Une migration courte, API protégée et données compatibles avec le protocole V1.

**Dépend de :** LOT-01

---

## LOT-03 — Versionnement et validation du protocole

**Objectif :** Persister les versions et la validation praticien.

**Résultat :** Brouillon, validation, diffusion et historique traçables.

**Dépend de :** LOT-02

---

## LOT-04 — Check-ins et décision J21

**Objectif :** Collecter tolérance/adhésion minimale et préparer la décision J21.

**Résultat :** Check-ins J7/J14/J21 et panneau décisionnel praticien.

**Dépend de :** LOT-03

---

## LOT-05 — Compagnon patient minimal

**Objectif :** Exposer la priorité, l’action du jour, la fiche et le check-in sur mobile.

**Résultat :** Accueil patient calme lié au protocole actif.

**Dépend de :** LOT-04

---

## LOT-06 — Tests, rétrocompatibilité et handoff

**Objectif :** Valider persistance, droits et parcours longitudinal.

**Résultat :** Rapport complet, rollback testé et décision pour les campagnes de contenu.

**Dépend de :** LOT-05
