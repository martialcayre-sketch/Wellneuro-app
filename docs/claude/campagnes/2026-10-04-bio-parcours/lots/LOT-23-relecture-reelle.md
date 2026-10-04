---
id: "LOT-23"
titre: "BP-23 — Relecture réelle (D-213 §1)"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-23 (BP-23) — Relecture réelle (D-213 §1)

## But

Exécuter `D-213` §1 sur la route : la relecture cesse d'être un tampon.

## Résultat observable

`review` reste nul quand la coche de relecture est fausse ; la validation pour
diffusion reste un second verrou.

## Périmètre

La route des versions (`versions/route.ts`) et son banc.

## Hors périmètre

L'interface seule : le banc porte sur la route.

## Fichiers probables

- `web/src/app/api/**/versions/route.ts`

## Interdits

- Contrôle d'accès avant la lecture des données.
- Aucune modification de logique clinique.
- Pas de secret, pas de donnée patient réelle.

## Dépendances

LOT-01 (BP-01) ; `D-213` §1.

## Étapes

- [ ] Écrire le banc sur la route, rouge sur le code actuel.
- [ ] Corriger la route.

## Tests

T2 ; banc de route.

## Critères de done

Le banc mord sur la route, pas seulement sur l'interface.

## Résultats

À compléter à la clôture.
