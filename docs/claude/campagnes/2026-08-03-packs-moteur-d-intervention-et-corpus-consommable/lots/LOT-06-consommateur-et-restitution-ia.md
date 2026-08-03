---
id: "LOT-06"
titre: "Consommateur praticien et restitution IA"
statut: "à_faire"
dépend_de: "LOT-05"
palier: "T2"
---

# LOT-06 — Consommateur praticien et restitution IA

## But

Brancher un écran praticien sur la route d'orientation, et faire restituer la
recommandation par la première synthèse IA — sans jamais lui laisser la produire.

## Le défaut à corriger

```
grep -rln "praticien/orientation" web/src
  → la route, son test, et la table de règles. Rien d'autre.
```

La route existe depuis la campagne de certification et **personne ne l'appelle**.
Une recommandation que rien n'affiche n'est pas une fonctionnalité.

## Arbitrage tranché au cadrage (PMI-5)

Le moteur déterministe produit la recommandation ; la synthèse IA la **restitue
et l'explique**. Elle ne la génère pas, ne la complète pas, ne la réordonne pas.

La raison est la traçabilité : une recommandation produite par un modèle n'a ni
table signée ni `sha256`, et rien ne permet, six mois plus tard, de dire pourquoi
tel pack a été proposé à tel patient. L'option « l'IA propose, le moteur filtre »
a été examinée et écartée pour cette raison.

## Résultat observable

Sur la fiche d'un patient ayant répondu au pack initial, le praticien voit les
recommandations d'exploration, leur motif, et le `sha256` de la table qui les a
produites. Un clic assigne — le geste manuel existant, jamais un automatisme.

## Périmètre

- Choisir la surface d'accueil (question ouverte de campagne : fiche patient,
  Spirale, ou écran dédié) et l'écrire.
- Appeler `GET /api/praticien/orientation` et afficher le résultat, y compris
  l'état `actif: false` (message, pas d'erreur).
- Passer la recommandation déterministe **en entrée** de la synthèse IA
  (`web/src/app/api/praticien/synthese/route.ts`), avec une consigne de
  restitution.
- Journaliser ou afficher le `sha256` avec la recommandation.

## Hors périmètre

- Toute exposition patient de la recommandation.
- Toute auto-assignation.
- Toute génération de pack par le modèle.

## Fichiers probables

- surface praticien retenue (`web/src/app/dashboard/…`, composant)
- `web/src/app/api/praticien/synthese/route.ts`
- `web/src/lib/anthropic.ts` (consigne de restitution)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de texte UI en anglais.
- Pas de recommandation générée par le modèle.
- Pas d'assignation automatique.
- Pas de refactor hors lot.

## Étapes

- [ ] Trancher la surface d'accueil et l'écrire dans `CAMPAGNE.md`.
- [ ] Brancher l'appel et l'affichage, état inactif compris.
- [ ] Injecter la recommandation en entrée de la synthèse, avec sa consigne.
- [ ] Vérifier qu'un prompt ne peut pas faire inventer un pack au modèle.
- [ ] `npm run check` puis `npm run test:worktree -- --fast`.

## Tests

- `actif: false` → message en français, pas d'erreur, pas d'écran vide.
- La synthèse ne cite aucun pack absent de la recommandation reçue.
- Aucune assignation n'est créée par l'affichage.
- E2E : le parcours praticien reste intact.

## Critères de done

- [ ] Un écran praticien appelle réellement la route.
- [ ] Le `sha256` accompagne la recommandation.
- [ ] La synthèse restitue sans produire, vérifié par test.
- [ ] Aucune régression E2E sur le parcours praticien.

## Résultats

À compléter à la clôture.
