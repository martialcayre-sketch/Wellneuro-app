---
id: "LOT-04-securite-clinique-nutrivigilance"
titre: "Sécurité clinique et nutrivigilance"
statut: "à_faire — non démarré"
dépend_de: ["LOT-02"]
---

# LOT-04 — Sécurité clinique et nutrivigilance

## But

Créer un cadre déterministe de sécurité relationnelle et un parcours de
signalement d’effet indésirable.

## Périmètre

- charte de disponibilité ;
- consignes d’urgence ;
- niveaux d’escalade ;
- règles versionnées ;
- file praticien ;
- effet indésirable ;
- incidents ;
- notifications génériques ;
- pannes.

## Gate clinique

Aucune règle activée sans propriétaire, source, version, message, test et
validation.

## Étapes

1. Audit des items sensibles existants.
2. Atelier clinique.
3. Messages déterministes.
4. Prototype patient.
5. File praticien.
6. Workflow effet indésirable.
7. Tests panne/idempotence.
8. Revue juridique et clinique.

## Interdits

- triage LLM autonome ;
- promesse de réponse ;
- causalité automatique ;
- notification sensible ;
- seuil caché ;
- dépendance serveur pour afficher une urgence.

## Done

- [ ] Absence de surveillance explicite.
- [ ] Consigne utilisable hors panne.
- [ ] Règles versionnées.
- [ ] File praticien.
- [ ] Signalement structuré.
- [ ] Handoff nutrivigilance documenté.
