---
id: "LOT-01"
titre: "Fiche : deep-link ?onglet=, en-tête trajectoire, Spirale navigable"
statut: "en cours"
dépend_de: ""
---

# LOT-01 — Spirale navigable et deep-link

## But

L'onglet Trajectoire devient l'écran « Fiche-trajectoire » de la maquette dans
son ossature : identité + épisode en en-tête, Spirale SVG data-driven cliquable
soudée au time-travel existant (SP-CONV LOT-03). Aucune API modifiée.

## Résultat observable

- `/dashboard/patients/{id}?onglet=trajectoire` ouvre la fiche directement sur
  l'onglet Trajectoire (valeur inconnue → poste de pilotage, jamais une 404).
- En tête de l'onglet : « {Prénom Nom} — épisode N » (contrat d'épisode
  partagé), badges par épisode ; sans cycle, l'identité seule.
- `SpiraleEpisodes` (nouveau, `ui/`) : un arc concentrique par repère confirmé,
  cliquable et focusable (Entrée/Espace, aria-pressed), pilotant la MÊME
  sélection que les boutons texte de l'index — même suture asOf. Zéro repère →
  aucune Spirale. L'emblème `SpiraleTrajectoire` du bandeau cockpit est intact.

## Vérification

Vitest : `SpiraleEpisodes.test.tsx`, `TrajectoirePanel.test.tsx` (en-tête,
arc ≡ bouton), `FichePatientPanel.test.tsx` (ongletInitial, garde
`estOngletFiche`). E2E : `fiche-trajectoire.spec.ts` (deep-link, état vide sans
arc inventé). T1 + T2 (`test:worktree -- --fast`).
