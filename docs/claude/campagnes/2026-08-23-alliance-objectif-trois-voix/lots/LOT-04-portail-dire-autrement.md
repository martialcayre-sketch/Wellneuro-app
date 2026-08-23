---
id: "LOT-04"
titre: "Portail — « le dire autrement » : la contre-proposition du patient"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-04 — Portail : « le dire autrement »

## But

Ajouter au portail le troisième verbe patient : à côté de « c'est bien ça »
et « ce n'est pas exactement ça », le patient peut **écrire sa propre
version** de l'objectif — un événement d'amendement, dans ses mots,
append-only, qui entre dans la chaîne de versions.

**Classe P0 (portail/patient) : revue `wn-reviewer` + passe Codex avant PR.**

## Résultat observable

- Une décision `D-xxx` (geste patient nouveau) actée au LOT-00 ou réservée
  ici, selon l'arbitrage de forme : nouveau `sens` sur
  `ratifications_objectif` (CHECK élargi au LOT-01) **ou** table
  d'événement propre.
- Au portail, sur un objectif proposé : le patient saisit un texte libre ;
  l'événement référence la **version exacte** de l'objectif ; rien ne
  s'efface, se compte ou se note.
- Au cockpit, l'amendement s'affiche dans la trajectoire ; le praticien peut
  l'intégrer par une nouvelle version (`supersedesObjectifId`) dont
  l'énoncé peut **citer l'amendement** (source : parole patient portail,
  datée) — la boucle de négociation se referme.
- L'état dérivé distingue : proposé / ratifié / contesté / **dit autrement** ;
  libellés non-jugeants (`DC-24` — jamais « refusé », jamais « en retard »).

## Périmètre

- `web/src/app/api/portail/dossier/route.ts` (le POST s'élargit au nouveau
  geste) + tests
- `web/src/components/patient-companion/DossierDeuxVoixView.tsx`
- `web/src/lib/praticien/objectifNegocie.ts` (`etatRatification` apprend le
  nouvel état ; sources admissibles de citation côté reprise)
- `web/src/components/patient-cockpit/ObjectifNegociePanel.tsx` (affichage
  de l'amendement dans la trajectoire)

## Hors périmètre

- Toute notification au praticien (le portail reste en pull — surface non
  cadrée, comme au LOT-06 de 6.0-A).
- Toute analyse, comptage ou agrégation du texte patient.
- Les jalons (LOT-05).

## Fichiers probables

Ceux du périmètre ; garde structurelle existante : « la ratification ne
s'écrit que depuis le portail » — l'amendement suit le même régime
d'écrivain unique.

## Interdits

- Le texte patient n'est jamais tronqué en silence (refus par motif, bornes
  affichées — patron 6.0-A).
- Jamais journaliser le texte (chemin sortant journalisant, [[D-090]] ;
  helper `messageJournalisable`).
- Drapeau `WN_DOSSIER_DEUX_VOIX` ou `WN_OBJECTIF_PROPOSE` selon l'arbitrage
  LOT-00 — mais le geste est gardé, et le stock ne déferle pas à l'allumage.
- Deux têtes d'objectif ⇒ même régime que la ratification (409, jamais de
  départage silencieux — `DC-30`).

## Étapes

- [ ] Arbitrage de forme constaté (LOT-00) ; migration si CHECK (alors
      dépendance LOT-01 effective).
- [ ] Étendre le POST portail (auth d'abord après drapeau, validation,
      événement append-only, version exacte).
- [ ] UI portail : saisie, confirmation, relecture de ce qu'on a écrit.
- [ ] Cockpit : trajectoire enrichie ; reprise citant l'amendement.
- [ ] Gardes vues rouges (aucun update/delete sur le nouvel événement).
- [ ] T1 ; T2 ; revue `wn-reviewer` ; **passe Codex** (P0) ; T3 si
      migration.

## Tests

- Route : 503 drapeau éteint, 401 sans token, 422 texte vide/hors bornes,
  409 objectif d'un autre dossier ou introuvable, append-only prouvé.
- Dérivation d'état : dernier geste gagne ; « dit autrement » ≠ contesté.

## Critères de done

- Parcours patient complet derrière drapeau ; boucle refermée au cockpit ;
  revues P0 tracées ; T2/T3 verts.

## Résultats

À compléter à la clôture.
