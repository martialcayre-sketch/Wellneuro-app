---
id: "LOT-03"
statut: "à faire"
dépend_de: "LOT-01 (release-db faite et vérifiée)"
---

# LOT-03 — « Ce qui compte pour moi aujourd'hui »

## But

À la fin de ce lot, le patient peut déposer au portail un champ libre
horodaté — « ce qui compte pour moi aujourd'hui » — avant un check-in ou un
rendez-vous. Chaque entrée est **conservée** : la trajectoire de sens vit à
côté des scores et ne s'y résume jamais. Le praticien la lit dans le dossier,
en regard des passations.

## Périmètre

- Route portail (dépôt) + route praticien (lecture chronologique), sur la
  table du LOT-01.
- Surface portail minimale de saisie ; lecture praticien dans le dossier.
- Deux dates par entrée : saisie (déclarée par le client, bornée) ≠
  enregistrement (serveur).
- Garde structurelle : **aucun agrégat, aucun score, aucun résumé calculé**
  de ces entrées (`DC-27`) ; **une absence d'entrée n'est ni zéro ni
  « rien à signaler »** (`DC-24`) — l'affichage distingue « silence » de
  « réponse vide », et un banc le prouve.

## Fichiers probables

- `web/src/app/api/portail/` (route de dépôt + banc — patron des routes
  portail existantes, session lien magique).
- `web/src/app/api/praticien/` (lecture).
- `web/src/lib/` (module + bancs), surfaces portail et dossier.

## Interdits

- Aucune analyse, catégorisation ou notation du texte patient — ni affichage
  qui l'insinue.
- Aucune modification des check-ins existants ; le champ s'ajoute à côté, il
  ne s'insère pas dans leurs payloads.
- Pas d'e-mail, pas de notification (tout message neuf = registre de
  gabarits, hors périmètre de ce lot).
- Aucune donnée patient réelle dans bancs et fixtures.

## Dépendances

LOT-01 releasé et vérifié. Indépendant de LOT-02.

## Étapes

1. Contrat (qui écrit, quand, bornes de taille, deux dates) + bancs rouges.
2. Routes + surfaces.
3. Garde « silence ≠ réponse » et garde anti-agrégat vues rouges.
4. T2 ; fragment `changelog.d/`.

## Tests

- Bancs de route portail (session patient exigée, dépôt refusé hors session).
- Conservation prouvée : deux dépôts successifs = deux entrées, aucune
  écrasée.
- Deux dates asserties ; garde anti-agrégat vue rouge.
- T2 avant commit.

## Critères de done

- [ ] Dépôt patient au portail, conservé, horodaté à deux dates.
- [ ] Lecture praticien chronologique en regard du dossier.
- [ ] « Silence ≠ réponse » prouvé par banc ; aucun agrégat nulle part.
- [ ] T2 vert ; fragment écrit.
