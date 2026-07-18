---
id: "2026-07-11-complements-clean-label-v1"
titre: "C4 — Compléments clean label (C4A/C4B)"
statut: "cadrée — lots à compiler N+1"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-13"
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
- **Contrat neutre C4/C5** (registre) : le modèle « qualité intrinsèque
  indépendante du patient + lecture contextuelle » est défini dans un contrat
  de domaine partagé. C4 et C5 possèdent leurs données, règles et adaptateurs
  respectifs ; aucune ne devient propriétaire technique de l'autre.
- Vocabulaire : « recommandation », « point de vigilance », « à discuter avec
  le médecin traitant ». Jamais de terminologie prescriptive.

## Frontières

**Possède** : catalogue C4A, moteur de compatibilité C4B, fiches
justificatives.
**Consomme** : intention d'exploration validée en C1, protocole actif C2,
rendu documentaire C3, primitives HC-F et contrat neutre
intrinsèque/contextuel partagé avec C5.
**Différés** : scan code-barres patient (avec le scanner C5), interactions
médicamenteuses exhaustives (signalement simple d'abord).

## Esquisse de lots (à compiler N+1)

LOT-00 audit sources open data + modèle de fiche produit →
LOT-01 schéma catalogue C4A (lot `bloqué_confirmation` si migration) →
LOT-02 ingestion + fiches → LOT-03 compatibilité C4B → LOT-04 intégration
protocole/documents + validation.

## Direction UX 5.0 — poste de pilotage & A5-R2 (aligné le 2026-07-18)

> Alignement additif. Voir `docs/claude/propositions/2026-07-18-refonte-ux-5-0/`
> et le registre (A6-R1 poste de pilotage, A5-R2 canvas mid-tone).
> **Aucun contrat clinique figé de cette campagne n'est modifié.**

- Bibliothèque compléments en **instrument à tiroir** consultable depuis la zone focale (protocole) ; présentation multi-dimensions **sans score global dominant** inchangée.
- Canvas **ardoise** A5-R2 — différé au lot d'implémentation.
