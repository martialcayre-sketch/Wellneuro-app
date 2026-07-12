---
id: "2026-07-11-complements-clean-label-v1"
titre: "C4 — Compléments clean label (C4A/C4B)"
statut: "cadrée — lots à compiler N+1"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-12"
lot_courant: "aucun"
---

# C4 — Compléments clean label

> Cadrage réel du 2026-07-12 (remplace le squelette). Lots détaillés compilés
> en N+1. C4A est parallélisable en data-first dès la fin de C1 LOT-01.

## Objectif

Une bibliothèque de compléments à critères qualité explicites (formes
biodisponibles, excipients, dosages cohérents), depuis laquelle le praticien
compose ses recommandations, avec compatibilité vérifiée contre le protocole
actif du patient.

## Scission actée

### C4A — Catalogue de qualité intrinsèque (data-first, aucune donnée patient)

Composition, actifs, formes, excipients, allergènes, labels, sources
officielles (DGCCRF / Compl'Alim), date de dernière vérification, pays/marché,
version de formulation, statut actif/inactif, réviseur, niveau de complétude,
incertitudes. **Provenance et fraîcheur obligatoires par produit.**

### C4B — Compatibilité avec le protocole (dépend de C1)

Objectif actif, contraintes patient, doublons, dose cumulée, points de
vigilance, tolérance antérieure, durée et réévaluation, alternatives.
Signalement (jamais décision automatique) des interactions connues.

## Décisions actées

- **Pas de score global dominant.** Le « clean label score » unique est
  écarté : il masque la qualité variable des sources, les reformulations,
  l'incertitude sur certains additifs et le contexte patient. Présentation
  multi-dimensions :

```text
Qualité de formulation       Bien documentée
Compatibilité protocole      Compatible avec vigilance
Données manquantes           Interaction médicamenteuse à vérifier
Dernière revue               8 juillet 2026
```

- La justification est toujours visible (badge + fiche justificative) : une
  liste ordonnée sans justification serait perçue comme une recommandation
  commerciale.
- **Primitive commune C4/C5** (registre) : le modèle « qualité intrinsèque
  (calculée une fois, indépendante du patient) + lecture contextuelle (au
  protocole actif) » est identique à celui de la Boussole alimentaire. La
  première des deux campagnes compilée conçoit la primitive ; la seconde la
  réutilise. Ne pas la construire deux fois.
- Vocabulaire : « recommandation », « point de vigilance », « à discuter avec
  le médecin traitant ». Jamais de terminologie prescriptive.

## Frontières

**Possède** : catalogue C4A, moteur de compatibilité C4B, fiches
justificatives.
**Consomme** : protocole actif (C1), rendu documentaire (C3), primitives
HC-F, primitive intrinsèque/contextuel partagée avec C5.
**Différés** : scan code-barres patient (avec le scanner C5), interactions
médicamenteuses exhaustives (signalement simple d'abord).

## Esquisse de lots (à compiler N+1)

LOT-00 audit sources open data + modèle de fiche produit →
LOT-01 schéma catalogue C4A (lot `bloqué_confirmation` si migration) →
LOT-02 ingestion + fiches → LOT-03 compatibilité C4B → LOT-04 intégration
protocole/documents + validation.
