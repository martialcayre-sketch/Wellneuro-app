---
id: "LOT-09"
titre: "Vigilances de discordance — ce que le moteur constate atteint la synthèse praticien"
statut: "terminé"
dépend_de: "LOT-01"
---

# LOT-09 — Vigilances de discordance injectées dans la synthèse

## But

Ce que le moteur de contradictions constate atteint la synthèse praticien comme
**vigilance déterministe**, au même titre que les signaux d'alerte d'anamnèse —
et une sortie LLM ne peut ni la supprimer, ni la contredire en silence.

## Origine — une dette sans accueil depuis deux lots

Moitié non livrée de l'étape 5 du LOT-01, **renvoyée** le 2026-08-12 (« les
vigilances n'ont pas de lot d'accueil à ce jour »). Le câblage cockpit des
contradictions, lui, est fait (`D-050`). Rattachée au LOT-05 par sa fiche, elle
en est ressortie le 2026-08-13 : le LOT-05 a été clos sans elle, sur arbitrage
de diff d'une seule finalité. Ce lot est cet accueil.

## Résultat observable

Sur la fixture golden case, table de contradictions signée : la synthèse porte
la vigilance C-STR en formulation neutre — celle que produit le déterministe,
jamais reformulée — accompagnée de son action suggérée, en tête du bloc de
vigilances. Un constat **résolu** n'y apparaît pas. Une prose qui contredit
ailleurs la vigilance qu'elle porte en tête est signalée au journal, jamais
censurée.

## Périmètre

- **Conversion** des `ContradictionFinding` non résolus en lignes de vigilance
  (`description` + `actionSuggeree`, reprises telles quelles).
- **Injection** dans `vigilanceDeterministe`, aux côtés des vigilances
  d'anamnèse, par la fusion existante (`fusionnerVigilance`).
- **Garde de fidélité** : une vigilance déterministe contredite ailleurs dans la
  prose est journalisée — patron d'adjacence de `D-055`, jamais de censure.

## Ce que le dépôt fournit déjà — vérifié le 2026-08-13

Le lot est plus petit que la fiche du LOT-01 ne le laisse croire : rien de
clinique n'est à rédiger, tout existe.

- `ContradictionAffichee.description` est **la formulation neutre produite par
  le déterministe, jamais reformulée** — aucun texte à inventer (`DC-19`).
- `constatsContradictionsPourDossier` (extrait au LOT-08 pour
  `orientationService`) produit les constats, **verrou compris**.
- `fusionnerVigilance` (`synthese/route.ts:386`, appelée `:529`) fusionne déjà,
  et sert les vigilances d'anamnèse.
- La route a déjà les données : `reponses` (l'ensemble NON filtré, ligne 820)
  porte exactement la forme `LignePassationDossier`, et `consultation.anamnese`
  est lue dans le même bloc — **aucune lecture base supplémentaire**. C'est bien
  `reponses` et non `reponsesAdministrables` : ce dernier est un sous-ensemble
  filtré, et le passer au moteur ferait diverger la synthèse du cockpit (banc
  `discordanceMemeEnsemble.guard.test.ts`).

## Hors périmètre

- **Signer la table de contradictions** : acte praticien distinct.
  `CONTRADICTIONS_METADATA.validationExterne` vaut `false`, donc
  `contradictionsActives()` rend faux quel que soit le drapeau — **la production
  ne change pas au merge**.
- **L'écart dossier ↔ épisode** (`D-050`, non refermé) : le moteur évalue le
  dossier entier alors que `review` porte sur l'épisode T0. Nommé, pas refermé
  ici.
- Toute modification de la table de contradictions elle-même, de ses règles ou
  de ses claims.

## Fichiers probables

`web/src/lib/clinical/contradictionsService.ts`,
`web/src/app/api/praticien/synthese/route.ts`,
`web/src/lib/clinical/verifierRestitutionOrientation.ts`, et leurs bancs.

## Interdits

- Reformuler un constat déterministe — il se reprend tel quel.
- Inventer un plancher d'importance : `D-048` refuse déjà qu'`importance` serve
  à décoter un constat, et aucune source ne fonde un tel seuil (`DC-19`).
- Censurer une sortie LLM : le garde journalise, comme ses deux prédécesseurs.
- Un second critère d'« ouvert » : c'est celui de `D-053` §5, et lui seul.

## Étapes

1. `D-057` au registre — avant toute ligne de code (`DC-17`, `DC-18`).
2. Conversion des constats non résolus en vigilances.
3. Injection dans `vigilanceDeterministe`.
4. Garde de fidélité + bancs de faux positifs.

## Tests

- Constat non résolu ⇒ vigilance en tête, description et action reprises mot
  pour mot ; constat résolu ⇒ absent.
- Système de contradictions éteint ⇒ aucune vigilance ajoutée.
- Vigilances d'anamnèse et de discordance coexistent sans se supprimer.
- Contrôles négatifs du garde de fidélité, au moins autant que de positifs.
- T3 avant la PR.

## Done

- Étape 5 du LOT-01 refermée dans ses deux moitiés.
- Fragment `changelog.d/`.
