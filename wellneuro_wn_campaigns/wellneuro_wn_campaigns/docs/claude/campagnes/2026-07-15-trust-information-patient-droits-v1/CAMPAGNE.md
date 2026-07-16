---
id: "2026-07-15-trust-information-patient-droits-v1"
titre: "TRUST — Information patient, consentements et sécurité relationnelle V1"
statut: "cadrée — lots compilés, non activable sans gates"
créée_le: "2026-07-15"
mise_à_jour: "2026-07-15"
lot_courant: "aucun"
---

# TRUST — Information patient, consentements et sécurité relationnelle V1

> Campagne transversale issue du brainstorming du 2026-07-15 et de l’audit
> `docs/RELATION_PRATICIEN_PATIENT_SOURCE.md`.
>
> **Verdict de cadrage : GO pour la documentation et le prototypage ; NO-GO pour
> l’activation avec des données réelles tant que les gates juridique, sécurité,
> hébergement, authentification et gouvernance clinique ne sont pas levés.**

## Objectif

Transformer une simple notice à accepter en un cadre relationnel patient
permanent, versionné, compréhensible et traçable : premier accès court,
information contextuelle au bon moment, centre permanent, choix séparés,
droits, provenance, transparence IA et sécurité relationnelle.

## Frontière

**Possède** : documents normatifs et versions, accusés de lecture, choix et
retraits facultatifs, centre permanent, notices contextuelles, provenance,
signalements, visibilité praticien et politique de notifications génériques.

**Consomme** : charte HC-F, portail patient, QX, C1/C2/C3, infrastructure de
notification et future auth inter-assignations.

**Ne possède pas** : scoring, questionnaires, décision clinique, protocole,
télésurveillance, qualification réglementaire, base légale définitive,
fournisseur IA ou migration sans confirmation.

## Lots

| Lot | Objet | Statut |
|---|---|---|
| LOT-00 | Audit de l’état réel, frontières et gates | à_faire |
| LOT-01 | Modèle documentaire, versionnement et événements | à_faire |
| LOT-02 | Premier accès et centre permanent | à_faire |
| LOT-03 | Consentements, droits et cycle de vie | à_faire |
| LOT-04 | Sécurité clinique et nutrivigilance | à_faire |
| LOT-05 | Transparence IA et provenance | à_faire |
| LOT-06 | Authentification, délégations, partages et notifications | à_faire |
| LOT-07 | Validation, accessibilité et handoff | à_faire |

## Gates

- audit courant ;
- rôles et bases légales ;
- sécurité, isolation et hébergement ;
- gouvernance clinique ;
- fournisseur et flux IA ;
- validation externe avant textes de production.

## Interdits

- case unique « j’accepte tout » ;
- PDF comme source unique ;
- migration implicite ;
- activation avec données réelles sans gates ;
- règle clinique non sourcée ;
- diffusion IA sans validation humaine ;
- notification externe sensible.

## Source canonique

La documentation détaillée se trouve dans le dossier canonique :

`docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/`
