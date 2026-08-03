---
id: "LOT-00"
titre: "Registre des sources d'intervention NNPP2"
statut: "livré"
dépend_de: "aucun"
palier: "T1"
---

# LOT-00 — Registre des sources d'intervention NNPP2

## But

Désigner, sous forme d'artefact versionné, l'ensemble des sources qui portent des
conduites d'intervention NNPP2 — fiches de synthèse, ordonnances commentées,
fiches protocole, prises en charge. Aujourd'hui elles existent en base mais
aucune pièce du code ne sait que `WN-SRC-0313` est une fiche d'intervention et
non un support de cours.

## Résultat observable

`docs/claude/corpus/nnpp2_interventions_registry.json` existe, décrit chaque
source retenue, et un garde échoue si une entrée référence un `sourceId` absent
de `source_registry.json`.

## Périmètre

- Partir du critère **structuré** — `documentType` ∈ {Protocole / outil
  décisionnel, Synthèse clinique, Outil clinique} — uni au motif de titre, et non
  du titre seul. Le champ déclaré prime : le titre ratait 51 sources sur 99.
- Écarter le notebook 00 (hors RAG clinique, décision du 2026-07-26).
- Pour chaque entrée retenue : identifiant d'axe stable, `sourceId`, notebook,
  tableau clinique visé, nombre de claims et statut de validation, et la mention
  explicite de ce que la source **ne couvre pas**.
- Trancher la question ouverte des 12 « protocole assiette » (NB09) : couche
  d'orientation questionnaires, ou couche protocole distincte ?

## Hors périmètre

- Écrire la moindre règle d'orientation (c'est le LOT-05).
- Valider un claim (c'est le LOT-01).
- Toucher aux 64 instruments ou à leur scoring.

## Fichiers probables

- `docs/claude/corpus/nnpp2_interventions_registry.json` (créé)
- `scripts/check_nnpp2_interventions.js` ou extension d'un garde existant
- `docs/claude/corpus/README.md` (mention du nouvel artefact)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ni écriture Supabase.
- Pas de classement d'une source sur son seul intitulé de fichier.
- Pas de refactor hors lot.

## Étapes

- [x] Statuer sur les 99 sources désignées par le critère (95 retenues, 4 écartées).
- [x] Instruire les sources hors motif de titre — 51 récupérées par `documentType`.
- [x] Définir le schéma du registre et le remplir.
- [x] Écrire le garde d'intégrité (référence croisée avec `source_registry.json`).
- [x] Trancher le cas des « protocole assiette » : retenus, sous-axe `assiette-protocolaire`.
- [x] `npm run check`.

## Tests

- Banc `node --test scripts/lib/verifier_registre_interventions.test.mjs` : 26 cas,
  un échec **prouvé** par invariant — un garde qui ne rougit jamais ne protège de rien.
- Contre-lecture du périmètre : le registre doit contenir exactement ce que le
  critère désigne. C'est le seul test qui attrape une entrée oubliée à la saisie.
- Mutation du vrai fichier (dérive de `documentType`, statut menteur, entrée
  retirée) : les trois rougissent.

## Critères de done

- [x] Chaque source retenue porte un axe, un notebook et un statut.
- [x] Chaque source écartée porte un motif écrit.
- [x] Le garde tourne dans `npm run check` (`interventions-check`) et passe.
- [x] La décision sur les « protocole assiette » est tracée.
- [ ] Validation praticien de la pré-classification (95 sources).

## Résultats

`docs/claude/corpus/nnpp2_interventions_registry.json` — **95 sources retenues sur
12 notebooks, 4 écartées** (notebook 00), portant **2002 claims : 1247 validés,
755 en attente, 1004 prescriptifs (50 %)**.

Trois décisions de forme, prises dans le lot :

- **Deux niveaux d'axe.** Une première dérivation produisait `stress-burnout` et
  `stress-et-burnout` pour la même chose — le repli sur un slug de notebook
  fabriquait des doublons d'identifiant. Séparé en `axeId` canonique (13 valeurs,
  table explicite) et `sousAxe` thématique, nullable.
- **`statutValidation` est recalculé par le garde**, jamais cru sur parole : un
  statut saisi à la main finit par mentir sur ses compteurs.
- **Les compteurs ne sont pas confrontés à la base.** Le CI n'a pas d'accès
  production ; un compteur périmé ne doit pas le rougir. `claims.mesureLe` porte
  la fraîcheur.

Écart au cadrage initial, corrigé en aval : le périmètre passant de 48 à 95
sources, LOT-01 passe de 327 à **755 claims** à valider. L'arbitrage de campagne
tient — 755 reste très loin des 2982 — mais `CAMPAGNE.md` et `LOT-01` ont été
remis d'équerre.

**Un piège relevé à la relecture, consigné et non corrigé ici.** Le champ
`prescriptive` de `source_registry.json` est massivement faux sur ce périmètre :
**52 sources sur 95 sont déclarées non prescriptives alors qu'elles portent des
claims prescriptifs** — 640 claims, soit 64 % des 1004. `WN-SRC-0282` est déclarée
non prescriptive avec 19 claims prescriptifs sur 19 ; `WN-SRC-0052` en porte 51
sur 73. L'inverse ne se produit jamais (0 cas), ce qui désigne une sous-déclaration
systématique, pas du bruit.

Vérifié : **aucun code ne lit ce champ** — c'est un piège de triage, pas un bug
vivant. Il est conservé au registre sous le nom `prescriptiveDeclaree`,
précisément pour que l'écart reste visible. LOT-01 ne doit pas prioriser sa revue
dessus ; seul le `prescriptif` au niveau du **claim** fait foi.

Le lot reste ouvert sur un point : **la validation praticien de la
pré-classification**. Le registre est cohérent et gardé ; il n'est pas encore
cliniquement approuvé.
