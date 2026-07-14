---
id: "LOT-04"
titre: "Validation et handoff"
statut: "à_faire"
dépend_de: "LOT-03"
---

# LOT-04 — Validation et handoff

## But

Prouver l'absence de régression clinique et valider les parcours mobile/desktop, clavier, lecteur d'écran, reprise, transmission, correction et erreur réseau.

## Done

- Payload et scores identiques avant/après.
- Scoring-check, type-check, anti-secrets et E2E ciblés passent.
- Les gates d'extension à chaque nouveau renderer sont documentés.
- Handoff produit sans migration ni donnée patient réelle.
