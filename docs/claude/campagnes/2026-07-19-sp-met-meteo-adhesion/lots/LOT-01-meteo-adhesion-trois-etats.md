---
id: "LOT-01"
titre: "Météo d'adhésion : trois états et cause observable"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-01 — Météo d'adhésion : trois états et cause observable

> Compilé le 2026-07-19. **Migration-free** : l'agrégat est calculé à la lecture
> et n'est jamais persisté.

## But

Dériver des points d'étape J7/J14/J21 un signal d'adhésion à **trois états** —
régulière / fragile / interrompue — accompagné de la **cause observable citée**
qui le motive, et l'afficher au praticien seul.

## Résultat observable

Dans le poste de pilotage, phase **Suivi**, le praticien voit un signal nommé
(texte + icône, jamais la couleur seule) et la réponse patient qui le fonde
(« adhésion : quelques jours », point d'étape J14 du 12/07). Sans point d'étape
exploitable, le signal affiche « indéterminée » — jamais « interrompue ».

## Périmètre

- Module de domaine **pur** (aucun accès Prisma), voisin de
  `web/src/lib/protocol/checkinDomain.ts`, prenant en entrée les `ProtocolCheckin`
  d'un protocole et retournant `{ etat, causeObservable, pointEtapeSource }`.
- Règles déterministes et explicites, chacune traçable à une réponse fermée
  (`adhesion`, `tolerance`, `energie`, `sommeil`).
- Branchement en lecture dans la surface praticien existante.

## Hors périmètre

- Les **constats déterministes par point d'étape** : ils restent C2B (**A8-4**,
  symétrie stricte — aucun pré-agrégat en C2B, aucun constat par point d'étape
  en SP-MET).
- Toute exposition patient, tout pourcentage d'observance, tout score interne,
  tout classement de patients.
- Les repères de cohorte (**SP-CAB**, seuil `n ≥ 5`).
- Toute persistance de l'agrégat ⇒ **aucune migration**.

## Fichiers probables

- `web/src/lib/protocol/adhesion.ts` (nouveau, domaine pur) + son test.
- `web/src/components/patient-cockpit/…` (affichage phase Suivi).
- Route praticien existante consommant les check-ins
  (`web/src/app/api/praticien/protocoles/checkins/route.ts`) — lecture seule.

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ni d'écriture Supabase.
- Pas de refactor hors lot.

## Étapes

- [ ] Figer les règles des trois états et leur formulation en français.
- [ ] Implémenter le module de domaine pur + tests exhaustifs des cas limites.
- [ ] Brancher l'affichage praticien (phase Suivi).
- [ ] Vérifier par test l'absence totale d'exposition patient.
- [ ] Exécuter les validations, relire le diff, documenter.

## Tests

- Unitaires : chaque état, l'abstention, l'absence de check-in, un check-in
  partiel, la citation de la cause.
- Garde-fou : test asserant qu'aucune route `/api/patient/*` ni `/api/portail/*`
  ne renvoie le champ.
- E2E : le signal est visible côté praticien, absent du portail patient.

## Critères de done

- Trois états + abstention, chacun sourcé sur une réponse datée.
- Aucun agrégat écrit en base.
- Statut jamais porté par la seule couleur.
- Anti-secrets, type-check, lint, Vitest, `test:worktree` verts.

## Résultats

À compléter à la clôture.
