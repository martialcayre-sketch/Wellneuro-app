---
id: "LOT-05"
titre: "La fiche administrative s'écrit"
statut: "terminé (2026-09-17, PR #1166)"
dépend_de: "LOT-03 appliqué en production"
---

# LOT-05 — La fiche administrative s'écrit

## But

Rendre le dossier **corrigeable**. Aujourd'hui `PATCH /api/praticien/patients`
n'accepte que `telephone` et `actif` : une faute de frappe sur un nom est
définitive.

## Résultat observable

1. Nom, prénom, date de naissance, téléphone, e-mail, adresse, NIR et médecin
   traitant se corrigent depuis un seul formulaire.
2. Changer l'e-mail **ne rend muette aucune réponse déjà reçue**.
3. Un NIR de clé fausse est refusé, avec un message qui dit pourquoi.

## Périmètre

- `GET /api/praticien/patients` — ajouter au DTO `dateNaissance, adresse, nir,
  medecinTraitantNom, medecinTraitantCoordonnees`.
- `PATCH /api/praticien/patients` — accepter les neuf champs. Validation
  manuelle dans le style du fichier (pas de Zod) : motif e-mail existant, date
  `AAAA-MM-JJ`, NIR **format + clé de contrôle** (`97 − (n mod 97)`,
  `2A` → `19`, `2B` → `18`).
  Refus explicite plutôt qu'un numéro faux qui finirait sur un courrier.
- `components/patient/FicheAdministrativePanel.tsx` — affichage + tiroir
  « Modifier ». Mécanique d'état sur le modèle de `ComprehensionPanel` : « le
  refus qui fait foi est celui de la route ; ce que l'écran empêche est une
  courtoisie ».

## Le changement d'e-mail — le point qui fait ce lot

`Patient.email` est `@unique` et **recopié dans cinq tables**. Quatre portent
`email_patient` : `consultations`, `assignations`, `questionnaire_reponses`,
`syntheses_ia`. Et `GET /api/praticien/reponses` interroge **par e-mail**,
comme trois autres routes.

Le `PATCH` réécrit donc ces quatre copies dans une `prisma.$transaction`, après
contrôle d'unicité.

`booklet_envois.email_patient_masque` **n'est pas touché** : il atteste un envoi
réellement parti à cette adresse-là, et le réécrire falsifierait une trace. Un
commentaire le dit à l'endroit du code, sans quoi l'omission se lira comme un
oubli.

## Done

- Bancs de route : NIR refusé sur clé fausse ; e-mail dupliqué en 409 ; et **le
  banc décisif** — après changement d'e-mail, une `QuestionnaireReponse`
  préexistante reste lisible par `GET /api/praticien/reponses`.
- Banc de composant sur le formulaire.
- T2 vert.
