# Handoff — 2026-11-11 — le résolveur reconnaît la vitamine E (D-475, second lot de D-473)

## Branche et état Git

`b-vitamine-e-resolveur`, session concurrente dans le worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, partie de `origin/main` `b5b49ccb6`. PR ordinaire, sans migration ni release-db (le résolveur n'est pas dans les chemins qui la déclenchent) : elle se déclare « prête @<sha> » et l'intégrateur la merge.

## Objectif

D-473 §6 (1) : faire reconnaître la fiche `BIO_VITAMINE_E` par le résolveur signé des libellés, après l'application constatée de la migration de D-473.

## Décisions prises

- `D-475`, réservée par `wn-reserver-decision` après les arbitrages du responsable du 2026-11-11, sur questions à options :
  - liste : le libellé du catalogue et des synonymes alpha en lettres latines, au précédent de `D-336` (aucun libellé lu en production) ;
  - le nom courant seul rattaché : exception écrite à la règle de `D-263`, contre la recommandation ;
  - unité : statu quo (une autre unité ne se valide pas), et la dernière phrase de `D-473` §2 corrigée ;
  - lieu : le résolveur public, au précédent de `D-381`.
- Déclaration de conformité du responsable sur la surface de relecture ; signature transcrite : 209 entrées, 110 analytes, empreinte `e30d990f…`.
- Piège trouvé et fermé par un banc : `normaliserLibelle` efface les lettres grecques ; une forme grecque confondrait les tocophérols entre eux.

## Fichiers modifiés

- `web/src/lib/biology-library/import/resolverLibellesV1.ts` : quatre entrées, signature.
- `web/src/lib/biology-library/import/resolverLibellesV1.test.ts` : section D-475.
- `docs/decisions/D-475.md`, `changelog.d/2026-11-11-d475-resolveur-vitamine-e.md`, `docs/claude/plan-journal/H15/2026-11-11-01-resolveur-vitamine-e-d475.md`, ce handoff.

## Validations exécutées

- Production, conteneur détaché, lecture seule, agrégats : aucune ligne importée ne nomme la vitamine E ; aucune correspondance NABM signée sur la fiche. Requête jouée d'abord à blanc sur la base locale.
- Verrou constaté fermé avant la signature (les résolutions rendent « inconnu »), ouvert après.
- Bancs de la bibliothèque biologie et gardes de signature (`shaPerimetreLitteral`, `aucunePhraseStructureSignee`) : verts.
- T1 complet : voir la PR.

## Problèmes ouverts

- Les libellés de ce lot n'ont jamais été lus : le premier compte rendu qui nomme la vitamine E dira s'ils suffisent ; un libellé resté « inconnu » s'arbitrera alors, comme `D-356`.
- Le candidat NABM `7302` reste à signer par le praticien.
- Restes du besoin 2 inchangés (journal H15).

## Prochaine action exacte

1. CI et revue sur la tête : CodeRabbit, sinon Copilot (`D-468`), sinon PR-Agent prouvé, sinon `wn-reviewer` ; verdict de chaque remarque.
2. Déclarer la PR « prête @<sha> » pour l'intégrateur.
3. Puis, dans l'ordre arbitré : relecture des claims en attente, croisée avec le contrat de fraîcheur.

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d`.
- Aucun texte clinique, libellé de claim ou valeur dans le dépôt public (`D-251` §4).
- Pas de pull, merge ni rebase sans arbitrage du responsable.
- Signature d'un contenu clinique, du résolveur et du candidat NABM : gestes du responsable.
