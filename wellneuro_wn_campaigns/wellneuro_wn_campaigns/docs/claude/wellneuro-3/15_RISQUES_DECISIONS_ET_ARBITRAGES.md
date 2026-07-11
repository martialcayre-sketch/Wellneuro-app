# 15 — Risques, décisions et arbitrages

## Arbitrage principal

Ne pas recoder WellNeuro. Recomposer progressivement l’UX et le moteur clinique.

## Risque 1 — Big bang

### Description

Vouloir développer simultanément cockpit, protocole, compagnon patient, clean label, Boussole, messagerie, biologie et IA.

### Réponse

Une branche = un périmètre. Commencer par vertical slice 1.

## Risque 2 — IA magique

### Description

Laisser penser que l’IA décide, prescrit ou diagnostique.

### Réponse

IA = brouillon. Moteurs déterministes = calculs. Praticien = validation.

## Risque 3 — surcharge patient

### Description

Produire des protocoles trop riches ou trop nombreux.

### Réponse

Charge thérapeutique obligatoire. Phase 1 = 3 actions maximum.

## Risque 4 — patient anxieux

### Description

Exposer scores, alertes, rouge, “risque de décrochage”, ou “non-observance”.

### Réponse

Patient = priorité + action + fiche + langage doux. Les détails techniques restent praticien.

## Risque 5 — biologie réelle / HDS

### Description

Stocker des résultats biologiques réels avant cadre adapté.

### Réponse

V1 biologie = catalogue + packs + documents à discuter médecin, sans stockage réel.

## Risque 6 — base complément obsolète

### Description

Créer un référentiel trop large impossible à maintenir.

### Réponse

Bibliothèque courte, qualifiée, statuts explicites.

## Risque 7 — documentation contradictoire

### Description

Roadmap et journal de session divergent sur certaines dettes.

### Réponse

Phase 0 : alignement documentaire avant branches techniques.

## Décision produit clé

WellNeuro doit vendre la décision structurée, pas la quantité de contenu.

```text
Du questionnaire au protocole validé en 10 minutes.
```
