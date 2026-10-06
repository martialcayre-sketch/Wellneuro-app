# Handoff — 2026-10-05 — BIO-INGEST LOT-07 : code `bio-extraction-v2`

## Branche et état Git

`feat/bio-ingest-lot07-code-extraction-v2`, depuis `main` d0ee7e87. Code
consommateur des deux migrations du lot, déjà appliquées (#1326, #1332 ;
`release-db` 37372358586 vert, constat par conteneur, production sur d0ee7e87).

## Objectif

Relever, valider et restituer l'intervalle de référence et la marque
d'anomalie imprimés (`D-267`), signal « non transcrit » compris (§10).

## Décisions prises

- Mesure de la borne en points de code après `trim()`, comme `char_length` ;
  aucune `maxLength` vers le modèle ; dépassement ⇒ `null` + signal.
- Un fait sans caractère visible (NUL, U+200B, contrôles) vaut `null` sans
  signal : un NUL faisait échouer tout l'import (P2 de la revue).
- Route des résultats : faits lus par la relation `ligneCandidate`, jamais
  copiés (A5) ; silence si aucun fait ou si l'unité lue diffère.
- La marque dans un seul `<span data-fait-laboratoire="marquage">`, sans
  classe ; seule exemption de la sentinelle.
- Banc BP-01 champ par champ : sept modules. Lecture de §7 retenue (Copilot
  #1333) : « la décision du praticien » = l'écran où il décide ; son
  enregistrement (`decisions.ts`) ne lit aucun fait.
- Revue Codex (#1333) : P1 corrigé — une valeur modifiée à la validation
  tait les faits dans la série (précision datée de `D-267` §5) ; P2 corrigés —
  surrogate isolé ⇒ sortie invalide, marque exemptée sans aucun attribut que
  le marqueur (style compris).
- Exemption de la marque portée par le vrai helper e2e
  (`assertSentinelleBiologie`), exercé par `sentinelle-marquage.spec.ts`
  (Copilot #1333). Un NUL intérieur se retire avant rognage.

## Fichiers modifiés

`extraction.ts`, `lancerExtraction.ts`, `lecture.ts`, `resultats/route.ts`,
`ImportCompteRenduPanel.tsx`, `EstimeMesurePanel.tsx`, nouveau
`FaitsDuLaboratoire.tsx`, leurs bancs, `appelantsLlmBiologie.guard.test.ts`,
`lecteursResultatBiologique.guard.test.ts`, fiche LOT-07, changelog,
SESSION_LOG, ce handoff.

## Validations exécutées

- Vitest ciblé : 524 verts ; T1 complet vert ; T3 (voir PR).
- `wn-reviewer` : GO, ni P0 ni P1 ; P2 1, 2, 4, 5 corrigés.
- Copilot #1333 : trois constats, corrigés (NUL intérieur, helper e2e,
  commentaire du banc BP-01).

## Arbitrages du responsable (2026-10-06)

1. **Valeur modifiée à la validation : taire** les faits dans la série.
   Valide la précision datée de `D-267` §5 et le code de df6155db.
2. **Intervalle : l'exempter aussi** de la sentinelle, par le même mécanisme
   que la marque (`data-fait-laboratoire="intervalle"`, texte brut seul).
   Il faut amender `D-267` §6 et faire un **lot de suite** séparé ; aucune
   surface patient ne l'affiche aujourd'hui.
3. **Double unité : accepté**, verbatim attribué, sans comparaison
   logicielle. Aucun code.

Routé : un NUL dans le libellé, la valeur ou l'unité fait encore échouer
l'import (`texteBorne`, défaut antérieur au lot) — `FILE_ATTENTE.md`, « Dette
— un NUL dans le libellé… ».

## Prochaine action exacte

1. Passe Codex sur la PR (geste du responsable, bloc dans la PR) —
   obligatoire avant merge (`D-267` §9).
2. Merge, constat du déploiement (première ligne `deployments` = tête).
3. Constat par conteneur à la première extraction réelle :
   `version_prompt = 'bio-extraction-v2'`, faits relevés.
4. Lot de suite « exemption de l'intervalle » : amender `D-267` §6, puis
   coder l'élément et l'exemption dans `assertSentinelleBiologie`.
5. LOT-09 ensuite.

## Interdits encore actifs

- Rien sur `ResultatBiologique` ; aucun intervalle recalculé, comparé ni
  citable ; aucune couleur, aucun tri, aucun statut tiré des faits.
- Pas de merge sans la passe Codex.
